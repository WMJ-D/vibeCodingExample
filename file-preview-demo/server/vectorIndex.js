const DIMENSION = 256

function hashToken(token) {
  let hash = 2166136261
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function tokenize(text) {
  const normalized = String(text || '').toLowerCase()
  const words = []
  let asciiToken = ''

  for (const char of normalized) {
    if (isAsciiWordChar(char)) {
      asciiToken += char
      continue
    }

    if (asciiToken) {
      words.push(asciiToken)
      asciiToken = ''
    }

    if (isCjkChar(char)) {
      words.push(char)
    }
  }

  if (asciiToken) words.push(asciiToken)

  const shingles = []

  for (let i = 0; i < words.length - 1; i += 1) {
    shingles.push(`${words[i]}_${words[i + 1]}`)
  }

  return [...words, ...shingles]
}

function isAsciiWordChar(char) {
  return /[a-z0-9_]/.test(char)
}

function isCjkChar(char) {
  const code = char.codePointAt(0)
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x20000 && code <= 0x2a6df)
  )
}

function vectorize(text) {
  const vector = new Array(DIMENSION).fill(0)
  const tokens = tokenize(text)

  for (const token of tokens) {
    const hash = hashToken(token)
    const index = hash % DIMENSION
    vector[index] += 1
  }

  return normalize(vector)
}

function normalize(vector) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  if (!norm) return vector
  return vector.map(value => Number((value / norm).toFixed(6)))
}

function cosineSimilarity(a, b) {
  const len = Math.min(a.length, b.length)
  let score = 0
  for (let i = 0; i < len; i += 1) {
    score += a[i] * b[i]
  }
  return score
}

function buildIndex(chunks) {
  return {
    dimension: DIMENSION,
    provider: 'local-hash-vector',
    items: chunks.map(chunk => ({
      chunkId: chunk.id,
      fileId: chunk.fileId,
      vector: vectorize(chunk.text),
    })),
    updatedAt: new Date().toISOString(),
  }
}

function searchIndex(index, query, topK = 5) {
  const queryVector = vectorize(query)
  return searchVectorIndex(index, queryVector, topK)
}

function buildIndexFromVectors(chunks, vectors, provider) {
  const dimension = vectors[0]?.length || 0
  return {
    dimension,
    provider,
    items: chunks.map((chunk, index) => ({
      chunkId: chunk.id,
      fileId: chunk.fileId,
      vector: normalize(vectors[index] || []),
    })),
    updatedAt: new Date().toISOString(),
  }
}

function searchVectorIndex(index, queryVector, topK = 5) {
  const normalizedQuery = normalize(queryVector)
  return index.items
    .map(item => ({
      ...item,
      score: cosineSimilarity(normalizedQuery, item.vector),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

module.exports = {
  DIMENSION,
  vectorize,
  buildIndex,
  buildIndexFromVectors,
  searchIndex,
  searchVectorIndex,
}
