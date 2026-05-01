import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 5181)
const DIST_DIR = resolve(__dirname, 'dist')
const DATA_DIR = resolve(process.env.ATLAS_DATA_DIR || join(__dirname, '.atlas'))
const ADMIN_SETTINGS_FILE = resolve(process.env.ATLAS_SETTINGS_FILE || join(DATA_DIR, 'admin-settings.json'))

const PROXY_PATH = '/__atlas_proxy'
const CATALOG_PATH = '/__atlas_catalog'
const LIVE_CATALOG_PATH = '/__atlas_live_catalog'
const ADMIN_SETTINGS_PATH = '/__atlas_admin_settings'
const ADMIN_AUTH_PATH = '/__atlas_admin_auth'
const DEFAULT_USER_AGENT = 'okhttp/4.12.0'
const ADMIN_PASSWORD = process.env.ATLAS_ADMIN_PASSWORD || '190559'
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
  liveM3uContent: '',
  sportsM3uContent: '',
}

const catalogCache = new Map()
const groupedCatalogCache = new Map()
const catalogPromise = new Map()
const liveCatalogCache = new Map()
const liveCatalogPromise = new Map()

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
  catalogPromise.clear()
  liveCatalogCache.clear()
  liveCatalogPromise.clear()
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
  const sourceUrl = requestUrl.searchParams.get('source') || VOD_M3U_URL
  const refreshKey = requestUrl.searchParams.get('refresh') || ''
  const offset = Number(requestUrl.searchParams.get('offset') ?? '0')
  const limit = Number(requestUrl.searchParams.get('limit') ?? '800')
  const catalog = await loadGroupedServerCatalog(sourceUrl, refreshKey)
  const filtered = catalog.filter((item) => {
    if (category === 'series' && item.type !== 'series') return false
    if (category === 'movies' && item.type !== 'movie') return false
    if (query && !`${item.title} ${item.displayTitle ?? ''} ${item.category}`.toLocaleLowerCase('tr-TR').includes(query)) {
      return false
    }
    return true
  })
  sendJson(res, { items: filtered.slice(offset, offset + limit), total: filtered.length })
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

function loadGroupedServerCatalog(sourceUrl = VOD_M3U_URL, refreshKey = '') {
  const cacheKey = `${sourceUrl || VOD_M3U_URL}::${refreshKey}`
  const cached = groupedCatalogCache.get(cacheKey)
  if (cached) return Promise.resolve(cached)

  return loadServerCatalog(sourceUrl, refreshKey).then((catalog) => {
    const grouped = groupCatalogItems(catalog)
    groupedCatalogCache.set(cacheKey, grouped)
    return grouped
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
  const pending = liveCatalogPromise.get(cacheKey)
  if (pending) return pending

  const playlistPromise = uploadedPlaylist
    ? Promise.resolve(uploadedPlaylist)
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
      return parsed
    })
    .finally(() => {
      liveCatalogPromise.delete(cacheKey)
    })

  liveCatalogPromise.set(cacheKey, pendingLoad)
  return pendingLoad
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

    return {
      ...representative,
      title: representative.displayTitle ?? representative.title,
      type: sorted.length > 1 ? 'series' : representative.type,
      episodeCount: sorted.length,
      seasonCount,
      episodes: sorted,
      badge: sorted.length > 1 ? `${sorted.length} Bölüm` : representative.badge,
    }
  })
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
    .replace(/\s*[-|:]\s*\d+\.?\s*S(?:ezon|eason)?\s+\d+\.?\s*B[öo]l[üu]m/gi, '')
    .replace(/\s*[-|:]\s*S(?:ezon|eason)?\s*\d+\s*E(?:pisode|p)?\s*\d+/gi, '')
    .replace(/\s*[-|:]\s*S\d{1,2}\s*E\d{1,3}/gi, '')
    .replace(/\s*[-|:]\s*\d+x\d+/gi, '')
    .replace(/\s*[-|:]\s*(?:B[öo]l[üu]m|Bolum|Episode|Ep\.?)\s*\d+/gi, '')
    .replace(/\s*[-|:]\s*\d+\.?\s*(?:B[öo]l[üu]m|Bolum|Episode|Ep\.?)/gi, '')
    .replace(/\s*\((?:B[öo]l[üu]m|Bolum|Episode|Ep\.?)\s*\d+\)/gi, '')
    .replace(/\s+\d+\.?\s*S(?:ezon)?\s+\d+\.?\s*B[öo]l[üu]m/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getEpisodeInfo(title) {
  const seasonEpisode =
    title.match(/(\d+)\.?\s*S(?:ezon)?\s+(\d+)\.?\s*B[öo]l[üu]m/i) ??
    title.match(/S(?:ezon|eason)?\s*(\d+)\s*E(?:pisode|p)?\s*(\d+)/i) ??
    title.match(/S(\d+)\s*E(\d+)/i) ??
    title.match(/(\d+)x(\d+)/i)

  const standaloneEpisode =
    title.match(/(?:B[öo]l[üu]m|Bolum|Episode|Ep\.?)\s*(\d+)/i) ??
    title.match(/(\d+)\.?\s*(?:B[öo]l[üu]m|Bolum|Episode|Ep\.?)/i)

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
  if (/(dizi|series|sezon|bölüm|bolum|s\d+\s*e\d+|\d+x\d+)/i.test(source)) return 'series'
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
    if (requestUrl.pathname === CATALOG_PATH) {
      await handleCatalog(req, res, requestUrl)
      return
    }
    if (requestUrl.pathname === LIVE_CATALOG_PATH) {
      await handleLiveCatalog(req, res, requestUrl)
      return
    }
    if (requestUrl.pathname === PROXY_PATH) {
      await handleProxy(req, res, requestUrl)
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
