/**
 * App.tsx
 * ----------------------------------------------
 * 顶层容器：左侧 ControlPanel，中央 Canvas，右侧 InfoCard
 * 通过 forwardRef 把 Scene 的 resetCamera 暴露给 ControlPanel
 */
import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Scene, type SceneHandle } from './components/Scene'
import { ControlPanel } from './components/ControlPanel'
import { InfoCard } from './components/InfoCard'

export default function App() {
  const [autoRotate, setAutoRotate] = useState(true)
  const [wireframe, setWireframe] = useState(false)
  const [transmissionMode, setTransmissionMode] = useState(true)

  // 让 ControlPanel 能通过 handle 触发 Scene 内部的重置
  const sceneRef = useRef<SceneHandle>(null)

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#1a1a2e]">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0
        }}
        camera={{ position: [4.2, 3.4, 4.2], fov: 38, near: 0.1, far: 100 }}
      >
        <color attach="background" args={['#1a1a2e']} />
        <fog attach="fog" args={['#1a1a2e', 12, 24]} />

        <Scene
          ref={sceneRef}
          autoRotate={autoRotate}
          wireframe={wireframe}
          transmissionMode={transmissionMode}
        />
      </Canvas>

      <ControlPanel
        autoRotate={autoRotate}
        wireframe={wireframe}
        transmissionMode={transmissionMode}
        onAutoRotateChange={setAutoRotate}
        onWireframeChange={setWireframe}
        onTransmissionChange={setTransmissionMode}
        onResetCamera={() => sceneRef.current?.resetCamera()}
      />

      <InfoCard partsCount={6} />

      <div className="fixed top-4 right-4 z-10 px-4 py-2 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-slate-200 text-sm font-medium">
        Water Cup 3D · v3
      </div>
    </div>
  )
}