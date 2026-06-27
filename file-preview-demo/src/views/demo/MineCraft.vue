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
        <div class="game-info">
          <span class="label">坐标</span>
          <span class="value">{{ playerPos }}</span>
        </div>
      </div>
      <div class="header-right">
        <span class="tip">点击锁定视角 · ESC 退出 · WASD 移动 · 空格跳跃 · 左键挖 · 右键放 · 1-6 切换</span>
        <el-button type="primary" @click="regenerate">
          <el-icon><Refresh /></el-icon>&nbsp;重新生成世界
        </el-button>
      </div>
    </div>

    <!-- 游戏画布 -->
    <div class="game-container" ref="containerRef">
      <canvas ref="canvasRef" @click="onCanvasClick" @mousedown="onMouseDown" @contextmenu.prevent></canvas>
      <!-- 准星 -->
      <div class="crosshair" v-show="isLocked">
        <span class="ch-h"></span><span class="ch-v"></span>
      </div>
      <!-- 点击锁定提示遮罩 -->
      <div class="lock-overlay" v-show="!isLocked" @click="lockPointer">
        <div class="lock-card">
          <el-icon :size="42"><Aim /></el-icon>
          <div class="lock-title">点击进入第一人称视角</div>
          <div class="lock-tip">ESC 退出鼠标锁定</div>
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

// ===== 世界常量 =====
const SIZE = 16          // 世界水平尺寸（x、z 方向）
const WORLD_H = 12       // 世界高度
const PLAYER_HALF = 0.3  // 玩家半宽（碰撞AABB）
const PLAYER_HEIGHT = 1.7
const EYE_HEIGHT = 1.6   // 相机相对脚的高度
const GRAVITY = 26
const JUMP_SPEED = 8.2
const MOVE_SPEED = 4.8

// ===== 方块定义：top 顶面色，side 侧面色（光照产生明暗差异） =====
const BLOCKS = {
  1: { name: '草地', top: 0x7cb342, side: 0x8d6e63 },
  2: { name: '泥土', top: 0xa1887f, side: 0x795548 },
  3: { name: '石头', top: 0xbdbdbd, side: 0x9e9e9e },
  4: { name: '木头', top: 0xbf8a4d, side: 0x5d4037 },
  5: { name: '树叶', top: 0x7cb342, side: 0x558b2f },
  6: { name: '沙子', top: 0xfff59d, side: 0xf9a825 },
}

// 物品栏展示数据
const placeableBlocks = [
  { id: 1, key: '1', name: '草地', swatch: 'linear-gradient(135deg,#7cb342,#8d6e63 60%,#4e342e)' },
  { id: 2, key: '2', name: '泥土', swatch: 'linear-gradient(135deg,#a1887f,#795548 60%,#5d4037)' },
  { id: 3, key: '3', name: '石头', swatch: 'linear-gradient(135deg,#bdbdbd,#9e9e9e 60%,#757575)' },
  { id: 4, key: '4', name: '木头', swatch: 'linear-gradient(135deg,#bf8a4d,#5d4037 60%,#3e2723)' },
  { id: 5, key: '5', name: '树叶', swatch: 'linear-gradient(135deg,#7cb342,#558b2f 60%,#33691e)' },
  { id: 6, key: '6', name: '沙子', swatch: 'linear-gradient(135deg,#fff59d,#f9a825 60%,#f57f17)' },
]

// ===== Vue 响应式状态 =====
const containerRef = ref(null)
const canvasRef = ref(null)
const world = ref([])
const selected = ref(1)
const blockCount = ref(0)
const hoverInfo = ref('—')
const playerPos = ref('—')
const isLocked = ref(false)

const modeText = computed(() => BLOCKS[selected.value]?.name || '—')

// ===== Three.js 对象 =====
let scene, camera, renderer, raycaster
let highlightMesh                       // 悬停方块的高亮线框
const blockMeshes = new Map()           // "x,y,z" -> Mesh
let sharedGeometry                      // 共享的方块几何体
const blockMaterials = {}               // 每种方块类型共享一组材质

// ===== 玩家状态 =====
const velocity = new THREE.Vector3()
const keys = {}
let onGround = false
let yaw = 0, pitch = 0                  // 视角偏航/俯仰
let raf = 0
let lastTime = 0

// ===== 伪随机 & 噪声（世界生成）=====
let seed = 12345
function mulberry32(s) {
  return function () {
    s |= 0; s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
let rand = mulberry32(seed)
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

// ===== 体素数据读写 =====
function get(x, y, z) {
  if (x < 0 || x >= SIZE || z < 0 || z >= SIZE || y < 0 || y >= WORLD_H) return 0
  return world.value[x][z][y] || 0
}
function set(x, y, z, v) {
  if (x < 0 || x >= SIZE || z < 0 || z >= SIZE || y < 0 || y >= WORLD_H) return
  world.value[x][z][y] = v
}

function plantTree(w, x, y, z) {
  for (let i = 0; i < 4; i++) if (y + i < WORLD_H) w[x][z][y + i] = 4
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dy = 0; dy < 2; dy++) {
        const nx = x + dx, nz = z + dz, ny = y + 3 + dy
        if (nx >= 0 && nx < SIZE && nz >= 0 && nz < SIZE && ny < WORLD_H) {
          if (Math.abs(dx) + Math.abs(dz) + dy <= 3 && !w[nx][nz][ny]) w[nx][nz][ny] = 5
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
      const h = Math.floor(2 + noise(x * 0.18, z * 0.18) * 5)
      for (let y = 0; y < WORLD_H; y++) {
        if (y === 0) w[x][z][y] = 3
        else if (y < h - 2) w[x][z][y] = 3
        else if (y < h) w[x][z][y] = 2
        else if (y === h) w[x][z][y] = 1
        else w[x][z][y] = 0
      }
    }
  }
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
  // 重置随机种子 & 重新生成世界
  seed = (Math.random() * 1e9) | 0
  rand = mulberry32(seed)
  noise = makeNoise(rand)
  world.value = generateWorld()
  // 重置玩家位置
  camera.position.set(SIZE / 2, WORLD_H, SIZE / 2)
  velocity.set(0, 0, 0)
  yaw = 0; pitch = 0
  applyCameraRotation()
  buildWorldMeshes()
  updateCount()
}

function updateCount() {
  let n = 0
  const w = world.value
  for (let x = 0; x < SIZE; x++)
    for (let z = 0; z < SIZE; z++)
      for (let y = 0; y < WORLD_H; y++) if (w[x][z][y]) n++
  blockCount.value = n
}

// ===== Three.js 初始化 =====
function initThree() {
  const container = containerRef.value
  const canvas = canvasRef.value

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb)
  scene.fog = new THREE.Fog(0x87ceeb, 22, 70)  // 雾效，增强沉浸感

  camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 300)
  camera.rotation.order = 'YXZ'  // 第一人称标准旋转顺序
  camera.position.set(SIZE / 2, WORLD_H, SIZE / 2)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(container.clientWidth, container.clientHeight)

  // 环境光 + 平行光（让侧面产生明暗差异）
  const ambient = new THREE.AmbientLight(0xffffff, 0.55)
  scene.add(ambient)
  const dir = new THREE.DirectionalLight(0xffffff, 0.85)
  dir.position.set(20, 40, 15)
  scene.add(dir)

  // 共享方块几何体
  sharedGeometry = new THREE.BoxGeometry(1, 1, 1)

  // 高亮线框（用于悬停方块）
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002))
  highlightMesh = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 })
  )
  highlightMesh.visible = false
  scene.add(highlightMesh)

  raycaster = new THREE.Raycaster()
  raycaster.far = 6  // 只检测 6 格内的方块

  buildWorldMeshes()
}

// 获取某种方块类型共享的6面材质（BoxGeometry面顺序: +x,-x,+y,-y,+z,-z）
function getBlockMaterials(b) {
  if (!blockMaterials[b]) {
    const def = BLOCKS[b]
    const side = new THREE.MeshLambertMaterial({ color: def.side })
    const top = new THREE.MeshLambertMaterial({ color: def.top })
    blockMaterials[b] = [side, side.clone(), top, side.clone(), side.clone(), side.clone()]
  }
  return blockMaterials[b]
}

// 为单个方块创建 Mesh（只创建暴露的方块）
function addBlockMesh(x, y, z, b) {
  const key = `${x},${y},${z}`
  if (blockMeshes.has(key)) return
  const mesh = new THREE.Mesh(sharedGeometry, getBlockMaterials(b))
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5)
  mesh.userData = { x, y, z, block: b }
  scene.add(mesh)
  blockMeshes.set(key, mesh)
}

// 移除方块 Mesh，并补齐因移除而暴露的邻居
function removeBlockMesh(x, y, z) {
  const key = `${x},${y},${z}`
  const mesh = blockMeshes.get(key)
  if (mesh) {
    scene.remove(mesh)
    blockMeshes.delete(key)
  }
  // 邻居可能因本块被挖而暴露，需要补建
  const dirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]
  for (const [dx,dy,dz] of dirs) {
    const nx = x+dx, ny = y+dy, nz = z+dz
    const nb = get(nx, ny, nz)
    if (nb && !blockMeshes.has(`${nx},${ny},${nz}`)) addBlockMesh(nx, ny, nz, nb)
  }
}

// 重建整个世界 Mesh
function buildWorldMeshes() {
  blockMeshes.forEach(m => scene.remove(m))
  blockMeshes.clear()
  const w = world.value
  for (let x = 0; x < SIZE; x++)
    for (let z = 0; z < SIZE; z++)
      for (let y = 0; y < WORLD_H; y++) {
        const b = w[x][z][y]
        if (!b) continue
        // 仅渲染至少有一个空气邻居的方块
        if (!get(x+1,y,z) || !get(x-1,y,z) || !get(x,y+1,z) || !get(x,y-1,z) || !get(x,y,z+1) || !get(x,y,z-1)) {
          addBlockMesh(x, y, z, b)
        }
      }
}

// ===== 第一人称：指针锁定 =====
function lockPointer() {
  canvasRef.value?.requestPointerLock()
}
function onPointerLockChange() {
  isLocked.value = document.pointerLockElement === canvasRef.value
}
function onMouseMove(e) {
  if (!isLocked.value) return
  const sens = 0.0022
  yaw -= e.movementX * sens
  pitch -= e.movementY * sens
  // 限制俯仰角，避免翻转
  pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch))
  applyCameraRotation()
}
function applyCameraRotation() {
  camera.rotation.y = yaw
  camera.rotation.x = pitch
}

// ===== 输入 =====
function onKeyDown(e) {
  keys[e.key.toLowerCase()] = true
  if (e.key >= '1' && e.key <= '6') selected.value = Number(e.key)
  if (e.code === 'Space') e.preventDefault()
}
function onKeyUp(e) {
  keys[e.key.toLowerCase()] = false
}
function onCanvasClick() {
  if (!isLocked.value) lockPointer()
}
function onMouseDown(e) {
  if (!isLocked.value) return
  if (e.button === 0) mineBlock()       // 左键挖掘
  else if (e.button === 2) placeBlock() // 右键放置
}

// ===== 物理 & 碰撞 =====
// 检查玩家AABB（以眼睛位置为基准）是否与任何实体方块相交
function checkCollision(eyePos) {
  const half = PLAYER_HALF
  const footY = eyePos.y - EYE_HEIGHT
  const minX = Math.floor(eyePos.x - half)
  const maxX = Math.floor(eyePos.x + half)
  const minY = Math.floor(footY)
  const maxY = Math.floor(eyePos.y)
  const minZ = Math.floor(eyePos.z - half)
  const maxZ = Math.floor(eyePos.z + half)
  for (let x = minX; x <= maxX; x++)
    for (let y = minY; y <= maxY; y++)
      for (let z = minZ; z <= maxZ; z++)
        if (get(x, y, z)) return true
  return false
}

function updatePhysics(dt) {
  // 基于视角计算前向、右向（水平面）
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))

  const move = new THREE.Vector3()
  if (keys['w'] || keys['arrowup']) move.add(forward)
  if (keys['s'] || keys['arrowdown']) move.sub(forward)
  if (keys['d'] || keys['arrowright']) move.add(right)
  if (keys['a'] || keys['arrowleft']) move.sub(right)
  if (move.lengthSq() > 0) move.normalize().multiplyScalar(MOVE_SPEED)

  velocity.x = move.x
  velocity.z = move.z
  velocity.y -= GRAVITY * dt

  // 跳跃
  if (keys[' '] && onGround) {
    velocity.y = JUMP_SPEED
    onGround = false
  }

  // 分轴解算碰撞，逐轴回退
  const pos = camera.position.clone()

  // X 轴
  pos.x += velocity.x * dt
  if (checkCollision(pos)) { pos.x = camera.position.x; velocity.x = 0 }

  // Z 轴
  pos.z += velocity.z * dt
  if (checkCollision(pos)) { pos.z = camera.position.z; velocity.z = 0 }

  // Y 轴
  pos.y += velocity.y * dt
  if (checkCollision(pos)) {
    pos.y = camera.position.y
    if (velocity.y < 0) onGround = true  // 下落时碰撞 = 落地
    velocity.y = 0
  } else {
    onGround = false
  }

  // 防止掉出世界底部
  if (pos.y < -10) {
    pos.set(SIZE / 2, WORLD_H, SIZE / 2)
    velocity.set(0, 0, 0)
  }

  camera.position.copy(pos)
}

// ===== 射线拾取：挖掘/放置 =====
function castRay() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
  const meshes = Array.from(blockMeshes.values())
  const hits = raycaster.intersectObjects(meshes, false)
  return hits[0] || null
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

function mineBlock() {
  const hit = castRay()
  if (!hit) return
  const { x, y, z } = hit.object.userData
  set(x, y, z, 0)
  removeBlockMesh(x, y, z)
  updateCount()
}

function placeBlock() {
  const hit = castRay()
  if (!hit) return
  const ud = hit.object.userData
  // 根据射线命中面法线确定放置位置
  const n = hit.face.normal
  const nx = ud.x + Math.round(n.x)
  const ny = ud.y + Math.round(n.y)
  const nz = ud.z + Math.round(n.z)
  if (nx < 0 || nx >= SIZE || ny < 0 || ny >= WORLD_H || nz < 0 || nz >= SIZE) return
  if (get(nx, ny, nz)) return
  // 不能放置到玩家自身所在位置
  const eyePos = camera.position
  const footY = eyePos.y - EYE_HEIGHT
  if (nx === Math.floor(eyePos.x) && nz === Math.floor(eyePos.z) &&
      (ny === Math.floor(footY) || ny === Math.floor(eyePos.y))) return
  set(nx, ny, nz, selected.value)
  addBlockMesh(nx, ny, nz, selected.value)
  updateCount()
}

// ===== 渲染循环 =====
function animate(time) {
  raf = requestAnimationFrame(animate)
  if (!lastTime) lastTime = time
  const dt = Math.min(0.05, (time - lastTime) / 1000)
  lastTime = time

  updatePhysics(dt)
  updateHover()
  playerPos.value = `${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`
  renderer.render(scene, camera)
}

function resize() {
  const cont = containerRef.value
  if (!cont || !renderer) return
  camera.aspect = cont.clientWidth / cont.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(cont.clientWidth, cont.clientHeight)
}

// ===== 生命周期 =====
onMounted(() => {
  world.value = generateWorld()
  updateCount()
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
/* 准星 */
.crosshair {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  width: 22px;
  height: 22px;
  .ch-h, .ch-v {
    position: absolute;
    background: rgba(255, 255, 255, 0.85);
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
  }
  .ch-h { left: 0; top: 50%; width: 100%; height: 2px; transform: translateY(-50%); }
  .ch-v { top: 0; left: 50%; height: 100%; width: 2px; transform: translateX(-50%); }
}
/* 锁定提示遮罩 */
.lock-overlay {
  position: absolute;
  inset: 0;
  background: rgba(7, 18, 12, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(2px);
}
.lock-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 30px 50px;
  background: rgba(13, 28, 19, 0.9);
  border: 1px solid #1f8f58;
  border-radius: 12px;
  color: #2ee68a;
  transition: transform 0.2s;
  &:hover { transform: scale(1.04); }
}
.lock-title { font-size: 18px; font-weight: 600; color: #d7ffe7; }
.lock-tip { font-size: 12px; color: #6f9a7e; }
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
