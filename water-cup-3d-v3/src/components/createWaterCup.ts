/**
 * createWaterCup.ts
 * ----------------------------------------------
 * 纯 Three.js 几何 + 材质工厂（不依赖 R3F / React）
 * 从参考图程序化重建"手提塑料水杯"，详见 DESIGN.md
 *
 * 约定（img2threejs factory 模式）：
 *  - 重建数据（轮廓点 / 曲线 / PBR 参数）与渲染器对象分离
 *  - 命名与 DESIGN.md 部件树一一对应
 */
import * as THREE from 'three'

// ---------------------------------------------------------------------------
// 调色板（取自参考图）
// ---------------------------------------------------------------------------
export const CUP_PALETTE = {
  bodyTop: '#ffdca0', // 杯身顶部奶黄
  bodyBottom: '#f78a2a', // 杯身底部橙黄
  liquid: '#ffc34d', // 内部液体琥珀
  lid: '#f6a821', // 杯盖橙黄
  strap: '#7b4fc8', // 提带紫色
  strapDark: '#5c3aa0', // 提带暗部
  straw: '#ffcf66', // 吸管黄
  ear: '#e8d6ff' // 提带耳浅紫
} as const

// ---------------------------------------------------------------------------
// 各部件轮廓（[半径, 高度]）
// ---------------------------------------------------------------------------
export const BODY_PROFILE: [number, number][] = [
  [0.0, 0.0], // 杯底中心（封底）
  [0.9, 0.0], // 杯底边缘
  [0.98, 0.12], // 杯底圆角
  [1.0, 0.4], // 杯身下段
  [1.0, 1.8], // 杯身主段
  [0.985, 2.25], // 轻微收口
  [0.955, 2.6], // 杯口
  [0.975, 2.66], // 翻边外扩
  [0.965, 2.72] // 翻边顶
]

export const LIQUID_PROFILE: [number, number][] = [
  [0.0, 0.2], // 液面底部（封底）
  [0.86, 0.2],
  [0.88, 0.4],
  [0.88, 1.5], // 液面高度
  [0.0, 1.52] // 液面中心（封顶）
]

export const LID_PROFILE: [number, number][] = [
  [0.0, 2.72], // 盖底中心
  [0.965, 2.72], // 盖底
  [0.98, 2.8], // 盖圆角外扩
  [0.9, 2.88], // 盖顶内收
  [0.84, 2.95], // 盖顶
  [0.0, 2.97] // 盖顶中心
]

// 提带曲线（从一侧杯盖耳，拱形跨过杯盖顶部，到另一侧）
export const STRAP_CURVE = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-0.55, 2.78, 0),
    new THREE.Vector3(-0.62, 3.3, 0.02),
    new THREE.Vector3(0, 3.62, 0),
    new THREE.Vector3(0.62, 3.3, 0.02),
    new THREE.Vector3(0.55, 2.78, 0)
  ],
  false,
  'catmullrom',
  0.5
)

// ---------------------------------------------------------------------------
// 几何工厂
// ---------------------------------------------------------------------------

/** 为 LatheGeometry 写入 y 轴渐变顶点色（顶部 → 底部线性插值） */
export function latheWithGradient(
  points: [number, number][],
  topColor: THREE.ColorRepresentation,
  bottomColor: THREE.ColorRepresentation,
  segments = 48
): THREE.BufferGeometry {
  const vec2 = points.map(([x, y]) => new THREE.Vector2(x, y))
  const geo = new THREE.LatheGeometry(vec2, segments)

  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)

  let minY = Infinity
  let maxY = -Infinity
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  const top = new THREE.Color(topColor)
  const bottom = new THREE.Color(bottomColor)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const t = (y - minY) / (maxY - minY || 1)
    c.copy(bottom).lerp(top, t)
    colors[i * 3 + 0] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

export function createCupGeometries() {
  return {
    body: latheWithGradient(BODY_PROFILE, CUP_PALETTE.bodyTop, CUP_PALETTE.bodyBottom, 64),
    liquid: latheWithGradient(LIQUID_PROFILE, '#ffd27a', '#ff9e2e', 48),
    lid: latheWithGradient(LID_PROFILE, '#f8b438', '#ef9c18', 48),
    strap: new THREE.TubeGeometry(STRAP_CURVE, 64, 0.045, 16, false)
  }
}

// ---------------------------------------------------------------------------
// 材质工厂（transmission 与 wireframe 可切换，供 UI 控制）
// ---------------------------------------------------------------------------
export function createCupMaterials(opts: { transmission?: boolean; wireframe?: boolean }) {
  const { transmission = true, wireframe = false } = opts

  return {
    body: new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      transmission: transmission ? 0.85 : 0,
      transparent: true,
      roughness: 0.18,
      metalness: 0,
      ior: 1.46,
      thickness: 0.5,
      attenuationColor: new THREE.Color(CUP_PALETTE.bodyBottom),
      attenuationDistance: 1.6,
      clearcoat: 0.4,
      clearcoatRoughness: 0.25,
      side: THREE.DoubleSide,
      wireframe
    }),
    liquid: new THREE.MeshPhysicalMaterial({
      color: CUP_PALETTE.liquid,
      transmission: transmission ? 1.0 : 0,
      transparent: true,
      roughness: 0.05,
      metalness: 0,
      ior: 1.33,
      thickness: 1.2,
      attenuationColor: new THREE.Color('#ff9e2e'),
      attenuationDistance: 0.9,
      wireframe
    }),
    lid: new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.42,
      metalness: 0.02,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
      sheen: 0.3,
      sheenColor: new THREE.Color('#fff2d0'),
      wireframe
    }),
    strap: new THREE.MeshPhysicalMaterial({
      color: CUP_PALETTE.strap,
      roughness: 0.55,
      metalness: 0,
      sheen: 0.35,
      sheenColor: new THREE.Color('#b08ef0'),
      wireframe
    }),
    straw: new THREE.MeshPhysicalMaterial({
      color: CUP_PALETTE.straw,
      transmission: transmission ? 0.6 : 0,
      transparent: true,
      roughness: 0.2,
      metalness: 0,
      ior: 1.45,
      thickness: 0.3,
      wireframe
    }),
    ear: new THREE.MeshStandardMaterial({
      color: CUP_PALETTE.ear,
      roughness: 0.5,
      metalness: 0,
      wireframe
    })
  }
}

/** 部件清单（供 InfoCard 展示 / 未来拆解） */
export const CUP_PART_NAMES = ['杯身', '杯内液体', '杯盖', '紫色提带', '提带耳 ×2', '吸管'] as const
export const CUP_PART_COUNT = CUP_PART_NAMES.length
