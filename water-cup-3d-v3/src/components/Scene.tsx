/**
 * Scene.tsx
 * ----------------------------------------------
 * Canvas 内全部 3D 内容 + 控制器（光照 / 环境 / 桌面 / 水杯 / OrbitControls）
 * 通过 forwardRef 暴露 resetCamera() 给外部触发
 */
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { WaterCup } from './WaterCup'

export interface SceneProps {
  autoRotate?: boolean
  wireframe?: boolean
  transmissionMode?: boolean
  showContactShadow?: boolean
}

export interface SceneHandle {
  resetCamera: () => void
}

const DEFAULT_CAMERA_POS: [number, number, number] = [4.2, 3.4, 4.2]
const DEFAULT_TARGET: [number, number, number] = [0, 1.6, 0]

export const Scene = forwardRef<SceneHandle, SceneProps>(function Scene(
  {
    autoRotate = true,
    wireframe = false,
    transmissionMode = true,
    showContactShadow = true
  },
  ref
) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)

  useImperativeHandle(ref, () => ({
    resetCamera() {
      camera.position.set(...DEFAULT_CAMERA_POS)
      if (controlsRef.current) {
        controlsRef.current.target.set(...DEFAULT_TARGET)
        controlsRef.current.update()
      }
    }
  }))

  return (
    <>
      <directionalLight
        position={[5, 7, 4]}
        intensity={2.4}
        color="#fff5e1"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />
      <directionalLight position={[-4, 4, -3]} intensity={0.6} color="#dbeaff" />
      <pointLight position={[0, 6, 2]} intensity={0.4} color="#fff8d8" />
      <ambientLight intensity={0.25} color="#ffffff" />

      <Environment preset="apartment" background={false} environmentIntensity={0.8} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial color="#e8dcc4" roughness={0.78} metalness={0.0} />
      </mesh>

      {showContactShadow && (
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.55}
          blur={2.4}
          scale={6}
          far={2.5}
          resolution={1024}
          color="#1a1a2e"
        />
      )}

      <group position={[0, 0, 0]}>
        <WaterCup
          autoRotate={autoRotate}
          wireframe={wireframe}
          transmissionMode={transmissionMode}
        />
      </group>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={3.2}
        maxDistance={9}
        minPolarAngle={Math.PI * 0.18}
        maxPolarAngle={Math.PI * 0.52}
        target={DEFAULT_TARGET}
      />
    </>
  )
})