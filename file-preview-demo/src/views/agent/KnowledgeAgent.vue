<template>
  <div class="knowledge-agent-page">
    <!-- 顶栏：知识库目录 -->
    <div class="top-bar">
      <div class="top-bar-left">
        <el-icon :size="20" style="color: #5ec49a"><Cpu /></el-icon>
        <span class="page-title">知识库智能体</span>
      </div>
      <div class="folder-row">
        <el-input
          v-model="folderPath"
          placeholder="知识库目录路径（前端展示用，实际由后端/桌面端管理）"
          clearable
          class="folder-input"
        >
          <template #prefix><el-icon><FolderOpened /></el-icon></template>
        </el-input>
        <el-button type="primary" icon="FolderChecked" @click="saveFolder">保存目录</el-button>
        <el-button icon="Refresh" @click="refreshIndex">刷新索引</el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div v-for="s in stats" :key="s.label" class="stat-card">
        <div class="stat-value">{{ s.value }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </div>
    </div>

    <!-- 主体三栏 -->
    <div class="main-grid">
      <!-- 左：文件管理 -->
      <div class="panel file-panel">
        <div class="panel-header">
          <span>文件管理</span>
          <el-upload
            :show-file-list="false"
            :before-upload="handleUpload"
            accept=".md,.pdf,.ppt,.pptx,.doc,.docx"
            multiple
          >
            <el-button type="primary" size="small" icon="UploadFilled">导入文件</el-button>
          </el-upload>
        </div>
        <div class="file-filter">
          <el-input v-model="fileSearch" placeholder="搜索文件名" clearable size="small">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="fileType" placeholder="类型" clearable size="small" style="width:110px">
            <el-option label="全部" value="" />
            <el-option v-for="t in fileTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </div>
        <div class="file-list">
          <div v-if="!filteredFiles.length" class="empty-hint">暂无文件，请导入或等待索引</div>
          <div
            v-for="f in filteredFiles"
            :key="f.id"
            class="file-row"
            :class="{ active: selectedFileIds.includes(f.id) }"
            @click="toggleSelectFile(f.id)"
          >
            <div class="file-info">
              <el-icon style="margin-right:6px;color:#5ec49a"><Document /></el-icon>
              <span class="file-name" :title="f.name">{{ f.name }}</span>
            </div>
            <div class="file-meta">
              <el-tag :type="statusTagType(f.status)" size="small" effect="dark" round>{{ f.status }}</el-tag>
              <span class="file-size">{{ f.sizeLabel }}</span>
              <el-button link type="danger" icon="Delete" @click.stop="deleteFile(f.id)" />
              <el-button link type="primary" icon="MagicStick" @click.stop="summarizeFile(f)" title="智能总结" />
            </div>
          </div>
        </div>
        <div class="file-footer">
          <span>已选 {{ selectedFileIds.length }} / {{ files.length }} 项</span>
          <el-button size="small" icon="Delete" type="danger" :disabled="!selectedFileIds.length" @click="deleteSelected">批量删除</el-button>
        </div>
      </div>

      <!-- 中：检索 / 对话 / 总结 -->
      <div class="panel center-panel">
        <el-tabs v-model="activeTab" class="agent-tabs">
          <!-- 知识搜索 -->
          <el-tab-pane label="知识搜索" name="search">
            <div class="search-bar">
              <el-input v-model="searchQuery" placeholder="输入关键词，检索知识库内容" clearable>
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>
              <el-radio-group v-model="searchMode" size="small">
                <el-radio-button label="keyword">关键词</el-radio-button>
                <el-radio-button label="semantic">语义</el-radio-button>
              </el-radio-group>
              <el-button type="primary" icon="Search" @click="runSearch">检索</el-button>
            </div>
            <div class="result-list">
              <div v-if="!searchResults.length" class="empty-hint">{{ searchQuery ? '未检索到相关内容' : '输入关键词后点击检索' }}</div>
              <div v-for="r in searchResults" :key="r.id" class="result-card">
                <div class="result-title">
                  <el-icon><Document /></el-icon>
                  <span>{{ r.file }}</span>
                  <el-tag size="small" type="success" effect="plain" round>相关度 {{ r.score }}%</el-tag>
                </div>
                <div class="result-snippet" v-html="r.snippet" />
                <div class="result-actions">
                  <el-button size="small" icon="ChatDotRound" @click="prefillChat(r)">发送到对话</el-button>
                  <el-button size="small" icon="MagicStick" @click="summarizeResult(r)">生成总结</el-button>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- AI 对话 -->
          <el-tab-pane label="AI 对话" name="chat">
            <div class="chat-area">
              <div class="chat-messages" ref="chatBox">
                <div v-if="!chatMessages.length" class="empty-hint">输入问题开始与知识库智能体对话</div>
                <div
                  v-for="msg in chatMessages"
                  :key="msg.id"
                  :class="['chat-msg', msg.role === 'user' ? 'is-user' : 'is-ai']"
                >
                  <div class="bubble">
                    <div
                      class="bubble-text markdown-body"
                      v-html="msg.role === 'ai' ? renderMarkdown(msg.text) : escapeHtml(msg.text)"
                    />
                    <div v-if="msg.refs?.length" class="bubble-refs">
                      <el-tag v-for="ref in msg.refs" :key="ref" size="small" type="info" effect="plain">{{ ref }}</el-tag>
                    </div>
                  </div>
                </div>
              </div>
              <div class="chat-input-bar">
                <el-switch v-model="onlyKb" active-text="仅基于知识库" inactive-text="" style="--el-switch-on-color:#2b8e6a" />
                <el-input
                  v-model="chatInput"
                  placeholder="请输入问题..."
                  clearable
                  @keyup.enter="sendMessage"
                />
                <el-button type="primary" icon="Promotion" @click="sendMessage">发送</el-button>
              </div>
            </div>
          </el-tab-pane>

          <!-- 智能总结 -->
          <el-tab-pane label="智能总结" name="summary">
            <div class="summary-bar">
              <el-select v-model="summaryScope" class="summary-scope-select">
                <el-option label="当前已选文件" value="selected" />
                <el-option label="整个知识库" value="all" />
              </el-select>
              <el-button type="primary" icon="MagicStick" :loading="summaryLoading" @click="generateSummary">生成总结</el-button>
            </div>
            <div v-if="!summaryText" class="empty-hint">选择范围后点击生成，将基于当前原型数据生成演示摘要</div>
            <div v-else class="summary-output markdown-body" v-html="renderMarkdown(summaryText)" />
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 右：AI 配置 -->
      <div class="panel settings-panel">
        <div class="panel-header"><span>AI 配置</span></div>
        <el-form label-position="top" size="small" class="settings-form">
          <el-form-item label="API Base URL">
            <el-input v-model="config.baseUrl" placeholder="https://api.openai.com/v1" />
          </el-form-item>
          <el-form-item label="API Key">
            <el-input v-model="config.apiKey" type="password" show-password placeholder="sk-..." />
          </el-form-item>
          <el-form-item label="对话模型">
            <el-input v-model="config.chatModel" placeholder="gpt-4o-mini / deepseek-chat / ..." />
          </el-form-item>
          <el-form-item label="Embedding 模型">
            <el-input v-model="config.embedModel" placeholder="text-embedding-3-small" />
          </el-form-item>
          <el-form-item label="Temperature">
            <el-slider v-model="config.temperature" :min="0" :max="2" :step="0.1" show-input />
          </el-form-item>
          <el-form-item label="上下文长度">
            <el-input-number v-model="config.contextLength" :min="256" :max="131072" :step="256" controls-position="right" style="width:100%" />
          </el-form-item>
          <div class="settings-actions">
            <el-button type="primary" icon="Check" @click="saveConfig">保存配置</el-button>
            <el-button icon="Connection" @click="testConfig">测试连接</el-button>
            <el-button icon="Delete" @click="clearConfig">清空</el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, nextTick } from 'vue'
import { ElMessage } from 'element-plus'

const CONFIG_KEY = 'knowledge_agent_config'
const FOLDER_KEY = 'knowledge_agent_folder'
const fileTypes = ['md', 'pdf', 'ppt', 'pptx', 'doc', 'docx']

const folderPath = ref(localStorage.getItem(FOLDER_KEY) || 'D:\\知识库\\documents')
const fileSearch = ref('')
const fileType = ref('')
const activeTab = ref('search')
const searchQuery = ref('')
const searchMode = ref('keyword')
const chatInput = ref('')
const onlyKb = ref(true)
const chatBox = ref(null)
const summaryScope = ref('selected')
const summaryLoading = ref(false)
const summaryText = ref('')
const selectedFileIds = ref([])
const knowledgeChunkCount = ref(0)

const config = reactive(loadConfig())

function defaultConfig() {
  return {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    chatModel: 'gpt-4o-mini',
    embedModel: 'text-embedding-3-small',
    temperature: 0.3,
    contextLength: 4096,
  }
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? { ...defaultConfig(), ...JSON.parse(raw) } : defaultConfig()
  } catch {
    return defaultConfig()
  }
}

// ---------- 文件管理 ----------
let fileSeq = 1
const files = ref([
  { id: fileSeq++, name: '项目规范.md', type: 'md', size: 42300, status: '已索引', sizeLabel: '41.3 KB' },
  { id: fileSeq++, name: '产品需求文档.pdf', type: 'pdf', size: 1540000, status: '已索引', sizeLabel: '1.47 MB' },
  { id: fileSeq++, name: '技术方案.pptx', type: 'pptx', size: 880000, status: '索引中', sizeLabel: '859 KB' },
  { id: fileSeq++, name: '接口说明.docx', type: 'docx', size: 312000, status: '待索引', sizeLabel: '304 KB' },
  { id: fileSeq++, name: '会议纪要.md', type: 'md', size: 18700, status: '已索引', sizeLabel: '18.3 KB' },
])

const filteredFiles = computed(() => {
  return files.value.filter(f => {
    if (fileSearch.value && !f.name.toLowerCase().includes(fileSearch.value.toLowerCase())) return false
    if (fileType.value && f.type !== fileType.value) return false
    return true
  })
})

function statusTagType(status) {
  if (status === '已索引') return 'success'
  if (status === '索引中') return 'warning'
  return 'info'
}

function toggleSelectFile(id) {
  const idx = selectedFileIds.value.indexOf(id)
  if (idx >= 0) selectedFileIds.value.splice(idx, 1)
  else selectedFileIds.value.push(id)
}

function deleteFile(id) {
  files.value = files.value.filter(f => f.id !== id)
  selectedFileIds.value = selectedFileIds.value.filter(sid => sid !== id)
  ElMessage.success('已删除')
}

function deleteSelected() {
  if (!selectedFileIds.value.length) return
  const ids = new Set(selectedFileIds.value)
  files.value = files.value.filter(f => !ids.has(f.id))
  selectedFileIds.value = []
  ElMessage.success('批量删除完成')
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function handleUpload(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  files.value.unshift({
    id: fileSeq++,
    name: file.name,
    type: ext,
    size: file.size,
    status: '待索引',
    sizeLabel: formatSize(file.size),
  })
  ElMessage.success(`已导入: ${file.name}`)
  return false // 阻止自动上传
}

function saveFolder() {
  localStorage.setItem(FOLDER_KEY, folderPath.value)
  ElMessage.success('目录路径已保存（前端演示）')
}

function refreshIndex() {
  files.value.forEach(f => {
    if (f.status === '待索引') f.status = '索引中'
  })
  setTimeout(() => {
    files.value.forEach(f => {
      if (f.status === '索引中') f.status = '已索引'
    })
    ElMessage.success('索引刷新完成')
  }, 800)
}

// ---------- 统计 ----------
const stats = computed(() => [
  { label: '文件总数', value: files.value.length },
  { label: '已索引', value: files.value.filter(f => f.status === '已索引').length },
  { label: '知识片段', value: knowledgeChunkCount.value },
  { label: '会话数', value: chatMessages.value.length },
])

// ---------- 知识搜索 ----------
const searchResults = ref([])

function runSearch() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  const q = searchQuery.value.trim().toLowerCase()
  const indexed = files.value.filter(f => f.status === '已索引')
  searchResults.value = indexed.slice(0, 3).map((f, i) => ({
    id: f.id + '_r',
    file: f.name,
    score: Math.round(95 - i * 7 - Math.random() * 5),
    snippet: highlightSnippet(f.name, q, i),
  }))
}

function highlightSnippet(fileName, query, idx) {
  const safeQuery = escapeHtml(query)
  const safeFileName = escapeHtml(fileName)
  const snippets = [
    `该文档描述了与 <b>${safeQuery}</b> 相关的核心概念、设计约束与落地步骤，适合作为需求澄清和技术评审的参考。`,
    `在「${safeFileName}」中检索到一段关于 <b>${safeQuery}</b> 的说明，涉及接口定义、数据格式、异常处理和幂等要求。`,
    `文档片段提到 <b>${safeQuery}</b> 的实现应遵循最小权限原则，并补充了监控告警、回滚策略、灰度发布建议。`,
  ]
  return snippets[idx % snippets.length]
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function renderMarkdown(text) {
  const source = String(text || '').replace(/\r\n/g, '\n')
  const blocks = []
  const codeBlocks = []
  const token = index => `@@CODE_BLOCK_${index}@@`

  const withoutCode = source.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) => {
    const index = codeBlocks.length
    codeBlocks.push(
      `<pre class="md-code"><code>${escapeHtml(code.trimEnd())}</code></pre>`,
    )
    return token(index)
  })

  const lines = withoutCode.split('\n')
  let listItems = []
  let listType = 'ul'
  let paragraph = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    blocks.push(`<p>${formatInline(paragraph.join(' '))}</p>`)
    paragraph = []
  }
  const flushList = () => {
    if (!listItems.length) return
    blocks.push(`<${listType}>${listItems.map(item => `<li>${formatInline(item)}</li>`).join('')}</${listType}>`)
    listItems = []
    listType = 'ul'
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const codeIndex = codeBlocks.findIndex((_, index) => line === token(index))
    if (codeIndex >= 0) {
      flushParagraph()
      flushList()
      blocks.push(token(codeIndex))
      continue
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      const level = heading[1].length
      blocks.push(`<h${level}>${formatInline(heading[2])}</h${level}>`)
      continue
    }

    const list = line.match(/^[-*]\s+(.+)$/)
    if (list) {
      flushParagraph()
      if (listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(list[1])
      continue
    }

    const orderedList = line.match(/^\d+\.\s+(.+)$/)
    if (orderedList) {
      flushParagraph()
      if (listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(orderedList[1])
      continue
    }

    const blockquote = line.match(/^>\s+(.+)$/)
    if (blockquote) {
      flushParagraph()
      flushList()
      blocks.push(`<blockquote>${formatInline(blockquote[1])}</blockquote>`)
      continue
    }

    paragraph.push(line)
  }

  flushParagraph()
  flushList()

  return blocks
    .join('')
    .replace(/@@CODE_BLOCK_(\d+)@@/g, (_, index) => codeBlocks[Number(index)] || '')
}

function formatInline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function prefillChat(r) {
  activeTab.value = 'chat'
  chatInput.value = `请结合「${r.file}」，解释：${searchQuery.value || r.file}`
}

function summarizeResult(r) {
  activeTab.value = 'summary'
  summaryScope.value = 'selected'
  selectedFileIds.value = files.value.filter(f => f.name === r.file).map(f => f.id)
  generateSummary()
}

// ---------- AI 对话 ----------
const chatMessages = ref([])

function sendMessage() {
  const text = chatInput.value.trim()
  if (!text) return
  chatMessages.value.push({ id: Date.now(), role: 'user', text })
  chatInput.value = ''
  const refs = files.value.filter(f => f.status === '已索引').slice(0, 2).map(f => f.name)
  setTimeout(() => {
    chatMessages.value.push({
      id: Date.now() + 1,
      role: 'ai',
      text: mockAiAnswer(text, onlyKb.value),
      refs: onlyKb.value ? refs : [],
    })
    nextTick(() => {
      if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
    })
  }, 300)
}

function mockAiAnswer(question, fromKb) {
  const prefix = fromKb ? '（基于知识库检索）' : '（通用回答）'
  return `${prefix} 关于「${question}」的答复：当前为前端原型演示，正式版将结合 Embedding 检索与 LLM 推理，从知识库中抽取证据并生成结构化答案。`
}

// ---------- 智能总结 ----------
function generateSummary() {
  summaryLoading.value = true
  summaryText.value = ''
  const targets = summaryScope.value === 'all'
    ? files.value
    : files.value.filter(f => selectedFileIds.value.includes(f.id))

  setTimeout(() => {
    if (!targets.length) {
      summaryText.value = '未找到可总结的文件，请先选择文件或将范围切换为"整个知识库"。'
    } else {
      const names = targets.map(f => f.name).join('、')
      summaryText.value =
`# 知识库智能摘要（演示）

## 概览
本次共分析 ${targets.length} 份文件：${names}。

## 关键信息
- 文档主题覆盖规范定义、需求说明、技术方案与会议记录。
- 多数文件已索引完成，可用于后续检索增强生成（RAG）。
- 建议对"待索引"文件优先补齐索引，以提升召回质量。

## 风险与待办
- 当前为前端原型演示，未接入真实 LLM / Embedding 服务。
- 接入后建议增加：分块策略、Top-K 召回、上下文长度控制、回答引用溯源。
`
    }
    summaryLoading.value = false
  }, 500)
}

function summarizeFile(f) {
  activeTab.value = 'summary'
  summaryScope.value = 'selected'
  selectedFileIds.value = [f.id]
  generateSummary()
}

// ---------- 配置 ----------
function saveConfig() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...config }))
  ElMessage.success('配置已保存到 localStorage')
}

function testConfig() {
  if (!config.apiKey) {
    ElMessage.warning('请先填写 API Key')
    return
  }
  ElMessage.success('连接测试通过（前端原型演示，未发起真实请求）')
}

function clearConfig() {
  Object.assign(config, defaultConfig())
  localStorage.removeItem(CONFIG_KEY)
  ElMessage.success('配置已清空')
}

const API_BASE = import.meta.env.VITE_KNOWLEDGE_API_BASE || 'http://127.0.0.1:8787/api'

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || `请求失败：${response.status}`)
  }
  return data
}

function applyServerState(payload) {
  folderPath.value = payload.folderPath || folderPath.value
  files.value = (payload.files || []).map(file => ({
    id: file.id,
    name: file.name,
    type: file.type,
    size: file.size,
    status: file.status,
    sizeLabel: file.sizeLabel || formatSize(file.size || 0),
    chunkCount: file.chunkCount || 0,
    path: file.path,
  }))
  knowledgeChunkCount.value = payload.chunkCount || 0
  selectedFileIds.value = selectedFileIds.value.filter(id => files.value.some(file => file.id === id))
}

async function loadBackendState() {
  try {
    const payload = await apiRequest('/knowledge/files')
    applyServerState(payload)
  } catch (err) {
    ElMessage.warning(`后端未连接：${err.message}`)
  }
}

async function loadBackendConfig() {
  try {
    const payload = await apiRequest('/config')
    Object.assign(config, payload)
  } catch {
    Object.assign(config, loadConfig())
  }
}

async function uploadBackendFile(file) {
  try {
    const contentBase64 = await fileToBase64(file)
    const payload = await apiRequest('/knowledge/files/upload', {
      method: 'POST',
      body: JSON.stringify({ name: file.name, contentBase64 }),
    })
    applyServerState(payload)
    ElMessage.success(`已导入并索引：${file.name}`)
  } catch (err) {
    ElMessage.error(err.message)
  }
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const batchSize = 8192
  for (let i = 0; i < bytes.length; i += batchSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + batchSize))
  }
  return btoa(binary)
}

saveFolder = async function saveFolderFromBackend() {
  try {
    localStorage.setItem(FOLDER_KEY, folderPath.value)
    const payload = await apiRequest('/knowledge/folder', {
      method: 'POST',
      body: JSON.stringify({ folderPath: folderPath.value }),
    })
    applyServerState(payload)
    ElMessage.success('目录已扫描并完成索引')
  } catch (err) {
    ElMessage.error(err.message)
  }
}

refreshIndex = async function refreshIndexFromBackend() {
  try {
    const payload = await apiRequest('/knowledge/refresh', { method: 'POST' })
    applyServerState(payload)
    ElMessage.success('索引刷新完成')
  } catch (err) {
    ElMessage.error(err.message)
  }
}

handleUpload = function handleUploadFromBackend(file) {
  uploadBackendFile(file)
  return false
}

deleteFile = async function deleteFileFromBackend(id) {
  try {
    await apiRequest(`/knowledge/files/${id}`, { method: 'DELETE' })
    files.value = files.value.filter(file => file.id !== id)
    selectedFileIds.value = selectedFileIds.value.filter(sid => sid !== id)
    await loadBackendState()
    ElMessage.success('已删除')
  } catch (err) {
    ElMessage.error(err.message)
  }
}

deleteSelected = async function deleteSelectedFromBackend() {
  if (!selectedFileIds.value.length) return
  try {
    await Promise.all(selectedFileIds.value.map(id => apiRequest(`/knowledge/files/${id}`, { method: 'DELETE' })))
    selectedFileIds.value = []
    await loadBackendState()
    ElMessage.success('批量删除完成')
  } catch (err) {
    ElMessage.error(err.message)
  }
}

runSearch = async function runSearchFromBackend() {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  try {
    const payload = await apiRequest('/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query: searchQuery.value.trim(), topK: 5, mode: searchMode.value }),
    })
    searchResults.value = (payload.results || []).map(item => ({
      id: item.id,
      fileId: item.fileId,
      file: item.fileName,
      score: Math.round((item.score || 0) * 100),
      snippet: escapeHtml(item.text).replaceAll('\n', '<br />'),
    }))
  } catch (err) {
    ElMessage.error(err.message)
  }
}

async function streamRequest(path, body, onEvent) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || `请求失败：${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('浏览器不支持流式响应')

  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() || ''

    for (const block of blocks) {
      const eventLine = block.split('\n').find(line => line.startsWith('event:'))
      const dataLine = block.split('\n').find(line => line.startsWith('data:'))
      if (!dataLine) continue

      const event = eventLine ? eventLine.slice(6).trim() : 'message'
      const payload = JSON.parse(dataLine.slice(5).trim())
      onEvent(event, payload)
    }
  }
}

sendMessage = async function sendMessageFromBackend() {
  const text = chatInput.value.trim()
  if (!text) return
  const userId = Date.now()
  const aiId = userId + 1
  chatMessages.value.push({ id: userId, role: 'user', text })
  chatMessages.value.push({ id: aiId, role: 'ai', text: '', refs: [] })
  chatInput.value = ''

  const aiMessage = chatMessages.value.find(msg => msg.id === aiId)
  try {
    await streamRequest('/chat/stream', { message: text, onlyKb: onlyKb.value, topK: 4 }, (event, payload) => {
      if (event === 'references') {
        aiMessage.refs = (payload || []).map(ref => ref.fileName)
      }
      if (event === 'token') {
        aiMessage.text += payload
      }
      if (event === 'error') {
        aiMessage.text += `\n请求失败：${payload.message}`
      }
      nextTick(() => {
        if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
      })
    })
  } catch (err) {
    aiMessage.text = `后端请求失败：${err.message}`
  }
  nextTick(() => {
    if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
  })
}

generateSummary = async function generateSummaryFromBackend() {
  summaryLoading.value = true
  summaryText.value = ''
  try {
    await streamRequest('/knowledge/summary/stream', {
      scope: summaryScope.value,
      fileIds: selectedFileIds.value,
    }, (event, payload) => {
      if (event === 'token') {
        summaryText.value += payload
      }
      if (event === 'error') {
        summaryText.value += `\n生成失败：${payload.message}`
      }
    })
  } catch (err) {
    summaryText.value = `生成失败：${err.message}`
  } finally {
    summaryLoading.value = false
  }
}

saveConfig = async function saveConfigFromBackend() {
  try {
    const payload = await apiRequest('/config', {
      method: 'PUT',
      body: JSON.stringify({ ...config }),
    })
    Object.assign(config, payload)
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...config }))
    ElMessage.success('AI 配置已保存')
  } catch (err) {
    ElMessage.error(err.message)
  }
}

testConfig = async function testConfigFromBackend() {
  if (!config.apiKey) {
    ElMessage.warning('请先填写 API Key')
    return
  }
  try {
    const payload = await apiRequest('/config/test', {
      method: 'POST',
      body: JSON.stringify({ ...config }),
    })
    ElMessage.success(`${payload.message}：${payload.model} / ${payload.embeddingModel}`)
  } catch (err) {
    ElMessage.error(err.message)
  }
}

clearConfig = async function clearConfigFromBackend() {
  Object.assign(config, defaultConfig())
  localStorage.removeItem(CONFIG_KEY)
  try {
    await apiRequest('/config', {
      method: 'PUT',
      body: JSON.stringify({ ...config, apiKey: '' }),
    })
  } catch {
    // 清空本地配置不依赖后端必须可用
  }
  ElMessage.success('配置已清空')
}

nextTick(() => {
  loadBackendState()
  loadBackendConfig()
})
</script>

<style scoped>
.knowledge-agent-page {
  --el-color-primary: #4fb889;
  --el-color-primary-light-3: #6bc79b;
  --el-color-primary-light-5: #87d5ad;
  --el-color-primary-light-7: #204f3a;
  --el-color-primary-light-8: #193d2d;
  --el-color-primary-light-9: #11291f;
  --el-color-primary-dark-2: #3b936d;
  --el-color-success: #5ec49a;
  --agent-list-max-height: clamp(260px, 42vh, 520px);
  --agent-content-max-height: clamp(320px, 48vh, 580px);
  --agent-dialog-text: #cbded2;
  --agent-dialog-heading: #e2efe7;
  --agent-dialog-muted: #a9c3b3;
  background: #07120c;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: calc(100vh - 110px);
}

/* 顶栏 */
.top-bar {
  background: #0d1c13;
  border: 1px solid #173f2a;
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.top-bar-left { display: flex; align-items: center; gap: 8px; }
.page-title { color: #d7ffe7; font-size: 16px; font-weight: 600; }
.folder-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.folder-input { width: 420px; max-width: 100%; }

/* 统计 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.stat-card {
  background: #0d1c13;
  border: 1px solid #173f2a;
  border-radius: 8px;
  padding: 14px 16px;
  text-align: center;
}
.stat-value { color: #5ec49a; font-size: 24px; font-weight: 700; }
.stat-label { color: #93b89f; font-size: 12px; margin-top: 4px; }

/* 三栏 */
.main-grid {
  display: grid;
  grid-template-columns: 320px 1fr 300px;
  gap: 16px;
  align-items: start;
  flex: 1;
  min-height: 520px;
}

/* 面板通用 */
.panel {
  background: #0d1c13;
  border: 1px solid #173f2a;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  color: #d7ffe7;
  font-weight: 600;
  border-bottom: 1px solid #173f2a;
}

/* 文件面板 */
.file-filter { padding: 10px 12px; display: flex; gap: 8px; }
.file-list {
  flex: 0 1 auto;
  min-height: 220px;
  max-height: var(--agent-list-max-height);
  overflow-y: auto;
  padding: 0 12px 10px;
}
.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.file-row:hover { background: #13281c; }
.file-row.active { background: #173527; outline: 1px solid #3da87a; }
.file-info { display: flex; align-items: center; min-width: 0; }
.file-name {
  color: #d7ffe7;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}
.file-meta { display: flex; align-items: center; gap: 8px; }
.file-size { color: #93b89f; font-size: 12px; min-width: 52px; text-align: right; }
.file-footer {
  padding: 10px 12px;
  border-top: 1px solid #173f2a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #93b89f;
  font-size: 12px;
}

/* 中栏 */
.agent-tabs { height: 100%; display: flex; flex-direction: column; }
:deep(.el-tabs__header) { margin: 0; padding: 0 14px; background: #0d1c13; }
:deep(.el-tabs__item) { color: #93b89f; }
:deep(.el-tabs__item.is-active) { color: #5ec49a; }
:deep(.el-tabs__active-bar) { background: #5ec49a; }
:deep(.el-tabs__content) { flex: 1; overflow: hidden; }
:deep(.el-tab-pane) { height: 100%; display: flex; flex-direction: column; padding: 12px 14px; overflow-y: auto; }
.empty-hint { color: #93b89f; font-size: 13px; padding: 20px 0; }

:deep(.el-input__wrapper),
:deep(.el-select__wrapper),
:deep(.el-input-number .el-input__wrapper) {
  background: #08160f;
  border: 1px solid #1e4a35;
  box-shadow: none;
}

:deep(.el-input__inner),
:deep(.el-select__placeholder),
:deep(.el-select__selected-item),
:deep(.el-input-number .el-input__inner) {
  color: #fff;
}

:deep(.el-form-item__label),
:deep(.el-radio-button__inner),
:deep(.el-switch__label),
:deep(.el-slider__runway),
:deep(.el-input-number__decrease),
:deep(.el-input-number__increase) {
  color: #fff;
}

:deep(.el-input__inner::placeholder) {
  color: #8ea99b;
}

:deep(.el-input__prefix),
:deep(.el-input__suffix),
:deep(.el-select__caret) {
  color: #bfe7cf;
}

/* 搜索 */
.search-bar { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.result-list {
  flex: 0 1 auto;
  min-height: 240px;
  max-height: var(--agent-content-max-height);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.result-card {
  background: #13281c;
  border: 1px solid #173f2a;
  border-radius: 8px;
  padding: 12px;
}
.result-title { display: flex; align-items: center; gap: 8px; color: #d7ffe7; font-weight: 600; margin-bottom: 6px; }
.result-snippet { color: #bfe7cf; font-size: 13px; line-height: 1.6; }
.result-actions { margin-top: 8px; display: flex; gap: 8px; }

/* 对话 */
.chat-area { display: flex; flex-direction: column; height: 100%; }
.chat-messages {
  flex: 0 1 auto;
  min-height: 260px;
  max-height: var(--agent-content-max-height);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 8px;
}
.chat-msg { display: flex; }
.chat-msg.is-user { justify-content: flex-end; }
.chat-msg.is-ai { justify-content: flex-start; }
.bubble {
  max-width: 85%;
  padding: 10px 12px;
  border-radius: 10px;
  color: var(--agent-dialog-text);
  font-size: 13px;
  line-height: 1.6;
}
.is-user .bubble { background: #1f6f54; color: #ecf8ef; border-bottom-right-radius: 2px; }
.is-ai .bubble { background: #08160f; border: 1px solid #1e4a35; border-bottom-left-radius: 2px; }
.bubble-refs { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
.chat-input-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid #173f2a;
}

/* 总结 */
.summary-bar { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.summary-scope-select { width: 220px; }
.summary-output {
  background: #08160f;
  border: 1px solid #173f2a;
  border-radius: 8px;
  padding: 14px;
  color: var(--agent-dialog-text);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-y: auto;
  max-height: var(--agent-content-max-height);
}

.markdown-body {
  color: var(--agent-dialog-text);
  word-break: break-word;
  background-color: transparent !important;
}
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  color: var(--agent-dialog-heading);
  margin: 10px 0 6px;
  font-weight: 700;
  line-height: 1.35;
}
.markdown-body :deep(h1) { font-size: 18px; }
.markdown-body :deep(h2) { font-size: 16px; }
.markdown-body :deep(h3),
.markdown-body :deep(h4) { font-size: 14px; }
.markdown-body :deep(p) {
  color: var(--agent-dialog-text);
  margin: 0 0 8px;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 6px 0 10px;
  padding-left: 18px;
}
.markdown-body :deep(li) {
  color: var(--agent-dialog-text);
  margin: 4px 0;
}
.markdown-body :deep(strong) {
  color: var(--agent-dialog-heading);
}
.markdown-body :deep(blockquote) {
  margin: 8px 0 10px;
  padding: 8px 12px;
  color: var(--agent-dialog-muted);
  border-left: 3px solid #5ec49a;
  background: #0d1c13;
  border-radius: 4px;
}
.markdown-body :deep(code) {
  color: #d8e8dc;
  background: #102817;
  border: 1px solid rgba(94, 196, 154, 0.18);
  border-radius: 4px;
  padding: 1px 5px;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 12px;
}
.markdown-body :deep(.md-code) {
  margin: 8px 0 10px;
  padding: 10px 12px;
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid #1e4a35;
  background: #08160f;
}
.markdown-body :deep(.md-code code) {
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  white-space: pre;
}

/* 配置 */
.settings-form { padding: 12px 14px; overflow-y: auto; flex: 1; }
.settings-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }

/* 滚动条 */
.file-list::-webkit-scrollbar,
.result-list::-webkit-scrollbar,
.chat-messages::-webkit-scrollbar,
.settings-form::-webkit-scrollbar,
.summary-output::-webkit-scrollbar { width: 6px; }
.file-list::-webkit-scrollbar-track,
.result-list::-webkit-scrollbar-track,
.chat-messages::-webkit-scrollbar-track,
.settings-form::-webkit-scrollbar-track,
.summary-output::-webkit-scrollbar-track { background: transparent; }
.file-list::-webkit-scrollbar-thumb,
.result-list::-webkit-scrollbar-thumb,
.chat-messages::-webkit-scrollbar-thumb,
.settings-form::-webkit-scrollbar-thumb,
.summary-output::-webkit-scrollbar-thumb { border-radius: 999px; background: #3da87a; }
.file-list::-webkit-scrollbar-thumb:hover,
.result-list::-webkit-scrollbar-thumb:hover,
.chat-messages::-webkit-scrollbar-thumb:hover,
.settings-form::-webkit-scrollbar-thumb:hover,
.summary-output::-webkit-scrollbar-thumb:hover { background: #5ec49a; }

/* 响应式 */
@media (max-width: 1200px) {
  .main-grid { grid-template-columns: 1fr; min-height: auto; }
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>

<style>
.el-popper.is-light.el-select__popper {
  background: #08160f;
  border: 1px solid #1e4a35;
}

.el-popper.is-light.el-select__popper .el-select-dropdown__item {
  color: #fff;
}

.el-popper.is-light.el-select__popper .el-select-dropdown__item.is-hovering,
.el-popper.is-light.el-select__popper .el-select-dropdown__item:hover {
  background: #13281c;
}

.el-popper.is-light.el-select__popper .el-select-dropdown__item.is-selected {
  color: #5ec49a;
  background: #102817;
}

.el-popper.is-light.el-select__popper .el-popper__arrow::before {
  background: #08160f;
  border-color: #1e4a35;
}
</style>
