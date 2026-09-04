<template>
  <div class="ai-chat-page">
    <header class="chat-header">
      <div>
        <h2>AI 对话</h2>
        <p>支持文字、图片和文件 · 流式输出</p>
      </div>
      <div class="header-actions">
        <el-tag type="success" effect="dark">gpt-5.6-sol</el-tag>
        <el-button icon="Delete" :disabled="sending || messages.length === 1" @click="clearChat">清空会话</el-button>
      </div>
    </header>

    <main ref="messageListRef" class="message-list">
      <section v-for="item in messages" :key="item.id" class="message-row" :class="item.role">
        <div class="avatar">
          <el-icon v-if="item.role === 'assistant'"><MagicStick /></el-icon>
          <el-icon v-else><User /></el-icon>
        </div>
        <div class="message-content">
          <div class="message-meta">
            <span>{{ item.role === 'assistant' ? 'AI 助手' : '我' }}</span>
            <time>{{ item.time }}</time>
          </div>
          <div v-if="item.files?.length" class="message-files">
            <div v-for="file in item.files" :key="file.name + file.size" class="sent-file">
              <img v-if="file.preview" :src="file.preview" :alt="file.name" />
              <el-icon v-else><Document /></el-icon>
              <span>{{ file.name }}</span>
            </div>
          </div>
          <div class="bubble" :class="{ streaming: item.streaming }">
            <div v-if="item.role === 'assistant' && item.content" class="ai-markdown-content" v-html="renderMarkdown(item.content)"></div>
            <p v-else-if="item.content" class="text-block">{{ item.content }}</p>
            <span v-if="item.streaming" class="cursor"></span>
            <span v-if="item.thinking && !item.content" class="thinking">正在思考...</span>
          </div>
          <div v-if="item.error" class="message-error">{{ item.error }}</div>
        </div>
      </section>
    </main>

    <footer class="composer">
      <div v-if="selectedFiles.length" class="file-list">
        <div v-for="(file, index) in selectedFiles" :key="file.name + file.size" class="file-chip">
          <img v-if="file.preview" :src="file.preview" :alt="file.name" />
          <el-icon v-else><Document /></el-icon>
          <div class="file-info">
            <span>{{ file.name }}</span>
            <small>{{ formatSize(file.size) }}</small>
          </div>
          <el-button circle text icon="Close" @click="removeFile(index)" />
        </div>
      </div>

      <div
        class="input-box"
        :class="{ dragging }"
        @dragenter.prevent="dragging = true"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="handleDrop"
      >
        <el-input
          v-model="input"
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 8 }"
          resize="none"
          maxlength="20000"
          show-word-limit
          placeholder="输入消息，Enter 发送，Shift + Enter 换行；也可拖入图片或文件"
          :disabled="sending"
          @keydown="handleKeydown"
        />
        <div class="composer-toolbar">
          <div class="toolbar-left">
            <input ref="fileInputRef" class="hidden-input" type="file" multiple @change="handleFileChange" />
            <el-button icon="Paperclip" :disabled="sending || selectedFiles.length >= MAX_FILES" @click="fileInputRef?.click()">
              添加文件
            </el-button>
            <span>最多 {{ MAX_FILES }} 个，单个 10MB</span>
          </div>
          <el-button v-if="sending" type="danger" icon="VideoPause" @click="stopGeneration">停止生成</el-button>
          <el-button v-else type="primary" icon="Promotion" :disabled="!canSend" @click="sendMessage">发送</el-button>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { streamChat } from '@/api/ai'
import { renderMarkdown } from '@/utils/markdown'

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_TOTAL_SIZE = 20 * 1024 * 1024
const input = ref('')
const sending = ref(false)
const dragging = ref(false)
const selectedFiles = ref([])
const messageListRef = ref(null)
const fileInputRef = ref(null)
let controller = null
let nextId = 1

function currentTime() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function welcomeMessage() {
  return {
    id: nextId++,
    role: 'assistant',
    content: '你好，我是 AI 助手。你可以发送文字、图片或文件，我会通过流式响应逐步返回结果。',
    time: currentTime(),
    excludeFromHistory: true
  }
}

const messages = ref([welcomeMessage()])
const canSend = computed(() => Boolean(input.value.trim() || selectedFiles.value.length))

function scrollToBottom() {
  nextTick(() => {
    const element = messageListRef.value
    if (element) element.scrollTop = element.scrollHeight
  })
}

function formatSize(size) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function createFileItem(file) {
  return {
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
  }
}

function revokeFiles(files) {
  files.forEach(item => {
    if (item.preview) URL.revokeObjectURL(item.preview)
  })
}

function addFiles(fileList) {
  const incoming = Array.from(fileList || [])
  if (!incoming.length) return
  if (selectedFiles.value.length + incoming.length > MAX_FILES) {
    ElMessage.warning(`最多上传 ${MAX_FILES} 个文件`)
    return
  }
  const oversized = incoming.find(file => file.size > MAX_FILE_SIZE)
  if (oversized) {
    ElMessage.warning(`文件 ${oversized.name} 超过 10MB`)
    return
  }
  const total = selectedFiles.value.reduce((sum, item) => sum + item.size, 0) + incoming.reduce((sum, file) => sum + file.size, 0)
  if (total > MAX_TOTAL_SIZE) {
    ElMessage.warning('文件总大小不能超过 20MB')
    return
  }
  selectedFiles.value.push(...incoming.map(createFileItem))
}

function handleFileChange(event) {
  addFiles(event.target.files)
  event.target.value = ''
}

function handleDrop(event) {
  dragging.value = false
  addFiles(event.dataTransfer?.files)
}

function removeFile(index) {
  const [removed] = selectedFiles.value.splice(index, 1)
  if (removed?.preview) URL.revokeObjectURL(removed.preview)
}

function historyMessages() {
  return messages.value
    .filter(item => !item.excludeFromHistory && !item.streaming && !item.error && (item.content || item.files?.length))
    .slice(-30)
    .map(item => ({
      role: item.role,
      content: item.content || `[用户上传文件：${item.files.map(file => file.name).join('、')}]`
    }))
}

async function sendMessage() {
  if (!canSend.value || sending.value) return
  const text = input.value.trim()
  const files = selectedFiles.value.splice(0)
  const history = historyMessages()
  const userMessage = reactive({
    id: nextId++,
    role: 'user',
    content: text,
    files,
    time: currentTime()
  })
  const assistantMessage = reactive({
    id: nextId++,
    role: 'assistant',
    content: '',
    time: currentTime(),
    streaming: true,
    thinking: false,
    error: ''
  })
  messages.value.push(userMessage, assistantMessage)
  input.value = ''
  sending.value = true
  controller = new AbortController()
  scrollToBottom()

  try {
    await streamChat({
      message: text,
      history,
      files: files.map(item => item.file),
      signal: controller.signal,
      onEvent(event) {
        if (event.type === 'thinking') assistantMessage.thinking = true
        if (event.type === 'delta') {
          assistantMessage.thinking = false
          assistantMessage.content += event.content || ''
        }
        if (event.type === 'error') throw new Error(event.message || 'AI 服务暂时不可用')
        scrollToBottom()
      }
    })
    if (!assistantMessage.content) assistantMessage.content = '模型未返回文本内容。'
  } catch (error) {
    if (error?.name === 'AbortError') {
      assistantMessage.error = '生成已停止'
    } else {
      assistantMessage.error = error?.message || 'AI 对话请求失败'
      ElMessage.error(assistantMessage.error)
    }
  } finally {
    assistantMessage.streaming = false
    assistantMessage.thinking = false
    sending.value = false
    controller = null
    scrollToBottom()
  }
}

function stopGeneration() {
  controller?.abort()
}

function handleKeydown(event) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  sendMessage()
}

async function clearChat() {
  try {
    await ElMessageBox.confirm('确认清空当前对话？', '提示', { type: 'warning' })
    stopGeneration()
    messages.value.forEach(item => revokeFiles(item.files || []))
    revokeFiles(selectedFiles.value)
    selectedFiles.value = []
    messages.value = [welcomeMessage()]
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '清空失败')
  }
}

onBeforeUnmount(() => {
  stopGeneration()
  messages.value.forEach(item => revokeFiles(item.files || []))
  revokeFiles(selectedFiles.value)
})
</script>

<style scoped>
.ai-chat-page {
  height: calc(100vh - 90px);
  min-height: 560px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  background: var(--theme-bg);
  border: 1px solid var(--theme-border);
  border-radius: 14px;
  overflow: hidden;
  color: var(--theme-text-bright);
}
.chat-header {
  min-height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 22px;
  border-bottom: 1px solid var(--theme-border);
  background: var(--theme-bg-hover);
}
.chat-header h2 { margin: 0 0 5px; color: var(--theme-text-bright); font-size: 20px; }
.chat-header p { margin: 0; color: var(--theme-text-dim); font-size: 13px; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.message-list {
  overflow-y: auto;
  padding: 22px clamp(16px, 4vw, 72px);
  scroll-behavior: smooth;
}
.message-row { display: flex; gap: 12px; margin-bottom: 24px; }
.message-row.user { flex-direction: row-reverse; }
.avatar {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--theme-border);
  color: var(--theme-primary);
}
.user .avatar { background: var(--theme-primary-dim); color: #fff; }
.message-content { max-width: min(78%, 900px); }
.user .message-content { display: flex; flex-direction: column; align-items: flex-end; }
.message-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; color: var(--theme-text-dim); font-size: 12px; }
.user .message-meta { flex-direction: row-reverse; }
.bubble {
  padding: 13px 16px;
  border-radius: 4px 14px 14px 14px;
  background: var(--theme-bg-hover);
  border: 1px solid var(--theme-border);
  line-height: 1.75;
  color: var(--theme-text-bright);
  overflow-wrap: anywhere;
}
.user .bubble { background: var(--theme-primary-deep); border-color: var(--theme-primary-dim); border-radius: 14px 4px 14px 14px; color: #fff; }
.text-block { margin: 0; white-space: pre-wrap; }
.ai-markdown-content { min-width: 0; background: transparent !important; color: inherit; }
.ai-markdown-content :deep(p) { margin: 0 0 10px; white-space: normal; }
.ai-markdown-content :deep(p:last-child) { margin-bottom: 0; }
.ai-markdown-content :deep(h1),
.ai-markdown-content :deep(h2),
.ai-markdown-content :deep(h3),
.ai-markdown-content :deep(h4),
.ai-markdown-content :deep(h5),
.ai-markdown-content :deep(h6) { margin: 18px 0 9px; color: var(--theme-text-bright); line-height: 1.35; }
.ai-markdown-content :deep(h1:first-child),
.ai-markdown-content :deep(h2:first-child),
.ai-markdown-content :deep(h3:first-child) { margin-top: 0; }
.ai-markdown-content :deep(h1) { font-size: 22px; border-bottom: 1px solid var(--theme-border-soft); padding-bottom: 7px; }
.ai-markdown-content :deep(h2) { font-size: 19px; border-bottom: 1px solid var(--theme-border); padding-bottom: 5px; }
.ai-markdown-content :deep(h3) { font-size: 17px; }
.ai-markdown-content :deep(h4), .ai-markdown-content :deep(h5), .ai-markdown-content :deep(h6) { font-size: 15px; }
.ai-markdown-content :deep(ul), .ai-markdown-content :deep(ol) { margin: 8px 0 12px; padding-left: 24px; }
.ai-markdown-content :deep(li) { margin: 4px 0; }
.ai-markdown-content :deep(blockquote) { margin: 10px 0; padding: 8px 13px; border-left: 4px solid var(--theme-primary); background: var(--theme-bg-soft); color: var(--theme-text-soft); }
.ai-markdown-content :deep(a) { color: #61e99c; text-decoration: underline; text-underline-offset: 3px; }
.ai-markdown-content :deep(strong) { color: var(--theme-text-bright); }
.ai-markdown-content :deep(del) { color: #6f9c7e; }
.ai-markdown-content :deep(hr) { border: 0; border-top: 1px solid var(--theme-border-soft); margin: 16px 0; }
.ai-markdown-content :deep(code) { padding: 2px 5px; border-radius: 4px; background: var(--theme-bg-deep); color: #ffcf7d; font: 13px Consolas, Monaco, 'Courier New', monospace; }
.ai-markdown-content :deep(pre) {
  margin: 10px 0;
  padding: 13px 15px;
  overflow-x: auto;
  border-radius: 8px;
  background: var(--theme-bg-deep);
  border: 1px solid var(--theme-border);
}
.ai-markdown-content :deep(pre code) { padding: 0; background: transparent; color: #bfffd9; line-height: 1.65; white-space: pre; }
.ai-markdown-content :deep(.markdown-table-wrap) { max-width: 100%; overflow-x: auto; margin: 10px 0; }
.ai-markdown-content :deep(table) { width: 100%; border-collapse: collapse; font-size: 13px; }
.ai-markdown-content :deep(th), .ai-markdown-content :deep(td) { padding: 8px 10px; border: 1px solid var(--theme-border-soft); text-align: left; }
.ai-markdown-content :deep(th) { background: var(--theme-border); color: var(--theme-text-bright); }
.ai-markdown-content :deep(tr:nth-child(even) td) { background: rgba(var(--theme-border-rgb), .25); }
.code-block {
  margin: 0;
  padding: 12px 14px;
  overflow-x: auto;
  border-radius: 8px;
  background: var(--theme-bg-deep);
  border: 1px solid var(--theme-border);
  color: #bfffd9;
  font: 13px/1.65 Consolas, Monaco, 'Courier New', monospace;
  white-space: pre;
}
.cursor { display: inline-block; width: 7px; height: 16px; margin-left: 3px; vertical-align: -2px; background: var(--theme-primary); animation: blink .8s infinite; }
.thinking { color: var(--theme-text-dim); }
.message-error { margin-top: 6px; color: #ff8b8b; font-size: 12px; }
.message-files { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-bottom: 8px; }
.sent-file { display: flex; align-items: center; gap: 7px; max-width: 220px; padding: 6px 9px; border: 1px solid var(--theme-border-soft); border-radius: 8px; background: var(--theme-bg-hover); font-size: 12px; }
.sent-file img { width: 34px; height: 34px; object-fit: cover; border-radius: 5px; }
.sent-file span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.composer { padding: 14px 20px 18px; border-top: 1px solid var(--theme-border); background: var(--theme-bg-soft); }
.input-box { border: 1px solid var(--theme-border-soft); border-radius: 12px; background: var(--theme-bg-hover); padding: 10px; transition: .2s; }
.input-box:focus-within, .input-box.dragging { border-color: var(--theme-primary); box-shadow: 0 0 0 2px rgba(var(--theme-primary-rgb), .12); }
.input-box :deep(.el-textarea__inner) { color: #e6fff0; background: transparent; box-shadow: none; padding: 4px 5px 10px; }
.input-box :deep(.el-input__count) { background: transparent; color: #6f9c7e; }
.composer-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 8px; border-top: 1px solid var(--theme-border); }
.toolbar-left { display: flex; align-items: center; gap: 10px; color: #6f9c7e; font-size: 12px; }
.hidden-input { display: none; }
.file-list { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 10px; }
.file-chip { flex: 0 0 auto; width: 230px; display: flex; align-items: center; gap: 9px; padding: 7px 9px; background: var(--theme-bg-hover); border: 1px solid var(--theme-border-soft); border-radius: 9px; }
.file-chip img { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; }
.file-info { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.file-info span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.file-info small { color: #6f9c7e; margin-top: 3px; }
.message-list::-webkit-scrollbar, .file-list::-webkit-scrollbar { width: 6px; height: 6px; }
.message-list::-webkit-scrollbar-thumb, .file-list::-webkit-scrollbar-thumb { background: var(--theme-border-soft); border-radius: 999px; }
@keyframes blink { 50% { opacity: 0; } }
@media (max-width: 760px) {
  .chat-header { align-items: flex-start; }
  .header-actions { flex-wrap: wrap; justify-content: flex-end; }
  .message-list { padding: 18px 12px; }
  .message-content { max-width: 88%; }
  .composer { padding: 10px; }
  .composer-toolbar { align-items: flex-end; }
  .toolbar-left span { display: none; }
}
</style>
