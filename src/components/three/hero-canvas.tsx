'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { PhoneModel } from './phone-model'
import { Studio } from './studio'

function Turntable({ url, tint, tintMaterial, scrollRef, onReady }: { url: string; tint?: string; tintMaterial?: string; scrollRef: React.RefObject<number>; onReady: () => void }) {
  const group = useRef<THREE.Group>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const reduced = useRef(false)

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      pointer.current = { x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 }
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  useFrame(({ clock }, delta) => {
    if (!group.current) return
    const k = 1 - Math.exp(-delta * 4)
    const drift = reduced.current ? 0 : Math.sin(clock.elapsedTime * 0.35) * 0.16
    const targetY = -0.5 + drift + pointer.current.x * 0.45 + scrollRef.current * 1.9
    const targetX = 0.05 + pointer.current.y * 0.14
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetY, k)
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetX, k)
    if (!reduced.current) group.current.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.012
  })

  return (
    <group ref={group} rotation={[0.05, -1.3, 0]}>
      <PhoneModel url={url} tint={tint} tintMaterial={tintMaterial} onReady={onReady} />
    </group>
  )
}

export default function HeroCanvas(props: { url: string; tint?: string; tintMaterial?: string; scrollRef: React.RefObject<number>; onReady: () => void }) {
  return (
    <Canvas dpr={[1, 1.6]} camera={{ fov: 20, position: [0, 0, 5.4] }} gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
      <Studio />
      <Suspense fallback={null}>
        <Turntable {...props} />
      </Suspense>
    </Canvas>
  )
}
