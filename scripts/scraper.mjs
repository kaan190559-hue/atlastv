/**
 * AtlasTV M3U Scraper v2
 * Puppeteer gerektirmez — teletv5.top API'sini kullanarak stream URL'leri çeker.
 * Her saat GitHub Actions tarafından çalıştırılır.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCES_PATH = resolve(__dirname, 'scraper-sources.json')
const OUTPUT_PATH = resolve(__dirname, '../public/scraped.m3u')

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'Referer': 'https://atomsportv501.top/',
  'Origin': 'https://atomsportv501.top',
}

// ── ZbahisTV: domain.php'den baseurl al, 7/24 kanal listesini HTML'den çek
const getZbahisChannels = async (baseUrl) => {
  // Sitenin HTML'inden 7/24 kanal listesini çek
  const html = await fetchText(baseUrl)
  if (!html) return []

  // 24-7-tab bölümünü izole et
  const tabStart = html.indexOf('id="24-7-tab"')
  const tabEnd = html.indexOf('<!-- 7/24', tabStart)
  const tabHtml = tabStart !== -1 ? html.slice(tabStart, tabEnd !== -1 ? tabEnd : tabStart + 8000) : html

  const channels = []
  const regex = /href="\/channel(?:\.html)?\?id=([\w]+)"[^>]*>[\s\S]*?<div class="channel-name">([^<]+)<\/div>/g
  let m
  while ((m = regex.exec(tabHtml)) !== null) {
    const id = m[1]
    const name = m[2].trim()
    // Player sayfası URL'si — autoplay ile aç
    channels.push({ id, name, url: `${baseUrl}/channel.html?id=${id}&autoplay=1` })
  }

  console.log(`  Bulunan 7/24 kanal: ${channels.length}`)
  return channels
}

// ── BossSports: _1/_2 token + data-watch ID → playlist.m3u8
const getBossSportsChannels = async (baseUrl) => {
  const html = await fetchText(baseUrl, {
    headers: { ...HEADERS, Referer: baseUrl + '/', Origin: baseUrl },
  })
  if (!html) return []

  // play iframe'den _1 (worker domain) ve _2 (token) çek
  const m = html.match(/_1=([\w.]+)&_2=(\w+)/)
  if (!m) return []
  const worker = m[1]
  const token = m[2]

  // data-watch ID + kanal adı (bottom-style div = kanal adı)
  const blocks = [...html.matchAll(/data-watch="(\d+)"[^>]*style="[^"]*bottom[^"]*"[^>]*>\s*([^<]{3,})\s*</g)]
  const seen = new Map()
  blocks.forEach(b => {
    const id = b[1], ch = b[2].trim()
    if (!seen.has(ch)) seen.set(ch, id)
  })

  const channels = []
  for (const [name, id] of seen) {
    const streamUrl = `https://${worker}/${token}/-/${id}/playlist.m3u8`
    channels.push({ name, url: streamUrl, referer: `${baseUrl}/play.html` })
  }
  return channels
}

const fetchText = async (url, extra = {}) => {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 12_000)
  try {
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal, ...extra })
    return await res.text()
  } catch {
    return ''
  } finally {
    clearTimeout(t)
  }
}

const fetchJson = async (url, extra = {}) => {
  try {
    const text = await fetchText(url, extra)
    return JSON.parse(text)
  } catch {
    return null
  }
}

// ── Kanal listesi URL'sinden ID'leri çek (channels.php formatı)
const getChannelIds = async (channelsUrl) => {
  const html = await fetchText(channelsUrl)
  if (!html) return []
  // href="matches?id=KANAL-ID" formatındaki tüm ID'leri al
  const matches = [...html.matchAll(/href="matches\?id=([^"]+)"/g)]
  return [...new Set(matches.map(m => m[1]))]
}

// ── TRGoals HTML'den kanal bilgilerini çek (data-source + data-target)
const getTrgoalsChannels = async (baseUrl) => {
  const html = await fetchText(baseUrl)
  if (!html) return []
  const channels = []

  // data-target="m3u8" ile direkt URL
  const directMatches = [...html.matchAll(/data-name="([^"]+)"[^>]*data-target="m3u8"[^>]*data-source="(https?:\/\/[^"]+\.m3u8[^"]*)"/g)]
  directMatches.forEach(m => channels.push({ name: m[1], url: m[2] }))

  // Ters sıra da dene (data-source önce)
  const directMatches2 = [...html.matchAll(/data-source="(https?:\/\/[^"]+\.m3u8[^"]*)"[^>]*data-name="([^"]+)"[^>]*data-target="m3u8"/g)]
  directMatches2.forEach(m => {
    if (!channels.find(c => c.url === m[1])) channels.push({ name: m[2], url: m[1] })
  })

  // channel-item içindeki tüm m3u8 ve name kombinasyonlarını yakala
  const itemRegex = /class="channel-item"[^>]*data-name="([^"]+)"[^>]*data-target="m3u8"[^>]*data-source="(https?:\/\/[^"]+\.m3u8[^"]*)"/g
  const itemMatches = [...html.matchAll(itemRegex)]
  itemMatches.forEach(m => {
    if (!channels.find(c => c.url === m[2])) channels.push({ name: m[1], url: m[2] })
  })

  return channels
}

// ── Selcukiptv HTML'den TV kanal ID'lerini çek (/izle/KANAL-ID formatı)
const getSelcukChannelIds = async (baseUrl) => {
  const html = await fetchText(baseUrl)
  if (!html) return []
  // class="item live" içindeki /izle/KANAL-ID linklerini al
  const matches = [...html.matchAll(/href="[^"]*\/izle\/([\w-]+)"[^>]*>.*?class="name tvcp"/gs)]
  if (matches.length) return [...new Set(matches.map(m => m[1]))]
  // Alternatif: daha basit pattern
  const simple = [...html.matchAll(/\/izle\/([\w-]+)"[^>]*title="[^"]*Canlı/g)]
  return [...new Set(simple.map(m => m[1]))]
}

// ── teletv5 API'sinden stream URL çek
const CHANNEL_LOGOS = {
  'bein sports 1': '/logos/bein-sports-1.svg',
  'bein sports 2': '/logos/bein-sports-2.svg',
  'bein sports 3': '/logos/bein-sports-3.svg',
  'bein sports 4': '/logos/bein-sports-4.svg',
  'bein sports 5': '/logos/bein-sports-5.svg',
  'bein sports max 1': '/logos/bein-sports-max-1.svg',
  'bein sports max 2': '/logos/bein-sports-max-2.svg',
  'bein sports haber': '/logos/bein-sports-1.svg',
  's sport': '/logos/s-sport.svg',
  's sport 2': '/logos/s-sport-2.svg',
  'trt spor': '/logos/trt-spor.svg',
  'trt 1': '/logos/trt-1.svg',
  'trt 2': '/logos/trt-2.svg',
  'trt yıldız': '/logos/trt-yildiz.svg',
  'a spor': '/logos/a-spor.svg',
  'ht spor': '/logos/ht-spor.svg',
  'tivibu spor': '/logos/s-sport.svg',
  'tivibu spor 1': '/logos/s-sport.svg',
  'tivibu spor 2': '/logos/s-sport.svg',
  'tivibu spor 3': '/logos/s-sport.svg',
  'tivibu spor 4': '/logos/s-sport.svg',
  'spor smart': '/logos/a-spor.svg',
  'spor smart 2': '/logos/a-spor.svg',
  'cbc sport': '/logos/ht-spor.svg',
  'idman tv': '/logos/ht-spor.svg',
  'İdman tv': '/logos/ht-spor.svg',
}

const getChannelLogo = (name) =>
  CHANNEL_LOGOS[name.toLowerCase()] || CHANNEL_LOGOS[name] || ''

const getStreamUrl = async (channelId, siteBase) => {
  // Yöntem 1: teletv5 API
  const data = await fetchJson(`https://teletv5.top/load/yayinlink.php?id=${encodeURIComponent(channelId)}`)
  if (data?.deismackanal?.includes('m3u8')) return data.deismackanal

  // Yöntem 2: Cinema API
  const cinema = await fetchJson('https://streamsport365.com/cinema', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ AppId: '5000', AppVer: '1', VpcVer: '1.0.12', Language: 'en', Token: '', VideoId: channelId }),
  })
  if (cinema?.URL?.includes('m3u8')) return cinema.URL

  // Yöntem 3: matches sayfasındaki HTML'den m3u8 çek
  if (siteBase) {
    const pageHtml = await fetchText(`${siteBase}/matches?id=${channelId}`)
    const urlMatch = pageHtml.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/)?.[1]
    if (urlMatch) return urlMatch
  }

  return null
}

// ── URL'nin isim okunabilir adını oluştur
const channelIdToName = (id) =>
  id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

// ── Domain sayısını arttırarak çalışan domain bul
const findWorkingDomain = async (source) => {
  let n = source.currentN
  for (let i = 0; i < 15; i++) {
    const domain = source.domainPattern.replace('{N}', n)
    const url = `${source.scheme}://${domain}/`
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 8_000)
      const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, headers: HEADERS, redirect: 'follow' })
      clearTimeout(t)
      if (res.status < 500) {
        console.log(`  ✓ ${source.id}: N=${n} çalışıyor`)
        return { n, baseUrl: url.replace(/\/$/, '') }
      }
    } catch {}
    console.log(`  ✗ ${source.id}: N=${n} erişilemiyor, arttırılıyor`)
    n++
  }
  return null
}

// ── Ana fonksiyon
const main = async () => {
  console.log('=== AtlasTV Scraper v2 Başladı ===\n')
  const sources = JSON.parse(readFileSync(SOURCES_PATH, 'utf8'))
  const sourcesUpdated = JSON.parse(JSON.stringify(sources))

  const allLines = ['#EXTM3U']
  // ID bazlı tekrar engelleme (farklı kaynaklardan gelen aynı kanallar)
  const seenIds = new Set()
  let totalValid = 0
  let totalFailed = 0

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]

    // Devre dışı kaynakları atla
    if (source.disabled) {
      console.log(`\n[${i + 1}/${sources.length}] ${source.name} — DEVRE DIŞI, atlandı`)
      continue
    }

    console.log(`\n[${i + 1}/${sources.length}] ${source.name}`)

    // Domain çözümle — zorunlu değil, channelsApiUrl/baseUrl varsa domain olmadan devam et
    let baseUrl = source.baseUrl ?? null
    if (source.domainPattern) {
      const result = await findWorkingDomain(source)
      if (!result) {
        if (source.channelsApiUrl) {
          console.warn(`  Domain bulunamadı ama channelsApiUrl var, devam ediliyor`)
        } else {
          console.warn(`  Atlandı — domain bulunamadı`)
          continue
        }
      } else {
        if (result.n !== source.currentN) {
          sourcesUpdated[i] = { ...sourcesUpdated[i], currentN: result.n }
        }
        baseUrl = result.baseUrl
      }
    }

    // ── ZbahisTV tipi: domain.php + HTML kanal listesi → channel.html iframe
    if (source.type === 'zbahis') {
      const channels = await getZbahisChannels(baseUrl)
      for (const ch of channels) {
        const key = ch.id
        if (seenIds.has(key)) continue
        seenIds.add(key)
        const nameKey = ch.name.toLowerCase().replace(/\s+/g, '-')
        seenIds.add(nameKey)
        allLines.push(`#EXTINF:-1 tvg-id="${source.id}_${key}" tvg-name="${ch.name}" tvg-logo="${getChannelLogo(ch.name)}" group-title="${source.group}",${ch.name}`)
        allLines.push(ch.url)
        totalValid++
        console.log(`  ✓ ${ch.name}`)
      }
      continue
    }

    // ── Static tipi: sabit URL listesi
    if (source.type === 'static') {
      for (const ch of source.channels) {
        const key = ch.name.toLowerCase().replace(/\s+/g, '-')
        if (seenIds.has(key)) continue
        // URL'yi test et
        try {
          const ctrl = new AbortController()
          const t = setTimeout(() => ctrl.abort(), 6_000)
          const res = await fetch(ch.url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' })
          clearTimeout(t)
          if (res.status >= 400) { console.log(`  ✗ ${ch.name}: ${res.status}`); continue }
        } catch { console.log(`  ✗ ${ch.name}: timeout`); continue }
        seenIds.add(key)
        allLines.push(`#EXTINF:-1 tvg-id="${source.id}_${key}" tvg-name="${ch.name}" tvg-logo="${getChannelLogo(ch.name)}" group-title="${source.group}",${ch.name}`)
        allLines.push(ch.url)
        totalValid++
        console.log(`  ✓ ${ch.name}`)
      }
      continue
    }

    // ── BossSports tipi: data-watch ID + worker token
    if (source.type === 'bosssports') {
      const channels = await getBossSportsChannels(baseUrl)
      console.log(`  Bulunan kanal: ${channels.length}`)
      for (const ch of channels) {
        const key = ch.name.toLowerCase().replace(/\s+/g, '-')
        if (seenIds.has(key)) continue
        seenIds.add(key)
        allLines.push(`#EXTINF:-1 tvg-id="${source.id}_${key}" tvg-name="${ch.name}" tvg-logo="${getChannelLogo(ch.name)}" group-title="${source.group}",${ch.name}`)
        if (ch.referer) allLines.push(`#EXTVLCOPT:http-referrer=${ch.referer}`)
        allLines.push(ch.url)
        totalValid++
        console.log(`  ✓ ${ch.name}`)
      }
      console.log(`  ✓ Eklenen: ${channels.length}`)
      continue
    }

    // ── TRGoals tipi: HTML'den direkt m3u8 URL
    if (source.type === 'trgoals') {
      const TRT_URL_OVERRIDES = {
        'TRT 1': 'https://tv-trt1.medya.trt.com.tr/master.m3u8',
        'TRT 2': 'https://tv-trt2.medya.trt.com.tr/master.m3u8',
        'TRT Spor': 'https://tv-trtspor1.medya.trt.com.tr/master.m3u8',
        'TRT Yıldız': 'https://tv-trtspor2.medya.trt.com.tr/master.m3u8',
      }
      const channels = await getTrgoalsChannels(baseUrl)
      console.log(`  Bulunan direkt kanal: ${channels.length}`)
      channels.forEach(ch => {
        const url = TRT_URL_OVERRIDES[ch.name] || ch.url
        const key = url
        if (seenIds.has(key)) return
        // İsim bazlı da kontrol et (atomsport ile duplicate engelle)
        const nameKey = ch.name.toLowerCase().replace(/\s+/g, '-')
        if (seenIds.has(nameKey)) return
        seenIds.add(key)
        seenIds.add(nameKey)
        allLines.push(`#EXTINF:-1 tvg-id="${source.id}_${ch.name.toLowerCase().replace(/\s+/g,'-')}" tvg-name="${ch.name}" tvg-logo="${getChannelLogo(ch.name)}" group-title="${source.group}",${ch.name}`)
        allLines.push(url)
        totalValid++
      })
      console.log(`  ✓ Eklenen: ${channels.length}`)
      continue
    }

    // ── teletv5 tipi: staticIds listesi → teletv5 API ile stream URL
    if (source.type === 'teletv5' || (source.staticIds && source.staticIds.length)) {
      const ids = source.staticIds || []
      console.log(`  Kanal ID sayısı: ${ids.length}`)
      const BATCH = 8
      for (let j = 0; j < ids.length; j += BATCH) {
        const batch = ids.slice(j, j + BATCH)
        const results = await Promise.all(
          batch.map(async ({ id, name }) => {
            const url = await getStreamUrl(id, null)
            return url ? { id, name, url } : null
          })
        )
        results.forEach(r => {
          if (r && !seenIds.has(r.id)) {
            seenIds.add(r.id)
            const nameKey = r.name.toLowerCase().replace(/\s+/g, '-')
            seenIds.add(nameKey)
            allLines.push(`#EXTINF:-1 tvg-id="${source.id}_${r.id}" tvg-name="${r.name}" tvg-logo="${getChannelLogo(r.name)}" group-title="${source.group}",${r.name}`)
            allLines.push(r.url)
            totalValid++
            console.log(`  ✓ ${r.name}`)
          } else if (!r) totalFailed++
        })
      }
      console.log(`  ✓ Geçerli stream: ${totalValid}`)
      continue
    }

    // ── Selcukiptv tipi: /izle/ formatı
    if (source.type === 'selcukiptv') {
      const channelIds = await getSelcukChannelIds(baseUrl)
      console.log(`  Bulunan kanal ID: ${channelIds.length}`)
      const BATCH = 8
      for (let j = 0; j < channelIds.length; j += BATCH) {
        const batch = channelIds.slice(j, j + BATCH)
        const results = await Promise.all(
          batch.map(async (id) => {
            const url = await getStreamUrl(id, null)
            return url ? { id, url } : null
          })
        )
        results.forEach(r => {
          if (r && !seenIds.has(r.id)) {
            seenIds.add(r.id)
            const name = channelIdToName(r.id)
            allLines.push(`#EXTINF:-1 tvg-id="${source.id}_${r.id}" tvg-name="${name}" tvg-logo="${getChannelLogo(name)}" group-title="${source.group}",${name}`)
            allLines.push(r.url)
            totalValid++
          } else if (!r) totalFailed++
        })
      }
      console.log(`  ✓ Geçerli stream eklendi`)
      continue
    }

    // ── Varsayılan: channels.php + teletv5 API (atomsport)
    const channelsUrl = source.channelsApiUrl ?? source.channelsUrl ?? `${baseUrl}/channels`
    console.log(`  Kanal listesi: ${channelsUrl}`)
    const channelIds = await getChannelIds(channelsUrl)
    console.log(`  Bulunan kanal: ${channelIds.length}`)

    if (!channelIds.length) { console.warn('  Kanal ID bulunamadı, atlandı'); continue }

    const BATCH = 8
    for (let j = 0; j < channelIds.length; j += BATCH) {
      const batch = channelIds.slice(j, j + BATCH)
      const results = await Promise.all(
        batch.map(async (id) => {
          const url = await getStreamUrl(id, baseUrl)
          return url ? { id, url } : null
        })
      )
      results.forEach(r => {
        if (r && !seenIds.has(r.id)) {
          seenIds.add(r.id)
          const name = channelIdToName(r.id)
          seenIds.add(name.toLowerCase().replace(/\s+/g, '-'))
          allLines.push(`#EXTINF:-1 tvg-id="${source.id}_${r.id}" tvg-name="${name}" tvg-logo="${getChannelLogo(name)}" group-title="${source.group}",${name}`)
          allLines.push(r.url)
          totalValid++
        } else if (!r) totalFailed++
      })
    }
    console.log(`  ✓ Geçerli stream: ${totalValid}`)
  }

  // Kaynaklar değiştiyse kaydet
  if (JSON.stringify(sourcesUpdated) !== JSON.stringify(sources)) {
    writeFileSync(SOURCES_PATH, JSON.stringify(sourcesUpdated, null, 2))
    console.log('\nSources güncellendi')
  }

  // M3U yaz
  const output = allLines.join('\n')
  const existing = existsSync(OUTPUT_PATH) ? readFileSync(OUTPUT_PATH, 'utf8') : ''
  const changed = output !== existing
  writeFileSync(OUTPUT_PATH, output)

  console.log(`\n=== Tamamlandı ===`)
  console.log(`Toplam geçerli: ${totalValid} | Başarısız: ${totalFailed}`)
  console.log(`Değişiklik var: ${changed}`)

  process.exit(changed || JSON.stringify(sourcesUpdated) !== JSON.stringify(sources) ? 0 : 2)
}

main().catch(err => {
  console.error('Hata:', err)
  process.exit(1)
})
