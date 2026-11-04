'use client'

import { Environment, Lightformer } from '@react-three/drei'

/** Mesma iluminação das fotos de demonstração: recortes laterais e luz suave de frente. Tudo local, sem baixar HDR externo. */
export function Studio({ intensity = 1 }: { intensity?: number }) {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#020203']} />
      <Lightformer form="rect" intensity={7 * intensity} color="#ffffff" position={[0, 5, 2]} scale={[6, 2, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={14 * intensity} color="#ffe2c0" position={[-5, 0, -2.5]} scale={[1.2, 7, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={12 * intensity} color="#ffd2a0" position={[5, 0.5, -3]} scale={[1.2, 7, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={2.2 * intensity} color="#dfe6f0" position={[3, 1, 5]} scale={[3, 5, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.4 * intensity} color="#ffffff" position={[-3.5, 0, 5]} scale={[3, 5, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={2.8 * intensity} color="#f4f6fa" position={[-1, 3.2, 6]} scale={[5, 6, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={0.9 * intensity} color="#ffc890" position={[0, -5, 1]} scale={[7, 1.5, 1]} target={[0, 0, 0]} />
    </Environment>
  )
}
