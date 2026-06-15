<template>
  <div class="angry-birds-page">
    <!-- 顶部信息栏 -->
    <div class="game-header">
      <div class="header-left">
        <div class="game-info">
          <el-icon><Trophy /></el-icon>
          <span class="label">关卡</span>
          <span class="value">{{ currentLevel }}</span>
        </div>
        <div class="game-info">
          <el-icon><Star /></el-icon>
          <span class="label">得分</span>
          <span class="value">{{ score }}</span>
        </div>
        <div class="game-info birds-info">
          <span class="label">剩余小鸟</span>
          <div class="birds-icons">
            <span v-for="i in birdsLeft" :key="i" class="bird-icon">🐦</span>
          </div>
        </div>
      </div>
      <div class="header-right">
        <el-button type="warning" @click="prevLevel" :disabled="currentLevel <= 1">
          <el-icon><ArrowLeft /></el-icon>上一关
        </el-button>
        <el-button type="primary" @click="resetGame">
          <el-icon><RefreshRight /></el-icon>重新开始
        </el-button>
        <el-button type="success" @click="nextLevel" :disabled="currentLevel >= 3">
          下一关<el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 游戏画布 -->
    <div class="game-container">
      <canvas
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
      ></canvas>

      <!-- 游戏状态遮罩 -->
      <transition name="fade">
        <div v-if="gameState === 'win'" class="game-overlay overlay-win">
          <div class="overlay-content">
            <div class="stars-display">
              <span v-for="i in 3" :key="i" :class="['star', { active: i <= starsEarned }]">⭐</span>
            </div>
            <h2>恭喜通关!</h2>
            <p class="score-text">得分: {{ score }}</p>
            <div class="overlay-buttons">
              <el-button type="primary" @click="resetGame">重玩本关</el-button>
              <el-button type="success" @click="nextLevel" :disabled="currentLevel >= 3">下一关</el-button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="gameState === 'lose'" class="game-overlay overlay-lose">
          <div class="overlay-content">
            <h2>游戏失败</h2>
            <p class="score-text">得分: {{ score }}</p>
            <el-button type="warning" @click="resetGame">再试一次</el-button>
          </div>
        </div>
      </transition>

      <!-- 关卡选择 -->
      <transition name="fade">
        <div v-if="showLevelSelect" class="game-overlay overlay-level">
          <div class="overlay-content level-select">
            <h2>选择关卡</h2>
            <div class="level-grid">
              <div
                v-for="level in 3"
                :key="level"
                :class="['level-card', { current: level === currentLevel }]"
                @click="selectLevel(level)"
              >
                <span class="level-num">{{ level }}</span>
                <span class="level-stars">
                  <span v-for="i in 3" :key="i" :class="['star', { active: i <= (levelStars[level] || 0) }]">⭐</span>
                </span>
              </div>
            </div>
            <el-button type="primary" @click="showLevelSelect = false">返回游戏</el-button>
          </div>
        </div>
      </transition>
    </div>

    <!-- 底部提示栏 -->
    <div class="game-footer">
      <div class="tips">
        <el-icon><InfoFilled /></el-icon>
        <span>拖拽弹弓发射小鸟，消灭所有小猪即可过关！</span>
      </div>
      <div class="level-buttons">
        <el-button size="small" @click="showLevelSelect = true">
          <el-icon><Grid /></el-icon>选择关卡
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

// ============ 响应式状态 ============
const canvasRef = ref(null)
const score = ref(0)
const birdsLeft = ref(3)
const gameState = ref('playing')
const currentLevel = ref(1)
const starsEarned = ref(0)
const showLevelSelect = ref(false)
const levelStars = ref({ 1: 0, 2: 0, 3: 0 })

const canvasWidth = 900
const canvasHeight = 520

// ============ 游戏常量 ============
const SLING_X = 130
const SLING_Y = 370
const GRAVITY = 0.35
const FRICTION = 0.998
const BOUNCE = 0.45
const GROUND_Y = 460
const MAX_DRAG = 100
const LAUNCH_POWER = 0.16

// ============ 游戏状态 ============
let ctx = null
let animationId = null
let isDragging = false
let currentBird = null
let birds = []
let pigs = []
let blocks = []
let particles = []
let trajectoryPoints = []
let clouds = []
let frameCount = 0
let isAiming = false

// ============ 音效系统 ============
const audioCtx = ref(null)

function initAudio() {
  try {
    audioCtx.value = new (window.AudioContext || window.webkitAudioContext)()
  } catch (e) {
    console.log('Web Audio API not supported')
  }
}

function playSound(type) {
  if (!audioCtx.value) return
  try {
    const osc = audioCtx.value.createOscillator()
    const gain = audioCtx.value.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.value.destination)

    switch(type) {
      case 'launch':
        osc.frequency.setValueAtTime(300, audioCtx.value.currentTime)
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.value.currentTime + 0.3)
        gain.gain.setValueAtTime(0.3, audioCtx.value.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.value.currentTime + 0.3)
        osc.start()
        osc.stop(audioCtx.value.currentTime + 0.3)
        break
      case 'hit':
        osc.frequency.setValueAtTime(200, audioCtx.value.currentTime)
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.value.currentTime + 0.2)
        gain.gain.setValueAtTime(0.2, audioCtx.value.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.value.currentTime + 0.2)
        osc.start()
        osc.stop(audioCtx.value.currentTime + 0.2)
        break
      case 'destroy':
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(400, audioCtx.value.currentTime)
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.value.currentTime + 0.5)
        gain.gain.setValueAtTime(0.3, audioCtx.value.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.value.currentTime + 0.5)
        osc.start()
        osc.stop(audioCtx.value.currentTime + 0.5)
        break
      case 'win':
        osc.type = 'sine'
        osc.frequency.setValueAtTime(523, audioCtx.value.currentTime)
        gain.gain.setValueAtTime(0.2, audioCtx.value.currentTime)
        setTimeout(() => {
          const osc2 = audioCtx.value.createOscillator()
          const gain2 = audioCtx.value.createGain()
          osc2.connect(gain2)
          gain2.connect(audioCtx.value.destination)
          osc2.frequency.setValueAtTime(659, audioCtx.value.currentTime)
          gain2.gain.setValueAtTime(0.2, audioCtx.value.currentTime)
          gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.value.currentTime + 0.3)
          osc2.start()
          osc2.stop(audioCtx.value.currentTime + 0.3)
        }, 200)
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.value.currentTime + 0.3)
        osc.start()
        osc.stop(audioCtx.value.currentTime + 0.3)
        break
    }
  } catch(e) {}
}

// ============ 关卡数据 ============
const levels = {
  1: {
    birds: [
      { type: 'red' },
      { type: 'red' },
      { type: 'yellow' },
    ],
    pigs: [
      { x: 600, y: GROUND_Y - 25, radius: 22 },
      { x: 680, y: GROUND_Y - 25, radius: 22 },
    ],
    blocks: [
      { x: 570, y: GROUND_Y - 80, w: 25, h: 80, type: 'wood' },
      { x: 695, y: GROUND_Y - 80, w: 25, h: 80, type: 'wood' },
      { x: 570, y: GROUND_Y - 100, w: 150, h: 20, type: 'wood' },
    ],
    starThresholds: [1000, 2000, 3000]
  },
  2: {
    birds: [
      { type: 'red' },
      { type: 'yellow' },
      { type: 'red' },
      { type: 'black' },
    ],
    pigs: [
      { x: 550, y: GROUND_Y - 25, radius: 22 },
      { x: 650, y: GROUND_Y - 25, radius: 22 },
      { x: 600, y: GROUND_Y - 120, radius: 22 },
    ],
    blocks: [
      { x: 520, y: GROUND_Y - 80, w: 25, h: 80, type: 'wood' },
      { x: 675, y: GROUND_Y - 80, w: 25, h: 80, type: 'wood' },
      { x: 520, y: GROUND_Y - 100, w: 180, h: 20, type: 'wood' },
      { x: 570, y: GROUND_Y - 160, w: 25, h: 60, type: 'stone' },
      { x: 625, y: GROUND_Y - 160, w: 25, h: 60, type: 'stone' },
      { x: 570, y: GROUND_Y - 180, w: 80, h: 20, type: 'stone' },
    ],
    starThresholds: [2000, 4000, 6000]
  },
  3: {
    birds: [
      { type: 'yellow' },
      { type: 'red' },
      { type: 'black' },
      { type: 'red' },
      { type: 'yellow' },
    ],
    pigs: [
      { x: 500, y: GROUND_Y - 25, radius: 22 },
      { x: 620, y: GROUND_Y - 25, radius: 22 },
      { x: 740, y: GROUND_Y - 25, radius: 22 },
      { x: 620, y: GROUND_Y - 180, radius: 25 },
    ],
    blocks: [
      { x: 470, y: GROUND_Y - 80, w: 25, h: 80, type: 'wood' },
      { x: 530, y: GROUND_Y - 80, w: 25, h: 80, type: 'wood' },
      { x: 470, y: GROUND_Y - 100, w: 85, h: 20, type: 'wood' },
      { x: 590, y: GROUND_Y - 80, w: 25, h: 80, type: 'wood' },
      { x: 650, y: GROUND_Y - 80, w: 25, h: 80, type: 'wood' },
      { x: 590, y: GROUND_Y - 100, w: 85, h: 20, type: 'wood' },
      { x: 710, y: GROUND_Y - 80, w: 25, h: 80, type: 'stone' },
      { x: 770, y: GROUND_Y - 80, w: 25, h: 80, type: 'stone' },
      { x: 710, y: GROUND_Y - 100, w: 85, h: 20, type: 'stone' },
      { x: 560, y: GROUND_Y - 160, w: 25, h: 60, type: 'stone' },
      { x: 680, y: GROUND_Y - 160, w: 25, h: 60, type: 'stone' },
      { x: 560, y: GROUND_Y - 180, w: 145, h: 20, type: 'stone' },
    ],
    starThresholds: [3000, 6000, 9000]
  }
}

// ============ 初始化游戏 ============
function initGame() {
  const level = levels[currentLevel.value]
  if (!level) return

  score.value = 0
  gameState.value = 'playing'
  isDragging = false
  isAiming = false
  particles = []
  trajectoryPoints = []
  frameCount = 0

  // 初始化云朵
  clouds = Array.from({ length: 6 }, () => ({
    x: Math.random() * canvasWidth,
    y: Math.random() * 150 + 30,
    speed: Math.random() * 0.5 + 0.2,
    size: Math.random() * 30 + 20,
  }))

  // 初始化小鸟
  birds = level.birds.map((b, i) => ({
    ...getBirdStats(b.type),
    x: SLING_X - i * 45,
    y: GROUND_Y - 18,
    vx: 0,
    vy: 0,
    active: false,
    launched: false,
    used: false,
  }))

  birdsLeft.value = birds.length
  currentBird = birds[0]
  currentBird.x = SLING_X
  currentBird.y = SLING_Y

  // 初始化小猪
  pigs = level.pigs.map(p => ({
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    radius: p.radius,
    health: 100,
    maxHealth: 100,
    active: true,
    hitFlash: 0,
  }))

  // 初始化方块
  blocks = level.blocks.map(b => ({
    ...b,
    health: getBlockHealth(b.type),
    maxHealth: getBlockHealth(b.type),
    active: true,
    vx: 0,
    vy: 0,
  }))
}

function getBirdStats(type) {
  switch(type) {
    case 'yellow':
      return { type, radius: 14, color: '#FFD700', strokeColor: '#DAA520', special: 'speed' }
    case 'black':
      return { type, radius: 18, color: '#2C2C2C', strokeColor: '#1a1a1a', special: 'explode' }
    default:
      return { type, radius: 16, color: '#E53935', strokeColor: '#C62828', special: 'none' }
  }
}

function getBlockHealth(type) {
  switch(type) {
    case 'wood': return 80
    case 'stone': return 150
    case 'glass': return 40
    default: return 80
  }
}

function getBlockColor(type) {
  switch(type) {
    case 'wood': return { fill: '#8D6E63', stroke: '#6D4C41', damaged: '#A1887F' }
    case 'stone': return { fill: '#78909C', stroke: '#546E7A', damaged: '#90A4AE' }
    case 'glass': return { fill: '#B3E5FC', stroke: '#81D4FA', damaged: '#E1F5FE' }
    default: return { fill: '#8D6E63', stroke: '#6D4C41', damaged: '#A1887F' }
  }
}

// ============ 绘制函数 ============
function drawBackground() {
  // 天空渐变
  const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
  skyGrad.addColorStop(0, '#87CEEB')
  skyGrad.addColorStop(0.5, '#B8E6FF')
  skyGrad.addColorStop(1, '#E8F5E9')
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, canvasWidth, GROUND_Y)

  // 远山
  ctx.fillStyle = '#81C784'
  ctx.beginPath()
  ctx.moveTo(0, GROUND_Y)
  ctx.quadraticCurveTo(150, GROUND_Y - 80, 300, GROUND_Y)
  ctx.quadraticCurveTo(450, GROUND_Y - 60, 600, GROUND_Y)
  ctx.quadraticCurveTo(750, GROUND_Y - 90, 900, GROUND_Y)
  ctx.fill()

  // 云朵
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  clouds.forEach(cloud => {
    cloud.x += cloud.speed
    if (cloud.x > canvasWidth + 50) cloud.x = -50
    drawCloud(cloud.x, cloud.y, cloud.size)
  })

  // 地面
  const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, canvasHeight)
  groundGrad.addColorStop(0, '#4CAF50')
  groundGrad.addColorStop(0.1, '#388E3C')
  groundGrad.addColorStop(1, '#2E7D32')
  ctx.fillStyle = groundGrad
  ctx.fillRect(0, GROUND_Y, canvasWidth, canvasHeight - GROUND_Y)

  // 草地细节
  ctx.fillStyle = '#66BB6A'
  for (let i = 0; i < canvasWidth; i += 15) {
    const h = Math.sin(i * 0.1 + frameCount * 0.02) * 3 + 5
    ctx.fillRect(i, GROUND_Y - h, 8, h)
  }
}

function drawCloud(x, y, size) {
  ctx.beginPath()
  ctx.arc(x, y, size, 0, Math.PI * 2)
  ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.7, 0, Math.PI * 2)
  ctx.arc(x + size * 1.4, y, size * 0.6, 0, Math.PI * 2)
  ctx.arc(x + size * 0.6, y + size * 0.2, size * 0.5, 0, Math.PI * 2)
  ctx.fill()
}

function drawSlingshot() {
  if (!ctx) return

  // 弹弓阴影
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.fillRect(SLING_X - 6, SLING_Y + 5, 12, 70)

  // 弹弓底座
  const baseGrad = ctx.createLinearGradient(SLING_X - 10, 0, SLING_X + 10, 0)
  baseGrad.addColorStop(0, '#5D4037')
  baseGrad.addColorStop(0.5, '#795548')
  baseGrad.addColorStop(1, '#4E342E')
  ctx.fillStyle = baseGrad
  ctx.fillRect(SLING_X - 8, SLING_Y - 5, 16, 75)

  // 弹弓叉左
  ctx.fillStyle = '#6D4C41'
  ctx.beginPath()
  ctx.moveTo(SLING_X - 5, SLING_Y + 10)
  ctx.lineTo(SLING_X - 22, SLING_Y - 35)
  ctx.lineTo(SLING_X - 16, SLING_Y - 38)
  ctx.lineTo(SLING_X - 2, SLING_Y + 5)
  ctx.fill()

  // 弹弓叉右
  ctx.beginPath()
  ctx.moveTo(SLING_X + 5, SLING_Y + 10)
  ctx.lineTo(SLING_X + 22, SLING_Y - 35)
  ctx.lineTo(SLING_X + 16, SLING_Y - 38)
  ctx.lineTo(SLING_X + 2, SLING_Y + 5)
  ctx.fill()

  // 皮筋
  if (isDragging && currentBird) {
    ctx.strokeStyle = '#4E342E'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'

    // 左侧皮筋
    ctx.beginPath()
    ctx.moveTo(SLING_X - 19, SLING_Y - 36)
    ctx.quadraticCurveTo(
      (SLING_X - 19 + currentBird.x) / 2,
      (SLING_Y - 36 + currentBird.y) / 2 - 10,
      currentBird.x,
      currentBird.y
    )
    ctx.stroke()

    // 右侧皮筋
    ctx.beginPath()
    ctx.moveTo(SLING_X + 19, SLING_Y - 36)
    ctx.quadraticCurveTo(
      (SLING_X + 19 + currentBird.x) / 2,
      (SLING_Y - 36 + currentBird.y) / 2 - 10,
      currentBird.x,
      currentBird.y
    )
    ctx.stroke()
  } else if (currentBird && !currentBird.launched) {
    ctx.strokeStyle = '#4E342E'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'

    ctx.beginPath()
    ctx.moveTo(SLING_X - 19, SLING_Y - 36)
    ctx.lineTo(currentBird.x, currentBird.y)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(SLING_X + 19, SLING_Y - 36)
    ctx.lineTo(currentBird.x, currentBird.y)
    ctx.stroke()
  } else {
    // 空弹弓皮筋
    ctx.strokeStyle = '#4E342E'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(SLING_X - 19, SLING_Y - 36)
    ctx.lineTo(SLING_X - 5, SLING_Y - 10)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(SLING_X + 19, SLING_Y - 36)
    ctx.lineTo(SLING_X + 5, SLING_Y - 10)
    ctx.stroke()
  }
}

function drawBird(bird) {
  if (!ctx || !bird) return

  ctx.save()

  // 小鸟阴影
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(bird.x + 3, bird.y + bird.radius + 2, bird.radius * 0.8, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // 小鸟身体
  const bodyGrad = ctx.createRadialGradient(
    bird.x - bird.radius * 0.3, bird.y - bird.radius * 0.3, 0,
    bird.x, bird.y, bird.radius
  )
  bodyGrad.addColorStop(0, lightenColor(bird.color, 30))
  bodyGrad.addColorStop(1, bird.color)
  ctx.fillStyle = bodyGrad
  ctx.beginPath()
  ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = bird.strokeColor
  ctx.lineWidth = 2
  ctx.stroke()

  // 小鸟特征
  const r = bird.radius
  if (bird.type === 'red') {
    drawRedBirdFeatures(bird.x, bird.y, r)
  } else if (bird.type === 'yellow') {
    drawYellowBirdFeatures(bird.x, bird.y, r)
  } else if (bird.type === 'black') {
    drawBlackBirdFeatures(bird.x, bird.y, r)
  }

  ctx.restore()
}

function drawRedBirdFeatures(x, y, r) {
  // 眼白
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.ellipse(x - r * 0.25, y - r * 0.15, r * 0.3, r * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x + r * 0.25, y - r * 0.15, r * 0.3, r * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()

  // 瞳孔
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  ctx.arc(x - r * 0.2, y - r * 0.15, r * 0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + r * 0.3, y - r * 0.15, r * 0.15, 0, Math.PI * 2)
  ctx.fill()

  // 怒眉
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(x - r * 0.6, y - r * 0.55)
  ctx.lineTo(x - r * 0.1, y - r * 0.45)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + r * 0.6, y - r * 0.55)
  ctx.lineTo(x + r * 0.1, y - r * 0.45)
  ctx.stroke()

  // 嘴巴
  ctx.fillStyle = '#FF8F00'
  ctx.beginPath()
  ctx.moveTo(x + r * 0.6, y)
  ctx.lineTo(x + r * 1.1, y + r * 0.15)
  ctx.lineTo(x + r * 0.6, y + r * 0.35)
  ctx.closePath()
  ctx.fill()
}

function drawYellowBirdFeatures(x, y, r) {
  // 眼白
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.ellipse(x - r * 0.15, y - r * 0.1, r * 0.28, r * 0.32, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x + r * 0.35, y - r * 0.1, r * 0.28, r * 0.32, 0, 0, Math.PI * 2)
  ctx.fill()

  // 瞳孔
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  ctx.arc(x - r * 0.1, y - r * 0.1, r * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + r * 0.4, y - r * 0.1, r * 0.12, 0, Math.PI * 2)
  ctx.fill()

  // 头顶羽毛
  ctx.fillStyle = '#FFC107'
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x - r * 0.15, y - r * 1.4)
  ctx.lineTo(x + r * 0.15, y - r * 1.1)
  ctx.closePath()
  ctx.fill()

  // 嘴巴
  ctx.fillStyle = '#FF6F00'
  ctx.beginPath()
  ctx.moveTo(x + r * 0.65, y)
  ctx.lineTo(x + r * 1.2, y + r * 0.1)
  ctx.lineTo(x + r * 0.65, y + r * 0.25)
  ctx.closePath()
  ctx.fill()
}

function drawBlackBirdFeatures(x, y, r) {
  // 眼白
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.ellipse(x - r * 0.2, y - r * 0.1, r * 0.25, r * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x + r * 0.2, y - r * 0.1, r * 0.25, r * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()

  // 瞳孔
  ctx.fillStyle = '#E53935'
  ctx.beginPath()
  ctx.arc(x - r * 0.15, y - r * 0.1, r * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + r * 0.25, y - r * 0.1, r * 0.12, 0, Math.PI * 2)
  ctx.fill()

  // 怒眉
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x - r * 0.55, y - r * 0.5)
  ctx.lineTo(x - r * 0.05, y - r * 0.4)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + r * 0.55, y - r * 0.5)
  ctx.lineTo(x + r * 0.05, y - r * 0.4)
  ctx.stroke()

  // 炸弹引线
  ctx.strokeStyle = '#757575'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.quadraticCurveTo(x + r * 0.3, y - r * 1.3, x + r * 0.1, y - r * 1.5)
  ctx.stroke()

  // 火花
  ctx.fillStyle = '#FF9800'
  ctx.beginPath()
  ctx.arc(x + r * 0.1, y - r * 1.5, 3, 0, Math.PI * 2)
  ctx.fill()
}

function drawPig(pig) {
  if (!ctx || !pig.active) return

  ctx.save()

  // 小猪阴影
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(pig.x + 3, pig.y + pig.radius + 2, pig.radius * 0.8, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // 受击闪白
  if (pig.hitFlash > 0) {
    ctx.globalAlpha = pig.hitFlash
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.arc(pig.x, pig.y, pig.radius + 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // 小猪身体
  const bodyGrad = ctx.createRadialGradient(
    pig.x - pig.radius * 0.3, pig.y - pig.radius * 0.3, 0,
    pig.x, pig.y, pig.radius
  )
  bodyGrad.addColorStop(0, '#81C784')
  bodyGrad.addColorStop(1, '#4CAF50')
  ctx.fillStyle = bodyGrad
  ctx.beginPath()
  ctx.arc(pig.x, pig.y, pig.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#388E3C'
  ctx.lineWidth = 2
  ctx.stroke()

  const r = pig.radius

  // 耳朵
  ctx.fillStyle = '#66BB6A'
  ctx.beginPath()
  ctx.ellipse(pig.x - r * 0.8, pig.y - r * 0.6, r * 0.25, r * 0.35, -0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(pig.x + r * 0.8, pig.y - r * 0.6, r * 0.25, r * 0.35, 0.3, 0, Math.PI * 2)
  ctx.fill()

  // 眼白
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.ellipse(pig.x - r * 0.3, pig.y - r * 0.15, r * 0.25, r * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(pig.x + r * 0.3, pig.y - r * 0.15, r * 0.25, r * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()

  // 瞳孔
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  ctx.arc(pig.x - r * 0.25, pig.y - r * 0.15, r * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(pig.x + r * 0.35, pig.y - r * 0.15, r * 0.12, 0, Math.PI * 2)
  ctx.fill()

  // 鼻子
  ctx.fillStyle = '#66BB6A'
  ctx.beginPath()
  ctx.ellipse(pig.x, pig.y + r * 0.25, r * 0.35, r * 0.25, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#4CAF50'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 鼻孔
  ctx.fillStyle = '#388E3C'
  ctx.beginPath()
  ctx.ellipse(pig.x - r * 0.12, pig.y + r * 0.25, r * 0.08, r * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(pig.x + r * 0.12, pig.y + r * 0.25, r * 0.08, r * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()

  // 血条
  if (pig.health < pig.maxHealth) {
    const barW = r * 2
    const barH = 5
    const barX = pig.x - barW / 2
    const barY = pig.y - r - 12

    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2)

    const healthPct = pig.health / pig.maxHealth
    const barColor = healthPct > 0.6 ? '#4CAF50' : healthPct > 0.3 ? '#FF9800' : '#F44336'
    ctx.fillStyle = barColor
    ctx.fillRect(barX, barY, barW * healthPct, barH)
  }

  ctx.restore()
}

function drawBlock(block) {
  if (!ctx || !block.active) return

  ctx.save()

  const colors = getBlockColor(block.type)
  const healthPct = block.health / block.maxHealth

  // 方块阴影
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.fillRect(block.x + 3, block.y + 3, block.w, block.h)

  // 方块主体
  const blockGrad = ctx.createLinearGradient(block.x, block.y, block.x + block.w, block.y + block.h)
  blockGrad.addColorStop(0, healthPct > 0.5 ? colors.fill : colors.damaged)
  blockGrad.addColorStop(1, healthPct > 0.5 ? colors.stroke : colors.fill)
  ctx.fillStyle = blockGrad
  ctx.fillRect(block.x, block.y, block.w, block.h)

  // 方块边框
  ctx.strokeStyle = colors.stroke
  ctx.lineWidth = 2
  ctx.strokeRect(block.x, block.y, block.w, block.h)

  // 木纹效果
  if (block.type === 'wood') {
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i < block.h; i += 8) {
      ctx.beginPath()
      ctx.moveTo(block.x + 2, block.y + i)
      ctx.lineTo(block.x + block.w - 2, block.y + i)
      ctx.stroke()
    }
  }

  // 裂痕效果
  if (healthPct < 0.5) {
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(block.x + block.w * 0.3, block.y)
    ctx.lineTo(block.x + block.w * 0.5, block.y + block.h * 0.5)
    ctx.lineTo(block.x + block.w * 0.7, block.y + block.h)
    ctx.stroke()
  }

  ctx.restore()
}

function drawTrajectory() {
  if (!ctx || !isDragging) return

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  trajectoryPoints.forEach((p, i) => {
    const alpha = 1 - (i / trajectoryPoints.length) * 0.7
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

function drawParticles() {
  if (!ctx) return

  particles.forEach(p => {
    ctx.globalAlpha = p.life
    ctx.fillStyle = p.color
    if (p.type === 'star') {
      drawStar(p.x, p.y, p.size)
    } else {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  ctx.globalAlpha = 1
}

function drawStar(x, y, size) {
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
    const px = x + Math.cos(angle) * size
    const py = y + Math.sin(angle) * size
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

// ============ 粒子效果 ============
function createParticles(x, y, color, count = 10, type = 'circle') {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10 - 3,
      size: Math.random() * 5 + 2,
      color,
      life: 1,
      decay: Math.random() * 0.02 + 0.015,
      type,
    })
  }
}

function createExplosion(x, y, radius = 80) {
  // 爆炸视觉效果
  for (let i = 0; i < 30; i++) {
    const angle = (Math.PI * 2 * i) / 30
    const speed = Math.random() * 8 + 2
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 6 + 3,
      color: ['#FF5722', '#FF9800', '#FFC107', '#FFEB3B'][Math.floor(Math.random() * 4)],
      life: 1,
      decay: Math.random() * 0.02 + 0.01,
      type: 'circle',
    })
  }

  // 爆炸冲击波 - 影响附近的小猪和方块
  pigs.forEach(pig => {
    if (!pig.active) return
    const dx = pig.x - x
    const dy = pig.y - y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < radius) {
      const damage = (1 - dist / radius) * 100
      pig.health -= damage
      pig.hitFlash = 1
      if (pig.health <= 0) {
        pig.active = false
        score.value += 1000
        createParticles(pig.x, pig.y, '#4CAF50', 20, 'star')
        playSound('destroy')
      }
    }
  })

  blocks.forEach(block => {
    if (!block.active) return
    const cx = block.x + block.w / 2
    const cy = block.y + block.h / 2
    const dx = cx - x
    const dy = cy - y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < radius) {
      const damage = (1 - dist / radius) * 80
      block.health -= damage
      if (block.health <= 0) {
        block.active = false
        score.value += 200
        createParticles(cx, cy, getBlockColor(block.type).fill, 10)
      }
    }
  })
}

// ============ 物理更新 ============
function update() {
  frameCount++

  // 更新小鸟
  birds.forEach(bird => {
    if (bird.launched && bird.active) {
      bird.vx *= FRICTION
      bird.vy *= FRICTION
      bird.vy += GRAVITY
      bird.x += bird.vx
      bird.y += bird.vy

      // 地面碰撞
      if (bird.y + bird.radius > GROUND_Y) {
        bird.y = GROUND_Y - bird.radius
        bird.vy *= -BOUNCE
        bird.vx *= 0.8
        if (Math.abs(bird.vy) < 1) bird.vy = 0
      }

      // 边界检测
      if (bird.x < -50 || bird.x > canvasWidth + 50 || bird.y < -100) {
        bird.active = false
      }

      // 检测与小猪的碰撞
      pigs.forEach(pig => {
        if (!pig.active) return
        if (checkCircleCollision(bird, pig)) {
          const impact = Math.sqrt(bird.vx * bird.vx + bird.vy * bird.vy)
          pig.health -= impact * 8
          pig.hitFlash = 1
          createParticles(
            (bird.x + pig.x) / 2,
            (bird.y + pig.y) / 2,
            '#4CAF50',
            5
          )

          if (pig.health <= 0) {
            pig.active = false
            score.value += 1000
            createParticles(pig.x, pig.y, '#4CAF50', 20, 'star')
            playSound('destroy')
          } else {
            playSound('hit')
          }

          // 反弹
          const dx = bird.x - pig.x
          const dy = bird.y - pig.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 0) {
            bird.vx = (dx / dist) * impact * 0.3
            bird.vy = (dy / dist) * impact * 0.3
          }
        }
      })

      // 检测与方块的碰撞
      blocks.forEach(block => {
        if (!block.active) return
        if (checkRectCircleCollision(block, bird)) {
          const impact = Math.sqrt(bird.vx * bird.vx + bird.vy * bird.vy)
          block.health -= impact * 5
          createParticles(
            block.x + block.w / 2,
            block.y + block.h / 2,
            getBlockColor(block.type).fill,
            5
          )

          if (block.health <= 0) {
            block.active = false
            score.value += 200
            createParticles(
              block.x + block.w / 2,
              block.y + block.h / 2,
              getBlockColor(block.type).fill,
              15
            )
            playSound('hit')
          }

          // 简单反弹
          bird.vx *= -0.4
          bird.vy *= -0.4
        }
      })

      // 黑色小鸟特殊能力 - 着地爆炸
      if (bird.type === 'black' && bird.y >= GROUND_Y - bird.radius - 1 && Math.abs(bird.vy) < 2) {
        createExplosion(bird.x, bird.y, 100)
        bird.active = false
        playSound('destroy')
      }

      // 速度过慢时停止
      const speed = Math.sqrt(bird.vx * bird.vx + bird.vy * bird.vy)
      if (speed < 0.5 && bird.y >= GROUND_Y - bird.radius - 5) {
        bird.active = false
      }
    }
  })

  // 更新小猪
  pigs.forEach(pig => {
    if (pig.hitFlash > 0) {
      pig.hitFlash -= 0.05
    }
  })

  // 更新粒子
  particles = particles.filter(p => {
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.15
    p.vx *= 0.98
    p.life -= p.decay
    p.size *= 0.99
    return p.life > 0
  })

  // 检查游戏状态
  if (gameState.value === 'playing') {
    const activePigs = pigs.filter(p => p.active).length
    const allBirdsUsed = birds.every(b => b.used || (!b.active && b.launched))
    const allBirdsStopped = birds.every(b => !b.active || (!b.active && b.launched))

    if (activePigs === 0) {
      gameState.value = 'win'
      calculateStars()
      playSound('win')
    } else if (allBirdsUsed && allBirdsStopped && activePigs > 0) {
      // 等待一小段时间再判定失败，让最后一个小鸟飞完
      setTimeout(() => {
        if (gameState.value === 'playing' && pigs.some(p => p.active)) {
          gameState.value = 'lose'
        }
      }, 1000)
    }
  }

  // 更新剩余小鸟数
  birdsLeft.value = birds.filter(b => !b.used && !b.launched).length
}

function calculateStars() {
  const level = levels[currentLevel.value]
  const thresholds = level.starThresholds
  if (score.value >= thresholds[2]) starsEarned.value = 3
  else if (score.value >= thresholds[1]) starsEarned.value = 2
  else starsEarned.value = 1

  // 记录最高星级
  if (starsEarned.value > (levelStars.value[currentLevel.value] || 0)) {
    levelStars.value[currentLevel.value] = starsEarned.value
  }
}

// ============ 碰撞检测 ============
function checkCircleCollision(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy) < a.radius + b.radius
}

function checkRectCircleCollision(rect, circle) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w))
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h))
  const dx = circle.x - closestX
  const dy = circle.y - closestY
  return (dx * dx + dy * dy) < (circle.radius * circle.radius)
}

// ============ 鼠标事件 ============
function onMouseDown(e) {
  if (gameState.value !== 'playing') return
  initAudio()

  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasWidth / rect.width
  const scaleY = canvasHeight / rect.height
  const mouseX = (e.clientX - rect.left) * scaleX
  const mouseY = (e.clientY - rect.top) * scaleY

  if (currentBird && !currentBird.launched) {
    const dx = mouseX - currentBird.x
    const dy = mouseY - currentBird.y
    if (Math.sqrt(dx * dx + dy * dy) < 40) {
      isDragging = true
      isAiming = true
    }
  }
}

function onMouseMove(e) {
  if (!isDragging || gameState.value !== 'playing' || !currentBird) return

  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasWidth / rect.width
  const scaleY = canvasHeight / rect.height
  const mouseX = (e.clientX - rect.left) * scaleX
  const mouseY = (e.clientY - rect.top) * scaleY

  const dx = mouseX - SLING_X
  const dy = mouseY - SLING_Y
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance > MAX_DRAG) {
    currentBird.x = SLING_X + (dx / distance) * MAX_DRAG
    currentBird.y = SLING_Y + (dy / distance) * MAX_DRAG
  } else {
    currentBird.x = mouseX
    currentBird.y = mouseY
  }

  // 计算预测轨迹
  updateTrajectoryPreview()
}

function updateTrajectoryPreview() {
  if (!currentBird) return

  trajectoryPoints = []
  const dx = SLING_X - currentBird.x
  const dy = SLING_Y - currentBird.y
  let vx = dx * LAUNCH_POWER
  let vy = dy * LAUNCH_POWER
  let x = currentBird.x
  let y = currentBird.y

  for (let i = 0; i < 30; i++) {
    vx *= FRICTION
    vy *= FRICTION
    vy += GRAVITY
    x += vx
    y += vy
    if (y > GROUND_Y) break
    if (i % 2 === 0) {
      trajectoryPoints.push({ x, y })
    }
  }
}

function onMouseUp() {
  if (!isDragging || gameState.value !== 'playing') return

  isDragging = false
  isAiming = false

  if (currentBird && !currentBird.launched) {
    const dx = SLING_X - currentBird.x
    const dy = SLING_Y - currentBird.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 15) {
      // 黄色小鸟加速
      let power = LAUNCH_POWER
      if (currentBird.type === 'yellow') {
        power *= 1.4
      }

      currentBird.vx = dx * power
      currentBird.vy = dy * power
      currentBird.launched = true
      currentBird.active = true
      currentBird.used = true
      trajectoryPoints = []

      playSound('launch')

      // 黄色小鸟特殊能力 - 中途加速
      if (currentBird.type === 'yellow') {
        setTimeout(() => {
          if (currentBird && currentBird.active) {
            const speed = Math.sqrt(currentBird.vx * currentBird.vx + currentBird.vy * currentBird.vy)
            if (speed > 0) {
              const angle = Math.atan2(currentBird.vy, currentBird.vx)
              currentBird.vx = Math.cos(angle) * speed * 2
              currentBird.vy = Math.sin(angle) * speed * 2
              createParticles(currentBird.x, currentBird.y, '#FFD700', 8)
            }
          }
        }, 500)
      }

      // 切换到下一只小鸟
      const currentIndex = birds.indexOf(currentBird)
      const nextBird = birds.find((b, i) => i > currentIndex && !b.used)
      if (nextBird) {
        setTimeout(() => {
          currentBird = nextBird
          currentBird.x = SLING_X
          currentBird.y = SLING_Y
        }, 300)
      } else {
        currentBird = null
      }
    } else {
      // 拖拽距离太短，回到原位
      currentBird.x = SLING_X
      currentBird.y = SLING_Y
    }
  }
}

// ============ 渲染循环 ============
function render() {
  if (!ctx) return

  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  drawBackground()
  drawTrajectory()

  // 绘制方块
  blocks.forEach(drawBlock)

  // 绘制小猪
  pigs.forEach(drawPig)

  // 绘制弹弓后半部分
  drawSlingshot()

  // 绘制小鸟
  birds.forEach(b => {
    if (b.active || !b.launched) drawBird(b)
  })

  // 绘制等待的小鸟队列
  birds.filter(b => !b.used && !b.launched && b !== currentBird).forEach((b, i) => {
    ctx.globalAlpha = 0.7
    drawBird({
      ...b,
      x: SLING_X - 45 * (i + 1),
      y: GROUND_Y - 18,
    })
    ctx.globalAlpha = 1
  })

  drawParticles()

  // 绘制瞄准线
  if (isDragging && currentBird) {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(currentBird.x, currentBird.y)
    const dx = SLING_X - currentBird.x
    const dy = SLING_Y - currentBird.y
    ctx.lineTo(currentBird.x - dx * 3, currentBird.y - dy * 3)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

function gameLoop() {
  update()
  render()
  animationId = requestAnimationFrame(gameLoop)
}

// ============ 工具函数 ============
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + percent)
  const g = Math.min(255, ((num >> 8) & 0x00FF) + percent)
  const b = Math.min(255, (num & 0x0000FF) + percent)
  return `rgb(${r},${g},${b})`
}

// ============ 游戏控制 ============
function resetGame() {
  if (animationId) cancelAnimationFrame(animationId)
  showLevelSelect.value = false
  initGame()
  gameLoop()
}

function nextLevel() {
  if (currentLevel.value < 3) {
    currentLevel.value++
    resetGame()
  }
}

function prevLevel() {
  if (currentLevel.value > 1) {
    currentLevel.value--
    resetGame()
  }
}

function selectLevel(level) {
  currentLevel.value = level
  showLevelSelect.value = false
  resetGame()
}

// ============ 生命周期 ============
onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
    initGame()
    gameLoop()
  }
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
})
</script>

<style scoped lang="scss">
.angry-birds-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 12px;
  min-height: 650px;
}

.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-right {
  display: flex;
  gap: 8px;
}

.game-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;

  .el-icon {
    color: #FFD700;
    font-size: 18px;
  }

  .label {
    color: #8e8ea0;
    font-size: 14px;
  }

  .value {
    color: #FFD700;
    font-size: 22px;
    font-weight: 700;
    font-family: 'Orbitron', monospace;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }

  &.birds-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
}

.birds-icons {
  display: flex;
  gap: 4px;

  .bird-icon {
    font-size: 20px;
    animation: bounce 0.5s ease infinite;

    &:nth-child(2) { animation-delay: 0.1s; }
    &:nth-child(3) { animation-delay: 0.2s; }
    &:nth-child(4) { animation-delay: 0.3s; }
  }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.game-container {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 520px;

  canvas {
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 0 2px rgba(255, 255, 255, 0.1);
    cursor: crosshair;
    max-width: 100%;
    height: auto;
  }
}

.game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 12px;
  backdrop-filter: blur(5px);
}

.overlay-content {
  text-align: center;
  padding: 40px 60px;
  background: linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(22, 33, 62, 0.95));
  border-radius: 20px;
  border: 2px solid rgba(255, 215, 0, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);

  h2 {
    color: #FFD700;
    font-size: 36px;
    margin: 16px 0;
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  }

  .score-text {
    color: #fff;
    font-size: 20px;
    margin: 12px 0 24px;
  }
}

.stars-display {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 8px;

  .star {
    font-size: 40px;
    opacity: 0.3;
    transition: all 0.3s ease;

    &.active {
      opacity: 1;
      transform: scale(1.2);
      filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));
    }
  }
}

.overlay-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.level-select {
  min-width: 400px;

  h2 {
    margin-bottom: 24px;
  }
}

.level-grid {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 30px;
}

.level-card {
  width: 100px;
  height: 120px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-5px);
  }

  &.current {
    border-color: #FFD700;
    background: rgba(255, 215, 0, 0.2);
  }

  .level-num {
    font-size: 36px;
    font-weight: 700;
    color: #FFD700;
    font-family: 'Orbitron', monospace;
  }

  .level-stars {
    display: flex;
    gap: 4px;

    .star {
      font-size: 16px;
      opacity: 0.3;

      &.active {
        opacity: 1;
      }
    }
  }
}

.game-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.tips {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #8e8ea0;
  font-size: 13px;

  .el-icon {
    color: #64B5F6;
  }
}

.level-buttons {
  display: flex;
  gap: 8px;
}

// 过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
