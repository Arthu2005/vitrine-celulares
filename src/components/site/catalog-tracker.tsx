'use client'

import { useEffect } from 'react'
import { track } from '@/lib/client/track'

export function CatalogTracker({ q, results }: { q: string; results: number }) {
  useEffect(() => {
    if (q) track('search', { label: q.toLowerCase().trim().slice(0, 80), results })
  }, [q, results])
  return null
}
