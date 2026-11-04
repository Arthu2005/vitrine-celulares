'use client'

import { Html, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitImpl } from 'three-stdlib'
import type { Hotspot } from '@/lib/types'
import { PhoneModel } from './phone-model'
import { Studio } from './studio'

export type ViewName = 'inicio' | 'frente' | 'costas' | 'lateral'

const VIEWS: Record<ViewName, THREE.Vector3> = {
  inicio: new THREE.Vector3(-0.42, 0.14, 0.9),
  frente: new THREE.Vector3(0, 0, 1),
  costas: new THREE.Vector3(0, 0, -1),
  lateral: new THREE.Vector3(1, 0.06, 0.02),
}

const DISTANCE = 5.2
const MIN = 2.6
const MAX = 6.4

export type ViewerCommand = { type: 'view'; view: ViewName; n: number } | { type: 'zoom'; dir: 1 | -1; n: number } | { type: 'face'; normal: [number, number, number]; n: number }

function Rig({ command, autoRotate, onUserMove }: { command: ViewerCommand | null; autoRotate: boolean; onUserMove: () => void }) {
  const camera = useThree((s) => s.camera)
  const controls = useRef<OrbitImpl>(null)
  const target = useRef<THREE.Vector3 | null>(null)
  const distance = useRef(DISTANCE)

  useEffect(() => {
    if (!command) return
    const now = camera.position.length()
    if (command.type === 'zoom') {
      distance.current = THREE.MathUtils.clamp(now + command.dir * -0.7, MIN, MAX)
      target.current = camera.position.clone().normalize()
    } else if (command.type === 'view') {
      distance.current = DISTANCE
      target.current = VIEWS[command.view].clone().normalize()
    } else {
      distance.current = 4.1
      target.current = new THREE.Vector3(...command.normal).add(new THREE.Vector3(0.12, 0.08, 0)).normalize()
    }
  }, [command, camera])

  useFrame((_, delta) => {
    if (!target.current) return
    const k = 1 - Math.exp(-delta * 5)
    const dir = camera.position.clone().normalize().lerp(target.current, k).normalize()
    const len = THREE.MathUtils.lerp(camera.position.length(), distance.current, k)
    camera.position.copy(dir.multiplyScalar(len))
    camera.lookAt(0, 0, 0)
    controls.current?.update()
    if (camera.position.clone().normalize().distanceTo(target.current) < 0.004 && Math.abs(len - distance.current) < 0.01) target.current = null
  })

  return (
    <OrbitControls
      ref={controls as never}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.7}
      minDistance={MIN}
      maxDistance={MAX}
      autoRotate={autoRotate}
      autoRotateSpeed={0.9}
      onStart={() => {
        target.current = null
        onUserMove()
      }}
    />
  )
}

function Marker({ hotspot, active, index, onSelect }: { hotspot: Hotspot; active: boolean; index: number; onSelect: () => void }) {
  const camera = useThree((s) => s.camera)
  const el = useRef<HTMLButtonElement>(null)
  const normal = useRef(new THREE.Vector3(...hotspot.normal))
  const group = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!el.current || !group.current) return
    // Esconde o ponto quando ele está do outro lado do aparelho.
    const world = group.current.getWorldPosition(new THREE.Vector3())
    const toCamera = camera.position.clone().sub(world).normalize()
    const facing = normal.current.dot(toCamera) > 0.12
    el.current.style.opacity = facing ? '1' : '0'
    el.current.style.pointerEvents = facing ? 'auto' : 'none'
    el.current.tabIndex = facing ? 0 : -1
  })

  return (
    <group ref={group} position={hotspot.position}>
      <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <button ref={el} type="button" className="hotspot" data-active={active} aria-label={hotspot.label} onClick={onSelect}>
          <span>{index + 1}</span>
        </button>
      </Html>
    </group>
  )
}

export type ViewerProps = {
  url: string
  tint?: string
  tintMaterial?: string
  hotspots?: Hotspot[]
  activeHotspot?: string | null
  onSelectHotspot?: (id: string) => void
  command?: ViewerCommand | null
  autoRotate?: boolean
  onReady?: () => void
  onUserMove?: () => void
  onPick?: (position: [number, number, number], normal: [number, number, number]) => void
  onMaterials?: (names: string[]) => void
}

export default function ViewerCanvas({ url, tint, tintMaterial, hotspots = [], activeHotspot, onSelectHotspot, command = null, autoRotate = false, onReady, onUserMove, onPick, onMaterials }: ViewerProps) {
  const wrap = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const reduced = useRef(false)

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '120px' })
    if (wrap.current) io.observe(wrap.current)
    return () => io.disconnect()
  }, [])

  // A roda do mouse continua rolando a página. Zoom fica nos botões, na pinça e em Ctrl + roda.
  useEffect(() => {
    const node = wrap.current
    if (!node) return
    const stop = (e: WheelEvent) => {
      if (!e.ctrlKey) e.stopPropagation()
    }
    node.addEventListener('wheel', stop, { capture: true })
    return () => node.removeEventListener('wheel', stop, { capture: true })
  }, [])

  return (
    <div ref={wrap} className="h-full w-full">
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, 1.75]}
        camera={{ fov: 22, near: 0.1, far: 30, position: VIEWS.inicio.clone().normalize().multiplyScalar(DISTANCE).toArray() }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <Studio />
        <Suspense fallback={null}>
          <PhoneModel url={url} tint={tint} tintMaterial={tintMaterial} intro={!reduced.current} onReady={onReady} onPick={onPick} onMaterials={onMaterials}>
            {hotspots.map((h, i) => (
              <Marker key={h.id} hotspot={h} index={i} active={h.id === activeHotspot} onSelect={() => onSelectHotspot?.(h.id)} />
            ))}
          </PhoneModel>
        </Suspense>
        <Rig command={command} autoRotate={autoRotate && !reduced.current} onUserMove={() => onUserMove?.()} />
      </Canvas>
    </div>
  )
}
