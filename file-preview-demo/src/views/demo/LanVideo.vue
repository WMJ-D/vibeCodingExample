<template>
  <div class="lan-video-page">
    <!-- 页面头部：纯前端 WebRTC 视频推流说明 -->
    <section class="lan-video-page__hero">
      <div>
        <p class="lan-video-page__eyebrow">WEBRTC VIDEO</p>
        <h2 class="lan-video-page__title">局域网视频查看</h2>
        <p class="lan-video-page__desc">A 端打开摄像头生成 Offer，B 端导入 Offer 后实时查看视频；视频流通过 WebRTC P2P 传输。</p>
      </div>
      <div class="lan-video-page__actions">
        <el-button class="lan-video-page__button" :disabled="streaming" @click="startCamera">打开视频</el-button>
        <el-button class="lan-video-page__button is-plain" :disabled="connectionState === 'connected'" @click="createOffer">创建 Offer</el-button>
        <el-button class="lan-video-page__button is-plain" @click="resetAll">重置</el-button>
      </div>
    </section>

    <!-- 状态卡片 -->
    <section class="lan-video-page__status-grid">
      <div v-for="item in statusCards" :key="item.label" class="lan-video-page__status-card">
        <span class="lan-video-page__status-label">{{ item.label }}</span>
        <strong class="lan-video-page__status-value">{{ item.value }}</strong>
      </div>
    </section>

    <section class="lan-video-page__main">
      <!-- 本地和远端视频 -->
      <el-card shadow="never" class="video-panel video-panel--player">
        <template #header>
          <div class="video-panel__header">
            <span>视频画面</span>
            <el-tag :type="connectionState === 'connected' ? 'success' : 'info'" effect="dark">{{ connectionStateLabel }}</el-tag>
          </div>
        </template>

        <div class="video-grid">
          <div class="video-box">
            <div class="video-box__title">A 端本地视频</div>
            <video ref="localVideoRef" class="video-box__player" autoplay muted playsinline></video>
            <div v-if="!streaming" class="video-box__empty">未打开摄像头</div>
          </div>
          <div class="video-box">
            <div class="video-box__title">B 端远程视频</div>
            <video ref="remoteVideoRef" class="video-box__player" autoplay playsinline></video>
            <div v-if="!remoteStreaming" class="video-box__empty">等待远端视频流</div>
          </div>
        </div>
      </el-card>

      <!-- 手动信令交换 -->
      <el-card shadow="never" class="video-panel video-panel--signal">
        <template #header>
          <div class="video-panel__header">
            <span>信令交换</span>
            <el-tag type="success" effect="plain">纯前端</el-tag>
          </div>
        </template>

        <div class="signal-form">
          <!-- A 端：生成 Offer 后复制给 B 端 -->
          <div class="signal-form__block">
            <div class="signal-form__title">1. 本机 Offer</div>
            <el-input v-model="localOfferText" type="textarea" :rows="4" readonly placeholder="A 端打开视频后点击创建 Offer" />
            <el-button class="signal-form__btn" size="small" :disabled="!localOfferText" @click="copyText(localOfferText)">复制 Offer</el-button>
          </div>

          <!-- B 端：粘贴 Offer 后生成 Answer；A 端：粘贴 Answer 完成连接 -->
          <div class="signal-form__block">
            <div class="signal-form__title">{{ isInitiator ? '2. 粘贴 B 端 Answer' : '1. 粘贴 A 端 Offer' }}</div>
            <el-input v-model="remoteText" type="textarea" :rows="4" :placeholder="isInitiator ? 'A 端在这里粘贴 B 端 Answer' : 'B 端在这里粘贴 A 端 Offer'" />
            <el-button class="signal-form__btn" size="small" :disabled="!remoteText" @click="importRemoteSignal">
              {{ isInitiator ? '导入 Answer' : '导入 Offer 并生成 Answer' }}
            </el-button>
          </div>

          <!-- B 端：复制 Answer 给 A 端 -->
          <div v-if="!isInitiator && localAnswerText" class="signal-form__block">
            <div class="signal-form__title">2. B 端 Answer</div>
            <el-input v-model="localAnswerText" type="textarea" :rows="4" readonly />
            <el-button class="signal-form__btn" size="small" @click="copyText(localAnswerText)">复制 Answer</el-button>
          </div>
        </div>
      </el-card>
    </section>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'

let peerConnection = null
let localStream = null

const localVideoRef = ref(null)
const remoteVideoRef = ref(null)
const streaming = ref(false)
const remoteStreaming = ref(false)
const isInitiator = ref(false)
const connectionState = ref('new')
const localOfferText = ref('')
const localAnswerText = ref('')
const remoteText = ref('')

const connectionStateLabel = computed(() => {
  const map = { new: '未连接', connecting: '连接中', connected: '已连接', disconnected: '已断开', failed: '连接失败', closed: '已关闭' }
  return map[connectionState.value] || connectionState.value
})

const statusCards = computed(() => [
  { label: '本地视频', value: streaming.value ? '已开启' : '未开启' },
  { label: '远端视频', value: remoteStreaming.value ? '接收中' : '等待中' },
  { label: '连接状态', value: connectionStateLabel.value },
  { label: '传输方式', value: 'P2P' },
])

/** 打开 A 端摄像头，并把本地视频轨道加入 PeerConnection */
async function startCamera() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    localVideoRef.value.srcObject = localStream
    streaming.value = true
    setupPeerConnection()
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream))
    ElMessage.success('摄像头已打开')
  } catch (e) {
    ElMessage.error('无法打开摄像头：' + e.message)
  }
}

/** A 端创建 Offer，复制给 B 端 */
async function createOffer() {
  if (!streaming.value) {
    ElMessage.warning('请先打开视频')
    return
  }
  isInitiator.value = true
  connectionState.value = 'connecting'
  setupPeerConnection()
  const offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)
  await waitForIceGathering()
  localOfferText.value = JSON.stringify(peerConnection.localDescription)
}

/** 导入远端信令：A 导入 Answer，B 导入 Offer 并生成 Answer */
async function importRemoteSignal() {
  try {
    const signal = JSON.parse(remoteText.value)
    setupPeerConnection()

    if (isInitiator.value) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(signal))
      ElMessage.success('Answer 已导入，等待视频连接')
    } else {
      connectionState.value = 'connecting'
      await peerConnection.setRemoteDescription(new RTCSessionDescription(signal))
      // B 端只接收视频，不采集本地摄像头
      peerConnection.addTransceiver('video', { direction: 'recvonly' })
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      await waitForIceGathering()
      localAnswerText.value = JSON.stringify(peerConnection.localDescription)
      ElMessage.success('Answer 已生成，请复制给 A 端')
    }
  } catch (e) {
    ElMessage.error('信令格式错误：' + e.message)
  }
}

/** 初始化 WebRTC 连接对象 */
function setupPeerConnection() {
  if (peerConnection) return
  peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })

  peerConnection.ontrack = (event) => {
    // B 端收到 A 端视频流后显示到远端 video
    remoteVideoRef.value.srcObject = event.streams[0]
    remoteStreaming.value = true
  }

  peerConnection.onconnectionstatechange = () => {
    connectionState.value = peerConnection.connectionState
  }
}

/** 等待 ICE 候选收集完成，确保复制的是完整信令 */
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

/** 复制信令文本 */
function copyText(text) {
  navigator.clipboard.writeText(text)
  ElMessage.success('已复制到剪贴板')
}

/** 重置连接和视频状态 */
function resetAll() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop())
    localStream = null
  }
  if (peerConnection) {
    peerConnection.close()
    peerConnection = null
  }
  if (localVideoRef.value) localVideoRef.value.srcObject = null
  if (remoteVideoRef.value) remoteVideoRef.value.srcObject = null
  streaming.value = false
  remoteStreaming.value = false
  isInitiator.value = false
  connectionState.value = 'new'
  localOfferText.value = ''
  localAnswerText.value = ''
  remoteText.value = ''
}

onUnmounted(() => resetAll())
</script>

<style lang="scss" scoped>
.lan-video-page {
  min-height: calc(100vh - 120px);
  padding: 22px;
  color: #d7ffe7;
  background: #07120c;

  &__hero,
  &__status-card,
  .video-panel {
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
    flex-wrap: wrap;
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
    grid-template-columns: 1fr 420px;
    gap: 16px;
  }
}

.video-panel {
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

.video-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.video-box {
  position: relative;
  min-height: 320px;
  border: 1px solid #173f2a;
  background: #07120c;
  overflow: hidden;

  &__title {
    position: absolute;
    z-index: 2;
    top: 12px;
    left: 12px;
    padding: 4px 8px;
    color: #2ee68a;
    background: #0d1c13;
    border: 1px solid #173f2a;
    font-size: 12px;
  }

  &__player {
    width: 100%;
    height: 100%;
    min-height: 320px;
    object-fit: cover;
    background: #07120c;
  }

  &__empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #7aa58b;
    pointer-events: none;
  }
}

.signal-form {
  display: grid;
  gap: 18px;

  &__title {
    margin-bottom: 8px;
    color: #2ee68a;
    font-size: 13px;
    font-weight: 600;
  }

  :deep(.el-textarea__inner) {
    background: #07120c;
    border-color: #173f2a;
    color: #d7ffe7;
    font-family: 'Consolas', monospace;
    font-size: 12px;
    resize: none;
  }

  &__btn {
    margin-top: 8px;
    border-color: #2ee68a;
    color: #2ee68a;
    background: transparent;
  }
}

@media (max-width: 1200px) {
  .lan-video-page {
    &__status-grid,
    &__main {
      grid-template-columns: 1fr;
    }

    &__hero {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  .video-grid {
    grid-template-columns: 1fr;
  }
}
</style>
