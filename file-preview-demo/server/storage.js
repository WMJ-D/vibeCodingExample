const fs = require('fs/promises')
const path = require('path')

const dataDir = path.join(__dirname, 'data')
const dbFile = path.join(dataDir, 'knowledge-db.json')
const vectorFile = path.join(dataDir, 'vector-index.json')

const defaultDb = {
  folderPath: '',
  files: [],
  chunks: [],
  config: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    chatModel: 'gpt-4o-mini',
    embedModel: 'local-hash-vector',
    temperature: 0.3,
    contextLength: 4096,
  },
  updatedAt: null,
}

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true })
}

async function readJson(filePath, fallback) {
  await ensureDataDir()
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    if (err.code === 'ENOENT') {
      await writeJson(filePath, fallback)
      return structuredClone(fallback)
    }
    throw err
  }
}

async function writeJson(filePath, data) {
  await ensureDataDir()
  const tmpFile = `${filePath}.${Date.now()}.tmp`
  await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf8')
  await fs.rename(tmpFile, filePath)
}

async function readDb() {
  const db = await readJson(dbFile, defaultDb)
  return { ...structuredClone(defaultDb), ...db }
}

async function writeDb(db) {
  await writeJson(dbFile, { ...db, updatedAt: new Date().toISOString() })
}

async function readVectorIndex() {
  return readJson(vectorFile, { dimension: 256, items: [], updatedAt: null })
}

async function writeVectorIndex(index) {
  await writeJson(vectorFile, { ...index, updatedAt: new Date().toISOString() })
}

module.exports = {
  dataDir,
  readDb,
  writeDb,
  readVectorIndex,
  writeVectorIndex,
}

