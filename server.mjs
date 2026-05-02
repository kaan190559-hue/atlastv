import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 5181)
const DIST_DIR = resolve(__dirname, 'dist')
const PREBUILT_CATALOG_DIRS = [join(DIST_DIR, 'catalog'), join(__dirname, 'public', 'catalog')]
const DATA_DIR = resolve(process.env.ATLAS_DATA_DIR || join(__dirname, '.atlas'))
const ADMIN_SETTINGS_FILE = resolve(process.env.ATLAS_SETTINGS_FILE || join(DATA_DIR, 'admin-settings.json'))
const USER_STATS_FILE = resolve(process.env.ATLAS_USER_STATS_FILE || join(DATA_DIR, 'user-stats.json'))
const MEDIA_CACHE_FILE = resolve(process.env.ATLAS_MEDIA_CACHE_FILE || join(DATA_DIR, 'media-cache.json'))
const CACHE_BOT_STATUS_FILE = resolve(process.env.ATLAS_CACHE_BOT_STATUS_FILE || join(DATA_DIR, 'cache-bot-status.json'))

const PROXY_PATH = '/__atlas_proxy'
const DOWNLOAD_PATH = '/__atlas_download'
const CATALOG_PATH = '/__atlas_catalog'
const LIVE_CATALOG_PATH = '/__atlas_live_catalog'
const METADATA_PATH = '/__atlas_metadata'
const ADMIN_SETTINGS_PATH = '/__atlas_admin_settings'
const ADMIN_AUTH_PATH = '/__atlas_admin_auth'
const USER_STATS_PATH = '/__atlas_user_stats'
const CACHE_CONTROL_PATH = '/__atlas_cache_control'
const CACHE_BOT_BUILD = 'prebuilt-catalog-v1'
const DEFAULT_USER_AGENT = 'okhttp/4.12.0'
const ADMIN_PASSWORD = process.env.ATLAS_ADMIN_PASSWORD || '190559'
const TMDB_API_KEY = process.env.TMDB_API_KEY || ''
const VOD_M3U_URL = 'https://file.garden/Z-hq5n4Shk27aY58/Wars-vod-iptv.m3u'
const LIVE_M3U_URL =
  process.env.ATLAS_LIVE_M3U_URL ||
  'https://raw.githubusercontent.com/kaan190559-hue/atlastv/master/public/vavoo_full_worker.m3u'
const LIVE_M3U_FILE = process.env.ATLAS_LIVE_M3U_FILE || ''
const VAVOO_REFERER = 'https://vavoo.to/'
const VAVOO_ORIGIN = 'https://vavoo.to'
const PLACEHOLDER_POSTER =
  'https://images.unsplash.com/photo-1518929458119-e5bf444c30f4?auto=format&fit=crop&w=500&q=80'
const PLACEHOLDER_BACKDROP =
  'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1600&q=80'

const defaultAdminSettings = {
  vodM3uUrl: VOD_M3U_URL,
  liveM3uUrl: LIVE_M3U_URL,
  sportsM3uUrl: '',
  telegramUrl: 'https://t.me/',
  supportUrl: '',
  appVersion: '0.0.0',
  announcement: 'Güncel sürüm, duyurular, özel içerikler ve destek için kanalımızı takip edin.',
  liveM3uContent: '',
  sportsM3uContent: '',
}

const catalogCache = new Map()
const groupedCatalogCache = new Map()
const groupedCatalogPromise = new Map()
const catalogPromise = new Map()
const liveCatalogCache = new Map()
const liveCatalogPromise = new Map()
const prebuiltCatalogCache = new Map()
const metadataCache = new Map()
const activeUsers = new Map()
const CACHE_BOT_STALE_MS = 6 * 60 * 1000
const defaultCacheBotState = {
  isRunning: false,
  lastRunAt: '',
  startedAt: '',
  currentStep: '',
  lastMessage: 'Katalog botu henüz çalıştırılmadı.',
}
let cacheBotState = { ...defaultCacheBotState }
const ACTIVE_USER_WINDOW_MS = 2 * 60 * 1000
const PRESET_GENRES = [
  'Aksiyon',
  'Macera',
  'Dram',
  'Komedi',
  'Romantik',
  'Korku',
  'Gerilim',
  'Bilim Kurgu',
  'Fantastik',
  'Animasyon',
  'Aile',
  'Suç',
  'Gizem',
  'Belgesel',
  'Savaş',
  'Tarih',
  'Western',
  'Yerli',
  'Çocuk',
]
const PRESET_PLATFORMS = [
  'Netflix',
  'Disney+',
  'Prime Video',
  'BluTV',
  'Exxen',
  'Gain',
  'TOD',
  'HBO Max',
  'Apple TV+',
  'TRT Tabii',
  'PuhuTV',
  'MUBI',
  'YouTube',
  'Katalog',
]

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers)
  res.end(body)
}

function sendJson(res, data, status = 200) {
  send(res, status, JSON.stringify(data), {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
}

function normalizeAdminSettings(settings = {}) {
  return {
    vodM3uUrl: settings.vodM3uUrl?.trim() || VOD_M3U_URL,
    liveM3uUrl: settings.liveM3uUrl?.trim() ?? '',
    sportsM3uUrl: settings.sportsM3uUrl?.trim() ?? '',
    telegramUrl: settings.telegramUrl?.trim() || 'https://t.me/',
    supportUrl: settings.supportUrl?.trim() ?? '',
    appVersion: settings.appVersion?.trim() || '0.0.0',
    announcement: settings.announcement?.trim() ?? '',
    liveM3uContent: settings.liveM3uContent?.trim() ?? '',
    sportsM3uContent: settings.sportsM3uContent?.trim() ?? '',
    updatedAt: new Date().toISOString(),
  }
}

async function readAdminSettings() {
  try {
    const raw = await readFile(ADMIN_SETTINGS_FILE, 'utf8')
    const settings = { ...defaultAdminSettings, ...JSON.parse(raw) }
    if (!settings.liveM3uUrl?.trim() && !settings.liveM3uContent?.trim()) {
      settings.liveM3uUrl = defaultAdminSettings.liveM3uUrl
    }
    return settings
  } catch {
    return defaultAdminSettings
  }
}

async function writeAdminSettings(settings) {
  await mkdir(dirname(ADMIN_SETTINGS_FILE), { recursive: true })
  await writeFile(ADMIN_SETTINGS_FILE, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
}

async function readUserStats() {
  try {
    const raw = await readFile(USER_STATS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
      updatedAt: parsed.updatedAt || '',
    }
  } catch {
    return { users: {}, updatedAt: '' }
  }
}

async function writeUserStats(stats) {
  await mkdir(dirname(USER_STATS_FILE), { recursive: true })
  await writeFile(USER_STATS_FILE, `${JSON.stringify({ ...stats, updatedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8')
}

function pruneActiveUsers() {
  const cutoff = Date.now() - ACTIVE_USER_WINDOW_MS
  for (const [sessionId, entry] of activeUsers.entries()) {
    if (!entry.lastSeen || entry.lastSeen < cutoff) activeUsers.delete(sessionId)
  }
}

async function handleUserStats(req, res) {
  if (req.method === 'GET') {
    pruneActiveUsers()
    const stats = await readUserStats()
    sendJson(res, {
      totalUsers: Object.keys(stats.users).length,
      activeUsers: activeUsers.size,
      rememberedUsers: Object.values(stats.users).filter((user) => user.remember).length,
    })
    return
  }

  if (req.method !== 'POST') {
    send(res, 405, 'Method not allowed')
    return
  }

  const body = await readJsonBody(req)
  const sessionId = String(body.sessionId || '').slice(0, 120)
  const userId = String(body.userId || '').slice(0, 120)
  const email = String(body.email || '').toLocaleLowerCase('tr-TR').slice(0, 180)
  const event = String(body.event || 'heartbeat')

  if (sessionId && event !== 'logout') {
    activeUsers.set(sessionId, { userId, lastSeen: Date.now() })
  }
  if (sessionId && event === 'logout') {
    activeUsers.delete(sessionId)
  }

  if ((event === 'register' || event === 'login' || event === 'heartbeat') && (userId || email)) {
    const stats = await readUserStats()
    const key = email || userId
    stats.users[key] = {
      id: userId,
      email,
      remember: Boolean(body.remember),
      firstSeen: stats.users[key]?.firstSeen || new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    }
    await writeUserStats(stats)
  }

  pruneActiveUsers()
  const stats = await readUserStats()
  sendJson(res, {
    totalUsers: Object.keys(stats.users).length,
    activeUsers: activeUsers.size,
    rememberedUsers: Object.values(stats.users).filter((user) => user.remember).length,
  })
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 8_000_000) reject(new Error('Request body too large'))
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function clearMediaCaches() {
  catalogCache.clear()
  groupedCatalogCache.clear()
  groupedCatalogPromise.clear()
  catalogPromise.clear()
  liveCatalogCache.clear()
  liveCatalogPromise.clear()
  prebuiltCatalogCache.clear()
}

async function readPrebuiltCatalog(fileName) {
  if (prebuiltCatalogCache.has(fileName)) return prebuiltCatalogCache.get(fileName)

  for (const catalogDir of PREBUILT_CATALOG_DIRS) {
    try {
      const parsed = JSON.parse(await readFile(join(catalogDir, fileName), 'utf8'))
      prebuiltCatalogCache.set(fileName, parsed)
      return parsed
    } catch {
      // Try the next catalog location.
    }
  }

  return null
}

async function getPrebuiltCatalogStatus() {
  const manifest = await readPrebuiltCatalog('manifest.json')
  return manifest?.counts ? { ...manifest.counts, generatedAt: manifest.generatedAt } : null
}

function isDefaultVodSource(sourceUrl = '') {
  return !sourceUrl || sourceUrl === VOD_M3U_URL
}

function isDefaultLiveSource(sourceUrl = '') {
  return !sourceUrl || sourceUrl === LIVE_M3U_URL
}

function getDiskCacheKey(key) {
  return Buffer.from(key).toString('base64url')
}

async function readMediaDiskCache(bucket, key) {
  try {
    const raw = await readFile(MEDIA_CACHE_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed?.[bucket]?.[getDiskCacheKey(key)]?.value ?? null
  } catch {
    return null
  }
}

async function writeMediaDiskCache(bucket, key, value) {
  try {
    await mkdir(DATA_DIR, { recursive: true })
    let parsed = {}
    try {
      parsed = JSON.parse(await readFile(MEDIA_CACHE_FILE, 'utf8'))
    } catch {
      parsed = {}
    }
    parsed[bucket] = parsed[bucket] || {}
    parsed[bucket][getDiskCacheKey(key)] = { savedAt: new Date().toISOString(), value }
    await writeFile(MEDIA_CACHE_FILE, `${JSON.stringify(parsed)}\n`)
    return true
  } catch (error) {
    console.warn('Media disk cache yazılamadı.', error)
    return false
  }
}

async function hasMediaDiskCache(bucket) {
  try {
    const parsed = JSON.parse(await readFile(MEDIA_CACHE_FILE, 'utf8'))
    return Boolean(parsed?.[bucket] && Object.keys(parsed[bucket]).length)
  } catch {
    return false
  }
}

async function ensureMediaDiskCache(bucket, key, value) {
  const written = await writeMediaDiskCache(bucket, key, value)
  return written && (await hasMediaDiskCache(bucket))
}

async function readCacheBotState() {
  try {
    const parsed = JSON.parse(await readFile(CACHE_BOT_STATUS_FILE, 'utf8'))
    cacheBotState = { ...defaultCacheBotState, ...parsed }
  } catch {
    cacheBotState = { ...cacheBotState }
  }

  if (cacheBotState.isRunning && cacheBotState.startedAt) {
    const started = Date.parse(cacheBotState.startedAt)
    if (Number.isFinite(started) && Date.now() - started > CACHE_BOT_STALE_MS) {
      cacheBotState = {
        ...cacheBotState,
        isRunning: false,
        currentStep: '',
        startedAt: '',
        lastRunAt: new Date().toISOString(),
        lastMessage: 'Katalog botu yarıda kesildi. Render işlemi yeniden başlatmış olabilir.',
      }
      await writeCacheBotState(cacheBotState)
    }
  }

  return cacheBotState
}

function withTimeout(promise, timeoutMs, label) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} zaman aşımına uğradı.`)), timeoutMs)
  })
  promise.catch(() => undefined)
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

async function writeCacheBotState(nextState) {
  cacheBotState = { ...cacheBotState, ...nextState }
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(CACHE_BOT_STATUS_FILE, `${JSON.stringify(cacheBotState)}\n`)
  return cacheBotState
}

async function getMediaCacheStatus() {
  await readCacheBotState()
  let diskBuckets = []
  try {
    const parsed = JSON.parse(await readFile(MEDIA_CACHE_FILE, 'utf8'))
    diskBuckets = Object.keys(parsed ?? {})
  } catch {
    diskBuckets = []
  }

  return {
    ...cacheBotState,
    buildId: CACHE_BOT_BUILD,
    prebuilt: await getPrebuiltCatalogStatus(),
    memory: {
      vod: catalogCache.size,
      vodGrouped: groupedCatalogCache.size,
      live: liveCatalogCache.size,
      metadata: metadataCache.size,
    },
    diskBuckets,
  }
}

async function runMediaCacheBot() {
  await readCacheBotState()
  if (cacheBotState.isRunning) return await getMediaCacheStatus()
  await writeCacheBotState({
    isRunning: true,
    startedAt: new Date().toISOString(),
    lastRunAt: '',
    currentStep: 'başlıyor',
    lastMessage: 'Katalog botu çalışıyor.',
  })
  try {
    const settings = await readAdminSettings()
    const tasks = [
      ['Canlı TV', 60_000, () => loadLiveServerCatalog(settings.liveM3uUrl || LIVE_M3U_URL, settings.updatedAt || '', 'live')],
      ['Spor', 60_000, () => (settings.sportsM3uUrl ? loadLiveServerCatalog(settings.sportsM3uUrl, settings.updatedAt || '', 'sports') : Promise.resolve([]))],
      ['Dizi/Film', 180_000, async () => {
        const sourceKey = settings.vodM3uUrl || VOD_M3U_URL
        const refreshKey = settings.updatedAt || ''
        const grouped = await loadGroupedServerCatalog(sourceKey, refreshKey)
        if (!(await hasMediaDiskCache('vodGrouped'))) {
          const ok = await ensureMediaDiskCache('vodGrouped', `${sourceKey}::${refreshKey}`, grouped)
          if (!ok) throw new Error('Dizi/Film cache dosyaya yazılamadı.')
        }
        return grouped
      }],
    ]
    const results = []
    for (const [label, timeoutMs, task] of tasks) {
      await writeCacheBotState({
        currentStep: label,
        lastMessage: `${label} kataloğu hazırlanıyor.`,
      })
      results.push(await withTimeout(Promise.resolve().then(task), timeoutMs, label).then(
        () => ({ status: 'fulfilled', label }),
        (error) => ({ status: 'rejected', label, reason: error instanceof Error ? error.message : String(error) }),
      ))
    }
    const okCount = results.filter((result) => result.status === 'fulfilled').length
    const errors = results
      .filter((result) => result.status === 'rejected')
      .map((result) => `${result.label}: ${result.reason}`)
      .join(' | ')
    await writeCacheBotState({
      isRunning: false,
      currentStep: '',
      startedAt: '',
      lastRunAt: new Date().toISOString(),
      lastMessage: errors
        ? `${okCount}/${results.length} katalog hazır. Sorun: ${errors}`
        : `${okCount}/${results.length} katalog önbelleğe alındı.`,
    })
  } catch (error) {
    await writeCacheBotState({
      isRunning: false,
      currentStep: '',
      startedAt: '',
      lastRunAt: new Date().toISOString(),
      lastMessage: error instanceof Error ? error.message : 'Katalog botu tamamlanamadı.',
    })
  }
  return await getMediaCacheStatus()
}

async function handleCacheControl(req, res) {
  if (req.method === 'GET') {
    sendJson(res, await getMediaCacheStatus())
    return
  }

  if (req.method !== 'POST') {
    send(res, 405, 'Method not allowed')
    return
  }

  const body = await readJsonBody(req)
  if (body.password !== ADMIN_PASSWORD) {
    sendJson(res, { ok: false }, 401)
    return
  }

  if (body.action === 'clear') {
    clearMediaCaches()
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(MEDIA_CACHE_FILE, '{}\n')
    await writeCacheBotState({
      isRunning: false,
      currentStep: '',
      startedAt: '',
      lastRunAt: new Date().toISOString(),
      lastMessage: 'Sunucu katalog önbelleği temizlendi.',
    })
    sendJson(res, await getMediaCacheStatus())
    return
  }

  if (body.action === 'warm') {
    if (body.wait) {
      sendJson(res, await runMediaCacheBot())
      return
    }
    void runMediaCacheBot()
    sendJson(res, await getMediaCacheStatus())
    return
  }

  sendJson(res, await getMediaCacheStatus())
}

async function handleAdminSettings(req, res) {
  if (req.method === 'GET') {
    sendJson(res, await readAdminSettings())
    return
  }
  if (req.method !== 'POST') {
    send(res, 405, 'Method not allowed')
    return
  }

  const body = await readJsonBody(req)
  if (body.password !== ADMIN_PASSWORD) {
    send(res, 401, 'Unauthorized')
    return
  }

  const settings = body.reset
    ? { ...defaultAdminSettings, updatedAt: new Date().toISOString() }
    : normalizeAdminSettings(body.settings)
  await writeAdminSettings(settings)
  clearMediaCaches()
  sendJson(res, settings)
}

async function handleAdminAuth(req, res) {
  if (req.method !== 'POST') {
    send(res, 405, 'Method not allowed')
    return
  }

  const body = await readJsonBody(req)
  if (body.password !== ADMIN_PASSWORD) {
    sendJson(res, { ok: false }, 401)
    return
  }

  sendJson(res, { ok: true })
}

async function handleCatalog(req, res, requestUrl) {
  const category = requestUrl.searchParams.get('category') ?? 'all'
  const query = (requestUrl.searchParams.get('q') ?? '').toLocaleLowerCase('tr-TR')
  const vodCategory = requestUrl.searchParams.get('vodCategory') ?? ''
  const platform = requestUrl.searchParams.get('platform') ?? ''
  const sourceUrl = requestUrl.searchParams.get('source') || VOD_M3U_URL
  const refreshKey = requestUrl.searchParams.get('refresh') || ''
  const offset = Number(requestUrl.searchParams.get('offset') ?? '0')
  const limit = Number(requestUrl.searchParams.get('limit') ?? '800')
  const catalog = await loadGroupedServerCatalog(sourceUrl, refreshKey)
  const scopedCatalog = catalog.filter((item) => {
    if (category === 'series' && item.type !== 'series') return false
    if (category === 'movies' && item.type !== 'movie') return false
    return true
  })
  const categories = getSortedValues(scopedCatalog.map((item) => item.genre || inferGenre(item.category, item.title, item.type)))
  const platforms = getSortedValues(scopedCatalog.map((item) => item.platform || inferPlatform(item.category, item.title)))
  const filtered = catalog.filter((item) => {
    if (category === 'series' && item.type !== 'series') return false
    if (category === 'movies' && item.type !== 'movie') return false
    if (vodCategory && item.category !== vodCategory && (item.genre || inferGenre(item.category, item.title, item.type)) !== vodCategory) {
      return false
    }
    if (platform && (item.platform || inferPlatform(item.category, item.title)) !== platform) return false
    if (query && !`${item.title} ${item.displayTitle ?? ''} ${item.category}`.toLocaleLowerCase('tr-TR').includes(query)) {
      return false
    }
    return true
  })
  const items = await hydrateVodEpisodes(filtered.slice(offset, offset + limit))
  sendJson(res, { items, total: filtered.length, categories, platforms })
}

async function handleLiveCatalog(req, res, requestUrl) {
  const country = requestUrl.searchParams.get('country') ?? ''
  const liveCategory = requestUrl.searchParams.get('liveCategory') ?? ''
  const query = (requestUrl.searchParams.get('q') ?? '').toLocaleLowerCase('tr-TR')
  const sourceUrl = requestUrl.searchParams.get('source') || ''
  const library = requestUrl.searchParams.get('library') || ''
  const refreshKey = requestUrl.searchParams.get('refresh') || ''
  const ids = (requestUrl.searchParams.get('ids') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  const idSet = new Set(ids)
  const offset = Number(requestUrl.searchParams.get('offset') ?? '0')
  const limit = Number(requestUrl.searchParams.get('limit') ?? '120')
  const catalog = await loadLiveServerCatalog(sourceUrl, refreshKey, library)
  const countries = getSortedValues(catalog.map((item) => item.country ?? item.category))
  const categories = getSortedValues(
    catalog
      .filter((item) => (country ? (item.country ?? item.category) === country : true))
      .map((item) => item.liveCategory ?? 'Genel'),
  )
  const filtered = catalog.filter((item) => {
    const itemCountry = item.country ?? item.category
    const itemCategory = item.liveCategory ?? 'Genel'
    if (idSet.size && !idSet.has(item.id)) return false
    if (country && itemCountry !== country) return false
    if (liveCategory && itemCategory !== liveCategory) return false
    if (query && !`${item.title} ${itemCountry} ${itemCategory}`.toLocaleLowerCase('tr-TR').includes(query)) {
      return false
    }
    return true
  })
  sendJson(res, { items: filtered.slice(offset, offset + limit), total: filtered.length, countries, categories })
}

async function handleMetadata(req, res, requestUrl) {
  const title = cleanMetadataTitle(requestUrl.searchParams.get('title') || '')
  const fallbackMetadata = emptyMetadata(title || requestUrl.searchParams.get('title') || '', {
    category: requestUrl.searchParams.get('category') || '',
    platform: requestUrl.searchParams.get('platform') || '',
    description: requestUrl.searchParams.get('description') || '',
  })
  if (!TMDB_API_KEY) {
    sendJson(res, { ...fallbackMetadata, missingApiKey: true })
    return
  }

  const type = requestUrl.searchParams.get('type') || 'movie'
  if (!title) {
    sendJson(res, { error: 'Missing title' }, 400)
    return
  }

  const cacheKey = `${type}:${title}`.toLocaleLowerCase('tr-TR')
  const cached = metadataCache.get(cacheKey)
  if (cached) {
    sendJson(res, cached)
    return
  }

  const metadata = await loadTmdbMetadata(title, type, fallbackMetadata)
  metadataCache.set(cacheKey, metadata)
  sendJson(res, metadata)
}

async function handleProxy(req, res, requestUrl) {
  const target = requestUrl.searchParams.get('url')
  const userAgent = requestUrl.searchParams.get('ua') || DEFAULT_USER_AGENT
  const referer = requestUrl.searchParams.get('referer') || ''
  const origin = requestUrl.searchParams.get('origin') || ''
  const range = req.headers.range

  if (!target) {
    send(res, 400, 'Missing url parameter')
    return
  }

  const upstreamAbort = new AbortController()
  req.on('aborted', () => upstreamAbort.abort())
  res.on('close', () => upstreamAbort.abort())

  const upstream = await fetch(target, {
    signal: upstreamAbort.signal,
    headers: {
      'User-Agent': userAgent,
      'http-user-agent': userAgent,
      ...(referer ? { Referer: referer } : {}),
      ...(origin ? { Origin: origin } : {}),
      ...(range ? { Range: range } : {}),
      Accept: '*/*',
    },
  })

  res.statusCode = upstream.status
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  const contentType = upstream.headers.get('content-type') ?? ''
  const shouldRewritePlaylist =
    target.includes('.m3u8') ||
    contentType.includes('mpegurl') ||
    contentType.includes('application/vnd.apple.mpegurl')
  const shouldInspectLivePlaylist =
    Boolean(referer || origin) &&
    (target.includes('/vavoo-iptv/play/') || target.includes('workers.dev') || contentType.includes('text/'))

  if (shouldRewritePlaylist || shouldInspectLivePlaylist) {
    const playlist = await upstream.text()
    if (!shouldRewritePlaylist && !playlist.trimStart().startsWith('#EXTM3U')) {
      if (contentType) res.setHeader('Content-Type', contentType)
      res.end(playlist)
      return
    }
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8')
    res.end(rewritePlaylist(playlist, target, userAgent, referer, origin))
    return
  }

  const contentLength = upstream.headers.get('content-length')
  const contentRange = upstream.headers.get('content-range')
  const acceptRanges = upstream.headers.get('accept-ranges')
  if (contentType) res.setHeader('Content-Type', contentType)
  if (contentLength) res.setHeader('Content-Length', contentLength)
  if (contentRange) res.setHeader('Content-Range', contentRange)
  if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges)
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  if (!upstream.body) {
    res.end()
    return
  }

  const reader = upstream.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done || res.destroyed) break
    res.write(Buffer.from(value))
  }
  res.end()
}

async function handleDownload(req, res, requestUrl) {
  const target = requestUrl.searchParams.get('url')
  const userAgent = requestUrl.searchParams.get('ua') || DEFAULT_USER_AGENT
  const title = sanitizeFilename(requestUrl.searchParams.get('title') || 'atlastv-video.mp4')

  if (!target) {
    send(res, 400, 'Missing url parameter')
    return
  }

  const upstreamAbort = new AbortController()
  req.on('aborted', () => upstreamAbort.abort())
  res.on('close', () => upstreamAbort.abort())

  const upstream = await fetch(target, {
    signal: upstreamAbort.signal,
    headers: {
      'User-Agent': userAgent,
      'http-user-agent': userAgent,
      Accept: '*/*',
    },
  })

  if (!upstream.ok || !upstream.body) {
    send(res, upstream.status || 502, 'Video indirilemedi')
    return
  }

  const contentType = upstream.headers.get('content-type') || (/\.m3u8(?:$|\?)/i.test(target) ? 'application/vnd.apple.mpegurl' : 'video/mp4')
  const finalTitle = /mpegurl|m3u8/i.test(contentType) || /\.m3u8(?:$|\?)/i.test(target)
    ? title.replace(/\.mp4$/i, '.m3u8')
    : title

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Disposition': `attachment; filename="${finalTitle.replace(/"/g, '')}"`,
    'Cache-Control': 'no-store',
    ...(upstream.headers.get('content-length') ? { 'Content-Length': upstream.headers.get('content-length') } : {}),
  })
  upstream.body.pipeTo(new WritableStream({
    write(chunk) {
      res.write(Buffer.from(chunk))
    },
    close() {
      res.end()
    },
    abort() {
      res.end()
    },
  })).catch(() => {
    if (!res.destroyed) res.end()
  })
}

function loadServerCatalog(sourceUrl = VOD_M3U_URL, refreshKey = '') {
  const cacheKey = `${sourceUrl || VOD_M3U_URL}::${refreshKey}`
  const cached = catalogCache.get(cacheKey)
  if (cached) return Promise.resolve(cached)
  const pending = catalogPromise.get(cacheKey)
  if (pending) return pending

  const pendingLoad = fetch(sourceUrl || VOD_M3U_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`M3U failed: ${response.status}`)
      return response.text()
    })
    .then((playlist) => {
      const parsed = parseVodPlaylist(playlist, sourceUrl || VOD_M3U_URL)
      catalogCache.set(cacheKey, parsed)
      return parsed
    })
    .finally(() => {
      catalogPromise.delete(cacheKey)
    })

  catalogPromise.set(cacheKey, pendingLoad)
  return pendingLoad
}

async function loadGroupedServerCatalog(sourceUrl = VOD_M3U_URL, refreshKey = '') {
  const cacheKey = `${sourceUrl || VOD_M3U_URL}::${refreshKey}`
  const cached = groupedCatalogCache.get(cacheKey)
  if (cached) return Promise.resolve(cached)
  const pending = groupedCatalogPromise.get(cacheKey)
  if (pending) return pending

  if (isDefaultVodSource(sourceUrl)) {
    const prebuilt = (await readPrebuiltCatalog('vod-index.json')) ?? (await readPrebuiltCatalog('vod-grouped.json'))
    if (Array.isArray(prebuilt) && prebuilt.length) {
      groupedCatalogCache.set(cacheKey, prebuilt)
      return prebuilt
    }
  }

  const diskCached = await readMediaDiskCache('vodGrouped', cacheKey)
  if (diskCached) {
    groupedCatalogCache.set(cacheKey, diskCached)
    return diskCached
  }

  const pendingLoad = loadServerCatalog(sourceUrl, refreshKey)
    .then((catalog) => {
      const grouped = groupCatalogItems(catalog)
      groupedCatalogCache.set(cacheKey, grouped)
      void writeMediaDiskCache('vodGrouped', cacheKey, grouped)
      return grouped
    })
    .finally(() => {
      groupedCatalogPromise.delete(cacheKey)
    })
  groupedCatalogPromise.set(cacheKey, pendingLoad)
  return pendingLoad
}

async function hydrateVodEpisodes(items) {
  if (!items.some((item) => item.episodeCount > 1)) return items

  const episodesByGroup = await readPrebuiltCatalog('vod-episodes.json')
  if (!episodesByGroup || Array.isArray(episodesByGroup)) return items

  return items.map((item) => {
    const episodes = episodesByGroup[item.groupId || item.id]
    return Array.isArray(episodes) && episodes.length ? { ...item, episodes } : item
  })
}

async function loadLiveServerCatalog(sourceUrl = '', refreshKey = '', library = '') {
  const settings = await readAdminSettings()
  const uploadedPlaylist =
    library === 'sports'
      ? settings.sportsM3uContent
      : library === 'live'
        ? settings.liveM3uContent
        : ''
  const effectiveSourceUrl = sourceUrl || LIVE_M3U_URL
  const sourceKey = uploadedPlaylist ? `uploaded-${library || 'live'}` : effectiveSourceUrl || LIVE_M3U_FILE || 'live'
  const cacheKey = `${sourceKey}::${refreshKey}`
  const cached = liveCatalogCache.get(cacheKey)
  if (cached) return Promise.resolve(cached)
  if (!uploadedPlaylist) {
    const prebuiltFile = library === 'sports' ? 'sports.json' : isDefaultLiveSource(effectiveSourceUrl) ? 'live.json' : ''
    if (prebuiltFile) {
      const prebuilt = await readPrebuiltCatalog(prebuiltFile)
      if (Array.isArray(prebuilt) && prebuilt.length) {
        liveCatalogCache.set(cacheKey, prebuilt)
        return prebuilt
      }
    }
  }
  const diskCached = await readMediaDiskCache(`live-${library || 'default'}`, cacheKey)
  if (diskCached) {
    liveCatalogCache.set(cacheKey, diskCached)
    return diskCached
  }
  const pending = liveCatalogPromise.get(cacheKey)
  if (pending) return pending

  const playlistPromise = uploadedPlaylist
    ? Promise.resolve(uploadedPlaylist)
    : effectiveSourceUrl === LIVE_M3U_URL
      ? readFile(join(DIST_DIR, 'vavoo_full_worker.m3u'), 'utf8').catch(() =>
          fetch(effectiveSourceUrl).then((response) => {
            if (!response.ok) throw new Error(`Live M3U failed: ${response.status}`)
            return response.text()
          }),
        )
    : effectiveSourceUrl
    ? fetch(effectiveSourceUrl).then((response) => {
        if (!response.ok) throw new Error(`Live M3U failed: ${response.status}`)
        return response.text()
      })
    : LIVE_M3U_FILE
      ? readFile(LIVE_M3U_FILE, 'utf8')
      : Promise.resolve('')

  const pendingLoad = playlistPromise
    .then((playlist) => {
      const parsed = playlist ? parseLivePlaylist(playlist, sourceKey) : []
      liveCatalogCache.set(cacheKey, parsed)
      void writeMediaDiskCache(`live-${library || 'default'}`, cacheKey, parsed)
      return parsed
    })
    .finally(() => {
      liveCatalogPromise.delete(cacheKey)
    })

  liveCatalogPromise.set(cacheKey, pendingLoad)
  return pendingLoad
}

async function loadTmdbMetadata(title, type, fallbackMetadata = {}) {
  const preferredType = type === 'series' ? 'tv' : 'movie'
  const queryVariants = uniqueStrings([
    title,
    title.replace(/ı/g, 'i').replace(/İ/g, 'I'),
    title.replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ü/g, 'u').replace(/Ü/g, 'U').replace(/ş/g, 's').replace(/Ş/g, 'S').replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ç/g, 'c').replace(/Ç/g, 'C').replace(/ı/g, 'i').replace(/İ/g, 'I'),
    title.split(/[:|-]/)[0]?.trim(),
  ])
  let result = null
  let mediaType = preferredType

  for (const query of queryVariants) {
    if (!query) continue
    const search = await tmdbFetch(`/search/${preferredType}`, { query })
    result = pickBestTmdbResult(search.results ?? [], title)
    mediaType = preferredType
    if (result) break

    const multi = await tmdbFetch('/search/multi', { query })
    result = pickBestTmdbResult(
      (multi.results ?? []).filter((entry) => entry.media_type === 'movie' || entry.media_type === 'tv'),
      title,
    )
    mediaType = result?.media_type || preferredType
    if (result) break
  }

  if (!result?.id) return { ...fallbackMetadata, title: fallbackMetadata.title || title }

  const details = await tmdbFetch(`/${mediaType}/${result.id}`, {
    append_to_response: 'credits,videos,external_ids,watch/providers',
  })
  const fallbackDetails = details.overview
    ? null
    : await tmdbFetch(`/${mediaType}/${result.id}`, { language: 'en-US', append_to_response: 'videos' })
  const videos = [...(details.videos?.results ?? []), ...(fallbackDetails?.videos?.results ?? [])]
  const trailer =
    videos.find((video) => video.site === 'YouTube' && video.type === 'Trailer') ??
    videos.find((video) => video.site === 'YouTube')
  const providers = details['watch/providers']?.results?.TR
  const providerNames = uniqueStrings([
    ...(providers?.flatrate ?? []),
    ...(providers?.buy ?? []),
    ...(providers?.rent ?? []),
    ...(providers?.ads ?? []),
  ].map((provider) => provider.provider_name))
  const crewJobs = new Set(mediaType === 'tv' ? ['Creator', 'Executive Producer'] : ['Director', 'Writer'])

  return {
    title: details.title || details.name || result.title || result.name || title,
    originalTitle: details.original_title || details.original_name || '',
    overview: details.overview || fallbackDetails?.overview || '',
    tagline: details.tagline || '',
    releaseYear: (details.release_date || details.first_air_date || '').slice(0, 4),
    runtime: details.runtime || details.episode_run_time?.[0] || undefined,
    tmdbRating: details.vote_average ? Number(details.vote_average.toFixed(1)) : undefined,
    voteCount: details.vote_count || 0,
    imdbId: details.external_ids?.imdb_id || '',
    genres: (details.genres ?? []).map((genre) => genre.name).filter(Boolean),
    cast: (details.credits?.cast ?? []).slice(0, 12).map((actor) => ({
      name: actor.name,
      character: actor.character,
      profileUrl: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : '',
    })),
    crew: (details.credits?.crew ?? [])
      .filter((person) => crewJobs.has(person.job))
      .slice(0, 6)
      .map((person) => ({ name: person.name, job: person.job })),
    providers: providerNames,
    trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '',
    posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '',
    backdropUrl: details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : '',
    homepage: details.homepage || '',
  }
}

async function tmdbFetch(pathname, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${pathname}`)
  url.searchParams.set('api_key', TMDB_API_KEY)
  url.searchParams.set('language', params.language || 'tr-TR')
  url.searchParams.set('include_adult', 'false')
  Object.entries(params).forEach(([key, value]) => {
    if (value && key !== 'language') url.searchParams.set(key, String(value))
  })
  const response = await fetch(url)
  if (!response.ok) throw new Error(`TMDB failed: ${response.status}`)
  return response.json()
}

function cleanMetadataTitle(title) {
  return title
    .replace(/\s+-\s+T[üu]rk[çc]e\s+(Dublaj|Altyaz[ıi])/gi, '')
    .replace(/\s*[-|:]\s*(?:Bölüm|Bolum|Episode|Ep\.?)\s*\d+/gi, '')
    .replace(/\s*-\s*m3u8\b/gi, '')
    .replace(/\b(?:m3u8|1080p|720p|4k|web-?dl|bluray|hdtv|x264|x265)\b/gi, '')
    .replace(/\s*S\d+\s*E\d+\s*/gi, ' ')
    .replace(/\s+\(\d{4}\)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferPlatform(category = '', title = '') {
  const source = `${category} ${title}`.toLocaleLowerCase('tr-TR')
  const platforms = [
    ['Netflix', /netflix|nf\b/],
    ['Disney+', /disney|disney\+/],
    ['Prime Video', /prime|amazon/],
    ['BluTV', /blutv|blu tv/],
    ['Exxen', /exxen/],
    ['Gain', /\bgain\b/],
    ['TOD', /\btod\b|bein/],
    ['HBO Max', /hbo|max/],
    ['Apple TV+', /apple/],
    ['TRT Tabii', /tabii|trt/],
  ]
  return platforms.find(([, pattern]) => pattern.test(source))?.[0] || stablePick(PRESET_PLATFORMS.filter((platform) => platform !== 'Katalog'), title || category)
}

function inferGenre(category = '', title = '', type = 'movie') {
  const source = `${category} ${title}`.toLocaleLowerCase('tr-TR')
  const genreRules = [
    ['Aksiyon', /aksiyon|action|savaşçı|operasyon|mission|fast|furious|john wick|marvel|dc\b/],
    ['Macera', /macera|adventure|jungle|hazine|pirates|journey|quest/],
    ['Dram', /dram|drama|hayat|aşk|ask|yaşam|yasam|family|aile dram/],
    ['Komedi', /komedi|comedy|güldür|guldur|laugh|funny|recep|kolpa/],
    ['Romantik', /romantik|romance|aşk|ask|love|sevgili|wedding/],
    ['Korku', /korku|horror|dehşet|dehset|cin|şeytan|seytan|scream|haunted/],
    ['Gerilim', /gerilim|thriller|suspense|kaçış|kacis|trap|tehlike/],
    ['Bilim Kurgu', /bilim kurgu|sci-fi|scifi|space|uzay|robot|alien|matrix|future/],
    ['Fantastik', /fantastik|fantasy|magic|sihir|peri|orman|dragon|harry potter/],
    ['Animasyon', /animasyon|animation|anime|cartoon|pixar|disney/],
    ['Aile', /aile|family|çocuk|cocuk|kids/],
    ['Suç', /suç|suc|crime|mafia|gangster|polisiye|dedektif/],
    ['Gizem', /gizem|mystery|secret|sır|sir|detective/],
    ['Belgesel', /belgesel|documentary|docu/],
    ['Savaş', /savaş|savas|war|battle|soldier/],
    ['Tarih', /tarih|history|historical|osmanlı|osmanli/],
    ['Western', /western|cowboy/],
    ['Yerli', /yerli|turkish|türk|turk/],
  ]
  return genreRules.find(([, pattern]) => pattern.test(source))?.[0] || stablePick(PRESET_GENRES, `${type}-${title || category}`)
}

function isGenericVodCategory(category = '') {
  return /^(tüm|tum|all)\s*(filmler|movies|diziler|series)?$/i.test(category.trim())
}

function emptyMetadata(title, fallback = {}) {
  return {
    title,
    overview: fallback.description || 'Bu içerik M3U kataloğundan alındı. TMDB anahtarı eklenince özet, oyuncu kadrosu, fragman ve platform bilgileri otomatik zenginleşir.',
    genres: [fallback.category].filter(Boolean),
    cast: [],
    crew: [],
    providers: [fallback.platform].filter(Boolean),
  }
}

function pickBestTmdbResult(results, title) {
  if (!results.length) return null
  const normalizedTitle = normalizeSearchText(title)
  return [...results].sort((a, b) => {
    const aName = normalizeSearchText(a.title || a.name || a.original_title || a.original_name || '')
    const bName = normalizeSearchText(b.title || b.name || b.original_title || b.original_name || '')
    const aScore = (aName === normalizedTitle ? 100 : aName.includes(normalizedTitle) || normalizedTitle.includes(aName) ? 45 : 0) + (a.popularity || 0)
    const bScore = (bName === normalizedTitle ? 100 : bName.includes(normalizedTitle) || normalizedTitle.includes(bName) ? 45 : 0) + (b.popularity || 0)
    return bScore - aScore
  })[0]
}

function normalizeSearchText(value = '') {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function stablePick(values, seed = '') {
  if (!values.length) return ''
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return values[hash % values.length]
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean)))
}

function parseLivePlaylist(playlist, sourceKey = 'live') {
  const lines = playlist
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const items = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.startsWith('#EXTINF')) continue

    const rawTitle = getTitleFromExtinf(line)
    const country = getAttribute(line, 'group-title') || 'Bilinmeyen'
    const title = getLiveDisplayTitle(rawTitle)
    const liveCategory = inferLiveCategory(title)
    const logoUrl = getAttribute(line, 'tvg-logo')
    let httpUserAgent = DEFAULT_USER_AGENT
    let streamUrl = ''

    for (let next = index + 1; next < lines.length; next += 1) {
      const nextLine = lines[next]
      if (nextLine.startsWith('#EXTVLCOPT:http-user-agent=')) {
        httpUserAgent = nextLine.replace('#EXTVLCOPT:http-user-agent=', '').trim()
        continue
      }
      if (!nextLine.startsWith('#')) {
        streamUrl = nextLine
        index = next
        break
      }
    }

    if (!streamUrl) continue

    items.push({
      id: `live-${slugify(sourceKey).slice(0, 24)}-${slugify(country)}-${slugify(rawTitle)}-${items.length}`,
      title,
      displayTitle: title,
      type: 'live',
      category: country,
      country,
      liveCategory,
      streamUrl,
      posterUrl: logoUrl || getLiveImage(country, title, liveCategory, 'poster'),
      backdropUrl: logoUrl || getLiveImage(country, title, liveCategory, 'backdrop'),
      rating: Number((7.2 + (items.length % 18) / 10).toFixed(1)),
      description: `${country} ülkesinden ${liveCategory.toLocaleLowerCase('tr-TR')} canlı yayını.`,
      isLive: true,
      isFavorite: false,
      httpUserAgent,
      referer: VAVOO_REFERER,
      origin: VAVOO_ORIGIN,
      badge: liveCategory,
    })
  }

  return items
}

function parseVodPlaylist(playlist, sourceKey = 'vod') {
  const lines = playlist
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const items = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.startsWith('#EXTINF')) continue

    const title = getTitleFromExtinf(line)
    const category = getAttribute(line, 'group-title') || 'Tüm Filmler'
    const logoUrl = getAttribute(line, 'tvg-logo')
    const posterUrl = logoUrl || PLACEHOLDER_POSTER
    let httpUserAgent = DEFAULT_USER_AGENT
    let streamUrl = ''

    for (let next = index + 1; next < lines.length; next += 1) {
      const nextLine = lines[next]
      if (nextLine.startsWith('#EXTVLCOPT:http-user-agent=')) {
        httpUserAgent = nextLine.replace('#EXTVLCOPT:http-user-agent=', '').trim()
        continue
      }
      if (!nextLine.startsWith('#')) {
        streamUrl = nextLine
        index = next
        break
      }
    }

    if (!streamUrl) continue

    const type = inferType(category, title)
    const displayTitle = getDisplayTitle(title)
    const episodeInfo = getEpisodeInfo(title)
    const groupId = `group-${slugify(displayTitle)}`
    items.push({
      id: `vod-${slugify(sourceKey).slice(0, 24)}-${slugify(title)}-${items.length}`,
      title,
      displayTitle,
      groupId,
      type,
      category,
      platform: inferPlatform(category, displayTitle),
      genre: inferGenre(category, displayTitle, type),
      streamUrl,
      posterUrl,
      backdropUrl: logoUrl || PLACEHOLDER_BACKDROP,
      rating: Number((6.8 + (items.length % 23) / 10).toFixed(1)),
      description:
        type === 'series'
          ? 'Bu dizi içeriği M3U VOD listesinden alındı.'
          : 'Bu film içeriği M3U VOD listesinden alındı.',
      isLive: false,
      isFavorite: items.length % 17 === 0,
      httpUserAgent,
      seasonNumber: episodeInfo.season,
      episodeNumber: episodeInfo.episode,
      progress: items.length % 13 === 0 ? 35 + (items.length % 45) : undefined,
      badge: type === 'series' ? 'Dizi' : 'Film',
    })
  }

  return items
}

function groupCatalogItems(items) {
  const groups = new Map()

  for (const item of items) {
    const key = item.groupId ?? item.id
    groups.set(key, [...(groups.get(key) ?? []), item])
  }

  return Array.from(groups.values()).map((episodes) => {
    const sorted = [...episodes].sort((a, b) => {
      const seasonDelta = (a.seasonNumber ?? 1) - (b.seasonNumber ?? 1)
      if (seasonDelta) return seasonDelta
      return (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0)
    })
    const representative = sorted[0]
    const seasonCount = new Set(sorted.map((episode) => episode.seasonNumber ?? 1)).size
    const isEpisodeGroup = sorted.length > 1 && sorted.some((episode) => episode.episodeNumber)

    return {
      ...representative,
      title: representative.displayTitle ?? representative.title,
      type: isEpisodeGroup ? 'series' : representative.type,
      platform: representative.platform || inferPlatform(representative.category, representative.displayTitle ?? representative.title),
      genre: representative.genre || inferGenre(representative.category, representative.displayTitle ?? representative.title, representative.type),
      episodeCount: isEpisodeGroup ? sorted.length : 1,
      seasonCount,
      ...(isEpisodeGroup ? { episodes: sorted.map((episode) => compactEpisode(episode, representative)) } : {}),
      badge: isEpisodeGroup ? `${sorted.length} Bölüm` : representative.badge,
    }
  })
}

function compactEpisode(episode, representative) {
  return {
    id: episode.id,
    title: episode.title,
    displayTitle: representative.displayTitle ?? representative.title,
    groupId: representative.groupId,
    type: 'series',
    category: representative.category,
    platform: representative.platform,
    genre: representative.genre,
    streamUrl: episode.streamUrl,
    posterUrl: episode.posterUrl || representative.posterUrl,
    backdropUrl: episode.backdropUrl || representative.backdropUrl,
    rating: representative.rating,
    description: representative.description,
    isLive: false,
    isFavorite: false,
    httpUserAgent: episode.httpUserAgent || representative.httpUserAgent,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    badge: episode.episodeNumber ? `Bölüm ${episode.episodeNumber}` : representative.badge,
  }
}

function getAttribute(line, name) {
  const match = line.match(new RegExp(`${name}="([^"]*)"`, 'i'))
  return match?.[1]?.trim() ?? ''
}

function getTitleFromExtinf(line) {
  const commaIndex = line.indexOf(',')
  return commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : 'İsimsiz İçerik'
}

function getDisplayTitle(title) {
  return title
    .replace(/\s+-\s+T[üu]rk[cç]e\s+(Dublaj|Altyaz[ıi])/gi, '')
    .replace(/\s+-\s+m3u8/gi, '')
    .replace(/\s*[-|:]\s*\d+\.?\s*S(?:ezon|eason)?\s+\d+\.?\s*B[öo]l[üu]m\s*$/gi, '')
    .replace(/\s*[-|:]\s*S(?:ezon|eason)?\s*\d+\s*E(?:pisode|p)?\s*\d+\s*$/gi, '')
    .replace(/\s*[-|:]\s*S\d{1,2}\s*E\d{1,3}\s*$/gi, '')
    .replace(/\s*[-|:]\s*\d+x\d+\s*$/gi, '')
    .replace(/\s*[-|:]\s*(?:B[öo]l[üu]m|Bolum|Episode|Ep\.?)\s*\d+\s*$/gi, '')
    .replace(/\s*[-|:]\s*\d+\.?\s*(?:B[öo]l[üu]m|Bolum|Episode|Ep\.?)\s*$/gi, '')
    .replace(/\s*\((?:B[öo]l[üu]m|Bolum|Episode|Ep\.?)\s*\d+\)\s*$/gi, '')
    .replace(/\s+\d+\.?\s*S(?:ezon)?\s+\d+\.?\s*B[öo]l[üu]m\s*$/gi, '')
    .replace(/\s*[-|:]\s*\d+\.?\s*S(?:ezon|eason)?\s*(?:Dublaj|Altyaz[ıi])?\s*$/gi, '')
    .replace(/\s*[-|:]\s*S(?:ezon|eason)?\s*\d+\s*(?:Dublaj|Altyaz[ıi])?\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getEpisodeInfo(title) {
  const source = title
    .replace(/\s+-\s+T[üu]rk[cç]e\s+(Dublaj|Altyaz[ıi])/gi, '')
    .replace(/\s+-\s*m3u8/gi, '')
  const seasonEpisode =
    source.match(/(\d+)\.?\s*S(?:ezon|eason)?\b.*?(?:B[öo]l[üu]m|Bolum|Episode|Ep\.?)\s*(\d+)/i) ??
    source.match(/(\d+)\.?\s*S(?:ezon)?\s+(\d+)\.?\s*B[öo]l[üu]m/i) ??
    source.match(/S(?:ezon|eason)?\s*(\d+)\s*E(?:pisode|p)?\s*(\d+)/i) ??
    source.match(/S(\d+)\s*E(\d+)/i) ??
    source.match(/(\d+)x(\d+)/i)

  const standaloneEpisode =
    source.match(/(?:^|[-|:])\s*(?:B[öo]l[üu]m|Bolum|Episode|Ep\.?)\s*(\d+)\s*$/i) ??
    source.match(/(?:^|[-|:])\s*(\d+)\.?\s*(?:B[öo]l[üu]m|Bolum|Episode|Ep\.?)\s*$/i)

  if (!seasonEpisode) {
    return { season: 1, episode: standaloneEpisode ? Number(standaloneEpisode[1]) || undefined : undefined }
  }
  return {
    season: Number(seasonEpisode[1]) || 1,
    episode: Number(seasonEpisode[2]) || undefined,
  }
}

function getLiveDisplayTitle(title) {
  return title
    .replace(/\s+\.[a-z]$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferLiveCategory(title) {
  const source = title.toLocaleLowerCase('tr-TR')
  if (/(spor|sport|bein|arena|s sport|euro ?sport|espn|fight|golf|racing|nba|nfl|ufc|dazn|match)/i.test(source)) {
    return 'Spor'
  }
  if (/(news|haber|cnn|bbc|sky news|al jazeera|euronews|ntv|a haber|fox news|bloomberg)/i.test(source)) {
    return 'Haber'
  }
  if (/(movie|movies|film|cinema|kino|action|thriller|comedy|horror|series|dizi|box office)/i.test(source)) {
    return 'Film & Dizi'
  }
  if (/(kids|çocuk|cocuk|cartoon|disney|nick|boomerang|minika|baby|junior|toons)/i.test(source)) return 'Çocuk'
  if (/(music|muzik|müzik|mtv|radio|vh1|club|hit|hits)/i.test(source)) return 'Müzik'
  if (/(discovery|animal|history|nat geo|national geographic|docu|doku|science|planet|wild)/i.test(source)) {
    return 'Belgesel'
  }
  if (/(islam|quran|kuran|mekke|medine|religion|diyanet)/i.test(source)) return 'Dini'
  return 'Genel'
}

function getLivePlaceholder(category, variant) {
  const width = variant === 'poster' ? 500 : 1600
  const byCategory = {
    Spor: `https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=${width}&q=80`,
    Haber: `https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=${width}&q=80`,
    'Film & Dizi': `https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=${width}&q=80`,
    Çocuk: `https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=${width}&q=80`,
    Müzik: `https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=${width}&q=80`,
    Belgesel: `https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=${width}&q=80`,
    Dini: `https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=${width}&q=80`,
  }
  return byCategory[category] ?? (variant === 'poster' ? PLACEHOLDER_POSTER : PLACEHOLDER_BACKDROP)
}

function getLiveImage(country, title, category, variant) {
  if (country === 'Turkey') return getTurkishChannelLogo(title) ?? getChannelInitialImage(title, variant)
  return getLivePlaceholder(category, variant)
}

function getTurkishChannelLogo(title) {
  const normalized = title
    .toLocaleUpperCase('tr-TR')
    .replace(/^4K TR:\s*/i, '')
    .replace(/\b(HD|SD|FHD|RAW|\+)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  const logoByName = [
    [/^TRT 1\b/, 'TRT_1_logo_(2021-).svg'],
    [/^TRT HABER\b/, 'TRT_Haber_logo.svg'],
    [/^TRT SPOR\b/, 'TRT_Spor_logo.svg'],
    [/^TRT ÇOCUK\b|^TRT COCUK\b/, 'TRT_%C3%87ocuk_logo.svg'],
    [/^KANAL D\b/, 'Kanal_D_logo.svg'],
    [/^SHOW TV\b|^SHOW\b/, 'Show_TV_logo.svg'],
    [/^STAR TV\b|^STAR\b/, 'Star_TV_logo.svg'],
    [/^ATV\b/, 'ATV_logo.svg'],
    [/^TV8\b/, 'TV8_logo.svg'],
    [/^KANAL 7\b/, 'Kanal_7_logo.svg'],
    [/^CNN TÜRK\b|^CNN TURK\b/, 'CNN_T%C3%BCrk_logo.svg'],
    [/^NTV\b/, 'NTV_logo.svg'],
    [/^HABERTÜRK\b|^HABERTURK\b/, 'Habert%C3%BCrk_TV_logo.svg'],
    [/^A HABER\b/, 'A_Haber_logo.svg'],
    [/^A SPOR\b/, 'A_Spor_logo.svg'],
    [/^BEYAZ TV\b/, 'Beyaz_TV_logo.svg'],
    [/^HALK TV\b/, 'Halk_TV_logo.svg'],
    [/^TELE 1\b/, 'Tele_1_logo.svg'],
    [/^TGRT HABER\b/, 'TGRT_Haber_logo.svg'],
  ]
  const match = logoByName.find(([pattern]) => pattern.test(normalized))
  if (!match) return null
  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${match[1]}`
}

function getChannelInitialImage(title, variant) {
  const size = variant === 'poster' ? 512 : 900
  const name = encodeURIComponent(
    title
      .replace(/^4K TR:\s*/i, '')
      .replace(/\b(HD|SD|FHD|RAW|\+)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 32),
  )
  return `https://ui-avatars.com/api/?name=${name}&size=${size}&bold=true&background=071225&color=00e5ff&format=svg`
}

function getSortedValues(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => {
    if (a === 'Turkey') return -1
    if (b === 'Turkey') return 1
    if (a === 'Genel') return -1
    if (b === 'Genel') return 1
    return a.localeCompare(b, 'tr')
  })
}

function inferType(groupTitle, title) {
  const source = `${groupTitle} ${title}`.toLocaleLowerCase('tr-TR')
  if (/(\bdizi(?:leri)?\b|\bseries\b|sezon|season|s\d+\s*e\d+|\d+x\d+|(?:^|[-|:])\s*(?:bölüm|bolum|episode|ep\.?)\s*\d+\s*$|(?:^|[-|:])\s*\d+\.?\s*(?:bölüm|bolum|episode|ep\.?)\s*$)/i.test(source)) return 'series'
  return 'movie'
}

function slugify(value) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function sanitizeFilename(value) {
  const cleaned = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140)
  return /\.mp4$/i.test(cleaned) ? cleaned : `${cleaned || 'atlastv-video'}.mp4`
}

function rewritePlaylist(playlist, playlistUrl, userAgent, referer = '', origin = '') {
  const baseUrl = new URL(playlistUrl)
  const extraParams = new URLSearchParams({ ua: userAgent })
  if (referer) extraParams.set('referer', referer)
  if (origin) extraParams.set('origin', origin)
  const toProxyUrl = (rawUrl) => {
    if (/^(data|blob):/i.test(rawUrl)) return rawUrl
    const absoluteUrl = new URL(rawUrl, baseUrl).toString()
    return `${PROXY_PATH}?url=${encodeURIComponent(absoluteUrl)}&${extraParams.toString()}`
  }

  return playlist
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line

      const tagLine = line.replace(/URI="([^"]+)"/g, (_match, uri) => `URI="${toProxyUrl(uri)}"`)
      if (trimmed.startsWith('#')) return tagLine

      return toProxyUrl(trimmed)
    })
    .join('\n')
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
}

async function serveStatic(req, res, requestUrl) {
  const safePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '')
  const requestedPath = resolve(DIST_DIR, safePath || 'index.html')
  const filePath = requestedPath.startsWith(DIST_DIR) ? requestedPath : join(DIST_DIR, 'index.html')

  try {
    const fileStat = await stat(filePath)
    const finalPath = fileStat.isDirectory() ? join(filePath, 'index.html') : filePath
    const ext = extname(finalPath)
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=31536000, immutable',
    })
    createReadStream(finalPath).pipe(res)
  } catch {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    createReadStream(join(DIST_DIR, 'index.html')).pipe(res)
  }
}

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    if (requestUrl.pathname === ADMIN_SETTINGS_PATH) {
      await handleAdminSettings(req, res)
      return
    }
    if (requestUrl.pathname === ADMIN_AUTH_PATH) {
      await handleAdminAuth(req, res)
      return
    }
    if (requestUrl.pathname === USER_STATS_PATH) {
      await handleUserStats(req, res)
      return
    }
    if (requestUrl.pathname === CACHE_CONTROL_PATH) {
      await handleCacheControl(req, res)
      return
    }
    if (requestUrl.pathname === CATALOG_PATH) {
      await handleCatalog(req, res, requestUrl)
      return
    }
    if (requestUrl.pathname === LIVE_CATALOG_PATH) {
      await handleLiveCatalog(req, res, requestUrl)
      return
    }
    if (requestUrl.pathname === METADATA_PATH) {
      await handleMetadata(req, res, requestUrl)
      return
    }
    if (requestUrl.pathname === PROXY_PATH) {
      await handleProxy(req, res, requestUrl)
      return
    }
    if (requestUrl.pathname === DOWNLOAD_PATH) {
      await handleDownload(req, res, requestUrl)
      return
    }
    await serveStatic(req, res, requestUrl)
  } catch (error) {
    console.error('Atlas server error:', error)
    if (!res.headersSent) send(res, 500, 'Atlas server failed')
    else res.end()
  }
})

server.listen(PORT, () => {
  console.log(`AtlasTv server listening on http://0.0.0.0:${PORT}`)
})
