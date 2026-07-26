import { env } from '../config/env.js'
import { AppError } from '../middleware/error.js'

const CHAT_COMPLETIONS_PATH = '/chat/completions'

function gatewayUrl() {
  return `${env.AI_GATEWAY_BASE_URL.replace(/\/$/, '')}${CHAT_COMPLETIONS_PATH}`
}

function extractTextContent(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.map(item => {
    if (typeof item === 'string') return item
    return item?.text || item?.content || ''
  }).join('')
}

async function readUpstreamError(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null)
    return payload?.error?.message || payload?.message || `AI 网关请求失败（${response.status}）`
  }
  return (await response.text().catch(() => '')) || `AI 网关请求失败（${response.status}）`
}

export async function streamAiCompletion({ messages, signal, onDelta, onThinking }) {
  if (!env.AI_API_KEY) throw new AppError(503, 'AI 服务尚未配置 API Key', 'AI_NOT_CONFIGURED')
  const response = await fetch(gatewayUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.AI_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    body: JSON.stringify({
      model: env.AI_MODEL,
      messages,
      stream: true
    }),
    signal
  })

  if (!response.ok) {
    throw new AppError(response.status, await readUpstreamError(response), 'AI_GATEWAY_ERROR')
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null)
    const content = extractTextContent(payload?.choices?.[0]?.message?.content)
    if (content) await onDelta(content)
    return
  }
  if (!response.body) throw new AppError(502, 'AI 网关未返回可读取的数据流', 'AI_STREAM_EMPTY')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let thinkingNotified = false

  async function handleLine(rawLine) {
    const line = rawLine.trim()
    if (!line || line.startsWith(':') || !line.startsWith('data:')) return false
    const data = line.slice(5).trim()
    if (data === '[DONE]') return true

    let payload
    try {
      payload = JSON.parse(data)
    } catch {
      return false
    }

    const delta = payload?.choices?.[0]?.delta || {}
    if (delta.reasoning_content && !thinkingNotified) {
      thinkingNotified = true
      await onThinking?.()
    }
    const content = extractTextContent(delta.content)
    if (content) await onDelta(content)
    return false
  }

  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (await handleLine(line)) return
    }
    if (done) break
  }
  if (buffer) await handleLine(buffer)
}
