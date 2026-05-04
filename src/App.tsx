import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import Hls from 'hls.js'
import {
  BadgeInfo,
  Bell,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Download,
  Film,
  Heart,
  Home,
  Info,
  KeyRound,
  ListVideo,
  LogOut,
  Maximize,
  MonitorSmartphone,
  Moon,
  Pause,
  Palette,
  Play,
  Power,
  RotateCcw,
  RotateCw,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  Trophy,
  Tv,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import {
  api,
  type AdminSettings,
  type AtlasUser,
  type AuthResult,
  type CacheBotStatus,
  type CategoryKey,
  type ContentItem,
  type ContentMetadata,
  type HomeSection,
  type HomeSectionConfig,
  type LiveFilterOptions,
  type SectionVariant,
  type UserStats,
  DEFAULT_HOME_SECTIONS_CONFIG,
  trackView,
  getViewStats,
} from './mockApi'
import './App.css'

type Screen = CategoryKey
type Theme = 'dark' | 'light'
type AuthMode = 'login' | 'register' | 'forgot'
type DeviceType = 'tv' | 'pc' | 'tablet' | 'phone'
type Direction = 'up' | 'down' | 'left' | 'right'

const DEFAULT_PLAYER_USER_AGENT = 'okhttp/4.12.0'
const CATEGORY_PAGE_SIZE = 60
const VOD_CATEGORY_PAGE_SIZE = 60
const APP_VERSION = '0.0.1'
const LIVE_GITHUB_M3U_URL = 'https://raw.githubusercontent.com/kaan190559-hue/atlastv/master/public/vavoo_full_worker.m3u'
const IPTV_TURKEY_M3U_URL = 'https://iptv-org.github.io/iptv/countries/tr.m3u'
const APPEARANCE_KEY = 'atlastv.appearance'
const NOTIFICATION_READ_KEY = 'atlastv.notificationRead'
const DISPLAY_SETUP_KEY_PREFIX = 'atlastv.displaySetup'
const FOCUSABLE_SELECTOR =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
const SPATIAL_GROUP_SELECTOR =
  '.desktop-nav, .top-actions, .hero-actions, .hero-dots, .rail-list, .trend-list, .content-grid, .filter-box-row, .live-filter-panel, .detail-actions, .center-controls, .control-buttons, .player-progress-row, .player-episodes, .auth-card, .onboarding-actions, .utility-grid, .settings-layout, .appearance-controls, .admin-tabs, .episode-list, .cast-strip, .search-dropdown, .settings-actions, .load-more-row'

const securityQuestions = [
  'İlk evcil hayvanının adı',
  'Tuttuğun takım',
  'Doğduğun şehir',
  'En sevdiğin film',
  'İlk okulunun adı',
]

const navItems: Array<{ id: Screen; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Anasayfa', icon: Home },
  { id: 'live', label: 'Canlı Kanallar', icon: Tv },
  { id: 'sports', label: 'Spor Kanalları', icon: Trophy },
  { id: 'series', label: 'Dizi', icon: Clapperboard },
  { id: 'movies', label: 'Film', icon: Film },
  { id: 'downloads', label: 'İndirilenler', icon: Download },
  { id: 'list', label: 'Listem', icon: ListVideo },
  { id: 'favorites', label: 'Favoriler', icon: Heart },
  { id: 'get-app', label: 'Uygulamayı İndir', icon: MonitorSmartphone },
  { id: 'account', label: 'Hesabım', icon: User },
  { id: 'about', label: 'Ayarlar', icon: Settings },
]

const onboardingSlides = [
  {
    title: 'AtlasTv’ye hoş geldin',
    text: 'Canlı yayın, film ve dizi deneyimini tek ekranda, TV kumandasıyla rahat gezilecek şekilde hazırladık.',
    image:
      'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Kumanda ile gez',
    text: 'Ok tuşlarıyla menülerde, kartlarda ve player kontrollerinde dolaş; Enter ile seç.',
    image:
      'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Favorilerini kaydet',
    text: 'Beğendiğin içerikleri favoriye al. Favoriler hesabına özel saklanır ve ana ekranda görünür.',
    image:
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Kaldığın yerden devam et',
    text: 'İzlediğin içerikler geçmişine eklenir. Sonra geri döndüğünde devam etmek daha kolay olur.',
    image:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Netflix tarzı player',
    text: 'Tam ekran player, gizlenen kontroller, ileri/geri sarma ve ses kontrolleriyle yayına odaklan.',
    image:
      'https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Hazırsan başlayalım',
    text: 'Bu sunum sadece ilk girişinde gösterilir. Sonraki girişlerinde doğrudan ana sayfaya geçersin.',
    image:
      'https://images.unsplash.com/photo-1601944179066-29786cb9d32a?auto=format&fit=crop&w=1200&q=80',
  },
]

const categoryTitles: Record<Screen, string> = {
  home: 'Anasayfa',
  live: 'Canlı Kanallar',
  sports: 'Spor Kanalları',
  series: 'Diziler',
  movies: 'Filmler',
  list: 'Listem',
  favorites: 'Favoriler',
  downloads: 'İndirilenler',
  account: 'Hesabım',
  about: 'Ayarlar',
  'get-app': 'Uygulamayı İndir',
}

type AppearanceSettings = {
  accent: string
  accent2: string
  cardScale: number
  cardRadius: number
  cardGlow: number
}

const defaultAppearance: AppearanceSettings = {
  accent: '#00e5ff',
  accent2: '#ff2f92',
  cardScale: 1,
  cardRadius: 16,
  cardGlow: 1,
}

function applyDeviceProfile(profile: DeviceType) {
  const root = document.documentElement
  const isTv = profile === 'tv'
  const isPhone = profile === 'phone'
  root.dataset.deviceType = profile
  root.dataset.screenOrientation = isPhone ? 'portrait' : 'landscape'
  root.dataset.tvPerformance = isTv ? 'true' : 'false'

  if (isTv) {
    const scale = Math.min(window.innerWidth / 1920, 1)
    root.style.setProperty('--display-scale', scale.toFixed(4))
    root.style.setProperty('--display-width', '1920px')
    root.style.setProperty('--display-height', '1080px')
    root.style.setProperty('--rail-poster-width', 'clamp(210px, 13vw, 260px)')
    root.style.setProperty('--rail-wide-width', 'clamp(330px, 22vw, 440px)')
    root.style.setProperty('--rail-channel-width', 'clamp(250px, 16vw, 320px)')
    root.style.setProperty('--rail-circle-width', 'clamp(150px, 9vw, 190px)')
    root.style.setProperty('--home-poster-width', 'clamp(170px, 10vw, 210px)')
    root.style.setProperty('--home-wide-width', 'clamp(280px, 18vw, 350px)')
    root.style.setProperty('--home-channel-width', 'clamp(220px, 14vw, 280px)')
    root.style.setProperty('--home-circle-width', 'clamp(124px, 8vw, 158px)')
    return
  }

  if (profile === 'pc') {
    root.style.setProperty('--display-scale', '1')
    root.style.setProperty('--display-width', '100%')
    root.style.setProperty('--display-height', '100svh')
    root.style.setProperty('--rail-poster-width', 'clamp(178px, 14vw, 230px)')
    root.style.setProperty('--rail-wide-width', 'clamp(290px, 23vw, 390px)')
    root.style.setProperty('--rail-channel-width', 'clamp(220px, 17vw, 280px)')
    root.style.setProperty('--rail-circle-width', 'clamp(130px, 10vw, 168px)')
    root.style.setProperty('--home-poster-width', 'clamp(150px, 12vw, 185px)')
    root.style.setProperty('--home-wide-width', 'clamp(250px, 20vw, 320px)')
    root.style.setProperty('--home-channel-width', 'clamp(200px, 16vw, 250px)')
    root.style.setProperty('--home-circle-width', 'clamp(112px, 9vw, 140px)')
    return
  }
  root.style.setProperty('--display-scale', '1')
  root.style.setProperty('--display-width', '100%')
  root.style.setProperty('--display-height', '100svh')
  root.style.setProperty('--rail-poster-width', 'clamp(138px, 42vw, 170px)')
  root.style.setProperty('--rail-wide-width', 'clamp(220px, 66vw, 280px)')
  root.style.setProperty('--rail-channel-width', 'clamp(190px, 58vw, 250px)')
  root.style.setProperty('--rail-circle-width', 'clamp(94px, 30vw, 124px)')
  root.style.setProperty('--home-poster-width', 'clamp(128px, 39vw, 158px)')
  root.style.setProperty('--home-wide-width', 'clamp(210px, 64vw, 260px)')
  root.style.setProperty('--home-channel-width', 'clamp(180px, 55vw, 230px)')
  root.style.setProperty('--home-circle-width', 'clamp(88px, 28vw, 112px)')
}

function detectDeviceProfile(): DeviceType {
  // URL override for TV APK build
  const urlParams = new URLSearchParams(window.location.search)
  const override = urlParams.get('deviceOverride') as DeviceType | null
  if (override === 'tv' || override === 'pc' || override === 'phone') return override

  const ua = navigator.userAgent.toLowerCase()
  const isTv =
    /\b(smart-tv|smarttv|hbbtv|netcast|webos|tizen|appletv|googletv|android tv|bravia|viera|aquos|roku|aft)\b/.test(ua)
  if (isTv) return 'tv'

  // Use only CSS viewport width — avoids false phone detection on landscape tablets/emulators
  const narrowScreen = window.matchMedia('(max-width: 760px)').matches
  if (narrowScreen) return 'phone'

  return 'pc'
}

function useDeviceProfile() {
  const [profile, setProfile] = useState<DeviceType>(detectDeviceProfile)

  useEffect(() => {
    const updateProfile = () => setProfile(detectDeviceProfile())
    window.addEventListener('resize', updateProfile)
    window.addEventListener('orientationchange', updateProfile)
    return () => {
      window.removeEventListener('resize', updateProfile)
      window.removeEventListener('orientationchange', updateProfile)
    }
  }, [])

  return profile
}

function loadAppearanceSettings() {
  try {
    const raw = window.localStorage.getItem(APPEARANCE_KEY)
    return raw ? { ...defaultAppearance, ...(JSON.parse(raw) as Partial<AppearanceSettings>) } : defaultAppearance
  } catch {
    return defaultAppearance
  }
}

function getDisplaySetupKey(user: AtlasUser | null) {
  return `${DISPLAY_SETUP_KEY_PREFIX}.${user?.email ?? 'guest'}`
}

function hasDisplaySetup(user: AtlasUser | null) {
  try {
    return window.localStorage.getItem(getDisplaySetupKey(user)) === 'done'
  } catch {
    return false
  }
}

function markDisplaySetup(user: AtlasUser | null) {
  try {
    window.localStorage.setItem(getDisplaySetupKey(user), 'done')
  } catch {}
}

function playStartupTone() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return

  const audio = new AudioContextClass()
  const gain = audio.createGain()
  const oscillator = audio.createOscillator()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(220, audio.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(660, audio.currentTime + 0.22)
  gain.gain.setValueAtTime(0.001, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.16, audio.currentTime + 0.04)
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.42)
  oscillator.connect(gain)
  gain.connect(audio.destination)
  oscillator.start()
  oscillator.stop(audio.currentTime + 0.45)
}

function getProxiedStreamUrl(item: ContentItem) {
  if (item.noProxy) return item.streamUrl
  const userAgent = item.httpUserAgent || DEFAULT_PLAYER_USER_AGENT
  const params = new URLSearchParams({
    url: item.streamUrl,
    ua: userAgent,
  })
  if (item.isLive && item.referer) params.set('referer', item.referer)
  if (item.isLive && item.origin) params.set('origin', item.origin)
  return `/__atlas_proxy?${params.toString()}`
}

function getDownloadUrl(item: ContentItem) {
  const params = new URLSearchParams({
    url: item.streamUrl,
    title: `${item.displayTitle ?? item.title}${/\.m3u8(?:$|\?)/i.test(item.streamUrl) ? '.m3u8' : '.mp4'}`,
    ua: item.httpUserAgent || DEFAULT_PLAYER_USER_AGENT,
  })
  return `/__atlas_download?${params.toString()}`
}

function getCountryFlag(country?: string) {
  const flagByCountry: Record<string, { code?: string; emoji: string; label: string }> = {
    Albania: { code: 'al', emoji: '🇦🇱', label: 'Arnavutluk bayrağı' },
    Arabia: { code: 'sa', emoji: '🇸🇦', label: 'Arabistan bayrağı' },
    Balkans: { code: 'eu', emoji: '🌍', label: 'Balkanlar' },
    Bulgaria: { code: 'bg', emoji: '🇧🇬', label: 'Bulgaristan bayrağı' },
    France: { code: 'fr', emoji: '🇫🇷', label: 'Fransa bayrağı' },
    Germany: { code: 'de', emoji: '🇩🇪', label: 'Almanya bayrağı' },
    Italy: { code: 'it', emoji: '🇮🇹', label: 'İtalya bayrağı' },
    Netherlands: { code: 'nl', emoji: '🇳🇱', label: 'Hollanda bayrağı' },
    Poland: { code: 'pl', emoji: '🇵🇱', label: 'Polonya bayrağı' },
    Portugal: { code: 'pt', emoji: '🇵🇹', label: 'Portekiz bayrağı' },
    Romania: { code: 'ro', emoji: '🇷🇴', label: 'Romanya bayrağı' },
    Russia: { code: 'ru', emoji: '🇷🇺', label: 'Rusya bayrağı' },
    Spain: { code: 'es', emoji: '🇪🇸', label: 'İspanya bayrağı' },
    Turkey: { code: 'tr', emoji: '🇹🇷', label: 'Türkiye bayrağı' },
    'United Kingdom': { code: 'gb', emoji: '🇬🇧', label: 'Birleşik Krallık bayrağı' },
    Demo: { emoji: '📺', label: 'Demo kanal' },
  }
  const flag = country ? flagByCountry[country] : undefined
  if (!flag) return null
  return {
    ...flag,
    imageUrl: flag.code ? `https://flagcdn.com/w80/${flag.code}.png` : undefined,
    backdropUrl: flag.code ? `https://flagcdn.com/w640/${flag.code}.png` : undefined,
  }
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  const paddedMinutes = String(minutes).padStart(2, '0')
  const paddedSeconds = String(remainingSeconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${paddedMinutes}:${paddedSeconds}` : `${paddedMinutes}:${paddedSeconds}`
}

function getCategoryPageSize(screen: Screen) {
  return screen === 'series' || screen === 'movies' ? VOD_CATEGORY_PAGE_SIZE : CATEGORY_PAGE_SIZE
}

function hasHomeSectionContent(sections: HomeSection[]) {
  return sections.some((section) => section.items.length > 0)
}

function acceptsEmptyCategoryPage(
  screen: Screen,
  search: string,
  filters: { liveCountry: string; liveCategory: string; vodCategory: string; vodPlatform: string },
) {
  if (screen === 'list' || screen === 'favorites' || screen === 'sports' || screen === 'downloads') return true
  return Boolean(search.trim() || filters.liveCountry || filters.liveCategory || filters.vodCategory || filters.vodPlatform)
}

function isVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
}

function getNavigationRoot() {
  return (
    document.querySelector<HTMLElement>('.player-overlay') ??
    document.querySelector<HTMLElement>('.detail-panel') ??
    document.querySelector<HTMLElement>('.admin-page') ??
    document
  )
}

function getFocusableElements(root: ParentNode = document) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => isVisible(element) && element.dataset.spatialIgnore !== 'true',
  )
}

function focusFirstElement(root: ParentNode = document) {
  window.setTimeout(() => {
    const preferred = root.querySelector<HTMLElement>('[data-autofocus="true"]')
    const target = preferred && isVisible(preferred) ? preferred : getFocusableElements(root)[0]
    target?.focus()
  }, 80)
}

function findNextFocus(current: HTMLElement, direction: Direction, elements: HTMLElement[]) {
  const currentRect = current.getBoundingClientRect()
  const currentCenter = {
    x: currentRect.left + currentRect.width / 2,
    y: currentRect.top + currentRect.height / 2,
  }

  let best: { element: HTMLElement; score: number } | null = null

  for (const element of elements) {
    if (element === current) continue
    const rect = element.getBoundingClientRect()
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
    const dx = center.x - currentCenter.x
    const dy = center.y - currentCenter.y

    if (direction === 'right' && dx <= 8) continue
    if (direction === 'left' && dx >= -8) continue
    if (direction === 'down' && dy <= 8) continue
    if (direction === 'up' && dy >= -8) continue

    const primary = direction === 'left' || direction === 'right' ? Math.abs(dx) : Math.abs(dy)
    const cross = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx)
    const score = primary * 1.6 + cross

    if (!best || score < best.score) {
      best = { element, score }
    }
  }

  return best?.element
}

function findNextInGroup(current: HTMLElement, direction: Direction, elements: HTMLElement[]) {
  if (direction !== 'left' && direction !== 'right') return null
  const group = current.closest<HTMLElement>(SPATIAL_GROUP_SELECTOR)
  if (!group) return null
  const groupElements = getFocusableElements(group).filter((element) => elements.includes(element))
  const currentIndex = groupElements.indexOf(current)
  if (currentIndex < 0) return null
  const nextIndex = currentIndex + (direction === 'right' ? 1 : -1)
  return groupElements[nextIndex] ?? null
}

function shouldKeepHorizontalKeyInInput(target: EventTarget | null, direction: Direction) {
  if (direction !== 'left' && direction !== 'right') return false
  if (!(target instanceof HTMLInputElement)) return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
  if (target.type === 'range') return true
  const selectionStart = target.selectionStart ?? 0
  const selectionEnd = target.selectionEnd ?? selectionStart
  if (selectionStart !== selectionEnd) return true
  if (direction === 'left') return selectionStart > 0
  return selectionStart < target.value.length
}

function useSpatialNavigation(resetKey: string) {
  useEffect(() => {
    focusFirstElement()
  }, [resetKey])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const isTextInput =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
      const directionByKey: Record<string, Direction> = {
        ArrowUp: 'up',
        Up: 'up',
        ArrowDown: 'down',
        Down: 'down',
        ArrowLeft: 'left',
        Left: 'left',
        ArrowRight: 'right',
        Right: 'right',
      }
      const direction = directionByKey[event.key] ?? directionByKey[event.code]

      if (direction) {
        if (isTextInput && shouldKeepHorizontalKeyInInput(target, direction)) return
        const elements = getFocusableElements(getNavigationRoot())
        if (!elements.length) return

        const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
        const current = active && elements.includes(active) ? active : elements[0]
        if (
          current.classList.contains('player-stage') &&
          document.querySelector('.player-overlay') &&
          (direction === 'left' || direction === 'right')
        ) {
          return
        }
        const next = findNextInGroup(current, direction, elements) ?? findNextFocus(current, direction, elements)
        if (next) {
          event.preventDefault()
          next.focus()
          next.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        }
        return
      }

      if (event.key === 'Enter' || event.key === 'OK' || event.key === 'Select' || event.code === 'NumpadEnter') {
        const active = document.activeElement
        if (
          active instanceof HTMLElement &&
          !active.matches('button, input, textarea, select, a') &&
          active.tabIndex >= 0
        ) {
          event.preventDefault()
          active.click()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

function App() {
  const deviceType = useDeviceProfile()
  const [isAuthed, setIsAuthed] = useState(false)
  const [currentUser, setCurrentUser] = useState<AtlasUser | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authError, setAuthError] = useState('')
  const [showSplash, setShowSplash] = useState(false)
  const [showDisplaySetup, setShowDisplaySetup] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [screen, setScreen] = useState<Screen>('home')
  const [theme, setTheme] = useState<Theme>('dark')
  const [appearance, setAppearance] = useState<AppearanceSettings>(loadAppearanceSettings)
  const [search, setSearch] = useState('')
  const [heroItems, setHeroItems] = useState<ContentItem[]>([])
  const [heroIndex, setHeroIndex] = useState(0)
  const [homeSections, setHomeSections] = useState<HomeSection[]>([])
  const [publicSettings, setPublicSettings] = useState<AdminSettings | null>(null)
  const [categoryItems, setCategoryItems] = useState<ContentItem[]>([])
  const [categoryTotal, setCategoryTotal] = useState(0)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [categoryLoadingMore, setCategoryLoadingMore] = useState(false)
  const [liveFilters, setLiveFilters] = useState<LiveFilterOptions>({ countries: [], categories: [] })
  const [liveCountry, setLiveCountry] = useState('')
  const [liveCategory, setLiveCategory] = useState('')
  const [liveProvider, setLiveProvider] = useState<'vavoo' | 'iptv-turkey'>('vavoo')
  const [vodCategories, setVodCategories] = useState<string[]>([])
  const [vodPlatforms, setVodPlatforms] = useState<string[]>([])
  const [vodCategory, setVodCategory] = useState('')
  const [vodPlatform, setVodPlatform] = useState('')
  const [playerItem, setPlayerItem] = useState<ContentItem | null>(null)
  const [detailItem, setDetailItem] = useState<ContentItem | null>(null)
  const [detailReturnScreen, setDetailReturnScreen] = useState<Screen>('home')
  const [isPlaying, setIsPlaying] = useState(true)
  const [adminGateOpen, setAdminGateOpen] = useState(false)
  const [adminPanelOpen, setAdminPanelOpen] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  useSpatialNavigation(`${deviceType ?? 'unknown'}-${isAuthed}-${authMode}-${screen}-${playerItem?.id ?? 'app'}-${categoryItems[0]?.id ?? 'empty'}`)

  const applyHomeSections = useCallback((sections: HomeSection[]) => {
    if (hasHomeSectionContent(sections)) setHomeSections(sections)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    applyDeviceProfile(deviceType)

    const onResize = () => applyDeviceProfile(deviceType)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [deviceType])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', appearance.accent)
    document.documentElement.style.setProperty('--accent-2', appearance.accent2)
    document.documentElement.style.setProperty('--card-scale', String(appearance.cardScale))
    document.documentElement.style.setProperty('--ui-scale', String(appearance.cardScale))
    document.documentElement.style.setProperty('--card-radius', `${appearance.cardRadius}px`)
    document.documentElement.style.setProperty('--card-glow', String(appearance.cardGlow))
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance))
  }, [appearance])

  useEffect(() => {
    api.auth.getCurrent().then((user) => {
      if (!user || !user.remember) return
      setCurrentUser(user)
      setIsAuthed(true)
      setShowDisplaySetup(!hasDisplaySetup(user))
      setShowOnboarding(!user.onboardingCompleted)
    })
    api.admin.getSettings().then(setPublicSettings)
  }, [])

  useEffect(() => {
    if (!isAuthed) return

    let isActive = true
    api.content.getHeroItems().then((items) => {
      if (isActive) setHeroItems(items)
    })
    api.content.getHomeSections().then((sections) => {
      if (isActive) applyHomeSections(sections)
    })
    const refreshFreshContent = () => {
      api.content.getHeroItemsFresh().then((items) => {
        if (isActive) setHeroItems(items)
      })
      api.content.getHomeSectionsFresh().then((sections) => {
        if (isActive) applyHomeSections(sections)
      })
    }
    const withIdleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      cancelIdleCallback?: (handle: number) => void
    }
    let refreshTimer: number | null = null
    let idleHandle: number | null = null
    if (withIdleWindow.requestIdleCallback) {
      idleHandle = withIdleWindow.requestIdleCallback(
        () => refreshFreshContent(),
        { timeout: 1200 },
      )
    } else {
      refreshTimer = window.setTimeout(() => refreshFreshContent(), 350)
    }
    return () => {
      isActive = false
      if (refreshTimer !== null) window.clearTimeout(refreshTimer)
      if (idleHandle !== null && withIdleWindow.cancelIdleCallback) withIdleWindow.cancelIdleCallback(idleHandle)
    }
  }, [applyHomeSections, isAuthed])

  useEffect(() => {
    if (!isAuthed || screen === 'home' || screen === 'account' || screen === 'about') return
    let isActive = true
    const liveSourceOverride = screen === 'live' && liveProvider === 'iptv-turkey' ? IPTV_TURKEY_M3U_URL : undefined
    const allowEmptyPage = acceptsEmptyCategoryPage(screen, search, { liveCountry, liveCategory, vodCategory, vodPlatform })
    api.content
      .getCategoryPage(screen, 0, getCategoryPageSize(screen), search, { country: liveCountry, liveCategory, vodCategory, platform: vodPlatform, sourceOverride: liveSourceOverride })
      .then((page) => {
        if (!isActive) return
        if (!allowEmptyPage && page.items.length === 0 && page.total === 0) {
          setCategoryLoading(false)
          return
        }
        setCategoryItems(page.items)
        setCategoryTotal(page.total)
        if (screen === 'live' || screen === 'sports') {
          setLiveFilters({
            countries: page.countries ?? [],
            categories: page.categories ?? [],
          })
        } else if (screen === 'series' || screen === 'movies') {
          setVodCategories(page.categories ?? [])
          setVodPlatforms(page.platforms ?? [])
        }
        setCategoryLoading(false)
      })
      .catch(() => {
        if (isActive) setCategoryLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [isAuthed, screen, search, liveCountry, liveCategory, liveProvider, vodCategory, vodPlatform])

  useEffect(() => {
    if (heroItems.length < 2) return
    const timer = window.setInterval(() => {
      setHeroIndex((index) => (index + 1) % heroItems.length)
    }, 5200)

    return () => window.clearInterval(timer)
  }, [heroItems.length])

  const closePlayer = useCallback(() => {
    window.screen.orientation?.unlock?.()
    // Re-lock to portrait after player close (for portrait APK build)
    window.screen.orientation?.lock?.('portrait').catch(() => undefined)
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined)
    }
    setPlayerItem(null)
  }, [])

  const refreshHomeSections = useCallback(() => {
    void api.content
      .getHomeSectionsFresh()
      .then(applyHomeSections)
      .catch(() => void api.content.getHomeSections().then(applyHomeSections))
  }, [applyHomeSections])

  const hero = heroItems[heroIndex] ?? heroItems[0]

  const reloadContent = useCallback(async () => {
    if (!isAuthed) return
    setHeroIndex(0)
    setHeroItems(await api.content.getHeroItems())
    applyHomeSections(await api.content.getHomeSections())
    if (['live', 'sports', 'series', 'movies', 'list', 'favorites', 'downloads'].includes(screen)) {
      const liveSourceOverride = screen === 'live' && liveProvider === 'iptv-turkey' ? IPTV_TURKEY_M3U_URL : undefined
      setCategoryItems([])
      setCategoryTotal(0)
      setCategoryLoading(true)
      const page = await api.content.getCategoryPage(screen, 0, getCategoryPageSize(screen), search, {
        country: liveCountry,
        liveCategory,
        vodCategory,
        platform: vodPlatform,
        sourceOverride: liveSourceOverride,
      })
      if (!acceptsEmptyCategoryPage(screen, search, { liveCountry, liveCategory, vodCategory, vodPlatform }) && page.items.length === 0 && page.total === 0) {
        setCategoryLoading(false)
        return
      }
      setCategoryItems(page.items)
      setCategoryTotal(page.total)
      if (screen === 'live' || screen === 'sports') {
        setLiveFilters({
          countries: page.countries ?? [],
          categories: page.categories ?? [],
        })
      } else if (screen === 'series' || screen === 'movies') {
        setVodCategories(page.categories ?? [])
        setVodPlatforms(page.platforms ?? [])
      }
      setCategoryLoading(false)
    }
  }, [applyHomeSections, isAuthed, liveCategory, liveCountry, liveProvider, screen, search, vodCategory, vodPlatform])

  useEffect(() => {
    const onAdminKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const isTyping =
        target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      if (isTyping || event.key !== '9') return
      event.preventDefault()
      setAdminGateOpen(true)
    }

    window.addEventListener('keydown', onAdminKeyDown)
    return () => window.removeEventListener('keydown', onAdminKeyDown)
  }, [])

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    const securityQuestion = String(form.get('securityQuestion') ?? '')
    const securityAnswer = String(form.get('securityAnswer') ?? '')
    const remember = form.get('remember') === 'on'

    let result: AuthResult
    try {
      setAuthError('')
      result =
        authMode === 'register'
          ? await api.auth.register(email, password, '', securityQuestion, securityAnswer)
          : authMode === 'forgot'
            ? await api.auth.resetPassword(email, securityQuestion, securityAnswer, password)
            : await api.auth.login(email, password, remember)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Giriş işlemi başarısız.')
      return
    }

    playStartupTone()
    setShowSplash(true)
    window.setTimeout(() => {
      setCurrentUser(result.user)
      setIsAuthed(true)
      setShowDisplaySetup(!hasDisplaySetup(result.user))
      setShowOnboarding(result.needsOnboarding)
      setShowSplash(false)
    }, 1600)
  }

  const toggleFavorite = async (item: ContentItem) => {
    await api.user.toggleFavorite(item.id)
    const sections = await api.content.getHomeSections()
    applyHomeSections(sections)
    setCategoryItems((items) =>
      screen === 'favorites'
        ? items.filter((entry) => entry.id !== item.id)
        : items.map((entry) => (entry.id === item.id ? { ...entry, isFavorite: !entry.isFavorite } : entry)),
    )
    setDetailItem((entry) =>
      entry && entry.id === item.id
        ? {
            ...entry,
            isFavorite: !entry.isFavorite,
          }
        : entry,
    )
  }

  const toggleList = async (item: ContentItem) => {
    await api.user.toggleList(item)
    const sections = await api.content.getHomeSections()
    applyHomeSections(sections)
    setCategoryItems((items) =>
      items.map((entry) =>
        (entry.groupId ?? entry.id) === (item.groupId ?? item.id)
          ? {
              ...entry,
              isInList: !entry.isInList,
              episodes: entry.episodes?.map((episode) => ({ ...episode, isInList: !entry.isInList })),
            }
          : entry,
      ),
    )
    setDetailItem((entry) =>
      entry && (entry.groupId ?? entry.id) === (item.groupId ?? item.id)
        ? { ...entry, isInList: !entry.isInList }
        : entry,
    )
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (['Escape', 'Backspace', 'BrowserBack', 'GoBack'].includes(event.key) || event.code === 'BrowserBack') {
        if (playerItem) {
          event.preventDefault()
          closePlayer()
          return
        }
        if (adminPanelOpen) {
          event.preventDefault()
          setAdminPanelOpen(false)
          return
        }
        if (detailItem) {
          event.preventDefault()
          setDetailItem(null)
        }
      }

      if (event.code === 'Space' && playerItem) {
        event.preventDefault()
        setIsPlaying((value) => !value)
      }

      const isTyping = target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)

      if (!playerItem && !isTyping) {
        if (event.key === 'f' || event.key === 'F') {
          const targetItem = detailItem ?? heroItems[heroIndex]
          if (targetItem) { event.preventDefault(); void toggleFavorite(targetItem) }
        }
        if (event.key === 'l' || event.key === 'L') {
          const targetItem = detailItem ?? heroItems[heroIndex]
          if (targetItem) { event.preventDefault(); void toggleList(targetItem) }
        }
        if (event.key === 'i' || event.key === 'I') {
          if (!detailItem && screen === 'home' && heroItems[heroIndex]) {
            event.preventDefault()
            setDetailReturnScreen('home')
            setDetailItem(heroItems[heroIndex])
          }
        }
        if (event.key === '/') {
          event.preventDefault()
          document.querySelector<HTMLElement>('.search-box input')?.focus()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [adminPanelOpen, closePlayer, detailItem, heroIndex, heroItems, playerItem, screen, setAdminPanelOpen, setDetailItem, setDetailReturnScreen, toggleFavorite, toggleList])

  const changeScreen = (next: Screen) => {
    setScreen(next)
    setSearch('')
    setVodCategory('')
    setVodPlatform('')
    setDetailItem(null)
    if (['live', 'sports', 'series', 'movies', 'list', 'favorites', 'downloads'].includes(next)) {
      setCategoryItems([])
      setCategoryLoading(true)
    }
  }

  const handleLogout = async () => {
    await api.auth.logout()
    setCurrentUser(null)
    setIsAuthed(false)
    setShowDisplaySetup(false)
    setShowOnboarding(false)
    setScreen('home')
    setSearch('')
    setDetailItem(null)
    setPlayerItem(null)
  }

  const handlePasswordChange = async (password: string) => {
    const updated = await api.auth.updatePassword(password)
    setCurrentUser(updated)
  }

  const changeSearch = (value: string) => {
    setSearch(value)
    if (['live', 'sports', 'series', 'movies', 'list', 'favorites', 'downloads'].includes(screen)) {
      setCategoryItems([])
      setCategoryTotal(0)
      setCategoryLoading(true)
    }
  }

  const changeLiveCountry = (country: string) => {
    setLiveCountry(country)
    setLiveCategory('')
    setCategoryItems([])
    setCategoryTotal(0)
    if (screen === 'live' || screen === 'sports') setCategoryLoading(true)
  }

  const changeLiveProvider = (provider: 'vavoo' | 'iptv-turkey') => {
    setLiveProvider(provider)
    setLiveCountry('')
    setLiveCategory('')
    setCategoryItems([])
    setCategoryTotal(0)
    if (screen === 'live') setCategoryLoading(true)
  }

  const changeLiveCategory = (category: string) => {
    setLiveCategory(category)
    setCategoryItems([])
    setCategoryTotal(0)
    if (screen === 'live' || screen === 'sports') setCategoryLoading(true)
  }

  const changeVodCategory = (category: string) => {
    setVodCategory(category)
    setCategoryItems([])
    setCategoryTotal(0)
    if (screen === 'series' || screen === 'movies') setCategoryLoading(true)
  }

  const changeVodPlatform = (platform: string) => {
    setVodPlatform(platform)
    setCategoryItems([])
    setCategoryTotal(0)
    if (screen === 'series' || screen === 'movies') setCategoryLoading(true)
  }

  const loadMoreCategoryItems = async () => {
    if (categoryLoadingMore || categoryItems.length >= categoryTotal) return
    setCategoryLoadingMore(true)
    const liveSourceOverride = screen === 'live' && liveProvider === 'iptv-turkey' ? IPTV_TURKEY_M3U_URL : undefined
    const page = await api.content.getCategoryPage(screen, categoryItems.length, getCategoryPageSize(screen), search, {
      country: liveCountry,
      liveCategory,
      vodCategory,
      platform: vodPlatform,
      sourceOverride: liveSourceOverride,
    })
    setCategoryItems((items) => [...items, ...page.items])
    setCategoryTotal(page.total)
    setCategoryLoadingMore(false)
  }

  const openPlayer = (item: ContentItem) => {
    trackView(item)
    if (item.isLive) api.user.saveLastLiveChannel(item)
    setIsPlaying(true)
    flushSync(() => setPlayerItem(item))

    // Skip requestFullscreen in Electron — the overlay is already position:fixed
    // full-viewport; calling requestFullscreen causes a GPU surface black frame.
    const isElectron = navigator.userAgent.includes('Electron')
    if (!isElectron) {
      const player = document.querySelector<HTMLElement>('.player-overlay')
      player?.requestFullscreen?.().catch(() => {
        // Browser fullscreen can be blocked; the overlay is still fixed to the viewport.
      })
    }
    // On portrait-locked devices (phone APK), force landscape for video playback
    window.screen.orientation?.lock?.('landscape').catch(() => {
      window.screen.orientation?.unlock?.()
    })
  }

  if (showSplash) {
    return <SplashScreen />
  }

  if (isAuthed && showDisplaySetup) {
    return (
      <DisplaySetupScreen
        appearance={appearance}
        onAppearanceChange={setAppearance}
        onFinish={() => {
          markDisplaySetup(currentUser)
          setShowOnboarding(!currentUser?.onboardingCompleted)
          setShowDisplaySetup(false)
        }}
      />
    )
  }

  if (isAuthed && showOnboarding) {
    return (
      <OnboardingScreen
        user={currentUser}
        onFinish={async () => {
          const updated = await api.auth.completeOnboarding()
          setCurrentUser(updated)
          setShowOnboarding(false)
        }}
      />
    )
  }

  if (!isAuthed) {
    return (
      <AuthScreen
        mode={authMode}
        settings={publicSettings}
        onModeChange={setAuthMode}
        onSubmit={handleAuth}
        error={authError}
        theme={theme}
        onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />
    )
  }

  return (
    <div className="app-frame">
      <TopBar
        screen={screen}
        search={search}
        theme={theme}
        notification={publicSettings?.homeNotification ?? ''}
        notificationId={publicSettings?.homeNotificationId ?? 0}
        onScreenChange={changeScreen}
        onSearchChange={changeSearch}
        onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onSettingsOpen={() => changeScreen('about')}
        onNotificationRead={() => { /* state update triggers re-render via localStorage */ }}
        currentUser={currentUser}
        onSearchSelect={(item) => { setDetailReturnScreen(screen); setDetailItem(item) }}
      />

      <main className="page-shell">
        {adminPanelOpen ? (
          <AdminPanel
            adminPassword={adminPassword}
            onClose={() => {
              setAdminPanelOpen(false)
              setAdminPassword('')
            }}
            onSaved={async () => {
              await reloadContent()
              setPublicSettings(await api.admin.getSettings())
            }}
          />
        ) : null}

        {!adminPanelOpen && detailItem ? (
          <DetailPanel
            item={detailItem}
            onClose={() => {
              setDetailItem(null)
              setScreen(detailReturnScreen)
            }}
            onPlay={(episode) => {
              setDetailItem(null)
              setScreen(detailReturnScreen)
              openPlayer(episode)
            }}
            onToggleFavorite={toggleFavorite}
            onToggleList={toggleList}
          />
        ) : null}

        {!adminPanelOpen && !detailItem && screen === 'home' && hero ? (
          <HomeScreen
            hero={hero}
            heroItems={heroItems}
            heroIndex={heroIndex}
            sections={homeSections}
            onHeroIndex={setHeroIndex}
            onPlay={openPlayer}
            onDetail={(item) => {
              setDetailReturnScreen('home')
              setDetailItem(item)
            }}
            onToggleFavorite={toggleFavorite}
          />
        ) : null}

        {!adminPanelOpen && !detailItem && ['live', 'sports', 'series', 'movies', 'list', 'favorites', 'downloads'].includes(screen) ? (
          <CategoryScreen
            screen={screen}
            items={categoryItems}
            total={categoryTotal}
            isLoading={categoryLoading}
            isLoadingMore={categoryLoadingMore}
            search={search}
            liveFilters={liveFilters}
            liveCountry={liveCountry}
            liveCategory={liveCategory}
            liveProvider={liveProvider}
            vodCategories={vodCategories}
            vodPlatforms={vodPlatforms}
            vodCategory={vodCategory}
            vodPlatform={vodPlatform}
            onSearchChange={changeSearch}
            onLiveCountryChange={changeLiveCountry}
            onLiveCategoryChange={changeLiveCategory}
            onLiveProviderChange={changeLiveProvider}
            onVodCategoryChange={changeVodCategory}
            onVodPlatformChange={changeVodPlatform}
            onLoadMore={loadMoreCategoryItems}
            onPlay={(item) => {
              setDetailReturnScreen(screen)
              setDetailItem(item)
            }}
            onToggleFavorite={toggleFavorite}
          />
        ) : null}

        {!adminPanelOpen && !detailItem && screen === 'account' ? (
          <AccountScreen
            user={currentUser}
            onLogout={handleLogout}
            onPasswordChange={handlePasswordChange}
            onAvatarChange={async (emoji, color) => {
              await api.user.updateAvatar(emoji, color)
              const updated = await api.auth.getCurrent()
              if (updated) setCurrentUser(updated)
            }}
          />
        ) : null}
        {!adminPanelOpen && !detailItem && screen === 'get-app' ? (
          <GetAppScreen />
        ) : null}

        {!adminPanelOpen && !detailItem && screen === 'about' ? (
          <SettingsScreen
            appearance={appearance}
            settings={publicSettings}
            onAppearanceChange={setAppearance}
            onResetAppearance={() => setAppearance(defaultAppearance)}
            onCloseApp={() => window.close()}
          />
        ) : null}
      </main>

      <MobileNav screen={screen} onScreenChange={changeScreen} />

      {playerItem ? createPortal(
        <PlayerOverlay
          item={playerItem}
          isPlaying={isPlaying}
          onPlayingChange={setIsPlaying}
          onClose={closePlayer}
          onSelectEpisode={openPlayer}
          onToggleFavorite={() => toggleFavorite(playerItem)}
          onProgressSaved={refreshHomeSections}
        />,
        document.body
      ) : null}

      {adminGateOpen ? (
        <AdminGate
          onClose={() => setAdminGateOpen(false)}
          onUnlock={(password) => {
            setAdminPassword(password)
            setAdminGateOpen(false)
            setAdminPanelOpen(true)
          }}
        />
      ) : null}

    </div>
  )
}

function AuthScreen({
  mode,
  settings,
  theme,
  error,
  onModeChange,
  onSubmit,
  onThemeToggle,
}: {
  mode: AuthMode
  settings: AdminSettings | null
  theme: Theme
  error: string
  onModeChange: (mode: AuthMode) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onThemeToggle: () => void
}) {
  const isRegister = mode === 'register'
  const isForgot = mode === 'forgot'
  const telegramUrl = settings?.telegramUrl || 'https://t.me/'
  const announcement = settings?.announcement || 'Güncel sürüm, duyurular, özel içerikler ve destek için kanalımızı takip edin.'
  const version = settings?.appVersion || APP_VERSION

  return (
    <main className="auth-page">
      <button className="icon-button auth-theme" type="button" onClick={onThemeToggle} aria-label="Tema değiştir">
        {theme === 'dark' ? <Sun /> : <Moon />}
      </button>

      <section className="auth-brand" aria-label="AtlasTv giriş">
        <h1>
          Atlas<span>Tv</span>
        </h1>
        <p>Premium Yayın Deneyimi</p>
      </section>

      <aside className="notice-card">
        <Sparkles />
        <div>
          <h2>Telegram hesabımıza katılmayı unutmayın!</h2>
          <p>{announcement}</p>
        </div>
        <button type="button" onClick={() => window.open(telegramUrl, '_blank', 'noopener,noreferrer')}>Telegram’a Katıl</button>
      </aside>

      <form className="auth-card" onSubmit={onSubmit}>
        <h2>
          {isForgot ? 'Şifrenizi ' : 'Hesabınıza '}
          <span>{isForgot ? 'yenileyin' : isRegister ? 'kayıt olun' : 'giriş yapın'}</span>
        </h2>
        <input data-autofocus="true" name="email" type="email" placeholder="E-posta adresi" required />
        <input name="password" type="password" placeholder={isForgot ? 'Yeni şifre' : 'Şifre'} required minLength={4} />

        {isRegister || isForgot ? (
          <>
            <select name="securityQuestion" required defaultValue="">
              <option value="" disabled>
                Güvenlik sorusu seç
              </option>
              {securityQuestions.map((question) => (
                <option key={question} value={question}>
                  {question}
                </option>
              ))}
            </select>
            <input name="securityAnswer" placeholder="Güvenlik cevabı" required minLength={2} />
          </>
        ) : null}

        {!isForgot ? (
          <div className="auth-row">
            <label>
              <input name="remember" type="checkbox" /> Beni hatırla
            </label>
            <button type="button" onClick={() => onModeChange('forgot')}>Şifremi unuttum?</button>
          </div>
        ) : null}

        <button className="primary-action" type="submit">
          {isForgot ? 'Şifreyi Yenile' : isRegister ? 'Kayıt Ol' : 'Giriş Yap'} →
        </button>

        {error ? <p className="auth-error">{error}</p> : null}

        <div className="divider">
          <span>veya</span>
        </div>
        <p className="auth-switch">
          {isForgot ? 'Şifreni hatırladın mı?' : isRegister ? 'Zaten hesabın var mı?' : 'Hesabın yok mu?'}
          <button type="button" onClick={() => onModeChange(isForgot || isRegister ? 'login' : 'register')}>
            {isForgot || isRegister ? 'Giriş yap' : 'Kayıt ol'}
          </button>
        </p>
      </form>

      <footer className="auth-footer">
        <BadgeInfo />
        <p>
          <strong>Uygulamamız sürekli olarak güncellenmektedir.</strong>
          <span>Güncel sürüm: {version}</span>
        </p>
      </footer>
    </main>
  )
}

function SplashScreen() {
  return (
    <main className="splash-screen">
      <div className="splash-ring" />
      <h1>
        Atlas<span>Tv</span>
      </h1>
      <p>Yayın deneyiminiz hazırlanıyor</p>
    </main>
  )
}

function DisplaySetupScreen({
  appearance,
  onAppearanceChange,
  onFinish,
}: {
  appearance: AppearanceSettings
  onAppearanceChange: (settings: AppearanceSettings) => void
  onFinish: () => void
}) {
  const scalePercent = Math.round(appearance.cardScale * 100)
  const setScale = (percent: number) => {
    const normalized = Math.min(Math.max(percent, 10), 150) / 100
    onAppearanceChange({ ...appearance, cardScale: normalized })
  }
  const presets = [
    { label: 'Çok uzak', value: 10 },
    { label: 'Uzak', value: 50 },
    { label: 'Standart', value: 100 },
    { label: 'Yakın', value: 125 },
    { label: 'Büyük', value: 150 },
  ]

  useEffect(() => {
    focusFirstElement()
  }, [])

  return (
    <main className="display-setup-page">
      <section className="display-setup-copy">
        <p className="eyebrow">Ekran ayarı</p>
        <h1>Görünümü ekranına göre ayarla</h1>
        <p>Menü ve kart boyutlarını rahat izleme mesafene göre seç.</p>
      </section>

      <section className="display-preview" aria-label="Görünüm önizlemesi">
        <div className="display-preview-nav">
          <button type="button" className="active">Anasayfa</button>
          <button type="button">Canlı</button>
          <button type="button">Film</button>
        </div>
        <div className="display-preview-hero">
          <span>AtlasTv</span>
          <strong>Önizleme</strong>
        </div>
        <div className="display-preview-rail">
          {['Canlı', 'Film', 'Dizi'].map((item, index) => (
            <article key={item} className="display-preview-card">
              <div />
              <strong>{item}</strong>
              <span>{index === 0 ? 'HD Yayın' : index === 1 ? 'Yeni' : 'Sezon'}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="display-setup-controls">
        <div className="display-scale-readout">
          <Maximize />
          <strong>%{scalePercent}</strong>
          <span>{scalePercent < 100 ? 'Küçük kartlar' : scalePercent > 100 ? 'Büyük kartlar' : 'Standart'}</span>
        </div>
        <input
          data-autofocus="true"
          type="range"
          min="10"
          max="150"
          step="5"
          value={scalePercent}
          onChange={(event) => setScale(Number(event.target.value))}
          aria-label="Kart boyutu"
        />
        <div className="display-preset-row">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={Math.abs(scalePercent - preset.value) < 3 ? 'active' : undefined}
              onClick={() => setScale(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button className="primary-action" type="button" onClick={onFinish}>
          Böyle Kalsın
        </button>
      </section>
    </main>
  )
}

function OnboardingScreen({ user, onFinish }: { user: AtlasUser | null; onFinish: () => void }) {
  const [index, setIndex] = useState(0)
  const slide = onboardingSlides[index]
  const isLast = index === onboardingSlides.length - 1

  useEffect(() => {
    focusFirstElement()
  }, [index])

  return (
    <main className="onboarding-screen">
      <div className="onboarding-bg" />
      <section className="onboarding-slide">
        <div className="onboarding-visual" aria-hidden="true">
          <img src={slide.image} alt="" />
        </div>
        <div className="onboarding-copy">
          <p className="eyebrow">Hoş geldin {user?.name ?? 'Atlas kullanıcısı'}</p>
          <h1>{slide.title}</h1>
          <p>{slide.text}</p>
          <div className="onboarding-dots">
            {onboardingSlides.map((item, dotIndex) => (
              <button
                key={item.title}
                type="button"
                aria-label={`${dotIndex + 1}. sunum`}
                className={dotIndex === index ? 'active' : ''}
                onClick={() => setIndex(dotIndex)}
              />
            ))}
          </div>
          <div className="onboarding-actions">
            <button type="button" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>
              Geri
            </button>
            <button
              data-autofocus="true"
              className="primary-action"
              type="button"
              onClick={() => {
                if (isLast) {
                  onFinish()
                  return
                }
                setIndex((value) => value + 1)
              }}
            >
              {isLast ? 'Başlayalım' : 'Devam'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

function TopBar({
  screen,
  search,
  theme,
  notification,
  notificationId,
  onScreenChange,
  onSearchChange,
  onThemeToggle,
  onSettingsOpen,
  onNotificationRead,
  onSearchSelect,
  currentUser,
}: {
  screen: Screen
  search: string
  theme: Theme
  notification: string
  notificationId: number
  onScreenChange: (screen: Screen) => void
  onSearchChange: (value: string) => void
  onThemeToggle: () => void
  onSettingsOpen: () => void
  onNotificationRead: () => void
  onSearchSelect: (item: ContentItem) => void
  currentUser?: AtlasUser | null
}) {
  const [showNotifPopup, setShowNotifPopup] = useState(false)
  const [dropdownItems, setDropdownItems] = useState<ContentItem[]>([])
  const [dropdownActive, setDropdownActive] = useState(false)
  const [dropdownIndex, setDropdownIndex] = useState(-1)
  const searchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<number | null>(null)
  const notificationText = notification.trim()
  const hasNotification = Boolean(notificationText)
  const lastReadId = Number(window.localStorage.getItem(NOTIFICATION_READ_KEY) || '0')
  const hasUnread = notificationId > 0 && notificationId > lastReadId && hasNotification

  const fetchSearchResults = async (query: string) => {
    if (!query.trim()) { setDropdownItems([]); setDropdownActive(false); return }
    try {
      const [movRes, liveRes] = await Promise.all([
        fetch(`/__atlas_catalog?q=${encodeURIComponent(query)}&limit=8`).then(r => r.ok ? r.json() : { items: [] }),
        fetch(`/__atlas_live_catalog?q=${encodeURIComponent(query)}&limit=4`).then(r => r.ok ? r.json() : { items: [] }),
      ])
      const combined = [...(movRes.items || []), ...(liveRes.items || [])]
      const deduped = [...new Map(combined.map((item: ContentItem) => [item.id, item])).values()].slice(0, 8)
      setDropdownItems(deduped)
      setDropdownActive(deduped.length > 0)
    } catch {
      setDropdownItems([])
      setDropdownActive(false)
    }
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownActive || dropdownItems.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setDropdownIndex((prev) => Math.min(prev + 1, dropdownItems.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setDropdownIndex((prev) => Math.max(prev - 1, -1))
    } else if (event.key === 'Enter' && dropdownIndex >= 0) {
      event.preventDefault()
      onSearchSelect(dropdownItems[dropdownIndex])
      setDropdownActive(false)
    } else if (event.key === 'Escape') {
      setDropdownActive(false)
    }
  }

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        searchRef.current && !searchRef.current.contains(e.target as Node)
      ) {
        setDropdownActive(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleBellClick = () => {
    setShowNotifPopup((v) => !v)
    if (hasUnread) {
      window.localStorage.setItem(NOTIFICATION_READ_KEY, String(notificationId))
      onNotificationRead()
    }
  }

  return (
    <header className="top-bar">
      <div className="brand-lockup">
        <button className="icon-button menu-button" type="button" onClick={onSettingsOpen} aria-label="Ayarlar">
          <Settings />
        </button>
        <strong>
          Atlas<span>Tv</span>
        </strong>
      </div>

      <nav className="desktop-nav" aria-label="Ana menü">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={screen === item.id ? 'active' : ''}
            onClick={() => onScreenChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="top-actions">
        <div className="search-box-wrap" style={{ position: 'relative' }}>
          <label className="search-box">
            <Search />
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => {
                onSearchChange(event.target.value)
                if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
                debounceRef.current = window.setTimeout(() => {
                  void fetchSearchResults(event.target.value)
                }, 200)
              }}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => { if (dropdownItems.length) setDropdownActive(true) }}
              placeholder="Ara"
            />
          </label>
          {dropdownActive && dropdownItems.length > 0 && (
            <div ref={dropdownRef} className="search-dropdown">
              {dropdownItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`search-dropdown-item${dropdownIndex === idx ? ' active' : ''}`}
                  onClick={() => { onSearchSelect(item); setDropdownActive(false) }}
                >
                  <img src={item.posterUrl} alt="" />
                  <div className="search-dropdown-item-info">
                    <strong>{item.title}</strong>
                    <span>{item.isLive ? 'Canlı' : item.type === 'series' ? 'Dizi' : 'Film'} • ★{item.rating}</span>
                  </div>
                  <span className="search-dropdown-item-type">{item.isLive ? 'Canlı' : item.type === 'series' ? 'Dizi' : 'Film'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="notif-wrap">
          <button
            className={`icon-button notif-btn${hasUnread ? ' notif-btn--unread' : ''}`}
            type="button"
            onClick={handleBellClick}
            aria-label="Bildirimler"
          >
            <Bell />
            {hasUnread && <span className="notif-badge">{notificationId}-</span>}
          </button>
          {showNotifPopup && (
            <div className="notif-popup">
              <p>{hasNotification ? notificationText : 'Henüz aktif bildirim yok.'}</p>
              <button type="button" onClick={() => setShowNotifPopup(false)}><X /></button>
            </div>
          )}
        </div>
        {currentUser?.avatar ? (
          <div
            className="topbar-avatar"
            style={{ background: currentUser.avatar.color }}
            aria-label="Profil"
          >
            {currentUser.avatar.emoji}
          </div>
        ) : null}
        <button className="icon-button" type="button" onClick={onThemeToggle} aria-label="Tema değiştir">
          {theme === 'dark' ? <Sun /> : <Moon />}
        </button>
      </div>
    </header>
  )
}

function HomeScreen({
  hero,
  heroItems,
  heroIndex,
  sections,
  onHeroIndex,
  onPlay,
  onDetail,
  onToggleFavorite,
}: {
  hero: ContentItem
  heroItems: ContentItem[]
  heroIndex: number
  sections: HomeSection[]
  onHeroIndex: (index: number) => void
  onPlay: (item: ContentItem) => void
  onDetail: (item: ContentItem) => void
  onToggleFavorite: (item: ContentItem) => void
}) {
  const historyItems = sections.find((section) => section.id === 'continue')?.items ?? []
  const trendSection = sections.find((section) => section.id === 'trend')
  const regularSections = sections.filter((section) => section.id !== 'trend' && section.id !== 'continue')

  return (
    <div className="home-screen">
      <section className="hero-banner" style={{ backgroundImage: `url(${hero.backdropUrl})` }}>
        <div className="hero-content">
          <div className="tag-row">
            <span>{hero.category}</span>
            <span>★ {hero.rating}</span>
            <span>{hero.type === 'series' ? 'Dizi' : hero.type === 'movie' ? 'Film' : 'Canlı'}</span>
          </div>
          <h1>{hero.title}</h1>
          <p>{hero.description}</p>
          <div className="hero-actions">
            <button data-autofocus="true" type="button" className="watch-button" onClick={() => onPlay(hero)}>
              <Play /> İzle
            </button>
            <button type="button" className="detail-button" onClick={() => onDetail(hero)}>
              <Info /> Detay
            </button>
          </div>
        </div>
        <div className="hero-dots">
          {heroItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`${index + 1}. öne çıkan içerik`}
              className={heroIndex === index ? 'active' : ''}
              onClick={() => onHeroIndex(index)}
            />
          ))}
        </div>
      </section>

      <ContentRail
        title="İzlemeye Devam Et"
        variant="wide"
        plain
        items={historyItems}
        onPlay={onPlay}
        onToggleFavorite={onToggleFavorite}
      />

      {regularSections.map((section) => (
        <ContentRail
          key={section.id}
          title={section.title}
          variant={section.variant}
          items={section.items}
          onPlay={onPlay}
          onToggleFavorite={onToggleFavorite}
        />
      ))}

      {trendSection ? (
        <ContentRail
          title={trendSection.title}
          variant={trendSection.variant}
          items={trendSection.items}
          onPlay={onPlay}
          onToggleFavorite={onToggleFavorite}
        />
      ) : null}
    </div>
  )
}

function CategoryScreen({
  screen,
  items,
  total,
  isLoading,
  isLoadingMore,
  search,
  liveFilters,
  liveCountry,
  liveCategory,
  liveProvider,
  vodCategories,
  vodPlatforms,
  vodCategory,
  vodPlatform,
  onSearchChange,
  onLiveCountryChange,
  onLiveCategoryChange,
  onLiveProviderChange,
  onVodCategoryChange,
  onVodPlatformChange,
  onLoadMore,
  onPlay,
  onToggleFavorite,
}: {
  screen: Screen
  items: ContentItem[]
  total: number
  isLoading: boolean
  isLoadingMore: boolean
  search: string
  liveFilters: LiveFilterOptions
  liveCountry: string
  liveCategory: string
  liveProvider: 'vavoo' | 'iptv-turkey'
  vodCategories: string[]
  vodPlatforms: string[]
  vodCategory: string
  vodPlatform: string
  onSearchChange: (value: string) => void
  onLiveCountryChange: (value: string) => void
  onLiveCategoryChange: (value: string) => void
  onLiveProviderChange: (provider: 'vavoo' | 'iptv-turkey') => void
  onVodCategoryChange: (value: string) => void
  onVodPlatformChange: (value: string) => void
  onLoadMore: () => void
  onPlay: (item: ContentItem) => void
  onToggleFavorite: (item: ContentItem) => void
}) {
  const hasMore = items.length < total
  const isLiveLike = screen === 'live' || screen === 'sports'
  const isVodLike = screen === 'series' || screen === 'movies'

  return (
    <section className="category-page" data-screen={screen}>
      <div className="page-heading">
        <div>
          <p>AtlasTv Katalog</p>
          <h1>{categoryTitles[screen]}</h1>
        </div>
        <label className="search-box large">
          <Search />
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="İçerik ara" />
        </label>
      </div>

      {isLiveLike ? (
        <div className="live-filter-panel">
          {screen === 'live' && (
            <div className="live-provider-toggle">
              <span>Kaynak</span>
              <div className="filter-box-row">
                <button
                  type="button"
                  className={liveProvider === 'vavoo' ? 'active' : ''}
                  onClick={() => onLiveProviderChange('vavoo')}
                >
                  Vavoo
                </button>
                <button
                  type="button"
                  className={liveProvider === 'iptv-turkey' ? 'active' : ''}
                  onClick={() => onLiveProviderChange('iptv-turkey')}
                >
                  IPTV Türkiye
                </button>
              </div>
            </div>
          )}
          <label className="live-select">
            <span>Ülke</span>
            <select value={liveCountry} onChange={(event) => onLiveCountryChange(event.target.value)}>
              <option value="">Tüm ülkeler</option>
              {liveFilters.countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
          <label className="live-select">
            <span>Kategori</span>
            <select value={liveCategory} onChange={(event) => onLiveCategoryChange(event.target.value)}>
              <option value="">Tüm kategoriler</option>
              {liveFilters.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <div className="live-filter-summary">
            <span>{liveCountry || 'Tüm ülkeler'}</span>
            <strong>{total} {screen === 'sports' ? 'spor kanalı' : 'canlı kanal'}</strong>
          </div>
        </div>
      ) : isVodLike ? (
        <div className="vod-filter-panel">
          <div>
            <span>Kategori</span>
            <div className="filter-box-row">
              <button className={!vodCategory ? 'active' : ''} type="button" onClick={() => onVodCategoryChange('')}>
                Tümü
              </button>
              {vodCategories.map((category) => (
                <button
                  className={vodCategory === category ? 'active' : ''}
                  key={category}
                  type="button"
                  onClick={() => onVodCategoryChange(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span>Platform</span>
            <div className="filter-box-row">
              <button className={!vodPlatform ? 'active' : ''} type="button" onClick={() => onVodPlatformChange('')}>
                Tümü
              </button>
              {vodPlatforms.map((platform) => (
                <button
                  className={vodPlatform === platform ? 'active' : ''}
                  key={platform}
                  type="button"
                  onClick={() => onVodPlatformChange(platform)}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="content-grid loading-grid" aria-label="İçerikler yükleniyor">
          {Array.from({ length: 18 }, (_, index) => (
            <div className="card-skeleton" key={index} />
          ))}
        </div>
      ) : (
        <>
        <div className="content-grid">
          {items.map((item, index) => (
            <ContentCard
              key={item.id}
              item={item}
              autoFocus={index === 0}
              variant={isLiveLike ? 'channel' : 'poster'}
              onPlay={onPlay}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
        <div className="load-more-row">
          <span>{items.length} / {total} içerik gösteriliyor</span>
          {hasMore ? (
            <button type="button" onClick={onLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? 'Yükleniyor...' : 'Daha Fazla Göster'}
            </button>
          ) : null}
        </div>
        </>
      )}
    </section>
  )
}

function ContentRail({
  title,
  items,
  variant,
  plain,
  onPlay,
  onToggleFavorite,
}: {
  title: string
  items: ContentItem[]
  variant: HomeSection['variant']
  plain?: boolean
  onPlay: (item: ContentItem) => void
  onToggleFavorite: (item: ContentItem) => void
}) {
  const railRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(true)

  useEffect(() => {
    const el = railRef.current
    if (!el) return
    const update = () => {
      setCanLeft(el.scrollLeft > 4)
      setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', update); ro.disconnect() }
  }, [items.length])

  const scrollRail = (dir: -1 | 1) => {
    const el = railRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.78, behavior: 'smooth' })
  }

  const sectionClass = `content-rail${plain ? ' content-rail--plain' : ''}`

  if (!items.length) return null

  if (variant === 'trend') {
    return (
      <section className={`${sectionClass} trend-section`}>
        <div className="rail-heading trend-heading">
          <h2>{title}</h2>
        </div>
        <div className="trend-list">
          {items.map((item, index) => (
            <button
              key={`${title}-${item.id}`}
              type="button"
              className={`trend-row rank-tone-${Math.min(index + 1, 4)}`}
              onClick={() => onPlay(item)}
            >
              <span className="trend-rank">{index + 1}</span>
              <img src={item.posterUrl} alt="" loading="lazy" />
              <span className="trend-copy">
                <strong>{item.title}</strong>
                <span>
                  <Star /> {item.rating} - {item.badge ?? item.category}
                </span>
                <small>{item.category}</small>
              </span>
              <span className="trend-play" aria-hidden="true">
                <Play />
              </span>
            </button>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className={sectionClass}>
      <div className="rail-heading">
        <h2>{title}</h2>
        <div className="rail-scroll-btns">
          <button
            type="button"
            className="rail-scroll-btn"
            onClick={() => scrollRail(-1)}
            disabled={!canLeft}
            aria-label="Geri kaydır"
            data-spatial-ignore="true"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="rail-scroll-btn"
            onClick={() => scrollRail(1)}
            disabled={!canRight}
            aria-label="İleri kaydır"
            data-spatial-ignore="true"
          >
            <ChevronRight />
          </button>
        </div>
      </div>
      <div ref={railRef} className={`rail-list ${variant}`}>
        {items.map((item, index) => (
          <ContentCard
            key={`${title}-${item.id}`}
            item={item}
            rank={variant === 'ranked' ? index + 1 : undefined}
            variant={variant}
            onPlay={onPlay}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </section>
  )
}

function ContentCard({
  item,
  variant,
  rank,
  autoFocus,
  onPlay,
  onToggleFavorite,
}: {
  item: ContentItem
  variant: HomeSection['variant']
  rank?: number
  autoFocus?: boolean
  onPlay: (item: ContentItem) => void
  onToggleFavorite: (item: ContentItem) => void
}) {
  const flag = item.isLive ? getCountryFlag(item.country ?? item.category) : null
  const cardImage = variant === 'wide' || variant === 'channel' ? item.backdropUrl : item.posterUrl

  return (
    <article
      className={`content-card ${variant}`}
      role="button"
      tabIndex={0}
      data-autofocus={autoFocus ? 'true' : undefined}
      onClick={() => onPlay(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.code === 'Space') {
          event.preventDefault()
          onPlay(item)
        }
      }}
    >
      {rank ? <span className="rank">{rank}</span> : null}
      <button type="button" tabIndex={-1} className="poster-button" onClick={() => onPlay(item)} aria-label={`${item.title} izle`}>
        {item.isLive ? (
          <img
            className="country-flag-backdrop"
            src={flag?.backdropUrl ?? cardImage}
            alt=""
            loading="lazy"
            onLoad={(e) => e.currentTarget.classList.add('img-loaded')}
          />
        ) : (
          <img src={cardImage} alt="" loading="lazy" onLoad={(e) => e.currentTarget.classList.add('img-loaded')} />
        )}
        {item.isLive && flag ? (
          <span className="flag-badge" aria-label={flag.label}>
            {flag.imageUrl ? <img src={flag.imageUrl} alt="" loading="lazy" /> : null}
            <span>{flag.emoji}</span>
          </span>
        ) : null}
        {!item.isLive && item.badge ? <span className="badge">{item.badge}</span> : null}
        {item.progress ? (
          <div className="progress-line">
            <span style={{ width: `${item.progress}%` }} />
          </div>
        ) : null}
      </button>
      <div className="card-meta">
        <h3>{item.title}</h3>
        <p>
          {item.isLive ? (
            <>
              <Tv /> {item.country ?? item.category}
            </>
          ) : (
            <>
              <Star /> {item.rating}
            </>
          )}
        </p>
        {item.isLive && item.liveCategory ? <span>{item.liveCategory}</span> : null}
        {item.episodeCount && item.episodeCount > 1 ? <span>{item.episodeCount} bölüm</span> : null}
      </div>
      <button
        className={`favorite-button ${item.isFavorite ? 'active' : ''}`}
        type="button"
        tabIndex={-1}
        data-spatial-ignore="true"
        onClick={(event) => {
          event.stopPropagation()
          onToggleFavorite(item)
        }}
        aria-label="Favori durumunu değiştir"
      >
        <Heart />
      </button>
    </article>
  )
}

function AccountScreen({
  user,
  onLogout,
  onPasswordChange,
  onAvatarChange,
}: {
  user: AtlasUser | null
  onLogout: () => void
  onPasswordChange: (password: string) => Promise<void>
  onAvatarChange: (emoji: string, color: string) => Promise<void>
}) {
  const [passwordStatus, setPasswordStatus] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState(user?.avatar?.emoji ?? '🎬')
  const [avatarColor, setAvatarColor] = useState(user?.avatar?.color ?? '#e50914')
  const createdAt = user?.createdAt
    ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(user.createdAt))
    : 'Demo hesap'

  const AVATAR_EMOJIS = ['🎬', '🎭', '🍿', '🎮', '🎵', '⚡', '🌟', '🔥']
  const AVATAR_COLORS = ['#e50914', '#00e5ff', '#ff2f92', '#f5a623', '#7ed321', '#9b59b6', '#1abc9c', '#e67e22']

  const submitPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    if (password.length < 4) {
      setPasswordStatus('Şifre en az 4 karakter olmalı.')
      return
    }
    await onPasswordChange(password)
    event.currentTarget.reset()
    setPasswordStatus('Şifre güncellendi.')
  }

  return (
    <section className="utility-page">
      <div className="page-heading">
        <div>
          <p>Kullanıcı Merkezi</p>
          <h1>Hesabım</h1>
        </div>
      </div>
      <div className="utility-grid">
        <article>
          <User />
          <h2>{user?.name ?? 'Atlas Kullanıcısı'}</h2>
          <p>{user?.email ?? 'Oturum bilgisi yok'}</p>
          <div className="account-facts">
            <span>Kayıt: {createdAt}</span>
          </div>
        </article>
        <article className="account-form-card">
          <KeyRound />
          <h2>Şifre Güncelle</h2>
          <form onSubmit={submitPassword}>
            <input name="password" type="password" minLength={4} placeholder="Yeni şifre" required />
            <button className="watch-button" type="submit">Güncelle</button>
          </form>
          {passwordStatus ? <p className="inline-status">{passwordStatus}</p> : null}
        </article>
        <article>
          <LogOut />
          <h2>Oturum</h2>
          <p>Bu cihazdaki aktif oturumu kapatır ve giriş ekranına döner.</p>
          <button className="utility-action danger" type="button" onClick={onLogout}>
            <LogOut /> Hesaptan Çıkış Yap
          </button>
        </article>
        <article>
          <div className="avatar-display" style={{ background: avatarColor }}>
            {avatarEmoji}
          </div>
          <h2>Avatar</h2>
          <div className="avatar-emoji-row">
            {AVATAR_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                className={`avatar-emoji-btn${avatarEmoji === em ? ' active' : ''}`}
                onClick={() => setAvatarEmoji(em)}
              >
                {em}
              </button>
            ))}
          </div>
          <div className="avatar-color-row">
            {AVATAR_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                className={`avatar-color-btn${avatarColor === col ? ' active' : ''}`}
                style={{ background: col }}
                onClick={() => setAvatarColor(col)}
                aria-label={col}
              />
            ))}
          </div>
          <button
            className="watch-button"
            type="button"
            style={{ marginTop: '8px', fontSize: '14px', minHeight: '44px' }}
            onClick={async () => {
              await onAvatarChange(avatarEmoji, avatarColor)
            }}
          >
            Kaydet
          </button>
        </article>
      </div>
    </section>
  )
}

function DetailPanel({
  item,
  onClose,
  onPlay,
  onToggleFavorite,
  onToggleList,
}: {
  item: ContentItem
  onClose: () => void
  onPlay: (item: ContentItem) => void
  onToggleFavorite: (item: ContentItem) => void
  onToggleList: (item: ContentItem) => void
}) {
  const episodes = item.episodes?.length ? item.episodes : [item]
  const panelRef = useRef<HTMLElement | null>(null)
  const [metadata, setMetadata] = useState<ContentMetadata | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(false)
  const [similarItems, setSimilarItems] = useState<ContentItem[]>([])

  useEffect(() => {
    if (panelRef.current) focusFirstElement(panelRef.current)
  }, [item.id])

  useEffect(() => {
    let active = true
    if (item.isLive) return () => {
      active = false
    }
    window.setTimeout(() => {
      if (active) setMetadataLoading(true)
    }, 0)
    api.content.getMetadata(item).then((nextMetadata) => {
      if (!active) return
      setMetadata(nextMetadata)
      setMetadataLoading(false)
    })
    return () => {
      active = false
    }
  }, [item])

  useEffect(() => {
    let active = true
    if (item.isLive) return () => { active = false }
    api.content.getCategoryPage(
      item.type === 'series' ? 'series' : 'movies',
      0, 12, '', { vodCategory: item.genre ?? item.category }
    ).then((page) => {
      if (!active) return
      setSimilarItems(page.items.filter((i) => i.id !== item.id).slice(0, 12))
    }).catch(() => undefined)
    return () => { active = false }
  }, [item])

  const detailOverview = metadata?.overview || item.description
  const detailPoster = metadata?.backdropUrl || metadata?.posterUrl || item.backdropUrl || item.posterUrl
  const trailerEmbedUrl = metadata?.trailerUrl?.includes('watch?v=')
    ? metadata.trailerUrl.replace('watch?v=', 'embed/')
    : ''
  const playEpisode = (episode: ContentItem) => onPlay({ ...episode, episodes })

  return (
    <aside
      ref={panelRef}
      className="detail-panel"
      role="region"
      aria-label={`${item.title} detay`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Backspace') {
          event.preventDefault()
          onClose()
        }
      }}
    >
      <button className="detail-close" type="button" onClick={onClose} aria-label="Detayı kapat">
        <X />
      </button>
      <div className="detail-art" style={{ backgroundImage: `url(${detailPoster})` }} />
      <div className="detail-body">
        <p className="eyebrow">{item.category}</p>
        <h2>{metadata?.title ?? item.displayTitle ?? item.title}</h2>
        {metadata?.tagline ? <p className="detail-tagline">{metadata.tagline}</p> : null}
        <div className="detail-facts">
          <span>{item.episodeCount ?? episodes.length} bolum</span>
          <span>{item.seasonCount ?? 1} sezon</span>
          <span>★ {metadata?.tmdbRating ?? item.rating}</span>
          {metadata?.releaseYear ? <span>{metadata.releaseYear}</span> : null}
          {metadata?.runtime ? <span>{metadata.runtime} dk</span> : null}
          {metadata?.imdbId ? <span>IMDb {metadata.imdbId}</span> : null}
        </div>
        <section className="detail-section">
          <h3>Özet</h3>
          <p>{metadataLoading ? 'TMDB bilgileri yükleniyor...' : detailOverview}</p>
        </section>
        {metadata ? (
          <div className="metadata-grid">
            {metadata.genres.length ? (
              <article>
                <strong>Tür</strong>
                <span>{metadata.genres.join(' • ')}</span>
              </article>
            ) : null}
            {metadata.providers.length ? (
              <article>
                <strong>Platform</strong>
                <span>{metadata.providers.join(' • ')}</span>
              </article>
            ) : null}
            {metadata.cast.length ? (
              <article>
                <strong>Oyuncular</strong>
                <span>{metadata.cast.slice(0, 8).map((actor) => actor.name).join(' • ')}</span>
              </article>
            ) : null}
            {metadata.crew.length ? (
              <article>
                <strong>Ekip</strong>
                <span>{metadata.crew.map((person) => person.name + ' (' + person.job + ')').join(' • ')}</span>
              </article>
            ) : null}
          </div>
        ) : null}
        {trailerEmbedUrl ? (
          <section className="detail-section">
            <h3>Fragman</h3>
            <iframe
              className="trailer-frame"
              src={trailerEmbedUrl}
              title={`${metadata?.title ?? item.title} fragman`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </section>
        ) : null}
        {metadata?.cast.length ? (
          <section className="detail-section">
            <h3>Oyuncu Kadrosu</h3>
            <div className="cast-strip">
              {metadata.cast.slice(0, 10).map((actor) => (
                <article key={`${actor.name}-${actor.character}`}>
                  {actor.profileUrl ? <img src={actor.profileUrl} alt="" /> : <span>{actor.name.slice(0, 1)}</span>}
                  <strong>{actor.name}</strong>
                  {actor.character ? <small>{actor.character}</small> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
        <div className="detail-actions">
          <button data-autofocus="true" className="watch-button" type="button" onClick={() => playEpisode(episodes[0])}>
            <Play /> İzle
          </button>
          {metadata?.trailerUrl ? (
            <a className="detail-action-link" href={metadata.trailerUrl} target="_blank" rel="noreferrer">
              <Play /> Fragman
            </a>
          ) : null}
          <button type="button" onClick={() => onToggleList(item)}>
            <ListVideo /> {item.isInList ? 'Listemden Çıkar' : 'Listeme Ekle'}
          </button>
          {item.isInList && !item.isLive ? (
            <a className="detail-action-link" href={getDownloadUrl(item)} download>
              <Download /> {item.streamUrl.includes('.m3u8') ? 'M3U8 İndir' : 'MP4 İndir'}
            </a>
          ) : null}
          <button type="button" onClick={() => {
            if (api.user.isDownloaded(item.id)) {
              void api.user.removeDownload(item.id)
            } else {
              void api.user.addDownload(item)
            }
          }}>
            <Download /> {api.user.isDownloaded(item.id) ? 'Kütüphaneden Çıkar' : 'Kütüphaneye Ekle'}
          </button>
          <button type="button" onClick={() => onToggleFavorite(item)}>
            <Heart /> {item.isFavorite ? 'Favoriden Çıkar' : 'Favoriye Ekle'}
          </button>
        </div>
        <div className="episode-list">
          <h3>Bölümler</h3>
          {episodes.map((episode, index) => (
            <button key={episode.id} type="button" onClick={() => playEpisode(episode)}>
              <span>{episode.episodeNumber ? `Bölüm ${episode.episodeNumber}` : `${index + 1}`}</span>
              <strong>{episode.title}</strong>
              <Play />
            </button>
          ))}
        </div>
        {similarItems.length > 0 ? (
          <div className="detail-similar">
            <h3>Benzer İçerikler</h3>
            <div className="rail-list poster">
              {similarItems.map((simItem) => (
                <ContentCard
                  key={simItem.id}
                  item={simItem}
                  variant="poster"
                  onPlay={onPlay}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function SettingsScreen({
  appearance,
  settings,
  onAppearanceChange,
  onResetAppearance,
  onCloseApp,
}: {
  appearance: AppearanceSettings
  settings: AdminSettings | null
  onAppearanceChange: (settings: AppearanceSettings) => void
  onResetAppearance: () => void
  onCloseApp: () => void
}) {
  const telegramUrl = settings?.telegramUrl || 'https://t.me/'
  const supportUrl = settings?.supportUrl || ''
  const version = settings?.appVersion || APP_VERSION
  const updateAppearance = (partial: Partial<AppearanceSettings>) => {
    onAppearanceChange({ ...appearance, ...partial })
  }

  const shareApp = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: 'AtlasTv', url }).catch(() => undefined)
      return
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined)
  }

  return (
    <section className="utility-page settings-page">
      <div className="page-heading">
        <div>
          <p>Kontrol Merkezi</p>
          <h1>Ayarlar</h1>
        </div>
      </div>
      <div className="settings-layout">
        <section className="settings-panel">
          <div className="settings-title">
            <Palette />
            <div>
              <h2>Görünüm</h2>
              <p>Renkleri, kart boyutunu ve parlaklık hissini bu cihaz için ayarla.</p>
            </div>
          </div>
          <div className="appearance-controls">
            <label>
              <span>Ana renk</span>
              <input
                type="color"
                value={appearance.accent}
                onChange={(event) => updateAppearance({ accent: event.target.value })}
              />
            </label>
            <label>
              <span>İkinci renk</span>
              <input
                type="color"
                value={appearance.accent2}
                onChange={(event) => updateAppearance({ accent2: event.target.value })}
              />
            </label>
            <label>
              <span>Kart boyutu %{Math.round(appearance.cardScale * 100)}</span>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                value={appearance.cardScale}
                onChange={(event) => updateAppearance({ cardScale: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>Kart köşesi</span>
              <input
                type="range"
                min="8"
                max="26"
                step="1"
                value={appearance.cardRadius}
                onChange={(event) => updateAppearance({ cardRadius: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>Parlama</span>
              <input
                type="range"
                min="0.4"
                max="1.8"
                step="0.1"
                value={appearance.cardGlow}
                onChange={(event) => updateAppearance({ cardGlow: Number(event.target.value) })}
              />
            </label>
          </div>
          <button className="utility-action" type="button" onClick={onResetAppearance}>
            <RotateCcw /> Varsayılana Dön
          </button>
        </section>

        <section className="settings-panel">
          <div className="settings-title">
            <SlidersHorizontal />
            <div>
              <h2>Uygulama</h2>
              <p>Paylaşım, topluluk ve sürüm bilgileri.</p>
            </div>
          </div>
          <div className="settings-actions">
            <button type="button" onClick={() => window.open(telegramUrl, '_blank', 'noopener,noreferrer')}>
              <Sparkles /> Telegram’a Katıl
            </button>
            {supportUrl ? (
              <button type="button" onClick={() => window.open(supportUrl, '_blank', 'noopener,noreferrer')}>
                <BadgeInfo /> Destek
              </button>
            ) : null}
            <button type="button" onClick={shareApp}>
              <Share2 /> Paylaş
            </button>
            <button type="button">
              <Info /> Güncel Sürüm: {version}
            </button>
            <button type="button" onClick={onCloseApp}>
              <Power /> Uygulamayı Kapat
            </button>
          </div>
        </section>
      </div>
    </section>
  )
}

function AdminGate({ onClose, onUnlock }: { onClose: () => void; onUnlock: (password: string) => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsChecking(true)
    const isValid = await api.admin.verifyPassword(password)
    setIsChecking(false)
    if (isValid) {
      setError('')
      onUnlock(password)
      return
    }
    setError('Şifre hatalı.')
  }

  return (
    <section className="admin-overlay" role="dialog" aria-modal="true" aria-label="Admin girişi">
      <form className="admin-card admin-gate" onSubmit={submit}>
        <button className="detail-close" type="button" onClick={onClose} aria-label="Admin girişini kapat">
          <X />
        </button>
        <KeyRound />
        <h2>Admin Girişi</h2>
        <p>Yönetim paneli kullanıcı menülerinde görünmez.</p>
        <input
          data-autofocus="true"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          inputMode="numeric"
          placeholder="Şifre"
          autoFocus
        />
        <button className="watch-button" type="submit" disabled={isChecking}>
          {isChecking ? 'Kontrol ediliyor...' : 'Panele Gir'}
        </button>
        {error ? <span className="admin-error">{error}</span> : null}
      </form>
    </section>
  )
}

function AdminPanel({
  adminPassword,
  onClose,
  onSaved,
}: {
  adminPassword: string
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [settings, setSettings] = useState<AdminSettings>({
    vodM3uUrl: '',
    liveM3uUrl: '',
    sportsM3uUrl: '',
    telegramUrl: '',
    supportUrl: '',
    appVersion: '',
    announcement: '',
    homeNotification: '',
    homeNotificationId: 0,
    liveM3uContent: '',
    sportsM3uContent: '',
  })
  const [activeTab, setActiveTab] = useState<'genel' | 'kategoriler' | 'bildirim' | 'listeler' | 'araclar' | 'istatistik'>('genel')
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [userStats, setUserStats] = useState<UserStats>({ totalUsers: 0, activeUsers: 0, rememberedUsers: 0 })
  const [cacheStatus, setCacheStatus] = useState<CacheBotStatus>({
    isRunning: false,
    lastRunAt: '',
    startedAt: '',
    currentStep: '',
    lastMessage: '',
    memory: {},
    diskBuckets: [],
  })
  // Category management state
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [newSectionGenre, setNewSectionGenre] = useState('')
  const [newSectionCustomGenre, setNewSectionCustomGenre] = useState('')
  const [localUsers, setLocalUsers] = useState<Array<AtlasUser & { password?: string }>>([])
  const [newSectionVariant, setNewSectionVariant] = useState<SectionVariant>('poster')

  const sectionsConfig = settings.homeSectionsConfig?.length
    ? settings.homeSectionsConfig
    : DEFAULT_HOME_SECTIONS_CONFIG

  useEffect(() => {
    api.admin.getSettings().then(setSettings)
    api.admin.getUserStats().then(setUserStats)
    api.admin.getCacheStatus().then(setCacheStatus).catch(() => undefined)
    try {
      const raw = window.localStorage.getItem('atlastv.users')
      setLocalUsers(raw ? (JSON.parse(raw) as Array<AtlasUser & { password?: string }>) : [])
    } catch {}
  }, [])

  useEffect(() => {
    if (!cacheStatus.isRunning) return
    const timer = window.setInterval(() => {
      api.admin.getCacheStatus().then((nextStatus) => {
        setCacheStatus(nextStatus)
        setStatus(nextStatus.lastMessage || 'Katalog botu çalışıyor.')
      }).catch(() => undefined)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [cacheStatus.isRunning])

  const update = (key: keyof AdminSettings, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const updateSectionsConfig = (config: HomeSectionConfig[]) => {
    setSettings((current) => ({ ...current, homeSectionsConfig: config }))
  }

  const toggleSectionEnabled = (id: string) => {
    updateSectionsConfig(sectionsConfig.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }

  const moveSection = (id: string, dir: -1 | 1) => {
    const arr = [...sectionsConfig]
    const idx = arr.findIndex((s) => s.id === id)
    if (idx < 0) return
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= arr.length) return
    ;[arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]]
    updateSectionsConfig(arr)
  }

  const deleteSection = (id: string) => {
    updateSectionsConfig(sectionsConfig.filter((s) => s.id !== id))
  }

  const addSection = () => {
    const resolvedGenre = newSectionGenre === '__custom' ? newSectionCustomGenre.trim() : newSectionGenre.trim()
    if (!newSectionTitle.trim() || !resolvedGenre) {
      setStatus('Kategori adı ve tür gereklidir.')
      return
    }
    const id = `custom-${Date.now()}`
    const newSection: HomeSectionConfig = {
      id,
      title: newSectionTitle.trim(),
      type: 'genre',
      genre: resolvedGenre,
      variant: newSectionVariant,
      enabled: true,
    }
    updateSectionsConfig([...sectionsConfig, newSection])
    setNewSectionTitle('')
    setNewSectionGenre('')
    setNewSectionCustomGenre('')
    setNewSectionVariant('poster')
    setStatus('Yeni kategori eklendi. Kaydetmeyi unutma.')
  }

  const deleteUser = (id: string) => {
    try {
      const raw = window.localStorage.getItem('atlastv.users')
      if (!raw) return
      const users = JSON.parse(raw) as Array<AtlasUser & { password?: string }>
      const updated = users.filter((u) => u.id !== id)
      window.localStorage.setItem('atlastv.users', JSON.stringify(updated))
      setLocalUsers(updated)
      setStatus(`Kullanıcı silindi.`)
    } catch {}
  }

  const uploadM3uFile = async (key: 'liveM3uContent' | 'sportsM3uContent', file?: File) => {
    if (!file) return
    const text = await file.text()
    setSettings((current) => ({ ...current, [key]: text }))
    setStatus(`${file.name} yüklendi. Kaydetmeyi unutma.`)
  }

  const fillLiveGithubSource = () => {
    setSettings((current) => ({ ...current, liveM3uUrl: LIVE_GITHUB_M3U_URL }))
    setStatus('GitHub canlı TV M3U linki eklendi. Kaydetmeyi unutma.')
  }

  const clearLocalCache = () => {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('atlastv.'))
      .forEach((key) => window.localStorage.removeItem(key))
    setStatus('Bu cihazdaki AtlasTV önbelleği temizlendi.')
  }

  const clearWatchHistory = () => {
    const usersRaw = window.localStorage.getItem('atlastv.users')
    if (!usersRaw) {
      setStatus('Bu cihazda temizlenecek izleme geçmişi yok.')
      return
    }
    try {
      const users = JSON.parse(usersRaw) as Array<AtlasUser>
      window.localStorage.setItem('atlastv.users', JSON.stringify(users.map((user) => ({ ...user, history: {} }))))
      setStatus('Bu cihazdaki izleme geçmişi temizlendi.')
    } catch {
      setStatus('İzleme geçmişi temizlenemedi.')
    }
  }

  const runCatalogBot = async () => {
    setStatus('Katalog botu başlatıldı. Büyük listelerde birkaç dakika sürebilir.')
    const nextStatus = await api.admin.runCatalogBot(adminPassword)
    setCacheStatus(nextStatus)
    setStatus(nextStatus.lastMessage || 'Katalog botu başlatıldı.')
  }

  const clearServerCache = async () => {
    setStatus('Sunucu katalog önbelleği temizleniyor.')
    const nextStatus = await api.admin.clearServerCache(adminPassword)
    setCacheStatus(nextStatus)
    setStatus('Sunucu katalog önbelleği temizlendi.')
  }

  const refreshCacheStatus = async () => {
    const nextStatus = await api.admin.getCacheStatus()
    setCacheStatus(nextStatus)
    setStatus(nextStatus.lastMessage || 'Katalog botu durumu güncellendi.')
  }

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `atlastv-admin-settings-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setStatus('Admin ayarları dışa aktarıldı.')
  }

  const importSettings = async (file?: File) => {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as Partial<AdminSettings>
      setSettings((current) => ({ ...current, ...parsed }))
      setStatus('Ayar dosyası içe aktarıldı. Herkese uygulamak için kaydet.')
    } catch {
      setStatus('Ayar dosyası okunamadı.')
    }
  }

  const copyLiveGithubSource = () => {
    navigator.clipboard?.writeText(LIVE_GITHUB_M3U_URL).then(
      () => setStatus('Canlı M3U linki kopyalandı.'),
      () => setStatus(LIVE_GITHUB_M3U_URL),
    )
  }

  const sendNotification = async () => {
    if (!settings.homeNotification.trim()) {
      setStatus('Bildirim metni boş olamaz.')
      return
    }
    const nextId = (settings.homeNotificationId || 0) + 1
    const updated: AdminSettings = { ...settings, homeNotificationId: nextId }
    setIsSaving(true)
    const saved = await api.admin.saveSettings(updated, adminPassword)
    setSettings(saved)
    await onSaved()
    setStatus(`Bildirim #${nextId} gönderildi.`)
    setIsSaving(false)
  }

  const clearNotification = async () => {
    const updated: AdminSettings = { ...settings, homeNotification: '', homeNotificationId: 0 }
    setIsSaving(true)
    const saved = await api.admin.saveSettings(updated, adminPassword)
    setSettings(saved)
    await onSaved()
    setStatus('Bildirim temizlendi.')
    setIsSaving(false)
  }

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    const toSave = { ...settings, homeSectionsConfig: sectionsConfig }
    const saved = await api.admin.saveSettings(toSave, adminPassword)
    setSettings(saved)
    await onSaved()
    setStatus('Ayarlar kaydedildi.')
    setIsSaving(false)
  }

  const reset = async () => {
    setIsSaving(true)
    const defaults = await api.admin.resetSettings(adminPassword)
    setSettings(defaults)
    await onSaved()
    setStatus('Varsayılan ayarlara dönüldü.')
    setIsSaving(false)
  }

  const adminTabs = [
    { id: 'genel' as const, label: 'Genel' },
    { id: 'kategoriler' as const, label: 'Kategoriler' },
    { id: 'bildirim' as const, label: 'Bildirim' },
    { id: 'listeler' as const, label: 'Listeler' },
    { id: 'araclar' as const, label: 'Araçlar' },
    { id: 'istatistik' as const, label: 'İstatistik' },
  ]

  const variantOptions: Array<{ value: SectionVariant; label: string }> = [
    { value: 'poster', label: 'Poster' },
    { value: 'wide', label: 'Geniş' },
    { value: 'ranked', label: 'Sıralı' },
    { value: 'trend', label: 'Trend' },
    { value: 'circle', label: 'Yuvarlak' },
    { value: 'channel', label: 'Kanal' },
  ]

  const knownGenres = ['Komedi', 'Macera', 'Aksiyon', 'Korku', 'Yerli', 'Romantik', 'Savaş', 'Animasyon', 'Belgesel', 'Çocuk', 'Bilim Kurgu', 'Suç', 'Dram', 'Gerilim']

  return (
    <section className="admin-page" aria-label="Admin paneli">
      <div className="admin-card admin-panel admin-page-card">
        <button className="detail-close" type="button" onClick={onClose} aria-label="Admin panelini kapat">
          <X />
        </button>

        {/* Header */}
        <div className="admin-title">
          <Settings />
          <div>
            <p>Gizli Yönetim</p>
            <h2>Atlas Panel</h2>
          </div>
          <div className="admin-stats-row">
            <span className="admin-stat"><strong>{userStats.activeUsers}</strong>Aktif</span>
            <span className="admin-stat"><strong>{userStats.totalUsers}</strong>Üye</span>
            <span className="admin-stat"><strong>{userStats.rememberedUsers}</strong>Hatırlanan</span>
            <span className={`admin-stat ${cacheStatus.isRunning ? 'admin-stat--running' : ''}`}>
              <strong>{cacheStatus.isRunning ? 'Çalışıyor' : 'Hazır'}</strong>Bot
            </span>
          </div>
        </div>

        {/* Tab nav */}
        <nav className="admin-tabs">
          {adminTabs.map((tab, tabIndex) => (
            <button
              key={tab.id}
              type="button"
              data-autofocus={tabIndex === 0 ? 'true' : undefined}
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === 'bildirim' && settings.homeNotificationId > 0 && settings.homeNotification && (
                <span className="admin-tab-badge">{settings.homeNotificationId}-</span>
              )}
            </button>
          ))}
        </nav>

        {status ? <div className="admin-status-bar">{status}</div> : null}

        <form onSubmit={save} className="admin-tab-content">
          {/* ── GENEL ── */}
          {activeTab === 'genel' && (
            <div className="admin-tab-pane">
              <div className="admin-section-title">
                <strong>Giriş ve uygulama bağlantıları</strong>
                <span>Giriş ekranı ve ayarlar sayfasında herkese görünür.</span>
              </div>
              <label>
                <span>Telegram Linki</span>
                <input value={settings.telegramUrl} onChange={(e) => update('telegramUrl', e.target.value)} placeholder="https://t.me/kanaliniz" />
              </label>
              <label>
                <span>Destek / İletişim Linki</span>
                <input value={settings.supportUrl} onChange={(e) => update('supportUrl', e.target.value)} placeholder="https://t.me/destek" />
              </label>
              <label>
                <span>Güncel Sürüm Bilgisi</span>
                <input value={settings.appVersion} onChange={(e) => update('appVersion', e.target.value)} placeholder="1.0.0" />
              </label>
              <label>
                <span>Giriş Ekranı Duyurusu</span>
                <textarea value={settings.announcement} onChange={(e) => update('announcement', e.target.value)} placeholder="Giriş ekranında görünecek kısa duyuru" />
              </label>
              <div className="admin-actions">
                <button className="watch-button" type="submit" disabled={isSaving}>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</button>
                <button type="button" onClick={reset} disabled={isSaving}>Varsayılana Dön</button>
              </div>
            </div>
          )}

          {/* ── KATEGORİLER ── */}
          {activeTab === 'kategoriler' && (
            <div className="admin-tab-pane">
              <div className="admin-section-title">
                <strong>Anasayfa Kategorileri</strong>
                <span>Kategorileri sırala, aç/kapat veya yeni ekle.</span>
              </div>
              <div className="admin-section-list">
                {sectionsConfig.map((section, idx) => (
                  <div key={section.id} className={`admin-section-item${section.enabled ? '' : ' admin-section-item--disabled'}`}>
                    <div className="admin-section-item-info">
                      <span className="admin-section-item-title">{section.title}</span>
                      <span className="admin-section-item-meta">{section.type === 'builtin' ? 'Sistem' : section.genre} · {section.variant}</span>
                    </div>
                    <div className="admin-section-item-actions">
                      <button type="button" onClick={() => moveSection(section.id, -1)} disabled={idx === 0} aria-label="Yukarı taşı">↑</button>
                      <button type="button" onClick={() => moveSection(section.id, 1)} disabled={idx === sectionsConfig.length - 1} aria-label="Aşağı taşı">↓</button>
                      <button
                        type="button"
                        className={`admin-toggle-btn${section.enabled ? ' active' : ''}`}
                        onClick={() => toggleSectionEnabled(section.id)}
                      >
                        {section.enabled ? 'Açık' : 'Kapalı'}
                      </button>
                      {section.type === 'genre' && (
                        <button type="button" className="admin-delete-btn" onClick={() => deleteSection(section.id)} aria-label="Sil">×</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="admin-section-title" style={{ marginTop: '12px' }}>
                <strong>Yeni Kategori Ekle</strong>
                <span>Katalogdaki türe göre filtrelenmiş yeni bir bölüm ekle.</span>
              </div>
              <div className="admin-add-section-form">
                <input
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Bölüm başlığı (örn. Romantik Filmler)"
                />
                <select
                  value={newSectionGenre}
                  onChange={(e) => {
                    setNewSectionGenre(e.target.value)
                    if (e.target.value !== '__custom') setNewSectionCustomGenre('')
                  }}
                >
                  <option value="">Tür seç...</option>
                  {knownGenres.map((g) => <option key={g} value={g}>{g}</option>)}
                  <option value="__custom">Özel tür gir...</option>
                </select>
                {newSectionGenre === '__custom' && (
                  <input
                    value={newSectionCustomGenre}
                    onChange={(e) => setNewSectionCustomGenre(e.target.value)}
                    placeholder="Özel tür adı"
                  />
                )}
                <select value={newSectionVariant} onChange={(e) => setNewSectionVariant(e.target.value as SectionVariant)}>
                  {variantOptions.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
                <button type="button" className="watch-button" onClick={addSection}>Ekle</button>
              </div>
              <div className="admin-actions" style={{ marginTop: '14px' }}>
                <button className="watch-button" type="submit" disabled={isSaving}>{isSaving ? 'Kaydediliyor...' : 'Kategorileri Kaydet'}</button>
                <button type="button" onClick={() => { updateSectionsConfig(DEFAULT_HOME_SECTIONS_CONFIG); setStatus('Varsayılan kategorilere sıfırlandı.') }}>Varsayılana Sıfırla</button>
              </div>
            </div>
          )}

          {/* ── BİLDİRİM ── */}
          {activeTab === 'bildirim' && (
            <div className="admin-tab-pane">
              <div className="admin-section-title">
                <strong>Anasayfa Bildirimi</strong>
                <span>Kullanıcılar anasayfada arama çubuğunun yanında zil ikonunu görür. Yeni bildirim gönderince rozet kırmızı olur ve numarayla görünür.</span>
              </div>
              {settings.homeNotificationId > 0 && (
                <div className="admin-notif-status">
                  <span>Aktif bildirim: <strong>#{settings.homeNotificationId}</strong></span>
                  {settings.homeNotification ? <em>{settings.homeNotification}</em> : <em>Boş</em>}
                </div>
              )}
              <label>
                <span>Bildirim Metni</span>
                <textarea
                  value={settings.homeNotification}
                  onChange={(e) => update('homeNotification', e.target.value)}
                  placeholder="Kullanıcılara gösterilecek bildirim metni"
                />
              </label>
              <div className="notif-preview-label" style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 950, textTransform: 'uppercase' }}>Önizleme:</div>
              <div className="notif-preview">
                <div className="notif-wrap">
                  <button className={`icon-button notif-btn${settings.homeNotification ? ' notif-btn--unread' : ''}`} type="button" tabIndex={-1}>
                    <Bell />
                    {settings.homeNotification && <span className="notif-badge">{(settings.homeNotificationId || 0) + 1}-</span>}
                  </button>
                </div>
                {settings.homeNotification && (
                  <div className="notif-popup notif-popup--static">
                    <p>{settings.homeNotification || 'Bildirim metni buraya gelecek...'}</p>
                  </div>
                )}
              </div>
              <div className="admin-actions">
                <button type="button" className="watch-button" onClick={sendNotification} disabled={isSaving}>
                  {isSaving ? 'Gönderiliyor...' : 'Bildirimi Gönder'}
                </button>
                {settings.homeNotificationId > 0 && (
                  <button type="button" onClick={clearNotification} disabled={isSaving}>Bildirimi Temizle</button>
                )}
              </div>
            </div>
          )}

          {/* ── LİSTELER ── */}
          {activeTab === 'listeler' && (
            <div className="admin-tab-pane">
              <div className="admin-section-title">
                <strong>Yayın listeleri</strong>
                <span>M3U linklerini veya dosyalarını buradan yönet.</span>
              </div>
              <label>
                <span>Dizi / Film M3U Linki</span>
                <input value={settings.vodM3uUrl} onChange={(e) => update('vodM3uUrl', e.target.value)} placeholder="https://.../vod.m3u" />
              </label>
              <label>
                <span>Canlı TV M3U Linki</span>
                <input value={settings.liveM3uUrl} onChange={(e) => update('liveM3uUrl', e.target.value)} placeholder="https://.../live.m3u" />
              </label>
              <label>
                <span>Canlı TV M3U Dosyası</span>
                <input type="file" accept=".m3u,.m3u8,text/plain" onChange={(e) => uploadM3uFile('liveM3uContent', e.target.files?.[0])} />
                {settings.liveM3uContent ? <small>Yüklü dosya hazır. Kaydedince herkeste aktif olur.</small> : null}
              </label>
              <label>
                <span>Spor Kanalları M3U Linki</span>
                <input value={settings.sportsM3uUrl} onChange={(e) => update('sportsM3uUrl', e.target.value)} placeholder="https://.../sports.m3u" />
              </label>
              <label>
                <span>Spor M3U Dosyası</span>
                <input type="file" accept=".m3u,.m3u8,text/plain" onChange={(e) => uploadM3uFile('sportsM3uContent', e.target.files?.[0])} />
                {settings.sportsM3uContent ? <small>Spor dosyası hazır.</small> : null}
              </label>
              <div className="admin-actions">
                <button className="watch-button" type="submit" disabled={isSaving}>{isSaving ? 'Güncelleniyor...' : 'Listeleri Güncelle'}</button>
                <button type="button" onClick={fillLiveGithubSource}>GitHub Canlı M3U Kullan</button>
                <button type="button" onClick={copyLiveGithubSource}>Canlı Linki Kopyala</button>
              </div>
            </div>
          )}

          {/* ── ARAÇLAR ── */}
          {activeTab === 'araclar' && (
            <div className="admin-tab-pane">
              <div className="admin-section-title">
                <strong>Sistem Araçları</strong>
                <span>Katalog bot, önbellek ve dışa/içe aktarma işlemleri.</span>
              </div>
              <div className="admin-tools-grid">
                <div className="admin-tool-card">
                  <strong>Katalog Botu</strong>
                  <span>{cacheStatus.isRunning ? `Çalışıyor — ${cacheStatus.currentStep}` : cacheStatus.lastMessage || 'Hazır'}</span>
                  <button type="button" onClick={runCatalogBot} disabled={cacheStatus.isRunning}>Botu Çalıştır</button>
                  <button type="button" onClick={refreshCacheStatus}>Durumu Yenile</button>
                </div>
                <div className="admin-tool-card">
                  <strong>Sunucu Önbelleği</strong>
                  <span>Cache {cacheStatus.diskBuckets.length || Object.values(cacheStatus.memory).reduce((s, v) => s + v, 0)} öğe</span>
                  <button type="button" onClick={clearServerCache}>Sunucu Cache Temizle</button>
                </div>
                <div className="admin-tool-card">
                  <strong>Bu Cihaz</strong>
                  <span>Yerel önbellek ve geçmiş</span>
                  <button type="button" onClick={clearLocalCache}>Önbelleği Temizle</button>
                  <button type="button" onClick={clearWatchHistory}>İzleme Geçmişini Sil</button>
                </div>
                <div className="admin-tool-card">
                  <strong>Ayarlar</strong>
                  <span>Dışa/içe aktar</span>
                  <button type="button" onClick={exportSettings}>Dışa Aktar</button>
                  <label className="admin-tool-file">
                    İçe Aktar
                    <input type="file" accept="application/json,.json" onChange={(e) => importSettings(e.target.files?.[0])} />
                  </label>
                </div>
                <div className="admin-tool-card">
                  <strong>Test</strong>
                  <span>Bağlantı testleri</span>
                  <button type="button" onClick={() => window.open('https://atlastv.onrender.com', '_blank', 'noopener,noreferrer')}>Siteyi Aç</button>
                  <button type="button" onClick={() => window.open(settings.telegramUrl || 'https://t.me/', '_blank', 'noopener,noreferrer')}>Telegramı Test Et</button>
                  {settings.supportUrl ? (
                    <button type="button" onClick={() => window.open(settings.supportUrl, '_blank', 'noopener,noreferrer')}>Desteği Test Et</button>
                  ) : null}
                </div>
              </div>
              <div className="admin-section-title" style={{ marginTop: '14px' }}>
                <strong>Kullanıcı Listesi</strong>
                <span>Bu cihazdaki kayıtlı kullanıcılar.</span>
              </div>
              <div className="admin-user-list">
                {localUsers.map((user) => (
                  <div key={user.id} className="admin-user-row">
                    <div>
                      <strong>{user.email}</strong>
                      <span>Kayıt: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : '-'}</span>
                      <span>İzleme: {Object.keys(user.history ?? {}).length} içerik</span>
                    </div>
                    <button type="button" onClick={() => deleteUser(user.id)}>Sil</button>
                  </div>
                ))}
                {localUsers.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '10px 0' }}>Kullanıcı bulunamadı.</p>
                )}
              </div>
            </div>
          )}

          {/* ── İSTATİSTİK ── */}
          {activeTab === 'istatistik' && (
            <div className="admin-tab-pane">
              <AdminStatsTab />
            </div>
          )}
        </form>
      </div>
    </section>
  )

  function AdminStatsTab() {
    const stats = getViewStats()
    const genreEntries = Object.entries(stats.genres).sort((a, b) => b[1] - a[1]).slice(0, 8)
    const maxVal = genreEntries[0]?.[1] ?? 1
    return (
      <>
        <div className="admin-section-title">
          <strong>İzleme İstatistikleri</strong>
          <span>Bu cihazdaki toplam görüntüleme verileri.</span>
        </div>
        <p className="admin-total-views">Toplam izleme: <strong>{stats.totalViews}</strong></p>
        <div className="admin-stats-chart">
          {genreEntries.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Henüz izleme verisi yok.</p>
          ) : (
            genreEntries.map(([genre, count]) => (
              <div key={genre} className="stat-bar">
                <span>{genre}</span>
                <div className="stat-bar-track">
                  <div className="stat-bar-fill" style={{ '--pct': `${Math.round((count / maxVal) * 100)}%` } as React.CSSProperties} />
                </div>
                <span className="stat-bar-count">{count}</span>
              </div>
            ))
          )}
        </div>
      </>
    )
  }
}

function PlayerOverlay({
  item,
  isPlaying,
  onPlayingChange,
  onClose,
  onSelectEpisode,
  onToggleFavorite,
  onProgressSaved,
}: {
  item: ContentItem
  isPlaying: boolean
  onPlayingChange: (playing: boolean) => void
  onClose: () => void
  onSelectEpisode: (item: ContentItem) => void
  onToggleFavorite: () => void
  onProgressSaved: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const controlsTimerRef = useRef<number | null>(null)
  const hlsRetryRef = useRef(0)
  const lastProgressSaveRef = useRef(0)
  const resumeAppliedRef = useRef(false)
  const proxiedStreamUrl = getProxiedStreamUrl(item)
  const isEmbeddedBetmatikPlayer = /betmatiktv\d+\.com\/channel\?id=/i.test(proxiedStreamUrl)
  const isEmbeddedIframePlayer = isEmbeddedBetmatikPlayer
    || /zbahistv\d+\.com\/channel(?:\.html)?\?id=/i.test(proxiedStreamUrl)
  const playerUserAgent = item.httpUserAgent || DEFAULT_PLAYER_USER_AGENT
  const playerHeaders = isEmbeddedIframePlayer
    ? ['Kaynak: Betmatik gömülü oynatıcı']
    : [
      `UA: ${playerUserAgent}`,
      item.isLive && item.referer ? `Referer: ${item.referer}` : '',
      item.isLive && item.origin ? `Origin: ${item.origin}` : '',
    ].filter(Boolean)
  const [playerStatus, setPlayerStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [playerRetryKey, setPlayerRetryKey] = useState(0)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [hasVideoFrame, setHasVideoFrame] = useState(false)
  const playerEpisodes = item.episodes?.length ? item.episodes : []

  const revealControls = useCallback(() => {
    setControlsVisible(true)
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false)
    }, 2800)
  }, [])

  const seekBy = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds))
    revealControls()
  }, [revealControls])

  const seekToPercent = (value: string) => {
    const video = videoRef.current
    if (!video || !duration) return
    const nextTime = (Number(value) / 100) * duration
    video.currentTime = nextTime
    setCurrentTime(nextTime)
    revealControls()
  }

  const changeVolume = (value: string) => {
    const nextVolume = Number(value) / 100
    const video = videoRef.current
    setVolume(nextVolume)
    setIsMuted(nextVolume === 0)
    if (video) {
      video.volume = nextVolume
      video.muted = nextVolume === 0
    }
    revealControls()
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    const nextMuted = !video.muted
    video.muted = nextMuted
    setIsMuted(nextMuted)
    revealControls()
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined)
      window.screen.orientation?.unlock?.()
      return
    }
    stageRef.current?.requestFullscreen?.().then(() => {
      window.screen.orientation?.lock?.('landscape').catch(() => undefined)
    }).catch(() => undefined)
  }

  const applyResumeTime = (video: HTMLVideoElement) => {
    if (resumeAppliedRef.current || item.isLive || !item.progressSeconds || item.progressSeconds < 5) return
    const safeDuration = Number.isFinite(video.duration) ? video.duration : 0
    const resumeTime = safeDuration ? Math.min(item.progressSeconds, Math.max(0, safeDuration - 20)) : item.progressSeconds
    if (resumeTime > 0) {
      video.currentTime = resumeTime
      setCurrentTime(resumeTime)
      resumeAppliedRef.current = true
    }
  }

  const saveProgress = (video: HTMLVideoElement) => {
    if (item.isLive || !video.duration || video.currentTime < 3) return
    const now = Date.now()
    if (now - lastProgressSaveRef.current < 12000) return
    lastProgressSaveRef.current = now
    void api.user.markWatched(item.id, video.currentTime, video.duration).then(onProgressSaved)
  }

  useEffect(() => {
    if (!isEmbeddedIframePlayer) return
    setPlayerStatus('ready')
    setHasVideoFrame(true)
  }, [isEmbeddedIframePlayer, item.id])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = false
    video.volume = 1
    setIsMuted(false)
    setVolume(1)
    setPlayerStatus('loading')
    setCurrentTime(0)
    setDuration(0)
    setHasVideoFrame(false)
    hlsRetryRef.current = 0
    lastProgressSaveRef.current = 0
    resumeAppliedRef.current = false

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 90,
      })

      hls.loadSource(proxiedStreamUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setPlayerStatus('ready')
        video.play().catch(() => onPlayingChange(false))
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        // eslint-disable-next-line no-console
        console.error('[AtlasTV] HLS error:', data.type, data.details, data.fatal, data.url ?? '')
        if (!data.fatal) return

        if (hlsRetryRef.current < 3 && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hlsRetryRef.current += 1
          setPlayerStatus('loading')
          hls.startLoad()
          return
        }

        if (hlsRetryRef.current < 3 && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hlsRetryRef.current += 1
          setPlayerStatus('loading')
          hls.recoverMediaError()
          return
        }

        setPlayerStatus('error')
      })

      return () => {
        if (!item.isLive && video.currentTime > 3) {
          void api.user.markWatched(item.id, video.currentTime, video.duration || 0)
          onProgressSaved()
        }
        hls.destroy()
      }
    }

    video.src = proxiedStreamUrl
    video.play().catch(() => onPlayingChange(false))
    return () => {
      if (!item.isLive && video.currentTime > 3) {
        void api.user.markWatched(item.id, video.currentTime, video.duration || 0)
        onProgressSaved()
      }
    }
  }, [item.id, item.isLive, onPlayingChange, onProgressSaved, proxiedStreamUrl, playerRetryKey])

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches
    const stage = stageRef.current
    if (!stage) return undefined

    const enterImmersive = () => {
      stage.requestFullscreen?.().then(() => {
        if (isMobile) window.screen.orientation?.lock?.('landscape').catch(() => undefined)
      }).catch(() => undefined)
    }

    enterImmersive()
    return () => {
      window.screen.orientation?.unlock?.()
    }
  }, [])

  useEffect(() => {
    const onPlayerKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
      const focusIsOnStage = !active || active === document.body || active === stageRef.current
      const focusIsPlayerControl = Boolean(active?.closest('.player-controls, .player-topbar, .player-center'))

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        revealControls()
      }
      if (event.key === 'ArrowLeft') {
        if (focusIsPlayerControl && !focusIsOnStage) return
        event.preventDefault()
        seekBy(-10)
      }
      if (event.key === 'ArrowRight') {
        if (focusIsPlayerControl && !focusIsOnStage) return
        event.preventDefault()
        seekBy(10)
      }
    }

    window.addEventListener('keydown', onPlayerKeyDown)
    return () => {
      window.removeEventListener('keydown', onPlayerKeyDown)
      if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current)
    }
  }, [revealControls, seekBy])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.play().catch(() => {
        onPlayingChange(false)
      })
      return
    }

    video.pause()
  }, [isPlaying, onPlayingChange])

  return (
    <section className="player-overlay" role="dialog" aria-modal="true" aria-label={`${item.title} player`}>
      <div
        ref={stageRef}
        data-autofocus="true"
        tabIndex={0}
        className={`player-stage ${controlsVisible ? 'controls-visible' : 'controls-hidden'} ${hasVideoFrame ? 'video-visible' : ''}`}
        style={{ backgroundImage: hasVideoFrame ? undefined : `url(${item.backdropUrl})` }}
        onMouseMove={revealControls}
        onPointerMove={revealControls}
      >
        {isEmbeddedIframePlayer ? (
          <iframe
            className="player-video"
            src={proxiedStreamUrl}
            title={`${item.title} yayın`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        ) : (
          <video
            ref={videoRef}
            className="player-video"
            poster={hasVideoFrame ? undefined : item.backdropUrl}
            playsInline
            controls={false}
            onCanPlay={() => {
              setPlayerStatus('ready')
              setHasVideoFrame(true)
              applyResumeTime(videoRef.current!)
            }}
            onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
            onError={() => setPlayerStatus('error')}
            onLoadedData={() => setHasVideoFrame(true)}
            onLoadedMetadata={(event) => applyResumeTime(event.currentTarget)}
            onPlaying={() => setHasVideoFrame(true)}
            onTimeUpdate={(event) => {
              setCurrentTime(event.currentTarget.currentTime)
              saveProgress(event.currentTarget)
            }}
            onVolumeChange={(event) => {
              setVolume(event.currentTarget.volume)
              setIsMuted(event.currentTarget.muted)
            }}
            data-source-url={item.streamUrl}
            data-proxy-url={proxiedStreamUrl}
            data-http-user-agent={playerUserAgent}
            data-referer={item.isLive ? item.referer : undefined}
            data-origin={item.isLive ? item.origin : undefined}
          />
        )}

        <div className="player-topbar">
          <button className="player-round-button" type="button" onClick={onClose} aria-label="Player kapat">
            <X />
          </button>
          <div>
            <strong>AtlasTv</strong>
            <span>{item.isLive ? 'Canli Yayin' : item.category}</span>
          </div>
        </div>

        {!isEmbeddedIframePlayer ? <div className="player-center">
          {playerStatus === 'loading' ? <span className="player-state">Yayin hazirlaniyor...</span> : null}
          {playerStatus === 'error' ? (
            <span className="player-state error">
              Yayin acilamadi
              <button
                type="button"
                style={{ marginLeft: 12, padding: '4px 12px', fontSize: 13, cursor: 'pointer' }}
                onClick={() => {
                  hlsRetryRef.current = 0
                  setPlayerStatus('loading')
                  setPlayerRetryKey((k) => k + 1)
                }}
              >Tekrar Dene</button>
            </span>
          ) : null}
          <div className="center-controls">
            <button type="button" onClick={() => seekBy(-10)} aria-label="10 saniye geri">
              <RotateCcw />
              <span>10</span>
            </button>
            <button className="giant-play" type="button" onClick={() => onPlayingChange(!isPlaying)}>
              {isPlaying ? <Pause /> : <Play />}
            </button>
            <button type="button" onClick={() => seekBy(10)} aria-label="10 saniye ileri">
              <RotateCw />
              <span>10</span>
            </button>
          </div>
        </div> : null}

        {!isEmbeddedIframePlayer ? <div className="player-controls">
          <div className="player-progress-row">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={duration ? Math.min(100, (currentTime / duration) * 100) : 0}
              onChange={(event) => seekToPercent(event.target.value)}
              aria-label="Yayin konumu"
            />
            <span>{item.isLive ? 'CANLI' : formatTime(duration)}</span>
          </div>

          <div className="player-bottom-row">
            <div className="player-title-block">
              <p>{item.badge ?? (item.isLive ? 'CANLI' : 'VOD')}</p>
              <h2>{item.title}</h2>
              <span className="player-user-agent">Proxy Headers: {playerHeaders.join(' · ')}</span>
            </div>
            <div className="control-buttons">
              <button type="button" onClick={() => onPlayingChange(!isPlaying)} aria-label="Oynat veya duraklat">
                {isPlaying ? <Pause /> : <Play />}
              </button>
              <button type="button" onClick={toggleMute} aria-label="Sesi ac veya kapat">
                {isMuted ? <VolumeX /> : <Volume2 />}
              </button>
              <input
                className="volume-slider"
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : Math.round(volume * 100)}
                onChange={(event) => changeVolume(event.target.value)}
                aria-label="Ses seviyesi"
              />
              <button type="button" onClick={onToggleFavorite} aria-label="Favoriye ekle">
                <Heart />
              </button>
              <button type="button" onClick={toggleFullscreen} aria-label="Tam ekran">
                <Maximize />
              </button>
            </div>
          </div>
          {playerEpisodes.length > 1 ? (
            <div className="player-episodes">
              {playerEpisodes.map((episode, index) => (
                <button
                  key={episode.id}
                  type="button"
                  className={episode.id === item.id ? 'active' : ''}
                  onClick={() => onSelectEpisode({ ...episode, episodes: playerEpisodes })}
                >
                  <img src={episode.posterUrl || item.posterUrl} alt="" />
                  <span>{episode.episodeNumber ? `Bölüm ${episode.episodeNumber}` : `${index + 1}`}</span>
                  <strong>{episode.title}</strong>
                </button>
              ))}
            </div>
          ) : null}
        </div> : null}
      </div>
    </section>
  )
}

function MobileNav({ screen, onScreenChange }: { screen: Screen; onScreenChange: (screen: Screen) => void }) {
  return (
    <nav className="mobile-nav" aria-label="Mobil menü">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            className={screen === item.id ? 'active' : ''}
            onClick={() => onScreenChange(item.id)}
          >
            <Icon />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

// ── İndirme / Uygulama Sayfası ─────────────────────────────────────────────

const RELEASE_BASE = 'https://github.com/kaan190559-hue/atlastv/releases/latest/download'

const downloads = [
  {
    platform: 'Windows',
    emoji: '🖥️',
    title: 'AtlasTv Windows',
    subtitle: 'Windows 10 / 11 — 64-bit',
    desc: 'ZIP\'i aç, klasör içinden AtlasTv.exe\'yi çalıştır. Kurulum gerektirmez.',
    filename: 'AtlasTv-Windows.zip',
    badge: 'EXE',
    badgeColor: '#3b82f6',
  },
  {
    platform: 'Android Telefon',
    emoji: '📱',
    title: 'AtlasTv Android',
    subtitle: 'Telefon & Tablet',
    desc: 'APK\'yı indir, Ayarlar → Güvenlik → Bilinmeyen Kaynaklar\'ı aç ve kur.',
    filename: 'AtlasTv-Phone.apk',
    badge: 'APK',
    badgeColor: '#22c55e',
  },
  {
    platform: 'Android TV',
    emoji: '📺',
    title: 'AtlasTv TV',
    subtitle: 'Android TV / Smart TV',
    desc: 'TV\'ye ADB veya USB ile APK yükle. Tam ekran yatay TV arayüzü.',
    filename: 'AtlasTv-TV.apk',
    badge: 'APK',
    badgeColor: '#f59e0b',
  },
]

function GetAppScreen() {
  return (
    <div className="get-app-screen">
      <div className="get-app-hero">
        <div className="get-app-logo">📡</div>
        <h1 className="get-app-title">AtlasTv</h1>
        <p className="get-app-tagline">Her cihazda kesintisiz yayın deneyimi</p>
        <div className="get-app-badges">
          <span className="app-feature-badge">🔴 Canlı TV</span>
          <span className="app-feature-badge">🎬 VOD</span>
          <span className="app-feature-badge">⚽ Spor</span>
          <span className="app-feature-badge">📡 M3U</span>
        </div>
      </div>

      <div className="get-app-cards">
        {downloads.map((d) => (
          <div key={d.filename} className="get-app-card">
            <div className="get-app-card-header">
              <span className="get-app-platform-emoji">{d.emoji}</span>
              <div>
                <div className="get-app-card-title">{d.title}</div>
                <div className="get-app-card-subtitle">{d.subtitle}</div>
              </div>
              <span className="get-app-badge" style={{ background: d.badgeColor }}>{d.badge}</span>
            </div>
            <p className="get-app-card-desc">{d.desc}</p>
            <a
              className="get-app-dl-btn"
              href={`${RELEASE_BASE}/${d.filename}`}
              download
              target="_blank"
              rel="noreferrer"
            >
              <Download size={16} />
              İndir — {d.filename}
            </a>
          </div>
        ))}
      </div>

      <div className="get-app-m3u">
        <div className="get-app-m3u-title">📋 M3U Yayın Listesi</div>
        <p className="get-app-m3u-desc">VLC, Kodi veya herhangi bir IPTV oynatıcısında kullanabilirsin.</p>
        <div className="get-app-m3u-url">
          <code>https://atlastv.onrender.com/scraped.m3u</code>
          <button
            className="get-app-copy-btn"
            onClick={() => navigator.clipboard?.writeText('https://atlastv.onrender.com/scraped.m3u')}
          >
            Kopyala
          </button>
        </div>
      </div>

      <div className="get-app-footer">
        <p>AtlasTv açık kaynaklı bir projedir.</p>
        <a href="https://github.com/kaan190559-hue/atlastv" target="_blank" rel="noreferrer">
          GitHub&#x2192;
        </a>
      </div>
    </div>
  )
}

export default App


