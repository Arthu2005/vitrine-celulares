'use client'

import { useGLTF } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BASE_PATH } from '@/lib/site-mode'

export const MODEL_HEIGHT = 1.6

type Props = {
  url: string
  tint?: string
  tintMaterial?: string
  children?: React.ReactNode
  onReady?: () => void
  onPick?: (position: [number, number, number], normal: [number, number, number]) => void
  /** Sobe do ângulo de entrada até a posição final, uma vez. */
  intro?: boolean
  onMaterials?: (names: string[]) => void
}

const round = (n: number) => Math.round(n * 100000) / 100000

export const PhoneModel = forwardRef<THREE.Group, Props>(function PhoneModel({ url, tint, tintMaterial, children, onReady, onPick, intro, onMaterials }, ref) {
  const { scene } = useGLTF(url, `${BASE_PATH}/draco/`, true)
  const inner = useRef<THREE.Group>(null)
  useImperativeHandle(ref, () => inner.current!)

  const { clone, scale, offset, materials } = useMemo(() => {
    const copy = scene.clone(true)
    const seen = new Map<THREE.Material, THREE.Material>()
    copy.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh) return
      const source = mesh.material as THREE.Material
      if (!seen.has(source)) seen.set(source, source.clone())
      mesh.material = seen.get(source)!
    })
    copy.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(copy)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const largest = Math.max(size.x, size.y, size.z) || 1
    return { clone: copy, scale: MODEL_HEIGHT / largest, offset: center.negate(), materials: [...seen.values()] }
  }, [scene])

  useLayoutEffect(() => {
    const names = (tintMaterial ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    if (!tint || !names.length) return
    for (const m of materials) {
      if (names.includes(m.name)) (m as THREE.MeshStandardMaterial).color.set(tint)
    }
  }, [materials, tint, tintMaterial])

  useEffect(() => {
    onReady?.()
    onMaterials?.(materials.map((m) => m.name).filter(Boolean))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials])

  const introProgress = useRef(intro ? 0 : 1)
  useFrame((_, delta) => {
    if (!inner.current || introProgress.current >= 1) return
    introProgress.current = Math.min(1, introProgress.current + delta / 1.4)
    const eased = 1 - Math.pow(1 - introProgress.current, 3)
    inner.current.rotation.y = (1 - eased) * -1.1
    inner.current.position.y = (1 - eased) * -0.12
  })

  const pick = (e: ThreeEvent<MouseEvent>) => {
    if (!onPick || !inner.current) return
    e.stopPropagation()
    const local = inner.current.children[0].worldToLocal(e.point.clone())
    const normal = (e.face?.normal.clone() ?? new THREE.Vector3(0, 0, 1)).transformDirection(e.object.matrixWorld)
    onPick([round(local.x), round(local.y), round(local.z)], [round(normal.x), round(normal.y), round(normal.z)])
  }

  return (
    <group ref={inner}>
      <group scale={scale} position={offset.clone().multiplyScalar(scale)}>
        <primitive object={clone} onClick={onPick ? pick : undefined} />
        {children}
      </group>
    </group>
  )
})
