import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Página mínima usada apenas para fotografar os modelos de demonstração.

function makeStudio(renderer: THREE.WebGLRenderer) {
  const room = new THREE.Scene()
  room.background = new THREE.Color(0x020203)
  const panel = (w: number, h: number, color: number, intensity: number, pos: [number, number, number]) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
    mesh.position.set(...pos)
    mesh.lookAt(0, 0, 0)
    room.add(mesh)
  }
  panel(6, 2, 0xffffff, 7, [0, 5, 2])
  panel(1.2, 7, 0xffe2c0, 14, [-5, 0, -2.5])
  panel(1.2, 7, 0xffd2a0, 12, [5, 0.5, -3])
  panel(3, 5, 0xdfe6f0, 2.2, [3, 1, 5])
  panel(3, 5, 0xffffff, 1.4, [-3.5, 0, 5])
  panel(5, 6, 0xf4f6fa, 2.8, [-1, 3.2, 6])
  panel(7, 1.5, 0xffc890, 0.9, [0, -5, 1])
  const pmrem = new THREE.PMREMGenerator(renderer)
  return pmrem.fromScene(room, 0.03).texture
}

const canvas = document.createElement('canvas')
document.body.appendChild(canvas)
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
renderer.setClearColor(0x000000, 0)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
const env = makeStudio(renderer)
const loader = new GLTFLoader()

type Shot = { x: number; y: number; z?: number; px?: number; py?: number; pz?: number; s?: number }
type Req = { glb: string; tint?: string; width: number; height: number; shots: Shot[]; distance?: number }

async function render(req: Req) {
  const bytes = Uint8Array.from(atob(req.glb), (c) => c.charCodeAt(0))
  const gltf = await loader.parseAsync(bytes.buffer, '')
  const box = new THREE.Box3().setFromObject(gltf.scene)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  gltf.scene.position.sub(center)
  const unit = 1 / size.y
  const scene = new THREE.Scene()
  scene.environment = env

  if (req.tint) {
    gltf.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (m && (m.name === 'Corpo' || m.name === 'Modulo')) m.color.set(req.tint!)
    })
  }

  for (const shot of req.shots) {
    const holder = new THREE.Group()
    holder.add(gltf.scene.clone(true))
    holder.scale.setScalar(unit * (shot.s ?? 1))
    holder.rotation.set(THREE.MathUtils.degToRad(shot.x), THREE.MathUtils.degToRad(shot.y), THREE.MathUtils.degToRad(shot.z ?? 0))
    holder.position.set(shot.px ?? 0, shot.py ?? 0, shot.pz ?? 0)
    scene.add(holder)
  }

  renderer.setPixelRatio(1)
  renderer.setSize(req.width, req.height, false)
  const camera = new THREE.PerspectiveCamera(20, req.width / req.height, 0.01, 50)
  camera.position.set(0, 0.02, req.distance ?? 3.6)
  camera.lookAt(0, 0, 0)
  renderer.render(scene, camera)
  return canvas.toDataURL('image/png')
}

;(window as unknown as { renderShot: typeof render }).renderShot = render
;(window as unknown as { ready: boolean }).ready = true
