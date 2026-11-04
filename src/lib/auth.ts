import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { and, eq, gt, isNull, lt } from 'drizzle-orm'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { db, schema } from './db'

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>

export const SESSION_COOKIE = 'vitrine_sessao'
const SESSION_DAYS = 14
const N = 2 ** 15
const scryptOpts = { N, r: 8, p: 1, maxmem: 128 * N * 8 * 2 }

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 32, scryptOpts)
  return `scrypt$${N}$${salt.toString('base64url')}$${hash.toString('base64url')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [, , saltText, hashText] = stored.split('$')
  if (!saltText || !hashText) return false
  const hash = await scrypt(password, Buffer.from(saltText, 'base64url'), 32, scryptOpts)
  const expected = Buffer.from(hashText, 'base64url')
  return hash.length === expected.length && timingSafeEqual(hash, expected)
}

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')
const DUMMY_HASH = 'scrypt$32768$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

export async function clientIp() {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local'
}

export async function isLimited(key: string) {
  const [row] = await db.select().from(schema.loginAttempts).where(eq(schema.loginAttempts.key, key))
  return !!row && Date.now() - row.windowStart < WINDOW_MS && row.count >= MAX_ATTEMPTS
}

export async function registerAttempt(key: string) {
  const [row] = await db.select().from(schema.loginAttempts).where(eq(schema.loginAttempts.key, key))
  const fresh = !row || Date.now() - row.windowStart >= WINDOW_MS
  await db
    .insert(schema.loginAttempts)
    .values({ key, count: 1, windowStart: Date.now() })
    .onConflictDoUpdate({ target: schema.loginAttempts.key, set: fresh ? { count: 1, windowStart: Date.now() } : { count: row.count + 1 } })
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = Date.now() + SESSION_DAYS * 86_400_000
  await db.insert(schema.sessions).values({ tokenHash: sha256(token), userId, expiresAt })
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, Date.now()))
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https'),
    path: '/',
    expires: new Date(expiresAt),
  })
}

export async function login(email: string, password: string) {
  const address = email.trim().toLowerCase()
  const key = `${await clientIp()}|${address}`
  if (await isLimited(key)) return { error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' }
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, address))
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !user.active || !valid) {
    await registerAttempt(key)
    return { error: 'E-mail ou senha incorretos.' }
  }
  await db.delete(schema.loginAttempts).where(eq(schema.loginAttempts.key, key))
  await createSession(user.id)
  return { ok: true as const }
}

export async function logout() {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha256(token)))
  jar.delete(SESSION_COOKIE)
}

export const getCurrentUser = cache(async () => {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  const [row] = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.users.role, active: schema.users.active })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, sha256(token)), gt(schema.sessions.expiresAt, Date.now())))
  return row?.active ? row : null
})

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')
  return user
}

export async function requireOwner() {
  const user = await requireUser()
  if (user.role !== 'owner') throw new Error('Apenas o proprietário pode fazer isso.')
  return user
}

export async function createPasswordReset(email: string) {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.trim().toLowerCase()))
  if (!user || !user.active) return null
  const token = randomBytes(32).toString('base64url')
  await db.insert(schema.passwordResets).values({ tokenHash: sha256(token), userId: user.id, expiresAt: Date.now() + 3_600_000 })
  return { token, user }
}

export async function consumePasswordReset(token: string, password: string) {
  const tokenHash = sha256(token)
  const [row] = await db
    .select()
    .from(schema.passwordResets)
    .where(and(eq(schema.passwordResets.tokenHash, tokenHash), isNull(schema.passwordResets.usedAt), gt(schema.passwordResets.expiresAt, Date.now())))
  if (!row) return false
  await db.update(schema.users).set({ passwordHash: await hashPassword(password) }).where(eq(schema.users.id, row.userId))
  await db.update(schema.passwordResets).set({ usedAt: Date.now() }).where(eq(schema.passwordResets.tokenHash, tokenHash))
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, row.userId))
  return true
}

export const newId = () => randomUUID()

export async function audit(userName: string, summary: string) {
  await db.insert(schema.auditLog).values({ userName, summary })
}
