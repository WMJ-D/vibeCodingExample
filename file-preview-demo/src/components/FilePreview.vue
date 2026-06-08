<template>
  <div class="file-preview-page">
    <el-upload
      class="upload-card"
      drag
      action="#"
      :auto-upload="false"
      :show-file-list="false"
      :on-change="handleFileChange"
    >
      <el-icon class="upload-icon"><upload-filled /></el-icon>
      <div class="el-upload__text">将文件拖到此处，或 <em>点击选择文件</em></div>
      <template #tip>
        <div class="upload-tip">本地文件会作为 FlyFish 的 file 参数传入，并优先于 URL 渲染。</div>
      </template>
    </el-upload>

    <el-card class="source-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>远程文件 URL</span>
          <el-tag size="small" type="info">可选</el-tag>
        </div>
      </template>
      <div class="url-row">
        <el-input
          v-model="remoteDraft"
          clearable
          placeholder="请输入可直接访问的文件地址，例如 https://example.com/demo.pdf"
          @keyup.enter="applyRemoteUrl"
        />
        <el-button type="primary" @click="applyRemoteUrl">预览 URL</el-button>
        <el-button @click="clearSource">清空</el-button>
      </div>
      <div class="source-hint">
        URL 方式需要目标文件允许浏览器跨域访问；遇到鉴权下载或跨域限制时，建议选择本地文件。
      </div>
    </el-card>

    <div v-if="sourceInfo" class="info-section">
      <el-descriptions title="预览信息" :column="3" border size="small">
        <el-descriptions-item label="来源">{{ sourceInfo.source }}</el-descriptions-item>
        <el-descriptions-item label="文件名">{{ sourceInfo.name }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ sourceInfo.type }}</el-descriptions-item>
        <el-descriptions-item v-if="selectedFile" label="大小">
          {{ readableSize(selectedFile.size) }}
        </el-descriptions-item>
        <el-descriptions-item label="优先级">
          {{ selectedFile ? 'file 参数优先' : 'url 参数' }}
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <el-divider v-if="hasPreviewSource">预览区域</el-divider>

    <section v-if="hasPreviewSource" class="preview-shell">
      <component
        v-if="flyfishViewer"
        :is="flyfishViewer"
        :key="viewerKey"
        :file="selectedFile"
        :url="flyfishUrl"
        :options="viewerOptions"
      />

      <div v-else class="fallback-preview">
        <el-alert
          class="fallback-alert"
          title="FlyFish FileViewer 尚未注册，当前使用基础预览兜底。"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #default>
            安装并注册 @flyfish-group/file-viewer3 后，这里会自动切换为 FlyFish 预览器。
          </template>
        </el-alert>

        <div v-if="fallbackType === 'image'" class="fallback-block">
          <el-image :src="fallbackUrl" :preview-src-list="[fallbackUrl]" fit="contain" class="image-preview" />
        </div>

        <div v-else-if="fallbackType === 'video'" class="fallback-block center">
          <video :src="fallbackUrl" controls class="media-preview" />
        </div>

        <div v-else-if="fallbackType === 'audio'" class="fallback-block center">
          <audio :src="fallbackUrl" controls class="audio-preview" />
        </div>

        <div v-else-if="fallbackType === 'pdf'" class="fallback-block">
          <embed :src="fallbackUrl" type="application/pdf" class="pdf-preview" />
        </div>

        <div v-else-if="fallbackType === 'text'" class="fallback-block text-preview">
          <el-scrollbar height="100%">
            <pre>{{ textContent }}</pre>
          </el-scrollbar>
        </div>

        <div v-else class="fallback-block center">
          <el-empty description="基础预览暂不支持此类型，请注册 FlyFish FileViewer 后查看更多格式。" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, getCurrentInstance, onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'

const instance = getCurrentInstance()

const selectedFile = ref(null)
const objectUrl = ref('')
const remoteDraft = ref('')
const remoteUrl = ref('')
const textContent = ref('')

const flyfishViewer = computed(() => {
  const components = instance?.appContext?.components || {}
  return components.FileViewer || components['file-viewer'] || null
})

const hasPreviewSource = computed(() => Boolean(selectedFile.value || remoteUrl.value))
const flyfishUrl = computed(() => (selectedFile.value ? '' : remoteUrl.value))
const fallbackUrl = computed(() => objectUrl.value || remoteUrl.value)

const viewerKey = computed(() => {
  if (selectedFile.value) {
    return `${selectedFile.value.name}-${selectedFile.value.size}-${selectedFile.value.lastModified}`
  }
  return remoteUrl.value
})

const viewerOptions = {
  toolbar: {
    download: true,
    print: true,
    exportHtml: true
  },
  watermark: {
    text: '内部预览',
    opacity: 0.12
  }
}

const sourceInfo = computed(() => {
  if (selectedFile.value) {
    return {
      source: '本地文件',
      name: selectedFile.value.name,
      type: selectedFile.value.type || getExtension(selectedFile.value.name) || '未知类型'
    }
  }

  if (remoteUrl.value) {
    return {
      source: '远程 URL',
      name: getFileNameFromUrl(remoteUrl.value),
      type: getExtension(remoteUrl.value) || '未知类型'
    }
  }

  return null
})

const fallbackType = computed(() => {
  const fileName = selectedFile.value?.name || remoteUrl.value
  const mimeType = selectedFile.value?.type || ''

  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType === 'application/pdf') return 'pdf'
  if (isTextMime(mimeType)) return 'text'

  const name = fileName.toLowerCase().split('?')[0].split('#')[0]
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return 'image'
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(name)) return 'video'
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(name)) return 'audio'
  if (/\.pdf$/.test(name)) return 'pdf'
  if (/\.(txt|md|json|log|xml|html|css|js|ts|vue|py|java|c|cpp|go|rs)$/.test(name)) return 'text'

  return 'unknown'
})

function handleFileChange(uploadFile) {
  const file = uploadFile.raw
  if (!file) return

  revokeObjectUrl()
  selectedFile.value = file
  objectUrl.value = URL.createObjectURL(file)
  textContent.value = ''

  if (fallbackType.value === 'text') {
    readTextFile(file)
  }
}

function applyRemoteUrl() {
  const url = remoteDraft.value.trim()
  if (!url) {
    ElMessage.warning('请输入文件 URL')
    return
  }

  revokeObjectUrl()
  selectedFile.value = null
  textContent.value = ''
  remoteUrl.value = url
}

function clearSource() {
  revokeObjectUrl()
  selectedFile.value = null
  remoteUrl.value = ''
  remoteDraft.value = ''
  textContent.value = ''
}

function readTextFile(file) {
  const reader = new FileReader()
  reader.onload = () => {
    textContent.value = String(reader.result || '')
  }
  reader.onerror = () => {
    textContent.value = '读取文件失败'
  }
  reader.readAsText(file, 'utf-8')
}

function revokeObjectUrl() {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = ''
  }
}

function readableSize(size) {
  if (size < 1024) return `${size} B`
  const kb = size / 1024
  if (kb < 1024) return `${kb.toFixed(2)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(2)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(2)} GB`
}

function getFileNameFromUrl(url) {
  try {
    const { pathname } = new URL(url)
    const name = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '')
    return name || url
  } catch {
    return url.split('/').pop() || url
  }
}

function getExtension(value) {
  const clean = value.split('?')[0].split('#')[0]
  const match = clean.match(/\.([a-z0-9]+)$/i)
  return match ? `.${match[1].toLowerCase()}` : ''
}

function isTextMime(type) {
  return [
    'text/plain',
    'application/json',
    'text/markdown',
    'text/html',
    'text/css',
    'text/javascript',
    'application/xml'
  ].includes(type)
}

onBeforeUnmount(() => {
  revokeObjectUrl()
})
</script>

<style scoped>
.file-preview-page {
  width: min(1100px, 100%);
  margin: 0 auto;
}

.upload-card {
  margin-bottom: 16px;
}

.upload-icon {
  margin-bottom: 8px;
  font-size: 36px;
}

.upload-tip,
.source-hint {
  margin-top: 8px;
  color: #909399;
  font-size: 13px;
  line-height: 1.5;
}

.source-card,
.info-section {
  margin-top: 16px;
}

.card-header,
.url-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-header {
  justify-content: space-between;
}

.url-row .el-input {
  flex: 1;
}

.preview-shell {
  height: 72vh;
  min-height: 520px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #f5f7fa;
}

.fallback-preview {
  display: flex;
  height: 100%;
  flex-direction: column;
  padding: 16px;
  box-sizing: border-box;
}

.fallback-alert {
  flex: none;
  margin-bottom: 12px;
}

.fallback-block {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: 6px;
  background: #fff;
}

.center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview,
.pdf-preview {
  width: 100%;
  height: 100%;
}

.media-preview {
  max-width: 100%;
  max-height: 100%;
  border-radius: 6px;
}

.audio-preview {
  width: min(720px, 90%);
}

.text-preview {
  background: #1e1e1e;
}

.text-preview pre {
  margin: 0;
  padding: 16px;
  color: #d4d4d4;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.7;
}
</style>
