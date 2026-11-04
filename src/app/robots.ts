import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/whatsapp'

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/preview', '/api'] }, sitemap: `${siteUrl()}/sitemap.xml` }
}
