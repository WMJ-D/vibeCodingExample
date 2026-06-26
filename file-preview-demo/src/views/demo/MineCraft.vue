<template>
  <div class="minecraft-page">
    <!-- 顶部信息栏 -->
    <div class="game-header">
      <div class="header-left">
        <div class="game-info">
          <el-icon><Aim /></el-icon>
          <span class="label">指向</span>
          <span class="value">{{ hoverInfo }}</span>
        </div>
        <div class="game-info">
          <el-icon><Box /></el-icon>
          <span class="label">方块数</span>
          <span class="value">{{ blockCount }}</span>
        </div>
        <div class="game-info">
          <span class="label">手持</span>
          <span class="value">{{ modeText }}</span>
        </div>
      </div>
      <div class="header-right">
        <span class="tip">左键挖掘 · 右键放置 · WASD 平移 · 数字键 1-6 切换</span>
        <el-button type="primary" @click="regenerate">
          <el-icon><Refresh /></el-icon>&nbsp;重新生成世界
        </el-button>
      </div>
    </div>

    <!-- 游戏画布 -->
    <div class="game-container" ref="containerRef">
      <canvas
        ref="canvasRef"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseleave="onMouseLeave"
        @contextmenu.prevent
      ></canvas>
    </div>

    <!-- 物品栏 -->
    <div class="hotbar">
      <div
        v-for="b in placeableBlocks"
        :key="b.id"
        :class="['hotbar-slot', { active: selected === b.id }]"
        @click="selected = b.id"
      >
        <span class="slot-key">{{ b.key }}</span>
        <span class="slot-swatch" :style="{ background: b.swatch }"></span>
        <span class="slot-name">{{ b.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 等距方块尺寸
const TILE_W = 36
const TILE_H = 18
const BLOCK_H = 18
const HW = TILE_W / 2
const HH = TILE_H / 2
const SIZE = 16
const WORLD_H = 12

// 方块定义：top/right/left 三个可见面颜色
const BLOCKS = {
  1: { name: '草地', top: '#7cb342', right: '#6d4c41', left: '#4e342e' },
  2: { name: '泥土', top: '#a1887f', right: '#795548', left: '#5d4037' },
  3: { name: '石头', top: '#bdbdbd', right: '#9e9e9e', left: '#757575' },
  4: { name: '木头', top: '#bf8a4d', right: '#5d4037', left: '#3e2723' },
  5: { name: '树叶', top: '#7cb342', right: '#558b2f', left: '#33691e' },
  6: { name: '沙子', top: '#fff59d', right: '#f9a825', left: '#f57f17' },
}

const placeableBlocks = [
  { id: 1, key: '1', name: '草地', swatch: 'linear-gradient(135deg,#7cb342,#6d4c41 60%,#4e342e)' },
  { id: 2, key: '2', name: '泥土', swatch: 'linear-gradient(135deg,#a1887f,#795548 60%,#5d4037)' },
  { id: 3, key: '3', name: '石头', swatch: 'linear-gradient(135deg,#bdbdbd,#9e9e9e 60%,#757575)' },
  { id: 4, key: '4', name: '木头', swatch: 'linear-gradient(135deg,#bf8a4d,#5d4037 60%,#3e2723)' },
  { id: 5, key: '5', name: '树叶', swatch: 'linear-gradient(135deg,#7cb342,#558b2f 60%,#33691e)' },
  { id: 6, key: '6', name: '沙子', swatch: 'linear-gradient(135deg,#fff59d,#f9a825 60%,#f57f17)' },
]

const containerRef = ref(null)
const canvasRef = ref(null)
let ctx = null
let dpr = 1

const world = ref([])
const camera = ref({ x: 0, y: -20 })
const selected = ref(1)
const hover = ref(null)
const blockCount = ref(0)

let mouseX = -1
let mouseY = -1
const faces = [] // 当前帧绘制的面列表，用于拾取
let raf = 0
const keys = {}
let seed = 12345

const hoverInfo = computed(() => {
  const f = hover.value
  if (!f) return '—'
  const b = BLOCKS[get(f.x, f.y, f.z)]
  return `${b ? b.name : '?'} (${f.x}, ${f.y}, ${f.z})`
})
const modeText = computed(() => BLOCKS[selected.value]?.name || '—')

// 伪随机
function mulberry32(s) {
  return function () {
    s |= 0; s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
let rand = mulberry32(seed)

// 值噪声
function makeNoise(rng) {
  const grid = {}
  const val = (ix, iz) => {
    const k = ix + ',' + iz
    if (!(k in grid)) grid[k] = rng()
    return grid[k]
  }
  const smooth = t => t * t * (3 - 2 * t)
  return (x, z) => {
    const x0 = Math.floor(x), x1 = x0 + 1
    const z0 = Math.floor(z), z1 = z0 + 1
    const fx = x - x0, fz = z - z0
    const v00 = val(x0, z0), v10 = val(x1, z0)
    const v01 = val(x0, z1), v11 = val(x1, z1)
    const sx = smooth(fx), sz = smooth(fz)
    return v00 * (1 - sx) * (1 - sz) + v10 * sx * (1 - sz) + v01 * (1 - sx) * sz + v11 * sx * sz
  }
}
let noise = makeNoise(rand)

function get(x, y, z) {
  if (x < 0 || x >= SIZE || z < 0 || z >= SIZE || y < 0 || y >= WORLD_H) return 0
  return world.value[x][z][y] || 0
}
function set(x, y, z, v) {
  if (x < 0 || x >= SIZE || z < 0 || z >= SIZE || y < 0 || y >= WORLD_H) return
  world.value[x][z][y] = v
}

function plantTree(w, x, y, z) {
  for (let i = 0; i < 4; i++) {
    if (y + i < WORLD_H) w[x][z][y + i] = 4
  }
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dy = 0; dy < 2; dy++) {
        const nx = x + dx, nz = z + dz, ny = y + 3 + dy
        if (nx >= 0 && nx < SIZE && nz >= 0 && nz < SIZE && ny < WORLD_H) {
          if (Math.abs(dx) + Math.abs(dz) + dy <= 3 && !w[nx][nz][ny]) {
            w[nx][nz][ny] = 5
          }
        }
      }
    }
  }
  if (y + 5 < WORLD_H) w[x][z][y + 5] = 5
}

function generateWorld() {
  const w = []
  for (let x = 0; x < SIZE; x++) {
    w[x] = []
    for (let z = 0; z < SIZE; z++) {
      w[x][z] = []
      const h = Math.floor(2 + noise(x * 0.18, z * 0.18) * 5) // 高度 2-6
      for (let y = 0; y < WORLD_H; y++) {
        if (y === 0) w[x][z][y] = 3 // 底层石头
        else if (y < h - 2) w[x][z][y] = 3
        else if (y < h) w[x][z][y] = 2
        else if (y === h) w[x][z][y] = 1
        else w[x][z][y] = 0
      }
    }
  }
  // 随机种树
  for (let i = 0; i < 10; i++) {
    const x = 2 + Math.floor(rand() * (SIZE - 4))
    const z = 2 + Math.floor(rand() * (SIZE - 4))
    for (let y = WORLD_H - 1; y >= 0; y--) {
      if (w[x][z][y] === 1) {
        if (y + 5 < WORLD_H) plantTree(w, x, y + 1, z)
        break
      }
    }
  }
  return w
}

function regenerate() {
  seed = (Math.random() * 1e9) | 0
  rand = mulberry32(seed)
  noise = makeNoise(rand)
  world.value = generateWorld()
  camera.value = { x: 0, y: -20 }
  updateCount()
  render()
}

function updateCount() {
  let n = 0
  const w = world.value
  for (let x = 0; x < SIZE; x++)
    for (let z = 0; z < SIZE; z++)
      for (let y = 0; y < WORLD_H; y++) if (w[x][z][y]) n++
  blockCount.value = n
}

// 等距投影
function proj(x, y, z, ox, oy) {
  return [(x - z) * HW + ox, (x + z) * HH - y * BLOCK_H + oy]
}

function drawPoly(pts, fill, stroke) {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.closePath()
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke() }
}

function inPoly(px, py, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function render() {
  if (!ctx) return
  const cv = canvasRef.value
  const cw = cv.width / dpr
  const ch = cv.height / dpr
  // 天空渐变背景
  const grad = ctx.createLinearGradient(0, 0, 0, ch)
  grad.addColorStop(0, '#0d1b2a')
  grad.addColorStop(1, '#1b3a4b')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, cw, ch)

  faces.length = 0
  const ox = cw / 2 + camera.value.x
  const oy = ch / 2 + camera.value.y

  // 收集至少有一个可见面暴露的方块
  const list = []
  const w = world.value
  for (let x = 0; x < SIZE; x++) {
    for (let z = 0; z < SIZE; z++) {
      for (let y = 0; y < WORLD_H; y++) {
        const b = w[x][z][y]
        if (!b) continue
        if (!get(x, y + 1, z) || !get(x + 1, y, z) || !get(x, y, z + 1)) {
          list.push({ x, y, z, b })
        }
      }
    }
  }
  // 画家算法排序：远 -> 近
  list.sort((a, b) => a.x + a.z - (b.x + b.z) || a.y - b.y || a.x - b.x)

  for (const f of list) {
    drawBlock(f.x, f.y, f.z, f.b, ox, oy)
  }

  // 拾取高亮
  const h = pick(mouseX, mouseY)
  hover.value = h
  if (h) drawHover(h)
}

function drawBlock(x, y, z, b, ox, oy) {
  const def = BLOCKS[b]
  const p = (px, py, pz) => proj(px, py, pz, ox, oy)
  // 顶面 (y+1)
  if (!get(x, y + 1, z)) {
    const a = p(x, y + 1, z), c1 = p(x + 1, y + 1, z), c2 = p(x + 1, y + 1, z + 1), d = p(x, y + 1, z + 1)
    drawPoly([a, c1, c2, d], def.top, 'rgba(0,0,0,0.12)')
    faces.push({ poly: [a, c1, c2, d], x, y, z, face: 'top' })
  }
  // 右面 (+x)
  if (!get(x + 1, y, z)) {
    const a = p(x + 1, y, z), c1 = p(x + 1, y + 1, z), c2 = p(x + 1, y + 1, z + 1), d = p(x + 1, y, z + 1)
    drawPoly([a, c1, c2, d], def.right, 'rgba(0,0,0,0.12)')
    faces.push({ poly: [a, c1, c2, d], x, y, z, face: 'right' })
  }
  // 左面 (+z)
  if (!get(x, y, z + 1)) {
    const a = p(x, y, z + 1), c1 = p(x, y + 1, z + 1), c2 = p(x + 1, y + 1, z + 1), d = p(x + 1, y, z + 1)
    drawPoly([a, c1, c2, d], def.left, 'rgba(0,0,0,0.12)')
    faces.push({ poly: [a, c1, c2, d], x, y, z, face: 'left' })
  }
}

function drawHover(f) {
  ctx.beginPath()
  ctx.moveTo(f.poly[0][0], f.poly[0][1])
  for (let i = 1; i < f.poly.length; i++) ctx.lineTo(f.poly[i][0], f.poly[i][1])
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.stroke()
}

function pick(mx, my) {
  for (let i = faces.length - 1; i >= 0; i--) {
    if (inPoly(mx, my, faces[i].poly)) return faces[i]
  }
  return null
}

function neighbor(f) {
  if (f.face === 'top') return { x: f.x, y: f.y + 1, z: f.z }
  if (f.face === 'right') return { x: f.x + 1, y: f.y, z: f.z }
  if (f.face === 'left') return { x: f.x, y: f.y, z: f.z + 1 }
  return null
}
function inBounds(p) {
  return p && p.x >= 0 && p.x < SIZE && p.y >= 0 && p.y < WORLD_H && p.z >= 0 && p.z < SIZE
}

function onMouseMove(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  mouseX = e.clientX - rect.left
  mouseY = e.clientY - rect.top
  render()
}
function onMouseLeave() {
  mouseX = -1
  mouseY = -1
  hover.value = null
  render()
}
function onMouseDown(e) {
  const f = pick(mouseX, mouseY)
  if (!f) return
  if (e.button === 0) {
    // 左键挖掘
    set(f.x, f.y, f.z, 0)
  } else if (e.button === 2) {
    // 右键放置
    const p = neighbor(f)
    if (inBounds(p) && !get(p.x, p.y, p.z)) {
      set(p.x, p.y, p.z, selected.value)
    }
  }
  updateCount()
  render()
}

function onKeyDown(e) {
  keys[e.key.toLowerCase()] = true
  if (e.key >= '1' && e.key <= '6') selected.value = Number(e.key)
}
function onKeyUp(e) {
  keys[e.key.toLowerCase()] = false
}

function loop() {
  const sp = 7
  let moved = false
  if (keys['w'] || keys['arrowup']) { camera.value.y += sp; moved = true }
  if (keys['s'] || keys['arrowdown']) { camera.value.y -= sp; moved = true }
  if (keys['a'] || keys['arrowleft']) { camera.value.x += sp; moved = true }
  if (keys['d'] || keys['arrowright']) { camera.value.x -= sp; moved = true }
  if (moved) render()
  raf = requestAnimationFrame(loop)
}

function resize() {
  const cont = containerRef.value
  if (!cont) return
  const w = cont.clientWidth
  const h = cont.clientHeight
  dpr = window.devicePixelRatio || 1
  const cv = canvasRef.value
  cv.width = Math.max(1, Math.floor(w * dpr))
  cv.height = Math.max(1, Math.floor(h * dpr))
  cv.style.width = w + 'px'
  cv.style.height = h + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  render()
}

onMounted(() => {
  ctx = canvasRef.value.getContext('2d')
  world.value = generateWorld()
  updateCount()
  resize()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('resize', resize)
  raf = requestAnimationFrame(loop)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('resize', resize)
})
</script>

<style scoped lang="scss">
.minecraft-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: calc(100vh - 90px);
  background: #07120c;
  color: #d7ffe7;
}
.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #0d1c13;
  border: 1px solid #173f2a;
  border-radius: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
}
.header-left {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}
.game-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  .label { color: #93b89f; }
  .value { color: #2ee68a; font-weight: 600; }
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  .tip { color: #6f9a7e; font-size: 12px; }
}
.game-container {
  flex: 1;
  position: relative;
  background: #0a1410;
  border: 1px solid #173f2a;
  border-radius: 8px;
  overflow: hidden;
  min-height: 360px;
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}
.hotbar {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  margin-top: 10px;
  background: #0d1c13;
  border: 1px solid #173f2a;
  border-radius: 8px;
  flex-wrap: wrap;
}
.hotbar-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  border: 2px solid #173f2a;
  border-radius: 6px;
  cursor: pointer;
  min-width: 64px;
  transition: all 0.15s;
  background: #07120c;
  &:hover { border-color: #1f8f58; }
  &.active {
    border-color: #2ee68a;
    box-shadow: 0 0 10px rgba(46, 230, 138, 0.4);
  }
}
.slot-key {
  font-size: 11px;
  color: #6f9a7e;
  align-self: flex-start;
}
.slot-swatch {
  width: 34px;
  height: 34px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.4);
  box-shadow: inset 0 -4px 8px rgba(0, 0, 0, 0.3);
}
.slot-name {
  font-size: 12px;
  color: #d7ffe7;
}
</style>
