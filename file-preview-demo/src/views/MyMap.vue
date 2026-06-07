<!--
 * @Author: WangMingJun 2351405492@qq.com
 * @Date: 2026-06-06 17:42:23
 * @LastEditors: WangMingJun 2351405492@qq.com
 * @LastEditTime: 2026-06-07 10:36:36
 * @FilePath: \copilot测试\file-preview-demo\src\views\MyMap.vue
 * @Description: 我的地图页面
-->
<template>
  <div class="my-map-page">
    <section class="my-map-page__hero">
      <div class="my-map-page__eyebrow">L7 · Boundary Atlas</div>
      <h1 class="my-map-page__title">我的地图</h1>
      <p class="my-map-page__desc">行政区块填色、边界高亮、未定边界虚线标识，点击区块即可查看名称与编号。</p>
    </section>

    <div class="my-map-page__panel">
      <div class="my-map-page__panel-header">
        <div>
          <span class="my-map-page__panel-kicker">China Geo Layer</span>
          <h2 class="my-map-page__panel-title">行政边界可视化</h2>
        </div>
        <div class="my-map-page__status">
          <span class="my-map-page__status-dot"></span>
          实时渲染
        </div>
      </div>

      <!-- L7 地图渲染容器，必须给明确高度，否则地图无法显示 -->
      <div ref="mapContainerRef" class="my-map-page__container"></div>

      <div class="my-map-page__legend">
        <div class="my-map-page__legend-title">图例 / 显影控制</div>
        <button
          v-for="item in layerControlOptions"
          :key="item.key"
          :class="['my-map-page__legend-item', { 'is-hidden': !layerVisible[item.key] }]"
          type="button"
          @click="toggleLayerVisible(item.key)"
        >
          <span :class="['my-map-page__legend-swatch', `my-map-page__legend-swatch--${item.key}`]"></span>
          <span class="my-map-page__legend-label">{{ item.label }}</span>
          <span class="my-map-page__legend-state">{{ layerVisible[item.key] ? '显示' : '隐藏' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { LineLayer, LayerPopup, PolygonLayer, Scene } from '@antv/l7'
import { GaodeMap } from '@antv/l7-maps'
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const mapContainerRef = ref(null)
const boundaryDataUrl = 'https://mdn.alipayobjects.com/antforest/afts/file/A*vaL-R4SU18IAAAAAgCAAAAgAerd2AQ/original_2025-11-14.json'
const layerVisible = reactive({
  fill: true,
  boundary: true,
  undelimited: true,
  wall: true,
})
const layerControlOptions = [
  { key: 'fill', label: '行政区划' },
  { key: 'boundary', label: '边界线' },
  { key: 'undelimited', label: '未定边界' },
  { key: 'wall', label: '墙体效果' },
]
const layerMap = new Map()
let scene = null

/** 创建 GeoJSON 数据集合，便于 L7 分层消费 */
function createFeatureCollection(features) {
  return {
    type: 'FeatureCollection',
    features,
  }
}

/** 按示例数据拆分行政区、边界线与未定边界 */
function normalizeBoundaryData(data) {
  const features = data?.features || []
  const fillData = features.filter((feature) => feature.properties?.name !== '境界线')
  const boundaryData = features.filter((feature) => feature.properties?.gb !== '003')
  const undelimitedBoundary = features.filter((feature) => feature.properties?.name === '境界线' || feature.properties?.gb === '003')

  return {
    fillData: createFeatureCollection(fillData),
    boundaryData: createFeatureCollection(boundaryData),
    undelimitedBoundary: createFeatureCollection(undelimitedBoundary),
  }
}

/** 缓存图层实例，并按当前开关状态同步显隐 */
function registerLayer(key, layer) {
  layerMap.set(key, layer)
  setLayerVisible(layer, layerVisible[key])
}

/** 控制单个 L7 图层显隐 */
function setLayerVisible(layer, visible) {
  if (!layer) return
  if (visible) {
    layer.show?.()
  } else {
    layer.hide?.()
  }
}

/** 切换图层显影状态 */
function handleLayerVisibleChange(key) {
  setLayerVisible(layerMap.get(key), layerVisible[key])
}

/** 点击图例时同步切换对应图层显影 */
function toggleLayerVisible(key) {
  layerVisible[key] = !layerVisible[key]
  handleLayerVisibleChange(key)
}

/** 初始化行政边界地图 */
function initChinaMap() {
  scene = new Scene({
    id: mapContainerRef.value,
    map:  new GaodeMap({
        style: 'dark',
        center: [107.054293, 35.246265],
        zoom: 4.056,
        token:'a8e81da7ea52bff36039efd35fbd23b7',
      }),
    });

  scene.on('loaded', async () => {
    const response = await fetch(boundaryDataUrl)
    const data = await response.json()
    const { fillData, boundaryData, undelimitedBoundary } = normalizeBoundaryData(data)

    // 行政区块使用半透明蓝紫底色，悬停/点击时提升识别度
    const fillLayer = new PolygonLayer({ autoFit: true })
      .source(fillData)
      .color('#d6dff6')
      .shape('fill')
      .active({
        color: '#5483ef',
      })
      .style({
        opacity: 0.54,
      })

    // 边界线单独成层，保证区块边缘在深色面板里依旧锋利
    const boundaryLayer = new PolygonLayer({ autoFit: true, zIndex: 2 })
      .source(boundaryData)
      .color('#5483ef')
      .shape('line')
      .size(0.6)
      .style({
        opacity: 1,
      })

    // 未定边界沿用示例里的红色虚线表达，降低误读风险
    const undelimitedBoundaryLayer = new PolygonLayer({ zIndex: 3 })
      .source(undelimitedBoundary)
      .color('#ff2f6d')
      .shape('line')
      .size(1.2)
      .style({
        opacity: 1,
        lineType: 'dash',
        dashArray: [5, 5],
      })

    const layerPopup = new LayerPopup({
      trigger: 'click',
      items: [
        {
          layer: fillLayer,
          fields: [
            {
              field: 'name',
              formatField: () => '名称',
            },
            {
              field: 'gb',
              formatField: () => '编号',
              formatValue: (val) => val || '暂无',
            },
          ],
        },
      ],
    })

    const layer = new LineLayer({}).source(fillData).size(40).shape('wall').style({
        opacity: 1,
        sourceColor: '#0DCCFF',
        targetColor: 'rgba(255,255,255, 0)',
      });

    scene.addLayer(layer)
    scene.addLayer(fillLayer)
    scene.addLayer(boundaryLayer)
    scene.addLayer(undelimitedBoundaryLayer)

    registerLayer('wall', layer)
    registerLayer('fill', fillLayer)
    registerLayer('boundary', boundaryLayer)
    registerLayer('undelimited', undelimitedBoundaryLayer)

    scene.addPopup(layerPopup)
  })
}

onMounted(() => {
  initChinaMap()
})

onBeforeUnmount(() => {
  // 离开页面时销毁地图实例，避免重复进入页面造成 WebGL 资源泄漏
  scene?.destroy()
  scene = null
})
</script>

<style lang="scss" scoped>
.my-map-page {
  position: relative;
  min-height: 100vh;
  padding: 28px;
  overflow: hidden;
  color: #f7fbff;
  background:
    radial-gradient(circle at 8% 8%, rgba(255, 47, 109, 0.34), transparent 28%),
    radial-gradient(circle at 84% 18%, rgba(84, 131, 239, 0.34), transparent 32%),
    linear-gradient(135deg, #07111f 0%, #0d1932 48%, #12172a 100%);

  &::before {
    position: absolute;
    inset: 0;
    pointer-events: none;
    content: '';
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
    background-size: 42px 42px;
    mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.85), transparent 78%);
  }

  &__hero,
  &__panel {
    position: relative;
    z-index: 1;
  }

  &__hero {
    max-width: 860px;
    margin-bottom: 22px;
  }

  &__eyebrow {
    display: inline-flex;
    padding: 7px 12px;
    margin-bottom: 12px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #9fd4ff;
    border: 1px solid rgba(159, 212, 255, 0.34);
    border-radius: 999px;
    background: rgba(9, 22, 44, 0.72);
    backdrop-filter: blur(12px);
  }

  &__title {
    margin: 0;
    font-size: clamp(40px, 7vw, 86px);
    line-height: 0.92;
    letter-spacing: -0.08em;
    text-shadow: 0 18px 46px rgba(84, 131, 239, 0.36);
  }

  &__desc {
    max-width: 640px;
    margin: 16px 0 0;
    font-size: 15px;
    line-height: 1.8;
    color: rgba(247, 251, 255, 0.72);
  }

  &__panel {
    height: calc(100vh - 220px);
    min-height: 520px;
    overflow: hidden;
    border: 1px solid rgba(159, 212, 255, 0.2);
    border-radius: 30px;
    background: rgba(6, 14, 28, 0.72);
    box-shadow:
      0 34px 90px rgba(0, 0, 0, 0.42),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(18px);
  }

  &__panel-header {
    position: absolute;
    top: 22px;
    right: 22px;
    left: 22px;
    z-index: 3;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    pointer-events: none;
  }

  &__panel-kicker {
    display: block;
    margin-bottom: 6px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.18em;
    color: #ff8fb1;
    text-transform: uppercase;
  }

  &__panel-title {
    margin: 0;
    font-size: 24px;
    letter-spacing: -0.04em;
  }

  &__status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    font-size: 13px;
    color: rgba(247, 251, 255, 0.84);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 999px;
    background: rgba(3, 9, 20, 0.56);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
  }

  &__status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #5dffbd;
    box-shadow: 0 0 18px rgba(93, 255, 189, 0.88);
  }

  &__container {
    width: 100%;
    height: 100%;
    filter: saturate(1.08) contrast(1.02);
  }

  &__layer-control {
    position: absolute;
    top: 92px;
    left: 22px;
    z-index: 3;
    display: grid;
    gap: 10px;
    min-width: 150px;
    padding: 14px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 18px;
    background: rgba(3, 9, 20, 0.68);
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.32);
    backdrop-filter: blur(14px);
  }

  &__layer-control-title {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #9fd4ff;
  }

  &__layer-control-item {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-size: 12px;
    color: rgba(247, 251, 255, 0.82);
    cursor: pointer;
    user-select: none;

    input {
      width: 15px;
      height: 15px;
      margin: 0;
      accent-color: #5483ef;
      cursor: pointer;
    }
  }

  &__layer-control-mark {
    display: inline-block;
    width: 18px;
    height: 8px;
    border-radius: 999px;

    &--fill {
      background: rgba(214, 223, 246, 0.72);
    }

    &--boundary {
      height: 3px;
      background: #5483ef;
    }

    &--undelimited {
      height: 3px;
      background: repeating-linear-gradient(90deg, #ff2f6d 0 5px, transparent 5px 9px);
    }

    &--wall {
      background: linear-gradient(90deg, #0dccff, transparent);
      box-shadow: 0 0 12px rgba(13, 204, 255, 0.68);
    }
  }

  &__legend {
    position: absolute;
    right: 24px;
    bottom: 24px;
    z-index: 3;
    display: grid;
    gap: 10px;
    min-width: 188px;
    padding: 14px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 18px;
    background: rgba(3, 9, 20, 0.68);
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.32);
    backdrop-filter: blur(14px);
  }

  &__legend-title {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #9fd4ff;
  }

  &__legend-item {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 0;
    font-size: 12px;
    color: rgba(247, 251, 255, 0.78);
    cursor: pointer;
    border: 0;
    background: transparent;
    transition: opacity 0.2s ease, filter 0.2s ease;

    &.is-hidden {
      opacity: 0.42;
      filter: grayscale(1);
    }
  }

  &__legend-state {
    padding: 2px 7px;
    font-size: 11px;
    color: rgba(247, 251, 255, 0.68);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
  }

  &__legend-swatch {
    display: inline-block;
    width: 28px;
    height: 10px;
    border-radius: 999px;

    &--fill {
      background: rgba(214, 223, 246, 0.72);
      box-shadow: 0 0 16px rgba(84, 131, 239, 0.42);
    }

    &--boundary {
      height: 3px;
      background: #5483ef;
      box-shadow: 0 0 12px rgba(84, 131, 239, 0.72);
    }

    &--undelimited {
      height: 3px;
      background: repeating-linear-gradient(90deg, #ff2f6d 0 6px, transparent 6px 11px);
      box-shadow: 0 0 12px rgba(255, 47, 109, 0.72);
    }

    &--wall {
      background: linear-gradient(90deg, #0dccff, transparent);
      box-shadow: 0 0 14px rgba(13, 204, 255, 0.72);
    }
  }
}
:deep(.l7-popup){
    color: #07111f !important;
}
</style>
