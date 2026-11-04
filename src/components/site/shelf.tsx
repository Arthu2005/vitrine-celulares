'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/** Favoritos e seleção de comparação ficam no navegador do visitante, sem cadastro. */

type Shelf = {
  favorites: string[]
  compare: string[]
  toggleFavorite: (slug: string) => void
  toggleCompare: (slug: string) => void
  setCompare: (slugs: string[]) => void
  message: string | null
}

const Ctx = createContext<Shelf | null>(null)
export const MAX_COMPARE = 3

function read(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

function write(key: string, value: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Navegação privada: segue funcionando até fechar a página.
  }
}

export function ShelfProvider({ validSlugs, children }: { validSlugs: string[]; children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([])
  const [compare, setCompareState] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // Produto despublicado sai da seleção guardada no navegador.
    const valid = new Set(validSlugs)
    /* eslint-disable react-hooks/set-state-in-effect */
    setFavorites(read('favoritos').filter((s) => valid.has(s)))
    setCompareState(read('comparar').filter((s) => valid.has(s)))
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [validSlugs])

  const toggleFavorite = useCallback((slug: string) => {
    setFavorites((list) => {
      const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]
      write('favoritos', next)
      return next
    })
  }, [])

  const setCompare = useCallback((slugs: string[]) => {
    const next = slugs.slice(0, MAX_COMPARE)
    write('comparar', next)
    setCompareState(next)
  }, [])

  const toggleCompare = useCallback(
    (slug: string) => {
      if (compare.includes(slug)) return setCompare(compare.filter((s) => s !== slug))
      if (compare.length >= MAX_COMPARE) {
        setMessage(`Você pode comparar até ${MAX_COMPARE} aparelhos.`)
        setTimeout(() => setMessage(null), 2600)
        return
      }
      setCompare([...compare, slug])
    },
    [compare, setCompare],
  )

  const value = useMemo(() => ({ favorites, compare, toggleFavorite, toggleCompare, setCompare, message }), [favorites, compare, toggleFavorite, toggleCompare, setCompare, message])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useShelf() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('ShelfProvider ausente')
  return ctx
}
