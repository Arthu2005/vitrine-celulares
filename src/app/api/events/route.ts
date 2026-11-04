import { NextResponse } from 'next/server'
import { z } from 'zod'
import { EVENT_TYPES } from '@/lib/constants'
import { db, schema } from '@/lib/db'

const body = z.object({
  type: z.enum(EVENT_TYPES),
  productId: z.string().max(64).optional(),
  label: z.string().max(120).optional(),
  results: z.number().int().min(0).max(100000).optional(),
})

// Limite simples por processo: evita enxurrada de eventos sem guardar IP no banco.
const hits = new Map<string, { n: number; at: number }>()

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local'
  const now = Date.now()
  const hit = hits.get(ip)
  if (!hit || now - hit.at > 60_000) hits.set(ip, { n: 1, at: now })
  else if (++hit.n > 90) return new NextResponse(null, { status: 429 })
  if (hits.size > 5000) hits.clear()

  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return new NextResponse(null, { status: 400 })
  await db.insert(schema.events).values({ type: parsed.data.type, productId: parsed.data.productId, label: parsed.data.label ?? '', results: parsed.data.results })
  return new NextResponse(null, { status: 204 })
}
