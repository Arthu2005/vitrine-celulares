import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'
const s3Origin = process.env.S3_PUBLIC_URL ? new URL(process.env.S3_PUBLIC_URL).origin : ''

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${s3Origin}`,
  `media-src 'self' blob: ${s3Origin}`,
  "font-src 'self' data:",
  `connect-src 'self' blob: data: ${s3Origin}${isDev ? ' ws:' : ''}`,
  "worker-src 'self' blob:",
  'frame-src https://www.google.com https://maps.google.com',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const staticSite = process.env.NEXT_PUBLIC_STATIC_SITE === '1'
const staticConfig: NextConfig = {
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
  trailingSlash: true,
  images: { unoptimized: true },
  // O painel fica fora deste build; a verificação de tipos completa roda na versão com servidor.
  typescript: { ignoreBuildErrors: true },
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['@libsql/client', 'libsql', 'sharp'],
  allowedDevOrigins: ['127.0.0.1'],
  ...(staticSite ? staticConfig : { headers }),
}

async function headers() {
  return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/preview/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ]
}

export default nextConfig
