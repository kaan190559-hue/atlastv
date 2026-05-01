export type ContentType = 'live' | 'movie' | 'series'
export type CategoryKey =
  | 'home'
  | 'live'
  | 'sports'
  | 'series'
  | 'movies'
  | 'list'
  | 'favorites'
  | 'account'
  | 'about'

export type ContentItem = {
  id: string
  title: string
  type: ContentType
  category: string
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
  badge?: string
  displayTitle?: string
  groupId?: string
  episodeCount?: number
  seasonCount?: number
  seasonNumber?: number
  episodeNumber?: number
  episodes?: ContentItem[]
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
}

export type LiveFilterOptions = {
  countries: string[]
  categories: string[]
}

export type LiveFilterParams = {
  country?: string
  liveCategory?: string
}

export type AdminSettings = {
  vodM3uUrl: string
  liveM3uUrl: string
  sportsM3uUrl: string
  liveM3uContent?: string
  sportsM3uContent?: string
  updatedAt?: string
}

export type AtlasUser = {
  id: string
  email: string
  name: string
  activationCode: string
  createdAt?: string
  remember: boolean
  onboardingCompleted: boolean
  favorites: string[]
  list: string[]
  history: Record<string, number>
}

export type AuthResult = {
  user: AtlasUser
  needsOnboarding: boolean
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
const ADMIN_SETTINGS_KEY = 'atlastv.adminSettings'
const ADMIN_SETTINGS_ENDPOINT = '/__atlas_admin_settings'
const ADMIN_AUTH_ENDPOINT = '/__atlas_admin_auth'

const defaultAdminSettings: AdminSettings = {
  vodM3uUrl: VOD_M3U_URL,
  liveM3uUrl: '',
  sportsM3uUrl: '',
  liveM3uContent: '',
  sportsM3uContent: '',
}

const withLatency = <T,>(value: T) =>
  new Promise<T>((resolve) => {
    window.setTimeout(() => resolve(value), 120)
  })

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

const clearCatalogCaches = () => {
  vodCatalogCache = null
  vodCatalogPromise = null
  liveCatalogCache = null
  liveCatalogPromise = null
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

const createUser = (email: string, password: string, activationCode: string, remember: boolean): AtlasUser & { password: string } => ({
  id: `user-${Date.now()}`,
  email,
  password,
  name: email.split('@')[0] || 'Atlas Kullanıcısı',
  activationCode,
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
    progress: user.history[item.id],
    episodes: item.episodes?.map((episode) => ({
      ...episode,
      isFavorite: user.favorites.includes(episode.id),
      isInList: user.list.includes(item.groupId ?? item.id),
      progress: user.history[episode.id],
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
  const params = new URLSearchParams({ source })
  if (settings.updatedAt) params.set('refresh', settings.updatedAt)

  vodCatalogPromise = fetch(`/__atlas_catalog?${params.toString()}`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Katalog yüklenemedi: ${response.status}`)
      const parsed = (await response.json()) as CategoryPage
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

  liveCatalogPromise = fetch(`/__atlas_live_catalog?${params.toString()}`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Canlı katalog yüklenemedi: ${response.status}`)
      const parsed = (await response.json()) as CategoryPage
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

    const response = await fetch(`/__atlas_live_catalog?${params.toString()}`)
    if (!response.ok) throw new Error(`Spor katalog sayfasÄ± yÃ¼klenemedi: ${response.status}`)
    const page = (await response.json()) as CategoryPage
    return { ...page, items: hydrateUserItems(page.items) }
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

  const response = await fetch(`/__atlas_live_catalog?${params.toString()}`)
  if (!response.ok) throw new Error(`Spor katalog sayfasÄ± yÃ¼klenemedi: ${response.status}`)
  const page = (await response.json()) as CategoryPage
  return { ...page, items: hydrateUserItems(page.items) }
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
        const response = await fetch(`/__atlas_live_catalog?${params.toString()}`)
        if (!response.ok) throw new Error(`Canli favoriler yuklenemedi: ${response.status}`)
        const page = (await response.json()) as CategoryPage
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

const getHomeSectionsFromCatalog = (catalog: ContentItem[], sportsItems: ContentItem[] = []): HomeSection[] => {
  const vod = catalog.filter((item) => !item.isLive)
  const series = vod.filter((item) => item.type === 'series')
  const pickedIds = new Set<string>()
  const trending = takeRandomContent(vod, 8, pickedIds)
  rememberPicked(pickedIds, trending)
  const newSeries = takeRandomContent(series.length ? series : vod, 16, pickedIds)
  rememberPicked(pickedIds, newSeries)
  const recommended = takeRandomContent(vod, 18, pickedIds)
  rememberPicked(pickedIds, recommended)
  const top = takeRandomContent(vod, 10, pickedIds)
  rememberPicked(pickedIds, top)
  const admin = takeRandomContent(vod, 14, pickedIds)

  return [
    {
      id: 'favorites',
      title: 'Favorilerim',
      variant: 'circle',
      items: catalog.filter((item) => item.isFavorite).slice(0, 18),
    },
    {
      id: 'trend',
      title: '\u015eimdi Trend',
      variant: 'trend',
      items: trending,
    },
    {
      id: 'live',
      title: 'Canlı Kanallar',
      variant: 'channel',
      items: catalog.filter((item) => item.isLive),
    },
    {
      id: 'sports',
      title: 'Spor Kanalları',
      variant: 'channel',
      items: sportsItems,
    },
    {
      id: 'new-series',
      title: 'Yeni Eklenen Diziler',
      variant: 'wide',
      items: newSeries,
    },
    {
      id: 'recommended',
      title: 'Önerilen İçerikler',
      variant: 'poster',
      items: recommended,
    },
    {
      id: 'top',
      title: 'Top 10',
      variant: 'ranked',
      items: top,
    },
    {
      id: 'admin',
      title: 'Admin Tavsiyesi',
      variant: 'wide',
      items: admin,
    },
  ]
}

export const api = {
  auth: {
    getCurrent: () => withLatency(getCurrentUser()),
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
      return withLatency({ user: updated, needsOnboarding: !updated.onboardingCompleted })
    },
    register: (email: string, password: string, activationCode: string): Promise<AuthResult> => {
      const users = getUsers()
      if (users.some((entry) => entry.email.toLocaleLowerCase('tr-TR') === email.toLocaleLowerCase('tr-TR'))) {
        return Promise.reject(new Error('Bu e-posta ile zaten kayıt var.'))
      }
      const user = createUser(email, password, activationCode, true)
      saveUsers([...users, user])
      saveCurrentUser(user)
      return withLatency({ user, needsOnboarding: true })
    },
    completeOnboarding: () =>
      withLatency(updateCurrentUser((user) => ({ ...user, onboardingCompleted: true }))),
    logout: () => {
      window.localStorage.removeItem(CURRENT_USER_KEY)
      return withLatency(true)
    },
    updatePassword: (password: string) =>
      withLatency(updateCurrentUser((user) => ({ ...user, password }))),
  },
  content: {
    getHomeSections: async () => {
      const catalog = await getCatalogWithUserLiveItems()
      const sports = await loadSportsCatalog(0, 24).catch(() => ({ items: [], total: 0 }))
      return withLatency(getHomeSectionsFromCatalog(catalog, sports.items))
    },
    getCategoryPage: async (
      category: CategoryKey,
      offset = 0,
      limit = 60,
      query = '',
      filters: LiveFilterParams = {},
    ): Promise<CategoryPage> => {
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
        if (settings.liveM3uUrl.trim()) params.set('source', settings.liveM3uUrl.trim())
        if (settings.updatedAt) params.set('refresh', settings.updatedAt)

        try {
          const response = await fetch(`/__atlas_live_catalog?${params.toString()}`)
          if (!response.ok) throw new Error(`Canlı katalog sayfası yüklenemedi: ${response.status}`)
          const page = (await response.json()) as CategoryPage
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

      const response = await fetch(`/__atlas_catalog?${params.toString()}`)
      if (!response.ok) throw new Error(`Katalog sayfası yüklenemedi: ${response.status}`)
      const page = (await response.json()) as CategoryPage
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
      const catalog = await getCatalog()
      return withLatency(takeRandomContent(catalog.filter((item) => !item.isLive), 6))
    },
  },
  admin: {
    getSettings: async () => withLatency(await getAdminSettings()),
    verifyPassword: async (password: string) => withLatency(await verifyAdminPassword(password)),
    saveSettings: async (settings: AdminSettings, password: string) => {
      const cleaned: AdminSettings = {
        vodM3uUrl: settings.vodM3uUrl.trim() || VOD_M3U_URL,
        liveM3uUrl: settings.liveM3uUrl.trim(),
        sportsM3uUrl: settings.sportsM3uUrl.trim(),
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
    markWatched: async (id: string, progress = 1) =>
      withLatency(updateCurrentUser((user) => ({ ...user, history: { ...user.history, [id]: progress } }))),
  },
}
