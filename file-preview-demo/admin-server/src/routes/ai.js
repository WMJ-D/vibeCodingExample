import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../middleware/error.js'
import { streamAiCompletion } from '../services/ai.js'

const router = Router()
router.use(authenticate)

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_TOTAL_SIZE = 20 * 1024 * 1024
const MAX_HISTORY_MESSAGES = 30
const TEXT_FILE_TYPES = new Set([
  'application/json', 'application/xml', 'application/javascript', 'application/sql',
  'text/plain', 'text/markdown', 'text/csv', 'text/html', 'text/css', 'text/xml',
  'text/javascript', 'text/typescript', 'application/x-yaml', 'text/yaml'
])

const historySchema = z.array(z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().max(100000)
})).max(MAX_HISTORY_MESSAGES)

function writeEvent(res, event) {
  if (!res.writableEnded && !res.destroyed) res.write(`${JSON.stringify(event)}\n`)
}

function parseHistory(value) {
  if (!value) return []
  try {
    return historySchema.parse(JSON.parse(String(value)))
  } catch (error) {
    if (error?.issues) throw error
    throw new AppError(400, '历史消息格式不正确', 'INVALID_HISTORY')
  }
}

function isTextFile(file) {
  return file.type.startsWith('text/') || TEXT_FILE_TYPES.has(file.type)
}

async function fileToContent(file) {
  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(400, `文件 ${file.name} 超过 10MB 限制`, 'FILE_TOO_LARGE')
  }

  if (file.type.startsWith('image/')) {
    const data = Buffer.from(await file.arrayBuffer()).toString('base64')
    return {
      type: 'image_url',
      image_url: { url: `data:${file.type || 'application/octet-stream'};base64,${data}` }
    }
  }

  if (isTextFile(file)) {
    const text = await file.text()
    return { type: 'text', text: `\n\n[文件：${file.name}]\n${text}` }
  }

  const data = Buffer.from(await file.arrayBuffer()).toString('base64')
  return {
    type: 'file',
    file: {
      filename: file.name,
      file_data: `data:${file.type || 'application/octet-stream'};base64,${data}`
    }
  }
}

async function parseMultipart(req) {
  const contentLength = Number(req.headers['content-length'] || 0)
  if (contentLength > MAX_TOTAL_SIZE) throw new AppError(413, '本次上传内容超过 20MB 限制', 'PAYLOAD_TOO_LARGE')

  const request = new Request(`http://localhost${req.originalUrl}`, {
    method: req.method,
    headers: req.headers,
    body: req,
    duplex: 'half'
  })
  let form
  try {
    form = await request.formData()
  } catch {
    throw new AppError(400, '上传内容格式不正确', 'INVALID_MULTIPART')
  }
  const message = String(form.get('message') || '').trim()
  const history = parseHistory(form.get('history'))
  const files = form.getAll('files').filter(item =>
    item && typeof item.arrayBuffer === 'function' && typeof item.name === 'string'
  )

  if (!message && !files.length) throw new AppError(400, '请输入消息或选择文件', 'EMPTY_MESSAGE')
  if (files.length > MAX_FILES) throw new AppError(400, `最多上传 ${MAX_FILES} 个文件`, 'TOO_MANY_FILES')
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > MAX_TOTAL_SIZE) throw new AppError(413, '文件总大小超过 20MB 限制', 'PAYLOAD_TOO_LARGE')

  const content = []
  if (message) content.push({ type: 'text', text: message })
  for (const file of files) content.push(await fileToContent(file))
  return { messages: [...history, { role: 'user', content }] }
}

router.post('/chat/stream', asyncHandler(async (req, res) => {
  const { messages } = await parseMultipart(req)
  const controller = new AbortController()
  req.on('aborted', () => controller.abort())
  res.on('close', () => {
    if (!res.writableEnded) controller.abort()
  })

  res.status(200)
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  writeEvent(res, { type: 'start' })

  try {
    await streamAiCompletion({
      messages,
      signal: controller.signal,
      onThinking: () => writeEvent(res, { type: 'thinking' }),
      onDelta: content => writeEvent(res, { type: 'delta', content })
    })
    writeEvent(res, { type: 'done' })
  } catch (error) {
    if (error?.name !== 'AbortError') {
      req.log?.error({ err: error }, 'AI 流式对话失败')
      writeEvent(res, { type: 'error', message: error.message || 'AI 服务暂时不可用' })
    }
  } finally {
    if (!res.writableEnded) res.end()
  }
}))

export default router
