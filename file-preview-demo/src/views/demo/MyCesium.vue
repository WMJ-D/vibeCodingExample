<template>
  <div class="my-cesium-page">
    <div id="mapgis-3d-viewer" class="cesium-viewer-box"></div>

    <div class="layer-panel">
      <div class="panel-title">图例控制</div>
      <div
        v-for="item in layerOptions"
        :key="item.key"
        class="layer-row"
      >
        <span :class="['legend-dot', `legend-dot--${item.key}`]"></span>
        <span class="layer-name">{{ item.label }}</span>
        <el-switch
          v-model="layerVisible[item.key]"
          size="small"
          active-color="#2fba7c"
          inactive-color="#274538"
          @change="toggleLayer(item.key)"
        />
      </div>
    </div>

    <div class="roam-panel">
      <div class="panel-title">漫游控制</div>
      <div class="roam-actions">
        <el-button size="small" type="success" :disabled="loading || roamRunning" @click="startRoaming">开始</el-button>
        <el-button size="small" :disabled="loading || !roamRunning" @click="pauseRoaming">
          {{ roamPaused ? '继续' : '暂停' }}
        </el-button>
        <el-button size="small" :disabled="loading || !animation" @click="stopRoaming">停止</el-button>
      </div>
      <div class="roam-meta">
        <span>路径点：{{ pathPositions.length }}</span>
        <span>{{ roamRunning ? (roamPaused ? '已暂停' : '漫游中') : '未开始' }}</span>
      </div>
    </div>

    <div v-if="loading" class="cesium-loading">
      <el-icon :size="32" color="#5ec49a"><Loading /></el-icon>
      <span>正在加载 Cesium ...</span>
    </div>
    <div v-if="error" class="cesium-error">{{ error }}</div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const BUILDING_URL = 'http://10.10.130.72:8200/3DData/ModelCache/M3D//1.0/ZondyFaceModels/ZondyFaceModels.mcj'
const HUBEI_TILE_URL = 'http://10.10.130.72:8089/igs/rest/services/Tile/湖北省_4326_normal_3-10/TileServer'

const loading = ref(true)
const error = ref('')
const roamRunning = ref(false)
const roamPaused = ref(false)
const BOUNDARY_DATA_URL = 'https://mdn.alipayobjects.com/antforest/afts/file/A*vaL-R4SU18IAAAAAgCAAAAgAerd2AQ/original_2025-11-14.json'

const layerVisible = reactive({
  tdt: true,
  tdtAnno: true,
  tdtVec: false,
  tdtVecAnno: false,
  building: true,
  hubeiTile: false,
  volumeCloud: false,
  heatmap: false,
  point: false,
  boundary: false,
})
const layerOptions = [
  { key: 'tdt', label: '天地图影像' },
  { key: 'tdtAnno', label: '影像注记' },
  { key: 'tdtVec', label: '天地图矢量' },
  { key: 'tdtVecAnno', label: '矢量注记' },
  { key: 'building', label: '中地大楼' },
  { key: 'hubeiTile', label: '湖北省图层' },
  { key: 'volumeCloud', label: '体积云' },
  { key: 'heatmap', label: '热力图' },
  { key: 'point', label: '点标注' },
  { key: 'boundary', label: '行政区划线' },
]
const defaultVolumeCloudControls = {
  show: true,
  density: 0.27,
  minHeight: 7500,
  maxHeight: 8000,
  speed: 0.1,
  direction: 90,
  minCameraHeight: 0,
  maxCameraHeight: 250000,
}
const heatBounds = {
  east: 114.40295687456313,
  north: 30.467989447011963,
  south: 30.465570241010646,
  west: 114.40024175306026,
}
const pathPositions = [
  { x: -2273175.578013623, y: 5010638.458497225, z: 3215157.5186911672 },
  { x: -2273186.15173117, y: 5010663.3702553185, z: 3215111.5241055344 },
  { x: -2273186.059557918, y: 5010665.8169212, z: 3215107.815526737 },
  { x: -2273143.314663209, y: 5010712.162479221, z: 3215066.039824561 },
  { x: -2273141.8576728688, y: 5010714.347794549, z: 3215063.717603765 },
  { x: -2273140.8739640433, y: 5010753.004724801, z: 3215004.560829764 },
  { x: -2273138.540278631, y: 5010754.703344927, z: 3215003.5664240783 },
  { x: -2273111.358422647, y: 5010766.642102002, z: 3215004.1472902703 },
  { x: -2273098.2845368856, y: 5010771.008773392, z: 3215006.5834648367 },
  { x: -2273085.2149581, y: 5010776.224484442, z: 3215007.6874420852 },
  { x: -2273060.1194440527, y: 5010787.107324429, z: 3215008.4596388526 },
  { x: -2273052.268879898, y: 5010789.153232572, z: 3215010.8286537277 },
  { x: -2273048.5740574095, y: 5010788.136685532, z: 3215014.9750527814 },
  { x: -2273046.2069158386, y: 5010783.903650803, z: 3215023.2289560195 },
  { x: -2273013.225191267, y: 5010711.003592086, z: 3215159.227493635 },
  { x: -2273003.7530798647, y: 5010714.871967782, z: 3215159.9395025484 },
  { x: -2272998.104067287, y: 5010714.851373358, z: 3215163.939958693 },
  { x: -2272994.7856738493, y: 5010712.621812783, z: 3215169.731864345 },
  { x: -2272989.1095662955, y: 5010699.273869096, z: 3215194.3994706264 },
]

let map = null
let sceneView = null
let viewer = null
let animation = null
let circleWave = null
let tdtLayer = null
let tdtAnnoLayer = null
let tdtVecLayer = null
let tdtVecAnnoLayer = null
let buildingLayer = null
let volumeCloud = null
let hubeiTileLayer = null
let heatMap = null
let graphicsLayer = null
let pointGraphic = null
let boundaryGraphicsLayer = null
let boundaryLabelLayer = null
let boundaryEntities = []
let selectedFeature = null

function assertCesiumGlobals() {
  if (!window.Cesium) throw new Error('缺少全局 Cesium，请确认 index.html 已引入 Cesium 脚本')
  if (!window.zondy?.cesium) throw new Error('缺少全局 zondy.cesium，请确认 index.html 已引入 webclient-cesium-plugin')
  if (!window.zondy?.layer) throw new Error('缺少全局 zondy.layer，请确认 index.html 已引入 webclient-common')
  if (!window.getTDTToken) throw new Error('缺少全局 getTDTToken，请确认 index.html 已引入 TDT-token.js')
}

function initViewer() {
  map = new window.zondy.Map()
  sceneView = new window.zondy.cesium.SceneView({
    viewId: 'mapgis-3d-viewer',
    map,
    contextOptions: {
      requestWebgl2: true,
    },
    extensionOptions: {
      timeline: false,
    },
  })
  viewer = sceneView.getInnerView()
  // 抗锯齿
  viewer.scene.postProcessStages.fxaa.enabled = true
  if (viewer.scene.msaaSamples !== undefined) {
    viewer.scene.msaaSamples = 4
  }
  viewer.scene.globe.showGroundAtmosphere = false
  bindRenderErrorHandler()
  viewer.showPosition?.()

  sceneView.on('click', function (event) {
    if (!boundaryEntities.length) return
    const coords = event.mapPoint?.coordinates
    if (!coords) return
    const [lng, lat] = coords
    const hit = boundaryEntities.find(f => pointInPolygon(lng, lat, f._allRings))
    if (!hit) return
    if (selectedFeature && selectedFeature !== hit) {
      selectedFeature.symbol = selectedFeature._defaultSymbol
    }
    hit.symbol = hit._highlightSymbol
    selectedFeature = hit
  })
}

function bindRenderErrorHandler() {
  if (!viewer?.scene?.renderError) return
  viewer.scene.rethrowRenderErrors = false
  viewer.scene.renderError.addEventListener((scene, renderError) => {
    const message = renderError?.message || ''
    console.error(renderError)
    error.value = `Cesium 渲染异常：${message}`
  })
}

function addTDT() {
  if (tdtLayer) return
  tdtLayer = new window.zondy.layer.WMTSLayer({
    url: 'http://t6.tianditu.gov.cn/img_c/wmts',
    tokenKey: 'tk',
    tokenValue: window.getTDTToken?.() || '',
  })
  map.add(tdtLayer)
}

function addTDTAnno() {
  if (tdtAnnoLayer) return
  tdtAnnoLayer = new window.zondy.layer.WMTSLayer({
    url: 'http://t6.tianditu.gov.cn/cia_c/wmts',
    tokenKey: 'tk',
    tokenValue: window.getTDTToken?.() || '',
  })
  map.add(tdtAnnoLayer)
}

function addTDTVec() {
  if (tdtVecLayer) return
  tdtVecLayer = new window.zondy.layer.WMTSLayer({
    url: 'http://t6.tianditu.gov.cn/vec_c/wmts',
    tokenKey: 'tk',
    tokenValue: window.getTDTToken?.() || '',
  })
  map.add(tdtVecLayer)
}

function addTDTVecAnno() {
  if (tdtVecAnnoLayer) return
  tdtVecAnnoLayer = new window.zondy.layer.WMTSLayer({
    url: 'http://t6.tianditu.gov.cn/cva_c/wmts',
    tokenKey: 'tk',
    tokenValue: window.getTDTToken?.() || '',
  })
  map.add(tdtVecAnnoLayer)
}

function addZondyBuilding() {
  if (buildingLayer) return
  buildingLayer = new window.zondy.layer.M3DModelCacheLayer({
    url: BUILDING_URL,
    extensionOptions: {
      autoReset: true,
    },
  })
  map.add(buildingLayer)
}

function addHubeiTile() {
  if (hubeiTileLayer) return
  hubeiTileLayer = new window.zondy.layer.IGSTileLayer({
    url: HUBEI_TILE_URL,
  })
  map.add(hubeiTileLayer)
  hubeiTileLayer.on?.('layerview-created', () => {
    flyToHubei()
  })
}

function initVolumeCloud() {
  if (volumeCloud) return
  const Cesium = window.Cesium
  const rectangle = Cesium.Rectangle.fromDegrees(-180, -90, 180, 90)
  volumeCloud = new window.zondy.cesium.VolumeCloud({
    viewer,
    rectangle,
    ...defaultVolumeCloudControls,
  })
}

function addGraphicLayer() {
  if (graphicsLayer) return
  graphicsLayer = new window.zondy.cesium.GraphicsLayer(viewer, {})
}

function addPoint() {
  if (pointGraphic) return
  addGraphicLayer()
  const Cesium = window.Cesium
  pointGraphic = new window.zondy.cesium.Graphic({
    type: 'point',
    positions: [Cesium.Cartesian3.fromDegrees(114.4015, 30.4668, 0)],
    style: {
      color: Cesium.Color.AQUA,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 4,
      pixelSize: 26,
      offsetHeight: 120,
    },
  })
  graphicsLayer.addGraphic(pointGraphic)
}

function addHeatMap() {
  removeHeatMap()
  const options = {
    radius: 36,
    alpha: 0.85,
    blur: 0.75,
    gradient: {
      0.3: 'rgb(0,0,255)',
      0.65: 'rgb(255,255,0)',
      0.8: 'rgb(255,128,0)',
      0.95: 'rgb(255,0,0)',
    },
    canChange: false,
  }
  heatMap = window.zondy.cesium.CesiumHeatmap.create(viewer, heatBounds, options)
  heatMap.setWGS84Data(30, 150, createHeatMapData())
}

function initAnimation() {
  const Cesium = window.Cesium
  animation = new window.zondy.cesium.AnimationTool(viewer, {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(0),
    animationType: 1,
    isLoop: true,
    showPath: true,
    positions: pathPositions,
    followSwitchMouseEvent: true,
    startPositionIndex: 0,
    offsetStartPositionDistance: 0,
    speed: 5,
    speedupFactor: 1,
    exHeight: 0,
    showInfo: true,
    modelUrl: 'http://10.10.130.72:8200/3DData/Model/glb/walk_man.glb',
    model: {
      scale: 2,
      minimumPixelSize: 0,
    },
    complete: () => {
      removeCircle()
      roamRunning.value = false
      roamPaused.value = false
    },
    interpolationAlgorithm: Cesium.LinearApproximation,
    isGetPositionNow: true,
    onPositionTag: true,
    callback: data => {
      if (!circleWave) return
      circleWave.position = new Cesium.CallbackProperty(() => data.position, false)
    },
    isSetModelPosture: true,
    isProcessCorner: false,
    maxAngle: 150.0,
    curveStep: 0.01,
    isAddScanEffect: false,
    scanEffect: undefined,
    isGetRealHeight: true,
    speedArray: undefined,
    timeArray: undefined,
    accelerationArray: undefined,
    disFactor: 10,
  })
}

function addCircle() {
  if (circleWave) return
  const Cesium = window.Cesium
  circleWave = viewer.entities.add({
    name: 'dynamic Circle',
    ellipse: {
      semiMinorAxis: 1.0,
      semiMajorAxis: 1.0,
      height: 8,
      heightReference: 2,
      material: new window.zondy.cesium.CircleWaveMaterialProperty({
        duration: 1000,
        gradient: 0.5,
        color: Cesium.Color.ORANGE,
        count: 4,
      }),
    },
  })
}

function removeCircle() {
  if (!circleWave) return
  viewer.entities.remove(circleWave)
  circleWave = null
}

function startRoaming() {
  if (!animation) return
  addCircle()
  animation.pause = false
  animation.start()
  roamRunning.value = true
  roamPaused.value = false
}

function pauseRoaming() {
  if (!animation || !roamRunning.value) return
  animation.pause = !animation.pause
  roamPaused.value = Boolean(animation.pause)
}

function stopRoaming() {
  if (!animation) return
  removeCircle()
  animation.stop()
  roamRunning.value = false
  roamPaused.value = false
}

function createHeatMapData() {
  const points = window.zondy.cesium.AlgorithmLib.getRandomPointByRect(
    heatBounds.west,
    heatBounds.south,
    heatBounds.east,
    heatBounds.north,
    200,
  )
  return points.map(point => ({
    x: point.x,
    y: point.y,
    value: randomNum(30, 150),
  }))
}

function randomNum(minNum, maxNum) {
  return Math.floor(Math.random() * (maxNum - minNum + 1) + minNum)
}

function removeHeatMap() {
  if (!heatMap) return
  heatMap.removeLayer?.()
  heatMap = null
}

function removePoint() {
  pointGraphic?.remove?.()
  pointGraphic = null
}

function removeVolumeCloud() {
  if (!volumeCloud) return
  volumeCloud.destroy?.()
  volumeCloud.remove?.()
  if ('show' in volumeCloud) volumeCloud.show = false
  volumeCloud = null
}

async function addBoundaryLayer() {
  if (boundaryEntities.length) return
  try {
    const resp = await fetch(BOUNDARY_DATA_URL)
    const geojson = await resp.json()
    const features = geojson?.features || []
    const { GraphicsLayer } = window.zondy.layer
    const { Feature, Color } = window.zondy
    const { MultiPolygon } = window.zondy.geometry
    const { SimpleFillSymbol, SimpleLineSymbol } = window.zondy.symbol
    const Cesium = window.Cesium

    boundaryGraphicsLayer = new GraphicsLayer({ graphics: [] })
    map.add(boundaryGraphicsLayer)

    boundaryLabelLayer = new window.zondy.cesium.GraphicsLayer(viewer, {})

    const defaultSymbol = new SimpleFillSymbol({
      color: new Color(0, 0, 0, 0),
      outline: new SimpleLineSymbol({
        color: new Color(84, 131, 239, 1),
        width: 2,
      }),
    })
    const highlightSymbol = new SimpleFillSymbol({
      color: new Color(84, 131, 239, 0.45),
      outline: new SimpleLineSymbol({
        color: new Color(255, 47, 109, 1),
        width: 3,
      }),
    })

    for (const feat of features) {
      const geom = feat.geometry
      if (!geom) continue
      const coords = geom.type === 'MultiPolygon' ? geom.coordinates
        : geom.type === 'Polygon' ? [geom.coordinates]
        : []
      if (!coords.length) continue
      const multiPolygon = new MultiPolygon({ coordinates: coords })
      const feature = new Feature({
        geometry: multiPolygon,
        symbol: defaultSymbol,
        attributes: feat.properties || {},
      })
      feature._defaultSymbol = defaultSymbol
      feature._highlightSymbol = highlightSymbol
      feature._allRings = coords
      boundaryGraphicsLayer.add(feature)
      boundaryEntities.push(feature)

      const name = feat.properties?.name
      if (name) {
        const center = getPolygonCentroid(coords)
        if (center) {
          const label = new window.zondy.cesium.Graphic({
            type: 'label',
            positions: [Cesium.Cartesian3.fromDegrees(center[0], center[1], 0)],
            style: {
              text: name,
              font: '16px 微软雅黑',
              fillColor: Cesium.Color.WHITE,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              outlineColor: Cesium.Color.fromCssColorString('#0d1932'),
              outlineWidth: 3,
              offsetHeight: 200,
            },
          })
          boundaryLabelLayer.addGraphic(label)
        }
      }
    }
  } catch (e) {
    console.error('行政区划加载失败', e)
  }
}

function getPolygonCentroid(polygons) {
  let totalArea = 0
  let cx = 0
  let cy = 0
  for (const rings of polygons) {
    const ring = rings?.[0]
    if (!ring || ring.length < 3) continue
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      const a = xi * yj - xj * yi
      totalArea += a
      cx += (xi + xj) * a
      cy += (yi + yj) * a
    }
  }
  if (totalArea === 0) return null
  totalArea *= 0.5
  cx /= 6 * totalArea
  cy /= 6 * totalArea
  return [cx, cy]
}

function pointInPolygon(lng, lat, polygons) {
  for (const rings of polygons) {
    const ring = rings?.[0]
    if (!ring) continue
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside
      }
    }
    if (inside) return true
  }
  return false
}

function removeBoundaryLayer() {
  if (boundaryGraphicsLayer) {
    for (const f of boundaryEntities) {
      boundaryGraphicsLayer.remove(f)
    }
    map?.remove(boundaryGraphicsLayer)
    boundaryGraphicsLayer = null
  }
  if (boundaryLabelLayer) {
    boundaryLabelLayer.destroy?.()
    boundaryLabelLayer = null
  }
  boundaryEntities = []
  selectedFeature = null
}

function removeMapLayer(layer) {
  if (!layer) return
  if (map?.remove) {
    map.remove(layer)
    return
  }
  layer.remove?.()
  layer.destroy?.()
}

function toggleLayer(key) {
  if (!viewer || !map) return
  const visible = layerVisible[key]
  if (key === 'tdt') {
    if (visible) addTDT()
    else { removeMapLayer(tdtLayer); tdtLayer = null }
  }
  if (key === 'tdtAnno') {
    if (visible) addTDTAnno()
    else { removeMapLayer(tdtAnnoLayer); tdtAnnoLayer = null }
  }
  if (key === 'tdtVec') {
    if (visible) addTDTVec()
    else { removeMapLayer(tdtVecLayer); tdtVecLayer = null }
  }
  if (key === 'tdtVecAnno') {
    if (visible) addTDTVecAnno()
    else { removeMapLayer(tdtVecAnnoLayer); tdtVecAnnoLayer = null }
  }
  if (key === 'building') {
    if (visible) addZondyBuilding()
    else { removeMapLayer(buildingLayer); buildingLayer = null }
  }
  if (key === 'hubeiTile') {
    if (visible) addHubeiTile()
    else { removeMapLayer(hubeiTileLayer); hubeiTileLayer = null }
  }
  if (key === 'volumeCloud') {
    if (visible) initVolumeCloud()
    else removeVolumeCloud()
  }
  if (key === 'heatmap') {
    if (visible) addHeatMap()
    else removeHeatMap()
  }
  if (key === 'point') {
    if (visible) addPoint()
    else removePoint()
  }
  if (key === 'boundary') {
    if (visible) addBoundaryLayer()
    else removeBoundaryLayer()
  }
}

function flyToBuilding() {
  sceneView.goTo({ center: [114.4015, 30.4668, 2500] })
}

function flyToHubei() {
  sceneView.goTo({ center: [112.21, 31.1, 650000] })
}

async function init() {
  try {
    assertCesiumGlobals()
    initViewer()
    if (layerVisible.tdt) addTDT()
    if (layerVisible.tdtAnno) addTDTAnno()
    if (layerVisible.tdtVec) addTDTVec()
    if (layerVisible.tdtVecAnno) addTDTVecAnno()
    if (layerVisible.building) addZondyBuilding()
    if (layerVisible.hubeiTile) addHubeiTile()
    if (layerVisible.volumeCloud) initVolumeCloud()
    if (layerVisible.heatmap) addHeatMap()
    if (layerVisible.point) addPoint()
    if (layerVisible.boundary) addBoundaryLayer()
    initAnimation()
    if (!layerVisible.hubeiTile) flyToBuilding()
  } catch (err) {
    error.value = `Cesium 初始化失败：${err.message}`
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  stopRoaming()
  removeVolumeCloud()
  removeBoundaryLayer()
  removeMapLayer(hubeiTileLayer)
  removeHeatMap()
  removePoint()
  removeMapLayer(buildingLayer)
  removeMapLayer(tdtVecAnnoLayer)
  removeMapLayer(tdtVecLayer)
  removeMapLayer(tdtAnnoLayer)
  removeMapLayer(tdtLayer)
  if (viewer) {
    try { viewer.destroy() } catch {}
  }
  viewer = null
  sceneView = null
  map = null
  tdtLayer = null
  tdtAnnoLayer = null
  tdtVecLayer = null
  tdtVecAnnoLayer = null
  buildingLayer = null
  hubeiTileLayer = null
  volumeCloud = null
  graphicsLayer = null
})
</script>

<style lang="scss" scoped>

.my-cesium-page {
  position: relative;
  width: 100%;
  height: calc(100vh - 110px);
  background: #07120c;
  border-radius: 8px;
  overflow: hidden;
}

.cesium-viewer-box {
  width: 100%;
  height: 100%;
}

.layer-panel {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 10;
  width: 190px;
  padding: 12px;
  background: rgba(8, 22, 15, 0.9);
  border: 1px solid #1e4a35;
  border-radius: 8px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(8px);
}

.roam-panel {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 10;
  width: 220px;
  padding: 12px;
  background: rgba(8, 22, 15, 0.9);
  border: 1px solid #1e4a35;
  border-radius: 8px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(8px);
}

.panel-title {
  color: #d7ffe7;
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 10px;
}

.roam-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.roam-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  color: #93b89f;
  font-size: 12px;
}

.layer-row {
  display: grid;
  grid-template-columns: 14px 1fr auto;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  color: #bfe7cf;
  font-size: 13px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

.legend-dot--tdt { background: #64a8ff; }
.legend-dot--tdtAnno { background: #ffcf48; }
.legend-dot--tdtVec { background: #48d6ff; }
.legend-dot--tdtVecAnno { background: #a8ff48; }
.legend-dot--building { background: #5ec49a; }
.legend-dot--hubeiTile { background: #f2cf66; }
.legend-dot--volumeCloud { background: linear-gradient(135deg, #f5fbff, #91b8d8); }
.legend-dot--heatmap { background: linear-gradient(90deg, #004cff, #ffe600, #ff3b1f); }
.legend-dot--point { background: #00ffff; border: 1px solid #fff; }
.legend-dot--boundary { background: #5483ef; box-shadow: 0 0 6px rgba(84, 131, 239, 0.6); }

.cesium-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #bfe7cf;
  font-size: 14px;
  background: rgba(7, 18, 12, 0.92);
  z-index: 20;
}

.cesium-error {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  max-width: min(680px, calc(100% - 40px));
  background: rgba(180, 40, 40, 0.9);
  color: #fff;
  padding: 9px 16px;
  border-radius: 6px;
  font-size: 13px;
  z-index: 20;
}
</style>
