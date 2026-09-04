# Design · Water Cup 3D v3

> 本文档记录程序化重建过程的决策与折中，便于 v4 / 后续迭代回溯。

## 1. 整体设计决策

| 维度 | 决策 | 原因 |
| --- | --- | --- |
| 渲染管线 | React + R3F（不是裸 Three.js） | 跟现有 `liquid-glass-studio` 风格统一，减少学习成本 |
| 几何来源 | 100% 程序化（Lathe / Tube / Cylinder / Sphere） | 无外部模型资源；可控、可调、便于后续演化 |
| 材质路线 | MeshPhysicalMaterial + vertex color 渐变 + transmission | 还原"半透明塑料"质感需要 IBL + 折射 |
| IBL | drei `Environment` preset `apartment` | 室内暖色调匹配原图；无需外部 HDR |
| 精度 | 卡通 / 风格化（不是工业级 PBR） | 单视图无法准确反推真实 PBR；过度追求偏离项目定位 |

## 2. 部件拆解

按视觉层级拆为 6 个独立部件（与 `createWaterCup.ts` 中的命名一一对应）：

```
WaterCup (root)
├─ CupBody       — LatheGeometry + 渐变顶点色
├─ CupLiquid     — LatheGeometry + 透射 + 衰减色
├─ CupLid        — LatheGeometry
├─ Strap         — TubeGeometry(CatmullRom)
├─ StrapEar × 2  — CylinderGeometry
└─ Straw + StrawTip — CylinderGeometry + SphereGeometry 半顶
```

## 3. 关键参数 / 调参

### 杯身轮廓（归一化半径 = 1.0）

```
y = 0.00, r = 0.92   杯底外圈起点
y = 0.04, r = 1.00   杯底封边
y = 0.12, r = 1.00   杯底上沿
y = 1.40, r = 1.00   主杯身
y = 1.90, r = 0.99   轻微收口
y = 2.70, r = 0.97
y = 3.20, r = 0.95   杯口
y = 3.22, r = 0.97   翻边
y = 3.26, r = 0.98   翻边顶
```

### 杯身 PBR

- `transmission: 0.85` — 强透射，看到液体
- `thickness: 0.6` — 折射厚度
- `ior: 1.46` — PET 塑料
- `attenuationColor: bodyBottomColor` + `attenuationDistance: 1.6` — 杯底更深（"沉底色"）
- `clearcoat: 0.4` — 表面微光泽

### 顶点色渐变

cup body 用 `BufferAttribute('color')` 写入 y 轴线性插值：顶部 = `bodyTopColor`，底部 = `bodyBottomColor`。比纯 vertex color + 单一材质更有层次。

## 4. 光照 / 渲染

- 主光：directional，位置 `(5, 7, 4)`，色 `#fff5e1`，强度 2.4
- 补光：directional，位置 `(-4, 4, -3)`，色 `#dbeaff`，强度 0.6
- 顶部高光：pointLight，位置 `(0, 6, 2)`，强度 0.4
- 环境：ambient 0.25 + drei Environment apartment 0.8
- 渲染：toneMapping = ACESFilmic，exposure = 1.0

## 5. 交互

- OrbitControls：禁用 pan，限制 polar angle `[0.18π, 0.52π]`，距离 `[3.2, 9]`
- 自动旋转：`useFrame` 累加 `rotation.y += 0.4 * delta`
- 重置视角：forwardRef + useImperativeHandle 暴露 `resetCamera()`
- UI 面板：Tailwind 自绘，左上角浮动；Esc 折叠

## 6. 已知偏差（透明声明）

参考 img2threejs 的 "Transparency and Process Debugging" 原则，下面是**未完全还原**的特征：

1. **杯身印刷字** "CHER..." 黑色字母 — 原图清晰可见，v3 **未做贴图**，纯色杯身
2. **杯底内凹边缘薄边** — 原图底盘有一圈白色薄边，v3 简化为内凹底盘
3. **吸管弯曲形状** — 原图吸管是中段略弯的"曲别针"形状，v3 简化为直管
4. **杯盖顶部纹理** — 原图盖面有细微的磨砂质感，v3 用 sheen 近似

这些在 v4 可以加上：
- CanvasTexture 程序化生成杯身字（单字渲染）
- TubeGeometry 自定义曲线让吸管带轻微弯曲
- 杯盖 roughness map 增加磨砂

## 7. 与上版本差异

`v3` 是独立的工程目录，**没有从 v1 / v2 迁移代码**（按用户要求"原本的工程文件不动"）。

如果后续要在 v3 基础上迭代，可以：
- 在 `src/components/` 下追加 `createWaterCup.ts` 的姊妹文件 `createWaterCupV2.ts`
- 通过 leva 暴露参数面板做 A/B 对比