import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const now = () => Date.now()
const timestamps = {
  createdAt: integer('created_at').notNull().$defaultFn(now),
  updatedAt: integer('updated_at').notNull().$defaultFn(now).$onUpdateFn(now),
}

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['owner', 'editor'] }).notNull().default('editor'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
})

export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull(),
  expiresAt: integer('expires_at').notNull(),
})

export const passwordResets = sqliteTable('password_resets', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull(),
  expiresAt: integer('expires_at').notNull(),
  usedAt: integer('used_at'),
})

export const loginAttempts = sqliteTable('login_attempts', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  windowStart: integer('window_start').notNull(),
})

export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  kind: text('kind', { enum: ['image', 'video', 'model'] }).notNull(),
  name: text('name').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  storageKey: text('storage_key').notNull(),
  variants: text('variants', { mode: 'json' }).$type<Record<string, string>>(),
  alt: text('alt').notNull().default(''),
  meta: text('meta', { mode: 'json' }).$type<Record<string, unknown>>(),
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
})

export const brands = sqliteTable('brands', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  showInNav: integer('show_in_nav', { mode: 'boolean' }).notNull().default(true),
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
})

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  showInNav: integer('show_in_nav', { mode: 'boolean' }).notNull().default(true),
  isAccessory: integer('is_accessory', { mode: 'boolean' }).notNull().default(false),
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
})

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  visible: integer('visible', { mode: 'boolean' }).notNull().default(true),
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
  ...timestamps,
})

export type HotspotRow = {
  id: string
  label: string
  text: string
  position: [number, number, number]
  normal: [number, number, number]
}

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    brandId: text('brand_id'),
    categoryId: text('category_id'),
    model: text('model').notNull().default(''),
    sku: text('sku').notNull().default(''),
    shortDescription: text('short_description').notNull().default(''),
    description: text('description').notNull().default(''),
    condition: text('condition').notNull().default('novo'),
    conditionNotes: text('condition_notes').notNull().default(''),
    availability: text('availability').notNull().default('disponivel'),
    stock: integer('stock'),
    warranty: text('warranty').notNull().default(''),
    price: integer('price'),
    promoPrice: integer('promo_price'),
    hidePrice: integer('hide_price', { mode: 'boolean' }).notNull().default(false),
    highlights: text('highlights', { mode: 'json' }).$type<string[]>().notNull().default([]),
    specs: text('specs', { mode: 'json' }).$type<Record<string, string>>().notNull().default({}),
    customAttrs: text('custom_attrs', { mode: 'json' }).$type<{ label: string; value: string }[]>().notNull().default([]),
    goodFor: text('good_for', { mode: 'json' }).$type<string[]>().notNull().default([]),
    isNew: integer('is_new', { mode: 'boolean' }).notNull().default(false),
    isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
    visible: integer('visible', { mode: 'boolean' }).notNull().default(true),
    isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
    modelMediaId: text('model_media_id'),
    modelTintMaterial: text('model_tint_material').notNull().default(''),
    modelIllustrative: integer('model_illustrative', { mode: 'boolean' }).notNull().default(true),
    hotspots: text('hotspots', { mode: 'json' }).$type<HotspotRow[]>().notNull().default([]),
    seoTitle: text('seo_title').notNull().default(''),
    seoDescription: text('seo_description').notNull().default(''),
    draftJson: text('draft_json', { mode: 'json' }).$type<Record<string, unknown>>(),
    publishedAt: integer('published_at'),
    ...timestamps,
  },
  (t) => [uniqueIndex('products_slug_idx').on(t.slug), index('products_status_idx').on(t.status)],
)

export const productVariants = sqliteTable(
  'product_variants',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull(),
    color: text('color').notNull().default(''),
    colorHex: text('color_hex').notNull().default(''),
    storage: text('storage').notNull().default(''),
    ram: text('ram').notNull().default(''),
    condition: text('condition'),
    price: integer('price'),
    promoPrice: integer('promo_price'),
    availability: text('availability').notNull().default('disponivel'),
    stock: integer('stock'),
    sku: text('sku').notNull().default(''),
    modelMediaId: text('model_media_id'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('variants_product_idx').on(t.productId)],
)

export const productMedia = sqliteTable(
  'product_media',
  {
    productId: text('product_id').notNull(),
    mediaId: text('media_id').notNull(),
    role: text('role', { enum: ['gallery', 'spin'] }).notNull().default('gallery'),
    color: text('color').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.productId, t.mediaId, t.role] }), index('pm_media_idx').on(t.mediaId)],
)

export const accessoryLinks = sqliteTable(
  'accessory_links',
  {
    productId: text('product_id').notNull(),
    accessoryId: text('accessory_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.productId, t.accessoryId] })],
)

export const collectionProducts = sqliteTable(
  'collection_products',
  {
    collectionId: text('collection_id').notNull(),
    productId: text('product_id').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.productId] })],
)

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  published: text('published', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  draft: text('draft', { mode: 'json' }).$type<Record<string, unknown>>(),
  ...timestamps,
})

export const events = sqliteTable(
  'events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type').notNull(),
    productId: text('product_id'),
    label: text('label').notNull().default(''),
    results: integer('results'),
    createdAt: integer('created_at').notNull().$defaultFn(now),
  },
  (t) => [index('events_type_idx').on(t.type, t.createdAt), index('events_product_idx').on(t.productId)],
)

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userName: text('user_name').notNull(),
    summary: text('summary').notNull(),
    createdAt: integer('created_at').notNull().$defaultFn(now),
  },
  (t) => [index('audit_created_idx').on(t.createdAt)],
)
