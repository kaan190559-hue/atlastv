# AtlasTV

AtlasTV, VOD M3U listeleri, canlı TV listeleri ve spor M3U kaynaklarını tek arayüzde gösteren React/Vite uygulamasıdır. Üretimde `server.mjs` hem statik siteyi servis eder hem de M3U katalog, HLS proxy ve ortak admin ayarlarını yönetir.

## Yerelde çalıştırma

```bash
npm install
npm run dev
```

Üretim sunucusunu yerelde denemek için:

```bash
npm run build
npm run start
```

Katalog cache dosyalarini yerelde uretmek icin:

```bash
npm run catalog:build
```

Bu komut `public/catalog/` altina hazir JSON dosyalari yazar. Render bu dosyalar varsa buyuk M3U listelerini tekrar tekrar parse etmek yerine hazir katalogdan servis eder.

## Admin panel

Uygulama açıkken `9` tuşuna basın ve `190559` şifresini girin. Buradan:

- Dizi/film M3U linkini değiştirebilirsiniz.
- Canlı TV M3U linkini değiştirebilirsiniz.
- Spor M3U linkini değiştirebilirsiniz.

Üretimde bu ayarlar `ATLAS_DATA_DIR` altındaki `admin-settings.json` dosyasında tutulur. Render üzerinde bu klasör kalıcı diske bağlandığı için değişiklikler herkeste ortak görünür.

## Render deploy

Bu repo Render Web Service olarak çalışacak şekilde hazırlandı.

1. Projeyi GitHub reposuna yükleyin.
2. Render hesabınızda `New +` > `Blueprint` ya da `Web Service` seçin.
3. Repoyu bağlayın.
4. `render.yaml` kullanırsanız servis otomatik şu ayarlarla kurulur:
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`
   - Runtime: Node
   - Region: Frankfurt
   - Persistent disk: `/var/data`
5. İlk deploy bittikten sonra Render size `https://...onrender.com` adresini verir.

Render dokümanlarına göre web servisleri herkese açık `onrender.com` adresiyle yayınlanır ve dosya değişikliklerinin restart/deploy sonrası kalması için persistent disk gerekir.

## Ortak veri yapısı

Bu sürümde ortak admin verisi kalıcı JSON dosyasında saklanır:

```text
/var/data/admin-settings.json
```

Daha sonra daha büyük bir kullanıcı sistemi istenirse aynı API yüzeyi korunarak Supabase, Render Key Value veya Cloudflare KV'ye geçilebilir.

## Ortam değişkenleri

| Değişken | Açıklama |
| --- | --- |
| `PORT` | Render tarafından otomatik verilir. |
| `ATLAS_DATA_DIR` | Admin ayar dosyasının yazılacağı klasör. Render için `/var/data`. |
| `ATLAS_SETTINGS_FILE` | İstenirse admin ayar dosyasının tam yolu. |
| `ATLAS_ADMIN_PASSWORD` | Admin kaydetme şifresi. Varsayılan `190559`. |
| `ATLAS_LIVE_M3U_URL` | Opsiyonel varsayılan canlı TV M3U linki. |
| `ATLAS_LIVE_M3U_FILE` | Sadece yerel test için dosya yolu. |

## Notlar

Canlı yayınlarda Vavoo kaynakları için proxy `Referer: https://vavoo.to/` ve `Origin: https://vavoo.to` başlıklarını ekler. VOD ve canlı yayınlar ayrı proxy mantığıyla işlendiği için dizi/film oynatma canlı TV header ayarlarından etkilenmez.
