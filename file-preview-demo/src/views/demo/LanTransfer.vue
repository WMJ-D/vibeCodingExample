<template>
  <div class="lan-transfer-page">
    <!-- 页面头部 -->
    <section class="lan-transfer-page__hero">
      <div>
        <p class="lan-transfer-page__eyebrow">WEBRTC P2P</p>
        <h2 class="lan-transfer-page__title">局域网互传</h2>
        <p class="lan-transfer-page__desc">基于 WebRTC DataChannel，浏览器之间 P2P 直连传输文件，数据不经过任何服务器。</p>
      </div>
      <div class="lan-transfer-page__actions">
        <el-button class="lan-transfer-page__button" :disabled="connectionState === 'connected'" @click="createOffer">
          创建连接
        </el-button>
        <el-button class="lan-transfer-page__button is-plain" @click="clearAll">重置</el-button>
      </div>
    </section>

    <!-- 状态卡片 -->
    <section class="lan-transfer-page__status-grid">
      <div v-for="item in statusCards" :key="item.label" class="lan-transfer-page__status-card">
        <span class="lan-transfer-page__status-label">{{ item.label }}</span>
        <strong class="lan-transfer-page__status-value">{{ item.value }}</strong>
      </div>
    </section>

    <section class="lan-transfer-page__main">
      <!-- 左侧：信令交换区 -->
      <el-card shadow="never" class="lan-panel lan-panel--signaling">
        <template #header>
          <div class="lan-panel__header">
            <span>信令交换</span>
            <el-tag :type="connectionState === 'connected' ? 'success' : 'info'" effect="dark">
              {{ connectionStateLabel }}
            </el-tag>
          </div>
        </template>

        <div class="lan-signaling">
          <!-- 步骤一：本机 Offer -->
          <div class="lan-signaling__step">
            <div class="lan-signaling__step-title">1. 本机 Offer</div>
            <el-input
              v-model="localOfferText"
              type="textarea"
              :rows="3"
              readonly
              placeholder="点击创建连接生成 Offer"
              class="lan-signaling__textarea"
            />
            <el-button
              class="lan-signaling__btn"
              size="small"
              :disabled="!localOfferText"
              @click="copyText(localOfferText)"
            >复制 Offer</el-button>
          </div>

          <!-- 步骤二：粘贴对端 Offer 或 Answer -->
          <div class="lan-signaling__step">
            <div class="lan-signaling__step-title">
              {{ isInitiator ? '2. 粘贴对端 Answer' : '1. 粘贴对端 Offer' }}
            </div>
            <el-input
              v-model="remoteText"
              type="textarea"
              :rows="3"
              :placeholder="isInitiator ? '在此粘贴对端 Answer' : '在此粘贴对端 Offer'"
              class="lan-signaling__textarea"
            />
            <el-button
              class="lan-signaling__btn"
              size="small"
              :disabled="!remoteText"
              @click="importRemoteSignal"
            >{{ isInitiator ? '导入 Answer' : '导入并回复 Offer' }}</el-button>
          </div>

          <!-- 步骤三：如果接收方，生成 Answer 给对方 -->
          <div v-if="!isInitiator && localAnswerText" class="lan-signaling__step">
            <div class="lan-signaling__step-title">2. 复制 Answer 给对方</div>
            <el-input
              v-model="localAnswerText"
              type="textarea"
              :rows="3"
              readonly
              class="lan-signaling__textarea"
            />
            <el-button class="lan-signaling__btn" size="small" @click="copyText(localAnswerText)">复制 Answer</el-button>
          </div>
        </div>
      </el-card>

      <!-- 右侧：文件传输区 -->
      <el-card shadow="never" class="lan-panel lan-panel--transfer">
        <template #header>
          <div class="lan-panel__header">
            <span>文件传输</span>
            <el-tag v-if="connectionState === 'connected'" type="success" effect="dark">P2P 已连接</el-tag>
            <el-tag v-else type="info" effect="plain">未连接</el-tag>
          </div>
        </template>

        <!-- 文件选择 -->
        <el-upload
          class="lan-upload"
          drag
          multiple
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleFileSelect"
          :disabled="connectionState !== 'connected'"
        >
          <div class="lan-upload__content">
            <div class="lan-upload__icon">⇄</div>
            <div class="lan-upload__title">点击或拖拽文件到此处</div>
            <div class="lan-upload__tip">支持任意类型文件，文件将通过 P2P 直连传输</div>
          </div>
        </el-upload>

        <!-- 待发送队列 -->
        <div v-if="pendingFiles.length" class="lan-queue">
          <div class="lan-queue__title">待发送 ({{ pendingFiles.length }})</div>
          <div v-for="file in pendingFiles" :key="file.lastModified + file.name" class="lan-queue__item">
            <span class="lan-queue__name">{{ file.name }}</span>
            <span class="lan-queue__size">{{ formatFileSize(file.size) }}</span>
            <el-button class="lan-queue__send" size="small" @click="sendFile(file)">发送</el-button>
          </div>
        </div>

        <!-- 传输进度 -->
        <div v-if="transfers.length" class="lan-progress-list">
          <div v-for="task in transfers" :key="task.id" class="lan-progress-item">
            <div class="lan-progress-item__top">
              <span>{{ task.fileName }}</span>
              <em>{{ task.percent }}%</em>
            </div>
            <el-progress :percentage="task.percent" :stroke-width="8" color="#2ee68a" :show-text="false" />
            <div class="lan-progress-item__meta">
              <span>{{ task.direction === 'send' ? '发送' : '接收' }} · {{ task.status }}</span>
              <span>{{ formatFileSize(task.transferred) }} / {{ formatFileSize(task.total) }}</span>
            </div>
          </div>
        </div>
      </el-card>
    </section>

    <!-- 底部：传输历史 + 接收记录 -->
    <section class="lan-transfer-page__records">
      <!-- 传输历史 -->
      <el-card shadow="never" class="lan-panel">
        <template #header>
          <div class="lan-panel__header">
            <span>传输历史</span>
            <el-tag type="success" effect="plain">{{ transferHistory.length }} 条</el-tag>
          </div>
        </template>
        <el-table :data="transferHistory" class="lan-table" height="240">
          <el-table-column prop="fileName" label="文件名" min-width="180" />
          <el-table-column prop="size" label="大小" width="100" />
          <el-table-column prop="direction" label="方向" width="80" />
          <el-table-column prop="time" label="时间" width="160" />
          <el-table-column prop="status" label="状态" width="80" />
        </el-table>
      </el-card>

      <!-- 接收文件记录 -->
      <el-card shadow="never" class="lan-panel">
        <template #header>
          <div class="lan-panel__header">
            <span>接收记录</span>
            <el-tag type="success" effect="plain">{{ receivedFiles.length }} 个</el-tag>
          </div>
        </template>
        <el-table :data="receivedFiles" class="lan-table" height="240">
          <el-table-column prop="fileName" label="文件名" min-width="180" />
          <el-table-column prop="size" label="大小" width="100" />
          <el-table-column prop="time" label="接收时间" width="160" />
          <el-table-column label="操作" width="110">
            <template #default="{ row }">
              <el-button link class="lan-table__download" @click="saveReceivedFile(row)">保存下载</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

/* ========== 常量 ========== */
/** 文件分片大小：256kb */
const CHUNK_SIZE = 256 * 1024
/** 缓冲区水位线：2MB，超过则暂停等待 drain */
const BUFFER_THRESHOLD = 1024 * 1024

/* ========== WebRTC 状态 ========== */
let peerConnection = null
let dataChannel = null
const connectionState = ref('new')

const isInitiator = ref(false)
const localOfferText = ref('')
const localAnswerText = ref('')
const remoteText = ref('')

/* ========== 文件传输状态 ========== */
const pendingFiles = ref([])
const transfers = ref([])
const transferHistory = ref([])
const receivedFiles = ref([])

/** 当前接收中的文件元信息缓存 */
let receiveBuffer = []
let receiveMeta = null
let receivedSize = 0

/* ========== 计算属性 ========== */
const connectionStateLabel = computed(() => {
  const map = { new: '未连接', connecting: '连接中', connected: '已连接', disconnected: '已断开', failed: '连接失败', closed: '已关闭' }
  return map[connectionState.value] || connectionState.value
})

const statusCards = computed(() => [
  { label: '连接状态', value: connectionStateLabel.value },
  { label: '传输任务', value: `${transfers.value.length} 个` },
  { label: '传输历史', value: `${transferHistory.value.length} 条` },
  { label: '接收文件', value: `${receivedFiles.value.length} 个` },
])

/* ========== WebRTC 信令：创建 Offer ========== */
async function createOffer() {
  isInitiator.value = true
  connectionState.value = 'connecting'
  setupPeerConnection()

  // 创建 DataChannel
  dataChannel = peerConnection.createDataChannel('fileTransfer', { ordered: true })
  setupDataChannel()

  // 生成 Offer
  const offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)

  // 等 ICE 候选收集完毕后输出完整 SDP
  await waitForIceGathering()
  localOfferText.value = JSON.stringify(peerConnection.localDescription)
}

/* ========== 导入远端信令 ========== */
async function importRemoteSignal() {
  try {
    const signal = JSON.parse(remoteText.value)

    if (isInitiator.value) {
      // 发起方收到 Answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(signal))
      ElMessage.success('Answer 已导入，等待连接...')
    } else {
      // 接收方收到 Offer
      setupPeerConnection()
      connectionState.value = 'connecting'
      await peerConnection.setRemoteDescription(new RTCSessionDescription(signal))

      // 生成 Answer
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      await waitForIceGathering()
      localAnswerText.value = JSON.stringify(peerConnection.localDescription)
      ElMessage.success('Answer 已生成，请复制给对方')
    }
  } catch (e) {
    ElMessage.error('信令格式错误：' + e.message)
  }
}

/* ========== PeerConnection 初始化 ========== */
function setupPeerConnection() {
  if (peerConnection) return

  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  })

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      // ICE 候选会自动收集到 localDescription 中
    }
  }

  peerConnection.onconnectionstatechange = () => {
    connectionState.value = peerConnection.connectionState
    if (peerConnection.connectionState === 'connected') {
      ElMessage.success('P2P 连接已建立')
    }
    if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
      ElMessage.warning('P2P 连接已断开')
    }
  }

  // 接收方收到 DataChannel
  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel
    setupDataChannel()
  }
}

/* ========== DataChannel 事件绑定 ========== */
function setupDataChannel() {
  dataChannel.binaryType = 'arraybuffer'
  dataChannel.bufferedAmountLowThreshold = BUFFER_THRESHOLD

  dataChannel.onopen = () => {
    connectionState.value = 'connected'
  }

  dataChannel.onclose = () => {
    connectionState.value = 'disconnected'
  }

  dataChannel.onmessage = (event) => {
    handleReceiveMessage(event.data)
  }
}

/* ========== 等待 ICE 收集完成 ========== */
function waitForIceGathering() {
  return new Promise((resolve) => {
    if (peerConnection.iceGatheringState === 'complete') {
      resolve()
      return
    }
    const checkState = () => {
      if (peerConnection.iceGatheringState === 'complete') {
        peerConnection.removeEventListener('icegatheringstatechange', checkState)
        resolve()
      }
    }
    peerConnection.addEventListener('icegatheringstatechange', checkState)
  })
}

/* ========== 文件选择 ========== */
function handleFileSelect(file) {
  pendingFiles.value.push(file.raw)
}

/* ========== 发送文件 ========== */
function sendFile(file) {
  if (connectionState.value !== 'connected' || !dataChannel) {
    ElMessage.warning('请先建立 P2P 连接')
    return
  }

  const task = reactive({
    id: Date.now(),
    fileName: file.name,
    direction: 'send',
    total: file.size,
    transferred: 0,
    percent: 0,
    status: '发送中',
  })
  transfers.value.push(task)

  // 1. 先发送文件元信息
  const meta = JSON.stringify({ type: 'file-meta', name: file.name, size: file.size })
  dataChannel.send(meta)

  // 2. 分片读取并发送（带背压控制）
  let offset = 0
  const reader = new FileReader()

  reader.onload = (e) => {
    // 背压控制：缓冲区满时等待 drained 信号
    if (dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
      dataChannel.onbufferedamountlow = () => {
        dataChannel.onbufferedamountlow = null
        doSend(e.target.result)
      }
    } else {
      doSend(e.target.result)
    }
  }

  function doSend(chunk) {
    try {
      dataChannel.send(chunk)
    } catch {
      task.status = '发送失败'
      ElMessage.error(`${file.name} 发送失败：缓冲区异常`)
      return
    }

    offset += chunk.byteLength
    task.transferred = offset
    task.percent = Math.round((offset / file.size) * 100)

    if (offset < file.size) {
      readSlice(offset)
    } else {
      // 发送完成标记
      dataChannel.send(JSON.stringify({ type: 'file-end', name: file.name }))
      task.percent = 100
      task.status = '已完成'

      transferHistory.value.unshift({
        fileName: file.name,
        size: formatFileSize(file.size),
        direction: '发送',
        time: new Date().toLocaleString('zh-CN'),
        status: '成功',
      })

      pendingFiles.value = pendingFiles.value.filter(f => f !== file)
      ElMessage.success(`${file.name} 发送完成`)
    }
  }

  function readSlice(pos) {
    const slice = file.slice(pos, pos + CHUNK_SIZE)
    reader.readAsArrayBuffer(slice)
  }

  readSlice(0)
}

/* ========== 接收消息处理 ========== */
function handleReceiveMessage(data) {
  if (typeof data === 'string') {
    // 控制消息
    const msg = JSON.parse(data)
    if (msg.type === 'file-meta') {
      // 文件元信息
      receiveMeta = msg
      receivedSize = 0
      receiveBuffer = []

      const task = reactive({
        id: Date.now(),
        fileName: msg.name,
        direction: 'recv',
        total: msg.size,
        transferred: 0,
        percent: 0,
        status: '接收中',
      })
      transfers.value.push(task)

    } else if (msg.type === 'file-end') {
      // 文件接收完成，组装 Blob
      const blob = new Blob(receiveBuffer)
      const receivedRecord = {
        fileName: msg.name,
        size: formatFileSize(blob.size),
        time: new Date().toLocaleString('zh-CN'),
        blob,
      }
      receivedFiles.value.unshift(receivedRecord)

      // 更新传输任务状态
      const task = transfers.value.find(t => t.fileName === msg.name && t.direction === 'recv')
      if (task) {
        task.percent = 100
        task.status = '已完成'
      }

      transferHistory.value.unshift({
        fileName: msg.name,
        size: formatFileSize(blob.size),
        direction: '接收',
        time: new Date().toLocaleString('zh-CN'),
        status: '成功',
      })

      receiveBuffer = []
      receiveMeta = null
      receivedSize = 0
    }
  } else {
    // 二进制数据分片
    receiveBuffer.push(data)
    receivedSize += data.byteLength

    // 更新接收进度
    if (receiveMeta) {
      const task = transfers.value.find(t => t.fileName === receiveMeta.name && t.direction === 'recv')
      if (task) {
        task.transferred = receivedSize
        task.percent = Math.round((receivedSize / receiveMeta.size) * 100)
      }
    }
  }
}

/* ========== 保存下载接收的文件 ========== */
function saveReceivedFile(row) {
  if (!row.blob) {
    ElMessage.warning('文件数据不可用')
    return
  }
  const url = URL.createObjectURL(row.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = row.fileName
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`${row.fileName} 已保存`)
}

/* ========== 重置所有状态 ========== */
function clearAll() {
  if (dataChannel) { dataChannel.close(); dataChannel = null }
  if (peerConnection) { peerConnection.close(); peerConnection = null }
  connectionState.value = 'new'
  isInitiator.value = false
  localOfferText.value = ''
  localAnswerText.value = ''
  remoteText.value = ''
  pendingFiles.value = []
  transfers.value = []
}

/* ========== 工具函数 ========== */
function copyText(text) {
  navigator.clipboard.writeText(text)
  ElMessage.success('已复制到剪贴板')
}

function formatFileSize(size) {
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/* ========== 组件卸载时清理 ========== */
onUnmounted(() => {
  if (dataChannel) dataChannel.close()
  if (peerConnection) peerConnection.close()
})
</script>

<style lang="scss" scoped>
.lan-transfer-page {
  min-height: calc(100vh - 120px);
  padding: 22px;
  color: #d7ffe7;
  background: #07120c;

  &__hero,
  &__status-card,
  .lan-panel {
    border: 1px solid #173f2a;
    background: #0d1c13;
  }

  &__hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 24px;
    margin-bottom: 16px;
  }

  &__eyebrow {
    margin: 0 0 8px;
    color: #2ee68a;
    font-size: 12px;
    letter-spacing: 2px;
  }

  &__title {
    margin: 0;
    color: #f1fff6;
    font-size: 30px;
    font-weight: 700;
  }

  &__desc {
    margin: 10px 0 0;
    color: #93b89f;
  }

  &__actions {
    display: flex;
    gap: 10px;
  }

  &__button {
    border-color: #2ee68a;
    color: #07120c;
    background: #2ee68a;

    &.is-plain {
      color: #2ee68a;
      background: #0d1c13;
    }

    &:disabled {
      border-color: #1a4a30;
      color: #5a8a6b;
      background: #102817;
    }
  }

  &__status-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 16px;
  }

  &__status-card {
    padding: 16px;
  }

  &__status-label {
    display: block;
    color: #7aa58b;
    font-size: 12px;
  }

  &__status-value {
    display: block;
    margin-top: 8px;
    color: #2ee68a;
    font-size: 24px;
  }

  &__main {
    display: grid;
    grid-template-columns: 420px 1fr;
    gap: 16px;
  }

  &__records {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 16px;
  }
}

/* ---------- 面板通用 ---------- */
.lan-panel {
  :deep(.el-card__header) {
    border-bottom-color: #173f2a;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #f1fff6;
    font-weight: 700;
  }
}

/* ---------- 信令交换区 ---------- */
.lan-signaling {
  display: grid;
  gap: 18px;

  &__step-title {
    margin-bottom: 8px;
    color: #2ee68a;
    font-size: 13px;
    font-weight: 600;
  }

  &__textarea {
    margin-bottom: 8px;

    :deep(.el-textarea__inner) {
      background: #07120c;
      border-color: #173f2a;
      color: #d7ffe7;
      font-family: 'Consolas', monospace;
      font-size: 12px;
      resize: none;

      &::placeholder {
        color: #3a6b4a;
      }
    }
  }

  &__btn {
    border-color: #2ee68a;
    color: #2ee68a;
    background: transparent;
  }
}

/* ---------- 上传区 ---------- */
.lan-upload {
  :deep(.el-upload-dragger) {
    border-color: #173f2a;
    background: #07120c;
  }

  :deep(.el-upload-dragger:hover) {
    border-color: #2ee68a;
  }

  &__content {
    padding: 26px 0;
    color: #d7ffe7;
  }

  &__icon {
    color: #2ee68a;
    font-size: 40px;
    font-weight: 700;
  }

  &__title {
    margin-top: 12px;
    font-size: 16px;
    font-weight: 700;
  }

  &__tip {
    margin-top: 8px;
    color: #7aa58b;
    font-size: 12px;
  }
}

/* ---------- 待发送队列 ---------- */
.lan-queue {
  margin-top: 16px;

  &__title {
    margin-bottom: 10px;
    color: #2ee68a;
    font-weight: 600;
    font-size: 13px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    margin-bottom: 6px;
    border: 1px solid #173f2a;
    background: #07120c;
  }

  &__name {
    flex: 1;
    color: #f1fff6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__size {
    color: #7aa58b;
    font-size: 12px;
    white-space: nowrap;
  }

  &__send {
    border-color: #2ee68a;
    color: #07120c;
    background: #2ee68a;
  }
}

/* ---------- 传输进度 ---------- */
.lan-progress-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.lan-progress-item {
  padding: 12px;
  border: 1px solid #173f2a;
  background: #07120c;

  &__top,
  &__meta {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  &__top {
    margin-bottom: 8px;
    color: #f1fff6;

    em {
      color: #2ee68a;
      font-style: normal;
    }
  }

  &__meta {
    margin-top: 8px;
    color: #7aa58b;
    font-size: 12px;
  }
}

/* ---------- 表格 ---------- */
.lan-table {
  :deep(.el-table__inner-wrapper),
  :deep(.el-table__body),
  :deep(.el-table__header),
  :deep(.el-table__body-wrapper),
  :deep(.el-scrollbar__view),
  :deep(th.el-table__cell),
  :deep(td.el-table__cell) {
    background: #0d1c13;
  }

  // 覆盖 Element Plus 表格底部默认白色伪线
  :deep(.el-table__inner-wrapper::before),
  :deep(.el-table__border-left-patch) {
    background-color: #173f2a;
  }

  :deep(th.el-table__cell),
  :deep(td.el-table__cell) {
    border-bottom-color: #173f2a;
    color: #d7ffe7;
  }

  :deep(.el-table__row:hover > td.el-table__cell) {
    background: #102817;
  }

  &__download {
    color: #2ee68a;
  }
}

/* ---------- 响应式 ---------- */
@media (max-width: 1200px) {
  .lan-transfer-page {
    &__status-grid,
    &__main,
    &__records {
      grid-template-columns: 1fr;
    }

    &__hero {
      align-items: flex-start;
      flex-direction: column;
    }
  }
}
</style>
