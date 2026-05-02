import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const publicDir = join(rootDir, 'public')
const outputDir = join(publicDir, 'catalog')

const DEFAULT_VOD_M3U_URL = 'https://file.garden/Z-hq5n4Shk27aY58/Wars-vod-iptv.m3u'
const DEFAULT_LIVE_M3U_URL =
  'https://raw.githubusercontent.com/kaan190559-hue/atlastv/master/public/vavoo_full_worker.m3u'
const DEFAULT_USER_AGENT = 'okhttp/4.12.0'
const VAVOO_REFERER = 'https://vavoo.to/'
const VAVOO_ORIGIN = 'https://vavoo.to'
const PLACEHOLDER_POSTER =
  'https://images.unsplash.com/photo-1518929458119-e5bf444c30f4?auto=format&fit=crop&w=500&q=80'
const PLACEHOLDER_BACKDROP =
  'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1600&q=80'

const vodM3uUrl = process.env.ATLAS_VOD_M3U_URL || process.env.VOD_M3U_URL || DEFAULT_VOD_M3U_URL
const liveM3uUrl = process.env.ATLAS_LIVE_M3U_URL || process.env.LIVE_M3U_URL || ''
const sportsM3uUrl = process.env.ATLAS_SPORTS_M3U_URL || process.env.SPORTS_M3U_URL || ''

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
  'Suc',
  'Gizem',
  'Belgesel',
  'Savas',
  'Tarih',
  'Western',
  'Yerli',
  'Cocuk',
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
]

async function main() {
  const startedAt = Date.now()
  await mkdir(outputDir, { recursive: true })

  console.log('Building VOD catalog cache...')
  const vodPlaylist = await fetchText(vodM3uUrl)
  const vodItems = parseVodPlaylist(vodPlaylist, vodM3uUrl)
  const vodGrouped = groupCatalogItems(vodItems)
  await writeJson('vod-grouped.json', vodGrouped)

  console.log('Building live catalog cache...')
  const livePlaylist = await readLivePlaylist()
  const liveItems = livePlaylist ? parseLivePlaylist(livePlaylist, DEFAULT_LIVE_M3U_URL, 'live') : []
  await writeJson('live.json', liveItems)

  let sportsItems = []
  if (sportsM3uUrl) {
    console.log('Building sports catalog cache...')
    const sportsPlaylist = await fetchText(sportsM3uUrl)
    sportsItems = parseLivePlaylist(sportsPlaylist, sportsM3uUrl, 'sports')
    await writeJson('sports.json', sportsItems)
  }

  await writeJson('manifest.json', {
    generatedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    sources: {
      vod: vodM3uUrl,
      live: liveM3uUrl || 'public/vavoo_full_worker.m3u',
      sports: sportsM3uUrl,
    },
    counts: {
      vodRaw: vodItems.length,
      vodGrouped: vodGrouped.length,
      live: liveItems.length,
      sports: sportsItems.length,
    },
  }, true)

  console.log(`Done. VOD raw=${vodItems.length}, grouped=${vodGrouped.length}, live=${liveItems.length}, sports=${sportsItems.length}`)
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AtlasTV-Catalog-Builder/1.0',
      Accept: '*/*',
    },
  })
  if (!response.ok) throw new Error(`Fetch failed ${response.status}: ${url}`)
  return response.text()
}

async function readLivePlaylist() {
  if (liveM3uUrl) return fetchText(liveM3uUrl)

  try {
    return await readFile(join(publicDir, 'vavoo_full_worker.m3u'), 'utf8')
  } catch {
    return fetchText(DEFAULT_LIVE_M3U_URL)
  }
}

async function writeJson(fileName, value, pretty = false) {
  const json = pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value)
  await writeFile(join(outputDir, fileName), `${json}\n`)
}

function parseM3uEntries(playlist) {
  const lines = playlist
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const entries = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.startsWith('#EXTINF')) continue

    let httpUserAgent = DEFAULT_USER_AGENT
    let referer = ''
    let origin = ''
    let streamUrl = ''

    for (let next = index + 1; next < lines.length; next += 1) {
      const nextLine = lines[next]
      if (nextLine.startsWith('#EXTVLCOPT:http-user-agent=')) {
        httpUserAgent = nextLine.replace('#EXTVLCOPT:http-user-agent=', '').trim()
        continue
      }
      if (nextLine.startsWith('#EXTVLCOPT:http-referrer=')) {
        referer = nextLine.replace('#EXTVLCOPT:http-referrer=', '').trim()
        continue
      }
      if (nextLine.startsWith('#EXTVLCOPT:http-origin=')) {
        origin = nextLine.replace('#EXTVLCOPT:http-origin=', '').trim()
        continue
      }
      if (!nextLine.startsWith('#')) {
        streamUrl = nextLine
        index = next
        break
      }
    }

    if (streamUrl) entries.push({ line, title: getTitleFromExtinf(line), streamUrl, httpUserAgent, referer, origin })
  }

  return entries
}

function parseVodPlaylist(playlist, sourceKey = 'vod') {
  return parseM3uEntries(playlist).map((entry, index) => {
    const category = getAttribute(entry.line, 'group-title') || 'Tum Filmler'
    const logoUrl = getAttribute(entry.line, 'tvg-logo')
    const type = inferType(category, entry.title)
    const displayTitle = getDisplayTitle(entry.title)
    const episodeInfo = getEpisodeInfo(entry.title)

    return {
      id: `vod-${slugify(sourceKey).slice(0, 24)}-${slugify(entry.title)}-${index}`,
      title: entry.title,
      displayTitle,
      groupId: `group-${slugify(displayTitle)}`,
      type,
      category,
      platform: inferPlatform(category, displayTitle),
      genre: inferGenre(category, displayTitle, type),
      streamUrl: entry.streamUrl,
      posterUrl: logoUrl || PLACEHOLDER_POSTER,
      backdropUrl: logoUrl || PLACEHOLDER_BACKDROP,
      rating: Number((6.8 + (index % 23) / 10).toFixed(1)),
      description: type === 'series' ? 'Bu dizi icerigi M3U VOD listesinden alindi.' : 'Bu film icerigi M3U VOD listesinden alindi.',
      isLive: false,
      isFavorite: false,
      httpUserAgent: entry.httpUserAgent,
      seasonNumber: episodeInfo.season,
      episodeNumber: episodeInfo.episode,
      badge: type === 'series' ? 'Dizi' : 'Film',
    }
  })
}

function parseLivePlaylist(playlist, sourceKey = 'live', library = 'live') {
  return parseM3uEntries(playlist).map((entry, index) => {
    const country = getAttribute(entry.line, 'group-title') || (library === 'sports' ? 'Spor' : 'Bilinmeyen')
    const title = getLiveDisplayTitle(entry.title)
    const liveCategory = library === 'sports' ? 'Spor' : inferLiveCategory(title)
    const logoUrl = getAttribute(entry.line, 'tvg-logo')
    const fallbackImage = logoUrl || getCountryFlag(country) || getChannelInitialImage(title, 'poster')

    return {
      id: `live-${slugify(sourceKey).slice(0, 24)}-${slugify(country)}-${slugify(entry.title)}-${index}`,
      title,
      displayTitle: title,
      type: 'live',
      category: country,
      country,
      liveCategory,
      streamUrl: entry.streamUrl,
      posterUrl: fallbackImage,
      backdropUrl: logoUrl || getCountryFlag(country) || getChannelInitialImage(title, 'backdrop'),
      rating: Number((7.2 + (index % 18) / 10).toFixed(1)),
      description: `${country} ulkesinden ${liveCategory} canli yayini.`,
      isLive: true,
      isFavorite: false,
      httpUserAgent: entry.httpUserAgent,
      referer: entry.referer || VAVOO_REFERER,
      origin: entry.origin || VAVOO_ORIGIN,
      badge: liveCategory,
    }
  })
}

function groupCatalogItems(items) {
  const groups = new Map()

  for (const item of items) {
    const key = item.groupId || item.id
    groups.set(key, [...(groups.get(key) || []), item])
  }

  return Array.from(groups.values()).map((episodes) => {
    const sorted = [...episodes].sort((a, b) => {
      const seasonDelta = (a.seasonNumber || 1) - (b.seasonNumber || 1)
      if (seasonDelta) return seasonDelta
      return (a.episodeNumber || 0) - (b.episodeNumber || 0)
    })
    const representative = sorted[0]
    const seasonCount = new Set(sorted.map((episode) => episode.seasonNumber || 1)).size
    const isEpisodeGroup = sorted.length > 1 && sorted.some((episode) => episode.episodeNumber)

    return {
      ...representative,
      title: representative.displayTitle || representative.title,
      type: isEpisodeGroup ? 'series' : representative.type,
      platform: representative.platform || inferPlatform(representative.category, representative.displayTitle || representative.title),
      genre: representative.genre || inferGenre(representative.category, representative.displayTitle || representative.title, representative.type),
      episodeCount: isEpisodeGroup ? sorted.length : 1,
      seasonCount,
      episodes: isEpisodeGroup ? sorted : [representative],
      badge: isEpisodeGroup ? `${sorted.length} Bolum` : representative.badge,
    }
  })
}

function getAttribute(line, name) {
  const match = line.match(new RegExp(`${name}="([^"]*)"`, 'i'))
  return match?.[1]?.trim() || ''
}

function getTitleFromExtinf(line) {
  const commaIndex = line.indexOf(',')
  return commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : 'Isimsiz Icerik'
}

function getDisplayTitle(title) {
  return title
    .replace(/\s+-\s+T(?:u|\u00fc)rk(?:c|\u00e7)e\s+(Dublaj|Altyaz(?:i|\u0131))/gi, '')
    .replace(/\s+-\s*m3u8/gi, '')
    .replace(/\s*[-|:]\s*\d+\.?\s*S(?:ezon|eason)?\s+\d+\.?\s*B(?:o|\u00f6)l(?:u|\u00fc)m\s*$/gi, '')
    .replace(/\s*[-|:]\s*S(?:ezon|eason)?\s*\d+\s*E(?:pisode|p)?\s*\d+\s*$/gi, '')
    .replace(/\s*[-|:]\s*S\d{1,2}\s*E\d{1,3}\s*$/gi, '')
    .replace(/\s*[-|:]\s*\d+x\d+\s*$/gi, '')
    .replace(/\s*[-|:]\s*(?:B(?:o|\u00f6)l(?:u|\u00fc)m|Bolum|Episode|Ep\.?)\s*\d+\s*$/gi, '')
    .replace(/\s*[-|:]\s*\d+\.?\s*(?:B(?:o|\u00f6)l(?:u|\u00fc)m|Bolum|Episode|Ep\.?)\s*$/gi, '')
    .replace(/\s*\((?:B(?:o|\u00f6)l(?:u|\u00fc)m|Bolum|Episode|Ep\.?)\s*\d+\)\s*$/gi, '')
    .replace(/\s+\d+\.?\s*S(?:ezon)?\s+\d+\.?\s*B(?:o|\u00f6)l(?:u|\u00fc)m\s*$/gi, '')
    .replace(/\s*[-|:]\s*\d+\.?\s*S(?:ezon|eason)?\s*(?:Dublaj|Altyaz(?:i|\u0131))?\s*$/gi, '')
    .replace(/\s*[-|:]\s*S(?:ezon|eason)?\s*\d+\s*(?:Dublaj|Altyaz(?:i|\u0131))?\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getEpisodeInfo(title) {
  const source = title
    .replace(/\s+-\s+T(?:u|\u00fc)rk(?:c|\u00e7)e\s+(Dublaj|Altyaz(?:i|\u0131))/gi, '')
    .replace(/\s+-\s*m3u8/gi, '')
  const seasonEpisode =
    source.match(/(\d+)\.?\s*S(?:ezon|eason)?\b.*?(?:B(?:o|\u00f6)l(?:u|\u00fc)m|Bolum|Episode|Ep\.?)\s*(\d+)/i) ||
    source.match(/(\d+)\.?\s*S(?:ezon)?\s+(\d+)\.?\s*B(?:o|\u00f6)l(?:u|\u00fc)m/i) ||
    source.match(/S(?:ezon|eason)?\s*(\d+)\s*E(?:pisode|p)?\s*(\d+)/i) ||
    source.match(/S(\d+)\s*E(\d+)/i) ||
    source.match(/(\d+)x(\d+)/i)
  const standaloneEpisode =
    source.match(/(?:^|[-|:])\s*(?:B(?:o|\u00f6)l(?:u|\u00fc)m|Bolum|Episode|Ep\.?)\s*(\d+)\s*$/i) ||
    source.match(/(?:^|[-|:])\s*(\d+)\.?\s*(?:B(?:o|\u00f6)l(?:u|\u00fc)m|Bolum|Episode|Ep\.?)\s*$/i)

  if (!seasonEpisode) {
    return { season: 1, episode: standaloneEpisode ? Number(standaloneEpisode[1]) || undefined : undefined }
  }
  return { season: Number(seasonEpisode[1]) || 1, episode: Number(seasonEpisode[2]) || undefined }
}

function getLiveDisplayTitle(title) {
  return title.replace(/\s+\.[a-z]$/i, '').replace(/\s+/g, ' ').trim()
}

function inferType(groupTitle, title) {
  const source = `${groupTitle} ${title}`.toLocaleLowerCase('tr-TR')
  if (/(\bdizi(?:leri)?\b|\bseries\b|sezon|season|s\d+\s*e\d+|\d+x\d+|(?:^|[-|:])\s*(?:bolum|b\u00f6l\u00fcm|episode|ep\.?)\s*\d+\s*$|(?:^|[-|:])\s*\d+\.?\s*(?:bolum|b\u00f6l\u00fcm|episode|ep\.?)\s*$)/i.test(source)) return 'series'
  return 'movie'
}

function inferLiveCategory(title) {
  const source = title.toLocaleLowerCase('tr-TR')
  if (/(spor|sport|bein|arena|euro ?sport|espn|fight|golf|racing|nba|nfl|ufc|dazn|match)/i.test(source)) return 'Spor'
  if (/(news|haber|cnn|bbc|sky news|al jazeera|euronews|ntv|a haber|fox news|bloomberg)/i.test(source)) return 'Haber'
  if (/(movie|movies|film|cinema|kino|action|thriller|comedy|horror|series|dizi|box office)/i.test(source)) return 'Film & Dizi'
  if (/(kids|cocuk|\u00e7ocuk|cartoon|disney|nick|boomerang|minika|baby|junior|toons)/i.test(source)) return 'Cocuk'
  if (/(music|muzik|m\u00fczik|mtv|radio|vh1|club|hit|hits)/i.test(source)) return 'Muzik'
  if (/(discovery|animal|history|nat geo|national geographic|docu|doku|science|planet|wild)/i.test(source)) return 'Belgesel'
  if (/(islam|quran|kuran|mekke|medine|religion|diyanet)/i.test(source)) return 'Dini'
  return 'Genel'
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
    ['PuhuTV', /puhu/],
    ['MUBI', /mubi/],
    ['YouTube', /youtube/],
  ]
  return platforms.find(([, pattern]) => pattern.test(source))?.[0] || stablePick(PRESET_PLATFORMS, title || category)
}

function inferGenre(category = '', title = '', type = 'movie') {
  const source = `${category} ${title}`.toLocaleLowerCase('tr-TR')
  const genreRules = [
    ['Aksiyon', /aksiyon|action|operasyon|mission|fast|furious|john wick|marvel|dc\b/],
    ['Macera', /macera|adventure|jungle|hazine|pirates|journey|quest/],
    ['Dram', /dram|drama|hayat|ask|a\u015fk|yasam|ya\u015fam|family/],
    ['Komedi', /komedi|comedy|guldur|g\u00fcld\u00fcr|laugh|funny|recep|kolpa/],
    ['Romantik', /romantik|romance|ask|a\u015fk|love|sevgili|wedding/],
    ['Korku', /korku|horror|dehset|deh\u015fet|cin|seytan|\u015feytan|scream|haunted/],
    ['Gerilim', /gerilim|thriller|suspense|kacis|ka\u00e7\u0131\u015f|trap|tehlike/],
    ['Bilim Kurgu', /bilim kurgu|sci-fi|scifi|space|uzay|robot|alien|matrix|future/],
    ['Fantastik', /fantastik|fantasy|magic|sihir|peri|orman|dragon|harry potter/],
    ['Animasyon', /animasyon|animation|anime|cartoon|pixar|disney/],
    ['Aile', /aile|family|cocuk|\u00e7ocuk|kids/],
    ['Suc', /suc|su\u00e7|crime|mafia|gangster|polisiye|dedektif/],
    ['Gizem', /gizem|mystery|secret|sir|s\u0131r|detective/],
    ['Belgesel', /belgesel|documentary|docu/],
    ['Savas', /savas|sava\u015f|war|battle|soldier/],
    ['Tarih', /tarih|history|historical|osmanli|osmanl\u0131/],
    ['Western', /western|cowboy/],
    ['Yerli', /yerli|turkish|turk|t\u00fcrk/],
  ]
  return genreRules.find(([, pattern]) => pattern.test(source))?.[0] || stablePick(PRESET_GENRES, `${type}-${title || category}`)
}

function getCountryFlag(country = '') {
  const key = normalizeSearchText(country)
  const code = COUNTRY_CODES[key]
  return code ? `https://flagcdn.com/w640/${code}.png` : ''
}

function getChannelInitialImage(title, variant) {
  const size = variant === 'poster' ? 512 : 900
  const name = encodeURIComponent(title.replace(/\b(HD|SD|FHD|RAW|\+)\b/gi, '').replace(/\s+/g, ' ').trim().slice(0, 32))
  return `https://ui-avatars.com/api/?name=${name}&size=${size}&bold=true&background=071225&color=00e5ff&format=svg`
}

function slugify(value = '') {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
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

const COUNTRY_CODES = {
  afghanistan: 'af',
  albania: 'al',
  algeria: 'dz',
  argentina: 'ar',
  armenia: 'am',
  australia: 'au',
  austria: 'at',
  azerbaijan: 'az',
  belgium: 'be',
  bosnia: 'ba',
  brazil: 'br',
  bulgaria: 'bg',
  canada: 'ca',
  chile: 'cl',
  china: 'cn',
  colombia: 'co',
  croatia: 'hr',
  cyprus: 'cy',
  czechia: 'cz',
  denmark: 'dk',
  egypt: 'eg',
  finland: 'fi',
  france: 'fr',
  georgia: 'ge',
  germany: 'de',
  greece: 'gr',
  hungary: 'hu',
  india: 'in',
  indonesia: 'id',
  iran: 'ir',
  iraq: 'iq',
  ireland: 'ie',
  israel: 'il',
  italy: 'it',
  japan: 'jp',
  kazakhstan: 'kz',
  kosovo: 'xk',
  latvia: 'lv',
  lithuania: 'lt',
  mexico: 'mx',
  moldova: 'md',
  netherlands: 'nl',
  norway: 'no',
  pakistan: 'pk',
  poland: 'pl',
  portugal: 'pt',
  romania: 'ro',
  russia: 'ru',
  serbia: 'rs',
  slovakia: 'sk',
  slovenia: 'si',
  spain: 'es',
  sweden: 'se',
  switzerland: 'ch',
  turkey: 'tr',
  turkiye: 'tr',
  ukraine: 'ua',
  unitedkingdom: 'gb',
  unitedstates: 'us',
  usa: 'us',
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
