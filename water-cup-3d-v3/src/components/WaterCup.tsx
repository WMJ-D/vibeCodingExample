/**
 * WaterCup.tsx
 * ----------------------------------------------
 * R3F 渲染层：消费 createWaterCup.ts 的几何/材质工厂，负责组装与自动旋转
 * 部件树与 DESIGN.md 对应：杯身 / 液体 / 杯盖 / 提带 / 提带耳 / 吸管
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  createCupGeometries,
  createCupMaterials
} from './createWaterCup'

export interface WaterCupProps {
  autoRotate?: boolean
  wireframe?: boolean
  transmissionMode?: boolean
}

export function WaterCup({
  autoRotate = true,
  wireframe = false,
  transmissionMode = true
}: WaterCupProps) {
  const group = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (group.current && autoRotate) {
      group.current.rotation.y += delta * 0.4
    }
  })

  const geometries = useMemo(() => createCupGeometries(), [])
  const materials = useMemo(
    () => createCupMaterials({ transmission: transmissionMode, wireframe }),
    [transmissionMode, wireframe]
  )

  return (
    <group ref={group} dispose={null}>
      {/* 杯身 */}
      <mesh geometry={geometries.body} material={materials.body} castShadow receiveShadow />
      {/* 杯内液体 */}
      <mesh geometry={geometries.liquid} material={materials.liquid} />
      {/* 杯盖 */}
      <mesh geometry={geometries.lid} material={materials.lid} castShadow />
      {/* 提带 */}
      <mesh geometry={geometries.strap} material={materials.strap} castShadow />
      {/* 提带耳（左右两个） */}
      <mesh position={[-0.55, 2.78, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.ear} castShadow>
        <torusGeometry args={[0.06, 0.028, 12, 24]} />
      </mesh>
      <mesh position={[0.55, 2.78, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.ear} castShadow>
        <torusGeometry args={[0.06, 0.028, 12, 24]} />
      </mesh>
      {/* 吸管（从杯盖中心斜插向上） */}
      <group position={[0.12, 2.95, -0.05]} rotation={[0.18, 0, -0.06]}>
        <mesh material={materials.straw} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 1.35, 24]} />
        </mesh>
        <mesh material={materials.straw} position={[0, 0.66, 0]}>
          <sphereGeometry args={[0.055, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
    </group>
  )
}