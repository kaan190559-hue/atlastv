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
    console.log(`\n[${i + 1}/${sources.length}] ${source.name}`)

    // Domain çözümle
    let baseUrl = source.baseUrl ?? null
    if (source.domainPattern) {
      const result = await findWorkingDomain(source)
      if (!result) { console.warn(`  Atlandı — domain bulunamadı`); continue }
      if (result.n !== source.currentN) {
        sourcesUpdated[i] = { ...sourcesUpdated[i], currentN: result.n }
      }
      baseUrl = result.baseUrl
    }

    // ── TRGoals tipi: HTML'den direkt m3u8 URL
    if (source.type === 'trgoals') {
      const channels = await getTrgoalsChannels(baseUrl)
      console.log(`  Bulunan direkt kanal: ${channels.length}`)
      channels.forEach(ch => {
        const key = ch.url
        if (seenIds.has(key)) return
        seenIds.add(key)
        allLines.push(`#EXTINF:-1 tvg-id="${source.id}_${ch.name.toLowerCase().replace(/\s+/g,'-')}" tvg-name="${ch.name}" tvg-logo="" group-title="${source.group}",${ch.name}`)
        allLines.push(ch.url)
        totalValid++
      })
      console.log(`  ✓ Eklenen: ${channels.length}`)
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
            allLines.push(`#EXTINF:-1 tvg-id="${source.id}_${r.id}" tvg-name="${name}" tvg-logo="" group-title="${source.group}",${name}`)
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
          allLines.push(`#EXTINF:-1 tvg-id="${source.id}_${r.id}" tvg-name="${name}" tvg-logo="" group-title="${source.group}",${name}`)
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
