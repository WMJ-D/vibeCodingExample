const CHAT_TIMEOUT_MS = 60000
const STREAM_TIMEOUT_MS = 120000
const EMBEDDING_TIMEOUT_MS = 60000
const EMBEDDING_RETRY_TIMES = 2

function hasRemoteChatConfig(config = {}) {
  return Boolean(config.baseUrl && config.apiKey && config.chatModel)
}

function hasRemoteEmbeddingConfig(config = {}) {
  return Boolean(
    config.baseUrl &&
    config.apiKey &&
    config.embedModel &&
    config.embedModel !== 'local-hash-vector'
  )
}

async function requestChatCompletion(config, messages, options = {}) {
  if (!hasRemoteChatConfig(config)) {
    throwHttpError('Please configure API Base URL, API Key and chat model first.', 400)
  }

  const data = await postJson(
    `${normalizeBaseUrl(config.baseUrl)}/chat/completions`,
    config.apiKey,
    {
      model: config.chatModel,
      messages,
      temperature: Number(config.temperature ?? 0.3),
      max_tokens: options.maxTokens || 1200,
    },
    options.timeoutMs || CHAT_TIMEOUT_MS,
    'AI chat',
  )

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throwHttpError('AI chat API returned no usable content.', 502)
  }

  return {
    content,
    model: data.model || config.chatModel,
    usage: data.usage || null,
  }
}

async function requestChatCompletionStream(config, messages, { onToken, onDone, onMeta, maxTokens = 1600, timeoutMs = STREAM_TIMEOUT_MS } = {}) {
  if (!hasRemoteChatConfig(config)) {
    throwHttpError('Please configure API Base URL, API Key and chat model first.', 400)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.chatModel,
        messages,
        temperature: Number(config.temperature ?? 0.3),
        max_tokens: maxTokens,
        stream: true,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      const message = data.error?.message || data.message || `AI chat stream API returned ${response.status}`
      throwHttpError(message, response.status)
    }

    onMeta?.({ model: config.chatModel })
    await readOpenAiStream(response, chunk => {
      const token = chunk.choices?.[0]?.delta?.content || ''
      if (token) onToken?.(token)
    })
    onDone?.()
  } catch (err) {
    if (err.name === 'AbortError') {
      throwHttpError('AI chat stream request timed out.', 504)
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

async function testAiConfig(config) {
  const result = await requestChatCompletion(
    config,
    [
      { role: 'system', content: 'You are a connection test endpoint. Reply with OK.' },
      { role: 'user', content: 'ping' },
    ],
    { maxTokens: 16, timeoutMs: 20000 },
  )

  let embeddingModel = 'local-hash-vector'
  if (hasRemoteEmbeddingConfig(config)) {
    await requestEmbeddings(config, ['ping'])
    embeddingModel = config.embedModel
  }

  return {
    ok: true,
    model: result.model,
    embeddingModel,
    message: 'AI config test passed',
  }
}

async function requestEmbeddings(config, inputs) {
  if (!hasRemoteEmbeddingConfig(config)) {
    throwHttpError('Please configure API Base URL, API Key and embedding model first.', 400)
  }

  const inputList = Array.isArray(inputs) ? inputs : [inputs]
  const batchSize = getEmbeddingBatchSize(config)
  const embeddings = []

  for (let start = 0; start < inputList.length; start += batchSize) {
    const batch = inputList.slice(start, start + batchSize)
    const data = await withRetry(
      () => postJson(
        `${normalizeBaseUrl(config.baseUrl)}/embeddings`,
        config.apiKey,
        buildEmbeddingPayload(config, batch),
        EMBEDDING_TIMEOUT_MS,
        'Embedding',
      ),
      EMBEDDING_RETRY_TIMES,
      'Embedding',
    )

    const batchEmbeddings = (data.data || [])
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding)

    if (batchEmbeddings.length !== batch.length) {
      throwHttpError('Embedding API returned a mismatched number of vectors.', 502)
    }

    embeddings.push(...batchEmbeddings)
  }

  return embeddings
}

function buildEmbeddingPayload(config, input) {
  const payload = {
    model: config.embedModel,
    input,
  }

  if (isDashScopeCompatibleUrl(config.baseUrl)) {
    payload.encoding_format = 'float'
  }

  if (config.embeddingDimensions) {
    payload.dimensions = Number(config.embeddingDimensions)
  }

  return payload
}

function getEmbeddingBatchSize(config) {
  if (!isDashScopeCompatibleUrl(config.baseUrl)) {
    return 100
  }

  const model = String(config.embedModel || '').toLowerCase()
  if (model.includes('text-embedding-v1') || model.includes('text-embedding-v2')) {
    return 25
  }

  // Bailian text-embedding-v4 supports 10 rows per request.
  // Use the same conservative size for v3 and unknown Bailian embedding models.
  return 10
}

function isDashScopeCompatibleUrl(baseUrl) {
  try {
    const host = new URL(baseUrl).host.toLowerCase()
    return host.includes('dashscope.aliyuncs.com') || host.includes('maas.aliyuncs.com')
  } catch {
    return false
  }
}

async function generateKnowledgeAnswer(config, { message, hits = [], onlyKb = true }) {
  return requestChatCompletion(config, buildKnowledgeAnswerMessages({ message, hits, onlyKb }), { maxTokens: 1600 })
}

async function generateKnowledgeAnswerStream(config, { message, hits = [], onlyKb = true, onToken, onDone, onMeta }) {
  return requestChatCompletionStream(
    config,
    buildKnowledgeAnswerMessages({ message, hits, onlyKb }),
    { maxTokens: 1600, onToken, onDone, onMeta },
  )
}

function buildKnowledgeAnswerMessages({ message, hits = [], onlyKb = true }) {
  const context = hits.map((hit, index) => (
    `Reference ${index + 1}\nFile: ${hit.fileName}\nContent: ${hit.text}`
  )).join('\n\n')

  return [
    {
      role: 'system',
      content: [
        'You are a knowledge-base assistant. Answer accurately and concisely.',
        'Prefer the provided knowledge-base references.',
        onlyKb
          ? 'If the references are insufficient, say that the knowledge base does not provide enough evidence.'
          : 'If references are insufficient, you may add general advice and clearly mark it as inference.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        context ? `Knowledge-base references:\n${context}` : 'No knowledge-base references were retrieved.',
        `User question: ${message}`,
      ].join('\n\n'),
    },
  ]
}

async function generateKnowledgeSummary(config, { files = [], chunks = [] }) {
  return requestChatCompletion(config, buildKnowledgeSummaryMessages({ files, chunks }), { maxTokens: 1800 })
}

async function generateKnowledgeSummaryStream(config, { files = [], chunks = [], onToken, onDone, onMeta }) {
  return requestChatCompletionStream(
    config,
    buildKnowledgeSummaryMessages({ files, chunks }),
    { maxTokens: 1800, onToken, onDone, onMeta },
  )
}

function buildKnowledgeSummaryMessages({ files = [], chunks = [] }) {
  const fileNames = files.map(file => file.name).join(', ') || 'none'
  const context = chunks.slice(0, 8).map((chunk, index) => (
    `Chunk ${index + 1}\nFile: ${chunk.metadata?.fileName || chunk.fileId}\nContent: ${chunk.text.slice(0, 800)}`
  )).join('\n\n')

  return [
    {
      role: 'system',
      content: 'You are a knowledge-base summarization assistant. Output a structured Chinese summary with overview, key points, risks, and todos.',
    },
    {
      role: 'user',
      content: `Files: ${fileNames}\n\nKnowledge chunks:\n${context || 'No knowledge chunks.'}`,
    },
  ]
}

async function postJson(url, apiKey, body, timeoutMs, label) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = data.error?.message || data.message || `${label} API returned ${response.status}`
      throwHttpError(message, response.status)
    }

    return data
  } catch (err) {
    if (err.name === 'AbortError') {
      throwHttpError(`${label} API request timed out.`, 504)
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

async function readOpenAiStream(response, onChunk) {
  const reader = response.body?.getReader()
  if (!reader) {
    throwHttpError('AI chat stream response has no readable body.', 502)
  }

  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() || ''

    for (const block of blocks) {
      const dataLines = block
        .split('\n')
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trim())

      for (const dataLine of dataLines) {
        if (!dataLine || dataLine === '[DONE]') continue
        onChunk(JSON.parse(dataLine))
      }
    }
  }
}

async function withRetry(task, retryTimes, label) {
  let lastError
  for (let attempt = 0; attempt <= retryTimes; attempt += 1) {
    try {
      return await task()
    } catch (err) {
      lastError = err
      if (attempt === retryTimes || !isRetryableError(err)) break
      await sleep(500 * (attempt + 1))
    }
  }

  lastError.message = `${label} failed after ${retryTimes + 1} attempt(s): ${lastError.message}`
  throw lastError
}

function isRetryableError(err) {
  return !err.status || err.status === 429 || err.status >= 500
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function throwHttpError(message, status) {
  const err = new Error(message)
  err.status = status
  throw err
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '')
}

module.exports = {
  hasRemoteChatConfig,
  hasRemoteEmbeddingConfig,
  testAiConfig,
  generateKnowledgeAnswer,
  generateKnowledgeAnswerStream,
  generateKnowledgeSummary,
  generateKnowledgeSummaryStream,
  requestEmbeddings,
  getEmbeddingBatchSize,
  isDashScopeCompatibleUrl,
}
