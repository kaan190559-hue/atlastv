/**
 * AtlasTV M3U Scraper
 * Her 1 saatte bir GitHub Actions tarafından çalıştırılır.
 * Hedef sitelerden canlı stream URL'lerini çeker, doğrular ve public/scraped.m3u dosyasına yazar.
 */

import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

puppeteer.use(StealthPlugin())

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOURCES_PATH = resolve(__dirname, 'scraper-sources.json')
const OUTPUT_PATH = resolve(__dirname, '../public/scraped.m3u')
const MAX_INCREMENT_TRIES = 15
const PAGE_TIMEOUT = 30_000
const STREAM_VALIDATE_TIMEOUT = 8_000
const STREAM_CAPTURE_WAIT = 12_000

// ── Yardımcı: Geçerli stream URL mi?
const isStreamUrl = (u) => {
  try {
    const url = new URL(u)
    const path = url.pathname.toLowerCase()
    return path.endsWith('.m3u8') || path.endsWith('.ts') || path.endsWith('.m3u')
  } catch {
    return false
  }
}
const buildUrl = (source, n) => {
  const domain = source.domainPattern.replace('{N}', n)
  return `${source.scheme}://${domain}${source.sectionPath}`
}

// ── Yardımcı: URL'nin erişilebilir olup olmadığını HTTP HEAD ile kontrol et
const isReachable = async (url) => {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8_000)
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
    })
    clearTimeout(timer)
    return res.status < 500
  } catch {
    return false
  }
}

// ── Yardımcı: Stream URL'nin canlı olup olmadığını kontrol et
const validateStream = async (url) => {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), STREAM_VALIDATE_TIMEOUT)
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Range: 'bytes=0-16383',
      },
    })
    clearTimeout(timer)
    const ct = res.headers.get('content-type') ?? ''
    // m3u8, mpegts, octet-stream → geçerli
    return (
      res.status === 200 ||
      res.status === 206 ||
      ct.includes('mpegurl') ||
      ct.includes('octet-stream') ||
      ct.includes('video') ||
      ct.includes('application/x-mpegURL')
    )
  } catch {
    return false
  }
}

// ── Sayfadan m3u8 URL'lerini topla (network intercept + DOM + inline script)
const collectStreamsFromPage = async (browser, url, source) => {
  const page = await browser.newPage()
  const captured = new Set()

  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const u = req.url()
    if (isStreamUrl(u)) captured.add(u)
    // Gereksiz kaynakları engelle (hız için)
    const rt = req.resourceType()
    if (['image', 'font', 'stylesheet', 'media'].includes(rt)) {
      req.abort()
    } else {
      req.continue()
    }
  })

  page.on('response', async (res) => {
    const u = res.url()
    if (isStreamUrl(u)) {
      captured.add(u)
      // Yanıt içindeyse parse et
      try {
        const text = await res.text().catch(() => '')
        const matches = text.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/g) ?? []
        matches.filter(isStreamUrl).forEach((m) => captured.add(m))
      } catch {}
    }
  })

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT })

    // Sayfa yüklendi, section keyword ile ilgili linke tıkla
    if (source.sectionKeyword) {
      try {
        await page.evaluate((kw) => {
          const els = [...document.querySelectorAll('a, button, li, span, div')]
          const target = els.find(
            (el) =>
              el.textContent?.toLowerCase().includes(kw.toLowerCase()) &&
              (el.tagName === 'A' || el.closest('nav') || el.closest('menu')),
          )
          if (target) target.click()
        }, source.sectionKeyword)
        await page.waitForTimeout(2000)
      } catch {}
    }

    // İçerik yüklensin bekle
    await new Promise((r) => setTimeout(r, STREAM_CAPTURE_WAIT))

    // Inline script ve sayfa kaynağından m3u8 çek
    const pageContent = await page.content().catch(() => '')
    const srcMatches = pageContent.match(/https?:\/\/[^"'<>\s]+\.m3u8[^"'<>\s]*/g) ?? []
    srcMatches.filter(isStreamUrl).forEach((m) => captured.add(m))

    // Script tag içindeki değişkenler
    const scriptUrls = await page.evaluate(() => {
      const results = []
      document.querySelectorAll('script').forEach((s) => {
        const matches = (s.textContent ?? '').match(
          /https?:\/\/[^"'<>\s]+\.m3u8[^"'<>\s]*/g,
        )
        if (matches) results.push(...matches)
      })
      return results
    }).catch(() => [])
    scriptUrls.filter(isStreamUrl).forEach((m) => captured.add(m))

    // iframe src içinden de bak
    const iframeSrcs = await page.evaluate(() =>
      [...document.querySelectorAll('iframe')].map((f) => f.src).filter(Boolean),
    ).catch(() => [])

    for (const src of iframeSrcs.slice(0, 5)) {
      try {
        const iframePage = await browser.newPage()
        await iframePage.setRequestInterception(true)
        iframePage.on('request', (req) => {
          const u = req.url()
          if (u.includes('.m3u8')) captured.add(u)
          req.continue().catch(() => {})
        })
        await iframePage.goto(src, { waitUntil: 'domcontentloaded', timeout: 15_000 })
        await new Promise((r) => setTimeout(r, 5000))
        const ic = await iframePage.content().catch(() => '')
        const im = ic.match(/https?:\/\/[^"'<>\s]+\.m3u8[^"'<>\s]*/g) ?? []
        im.filter(isStreamUrl).forEach((m) => captured.add(m))
        await iframePage.close()
      } catch {}
    }
  } catch (err) {
    console.warn(`  [${source.id}] Sayfa yükleme hatası: ${err.message}`)
  } finally {
    await page.close().catch(() => {})
  }

  return [...captured]
}

// ── Çalışan domain numarasını bul
const resolveWorkingN = async (source) => {
  let n = source.currentN
  for (let attempt = 0; attempt < MAX_INCREMENT_TRIES; attempt++) {
    const url = buildUrl(source, n)
    console.log(`  [${source.id}] Deneniyor: ${url}`)
    if (await isReachable(url)) {
      console.log(`  [${source.id}] ✓ Erişilebilir: N=${n}`)
      return n
    }
    console.log(`  [${source.id}] ✗ Erişilemiyor N=${n}, arttırılıyor...`)
    n++
  }
  console.warn(`  [${source.id}] ${MAX_INCREMENT_TRIES} deneme sonunda erişilemedi`)
  return null
}

// ── M3U formatında içerik oluştur
const toM3uLine = (url, index, source) =>
  `#EXTINF:-1 tvg-id="${source.id}_${index}" tvg-name="${source.name} ${index}" tvg-logo="" group-title="${source.group}",${source.name} ${index}\n${url}`

// ── Ana fonksiyon
const main = async () => {
  console.log('=== AtlasTV Scraper Başladı ===')
  const sources = JSON.parse(readFileSync(SOURCES_PATH, 'utf8'))
  const sourcesUpdated = [...sources]

  let browser
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
    })
  } catch (err) {
    console.error('Puppeteer başlatılamadı:', err.message)
    process.exit(1)
  }

  const allLines = ['#EXTM3U']
  let totalValid = 0
  let totalInvalid = 0

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]
    console.log(`\n[${i + 1}/${sources.length}] ${source.name} işleniyor...`)

    const workingN = await resolveWorkingN(source)
    if (workingN === null) {
      console.warn(`  [${source.id}] Atlandı`)
      continue
    }

    // Değişen N'yi güncelle
    if (workingN !== source.currentN) {
      sourcesUpdated[i] = { ...source, currentN: workingN }
      console.log(`  [${source.id}] N güncellendi: ${source.currentN} → ${workingN}`)
    }

    const pageUrl = buildUrl(source, workingN)
    console.log(`  [${source.id}] Scraping: ${pageUrl}`)
    const rawUrls = await collectStreamsFromPage(browser, pageUrl, source)
    console.log(`  [${source.id}] Bulunan ham URL: ${rawUrls.length}`)

    // Paralel validasyon (max 8 eş zamanlı)
    const CONCURRENCY = 8
    const valid = []
    for (let j = 0; j < rawUrls.length; j += CONCURRENCY) {
      const batch = rawUrls.slice(j, j + CONCURRENCY)
      const results = await Promise.all(
        batch.map(async (url) => {
          const ok = await validateStream(url)
          return ok ? url : null
        }),
      )
      results.forEach((u) => {
        if (u) valid.push(u)
        else totalInvalid++
      })
    }

    console.log(`  [${source.id}] ✓ Geçerli: ${valid.length} / ${rawUrls.length}`)
    totalValid += valid.length

    // Tekrar URL'leri kaldır, M3U satırları oluştur
    const unique = [...new Set(valid)]
    unique.forEach((url, idx) => {
      allLines.push(toM3uLine(url, idx + 1, source))
    })
  }

  await browser.close()

  // Kaynaklar güncellendiyse dosyaya yaz
  const sourcesChanged = JSON.stringify(sourcesUpdated) !== JSON.stringify(sources)
  if (sourcesChanged) {
    writeFileSync(SOURCES_PATH, JSON.stringify(sourcesUpdated, null, 2))
    console.log('\nSources güncellendi (domain N değişti)')
  }

  // M3U dosyasını yaz
  const output = allLines.join('\n')
  const existingContent = existsSync(OUTPUT_PATH) ? readFileSync(OUTPUT_PATH, 'utf8') : ''
  const changed = output !== existingContent

  writeFileSync(OUTPUT_PATH, output)
  console.log(`\n=== Tamamlandı ===`)
  console.log(`Toplam geçerli stream: ${totalValid}`)
  console.log(`Toplam geçersiz (atlandı): ${totalInvalid}`)
  console.log(`M3U değişti: ${changed}`)

  // Exit kodu 0=değişiklik var, 2=değişiklik yok (workflow buna göre commit kararı alır)
  process.exit(changed || sourcesChanged ? 0 : 2)
}

main().catch((err) => {
  console.error('Beklenmeyen hata:', err)
  process.exit(1)
})
