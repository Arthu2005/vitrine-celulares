'use client'

import { Component, type ReactNode } from 'react'

/** Falha no 3D nunca derruba a página: quem usa decide a alternativa visual. */
export class ModelBoundary extends Component<{ fallback?: ReactNode; onError?: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('Modelo 3D indisponível:', error)
    this.props.onError?.()
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children
  }
}
