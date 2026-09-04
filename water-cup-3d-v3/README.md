# Water Cup 3D · v3

> 基于参考图（琥珀色塑料水杯 + 黄色杯盖 + 紫色提带 + 黄色吸管）程序化重建的 Three.js 3D 模型。

## 项目定位

- 独立工程，放在 `vibeCodingExample/water-cup-3d-v3/`，**不动原有的 `file-preview-demo / liquid-glass-studio / lumora-focus` 等工程**。
- 同一父目录下多工程并存的写法：`vite.config.ts` 中显式 `emptyOutDir: false`，避免父子工程互相清空（参考 `webapp-build-sync` 经验）。
- 目标精度：卡通 / 风格化重建，重点还原"半透明琥珀色塑料杯 + 黄色盖 + 紫色提带"三大色块与体积关系，**不是工业级 PBR 反向渲染**。

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| 3D | Three.js 0.169 + @react-three/fiber 8 + drei 9 |
| 样式 | Tailwind CSS 3 |
| 状态 | React useState（轻量） |

## 目录结构

```text
water-cup-3d-v3/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig.json / tsconfig.app.json / tsconfig.node.json
├─ tailwind.config.js / postcss.config.js
├─ README.md
├─ DESIGN.md
└─ src/
   ├─ main.tsx                 # React 入口
   ├─ App.tsx                  # Canvas + UI 拼装
   ├─ index.css                # Tailwind + 全局样式
   ├─ components/
   │  ├─ createWaterCup.ts     # ★ 程序化几何工厂（纯 Three.js）
   │  ├─ WaterCup.tsx          # R3F 渲染层（自动旋转 / 材质切换）
   │  ├─ Scene.tsx             # 光照 / 环境 / 桌面 / OrbitControls
   │  ├─ ControlPanel.tsx      # 左上角 UI（旋转 / 线框 / 透明 / 重置）
   │  └─ InfoCard.tsx          # 右下角模型信息
   └─ styles/
```

## 启动

```bash
cd vibeCodingExample/water-cup-3d-v3
npm install    # 或 pnpm install
npm run dev    # 默认端口 5180
npm run build  # tsc + vite build
```

## 部件 / 几何来源

| 部件 | 几何 | 关键材质参数 |
| --- | --- | --- |
| 杯身 | `LatheGeometry`（9 个轮廓点 × 96 段） | `MeshPhysicalMaterial`: transmission 0.85, ior 1.46, attenuationColor 渐变 |
| 杯内液体 | `LatheGeometry`（6 点 × 64 段） | `MeshPhysicalMaterial`: transmission 0.45, attenuationColor 橙色 |
| 杯盖 | `LatheGeometry`（6 点 × 64 段） | 黄色，`roughness 0.42`，sheen 0.3 |
| 紫色提带 | `TubeGeometry`（CatmullRom 6 控制点 × 64 段） + 两侧 Cylinder 凸耳 | 紫色，clearcoat 0.3，sheen 0.4 |
| 吸管 | `CylinderGeometry`（openEnded）+ `SphereGeometry` 半球顶 | 半透明黄色，transmission 0.5 |
| 桌面板 | `CircleGeometry`(r=6) | `meshStandardMaterial` 浅米色 |
| 接触阴影 | drei `ContactShadows` | 不投射阴影时减弱 |

## 与原图差异 / 已知不还原项

- 杯身印刷字（"CHER..." 黑色字母）未做贴图还原 —— 仅作为后续装饰项预留。
- 杯底内凹底盘的几何精度做了简化（原图底盘边缘有一圈薄边）。
- 隐藏面（背面 / 杯底内侧）依靠 `side: DoubleSide` + `transmission` 透出，单视图无法保证完全准确。

## 性能 / 资源

- 默认无外部贴图，全部走 PBR 材质 + `drei Environment('apartment')` IBL。
- 96 段 Lathe + 64 段 Tube，单 cup 三角面约 1.2 万，可在笔记本 60fps 流畅。

## 下一步可选

- [ ] 杯身印刷字贴图（CanvasTexture 程序化生成）
- [ ] 点击部件高亮 / 拆解爆炸视图
- [ ] 第一人称拖拽相机观察杯内液体
- [ ] 参考图投影 → 杯身贴图（projection-first 路径）