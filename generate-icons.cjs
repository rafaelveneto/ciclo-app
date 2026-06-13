/**
 * Generates the app icons + favicon from a single source SVG, rendered crisply
 * with sharp. The icon is FULL-BLEED (the gradient fills the whole square) so it
 * works as both "any" and "maskable", and never shows a white/empty background on
 * the splash, launcher, favicon or iOS home screen. The mark (a cycle ring with a
 * highlighted day) ties the brand to the in-app CycleRing.
 */
const fs = require('fs')
const sharp = require('sharp')

// Marker position: on the ring, top-right (-45°), R = 120 from center (256,256).
const MX = (256 + 120 * Math.cos(-Math.PI / 4)).toFixed(2)
const MY = (256 + 120 * Math.sin(-Math.PI / 4)).toFixed(2)

const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="40" y1="24" x2="472" y2="488" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fb7185"/>
      <stop offset="0.52" stop-color="#a855f7"/>
      <stop offset="1" stop-color="#ec4899"/>
    </linearGradient>
    <radialGradient id="sheen" cx="170" cy="148" r="340" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <rect width="512" height="512" fill="url(#sheen)"/>
  <circle cx="256" cy="256" r="120" fill="none" stroke="#ffffff" stroke-width="38" stroke-opacity="0.96"/>
  <circle cx="${MX}" cy="${MY}" r="42" fill="url(#g)"/>
  <circle cx="${MX}" cy="${MY}" r="33" fill="#ffffff"/>
  <circle cx="${MX}" cy="${MY}" r="12" fill="url(#g)"/>
</svg>`

// Favicon source (kept as the crisp SVG)
fs.writeFileSync('public/favicon.svg', svg)

const targets = {
  'icon-192.png': 192,
  'icon-512.png': 512,
  'apple-touch-icon.png': 180,
}

;(async () => {
  for (const [name, size] of Object.entries(targets)) {
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/${name}`)
    const kb = Math.round(fs.statSync(`public/${name}`).size / 1024)
    console.log(`  ✓ public/${name} (${kb} KB)`)
  }
  // Remove the now-unused dedicated maskable files (the full-bleed icon covers both).
  for (const f of ['public/icon-maskable-192.png', 'public/icon-maskable-512.png']) {
    if (fs.existsSync(f)) { fs.unlinkSync(f); console.log(`  ✗ removed ${f}`) }
  }
  console.log('Done!')
})()
