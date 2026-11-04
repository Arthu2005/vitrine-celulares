import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Accessor, Document, Material, NodeIO, Texture } from '@gltf-transform/core'
import { KHRMaterialsSpecular } from '@gltf-transform/extensions'
import sharp from 'sharp'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries, mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Gera aparelhos fictícios para demonstrar o visualizador. Não são réplicas de nenhum celular real:
 * o desenho das câmeras foi feito para não coincidir com produtos do mercado.
 * Medidas em milímetros durante a construção; o GLB final fica em metros.
 */

type Camera = 'capsule' | 'bar' | 'orbit'
type Preset = { id: string; w: number; h: number; d: number; r: number; bevel: number; camera: Camera; hue: number; body: string; frame: string }

const PRESETS: Preset[] = [
  { id: 'aurora', w: 76, h: 162, d: 8.2, r: 11, bevel: 0.7, camera: 'capsule', hue: 34, body: '#2a2c2f', frame: '#b8bbc0' },
  { id: 'vertice', w: 72, h: 152, d: 7.6, r: 8, bevel: 0.45, camera: 'bar', hue: 190, body: '#1c2a33', frame: '#8e959c' },
  { id: 'trama', w: 74, h: 158, d: 8.8, r: 13, bevel: 1.5, camera: 'orbit', hue: 96, body: '#2c302a', frame: '#a4a8a0' },
]

type Part = THREE.BufferGeometry
type Parts = Record<string, Part[]>

function roundedShape(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - r)
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, y + h)
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + r)
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

function slab(w: number, h: number, r: number, depth: number, bevel: number, z: number) {
  const geo = new THREE.ExtrudeGeometry(roundedShape(w - bevel * 2, h - bevel * 2, Math.max(r - bevel, 0.2)), {
    depth: Math.max(depth - bevel * 2, 0.01),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 8,
    curveSegments: 28,
  })
  geo.translate(0, 0, z - depth / 2 + bevel)
  geo.deleteAttribute('uv')
  return toCreasedNormals(geo, THREE.MathUtils.degToRad(38))
}

function disc(radius: number, length: number, x: number, y: number, z: number, segments = 64, bevel = 0.14) {
  // Cilindro com aresta chanfrada: perfil girado em torno do eixo, voltado para +Z ou -Z conforme o uso.
  const pts = [
    new THREE.Vector2(0, length / 2),
    new THREE.Vector2(radius - bevel, length / 2),
    new THREE.Vector2(radius, length / 2 - bevel),
    new THREE.Vector2(radius, -length / 2),
  ]
  const geo = new THREE.LatheGeometry(pts, segments)
  geo.rotateX(Math.PI / 2)
  geo.translate(x, y, z)
  geo.deleteAttribute('uv')
  return toCreasedNormals(geo, THREE.MathUtils.degToRad(30))
}

function ring(outer: number, inner: number, length: number, x: number, y: number, z: number) {
  const pts = [
    new THREE.Vector2(inner, length / 2 - 0.2),
    new THREE.Vector2(inner + 0.08, length / 2),
    new THREE.Vector2(outer - 0.1, length / 2),
    new THREE.Vector2(outer, length / 2 - 0.1),
    new THREE.Vector2(outer, -length / 2),
  ]
  const geo = new THREE.LatheGeometry(pts, 64)
  geo.rotateX(Math.PI / 2)
  geo.translate(x, y, z)
  geo.deleteAttribute('uv')
  return toCreasedNormals(geo, THREE.MathUtils.degToRad(30))
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, radius = 0.4) {
  const geo = new RoundedBoxGeometry(w, h, d, 4, Math.min(radius, Math.min(w, h, d) / 2 - 0.001))
  geo.translate(x, y, z)
  geo.deleteAttribute('uv')
  return geo
}

function lens(parts: Parts, x: number, y: number, z: number, r: number) {
  parts.Anel.push(ring(r + 1.1, r, 1.5, x, y, z - 0.55))
  parts.Lente.push(disc(r, 0.5, x, y, z - 0.75, 64, 0.08))
  parts.Iris.push(ring(r * 0.62, r * 0.46, 0.06, x, y, z - 1.02))
  parts.Foco.push(disc(r * 0.13, 0.04, x - r * 0.28, y + r * 0.3, z - 1.03, 24, 0.01))
}

function buildPhone(p: Preset): Parts {
  const parts: Parts = { Corpo: [], Moldura: [], Vidro: [], Tela: [], Anel: [], Lente: [], Iris: [], Foco: [], Escuro: [], Flash: [], Modulo: [] }
  const { w, h, d, r, bevel } = p
  const back = -d / 2

  parts.Moldura.push(slab(w, h, r, d, bevel, 0))
  parts.Corpo.push(slab(w - 0.9, h - 0.9, r - 0.45, 0.5, 0.2, back - 0.02))
  parts.Vidro.push(slab(w - 0.9, h - 0.9, r - 0.45, 0.5, 0.18, d / 2 - 0.1))

  // Tela com UV próprio para a imagem de fundo.
  const bezel = 2.1
  const screen = new THREE.ShapeGeometry(roundedShape(w - bezel * 2, h - bezel * 2, r - bezel), 28)
  const pos = screen.getAttribute('position')
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / (w - bezel * 2) + 0.5
    uv[i * 2 + 1] = 0.5 - pos.getY(i) / (h - bezel * 2)
  }
  screen.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  screen.translate(0, 0, d / 2 + 0.3)
  parts.Tela.push(screen)

  parts.Escuro.push(disc(1.55, 0.05, 0, h / 2 - 8, d / 2 + 0.34, 32, 0.01))

  // Botões laterais.
  const side = w / 2
  parts.Moldura.push(box(1.1, 20, 2.8, side + 0.1, 28, 0.2, 0.5))
  parts.Moldura.push(box(1.1, 13, 2.8, -side - 0.1, 36, 0.2, 0.5))
  parts.Moldura.push(box(1.1, 13, 2.8, -side - 0.1, 20, 0.2, 0.5))

  // Conector, alto-falante e faixas de antena.
  parts.Escuro.push(box(9, 1, 3.2, 0, -h / 2 + 0.2, 0, 0.45))
  for (let i = 0; i < 7; i++) {
    parts.Escuro.push(disc(0.55, 0.6, 12 + i * 2.1, 0, 0, 16, 0.01).rotateX(Math.PI / 2).translate(0, -h / 2 + 0.2, 0))
    parts.Escuro.push(disc(0.55, 0.6, -(12 + i * 2.1), 0, 0, 16, 0.01).rotateX(Math.PI / 2).translate(0, -h / 2 + 0.2, 0))
  }
  for (const [x, y, sw, sh] of [
    [side - 0.02, h / 2 - 22, 0.2, 1],
    [-side + 0.02, -h / 2 + 22, 0.2, 1],
  ]) {
    parts.Escuro.push(box(sw, sh, d - 2.4, x, y, 0, 0.05))
  }
  parts.Escuro.push(box(1, 0.2, d - 2.4, -w / 2 + 16, h / 2 - 0.02, 0, 0.05))
  parts.Escuro.push(box(1, 0.2, d - 2.4, w / 2 - 16, -h / 2 + 0.02, 0, 0.05))

  const z = back - 0.3
  if (p.camera === 'capsule') {
    // Cápsula vertical deslocada para o canto, com duas lentes e sensor.
    const cx = -w / 2 + 19
    const cy = h / 2 - 34
    parts.Modulo.push(slab(23, 49, 11.5, 1.6, 0.5, z - 0.6).translate(cx, cy, 0))
    lens(parts, cx, cy + 12.4, z - 1.3, 7)
    lens(parts, cx, cy - 6.2, z - 1.3, 6)
    parts.Flash.push(disc(2, 0.2, cx, cy - 18.8, z - 1.45, 32, 0.04))
  } else if (p.camera === 'bar') {
    // Faixa horizontal de borda a borda com três lentes pequenas.
    const cy = h / 2 - 22
    parts.Modulo.push(slab(w - 6, 19, 9.5, 1.2, 0.5, z - 0.4).translate(0, cy, 0))
    lens(parts, -w / 2 + 16, cy, z - 1, 5.4)
    lens(parts, -w / 2 + 31, cy, z - 1, 4.4)
    lens(parts, -w / 2 + 44, cy, z - 1, 3.4)
    parts.Flash.push(disc(1.8, 0.2, w / 2 - 12, cy, z - 1.05, 32, 0.04))
  } else {
    // Disco central com uma lente principal e dois satélites.
    const cy = h / 2 - 38
    parts.Modulo.push(disc(24, 1.6, 0, cy, z - 0.7, 96, 0.5))
    lens(parts, 0, cy + 3, z - 1.5, 9.5)
    lens(parts, -13.5, cy - 8, z - 1.5, 4.2)
    lens(parts, 13.5, cy - 8, z - 1.5, 4.2)
    parts.Flash.push(disc(1.7, 0.2, 0, cy - 15.5, z - 1.65, 32, 0.04))
  }
  return parts
}

const color = (hex: string): [number, number, number, number] => {
  const c = new THREE.Color(hex)
  return [c.r, c.g, c.b, 1]
}

async function wallpaper(hue: number, seed: number) {
  const a = `hsl(${hue} 95% 68%)`
  const b = `hsl(${hue} 80% 42%)`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="1680" viewBox="0 0 780 1680">
  <defs>
    <radialGradient id="g1" cx="${seed === 0 ? '78%' : '22%'}" cy="42%" r="70%"><stop offset="0" stop-color="${b}" stop-opacity=".9"/><stop offset=".55" stop-color="${b}" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <linearGradient id="s1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}" stop-opacity="0"/><stop offset=".5" stop-color="${a}"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <filter id="b1"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="b2"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <rect width="780" height="1680" fill="#050506"/>
  <rect width="780" height="1680" fill="url(#g1)"/>
  <g fill="none" stroke="url(#s1)">
    <path d="M-40 520 C 240 300, 620 420, 860 980" stroke-width="44" opacity=".5" filter="url(#b1)"/>
    <path d="M-40 520 C 240 300, 620 420, 860 980" stroke-width="5" filter="url(#b2)"/>
    <path d="M-60 1180 C 180 900, 560 900, 840 1420" stroke-width="30" opacity=".35" filter="url(#b1)"/>
    <path d="M-60 1180 C 180 900, 560 900, 840 1420" stroke-width="3"/>
    <ellipse cx="${seed === 0 ? 520 : 260}" cy="1200" rx="280" ry="420" stroke-width="2" opacity=".75" transform="rotate(${seed === 0 ? 24 : -24} 400 1200)"/>
  </g>
</svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer()
}

async function exportPhone(p: Preset, index: number) {
  const doc = new Document()
  const buffer = doc.createBuffer()
  const scene = doc.createScene('Aparelho')
  const root = doc.createNode('Aparelho')
  scene.addChild(root)

  const wall = await wallpaper(p.hue, index % 2)
  const texture: Texture = doc.createTexture('Tela').setImage(wall).setMimeType('image/jpeg')

  const materials: Record<string, Material> = {
    Corpo: doc.createMaterial('Corpo').setBaseColorFactor(color(p.body)).setMetallicFactor(0.55).setRoughnessFactor(0.46),
    Moldura: doc.createMaterial('Moldura').setBaseColorFactor(color(p.frame)).setMetallicFactor(1).setRoughnessFactor(0.3),
    Modulo: doc.createMaterial('Modulo').setBaseColorFactor(color(p.body)).setMetallicFactor(0.8).setRoughnessFactor(0.34),
    Vidro: doc.createMaterial('Vidro').setBaseColorFactor(color('#040405')).setMetallicFactor(0).setRoughnessFactor(0.08),
    Tela: doc.createMaterial('Tela').setBaseColorFactor(color('#000000')).setMetallicFactor(0).setRoughnessFactor(0.12).setEmissiveFactor([1, 1, 1]).setEmissiveTexture(texture),
    Anel: doc.createMaterial('Anel').setBaseColorFactor(color('#9a9ea3')).setMetallicFactor(1).setRoughnessFactor(0.24),
    Lente: doc.createMaterial('Lente').setBaseColorFactor(color('#05060a')).setMetallicFactor(0.3).setRoughnessFactor(0.04),
    Iris: doc.createMaterial('Iris').setBaseColorFactor(color('#24304a')).setMetallicFactor(1).setRoughnessFactor(0.2),
    Foco: doc.createMaterial('Foco').setBaseColorFactor(color('#101018')).setMetallicFactor(0.2).setRoughnessFactor(0.02),
    Escuro: doc.createMaterial('Escuro').setBaseColorFactor(color('#020203')).setMetallicFactor(0).setRoughnessFactor(0.7),
    Flash: doc.createMaterial('Flash').setBaseColorFactor(color('#f2e6c8')).setMetallicFactor(0).setRoughnessFactor(0.3).setEmissiveFactor([0.55, 0.5, 0.38]),
  }

  // A tela reflete pouco o estúdio, para a imagem não ficar lavada.
  const specular = doc.createExtension(KHRMaterialsSpecular)
  materials.Tela.setExtension('KHR_materials_specular', specular.createSpecular().setSpecularFactor(0.18))

  let triangles = 0
  for (const [name, geos] of Object.entries(buildPhone(p))) {
    if (!geos.length) continue
    const clean = geos.map((g) => {
      const n = g.index ? g.toNonIndexed() : g
      if (name !== 'Tela' && n.getAttribute('uv')) n.deleteAttribute('uv')
      return n
    })
    const merged = mergeVertices(mergeGeometries(clean, false), 1e-4)
    merged.scale(0.001, 0.001, 0.001)
    const position = merged.getAttribute('position') as THREE.BufferAttribute
    const normal = merged.getAttribute('normal') as THREE.BufferAttribute
    const prim = doc
      .createPrimitive()
      .setMaterial(materials[name])
      .setAttribute('POSITION', doc.createAccessor().setType(Accessor.Type.VEC3).setArray(new Float32Array(position.array)).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType(Accessor.Type.VEC3).setArray(new Float32Array(normal.array)).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType(Accessor.Type.SCALAR).setArray(new Uint32Array(merged.index!.array)).setBuffer(buffer))
    const uv = merged.getAttribute('uv') as THREE.BufferAttribute | undefined
    if (name === 'Tela' && uv) prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType(Accessor.Type.VEC2).setArray(new Float32Array(uv.array)).setBuffer(buffer))
    triangles += merged.index!.count / 3
    root.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)))
  }

  const out = await new NodeIO().registerExtensions([KHRMaterialsSpecular]).writeBinary(doc)
  const dir = join('demo-assets', 'models')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `demo-${p.id}.glb`), out)
  console.log(`demo-${p.id}.glb  ${(out.length / 1024).toFixed(0)} KB  ${Math.round(triangles)} triângulos`)
}

for (const [i, preset] of PRESETS.entries()) await exportPhone(preset, i)
