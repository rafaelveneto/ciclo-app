/**
 * Generates PWA icon PNGs using pure Node.js (no extra dependencies).
 * Draws a gradient circle (rose→violet→pink) with a white wave line.
 */
const fs = require('fs')
const zlib = require('zlib')

// ── PNG encoder ─────────────────────────────────────────────────────────────

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0)
  }
  return (c ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length)
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

function encodePNG(width, height, pixels /* Uint8Array RGBA */) {
  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  // add filter byte (0) before each row
  const raw = Buffer.allocUnsafe(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0
    pixels.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4)
  }

  const compressed = zlib.deflateSync(raw, { level: 9 })

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Icon drawing ─────────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t }

function gradientColor(t) {
  // rose → violet → pink gradient
  // #ef4444 → #8b5cf6 → #ec4899
  let r, g, b
  if (t < 0.5) {
    const u = t * 2
    r = lerp(0xef, 0x8b, u); g = lerp(0x44, 0x5c, u); b = lerp(0x44, 0xf6, u)
  } else {
    const u = (t - 0.5) * 2
    r = lerp(0x8b, 0xec, u); g = lerp(0x5c, 0x48, u); b = lerp(0xf6, 0x99, u)
  }
  return [Math.round(r), Math.round(g), Math.round(b)]
}

// When `fullBleed` is true we produce a MASKABLE icon: the gradient fills the
// entire square (no transparency) so launchers/splash screens can apply any mask
// (circle, squircle…) without exposing black/empty corners. The symbol stays
// within the central safe zone. When false we draw the regular circular icon.
function drawIcon(size, fullBleed = false) {
  const pixels = Buffer.alloc(size * size * 4, 0)
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.47       // circle radius
  const padding = size * 0.03

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4

      // gradient direction: top-left to bottom-right
      const t = (x / size * 0.6 + y / size * 0.4)
      const [r, g, b] = gradientColor(Math.min(1, t))

      if (fullBleed) {
        // fill every pixel — opaque square, safe for masking
        pixels[idx] = r; pixels[idx + 1] = g; pixels[idx + 2] = b; pixels[idx + 3] = 255
        continue
      }

      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > radius + 1) continue   // outside circle

      const alpha = dist > radius - 1
        ? Math.max(0, Math.round(255 * (radius - dist)))
        : 255

      pixels[idx]     = r
      pixels[idx + 1] = g
      pixels[idx + 2] = b
      pixels[idx + 3] = alpha
    }
  }

  // ── Draw white wave / cycle lines ──────────────────────────────────────────
  const lineWidth = Math.max(2, size * 0.03)
  const waveAmp   = size * 0.10
  const waveLen   = size * 0.6
  const waveY     = cy

  function setPixelWhite(px, py, alpha) {
    const ix = Math.round(px), iy = Math.round(py)
    if (ix < 0 || iy < 0 || ix >= size || iy >= size) return
    const dist = Math.sqrt((ix - cx) ** 2 + (iy - cy) ** 2)
    if (dist > radius - padding * 2) return
    const i = (iy * size + ix) * 4
    const a = Math.min(255, Math.round(alpha))
    // blend over existing
    const bg = pixels[i + 3] / 255
    pixels[i]     = Math.round(255 * a / 255 + pixels[i]     * (1 - a / 255))
    pixels[i + 1] = Math.round(255 * a / 255 + pixels[i + 1] * (1 - a / 255))
    pixels[i + 2] = Math.round(255 * a / 255 + pixels[i + 2] * (1 - a / 255))
    if (pixels[i + 3] > 0) pixels[i + 3] = Math.max(pixels[i + 3], a)
  }

  // Draw smooth wave (anti-aliased thick line)
  const xStart = cx - size * 0.33
  const xEnd   = cx + size * 0.33
  const steps  = size * 2

  for (let s = 0; s < steps; s++) {
    const x = xStart + (xEnd - xStart) * (s / steps)
    const progress = (x - xStart) / (xEnd - xStart)
    const y = waveY + Math.sin(progress * Math.PI * 2) * waveAmp

    // draw thick dot at this point
    for (let dy2 = -lineWidth; dy2 <= lineWidth; dy2++) {
      for (let dx2 = -lineWidth; dx2 <= lineWidth; dx2++) {
        const d = Math.sqrt(dx2 * dx2 + dy2 * dy2)
        if (d <= lineWidth) {
          const alpha = d < lineWidth - 1 ? 230 : Math.round(230 * (lineWidth - d))
          setPixelWhite(x + dx2, y + dy2, alpha)
        }
      }
    }
  }

  // Draw a small circular arrow tip to suggest "cycle"
  const arrowR = size * 0.28
  const arrowSteps = 180
  const arrowLW = lineWidth * 0.85
  for (let s = 0; s < arrowSteps; s++) {
    const angle = (s / arrowSteps) * Math.PI * 1.5 - Math.PI * 0.75
    const ax = cx + Math.cos(angle) * arrowR
    const ay = cy - size * 0.05 + Math.sin(angle) * arrowR
    for (let dy2 = -arrowLW; dy2 <= arrowLW; dy2++) {
      for (let dx2 = -arrowLW; dx2 <= arrowLW; dx2++) {
        const d = Math.sqrt(dx2 * dx2 + dy2 * dy2)
        if (d <= arrowLW) {
          const alpha = d < arrowLW - 1 ? 210 : Math.round(210 * (arrowLW - d))
          setPixelWhite(ax + dx2, ay + dy2, alpha)
        }
      }
    }
  }

  return pixels
}

// ── Generate & save ──────────────────────────────────────────────────────────

for (const size of [192, 512]) {
  // Regular (circular, transparent corners) — purpose "any"
  const png = encodePNG(size, size, drawIcon(size, false))
  fs.writeFileSync(`public/icon-${size}.png`, png)
  console.log(`  ✓ public/icon-${size}.png (${Math.round(png.length / 1024)} KB)`)

  // Maskable (full-bleed square) — purpose "maskable"
  const maskPng = encodePNG(size, size, drawIcon(size, true))
  fs.writeFileSync(`public/icon-maskable-${size}.png`, maskPng)
  console.log(`  ✓ public/icon-maskable-${size}.png (${Math.round(maskPng.length / 1024)} KB)`)
}

console.log('Done!')
