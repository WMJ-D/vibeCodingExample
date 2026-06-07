<template>
  <div class="file-preview-page">
    <el-upload
      class="upload-demo"
      drag
      action="#"
      :auto-upload="false"
      :show-file-list="false"
      :on-change="handleFileChange"
    >
      <el-icon class="el-icon--upload" style="font-size: 36px; margin-bottom: 8px;"><upload-filled /></el-icon>
      <div class="el-upload__text">将文件拖到此处，或 <em>点击选择文件</em></div>
    </el-upload>

    <div v-if="fileInfo" class="info-section">
      <el-descriptions title="文件信息" :column="3" border size="small">
        <el-descriptions-item label="文件名">{{ fileInfo.name }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ fileInfo.type || '未知类型' }}</el-descriptions-item>
        <el-descriptions-item label="大小">{{ readableSize(fileInfo.size) }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <el-divider v-if="fileInfo">预览区域</el-divider>

    <div class="preview-container" v-if="fileInfo">
      <!-- 图片预览 -->
      <div v-if="previewType === 'image'" class="preview-block">
        <el-image 
          :src="previewUrl" 
          :preview-src-list="[previewUrl]" 
          fit="contain" 
          style="width: 100%; height: 60vh;"
        />
      </div>

      <!-- 视频预览 -->
      <div v-else-if="previewType === 'video'" class="preview-block flex-center">
        <video :src="previewUrl" controls style="max-width: 100%; max-height: 60vh; border-radius: 8px;" />
      </div>

      <!-- 音频预览 -->
      <div v-else-if="previewType === 'audio'" class="preview-block flex-center">
        <audio :src="previewUrl" controls style="width: 80%; margin-top: 40px;" />
      </div>

      <!-- PDF 预览 -->
      <div v-else-if="previewType === 'pdf'" class="preview-block pdf-preview">
        <embed :src="previewUrl" type="application/pdf" style="width: 100%; height: 70vh; border-radius: 8px;" />
      </div>

      <!-- 文本预览 -->
      <div v-else-if="previewType === 'text'" class="preview-block text-preview">
        <el-scrollbar height="60vh" class="text-scrollbar">
          <pre>{{ textContent }}</pre>
        </el-scrollbar>
      </div>

      <!-- 不支持的类型 -->
      <div v-else class="preview-block unsupported">
        <el-empty description="暂不支持此文件类型的预览" />
      </div>
    </div>
  </div>
</template>

<script>
import { UploadFilled } from '@element-plus/icons-vue'

export default {
  name: 'FilePreview',
  components: {
    UploadFilled
  },
  data() {
    return {
      fileInfo: null,
      previewUrl: null,
      textContent: ''
    }
  },
  computed: {
    previewType() {
      if (!this.fileInfo) return 'unknown'
      const file = this.fileInfo
      const type = file.type || ''

      if (type.startsWith('image/')) return 'image'
      if (type.startsWith('video/')) return 'video'
      if (type.startsWith('audio/')) return 'audio'
      if (type === 'application/pdf') return 'pdf'

      const textMimeList = [
        'text/plain',
        'application/json',
        'text/markdown',
        'text/html',
        'text/css',
        'text/javascript',
        'application/xml'
      ]
      if (textMimeList.includes(type)) return 'text'

      const name = (file.name || '').toLowerCase()
      if (/\.(txt|md|json|log|xml|html|css|js|vue|py|java|c|cpp|go|rs)$/.test(name)) {
        return 'text'
      }

      return 'unknown'
    }
  },
  methods: {
    handleFileChange(uploadFile) {
      const file = uploadFile.raw
      if (!file) return

      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl)
        this.previewUrl = null
      }

      this.fileInfo = file
      this.textContent = ''

      const type = this.previewType

      if (['image', 'video', 'audio', 'pdf'].includes(type)) {
        this.previewUrl = URL.createObjectURL(file)
        return
      }

      if (type === 'text') {
        const reader = new FileReader()
        reader.onload = () => {
          this.textContent = String(reader.result || '')
        }
        reader.onerror = () => {
          this.textContent = '读取文件失败'
        }
        reader.readAsText(file, 'utf-8')
      }
    },
    readableSize(size) {
      if (size < 1024) return `${size} B`
      const kb = size / 1024
      if (kb < 1024) return `${kb.toFixed(2)} KB`
      const mb = kb / 1024
      if (mb < 1024) return `${mb.toFixed(2)} MB`
      const gb = mb / 1024
      return `${gb.toFixed(2)} GB`
    }
  },
  beforeUnmount() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl)
    }
  }
}
</script>

<style scoped>
.file-preview-page {
  max-width: 900px;
  margin: 0 auto;
}

.info-section {
  margin-top: 20px;
}

.preview-container {
  min-height: 300px;
  background-color: #fafafa;
  border-radius: 8px;
  padding: 16px;
  box-sizing: border-box;
}

.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.text-scrollbar {
  background: #1e1e1e;
  border-radius: 6px;
  padding: 12px;
}

.text-scrollbar pre {
  margin: 0;
  color: #d4d4d4;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
}
</style>
