export type ContentType = 'live' | 'movie' | 'series'
export type CategoryKey =
  | 'home'
  | 'live'
  | 'sports'
  | 'series'
  | 'movies'
  | 'list'
  | 'favorites'
  | 'downloads'
  | 'account'
  | 'about'

export type DownloadEntry = {
  item: ContentItem
  savedAt: string
}

export type ContentItem = {
  id: string
  title: string
  type: ContentType
  category: string
  platform?: string
  genre?: string
  country?: string
  liveCategory?: string
  streamUrl: string
  posterUrl: string
  backdropUrl: string
  rating: number
  description: string
  isLive: boolean
  isFavorite: boolean
  isInList?: boolean
  httpUserAgent?: string
  referer?: string
  origin?: string
  progress?: number
  progressSeconds?: number
  progressDuration?: number
  badge?: string
  displayTitle?: string
  noProxy?: boolean
  groupId?: string
  episodeCount?: number
  seasonCount?: number
  seasonNumber?: number
  episodeNumber?: number
  episodes?: ContentItem[]
}

export type ContentMetadata = {
  title: string
  originalTitle?: string
  overview?: string
  tagline?: string
  releaseYear?: string
  runtime?: number
  tmdbRating?: number
  voteCount?: number
  imdbId?: string
  genres: string[]
  cast: Array<{ name: string; character?: string; profileUrl?: string }>
  crew: Array<{ name: string; job: string }>
  providers: string[]
  trailerUrl?: string
  posterUrl?: string
  backdropUrl?: string
  homepage?: string
}

export type HomeSection = {
  id: string
  title: string
  variant: 'circle' | 'poster' | 'wide' | 'ranked' | 'channel' | 'trend'
  items: ContentItem[]
}

export type CategoryPage = {
  items: ContentItem[]
  total: number
  countries?: string[]
  categories?: string[]
  platforms?: string[]
}

export type LiveFilterOptions = {
  countries: string[]
  categories: string[]
}

export type LiveFilterParams = {
  country?: string
  liveCategory?: string
  vodCategory?: string
  platform?: string
  sourceOverride?: string
}

export type SectionVariant = 'poster' | 'wide' | 'ranked' | 'channel' | 'trend' | 'circle'
export type HomeSectionConfig = {
  id: string
  title: string
  type: 'builtin' | 'genre'
  genre?: string
  variant: SectionVariant
  enabled: boolean
}

export type AdminSettings = {
  vodM3uUrl: string
  liveM3uUrl: string
  sportsM3uUrl: string
  telegramUrl: string
  supportUrl: string
  appVersion: string
  announcement: string
  homeNotification: string
  homeNotificationId: number
  homeSectionsConfig?: HomeSectionConfig[]
  liveM3uContent?: string
  sportsM3uContent?: string
  updatedAt?: string
}

export type AtlasUser = {
  id: string
  email: string
  name: string
  activationCode: string
  securityQuestion?: string
  securityAnswer?: string
  createdAt?: string
  remember: boolean
  onboardingCompleted: boolean
  favorites: string[]
  list: string[]
  history: Record<string, number | WatchProgress>
  avatar?: { emoji: string; color: string }
}

export type WatchProgress = {
  seconds: number
  duration: number
  percent: number
  updatedAt: string
}

export type AuthResult = {
  user: AtlasUser
  needsOnboarding: boolean
}

export type UserStats = {
  totalUsers: number
  activeUsers: number
  rememberedUsers: number
}

export type CacheBotStatus = {
  buildId?: string
  isRunning: boolean
  lastRunAt: string
  startedAt: string
  currentStep: string
  lastMessage: string
  memory: Record<string, number>
  diskBuckets: string[]
}

const VOD_M3U_URL = 'https://file.garden/Z-hq5n4Shk27aY58/Wars-vod-iptv.m3u'
const VAVOO_REFERER = 'https://vavoo.to/'
const VAVOO_ORIGIN = 'https://vavoo.to'
export const PLAYER_HTTP_USER_AGENT = 'okhttp/4.12.0'

const placeholderBackdrop =
  'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1600&q=80'
const placeholderPoster =
  'https://images.unsplash.com/photo-1518929458119-e5bf444c30f4?auto=format&fit=crop&w=500&q=80'

const liveCatalog: ContentItem[] = [
  {
    id: 'atlas-news',
    title: 'Atlas Haber Canlı',
    type: 'live',
    category: 'Canlı Kanallar',
    streamUrl: 'm3u://atlas/news',
    posterUrl:
      'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=500&q=80',
    backdropUrl:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
    rating: 8.7,
    description: 'Gündem, son dakika ve özel yayınlar tek akışta.',
    isLive: true,
    isFavorite: true,
    country: 'Demo',
    liveCategory: 'Haber',
    referer: VAVOO_REFERER,
    origin: VAVOO_ORIGIN,
    badge: 'CANLI',
  },
  {
    id: 'stadium-live',
    title: 'Atlas Spor 1',
    type: 'live',
    category: 'Canlı Kanallar',
    streamUrl: 'm3u://atlas/sport-1',
    posterUrl:
      'https://images.unsplash.com/photo-1508098682722-e99c643e7f0b?auto=format&fit=crop&w=500&q=80',
    backdropUrl:
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80',
    rating: 8.1,
    description: 'Canlı maçlar, özetler ve spor gündemi.',
    isLive: true,
    isFavorite: false,
    country: 'Demo',
    liveCategory: 'Spor',
    referer: VAVOO_REFERER,
    origin: VAVOO_ORIGIN,
    badge: 'CANLI',
  },
  {
    id: 'kids-world',
    title: 'Çocuk Dünyası',
    type: 'live',
    category: 'Canlı Kanallar',
    streamUrl: 'm3u://atlas/kids',
    posterUrl:
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=500&q=80',
    backdropUrl:
      'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1600&q=80',
    rating: 7.9,
    description: 'Aileye uygun çizgi film ve çocuk içerikleri.',
    isLive: true,
    isFavorite: false,
    country: 'Demo',
    liveCategory: 'Çocuk',
    referer: VAVOO_REFERER,
    origin: VAVOO_ORIGIN,
    badge: 'CANLI',
  },
]

const fallbackVodCatalog: ContentItem[] = [
  {
    id: 'fallback-movie',
    title: 'M3U listesi yükleniyor',
    type: 'movie',
    category: 'Tüm Filmler',
    streamUrl: VOD_M3U_URL,
    posterUrl: placeholderPoster,
    backdropUrl: placeholderBackdrop,
    rating: 7.4,
    description: 'Film ve dizi içerikleri verilen M3U listesinden okunacak.',
    isLive: false,
    isFavorite: false,
    httpUserAgent: PLAYER_HTTP_USER_AGENT,
    badge: 'M3U',
  },
]

let vodCatalogCache: ContentItem[] | null = null
let vodCatalogPromise: Promise<ContentItem[]> | null = null
let liveCatalogCache: ContentItem[] | null = null
let liveCatalogPromise: Promise<ContentItem[]> | null = null
const USERS_KEY = 'atlastv.users'
const CURRENT_USER_KEY = 'atlastv.currentUser'
const SESSION_KEY = 'atlastv.sessionId'
const ADMIN_SETTINGS_KEY = 'atlastv.adminSettings'
const CONTENT_PAGE_CACHE_PREFIX = 'atlastv.contentPage.v4.'
const CONTENT_PAGE_CACHE_TTL = 10 * 60 * 1000
const HOME_SECTIONS_CACHE_KEY = 'atlastv.homeSections.v4'
const HERO_ITEMS_CACHE_KEY = 'atlastv.heroItems.v4'
const ADMIN_SETTINGS_ENDPOINT = '/__atlas_admin_settings'
const ADMIN_AUTH_ENDPOINT = '/__atlas_admin_auth'
const USER_STATS_ENDPOINT = '/__atlas_user_stats'
const CACHE_CONTROL_ENDPOINT = '/__atlas_cache_control'
const LAST_LIVE_KEY = 'atlastv.lastLiveChannel'
const DOWNLOADS_KEY = 'atlastv.downloads'

function readLastLiveChannel(): ContentItem | null {
  try {
    const raw = window.localStorage.getItem(LAST_LIVE_KEY)
    return raw ? (JSON.parse(raw) as ContentItem) : null
  } catch { return null }
}

function writeLastLiveChannel(item: ContentItem): void {
  try { window.localStorage.setItem(LAST_LIVE_KEY, JSON.stringify(item)) } catch { /* */ }
}

function readDownloads(): DownloadEntry[] {
  try {
    const raw = window.localStorage.getItem(DOWNLOADS_KEY)
    return raw ? (JSON.parse(raw) as DownloadEntry[]) : []
  } catch { return [] }
}

function writeDownloads(entries: DownloadEntry[]): void {
  try { window.localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(entries)) } catch { /* */ }
}

const defaultAdminSettings: AdminSettings = {
  vodM3uUrl: VOD_M3U_URL,
  liveM3uUrl: '',
  sportsM3uUrl: '',
  telegramUrl: 'https://t.me/',
  supportUrl: '',
  appVersion: '0.0.0',
  announcement: 'Güncel sürüm, duyurular, özel içerikler ve destek için kanalımızı takip edin.',
  homeNotification: '',
  homeNotificationId: 0,
  liveM3uContent: '',
  sportsM3uContent: '',
}

const withLatency = <T,>(value: T) =>
  new Promise<T>((resolve) => {
    window.setTimeout(() => resolve(value), 20)
  })

const isUnexpectedEmptyCatalogPage = (url: string, value: unknown) => {
  if (!url.includes('__atlas_catalog') && !url.includes('__atlas_live_catalog')) return false
  if (url.includes('q=') || url.includes('ids=') || url.includes('country=') || url.includes('liveCategory=')) return false
  if (url.includes('vodCategory=') || url.includes('platform=')) return false
  if (url.includes('category=list') || url.includes('category=favorites') || url.includes('category=sports')) return false
  const page = value as Partial<CategoryPage>
  return Array.isArray(page.items) && page.items.length === 0 && Number(page.total ?? 0) === 0
}

const cachedFetchJson = async <T,>(url: string, ttl = CONTENT_PAGE_CACHE_TTL): Promise<T> => {
  const key = `${CONTENT_PAGE_CACHE_PREFIX}${url}`
  let staleValue: T | null = null
  try {
    const cached = window.sessionStorage.getItem(key)
    if (cached) {
      const parsed = JSON.parse(cached) as { savedAt: number; value: T }
      staleValue = parsed.value
      if (Date.now() - parsed.savedAt < ttl) return parsed.value
    }
  } catch {
    // Ignore broken browser cache entries and continue with the network.
  }

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Katalog yÃ¼klenemedi: ${response.status}`)
  const value = (await response.json()) as T
  if (isUnexpectedEmptyCatalogPage(url, value)) {
    if (staleValue) {
      // Refresh the stale entry's timestamp so it remains valid while the server
      // keeps returning an empty response, preventing the cache from going cold.
      try {
        window.sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value: staleValue }))
      } catch {}
      return staleValue
    }
    throw new Error('Katalog bos dondu; eski M3U verisi korunuyor.')
  }
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }))
  } catch {
    // Storage can be full on TV browsers; the app should still work.
  }
  return value
}

const readTimedCache = <T,>(key: string, ttl = CONTENT_PAGE_CACHE_TTL): T | null => {
  try {
    const cached = window.sessionStorage.getItem(key)
    if (!cached) return null
    const parsed = JSON.parse(cached) as { savedAt: number; value: T }
    return Date.now() - parsed.savedAt < ttl ? parsed.value : null
  } catch {
    return null
  }
}

const writeTimedCache = <T,>(key: string, value: T) => {
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }))
  } catch {
    // TV browsers can have tiny storage quotas.
  }
}

const getUsers = (): Array<AtlasUser & { password?: string }> => {
  const raw = window.localStorage.getItem(USERS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as Array<AtlasUser & { password?: string }>
  } catch {
    return []
  }
}

const saveUsers = (users: Array<AtlasUser & { password?: string }>) => {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

const normalizeWatchProgress = (value?: number | WatchProgress): WatchProgress | null => {
  if (!value) return null
  if (typeof value === 'number') {
    return {
      seconds: 0,
      duration: 0,
      percent: Math.max(0, Math.min(100, value)),
      updatedAt: '',
    }
  }
  return {
    seconds: Math.max(0, value.seconds || 0),
    duration: Math.max(0, value.duration || 0),
    percent: Math.max(0, Math.min(100, value.percent || 0)),
    updatedAt: value.updatedAt || '',
  }
}

const getSessionId = () => {
  const existing = window.localStorage.getItem(SESSION_KEY)
  if (existing) return existing
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
  window.localStorage.setItem(SESSION_KEY, sessionId)
  return sessionId
}

const getLocalUserStats = (): UserStats => {
  const users = getUsers()
  const current = getCurrentUser()
  return {
    totalUsers: users.length,
    activeUsers: current ? 1 : 0,
    rememberedUsers: users.filter((user) => user.remember).length,
  }
}

const reportUserEvent = async (event: 'register' | 'login' | 'heartbeat' | 'logout', user?: AtlasUser | null) => {
  try {
    const response = await fetch(USER_STATS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        sessionId: getSessionId(),
        userId: user?.id,
        email: user?.email,
        remember: user?.remember,
      }),
    })
    if (!response.ok) throw new Error(`Kullanıcı istatistiği güncellenemedi: ${response.status}`)
    return (await response.json()) as UserStats
  } catch {
    return getLocalUserStats()
  }
}

const fetchUserStats = async (): Promise<UserStats> => {
  try {
    const current = getCurrentUser()
    if (current) void reportUserEvent('heartbeat', current)
    const response = await fetch(USER_STATS_ENDPOINT)
    if (!response.ok) throw new Error(`Kullanıcı istatistiği okunamadı: ${response.status}`)
    return (await response.json()) as UserStats
  } catch {
    return getLocalUserStats()
  }
}

const getCachedAdminSettings = (): AdminSettings => {
  const raw = window.localStorage.getItem(ADMIN_SETTINGS_KEY)
  if (!raw) return defaultAdminSettings
  try {
    return { ...defaultAdminSettings, ...(JSON.parse(raw) as Partial<AdminSettings>) }
  } catch {
    return defaultAdminSettings
  }
}

const saveAdminSettings = (settings: AdminSettings) => {
  window.localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings))
}

const getAdminSettings = async (): Promise<AdminSettings> => {
  try {
    const response = await fetch(ADMIN_SETTINGS_ENDPOINT, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Admin ayarları okunamadı: ${response.status}`)
    const settings = { ...defaultAdminSettings, ...((await response.json()) as Partial<AdminSettings>) }
    saveAdminSettings(settings)
    return settings
  } catch (error) {
    console.warn('Ortak admin ayarları okunamadı, yerel önbellek kullanılıyor.', error)
    return getCachedAdminSettings()
  }
}

const verifyAdminPassword = async (password: string) => {
  const response = await fetch(ADMIN_AUTH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  return response.ok
}

const postAdminSettings = async (payload: { settings?: AdminSettings; reset?: boolean }, password: string) => {
  const response = await fetch(ADMIN_SETTINGS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, password }),
  })
  if (!response.ok) throw new Error(`Admin ayarları kaydedilemedi: ${response.status}`)
  const settings = { ...defaultAdminSettings, ...((await response.json()) as Partial<AdminSettings>) }
  saveAdminSettings(settings)
  return settings
}

const postCacheControl = async (action: 'status' | 'warm' | 'clear', password = ''): Promise<CacheBotStatus> => {
  const response = await fetch(CACHE_CONTROL_ENDPOINT, {
    method: action === 'status' ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: action === 'status' ? undefined : JSON.stringify({ action, password }),
  })
  if (!response.ok) throw new Error(`Katalog botu yanıt vermedi: ${response.status}`)
  return (await response.json()) as CacheBotStatus
}

const clearCatalogCaches = () => {
  vodCatalogCache = null
  vodCatalogPromise = null
  liveCatalogCache = null
  liveCatalogPromise = null
  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith(CONTENT_PAGE_CACHE_PREFIX))
      .forEach((key) => window.sessionStorage.removeItem(key))
  } catch {
    // Session storage may be unavailable in some embedded TV browsers.
  }
}

const getCurrentUser = () => {
  const id = window.localStorage.getItem(CURRENT_USER_KEY)
  return getUsers().find((user) => user.id === id) ?? null
}

const saveCurrentUser = (user: AtlasUser) => {
  window.localStorage.setItem(CURRENT_USER_KEY, user.id)
}

const updateCurrentUser = (updater: (user: AtlasUser & { password?: string }) => AtlasUser & { password?: string }) => {
  const users = getUsers()
  const current = getCurrentUser()
  if (!current) return null
  const updated = updater(current)
  saveUsers(users.map((user) => (user.id === updated.id ? updated : user)))
  saveCurrentUser(updated)
  return updated
}

const normalizeSecurityAnswer = (value = '') => value.trim().toLocaleLowerCase('tr-TR')

const createUser = (
  email: string,
  password: string,
  activationCode: string,
  remember: boolean,
  securityQuestion = 'Tuttuğun takım',
  securityAnswer = 'atlas',
): AtlasUser & { password: string } => ({
  id: `user-${Date.now()}`,
  email,
  password,
  name: email.split('@')[0] || 'Atlas Kullanıcısı',
  activationCode,
  securityQuestion,
  securityAnswer: normalizeSecurityAnswer(securityAnswer),
  createdAt: new Date().toISOString(),
  remember,
  onboardingCompleted: false,
  favorites: [],
  list: [],
  history: {},
})

const ensureDemoUser = () => {
  const users = getUsers()
  if (users.some((user) => user.email === 'atlas@demo.com')) return
  saveUsers([...users, createUser('atlas@demo.com', '123456', 'ATLAS-2026', true)])
}

const hydrateUserItems = (items: ContentItem[]) => {
  const user = getCurrentUser()
  if (!user) return items.map((item) => ({ ...item, isFavorite: false, progress: undefined }))

  return items.map((item) => ({
    ...item,
    isFavorite: user.favorites.includes(item.id),
    isInList: user.list.includes(item.groupId ?? item.id),
    progress: normalizeWatchProgress(user.history[item.id])?.percent,
    progressSeconds: normalizeWatchProgress(user.history[item.id])?.seconds,
    progressDuration: normalizeWatchProgress(user.history[item.id])?.duration,
    episodes: item.episodes?.map((episode) => ({
      ...episode,
      isFavorite: user.favorites.includes(episode.id),
      isInList: user.list.includes(item.groupId ?? item.id),
      progress: normalizeWatchProgress(user.history[episode.id])?.percent,
      progressSeconds: normalizeWatchProgress(user.history[episode.id])?.seconds,
      progressDuration: normalizeWatchProgress(user.history[episode.id])?.duration,
    })),
  }))
}

const slugify = (value: string) =>
  value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const getAttribute = (line: string, name: string) => {
  const match = line.match(new RegExp(`${name}="([^"]*)"`, 'i'))
  return match?.[1]?.trim() ?? ''
}

const getTitleFromExtinf = (line: string) => {
  const commaIndex = line.indexOf(',')
  return commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : 'İsimsiz İçerik'
}

const inferType = (groupTitle: string, title: string): ContentType => {
  const source = `${groupTitle} ${title}`.toLocaleLowerCase('tr-TR')
  if (/(dizi|series|sezon|bölüm|bolum|s\d+\s*e\d+|\d+x\d+)/i.test(source)) {
    return 'series'
  }
  return 'movie'
}

const parseM3u = (playlist: string): ContentItem[] => {
  const lines = playlist
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const items: ContentItem[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.startsWith('#EXTINF')) continue

    const title = getTitleFromExtinf(line)
    const groupTitle = getAttribute(line, 'group-title') || 'Tüm Filmler'
    const logo = getAttribute(line, 'tvg-logo') || placeholderPoster
    let httpUserAgent = PLAYER_HTTP_USER_AGENT
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

    const type = inferType(groupTitle, title)
    const id = `vod-${slugify(title)}-${items.length}`

    items.push({
      id,
      title,
      type,
      category: groupTitle,
      streamUrl,
      posterUrl: logo,
      backdropUrl: logo,
      rating: Number((6.8 + (items.length % 23) / 10).toFixed(1)),
      description:
        type === 'series'
          ? 'Bu dizi içeriği M3U VOD listesinden alındı.'
          : 'Bu film içeriği M3U VOD listesinden alındı.',
      isLive: false,
      isFavorite: items.length % 17 === 0,
      httpUserAgent,
      progress: items.length % 13 === 0 ? 35 + (items.length % 45) : undefined,
      badge: type === 'series' ? 'Dizi' : 'Film',
    })
  }

  return items
}

const loadVodCatalog = async () => {
  if (vodCatalogCache) return vodCatalogCache
  if (vodCatalogPromise) return vodCatalogPromise

  const settings = await getAdminSettings()
  const source = settings.vodM3uUrl.trim() || VOD_M3U_URL
  const params = new URLSearchParams({ source, limit: '800' })
  if (settings.updatedAt) params.set('refresh', settings.updatedAt)

  vodCatalogPromise = cachedFetchJson<CategoryPage>(`/__atlas_catalog?${params.toString()}`)
    .then((parsed) => {
      vodCatalogCache = parsed.items.length ? parsed.items : fallbackVodCatalog
      return vodCatalogCache
    })
    .catch(async (error) => {
      console.warn('Server katalog okunamadı, M3U doğrudan deneniyor.', error)
      try {
        const response = await fetch(source, { cache: 'no-store' })
        if (!response.ok) throw new Error(`M3U yüklenemedi: ${response.status}`)
        const playlist = await response.text()
        const parsed = parseM3u(playlist)
        vodCatalogCache = parsed.length ? parsed : fallbackVodCatalog
      } catch (directError) {
        console.warn('M3U listesi okunamadı, geçici katalog kullanılıyor.', directError)
        vodCatalogCache = fallbackVodCatalog
      }
      return vodCatalogCache
    })
    .finally(() => {
      vodCatalogPromise = null
    })

  return vodCatalogPromise
}

const loadLiveCatalog = async () => {
  if (liveCatalogCache) return liveCatalogCache
  if (liveCatalogPromise) return liveCatalogPromise

  const settings = await getAdminSettings()
  const params = new URLSearchParams({ limit: '160' })
  if (settings.liveM3uUrl.trim()) params.set('source', settings.liveM3uUrl.trim())
  if (settings.liveM3uContent?.trim()) params.set('library', 'live')
  if (settings.updatedAt) params.set('refresh', settings.updatedAt)

  liveCatalogPromise = cachedFetchJson<CategoryPage>(`/__atlas_live_catalog?${params.toString()}`)
    .then((parsed) => {
      liveCatalogCache = parsed.items.length ? parsed.items : liveCatalog
      return liveCatalogCache
    })
    .catch((error) => {
      console.warn('Canlı M3U kataloğu okunamadı, geçici canlı katalog kullanılıyor.', error)
      liveCatalogCache = liveCatalog
      return liveCatalogCache
    })
    .finally(() => {
      liveCatalogPromise = null
    })

  return liveCatalogPromise
}

const getCatalog = async () => hydrateUserItems([...(await loadLiveCatalog()), ...(await loadVodCatalog())])
const getVodCatalog = async () => hydrateUserItems(await loadVodCatalog())

const ATLAS_SPORTS_POSTER = '/favicon.svg'

const withSportsPoster = (items: ContentItem[]) =>
  items.map((item) => ({
    ...item,
    posterUrl: item.posterUrl || ATLAS_SPORTS_POSTER,
    backdropUrl: item.backdropUrl || ATLAS_SPORTS_POSTER,
  }))

const loadSportsCatalog = async (offset = 0, limit = 160, query = '', filters: LiveFilterParams = {}) => {
  const settings = await getAdminSettings()
  const sportsSource = settings.sportsM3uUrl.trim()
  if (!sportsSource) {
    const params = new URLSearchParams({
      liveCategory: 'Spor',
      offset: String(offset),
      limit: String(limit),
    })
    if (query.trim()) params.set('q', query.trim())
    if (filters.country) params.set('country', filters.country)
    if (settings.liveM3uUrl.trim()) params.set('source', settings.liveM3uUrl.trim())
    if (settings.sportsM3uContent?.trim()) params.set('library', 'sports')
    else if (settings.liveM3uContent?.trim()) params.set('library', 'live')
    if (settings.updatedAt) params.set('refresh', settings.updatedAt)

    const page = await cachedFetchJson<CategoryPage>(`/__atlas_live_catalog?${params.toString()}`)
    return { ...page, items: withSportsPoster(hydrateUserItems(page.items)) }
  }

  const params = new URLSearchParams({
    source: sportsSource,
    offset: String(offset),
    limit: String(limit),
  })
  if (query.trim()) params.set('q', query.trim())
  if (filters.country) params.set('country', filters.country)
  if (filters.liveCategory) params.set('liveCategory', filters.liveCategory)
  if (settings.sportsM3uContent?.trim()) params.set('library', 'sports')
  if (settings.updatedAt) params.set('refresh', settings.updatedAt)

  const page = await cachedFetchJson<CategoryPage>(`/__atlas_live_catalog?${params.toString()}`)
  return { ...page, items: withSportsPoster(hydrateUserItems(page.items)) }
}

const setFavorite = async (id: string, favorite: boolean) => {
  updateCurrentUser((user) => ({
    ...user,
    favorites: favorite
      ? Array.from(new Set([...user.favorites, id]))
      : user.favorites.filter((favoriteId) => favoriteId !== id),
  }))
}

const shuffleItems = <T,>(items: T[]) => {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]]
  }
  return copy
}

const takeRandomContent = (items: ContentItem[], count: number, excludedIds = new Set<string>()) => {
  const freshItems = items.filter((item) => !excludedIds.has(item.id))
  const fallbackItems = items.filter((item) => excludedIds.has(item.id))
  return shuffleItems([...freshItems, ...fallbackItems]).slice(0, count)
}

const uniqueContentById = (items: ContentItem[]) => [...new Map(items.map((item) => [item.id, item])).values()]

const getUserLiveKeys = () => {
  const user = getCurrentUser()
  if (!user) return []
  return Array.from(new Set([...user.favorites, ...user.list].filter((id) => id.startsWith('live-'))))
}

const loadLiveItemsByIds = async (ids: string[]) => {
  const liveIds = Array.from(new Set(ids.filter((id) => id.startsWith('live-'))))
  if (!liveIds.length) return []

  const cached = liveCatalogCache?.filter((item) => liveIds.includes(item.id)) ?? []
  const missingIds = liveIds.filter((id) => !cached.some((item) => item.id === id))
  if (!missingIds.length) return hydrateUserItems(cached)

  try {
    const settings = await getAdminSettings()
    const sources = Array.from(new Set([settings.liveM3uUrl.trim(), settings.sportsM3uUrl.trim(), '']))
    const pages = await Promise.all(
      sources.map(async (source) => {
        const params = new URLSearchParams({
          ids: missingIds.join(','),
          limit: String(missingIds.length),
        })
        if (source) params.set('source', source)
        if (settings.updatedAt) params.set('refresh', settings.updatedAt)
        const page = await cachedFetchJson<CategoryPage>(`/__atlas_live_catalog?${params.toString()}`)
        return page.items
      }),
    )
    const foundItems = pages.flat()
    liveCatalogCache = uniqueContentById([...(liveCatalogCache ?? []), ...foundItems])
    return hydrateUserItems(uniqueContentById([...cached, ...foundItems]))
  } catch (error) {
    console.warn('Canli favori kayitlari bulunamadi.', error)
    return hydrateUserItems(cached)
  }
}

const getCatalogWithUserLiveItems = async () => {
  const catalog = await getCatalog()
  const missingLiveIds = getUserLiveKeys().filter((id) => !catalog.some((item) => item.id === id))
  const liveItems = await loadLiveItemsByIds(missingLiveIds)
  return hydrateUserItems(uniqueContentById([...catalog, ...liveItems]))
}

const rememberPicked = (ids: Set<string>, items: ContentItem[]) => {
  items.forEach((item) => ids.add(item.id))
}

const matchesExplicitTerm = (item: ContentItem, terms: string[]) => {
  const haystack = `${item.title} ${item.displayTitle ?? ''} ${item.category} ${item.genre ?? ''} ${item.description ?? ''}`
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return terms.some((term) =>
    haystack.includes(term.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')),
  )
}

const buildGenreSection = (vod: ContentItem[], id: string, title: string, genreName: string, fallbackTerms: string[], pickedIds: Set<string>): HomeSection => ({
  id,
  title,
  variant: 'poster',
  items: takeRandomContent(
    vod.filter((item) => item.genre === genreName || matchesExplicitTerm(item, fallbackTerms)),
    24,
    pickedIds,
  ),
})

const GENRE_FALLBACK_TERMS: Record<string, string[]> = {
  Komedi: ['komedi', 'comedy', 'gülmece', 'humor', 'komik', 'eğlenceli', 'neşeli', 'romantic comedy', 'rom-com', 'romcom', 'aile komedisi', 'sitcom'],
  Macera: ['macera', 'adventure', 'aksiyon macera', 'action adventure', 'fantastik', 'fantasy', 'bilim kurgu', 'sci-fi', 'scifi', 'epik', 'keşif', 'yolculuk', 'quest'],
  Aksiyon: ['aksiyon', 'action', 'gerilim aksiyon', 'savaş', 'war', 'spionage', 'ajan', 'spy', 'suç', 'crime', 'polis', 'police'],
  Korku: ['korku', 'horror', 'gerilim', 'thriller', 'gizem', 'mystery', 'canavar', 'karanlık', 'psikolojik', 'psychological', 'supernatural', 'doğaüstü', 'hayalet', 'ghost', 'zombie', 'slasher'],
  Yerli: ['yerli', 'turk', 'türk', 'tr ', 'turkish', 'anadolu', 'istanbul', 'ankara', 'türkiye', 'turkey', 'türkçe', 'turkce', 'yeşilçam', 'trt', 'atv', 'show tv', 'kanal d', 'star tv', 'fox tr'],
}

export const DEFAULT_HOME_SECTIONS_CONFIG: HomeSectionConfig[] = [
  { id: 'continue', title: 'İzlemeye Devam Et', type: 'builtin', variant: 'wide', enabled: true },
  { id: 'lastlive', title: 'Kaldığın Kanaldan Devam Et', type: 'builtin', variant: 'channel', enabled: true },
  { id: 'favorites', title: 'Favorilerim', type: 'builtin', variant: 'circle', enabled: true },
  { id: 'trend', title: 'Şimdi Trend', type: 'builtin', variant: 'trend', enabled: true },
  { id: 'live', title: 'Canlı Kanallar', type: 'builtin', variant: 'channel', enabled: true },
  { id: 'sports', title: 'Spor Kanalları', type: 'builtin', variant: 'channel', enabled: true },
  { id: 'new-series', title: 'Yeni Eklenen Diziler', type: 'builtin', variant: 'wide', enabled: true },
  { id: 'komedi', title: 'Komedi', type: 'genre', genre: 'Komedi', variant: 'poster', enabled: true },
  { id: 'macera', title: 'Macera', type: 'genre', genre: 'Macera', variant: 'poster', enabled: true },
  { id: 'aksiyon', title: 'Aksiyon', type: 'genre', genre: 'Aksiyon', variant: 'poster', enabled: true },
  { id: 'korku', title: 'Korku', type: 'genre', genre: 'Korku', variant: 'poster', enabled: true },
  { id: 'yerli', title: 'Yerli', type: 'genre', genre: 'Yerli', variant: 'poster', enabled: true },
  { id: 'recommended', title: 'Önerilen İçerikler', type: 'builtin', variant: 'poster', enabled: true },
  { id: 'top', title: 'Top 10', type: 'builtin', variant: 'ranked', enabled: true },
  { id: 'admin', title: 'Admin Tavsiyesi', type: 'builtin', variant: 'wide', enabled: true },
]

const getHomeSectionsFromCatalog = (catalog: ContentItem[], sportsItems: ContentItem[] = [], sectionsConfig?: HomeSectionConfig[]): HomeSection[] => {
  const config = sectionsConfig?.length ? sectionsConfig : DEFAULT_HOME_SECTIONS_CONFIG
  const vod = catalog.filter((item) => !item.isLive)
  const series = vod.filter((item) => item.type === 'series')
  const continueItems = vod.filter((item) => item.progress && item.progress > 0 && item.progress < 98).slice(0, 18)
  const pickedIds = new Set<string>()
  const trending = takeRandomContent(vod, 8, pickedIds)
  rememberPicked(pickedIds, trending)
  const newSeries = takeRandomContent(series.length ? series : vod, 16, pickedIds)
  rememberPicked(pickedIds, newSeries)
  const recommended = takeRandomContent(vod, 18, pickedIds)
  rememberPicked(pickedIds, recommended)
  const top = takeRandomContent(vod, 10, pickedIds)
  rememberPicked(pickedIds, top)
  const adminItems = takeRandomContent(vod, 14, pickedIds)

  const builtinSections: Record<string, HomeSection> = {
    continue: { id: 'continue', title: 'İzlemeye Devam Et', variant: 'wide', items: continueItems },
    lastlive: { id: 'lastlive', title: 'Kaldığın Kanaldan Devam Et', variant: 'channel', items: (() => { const ch = readLastLiveChannel(); return ch ? [ch] : [] })() },
    favorites: { id: 'favorites', title: 'Favorilerim', variant: 'circle', items: catalog.filter((item) => item.isFavorite).slice(0, 18) },
    trend: { id: 'trend', title: 'Şimdi Trend', variant: 'trend', items: trending },
    live: { id: 'live', title: 'Canlı Kanallar', variant: 'channel', items: catalog.filter((item) => item.isLive) },
    sports: { id: 'sports', title: 'Spor Kanalları', variant: 'channel', items: withSportsPoster(sportsItems) },
    'new-series': { id: 'new-series', title: 'Yeni Eklenen Diziler', variant: 'wide', items: newSeries },
    recommended: { id: 'recommended', title: 'Önerilen İçerikler', variant: 'poster', items: recommended },
    top: { id: 'top', title: 'Top 10', variant: 'ranked', items: top },
    admin: { id: 'admin', title: 'Admin Tavsiyesi', variant: 'wide', items: adminItems },
  }

  const sections: HomeSection[] = []
  for (const cfg of config) {
    if (!cfg.enabled) continue
    if (cfg.type === 'builtin') {
      const builtin = builtinSections[cfg.id]
      if (builtin) sections.push({ ...builtin, title: cfg.title, variant: cfg.variant as HomeSection['variant'] })
    } else if (cfg.type === 'genre' && cfg.genre) {
      const fallback = GENRE_FALLBACK_TERMS[cfg.genre] ?? []
      const section = buildGenreSection(vod, cfg.id, cfg.title, cfg.genre, fallback, pickedIds)
      if (section.items.length) sections.push({ ...section, variant: cfg.variant as HomeSection['variant'] })
    }
  }
  return sections
}

const getFallbackHomeCatalog = () => [...fallbackVodCatalog, ...liveCatalog]

const buildFreshHomeSections = async () => {
  const catalog = await getVodCatalog()
  const settings = await getAdminSettings()
  const hasSportsSource = Boolean(settings.sportsM3uUrl.trim() || settings.sportsM3uContent?.trim())
  const sports = hasSportsSource ? await loadSportsCatalog(0, 24).catch(() => ({ items: [], total: 0 })) : { items: [], total: 0 }
  const sections = getHomeSectionsFromCatalog(catalog, sports.items, settings.homeSectionsConfig)
  if (sections.some((section) => section.items.length > 0)) writeTimedCache(HOME_SECTIONS_CACHE_KEY, sections)
  return sections
}

const buildFreshHeroItems = async () => {
  const catalog = await getVodCatalog()
  const user = getCurrentUser()
  const recentGenres = new Set<string>()
  if (user) {
    const historyIds = Object.keys(user.history).slice(-20)
    historyIds.forEach((id) => {
      const found = catalog.find((c) => c.id === id)
      if (found?.genre) recentGenres.add(found.genre)
    })
  }
  const pool = catalog.filter((item) => !item.isLive)
  const preferred = pool.filter((item) => item.genre != null && recentGenres.has(item.genre))
  const rest = pool.filter((item) => item.genre == null || !recentGenres.has(item.genre))
  const merged = [...preferred, ...rest]
  const items = takeRandomContent(merged, 6)
  if (items.length) writeTimedCache(HERO_ITEMS_CACHE_KEY, items)
  return items.length ? items : readTimedCache<ContentItem[]>(HERO_ITEMS_CACHE_KEY) ?? takeRandomContent(fallbackVodCatalog, 6)
}

const STATS_KEY = 'atlastv.stats.v1'
type ViewStats = { genres: Record<string, number>; categories: Record<string, number>; totalViews: number }

export const trackView = (item: ContentItem) => {
  try {
    const raw = window.localStorage.getItem(STATS_KEY)
    const stats: ViewStats = raw ? JSON.parse(raw) : { genres: {}, categories: {}, totalViews: 0 }
    if (item.genre) stats.genres[item.genre] = (stats.genres[item.genre] ?? 0) + 1
    if (item.category) stats.categories[item.category] = (stats.categories[item.category] ?? 0) + 1
    stats.totalViews++
    window.localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {}
}

export const getViewStats = (): ViewStats => {
  try {
    const raw = window.localStorage.getItem(STATS_KEY)
    return raw ? (JSON.parse(raw) as ViewStats) : { genres: {}, categories: {}, totalViews: 0 }
  } catch {
    return { genres: {}, categories: {}, totalViews: 0 }
  }
}

export const api = {
  auth: {
    getCurrent: () => {
      const user = getCurrentUser()
      if (user) void reportUserEvent('heartbeat', user)
      return withLatency(user)
    },
    login: (email: string, password: string, remember: boolean): Promise<AuthResult> => {
      ensureDemoUser()
      const users = getUsers()
      const user = users.find((entry) => entry.email.toLocaleLowerCase('tr-TR') === email.toLocaleLowerCase('tr-TR'))
      if (!user || user.password !== password) {
        return Promise.reject(new Error('E-posta veya şifre hatalı.'))
      }
      const updated = { ...user, remember }
      saveUsers(users.map((entry) => (entry.id === updated.id ? updated : entry)))
      saveCurrentUser(updated)
      void reportUserEvent('login', updated)
      return withLatency({ user: updated, needsOnboarding: !updated.onboardingCompleted })
    },
    register: (email: string, password: string, activationCode = '', securityQuestion = '', securityAnswer = ''): Promise<AuthResult> => {
      const users = getUsers()
      if (users.some((entry) => entry.email.toLocaleLowerCase('tr-TR') === email.toLocaleLowerCase('tr-TR'))) {
        return Promise.reject(new Error('Bu e-posta ile zaten kayıt var.'))
      }
      if (!securityQuestion || !securityAnswer.trim()) {
        return Promise.reject(new Error('Güvenlik sorusu ve cevabı zorunlu.'))
      }
      const user = createUser(email, password, activationCode, true, securityQuestion, securityAnswer)
      saveUsers([...users, user])
      saveCurrentUser(user)
      void reportUserEvent('register', user)
      return withLatency({ user, needsOnboarding: true })
    },
    resetPassword: (email: string, securityQuestion: string, securityAnswer: string, newPassword: string): Promise<AuthResult> => {
      const users = getUsers()
      const user = users.find((entry) => entry.email.toLocaleLowerCase('tr-TR') === email.toLocaleLowerCase('tr-TR'))
      if (!user) return Promise.reject(new Error('Bu e-posta ile kayıt bulunamadı.'))
      if (user.securityQuestion !== securityQuestion || user.securityAnswer !== normalizeSecurityAnswer(securityAnswer)) {
        return Promise.reject(new Error('Güvenlik cevabı doğru değil.'))
      }
      const updated = { ...user, password: newPassword, remember: true }
      saveUsers(users.map((entry) => (entry.id === updated.id ? updated : entry)))
      saveCurrentUser(updated)
      void reportUserEvent('login', updated)
      return withLatency({ user: updated, needsOnboarding: false })
    },
    completeOnboarding: () =>
      withLatency(updateCurrentUser((user) => ({ ...user, onboardingCompleted: true }))),
    logout: () => {
      void reportUserEvent('logout', getCurrentUser())
      window.localStorage.removeItem(CURRENT_USER_KEY)
      return withLatency(true)
    },
    updatePassword: (password: string) =>
      withLatency(updateCurrentUser((user) => ({ ...user, password }))),
  },
  content: {
    getHomeSections: async () => {
      const cached = readTimedCache<HomeSection[]>(HOME_SECTIONS_CACHE_KEY)
      return withLatency(cached ?? getHomeSectionsFromCatalog(getFallbackHomeCatalog()))
    },
    getHomeSectionsFresh: async () => {
      try {
        return withLatency(await buildFreshHomeSections())
      } catch (error) {
        console.warn('Ana sayfa katalog yenilemesi tamamlanamadı.', error)
        return withLatency(readTimedCache<HomeSection[]>(HOME_SECTIONS_CACHE_KEY) ?? getHomeSectionsFromCatalog(getFallbackHomeCatalog()))
      }
    },
    getCategoryPage: async (
      category: CategoryKey,
      offset = 0,
      limit = 60,
      query = '',
      filters: LiveFilterParams = {},
    ): Promise<CategoryPage> => {
      if (category === 'downloads') {
        const entries = readDownloads()
        const filtered = entries
          .filter((e) =>
            !query.trim() ||
            `${e.item.title} ${e.item.category} ${e.item.liveCategory ?? ''}`
              .toLocaleLowerCase('tr-TR')
              .includes(query.toLocaleLowerCase('tr-TR')),
          )
          .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
        const items = hydrateUserItems(filtered.slice(offset, offset + limit).map((e) => e.item))
        return withLatency({ items, total: filtered.length })
      }

      if (category === 'sports') {
        try {
          return await loadSportsCatalog(offset, limit, query, filters)
        } catch (error) {
          console.warn('Spor katalog sayfasÄ± okunamadÄ±.', error)
          return withLatency({ items: [], total: 0, countries: [], categories: [] })
        }
      }

      if (category === 'live') {
        const params = new URLSearchParams({
          offset: String(offset),
          limit: String(limit),
        })
        const settings = await getAdminSettings()
        if (query.trim()) params.set('q', query.trim())
        if (filters.country) params.set('country', filters.country)
        if (filters.liveCategory) params.set('liveCategory', filters.liveCategory)
        // sourceOverride (provider toggle) takes priority over admin settings
        const effectiveSource = filters.sourceOverride ?? settings.liveM3uUrl.trim()
        if (effectiveSource) params.set('source', effectiveSource)
        if (settings.liveM3uContent?.trim()) params.set('library', 'live')
        if (settings.updatedAt) params.set('refresh', settings.updatedAt)

        try {
          const page = await cachedFetchJson<CategoryPage>(`/__atlas_live_catalog?${params.toString()}`)
          return { ...page, items: hydrateUserItems(page.items) }
        } catch (error) {
          console.warn('Canlı katalog sayfası okunamadı, geçici canlı katalog kullanılıyor.', error)
          const items = liveCatalog.filter((item) =>
            query
              ? `${item.title} ${item.category} ${item.liveCategory ?? ''}`
                  .toLocaleLowerCase('tr-TR')
                  .includes(query.toLocaleLowerCase('tr-TR'))
              : true,
          )
          return withLatency({
            items: hydrateUserItems(items.slice(offset, offset + limit)),
            total: items.length,
            countries: ['Demo'],
            categories: ['Haber', 'Spor', 'Çocuk'],
          })
        }
      }

      if (category === 'favorites' || category === 'list') {
        const catalog = await getCatalogWithUserLiveItems()
        const filtered = catalog.filter((item) => {
          if (category === 'favorites' && !item.isFavorite) return false
          if (category === 'list' && !item.isInList) return false
          if (
            query.trim() &&
            !`${item.title} ${item.category} ${item.country ?? ''} ${item.liveCategory ?? ''}`
              .toLocaleLowerCase('tr-TR')
              .includes(query.toLocaleLowerCase('tr-TR'))
          ) {
            return false
          }
          return true
        })

        return withLatency({
          items: filtered.slice(offset, offset + limit),
          total: filtered.length,
        })
      }

      const params = new URLSearchParams({
        category,
        offset: String(offset),
        limit: String(limit),
      })
      const settings = await getAdminSettings()
      params.set('source', settings.vodM3uUrl.trim() || VOD_M3U_URL)
      if (settings.updatedAt) params.set('refresh', settings.updatedAt)
      if (query.trim()) params.set('q', query.trim())
      if (filters.vodCategory) params.set('vodCategory', filters.vodCategory)
      if (filters.platform) params.set('platform', filters.platform)

      const page = await cachedFetchJson<CategoryPage>(`/__atlas_catalog?${params.toString()}`)
      return { ...page, items: hydrateUserItems(page.items) }
    },
    getCategory: async (category: CategoryKey) => {
      const catalog = await getCatalogWithUserLiveItems()
      const vod = catalog.filter((item) => !item.isLive)
      const series = vod.filter((item) => item.type === 'series')
      return withLatency(
        catalog.filter((item) => {
          if (category === 'live') return item.type === 'live'
          if (category === 'sports') return item.type === 'live' && item.liveCategory === 'Spor'
          if (category === 'series') return series.length ? item.type === 'series' : !item.isLive
          if (category === 'movies') return item.type === 'movie'
          if (category === 'list') return Boolean(item.isInList)
          if (category === 'favorites') return item.isFavorite
          return true
        }),
      )
    },
    getHeroItems: async () => {
      const cached = readTimedCache<ContentItem[]>(HERO_ITEMS_CACHE_KEY)
      return withLatency(cached ?? takeRandomContent(fallbackVodCatalog, 6))
    },
    getHeroItemsFresh: async () => {
      try {
        return withLatency(await buildFreshHeroItems())
      } catch (error) {
        console.warn('Hero içerikleri yenilenemedi.', error)
        return withLatency(readTimedCache<ContentItem[]>(HERO_ITEMS_CACHE_KEY) ?? takeRandomContent(fallbackVodCatalog, 6))
      }
    },
    getMetadata: async (item: ContentItem) => {
      if (item.isLive) return withLatency(null)
      const params = new URLSearchParams({
        title: item.displayTitle ?? item.title,
        type: item.type,
        year: String(item.badge ?? ''),
        category: item.category,
        platform: item.platform ?? '',
        description: item.description,
      })
      const response = await fetch(`/__atlas_metadata?${params.toString()}`)
      if (!response.ok) {
        return withLatency({
          title: item.displayTitle ?? item.title,
          overview: item.description,
          genres: [item.genre ?? item.category].filter(Boolean),
          cast: [],
          crew: [],
          providers: [item.platform ?? 'Katalog'].filter(Boolean),
          posterUrl: item.posterUrl,
          backdropUrl: item.backdropUrl,
        } satisfies ContentMetadata)
      }
      return withLatency((await response.json()) as ContentMetadata)
    },
  },
  admin: {
    getSettings: async () => withLatency(await getAdminSettings()),
    getUserStats: async () => withLatency(await fetchUserStats()),
    verifyPassword: async (password: string) => withLatency(await verifyAdminPassword(password)),
    saveSettings: async (settings: AdminSettings, password: string) => {
      const cleaned: AdminSettings = {
        vodM3uUrl: settings.vodM3uUrl.trim() || VOD_M3U_URL,
        liveM3uUrl: settings.liveM3uUrl.trim(),
        sportsM3uUrl: settings.sportsM3uUrl.trim(),
        telegramUrl: settings.telegramUrl.trim() || 'https://t.me/',
        supportUrl: settings.supportUrl.trim(),
        appVersion: settings.appVersion.trim() || '0.0.1',
        announcement: settings.announcement.trim(),
        homeNotification: settings.homeNotification.trim(),
        homeNotificationId: Number(settings.homeNotificationId) || 0,
        homeSectionsConfig: settings.homeSectionsConfig,
        liveM3uContent: settings.liveM3uContent ?? '',
        sportsM3uContent: settings.sportsM3uContent ?? '',
        updatedAt: new Date().toISOString(),
      }
      const saved = await postAdminSettings({ settings: cleaned }, password)
      clearCatalogCaches()
      return withLatency(saved)
    },
    resetSettings: async (password: string) => {
      const settings = await postAdminSettings({ reset: true }, password)
      clearCatalogCaches()
      return withLatency(settings)
    },
    getCacheStatus: async () => withLatency(await postCacheControl('status')),
    runCatalogBot: async (password: string) => withLatency(await postCacheControl('warm', password)),
    clearServerCache: async (password: string) => {
      const status = await postCacheControl('clear', password)
      clearCatalogCaches()
      return withLatency(status)
    },
  },
  user: {
    getFavorites: async () => withLatency((await getCatalogWithUserLiveItems()).filter((item) => item.isFavorite)),
    toggleFavorite: async (id: string) => {
      const user = getCurrentUser()
      await setFavorite(id, !user?.favorites.includes(id))
      return withLatency((await getCatalogWithUserLiveItems()).find((entry) => entry.id === id))
    },
    toggleList: async (item: ContentItem) => {
      const key = item.groupId ?? item.id
      updateCurrentUser((user) => ({
        ...user,
        list: user.list.includes(key)
          ? user.list.filter((listId) => listId !== key)
          : Array.from(new Set([...user.list, key])),
      }))
      return withLatency(true)
    },
    getWatchHistory: async () => withLatency((await getCatalog()).filter((item) => item.progress)),
    saveLastLiveChannel: (item: ContentItem) => { writeLastLiveChannel(item) },
    addDownload: async (item: ContentItem) => {
      const entries = readDownloads().filter((e) => e.item.id !== item.id)
      writeDownloads([{ item, savedAt: new Date().toISOString() }, ...entries])
      return withLatency(true)
    },
    removeDownload: async (id: string) => {
      writeDownloads(readDownloads().filter((e) => e.item.id !== id))
      return withLatency(true)
    },
    isDownloaded: (id: string) => readDownloads().some((e) => e.item.id === id),
    markWatched: async (id: string, seconds = 1, duration = 0) =>
      withLatency(updateCurrentUser((user) => {
        const percent = duration ? Math.max(1, Math.min(99, Math.round((seconds / duration) * 100))) : Math.max(1, Math.min(99, Math.round(seconds)))
        return {
          ...user,
          history: {
            ...user.history,
            [id]: {
              seconds: Math.max(0, Math.floor(seconds)),
              duration: Math.max(0, Math.floor(duration)),
              percent,
              updatedAt: new Date().toISOString(),
            },
          },
        }
      })),
    updateAvatar: async (emoji: string, color: string) => {
      const updated = updateCurrentUser((user) => ({ ...user, avatar: { emoji, color } }))
      return withLatency(updated)
    },
  },
}
