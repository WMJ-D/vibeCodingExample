const fs = require('fs/promises')
const path = require('path')
const crypto = require('crypto')
const mammoth = require('mammoth')
const WordExtractor = require('word-extractor')
const officeParser = require('officeparser')
const { readDb, writeDb, readVectorIndex, writeVectorIndex } = require('./storage')
const { buildIndex, buildIndexFromVectors, searchIndex, searchVectorIndex } = require('./vectorIndex')
const {
  hasRemoteChatConfig,
  hasRemoteEmbeddingConfig,
  testAiConfig,
  generateKnowledgeAnswer,
  generateKnowledgeAnswerStream,
  generateKnowledgeSummary,
  generateKnowledgeSummaryStream,
  requestEmbeddings,
} = require('./llmService')

const SUPPORTED_EXTENSIONS = new Set(['.md', '.pdf', '.ppt', '.pptx', '.doc', '.docx'])
const TEXT_EXTENSIONS = new Set(['.md'])
const WORD_EXTENSIONS = new Set(['.docx'])
const LEGACY_WORD_EXTENSIONS = new Set(['.doc'])
const OFFICE_PARSER_EXTENSIONS = new Set(['.pdf', '.pptx'])
const LEGACY_POWERPOINT_EXTENSIONS = new Set(['.ppt'])
const CHUNK_SIZE = 900
const CHUNK_OVERLAP = 120
const OFFICE_PARSE_TIMEOUT_MS = 120_000
const MAX_EXTRACTED_TEXT_BYTES = 5 * 1024 * 1024
const EXTRACTOR_VERSION = '2026-06-09-office-text-v2'
const legacyWordExtractor = new WordExtractor()

function normalizePath(filePath) {
  return path.resolve(filePath)
}

function isSubPath(parent, child) {
  const relative = path.relative(normalizePath(parent), normalizePath(child))
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative)
}

function getFileType(filePath) {
  return path.extname(filePath).slice(1).toLowerCase()
}

function toPublicFile(file) {
  return {
    id: file.id,
    name: file.name,
    type: file.type,
    size: file.size,
    sizeLabel: formatSize(file.size),
    path: file.path,
    status: file.status,
    chunkCount: file.chunkIds.length,
    mtimeMs: file.mtimeMs,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function listSupportedFiles(folderPath) {
  const entries = await fs.readdir(folderPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listSupportedFiles(fullPath))
      continue
    }
    if (!entry.isFile()) continue

    const ext = path.extname(entry.name).toLowerCase()
    if (SUPPORTED_EXTENSIONS.has(ext)) files.push(fullPath)
  }

  return files
}

async function extractText(filePath, stat) {
  const ext = path.extname(filePath).toLowerCase()
  const fileName = path.basename(filePath)

  if (TEXT_EXTENSIONS.has(ext)) {
    return fs.readFile(filePath, 'utf8')
  }

  if (WORD_EXTENSIONS.has(ext)) {
    try {
      const result = await mammoth.extractRawText({ path: filePath })
      const text = String(result.value || '').trim()
      if (text) return text
    } catch (err) {
      return [
        `文件名：${fileName}`,
        '文件类型：docx',
        `文件大小：${formatSize(stat.size)}`,
        `Word 正文抽取失败：${err.message}`,
      ].join('\n')
    }

    return [
      `文件名：${fileName}`,
      '文件类型：docx',
      `文件大小：${formatSize(stat.size)}`,
      'Word 文档已成功读取，但未抽取到正文内容。',
    ].join('\n')
  }

  if (LEGACY_WORD_EXTENSIONS.has(ext)) {
    try {
      const result = await legacyWordExtractor.extract(filePath)
      const text = String(result.getBody() || '').trim()
      if (text) return text
    } catch (err) {
      return [
        `文件名：${fileName}`,
        '文件类型：doc',
        `文件大小：${formatSize(stat.size)}`,
        `旧版 Word 正文抽取失败：${err.message}`,
      ].join('\n')
    }

    return [
      `文件名：${fileName}`,
      '文件类型：doc',
      `文件大小：${formatSize(stat.size)}`,
      '旧版 Word 文档已成功读取，但未抽取到正文内容。',
    ].join('\n')
  }

  if (OFFICE_PARSER_EXTENSIONS.has(ext)) {
    return extractOfficeParserText(filePath, stat, ext.slice(1))
  }

  if (LEGACY_POWERPOINT_EXTENSIONS.has(ext)) {
    return extractLegacyPowerPointText(filePath, stat)
  }

  return [
    `文件名：${fileName}`,
    `文件类型：${ext.slice(1)}`,
    `文件大小：${formatSize(stat.size)}`,
    '当前服务已完成文件入库和向量索引流程。',
    '当前文件类型暂未接入正文抽取解析器。',
  ].join('\n')
}

async function extractOfficeParserText(filePath, stat, fileType) {
  const fileName = path.basename(filePath)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OFFICE_PARSE_TIMEOUT_MS)

  try {
    const ast = await officeParser.parseOffice(filePath, {
      fileType,
      newlineDelimiter: '\n',
      ignoreSlideMasters: true,
      abortSignal: controller.signal,
    })
    const output = typeof ast.to === 'function'
      ? await ast.to('text')
      : { value: ast.toText?.() }
    const text = limitExtractedText(String(output?.value || '').trim())
    if (text) return text
  } catch (err) {
    return [
      `文件名：${fileName}`,
      `文件类型：${fileType}`,
      `文件大小：${formatSize(stat.size)}`,
      `${fileType.toUpperCase()} 正文抽取失败：${err.message}`,
    ].join('\n')
  } finally {
    clearTimeout(timeout)
  }

  return [
    `文件名：${fileName}`,
    `文件类型：${fileType}`,
    `文件大小：${formatSize(stat.size)}`,
    `${fileType.toUpperCase()} 文档已成功读取，但未抽取到正文内容。`,
  ].join('\n')
}

async function extractLegacyPowerPointText(filePath, stat) {
  const fileName = path.basename(filePath)

  try {
    const buffer = await fs.readFile(filePath)
    const text = limitExtractedText(extractReadableStrings(buffer).trim())
    if (text) return text
  } catch (err) {
    return [
      `文件名：${fileName}`,
      '文件类型：ppt',
      `文件大小：${formatSize(stat.size)}`,
      `旧版 PPT 正文抽取失败：${err.message}`,
    ].join('\n')
  }

  return [
    `文件名：${fileName}`,
    '文件类型：ppt',
    `文件大小：${formatSize(stat.size)}`,
    '旧版 PPT 文档已读取，但未抽取到可识别正文内容。',
  ].join('\n')
}

function extractReadableStrings(buffer) {
  const asciiText = buffer.toString('latin1')
    .replace(/[^\x20-\x7E\r\n\t]+/g, '\n')
    .split(/\n+/)
  const utf16Text = buffer.toString('utf16le')
    .replace(/[^\u4e00-\u9fa5A-Za-z0-9，。！？、；：,.!?;:()\[\]《》“”"'\\/\-\s]+/g, '\n')
    .split(/\n+/)

  const seen = new Set()
  const lines = [...utf16Text, ...asciiText]
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length >= 2)
    .filter(line => /[\u4e00-\u9fa5A-Za-z0-9]/.test(line))
    .filter(line => {
      const key = line.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  return lines.join('\n')
}

function limitExtractedText(text) {
  if (Buffer.byteLength(text, 'utf8') <= MAX_EXTRACTED_TEXT_BYTES) return text

  let byteSize = 0
  let endIndex = 0
  for (const char of text) {
    const charSize = Buffer.byteLength(char, 'utf8')
    if (byteSize + charSize > MAX_EXTRACTED_TEXT_BYTES) break
    byteSize += charSize
    endIndex += char.length
  }

  return `${text.slice(0, endIndex)}\n\n[正文过长，已截取前 ${formatSize(MAX_EXTRACTED_TEXT_BYTES)} 内容用于索引]`
}

function splitChunks(text) {
  const clean = String(text || '').replace(/\r\n/g, '\n').trim()
  if (!clean) return []

  const chunks = []
  let start = 0

  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length)
    chunks.push(clean.slice(start, end))
    if (end === clean.length) break
    start = Math.max(0, end - CHUNK_OVERLAP)
  }

  return chunks
}

async function rebuildVectorIndex(db) {
  const index = hasRemoteEmbeddingConfig(db.config) && db.chunks.length
    ? buildIndexFromVectors(
      db.chunks,
      await requestEmbeddings(db.config, db.chunks.map(chunk => chunk.text)),
      db.config.embedModel,
    )
    : buildIndex(db.chunks)
  await writeVectorIndex(index)
  return index
}

async function scanFolder(folderPath) {
  const resolvedFolder = normalizePath(folderPath)
  const stat = await fs.stat(resolvedFolder)
  if (!stat.isDirectory()) {
    const err = new Error('folderPath 必须是一个文件夹')
    err.status = 400
    throw err
  }

  const db = await readDb()
  const now = new Date().toISOString()
  const diskFiles = await listSupportedFiles(resolvedFolder)
  const diskFileSet = new Set(diskFiles.map(normalizePath))
  const existingByPath = new Map(db.files.map(file => [normalizePath(file.path), file]))
  const nextFiles = []
  const nextChunks = []

  for (const filePath of diskFiles) {
    const fileStat = await fs.stat(filePath)
    const existing = existingByPath.get(normalizePath(filePath))
    const unchanged = existing &&
      existing.size === fileStat.size &&
      existing.mtimeMs === fileStat.mtimeMs &&
      existing.extractorVersion === EXTRACTOR_VERSION

    if (unchanged) {
      nextFiles.push(existing)
      nextChunks.push(...db.chunks.filter(chunk => existing.chunkIds.includes(chunk.id)))
      continue
    }

    const text = await extractText(filePath, fileStat)
    const chunkTexts = splitChunks(text)
    const fileId = existing?.id || crypto.randomUUID()
    const chunkIds = chunkTexts.map(() => crypto.randomUUID())
    const fileChunks = chunkTexts.map((chunkText, index) => ({
      id: chunkIds[index],
      fileId,
      index,
      text: chunkText,
      metadata: {
        fileName: path.basename(filePath),
        filePath,
        type: getFileType(filePath),
      },
    }))

    nextFiles.push({
      id: fileId,
      name: path.basename(filePath),
      type: getFileType(filePath),
      size: fileStat.size,
      path: filePath,
      status: chunkTexts.length ? '已索引' : '空文件',
      chunkIds,
      mtimeMs: fileStat.mtimeMs,
      extractorVersion: EXTRACTOR_VERSION,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    })
    nextChunks.push(...fileChunks)
  }

  db.folderPath = resolvedFolder
  db.files = nextFiles.filter(file => diskFileSet.has(normalizePath(file.path)))
  db.chunks = nextChunks
  await writeDb(db)
  await rebuildVectorIndex(db)

  return {
    folderPath: db.folderPath,
    files: db.files.map(toPublicFile),
    chunkCount: db.chunks.length,
  }
}

async function listFiles() {
  const db = await readDb()
  return {
    folderPath: db.folderPath,
    files: db.files.map(toPublicFile),
    chunkCount: db.chunks.length,
  }
}

async function addTextDocument({ name, content }) {
  const db = await readDb()
  if (!db.folderPath) {
    const err = new Error('请先设置知识库目录')
    err.status = 400
    throw err
  }

  const safeName = path.basename(name || `note-${Date.now()}.md`)
  const finalName = safeName.toLowerCase().endsWith('.md') ? safeName : `${safeName}.md`
  const targetPath = normalizePath(path.join(db.folderPath, finalName))
  if (!isSubPath(db.folderPath, targetPath)) {
    const err = new Error('文件名不合法')
    err.status = 400
    throw err
  }

  await fs.writeFile(targetPath, String(content || ''), 'utf8')
  return scanFolder(db.folderPath)
}

async function addUploadedDocument({ name, contentBase64 }) {
  const db = await readDb()
  if (!db.folderPath) {
    const err = new Error('请先设置知识库目录')
    err.status = 400
    throw err
  }

  const safeName = path.basename(name || `upload-${Date.now()}.md`)
  const ext = path.extname(safeName).toLowerCase()
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    const err = new Error('暂不支持该文件类型')
    err.status = 400
    throw err
  }

  const targetPath = normalizePath(path.join(db.folderPath, safeName))
  if (!isSubPath(db.folderPath, targetPath)) {
    const err = new Error('文件名不合法')
    err.status = 400
    throw err
  }

  const buffer = Buffer.from(String(contentBase64 || ''), 'base64')
  await fs.writeFile(targetPath, buffer)
  return scanFolder(db.folderPath)
}

async function deleteFile(fileId, removeFromDisk = true) {
  const db = await readDb()
  const file = db.files.find(item => item.id === fileId)
  if (!file) {
    const err = new Error('文件不存在')
    err.status = 404
    throw err
  }

  if (removeFromDisk && db.folderPath && isSubPath(db.folderPath, file.path)) {
    await fs.rm(file.path, { force: true })
  }

  db.files = db.files.filter(item => item.id !== fileId)
  db.chunks = db.chunks.filter(chunk => chunk.fileId !== fileId)
  await writeDb(db)
  await rebuildVectorIndex(db)

  return { deletedId: fileId }
}

async function searchKnowledge(query, topK = 5) {
  const db = await readDb()
  const index = await readVectorIndex()
  const chunkMap = new Map(db.chunks.map(chunk => [chunk.id, chunk]))
  const fileMap = new Map(db.files.map(file => [file.id, file]))
  const hits = hasRemoteEmbeddingConfig(db.config)
    ? searchVectorIndex(index, (await requestEmbeddings(db.config, [query]))[0], Number(topK) || 5)
    : searchIndex(index, query, Number(topK) || 5)

  return hits
    .map(hit => {
      const chunk = chunkMap.get(hit.chunkId)
      const file = fileMap.get(hit.fileId)
      if (!chunk || !file) return null

      return {
        id: hit.chunkId,
        fileId: hit.fileId,
        fileName: file.name,
        fileType: file.type,
        score: Number(Math.max(0, Math.min(1, hit.score)).toFixed(4)),
        text: chunk.text,
        chunkIndex: chunk.index,
      }
    })
    .filter(Boolean)
}

async function summarizeKnowledge({ scope = 'all', fileIds = [] }) {
  const db = await readDb()
  const targetFiles = scope === 'selected'
    ? db.files.filter(file => fileIds.includes(file.id))
    : db.files

  const targetFileIds = new Set(targetFiles.map(file => file.id))
  const chunks = db.chunks.filter(chunk => targetFileIds.has(chunk.fileId))
  const preview = chunks.slice(0, 5).map(chunk => chunk.text.slice(0, 180)).join('\n')

  if (hasRemoteChatConfig(db.config)) {
    try {
      const result = await generateKnowledgeSummary(db.config, { files: targetFiles, chunks })
      return {
        scope,
        fileCount: targetFiles.length,
        chunkCount: chunks.length,
        model: result.model,
        usage: result.usage,
        summary: result.content,
      }
    } catch (err) {
      err.message = `AI 总结失败：${err.message}`
      err.status = err.status || 502
      throw err
    }
  }

  return {
    scope,
    fileCount: targetFiles.length,
    chunkCount: chunks.length,
    summary: [
      `本次总结覆盖 ${targetFiles.length} 个文件、${chunks.length} 个知识片段。`,
      targetFiles.length ? `文件：${targetFiles.map(file => file.name).join('、')}` : '暂无可总结文件。',
      preview ? `核心片段预览：\n${preview}` : '当前知识库暂无文本片段。',
      '当前为本地规则摘要；接入 AI API 后可替换为真正的大模型总结。',
    ].join('\n\n'),
  }
}

async function chatWithKnowledge({ message, onlyKb = true, topK = 4 }) {
  const db = await readDb()
  const hits = onlyKb ? await searchKnowledge(message, topK) : []
  const references = hits.map(hit => ({
    fileId: hit.fileId,
    fileName: hit.fileName,
    score: hit.score,
    chunkIndex: hit.chunkIndex,
  }))

  if (hasRemoteChatConfig(db.config)) {
    try {
      const result = await generateKnowledgeAnswer(db.config, { message, hits, onlyKb })
      return {
        answer: result.content,
        references,
        model: result.model,
        usage: result.usage,
      }
    } catch (err) {
      err.message = `AI 对话失败：${err.message}`
      err.status = err.status || 502
      throw err
    }
  }

  return {
    answer: [
      onlyKb ? '已基于本地知识库检索生成回答。' : '已按通用模式生成回答。',
      hits.length
        ? `命中 ${hits.length} 个片段，优先参考：${hits.map(hit => hit.fileName).join('、')}。`
        : '当前没有命中片段，建议先刷新索引或换一个问题。',
      `问题：${message}`,
      '下一步接入 LLM 后，这里会把命中片段作为上下文发送给模型生成最终答案。',
    ].join('\n'),
    references,
  }
}

async function streamChatWithKnowledge({ message, onlyKb = true, topK = 4 }, emit) {
  const db = await readDb()
  const hits = onlyKb ? await searchKnowledge(message, topK) : []
  const references = hits.map(hit => ({
    fileId: hit.fileId,
    fileName: hit.fileName,
    score: hit.score,
    chunkIndex: hit.chunkIndex,
  }))

  emit('references', references)

  if (hasRemoteChatConfig(db.config)) {
    await generateKnowledgeAnswerStream(db.config, {
      message,
      hits,
      onlyKb,
      onToken: token => emit('token', token),
      onMeta: meta => emit('meta', meta),
      onDone: () => emit('done', { ok: true }),
    })
    return
  }

  const localAnswer = buildLocalChatAnswer({ message, onlyKb, hits })
  for (const token of localAnswer.match(/.{1,18}/gs) || []) {
    emit('token', token)
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  emit('done', { ok: true, mode: 'local' })
}

async function streamSummaryKnowledge({ scope = 'all', fileIds = [] }, emit) {
  const db = await readDb()
  const targetFiles = scope === 'selected'
    ? db.files.filter(file => fileIds.includes(file.id))
    : db.files
  const targetFileIds = new Set(targetFiles.map(file => file.id))
  const chunks = db.chunks.filter(chunk => targetFileIds.has(chunk.fileId))

  emit('meta', { fileCount: targetFiles.length, chunkCount: chunks.length })

  if (hasRemoteChatConfig(db.config)) {
    await generateKnowledgeSummaryStream(db.config, {
      files: targetFiles,
      chunks,
      onToken: token => emit('token', token),
      onMeta: meta => emit('meta', meta),
      onDone: () => emit('done', { ok: true }),
    })
    return
  }

  const payload = await summarizeKnowledge({ scope, fileIds })
  for (const token of payload.summary.match(/.{1,24}/gs) || []) {
    emit('token', token)
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  emit('done', { ok: true, mode: 'local' })
}

function buildLocalChatAnswer({ message, onlyKb, hits }) {
  return [
    onlyKb ? '已基于本地知识库检索生成回答。' : '已按通用模式生成回答。',
    hits.length
      ? `命中 ${hits.length} 个片段，优先参考：${hits.map(hit => hit.fileName).join('、')}。`
      : '当前没有命中片段，建议先刷新索引或换一个问题。',
    `问题：${message}`,
    '配置真实 AI 后，这里会通过流式接口持续输出模型回答。',
  ].join('\n')
}

async function getConfig() {
  const db = await readDb()
  return db.config
}

async function saveConfig(config) {
  const db = await readDb()
  const oldConfig = db.config
  db.config = { ...db.config, ...config }

  if (embeddingConfigChanged(oldConfig, db.config) && db.chunks.length) {
    await rebuildVectorIndex(db)
  }

  await writeDb(db)
  return db.config
}

function embeddingConfigChanged(oldConfig = {}, nextConfig = {}) {
  return (
    oldConfig.baseUrl !== nextConfig.baseUrl ||
    oldConfig.apiKey !== nextConfig.apiKey ||
    oldConfig.embedModel !== nextConfig.embedModel
  )
}

async function testConfig(configOverride) {
  const db = await readDb()
  return testAiConfig(configOverride || db.config)
}

module.exports = {
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
}
