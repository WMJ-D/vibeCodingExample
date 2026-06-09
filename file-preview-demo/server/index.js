const express = require('express')
const {
  scanFolder,
  listFiles,
  addTextDocument,
  addUploadedDocument,
  deleteFile,
  searchKnowledge,
  summarizeKnowledge,
  chatWithKnowledge,
  streamChatWithKnowledge,
  streamSummaryKnowledge,
  getConfig,
  saveConfig,
  testConfig,
} = require('./documentService')

const app = express()
const port = Number(process.env.KNOWLEDGE_AGENT_PORT || process.env.PORT || 8787)

app.use(express.json({ limit: '20mb' }))
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'knowledge-agent-server',
    vectorStore: 'local-json-hash-vector',
    time: new Date().toISOString(),
  })
})

app.get('/api/knowledge/files', asyncHandler(async (req, res) => {
  res.json(await listFiles())
}))

app.post('/api/knowledge/folder', asyncHandler(async (req, res) => {
  const { folderPath } = req.body || {}
  if (!folderPath) {
    res.status(400).json({ message: 'folderPath 不能为空' })
    return
  }

  res.json(await scanFolder(folderPath))
}))

app.post('/api/knowledge/refresh', asyncHandler(async (req, res) => {
  const state = await listFiles()
  if (!state.folderPath) {
    res.status(400).json({ message: '请先设置知识库目录' })
    return
  }

  res.json(await scanFolder(state.folderPath))
}))

app.post('/api/knowledge/files/text', asyncHandler(async (req, res) => {
  const { name, content } = req.body || {}
  res.json(await addTextDocument({ name, content }))
}))

app.post('/api/knowledge/files/upload', asyncHandler(async (req, res) => {
  const { name, contentBase64 } = req.body || {}
  if (!name || !contentBase64) {
    res.status(400).json({ message: 'name 和 contentBase64 不能为空' })
    return
  }

  res.json(await addUploadedDocument({ name, contentBase64 }))
}))

app.delete('/api/knowledge/files/:id', asyncHandler(async (req, res) => {
  const removeFromDisk = req.query.removeFromDisk !== 'false'
  res.json(await deleteFile(req.params.id, removeFromDisk))
}))

app.get('/api/knowledge/search', asyncHandler(async (req, res) => {
  const query = String(req.query.q || '').trim()
  if (!query) {
    res.status(400).json({ message: 'q 不能为空' })
    return
  }

  res.json({ query, results: await searchKnowledge(query, req.query.topK) })
}))

app.post('/api/knowledge/search', asyncHandler(async (req, res) => {
  const { query, topK } = req.body || {}
  if (!String(query || '').trim()) {
    res.status(400).json({ message: 'query 不能为空' })
    return
  }

  res.json({ query, results: await searchKnowledge(query, topK) })
}))

app.post('/api/knowledge/summary', asyncHandler(async (req, res) => {
  res.json(await summarizeKnowledge(req.body || {}))
}))

app.post('/api/knowledge/summary/stream', asyncHandler(async (req, res) => {
  setupSse(res)
  try {
    await streamSummaryKnowledge(req.body || {}, (event, data) => writeSse(res, event, data))
  } catch (err) {
    writeSse(res, 'error', { message: err.message || 'summary stream failed' })
  } finally {
    res.end()
  }
}))

app.post('/api/chat', asyncHandler(async (req, res) => {
  const { message, onlyKb, topK } = req.body || {}
  if (!String(message || '').trim()) {
    res.status(400).json({ message: 'message 不能为空' })
    return
  }

  res.json(await chatWithKnowledge({ message, onlyKb, topK }))
}))

app.post('/api/chat/stream', asyncHandler(async (req, res) => {
  const { message, onlyKb, topK } = req.body || {}
  if (!String(message || '').trim()) {
    res.status(400).json({ message: 'message 涓嶈兘涓虹┖' })
    return
  }

  setupSse(res)
  try {
    await streamChatWithKnowledge({ message, onlyKb, topK }, (event, data) => writeSse(res, event, data))
  } catch (err) {
    writeSse(res, 'error', { message: err.message || 'chat stream failed' })
  } finally {
    res.end()
  }
}))

app.get('/api/config', asyncHandler(async (req, res) => {
  res.json(await getConfig())
}))

app.put('/api/config', asyncHandler(async (req, res) => {
  res.json(await saveConfig(req.body || {}))
}))

app.post('/api/config/test', asyncHandler(async (req, res) => {
  const config = req.body && Object.keys(req.body).length
    ? req.body
    : await getConfig()
  res.json(await testConfig(config))
}))

app.use((err, req, res, next) => {
  const status = err.status || 500
  res.status(status).json({
    message: err.message || '服务异常',
    status,
  })
})

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

function setupSse(res) {
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
}

function writeSse(res, event, data) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

app.listen(port, () => {
  console.log(`Knowledge agent server listening at http://127.0.0.1:${port}`)
})
