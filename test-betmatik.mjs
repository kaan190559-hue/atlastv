const html = await fetch('https://data-reality.com/channels.php', {
  headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://betmatiktv144.com/' }
}).then(r => r.text())

console.log('HTML length:', html.length)

const re = /href="channel\?id=([^"]+)"[\s\S]*?<div class="home">([^<]+)<\/div>/g
let m
const channels = []
while ((m = re.exec(html)) !== null) channels.push({ id: m[1].trim(), name: m[2].trim() })
console.log('Kanal sayisi:', channels.length)
channels.slice(0, 8).forEach(c => console.log(' -', c.id, ':', c.name))
