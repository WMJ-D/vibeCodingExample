<template>
  <div class="vr-demo-page">
    <div class="vr-header">
      <h2>VR 沉浸式展示</h2>
      <div class="header-controls">
        <el-button type="primary" @click="regenerateImage" :loading="imageLoading">
          <el-icon><RefreshRight /></el-icon>
          重新生成场景
        </el-button>
        <el-button type="success" @click="enterVR" :disabled="!hasImage">
          <el-icon><VideoCamera /></el-icon>
          进入 VR 模式
        </el-button>
      </div>
    </div>

    <div class="vr-container">
      <div class="scene-preview" ref="previewRef">
        <div v-if="!hasImage && !imageLoading" class="placeholder">
          <el-icon :size="60"><Picture /></el-icon>
          <p>点击"重新生成场景"开始体验</p>
        </div>
        <div v-if="imageLoading" class="loading-overlay">
          <el-icon class="is-loading" :size="50"><Loading /></el-icon>
          <p>正在生成场景图片...</p>
        </div>
      </div>

      <div class="control-panel">
        <h3>控制面板</h3>
        
        <div class="control-item">
          <label>场景类型</label>
          <el-select v-model="sceneType" @change="onSceneTypeChange">
            <el-option label="未来城市" value="futuristic_city" />
            <el-option label="自然森林" value="nature_forest" />
            <el-option label="海底世界" value="underwater" />
            <el-option label="星空宇宙" value="space" />
            <el-option label="梦幻城堡" value="fantasy_castle" />
          </el-select>
        </div>

        <div class="control-item">
          <label>自动旋转</label>
          <el-switch v-model="autoRotate" />
        </div>

        <div class="control-item">
          <label>旋转速度</label>
          <el-slider v-model="rotationSpeed" :min="0.1" :max="3" :step="0.1" :disabled="!autoRotate" />
        </div>

        <div class="control-item">
          <label>环境亮度</label>
          <el-slider v-model="ambientIntensity" :min="0.1" :max="2" :step="0.1" />
        </div>

        <div class="control-item">
          <label>鼠标灵敏度</label>
          <el-slider v-model="mouseSensitivity" :min="0.5" :max="3" :step="0.1" />
        </div>

        <div class="info-box">
          <h4>操作说明</h4>
          <ul>
            <li>鼠标左键拖拽：旋转视角</li>
            <li>鼠标滚轮：缩放场景</li>
            <li>鼠标右键拖拽：平移视角</li>
            <li>双击：进入全屏模式</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- VR 全屏视图 -->
    <div v-if="vrActive" class="vr-fullscreen" ref="vrRef">
      <div class="vr-toolbar">
        <el-button type="danger" @click="exitVR">
          <el-icon><Close /></el-icon>
          退出 VR
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

const previewRef = ref(null)
const vrRef = ref(null)
const hasImage = ref(false)
const imageLoading = ref(false)
const vrActive = ref(false)
const autoRotate = ref(true)
const rotationSpeed = ref(1)
const ambientIntensity = ref(0.6)
const mouseSensitivity = ref(1)
const sceneType = ref('futuristic_city')

let scene, camera, renderer, controls, composer
let animationId = null
let imageTexture = null

const scenePrompts = {
  futuristic_city: 'futuristic cyberpunk city at night, neon lights, flying cars, tall skyscrapers, dramatic lighting, digital art',
  nature_forest: 'mysterious enchanted forest, glowing fireflies, tall ancient trees, magical atmosphere, soft sunlight filtering through leaves, digital art',
  underwater: 'underwater scene, coral reef, colorful fish, jellyfish, whale, magical ocean atmosphere, volumetric light rays, digital art',
  space: 'cosmic space scene, nebula, galaxies, stars, planets, purple and blue colors, magical atmosphere, digital art',
  fantasy_castle: 'magical fantasy castle on floating islands, waterfalls, rainbow, clouds, dreamlike atmosphere, digital art'
}

async function generateImage() {
  imageLoading.value = true
  try {
    const prompt = scenePrompts[sceneType.value]
    const response = await fetch(`https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=landscape_4_3`)
    const data = await response.json()
    if (data.image_url) {
      loadTexture(data.image_url)
    }
  } catch (error) {
    console.error('生成图片失败:', error)
  } finally {
    imageLoading.value = false
  }
}

function loadTexture(url) {
  const loader = new THREE.TextureLoader()
  loader.load(url, (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping
    imageTexture = texture
    updateSceneBackground()
    hasImage.value = true
  })
}

function initThreeJS() {
  if (!previewRef.value) return

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(75, previewRef.value.clientWidth / previewRef.value.clientHeight, 0.1, 1000)
  camera.position.set(0, 0, 5)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(previewRef.value.clientWidth, previewRef.value.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  previewRef.value.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.rotateSpeed = mouseSensitivity.value
  controls.zoomSpeed = mouseSensitivity.value
  controls.autoRotate = autoRotate.value
  controls.autoRotateSpeed = rotationSpeed.value * 2

  const ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity.value)
  scene.add(ambientLight)

  const pointLight = new THREE.PointLight(0xffffff, 1)
  pointLight.position.set(5, 5, 5)
  scene.add(pointLight)

  createSceneObjects()

  composer = new EffectComposer(renderer)
  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5, 0.4, 0.85
  )
  composer.addPass(bloomPass)

  animate()
}

function createSceneObjects() {
  // 清除现有物体
  while (scene.children.length > 0) {
    scene.remove(scene.children[0])
  }

  // 添加环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity.value)
  scene.add(ambientLight)

  // 添加点光源
  const pointLight1 = new THREE.PointLight(0x00ffff, 2, 50)
  pointLight1.position.set(10, 10, 10)
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(0xff00ff, 2, 50)
  pointLight2.position.set(-10, -10, 10)
  scene.add(pointLight2)

  // 创建中心展示物体
  const geometry = new THREE.IcosahedronGeometry(2, 1)
  
  scenePrompts[sceneType.value].includes('city') || sceneType.value === 'futuristic_city'
    ? createFuturisticCity()
    : sceneType.value === 'nature_forest'
    ? createNatureForest()
    : sceneType.value === 'underwater'
    ? createUnderwater()
    : sceneType.value === 'space'
    ? createSpace()
    : createFantasyCastle()
}

function createFuturisticCity() {
  // 霓虹框架立方体
  const group = new THREE.Group()
  
  for (let i = 0; i < 20; i++) {
    const size = Math.random() * 0.5 + 0.3
    const geometry = new THREE.BoxGeometry(size, size * (2 + Math.random() * 3), size)
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
      emissive: new THREE.Color().setHSL(Math.random(), 0.8, 0.3),
      transparent: true,
      opacity: 0.8,
      wireframe: Math.random() > 0.5
    })
    const cube = new THREE.Mesh(geometry, material)
    cube.position.set(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 15
    )
    cube.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
    group.add(cube)
  }

  // 中心能量球
  const sphereGeom = new THREE.SphereGeometry(1.5, 32, 32)
  const sphereMat = new THREE.MeshPhongMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.7
  })
  const sphere = new THREE.Mesh(sphereGeom, sphereMat)
  group.add(sphere)

  // 环绕环
  const torusGeom = new THREE.TorusGeometry(2.5, 0.1, 16, 100)
  const torusMat = new THREE.MeshPhongMaterial({ color: 0xff00ff, emissive: 0xff00ff })
  const torus = new THREE.Mesh(torusGeom, torusMat)
  torus.rotation.x = Math.PI / 2
  group.add(torus)

  scene.add(group)
}

function createNatureForest() {
  const group = new THREE.Group()

  // 发光粒子群
  for (let i = 0; i < 100; i++) {
    const particleGeom = new THREE.SphereGeometry(0.05 + Math.random() * 0.1, 8, 8)
    const particleMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.3 + Math.random() * 0.2, 1, 0.6),
      transparent: true,
      opacity: 0.8
    })
    const particle = new THREE.Mesh(particleGeom, particleMat)
    particle.position.set(
      (Math.random() - 0.5) * 20,
      Math.random() * 10 - 2,
      (Math.random() - 0.5) * 20
    )
    group.add(particle)
  }

  // 悬浮水晶
  for (let i = 0; i < 8; i++) {
    const crystalGeom = new THREE.OctahedronGeometry(0.3 + Math.random() * 0.4)
    const crystalMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(0.8 + Math.random() * 0.2, 0.8, 0.5),
      emissive: new THREE.Color().setHSL(0.8 + Math.random() * 0.2, 0.8, 0.3),
      transparent: true,
      opacity: 0.7
    })
    const crystal = new THREE.Mesh(crystalGeom, crystalMat)
    crystal.position.set(
      (Math.random() - 0.5) * 12,
      Math.random() * 5,
      (Math.random() - 0.5) * 12
    )
    crystal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
    group.add(crystal)
  }

  // 中心生命之树
  const treeGeom = new THREE.ConeGeometry(1, 4, 8)
  const treeMat = new THREE.MeshPhongMaterial({
    color: 0x228b22,
    emissive: 0x004400,
    emissiveIntensity: 0.3
  })
  const tree = new THREE.Mesh(treeGeom, treeMat)
  tree.position.y = -1
  group.add(tree)

  scene.add(group)
}

function createUnderwater() {
  const group = new THREE.Group()

  // 气泡
  for (let i = 0; i < 50; i++) {
    const bubbleGeom = new THREE.SphereGeometry(0.1 + Math.random() * 0.3, 16, 16)
    const bubbleMat = new THREE.MeshPhongMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.4,
      wireframe: Math.random() > 0.7
    })
    const bubble = new THREE.Mesh(bubbleGeom, bubbleMat)
    bubble.position.set(
      (Math.random() - 0.5) * 20,
      Math.random() * 15 - 5,
      (Math.random() - 0.5) * 20
    )
    group.add(bubble)
  }

  // 水母
  for (let i = 0; i < 6; i++) {
    const jellyGeom = new THREE.SphereGeometry(0.5 + Math.random() * 0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2)
    const jellyMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(0.6 + Math.random() * 0.3, 0.8, 0.6),
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    })
    const jelly = new THREE.Mesh(jellyGeom, jellyMat)
    jelly.position.set(
      (Math.random() - 0.5) * 15,
      Math.random() * 8 - 2,
      (Math.random() - 0.5) * 15
    )
    group.add(jelly)
  }

  // 珊瑚
  for (let i = 0; i < 10; i++) {
    const coralGeom = new THREE.ConeGeometry(0.3 + Math.random() * 0.3, 2 + Math.random() * 2, 6)
    const coralMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(Math.random() * 0.3, 0.9, 0.5),
      emissive: new THREE.Color().setHSL(Math.random() * 0.3, 0.9, 0.2)
    })
    const coral = new THREE.Mesh(coralGeom, coralMat)
    coral.position.set(
      (Math.random() - 0.5) * 18,
      -4,
      (Math.random() - 0.5) * 18
    )
    group.add(coral)
  }

  scene.add(group)
}

function createSpace() {
  const group = new THREE.Group()

  // 星星
  for (let i = 0; i < 500; i++) {
    const starGeom = new THREE.SphereGeometry(0.02 + Math.random() * 0.05)
    const starMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 0.5, 0.8 + Math.random() * 0.2)
    })
    const star = new THREE.Mesh(starGeom, starMat)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(Math.random() * 2 - 1)
    const r = 20 + Math.random() * 30
    star.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    )
    group.add(star)
  }

  // 行星
  for (let i = 0; i < 5; i++) {
    const planetGeom = new THREE.SphereGeometry(0.5 + Math.random() * 1.5, 32, 32)
    const planetMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
      emissive: new THREE.Color().setHSL(Math.random(), 0.5, 0.1)
    })
    const planet = new THREE.Mesh(planetGeom, planetMat)
    planet.position.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 20
    )
    group.add(planet)

    // 行星环
    if (Math.random() > 0.5) {
      const ringGeom = new THREE.TorusGeometry(planet.geometry.parameters.radius * 1.5, 0.1, 2, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.5, 0.6),
        transparent: true,
        opacity: 0.5
      })
      const ring = new THREE.Mesh(ringGeom, ringMat)
      ring.position.copy(planet.position)
      ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5
      group.add(ring)
    }
  }

  // 中心黑洞
  const blackholeGeom = new THREE.SphereGeometry(2, 32, 32)
  const blackholeMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
  const blackhole = new THREE.Mesh(blackholeGeom, blackholeMat)
  group.add(blackhole)

  // 吸积盘
  const diskGeom = new THREE.TorusGeometry(3, 0.5, 2, 64)
  const diskMat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.6
  })
  const disk = new THREE.Mesh(diskGeom, diskMat)
  disk.rotation.x = Math.PI / 2
  group.add(disk)

  scene.add(group)
}

function createFantasyCastle() {
  const group = new THREE.Group()

  // 漂浮岛屿
  for (let i = 0; i < 6; i++) {
    const islandGeom = new THREE.CylinderGeometry(1 + Math.random(), 0.5, 0.5, 8)
    const islandMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(0.3 + Math.random() * 0.1, 0.5, 0.4),
      flatShading: true
    })
    const island = new THREE.Mesh(islandGeom, islandMat)
    island.position.set(
      (Math.random() - 0.5) * 16,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 16
    )
    island.rotation.set(Math.random(), Math.random(), Math.random())
    group.add(island)

    // 岛屿上的小塔
    if (Math.random() > 0.5) {
      const towerGeom = new THREE.ConeGeometry(0.3, 1, 6)
      const towerMat = new THREE.MeshPhongMaterial({
        color: 0xcc88ff,
        emissive: 0x440066,
        emissiveIntensity: 0.3
      })
      const tower = new THREE.Mesh(towerGeom, towerMat)
      tower.position.copy(island.position)
      tower.position.y += 0.8
      group.add(tower)
    }
  }

  // 魔法泡泡
  for (let i = 0; i < 30; i++) {
    const bubbleGeom = new THREE.SphereGeometry(0.1 + Math.random() * 0.2)
    const bubbleMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(0.7 + Math.random() * 0.3, 0.8, 0.7),
      transparent: true,
      opacity: 0.5,
      wireframe: true
    })
    const bubble = new THREE.Mesh(bubbleGeom, bubbleMat)
    bubble.position.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 20
    )
    group.add(bubble)
  }

  // 中心城堡
  const castleGroup = new THREE.Group()
  
  const baseGeom = new THREE.BoxGeometry(3, 2, 3)
  const baseMat = new THREE.MeshPhongMaterial({
    color: 0x8866cc,
    emissive: 0x442266,
    emissiveIntensity: 0.2
  })
  const base = new THREE.Mesh(baseGeom, baseMat)
  castleGroup.add(base)

  // 塔尖
  for (let i = 0; i < 4; i++) {
    const towerGeom = new THREE.ConeGeometry(0.4, 1.5, 6)
    const towerMat = new THREE.MeshPhongMaterial({
      color: 0xaa88dd,
      emissive: 0x6644aa,
      emissiveIntensity: 0.3
    })
    const tower = new THREE.Mesh(towerGeom, towerMat)
    tower.position.set(
      (i < 2 ? -1.5 : 1.5),
      1.5,
      (i % 2 === 0 ? -1.5 : 1.5)
    )
    castleGroup.add(tower)
  }

  castleGroup.position.y = -1
  group.add(castleGroup)

  // 彩虹光环
  for (let i = 0; i < 5; i++) {
    const ringGeom = new THREE.TorusGeometry(4 + i * 0.5, 0.05, 8, 64)
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.8 - i * 0.1, 0.9, 0.6),
      transparent: true,
      opacity: 0.4
    })
    const ring = new THREE.Mesh(ringGeom, ringMat)
    ring.rotation.x = Math.PI / 3 + i * 0.1
    ring.rotation.y = i * 0.2
    group.add(ring)
  }

  scene.add(group)
}

function updateSceneBackground() {
  if (imageTexture && scene) {
    scene.background = imageTexture
  }
}

function animate() {
  animationId = requestAnimationFrame(animate)
  
  if (controls) {
    controls.autoRotate = autoRotate.value
    controls.autoRotateSpeed = rotationSpeed.value * 2
    controls.rotateSpeed = mouseSensitivity.value
    controls.update()
  }

  // 动画场景物体
  if (scene) {
    scene.children.forEach((child, i) => {
      if (child.type === 'Mesh') {
        child.rotation.y += 0.002 * (i % 3 + 1)
      }
    })
  }

  if (composer) {
    composer.render()
  } else if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function regenerateImage() {
  if (imageTexture) {
    imageTexture.dispose()
    imageTexture = null
  }
  generateImage()
}

function enterVR() {
  vrActive.value = true
  if (vrRef.value && renderer) {
    vrRef.value.appendChild(renderer.domElement)
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
}

function exitVR() {
  vrActive.value = false
  if (previewRef.value && renderer) {
    previewRef.value.appendChild(renderer.domElement)
    renderer.setSize(previewRef.value.clientWidth, previewRef.value.clientHeight)
  }
}

function onWindowResize() {
  if (!previewRef.value) return
  
  camera.aspect = previewRef.value.clientWidth / previewRef.value.clientHeight
  camera.updateProjectionMatrix()
  
  if (!vrActive.value) {
    renderer.setSize(previewRef.value.clientWidth, previewRef.value.clientHeight)
  }
}

function onSceneTypeChange() {
  createSceneObjects()
}

watch(ambientIntensity, (val) => {
  if (scene) {
    const ambient = scene.children.find(c => c.type === 'AmbientLight')
    if (ambient) {
      ambient.intensity = val
    }
  }
})

onMounted(() => {
  initThreeJS()
  window.addEventListener('resize', onWindowResize)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (renderer) {
    renderer.dispose()
  }
  if (imageTexture) {
    imageTexture.dispose()
  }
  window.removeEventListener('resize', onWindowResize)
})
</script>

<style scoped lang="scss">
.vr-demo-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 12px;
  min-height: 650px;
}

.vr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  h2 {
    color: #fff;
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .header-controls {
    display: flex;
    gap: 12px;
  }
}

.vr-container {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}

.scene-preview {
  flex: 1;
  position: relative;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);

  .placeholder {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: #8e8ea0;

    .el-icon {
      color: #4a4a6a;
      margin-bottom: 16px;
    }

    p {
      font-size: 14px;
    }
  }

  .loading-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: #64B5F6;

    .el-icon {
      margin-bottom: 16px;
    }

    p {
      font-size: 14px;
    }
  }
}

.control-panel {
  width: 280px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;

  h3 {
    color: #fff;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  h4 {
    color: #8e8ea0;
    margin: 0 0 8px;
    font-size: 13px;
  }

  .control-item {
    display: flex;
    flex-direction: column;
    gap: 8px;

    label {
      color: #8e8ea0;
      font-size: 13px;
    }

    .el-slider {
      --el-slider-main-bg-color: #6366f1;
    }
  }

  .info-box {
    margin-top: auto;
    padding: 16px;
    background: rgba(99, 102, 241, 0.1);
    border-radius: 8px;
    border: 1px solid rgba(99, 102, 241, 0.2);

    ul {
      margin: 0;
      padding-left: 16px;
      color: #8e8ea0;
      font-size: 12px;
      line-height: 1.8;
    }
  }
}

.vr-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: #000;

  .vr-toolbar {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
  }
}
</style>
