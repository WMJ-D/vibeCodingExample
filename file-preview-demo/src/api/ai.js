import { getToken, removeToken } from '@/utils/token'

const CHAT_STREAM_URL = '/api/v1/ai/chat/stream'

async function readError(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null)
    return payload?.message || `请求失败（${response.status}）`
  }
  return (await response.text().catch(() => '')) || `请求失败（${response.status}）`
}

export async function streamChat({ message, history = [], files = [], signal, onEvent }) {
  const formData = new FormData()
  formData.append('message', message || '')
  formData.append('history', JSON.stringify(history))
  files.forEach(file => formData.append('files', file, file.name))

  const headers = new Headers()
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(CHAT_STREAM_URL, {
    method: 'POST',
    headers,
    body: formData,
    signal
  })

  if (response.status === 401) {
    removeToken()
    window.location.replace(`${window.location.pathname}${window.location.search}#/login`)
  }
  if (!response.ok) throw new Error(await readError(response))
  if (!response.body) throw new Error('服务端未返回可读取的数据流')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  function consume(line) {
    const text = line.trim()
    if (!text) return
    let event
    try {
      event = JSON.parse(text)
    } catch {
      return
    }
    onEvent?.(event)
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''
      lines.forEach(consume)
      if (done) break
    }
    if (buffer) consume(buffer)
  } catch (error) {
    await reader.cancel(error).catch(() => {})
    throw error
  }
}

export default { streamChat }
