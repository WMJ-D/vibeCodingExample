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
          <span class="label">已加载</span>
          <span class="value">{{ loadedChunks }} 区块</span>
        </div>
        <div class="game-info">
          <span class="label">群系</span>
          <span class="value">{{ biomeText }}</span>
        </div>
        <div class="game-info">
          <span class="label">坐标</span>
          <span class="value">{{ playerPos }}</span>
        </div>
      </div>
      <div class="header-right">
        <span class="tip">点击锁定 · WASD 移动 · 空格跳跃 · 长按左键挖 · 右键放 · 1-9 切换</span>
        <el-button type="primary" @click="resetPlayer">
          <el-icon><Refresh /></el-icon>&nbsp;回到原点
        </el-button>
      </div>
    </div>

    <!-- 游戏画布 -->
    <div class="game-container" ref="containerRef">
      <canvas ref="canvasRef" @click="onCanvasClick" @mousedown="onMouseDown" @mouseup="onMouseUp" @contextmenu.prevent></canvas>
      <div class="crosshair" v-show="isLocked">
        <span class="ch-h"></span><span class="ch-v"></span>
      </div>
      <div class="mine-progress" v-show="miningProgress > 0">
        <div class="mine-bar" :style="{ width: (miningProgress * 100) + '%' }"></div>
      </div>
      <div class="lock-overlay" v-show="!isLocked" @click="lockPointer">
        <div class="lock-card">
          <el-icon :size="42"><Aim /></el-icon>
          <div class="lock-title">点击进入第一人称视角</div>
          <div class="lock-tip">无限世界 · ESC 退出</div>
        </div>
      </div>
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
import * as THREE from 'three'

// ===== 渲染常量 =====
const CHUNK_SIZE = 8                 // 每个区块 8x8（更细粒度，加载更精准）
const RENDER_RADIUS = 2              // 玩家周围渲染半径（区块数）
const WORLD_H = 24                   // 世界最大高度
const PLAYER_HALF = 0.3
const EYE_HEIGHT = 1.6
const GRAVITY = 26
const JUMP_SPEED = 8.2
const MOVE_SPEED = 4.8
const MINE_TIME = 0.55
const SEA_LEVEL = 6                  // 海平面

// ===== 方块定义 =====
// type: solid / fence / glass_thin / glass_thick / water(液体，无碰撞)
const BLOCKS = {
  1:  { name: '草地',  color: 0x7cb342, side: 0x8d6e63, type: 'solid',       hardness: 0.5, seed: 11 },
  2:  { name: '泥土',  color: 0xa1887f, side: 0x795548, type: 'solid',       hardness: 0.5, seed: 22 },
  3:  { name: '石头',  color: 0xbdbdbd, side: 0x9e9e9e, type: 'solid',       hardness: 1.0, seed: 33 },
  4:  { name: '木头',  color: 0xbf8a4d, side: 0x5d4037, type: 'solid',       hardness: 0.8, seed: 44 },
  5:  { name: '树叶',  color: 0x7cb342, side: 0x558b2f, type: 'solid',       hardness: 0.3, seed: 55 },
  6:  { name: '沙子',  color: 0xfff59d, side: 0xf9a825, type: 'solid',       hardness: 0.4, seed: 66 },
  7:  { name: '栅栏',  color: 0x8d6e63, side: 0x5d4037, type: 'fence',       hardness: 0.6, seed: 77 },
  8:  { name: '薄玻璃', color: 0xb3e5fc, side: 0xb3e5fc, type: 'glass_thin', hardness: 0.2, seed: 88 },
  9:  { name: '厚玻璃', color: 0x81d4fa, side: 0x81d4fa, type: 'glass_thick',hardness: 0.3, seed: 99 },
  10: { name: '雪块',  color: 0xf5f5f5, side: 0xeceff1, type: 'solid',       hardness: 0.3, seed: 100 },
  11: { name: '水',    color: 0x1976d2, side: 0x1565c0, type: 'water',       hardness: 999, seed: 111 },
}

const placeableBlocks = [
  { id: 1,  key: '1', name: '草地',   swatch: 'linear-gradient(135deg,#7cb342,#8d6e63 60%,#4e342e)' },
  { id: 2,  key: '2', name: '泥土',   swatch: 'linear-gradient(135deg,#a1887f,#795548 60%,#5d4037)' },
  { id: 3,  key: '3', name: '石头',   swatch: 'linear-gradient(135deg,#bdbdbd,#9e9e9e 60%,#757575)' },
  { id: 4,  key: '4', name: '木头',   swatch: 'linear-gradient(135deg,#bf8a4d,#5d4037 60%,#3e2723)' },
  { id: 5,  key: '5', name: '树叶',   swatch: 'linear-gradient(135deg,#7cb342,#558b2f 60%,#33691e)' },
  { id: 6,  key: '6', name: '沙子',   swatch: 'linear-gradient(135deg,#fff59d,#f9a825 60%,#f57f17)' },
  { id: 7,  key: '7', name: '栅栏',   swatch: 'linear-gradient(135deg,#8d6e63,#5d4037 60%,#3e2723)' },
  { id: 8,  key: '8', name: '薄玻璃', swatch: 'linear-gradient(135deg,rgba(179,229,252,0.7),rgba(129,212,250,0.9))' },
  { id: 9,  key: '9', name: '厚玻璃', swatch: 'linear-gradient(135deg,rgba(129,212,250,0.8),rgba(79,195,247,0.95))' },
]

// 生物群系定义
const BIOMES = {
  plains:   { name: '平原', baseHeight: 4,  amplitude: 1.5, top: 1, sub: 2, treeChance: 0.02 },
  hills:    { name: '丘陵', baseHeight: 7,  amplitude: 4,   top: 1, sub: 3, treeChance: 0.01 },
  desert:   { name: '沙漠', baseHeight: 4,  amplitude: 1,   top: 6, sub: 6, treeChance: 0    },
  snow:     { name: '雪地', baseHeight: 5,  amplitude: 2,   top: 10, sub: 2, treeChance: 0.01 },
  lake:     { name: '湖泊', baseHeight: 3,  amplitude: 0.5, top: 11, sub: 2, treeChance: 0    },
}

// ===== Vue 状态 =====
const containerRef = ref(null)
const canvasRef = ref(null)
const selected = ref(1)
const hoverInfo = ref('—')
const playerPos = ref('—')
const biomeText = ref('—')
const isLocked = ref(false)
const miningProgress = ref(0)
const loadedChunks = ref(0)

const modeText = computed(() => BLOCKS[selected.value]?.name || '—')

// ===== Three.js 对象 =====
let scene, camera, renderer, raycaster
let highlightMesh, crackMesh
const blockMeshes = new Map()           // "x,y,z" -> Mesh/Group
let sharedGeometry, glassThinGeometry
const blockMaterials = {}
const textures = {}                 // "blockId_face" -> CanvasTexture

// ===== 无限世界数据 =====
// 用全局 Map 存储所有方块，玩家修改持久化
const blockMap = new Map()              // "x,y,z" -> blockId
const generatedChunks = new Set()       // 已生成地形的区块 "cx,cz"
const activeChunkMeshes = new Map()     // 区块 -> 该区块的方块坐标列表
let lastPlayerChunk = { cx: 999, cz: 999 }

// ===== 玩家 & 视角状态 =====
const velocity = new THREE.Vector3()
const keys = {}
let onGround = false
let yaw = 0, pitch = 0
let raf = 0
let lastTime = 0
let walkBob = 0
let swingAnim = 0

// ===== 挖掘状态 =====
let mining = false
let miningTarget = null
let miningElapsed = 0

// ===== 音效引擎 =====
let audioCtx = null
let lastStepTime = 0
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)() } catch (e) {}
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume()
}
function playTone({ freq = 200, dur = 0.12, type = 'square', vol = 0.18, slide = 0 }) {
  if (!audioCtx) return
  const t = audioCtx.currentTime
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur)
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(audioCtx.destination)
  osc.start(t); osc.stop(t + dur)
}
function playNoise({ dur = 0.1, vol = 0.12, filterFreq = 1200 }) {
  if (!audioCtx) return
  const t = audioCtx.currentTime
  const bufferSize = Math.floor(audioCtx.sampleRate * dur)
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  const src = audioCtx.createBufferSource()
  src.buffer = buffer
  const filter = audioCtx.createBiquadFilter()
  filter.type = 'lowpass'; filter.frequency.value = filterFreq
  const gain = audioCtx.createGain(); gain.gain.value = vol
  src.connect(filter).connect(gain).connect(audioCtx.destination)
  src.start(t)
}
function soundDig()   { playNoise({ dur: 0.08, vol: 0.14, filterFreq: 1800 }); playTone({ freq: 180, dur: 0.06, type: 'square', vol: 0.06, slide: -60 }) }
function soundBreak() { playNoise({ dur: 0.2, vol: 0.22, filterFreq: 900 }); playTone({ freq: 120, dur: 0.15, type: 'sawtooth', vol: 0.08, slide: -80 }) }
function soundPlace() { playTone({ freq: 320, dur: 0.08, type: 'sine', vol: 0.16, slide: -120 }); playNoise({ dur: 0.05, vol: 0.06, filterFreq: 2000 }) }
function soundStep()  { playNoise({ dur: 0.06, vol: 0.08, filterFreq: 500 }) }
function soundJump()  { playTone({ freq: 280, dur: 0.1, type: 'sine', vol: 0.14, slide: 200 }) }
function soundLand()  { playNoise({ dur: 0.1, vol: 0.12, filterFreq: 400 }) }

// ===== 程序化纹理生成：每种方块根据认知生成不同图案 =====
// faceType: 'top' 顶面 / 'side' 侧面 / 'bottom' 底面
function makeBlockTexture(blockId, faceType) {
  const cacheKey = blockId + '_' + faceType
  if (textures[cacheKey]) return textures[cacheKey]
  const def = BLOCKS[blockId]
  const size = 16
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const ctx = cv.getContext('2d')
  // 基于种子的伪随机
  let s = def.seed + (faceType === 'top' ? 1000 : faceType === 'bottom' ? 2000 : 0)
  const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }

  // 工具函数：在画布上撒随机色块
  const scatter = (count, colors) => {
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = colors[Math.floor(rng() * colors.length)]
      const x = Math.floor(rng() * size)
      const y = Math.floor(rng() * size)
      ctx.fillRect(x, y, 1, 1)
    }
  }

  // 根据方块类型生成符合认知的纹理
  switch (blockId) {
    case 1: { // 草地
      if (faceType === 'top') {
        // 顶面：绿色草地，散布深浅草点
        ctx.fillStyle = '#7cb342'; ctx.fillRect(0, 0, size, size)
        scatter(80, ['#689f38', '#8bc34a', '#558b2f', '#aed581'])
      } else if (faceType === 'side') {
        // 侧面：棕色泥土，顶部一条草边
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(0, 0, size, size)
        scatter(60, ['#6d4c41', '#a1887f', '#5d4037'])
        // 顶部草边（高低不平）
        ctx.fillStyle = '#7cb342'
        for (let x = 0; x < size; x++) {
          const h = 2 + Math.floor(rng() * 3)
          ctx.fillRect(x, 0, 1, h)
        }
      } else {
        // 底面：纯泥土
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(0, 0, size, size)
        scatter(60, ['#6d4c41', '#a1887f', '#5d4037'])
      }
      break
    }
    case 2: { // 泥土
      ctx.fillStyle = '#a1887f'; ctx.fillRect(0, 0, size, size)
      scatter(70, ['#8d6e63', '#795548', '#bcaaa4', '#6d4c41'])
      break
    }
    case 3: { // 石头
      ctx.fillStyle = '#9e9e9e'; ctx.fillRect(0, 0, size, size)
      scatter(90, ['#757575', '#bdbdbd', '#616161', '#e0e0e0'])
      // 随机几条裂纹
      ctx.strokeStyle = '#616161'; ctx.lineWidth = 1
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.moveTo(rng() * size, rng() * size)
        ctx.lineTo(rng() * size, rng() * size)
        ctx.stroke()
      }
      break
    }
    case 4: { // 木头
      if (faceType === 'top' || faceType === 'bottom') {
        // 顶/底面：年轮同心圆
        ctx.fillStyle = '#bf8a4d'; ctx.fillRect(0, 0, size, size)
        const cx = size / 2, cy = size / 2
        for (let r = 1; r < size / 2; r += 2) {
          ctx.strokeStyle = r % 4 === 0 ? '#5d4037' : '#8d6e63'
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
        }
        // 中心点
        ctx.fillStyle = '#3e2723'; ctx.fillRect(cx - 1, cy - 1, 2, 2)
      } else {
        // 侧面：竖直木纹
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(0, 0, size, size)
        for (let x = 0; x < size; x++) {
          if (rng() > 0.6) {
            ctx.fillStyle = rng() > 0.5 ? '#5d4037' : '#a1887f'
            ctx.fillRect(x, 0, 1, size)
          }
        }
        // 几个树皮节
        ctx.fillStyle = '#3e2723'
        for (let i = 0; i < 2; i++) {
          ctx.fillRect(Math.floor(rng() * size), Math.floor(rng() * size), 2, 1)
        }
      }
      break
    }
    case 5: { // 树叶
      ctx.fillStyle = '#558b2f'; ctx.fillRect(0, 0, size, size)
      // 散布叶片色块
      scatter(100, ['#7cb342', '#33691e', '#aed581', '#689f38'])
      break
    }
    case 6: { // 沙子
      ctx.fillStyle = '#fff59d'; ctx.fillRect(0, 0, size, size)
      scatter(80, ['#f9a825', '#fff9c4', '#f57f17', '#fffde7'])
      break
    }
    case 7: { // 栅栏（木头材质）
      ctx.fillStyle = '#8d6e63'; ctx.fillRect(0, 0, size, size)
      for (let x = 0; x < size; x++) {
        if (rng() > 0.6) {
          ctx.fillStyle = rng() > 0.5 ? '#5d4037' : '#a1887f'
          ctx.fillRect(x, 0, 1, size)
        }
      }
      break
    }
    case 10: { // 雪块
      ctx.fillStyle = '#f5f5f5'; ctx.fillRect(0, 0, size, size)
      scatter(50, ['#eceff1', '#ffffff', '#cfd8dc', '#fafafa'])
      break
    }
    default: { // 兜底：纯色 + 噪点
      const hex = '#' + def.color.toString(16).padStart(6, '0')
      ctx.fillStyle = hex; ctx.fillRect(0, 0, size, size)
      scatter(50, [hex, '#ffffff', '#000000'])
    }
  }

  const tex = new THREE.CanvasTexture(cv)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  textures[cacheKey] = tex
  return tex
}

// ===== 噪声系统：用于地形 & 生物群系 =====
function mulberry32(s) {
  return function () {
    s |= 0; s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function makeNoise(seed) {
  const rng = mulberry32(seed)
  const grid = {}
  const val = (ix, iz) => { const k = ix + ',' + iz; if (!(k in grid)) grid[k] = rng(); return grid[k] }
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
let worldSeed = 12345
let heightNoise = makeNoise(worldSeed)        // 小尺度高度噪声
let biomeNoise = makeNoise(worldSeed + 7777)  // 大尺度生物群系噪声

// 根据世界坐标确定生物群系
function getBiome(x, z) {
  const n = biomeNoise(x * 0.015, z * 0.015)  // 大尺度
  const h = heightNoise(x * 0.1, z * 0.1)     // 辅助判断
  if (n < 0.18) return BIOMES.lake
  if (n < 0.38) return BIOMES.desert
  if (n < 0.58) return BIOMES.plains
  if (n < 0.78) return BIOMES.hills
  return BIOMES.snow
}
function getBiomeName(x, z) {
  const n = biomeNoise(x * 0.015, z * 0.015)
  if (n < 0.18) return '湖泊'
  if (n < 0.38) return '沙漠'
  if (n < 0.58) return '平原'
  if (n < 0.78) return '丘陵'
  return '雪地'
}

// ===== 体素数据读写（无限世界）=====
function blockKey(x, y, z) { return x + ',' + y + ',' + z }
function get(x, y, z) {
  if (y < 0 || y >= WORLD_H) return 0
  return blockMap.get(blockKey(x, y, z)) || 0
}
function set(x, y, z, v) {
  if (y < 0 || y >= WORLD_H) return
  if (v === 0) blockMap.delete(blockKey(x, y, z))
  else blockMap.set(blockKey(x, y, z), v)
}
// 碰撞判定：栅栏/薄玻璃/水不阻挡
function isSolid(x, y, z) {
  const b = get(x, y, z)
  if (!b) return false
  const def = BLOCKS[b]
  return def.type === 'solid' || def.type === 'glass_thick'
}

// ===== 区块地形生成 =====
function generateChunk(cx, cz) {
  const key = cx + ',' + cz
  if (generatedChunks.has(key)) return
  generatedChunks.add(key)
  const rng = mulberry32((cx * 73856093) ^ (cz * 19349663) ^ worldSeed)
  const startX = cx * CHUNK_SIZE
  const startZ = cz * CHUNK_SIZE
  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wx = startX + lx
      const wz = startZ + lz
      const biome = getBiome(wx, wz)
      const h = Math.floor(biome.baseHeight + heightNoise(wx * 0.18, wz * 0.18) * biome.amplitude)
      for (let y = 0; y <= Math.max(h, SEA_LEVEL); y++) {
        if (y > h) {
          // 海平面以下填充水
          if (y <= SEA_LEVEL && biome === BIOMES.lake) set(wx, y, wz, 11)
          continue
        }
        if (y === 0) { set(wx, y, wz, 3); continue }
        if (y < h - 2) set(wx, y, wz, 3)
        else if (y < h) set(wx, y, wz, biome.sub)
        else {
          // 顶层：雪地额外覆盖雪
          if (biome === BIOMES.snow && rng() > 0.3) set(wx, y, wz, 10)
          else set(wx, y, wz, biome.top)
        }
      }
      // 种树
      if (biome.treeChance > 0 && rng() < biome.treeChance && h + 6 < WORLD_H) {
        plantTree(wx, h + 1, wz, rng)
      }
    }
  }
}

function plantTree(x, y, z, rng) {
  for (let i = 0; i < 4; i++) if (y + i < WORLD_H) set(x, y + i, z, 4)
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dy = 0; dy < 2; dy++) {
        const nx = x + dx, nz = z + dz, ny = y + 3 + dy
        if (ny < WORLD_H && Math.abs(dx) + Math.abs(dz) + dy <= 3 && !get(nx, ny, nz)) {
          set(nx, ny, nz, 5)
        }
      }
    }
  }
  if (y + 5 < WORLD_H) set(x, y + 5, z, 5)
}

// ===== 区块 Mesh 构建/卸载 =====
function buildChunkMeshes(cx, cz) {
  const chunkKey = cx + ',' + cz
  if (activeChunkMeshes.has(chunkKey)) return
  const startX = cx * CHUNK_SIZE
  const startZ = cz * CHUNK_SIZE
  const blockList = []
  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let y = 0; y < WORLD_H; y++) {
        const wx = startX + lx, wz = startZ + lz
        const b = get(wx, y, wz)
        if (!b) continue
        // 仅渲染至少有一个空气/透明邻居的方块
        if (!isOpaqueNeighbor(wx, y, wz)) continue
        addBlockMesh(wx, y, wz, b)
        blockList.push(blockKey(wx, y, wz))
      }
    }
  }
  activeChunkMeshes.set(chunkKey, blockList)
  loadedChunks.value = activeChunkMeshes.size
}
// 判断方块的6个邻居是否有非不透明方块（决定是否需要渲染）
function isOpaqueNeighbor(x, y, z) {
  const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]
  for (const [dx,dy,dz] of dirs) {
    const nb = get(x+dx, y+dy, z+dz)
    if (!nb) return true
    const def = BLOCKS[nb]
    if (def.type === 'glass_thin' || def.type === 'glass_thick' || def.type === 'water' || def.type === 'fence') return true
  }
  return false
}
function unloadChunk(cx, cz) {
  const chunkKey = cx + ',' + cz
  const list = activeChunkMeshes.get(chunkKey)
  if (!list) return
  for (const key of list) {
    const mesh = blockMeshes.get(key)
    if (mesh) { scene.remove(mesh); blockMeshes.delete(key) }
  }
  activeChunkMeshes.delete(chunkKey)
  loadedChunks.value = activeChunkMeshes.size
}

// 分帧加载队列：玩家移动时把需要生成的区块入队，每帧只处理一个，避免卡顿
const chunkLoadQueue = []
const CHUNKS_PER_FRAME = 1  // 每帧加载的区块数量

// 根据玩家位置更新可见区块（仅更新队列，不立即生成）
function updateChunks(px, pz) {
  const pcx = Math.floor(px / CHUNK_SIZE)
  const pcz = Math.floor(pz / CHUNK_SIZE)
  if (pcx === lastPlayerChunk.cx && pcz === lastPlayerChunk.cz) return
  lastPlayerChunk = { cx: pcx, cz: pcz }
  // 卸载超出范围的区块（立即执行，释放内存）
  for (const key of Array.from(activeChunkMeshes.keys())) {
    const [cx, cz] = key.split(',').map(Number)
    if (Math.abs(cx - pcx) > RENDER_RADIUS + 1 || Math.abs(cz - pcz) > RENDER_RADIUS + 1) {
      unloadChunk(cx, cz)
    }
  }
  // 按距离从近到远入队（优先加载玩家附近的区块）
  const pending = []
  for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
    for (let dz = -RENDER_RADIUS; dz <= RENDER_RADIUS; dz++) {
      const cx = pcx + dx, cz = pcz + dz
      const key = cx + ',' + cz
      if (activeChunkMeshes.has(key)) continue  // 已加载跳过
      pending.push({ cx, cz, dist: dx * dx + dz * dz })
    }
  }
  pending.sort((a, b) => a.dist - b.dist)
  // 清空旧队列，用新的替换（玩家移动后旧队列失效）
  chunkLoadQueue.length = 0
  chunkLoadQueue.push(...pending)
}

// 每帧处理队列：加载少量区块，分摊到多帧避免卡顿
function processChunkQueue() {
  let loaded = 0
  while (loaded < CHUNKS_PER_FRAME && chunkLoadQueue.length > 0) {
    const { cx, cz } = chunkLoadQueue.shift()
    const key = cx + ',' + cz
    if (activeChunkMeshes.has(key)) continue  // 已加载跳过
    // 玩家可能已远离该区块，跳过超出范围的
    const pcx = lastPlayerChunk.cx, pcz = lastPlayerChunk.cz
    if (Math.abs(cx - pcx) > RENDER_RADIUS || Math.abs(cz - pcz) > RENDER_RADIUS) continue
    generateChunk(cx, cz)
    buildChunkMeshes(cx, cz)
    loaded++
  }
}

// ===== Three.js 初始化 =====
function initThree() {
  const container = containerRef.value
  const canvas = canvasRef.value
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb)
  scene.fog = new THREE.Fog(0x87ceeb, (RENDER_RADIUS - 0.5) * CHUNK_SIZE, RENDER_RADIUS * CHUNK_SIZE + 4)

  camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 300)
  camera.rotation.order = 'YXZ'
  camera.position.set(0.5, WORLD_H, 0.5)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(container.clientWidth, container.clientHeight)

  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dir = new THREE.DirectionalLight(0xffffff, 0.85)
  dir.position.set(20, 40, 15)
  scene.add(dir)

  sharedGeometry = new THREE.BoxGeometry(1, 1, 1)
  glassThinGeometry = new THREE.BoxGeometry(0.1, 1, 1)

  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002))
  highlightMesh = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 }))
  highlightMesh.visible = false
  scene.add(highlightMesh)

  crackMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.01, 1.01, 1.01),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false })
  )
  crackMesh.visible = false
  scene.add(crackMesh)

  raycaster = new THREE.Raycaster()
  raycaster.far = 6

  buildViewmodel()
  // 初始加载玩家所在区块及紧邻区块（同步生成，避免玩家落地前脚下为空）
  lastPlayerChunk = { cx: 999, cz: 999 }
  const pcx = Math.floor(0.5 / CHUNK_SIZE)
  const pcz = Math.floor(0.5 / CHUNK_SIZE)
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      generateChunk(pcx + dx, pcz + dz)
      buildChunkMeshes(pcx + dx, pcz + dz)
    }
  }
  lastPlayerChunk = { cx: pcx, cz: pcz }
  updateChunks(0.5, 0.5)  // 入队其余区块，分帧加载
}

// 获取方块材质：玻璃/水用纯色半透明（无纹理），其他用程序化纹理
// BoxGeometry 面顺序: [+x, -x, +y(顶), -y(底), +z, -z]
function getBlockMaterials(b) {
  if (!blockMaterials[b]) {
    const def = BLOCKS[b]
    if (def.type === 'glass_thin' || def.type === 'glass_thick') {
      // 玻璃：纯色半透明，不应用纹理
      const mat = new THREE.MeshLambertMaterial({
        color: def.color,
        transparent: true,
        opacity: def.type === 'glass_thin' ? 0.45 : 0.6,
        depthWrite: false
      })
      blockMaterials[b] = [mat, mat.clone(), mat.clone(), mat.clone(), mat.clone(), mat.clone()]
    } else if (def.type === 'water') {
      // 水：纯色半透明蓝色
      const mat = new THREE.MeshLambertMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.7,
        depthWrite: false
      })
      blockMaterials[b] = [mat, mat.clone(), mat.clone(), mat.clone(), mat.clone(), mat.clone()]
    } else {
      // 实心方块：顶面/侧面/底面分别用不同纹理
      const topTex = makeBlockTexture(b, 'top')
      const sideTex = makeBlockTexture(b, 'side')
      const bottomTex = makeBlockTexture(b, 'bottom')
      const sideMat = new THREE.MeshLambertMaterial({ map: sideTex })
      const topMat = new THREE.MeshLambertMaterial({ map: topTex })
      const bottomMat = new THREE.MeshLambertMaterial({ map: bottomTex })
      // 面顺序 [+x, -x, +y, -y, +z, -z]：侧面、侧面、顶面、底面、侧面、侧面
      blockMaterials[b] = [sideMat, sideMat.clone(), topMat, bottomMat, sideMat.clone(), sideMat.clone()]
    }
  }
  return blockMaterials[b]
}

function addBlockMesh(x, y, z, b) {
  const key = blockKey(x, y, z)
  if (blockMeshes.has(key)) return
  const def = BLOCKS[b]
  let mesh
  if (def.type === 'fence') {
    const group = new THREE.Group()
    const mats = getBlockMaterials(b)
    const center = new THREE.Mesh(sharedGeometry, mats)
    center.scale.set(0.3, 1, 0.3); group.add(center)
    const offsets = [[0.35,0.35],[-0.35,0.35],[0.35,-0.35],[-0.35,-0.35]]
    for (const [ox, oz] of offsets) {
      const post = new THREE.Mesh(sharedGeometry, mats)
      post.scale.set(0.2, 1, 0.2); post.position.set(ox, 0, oz)
      group.add(post)
    }
    mesh = group
  } else if (def.type === 'glass_thin') {
    mesh = new THREE.Mesh(glassThinGeometry, getBlockMaterials(b))
  } else {
    mesh = new THREE.Mesh(sharedGeometry, getBlockMaterials(b))
  }
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5)
  mesh.userData = { x, y, z, block: b }
  scene.add(mesh)
  blockMeshes.set(key, mesh)
}

function removeBlockMesh(x, y, z) {
  const key = blockKey(x, y, z)
  const mesh = blockMeshes.get(key)
  if (mesh) { scene.remove(mesh); blockMeshes.delete(key) }
  // 邻居可能因本块被挖而暴露，补建
  const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]
  for (const [dx,dy,dz] of dirs) {
    const nx = x+dx, ny = y+dy, nz = z+dz
    const nb = get(nx, ny, nz)
    if (nb && !blockMeshes.has(blockKey(nx, ny, nz)) && isOpaqueNeighbor(nx, ny, nz)) {
      addBlockMesh(nx, ny, nz, nb)
    }
  }
}

// ===== 第一人称视图模型：双手 + 砍刀 =====
let viewmodelGroup
function buildViewmodel() {
  viewmodelGroup = new THREE.Group()
  camera.add(viewmodelGroup)
  const handMat = new THREE.MeshLambertMaterial({ color: 0xe0ac69 })
  const handGeo = new THREE.BoxGeometry(0.18, 0.18, 0.5)
  const leftHand = new THREE.Mesh(handGeo, handMat)
  leftHand.position.set(-0.35, -0.35, -0.6); leftHand.rotation.x = -0.3
  viewmodelGroup.add(leftHand)
  const rightHand = new THREE.Mesh(handGeo, handMat)
  rightHand.position.set(0.35, -0.35, -0.6); rightHand.rotation.x = -0.3
  viewmodelGroup.add(rightHand)
  const handleMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 })
  const knifeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.4), handleMat)
  knifeHandle.position.set(0, -0.3, -0.7)
  viewmodelGroup.add(knifeHandle)
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0xc0c0c0 })
  const knifeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.6), bladeMat)
  knifeBlade.position.set(0, -0.24, -1.0)
  viewmodelGroup.add(knifeBlade)
  scene.add(camera)
}

// ===== 指针锁定 =====
function lockPointer() { ensureAudio(); canvasRef.value?.requestPointerLock() }
function onPointerLockChange() {
  isLocked.value = document.pointerLockElement === canvasRef.value
  if (!isLocked.value) stopMining()
}
function onMouseMove(e) {
  if (!isLocked.value) return
  const sens = 0.0022
  yaw -= e.movementX * sens
  pitch -= e.movementY * sens
  pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch))
  applyCameraRotation()
}
function applyCameraRotation() { camera.rotation.y = yaw; camera.rotation.x = pitch }

// ===== 输入 =====
function onKeyDown(e) {
  keys[e.key.toLowerCase()] = true
  if (e.key >= '1' && e.key <= '9') selected.value = Number(e.key)
  if (e.code === 'Space') e.preventDefault()
}
function onKeyUp(e) { keys[e.key.toLowerCase()] = false }
function onCanvasClick() { if (!isLocked.value) lockPointer() }
function onMouseDown(e) {
  if (!isLocked.value) return
  ensureAudio()
  if (e.button === 0) startMining()
  else if (e.button === 2) placeBlock()
}
function onMouseUp(e) { if (e.button === 0) stopMining() }

// ===== 挖掘系统 =====
function startMining() { mining = true; miningElapsed = 0; miningTarget = null }
function stopMining() {
  mining = false; miningTarget = null; miningElapsed = 0
  miningProgress.value = 0; crackMesh.visible = false; swingAnim = 0
}
function updateMining(dt) {
  if (!mining) return
  const hit = castRay()
  if (!hit) { stopMining(); return }
  const ud = hit.object.userData
  if (!miningTarget || miningTarget.x !== ud.x || miningTarget.y !== ud.y || miningTarget.z !== ud.z) {
    miningTarget = { x: ud.x, y: ud.y, z: ud.z }; miningElapsed = 0
  }
  const def = BLOCKS[ud.block]
  const need = MINE_TIME * (def.hardness || 1)
  miningElapsed += dt
  miningProgress.value = Math.min(1, miningElapsed / need)
  swingAnim = (swingAnim + dt * 8) % (Math.PI * 2)
  crackMesh.position.set(ud.x + 0.5, ud.y + 0.5, ud.z + 0.5)
  crackMesh.material.opacity = miningProgress.value * 0.5
  crackMesh.visible = true
  if (Math.floor(miningElapsed * 8) !== Math.floor((miningElapsed - dt) * 8)) soundDig()
  if (miningElapsed >= need) {
    set(ud.x, ud.y, ud.z, 0)
    removeBlockMesh(ud.x, ud.y, ud.z)
    soundBreak()
    stopMining()
  }
}

// ===== 物理 & 碰撞 =====
function checkCollision(eyePos) {
  const half = PLAYER_HALF
  const footY = eyePos.y - EYE_HEIGHT
  const minX = Math.floor(eyePos.x - half), maxX = Math.floor(eyePos.x + half)
  const minY = Math.floor(footY),                maxY = Math.floor(eyePos.y)
  const minZ = Math.floor(eyePos.z - half), maxZ = Math.floor(eyePos.z + half)
  for (let x = minX; x <= maxX; x++)
    for (let y = minY; y <= maxY; y++)
      for (let z = minZ; z <= maxZ; z++)
        if (isSolid(x, y, z)) return true
  return false
}
let wasOnGround = false
function updatePhysics(dt) {
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
  const move = new THREE.Vector3()
  if (keys['w'] || keys['arrowup']) move.add(forward)
  if (keys['s'] || keys['arrowdown']) move.sub(forward)
  if (keys['d'] || keys['arrowright']) move.add(right)
  if (keys['a'] || keys['arrowleft']) move.sub(right)
  const moving = move.lengthSq() > 0
  if (moving) move.normalize().multiplyScalar(MOVE_SPEED)
  velocity.x = move.x; velocity.z = move.z
  velocity.y -= GRAVITY * dt
  if (keys[' '] && onGround) { velocity.y = JUMP_SPEED; onGround = false; soundJump() }

  const pos = camera.position.clone()
  pos.x += velocity.x * dt; if (checkCollision(pos)) { pos.x = camera.position.x; velocity.x = 0 }
  pos.z += velocity.z * dt; if (checkCollision(pos)) { pos.z = camera.position.z; velocity.z = 0 }
  pos.y += velocity.y * dt
  if (checkCollision(pos)) {
    pos.y = camera.position.y
    if (velocity.y < 0) onGround = true
    velocity.y = 0
  } else { onGround = false }

  if (moving && onGround) {
    walkBob += dt * 10
    const stepPhase = Math.floor(walkBob / Math.PI)
    if (stepPhase !== lastStepTime) { lastStepTime = stepPhase; soundStep() }
  } else { walkBob *= 0.9 }
  if (onGround && !wasOnGround && velocity.y === 0) soundLand()
  wasOnGround = onGround
  if (pos.y < -10) { pos.set(0.5, WORLD_H, 0.5); velocity.set(0, 0, 0) }
  camera.position.copy(pos)

  // 动态加载/卸载区块
  updateChunks(pos.x, pos.z)
}

// ===== 射线拾取 =====
function castRay() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
  const meshes = []
  blockMeshes.forEach(m => {
    if (m.isGroup) m.children.forEach(c => meshes.push(c))
    else meshes.push(m)
  })
  const hits = raycaster.intersectObjects(meshes, false)
  if (!hits.length) return null
  let target = hits[0].object
  while (target && !target.userData.x) target = target.parent
  return target ? { ...hits[0], object: target } : null
}
function updateHover() {
  const hit = castRay()
  if (hit) {
    const ud = hit.object.userData
    highlightMesh.position.set(ud.x + 0.5, ud.y + 0.5, ud.z + 0.5)
    highlightMesh.visible = true
    const b = BLOCKS[ud.block]
    hoverInfo.value = `${b ? b.name : '?'} (${ud.x}, ${ud.y}, ${ud.z})`
  } else {
    highlightMesh.visible = false
    hoverInfo.value = '—'
  }
}
function placeBlock() {
  const hit = castRay()
  if (!hit) return
  const ud = hit.object.userData
  const n = hit.face.normal
  const nx = ud.x + Math.round(n.x), ny = ud.y + Math.round(n.y), nz = ud.z + Math.round(n.z)
  if (ny < 0 || ny >= WORLD_H) return
  if (get(nx, ny, nz)) return
  const eyePos = camera.position
  const footY = eyePos.y - EYE_HEIGHT
  if (nx === Math.floor(eyePos.x) && nz === Math.floor(eyePos.z) &&
      (ny === Math.floor(footY) || ny === Math.floor(eyePos.y))) return
  set(nx, ny, nz, selected.value)
  addBlockMesh(nx, ny, nz, selected.value)
  soundPlace()
}

// ===== 回到原点 =====
function resetPlayer() {
  camera.position.set(0.5, WORLD_H, 0.5)
  velocity.set(0, 0, 0)
  yaw = 0; pitch = 0
  applyCameraRotation()
}

// ===== 渲染循环 =====
function animate(time) {
  raf = requestAnimationFrame(animate)
  if (!lastTime) lastTime = time
  const dt = Math.min(0.05, (time - lastTime) / 1000)
  lastTime = time
  updatePhysics(dt)
  processChunkQueue()  // 分帧加载区块，每帧只生成一个，避免卡顿
  updateMining(dt)
  updateHover()
  if (viewmodelGroup) {
    const bobY = Math.sin(walkBob) * 0.02
    const bobX = Math.cos(walkBob * 0.5) * 0.015
    let swingRot = 0
    if (mining) swingRot = Math.sin(swingAnim) * 0.6
    viewmodelGroup.position.set(bobX, bobY, 0)
    viewmodelGroup.rotation.x = swingRot - 0.1
  }
  playerPos.value = `${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`
  biomeText.value = getBiomeName(camera.position.x, camera.position.z)
  renderer.render(scene, camera)
}
function resize() {
  const cont = containerRef.value
  if (!cont || !renderer) return
  camera.aspect = cont.clientWidth / cont.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(cont.clientWidth, cont.clientHeight)
}

onMounted(() => {
  initThree()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('resize', resize)
  document.addEventListener('pointerlockchange', onPointerLockChange)
  document.addEventListener('mousemove', onMouseMove)
  raf = requestAnimationFrame(animate)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('resize', resize)
  document.removeEventListener('pointerlockchange', onPointerLockChange)
  document.removeEventListener('mousemove', onMouseMove)
  if (renderer) renderer.dispose()
  if (audioCtx) audioCtx.close()
})
</script>

<style scoped lang="scss">
.minecraft-page {
  display: flex; flex-direction: column; height: 100%;
  min-height: calc(100vh - 90px); background: #07120c; color: #d7ffe7;
}
.game-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: #0d1c13; border: 1px solid #173f2a;
  border-radius: 8px; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;
}
.header-left { display: flex; gap: 18px; flex-wrap: wrap; }
.game-info {
  display: flex; align-items: center; gap: 6px; font-size: 14px;
  .label { color: #93b89f; }
  .value { color: #2ee68a; font-weight: 600; }
}
.header-right { display: flex; align-items: center; gap: 12px; .tip { color: #6f9a7e; font-size: 12px; } }
.game-container {
  flex: 1; position: relative; background: #0a1410; border: 1px solid #173f2a;
  border-radius: 8px; overflow: hidden; min-height: 360px;
}
canvas { display: block; width: 100%; height: 100%; cursor: crosshair; }
.crosshair {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  pointer-events: none; width: 22px; height: 22px;
  .ch-h, .ch-v { position: absolute; background: rgba(255,255,255,0.85); box-shadow: 0 0 2px rgba(0,0,0,0.8); }
  .ch-h { left: 0; top: 50%; width: 100%; height: 2px; transform: translateY(-50%); }
  .ch-v { top: 0; left: 50%; height: 100%; width: 2px; transform: translateX(-50%); }
}
.mine-progress {
  position: absolute; left: 50%; bottom: 18%; transform: translateX(-50%);
  width: 120px; height: 6px; background: rgba(0,0,0,0.5); border-radius: 3px;
  overflow: hidden; pointer-events: none;
}
.mine-bar { height: 100%; background: linear-gradient(90deg, #f9a825, #2ee68a); transition: width 0.05s linear; }
.lock-overlay {
  position: absolute; inset: 0; background: rgba(7,18,12,0.7);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; backdrop-filter: blur(2px);
}
.lock-card {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 30px 50px; background: rgba(13,28,19,0.9); border: 1px solid #1f8f58;
  border-radius: 12px; color: #2ee68a; transition: transform 0.2s;
  &:hover { transform: scale(1.04); }
}
.lock-title { font-size: 18px; font-weight: 600; color: #d7ffe7; }
.lock-tip { font-size: 12px; color: #6f9a7e; }
.hotbar {
  display: flex; justify-content: center; gap: 8px; padding: 10px; margin-top: 10px;
  background: #0d1c13; border: 1px solid #173f2a; border-radius: 8px; flex-wrap: wrap;
}
.hotbar-slot {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 8px 10px; border: 2px solid #173f2a; border-radius: 6px;
  cursor: pointer; min-width: 64px; transition: all 0.15s; background: #07120c;
  &:hover { border-color: #1f8f58; }
  &.active { border-color: #2ee68a; box-shadow: 0 0 10px rgba(46,230,138,0.4); }
}
.slot-key { font-size: 11px; color: #6f9a7e; align-self: flex-start; }
.slot-swatch {
  width: 34px; height: 34px; border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.4); box-shadow: inset 0 -4px 8px rgba(0,0,0,0.3);
}
.slot-name { font-size: 12px; color: #d7ffe7; }
</style>
