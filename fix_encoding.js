const fs = require('fs')

// Windows-1252 reverse map: Unicode codepoint → Win-1252 byte value
// Only for codepoints that differ from Latin-1 (0x80-0x9F range)
const unicodeToWin1252 = {
  0x20AC: 0x80, // €
  0x201A: 0x82, // ‚
  0x0192: 0x83, // ƒ
  0x201E: 0x84, // „
  0x2026: 0x85, // …
  0x2020: 0x86, // †
  0x2021: 0x87, // ‡
  0x02C6: 0x88, // ˆ
  0x2030: 0x89, // ‰
  0x0160: 0x8A, // Š
  0x2039: 0x8B, // ‹
  0x0152: 0x8C, // Œ
  0x017D: 0x8E, // Ž
  0x2018: 0x91, // '
  0x2019: 0x92, // '
  0x201C: 0x93, // "
  0x201D: 0x94, // "
  0x2022: 0x95, // •
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x02DC: 0x98, // ˜
  0x2122: 0x99, // ™
  0x0161: 0x9A, // š
  0x203A: 0x9B, // ›
  0x0153: 0x9C, // œ
  0x017E: 0x9E, // ž
  0x0178: 0x9F, // Ÿ
}

function unicodeCharToWin1252Byte(cp) {
  if (unicodeToWin1252[cp] !== undefined) return unicodeToWin1252[cp]
  if (cp >= 0x00 && cp <= 0xFF) return cp  // Latin-1 range: same byte value
  return null  // Can't map
}

// Read file as buffer
const buf = fs.readFileSync('app/dashboard/page.jsx')

// Find and fix all corrupted F0 9F emoji sequences
// Pattern: the byte sequence C3 B0 C5 B8 ... (ðŸ followed by 2 more encoded chars)
// represents a corrupted F0 9F XX YY emoji

const outputParts = []
let i = 0

while (i < buf.length) {
  // Look for C3 B0 C5 B8 = "ðŸ" = start of corrupted F0 9F emoji
  if (
    i + 8 < buf.length &&
    buf[i] === 0xC3 && buf[i+1] === 0xB0 &&  // ð (U+00F0) — from 0xF0
    buf[i+2] === 0xC5 && buf[i+3] === 0xB8    // Ÿ (U+0178) — from 0x9F
  ) {
    // Decode the next 2 UTF-8 characters (3rd and 4th emoji bytes)
    let pos = i + 4
    const decodedBytes = [0xF0, 0x9F]  // First 2 bytes of the original emoji

    let success = true
    for (let b = 0; b < 2; b++) {
      if (pos >= buf.length) { success = false; break }
      
      let cp
      const byte1 = buf[pos]

      if (byte1 < 0x80) {
        // ASCII byte — Win-1252 byte value = ASCII value
        cp = byte1
        pos++
      } else if ((byte1 & 0xE0) === 0xC0 && pos + 1 < buf.length) {
        // 2-byte UTF-8
        cp = ((byte1 & 0x1F) << 6) | (buf[pos+1] & 0x3F)
        pos += 2
      } else if ((byte1 & 0xF0) === 0xE0 && pos + 2 < buf.length) {
        // 3-byte UTF-8
        cp = ((byte1 & 0x0F) << 12) | ((buf[pos+1] & 0x3F) << 6) | (buf[pos+2] & 0x3F)
        pos += 3
      } else {
        success = false
        break
      }

      const win1252Byte = unicodeCharToWin1252Byte(cp)
      if (win1252Byte === null) { success = false; break }
      decodedBytes.push(win1252Byte)
    }

    if (success && decodedBytes.length === 4) {
      // Reconstruct original emoji codepoint
      const codePoint =
        ((decodedBytes[0] & 0x07) << 18) |
        ((decodedBytes[1] & 0x3F) << 12) |
        ((decodedBytes[2] & 0x3F) << 6) |
        (decodedBytes[3] & 0x3F)

      const emoji = String.fromCodePoint(codePoint)
      console.log(`Fixed: [${decodedBytes.map(b => b.toString(16).padStart(2,'0')).join(' ')}] → ${emoji} (U+${codePoint.toString(16).toUpperCase()})`)
      outputParts.push(Buffer.from(emoji, 'utf8'))
      i = pos
    } else {
      outputParts.push(buf.slice(i, i + 1))
      i++
    }
  } else {
    outputParts.push(buf.slice(i, i + 1))
    i++
  }
}

const fixed = Buffer.concat(outputParts)
// Remove UTF-8 BOM if present
const finalBuf = (fixed[0] === 0xEF && fixed[1] === 0xBB && fixed[2] === 0xBF)
  ? fixed.slice(3) : fixed

fs.writeFileSync('app/dashboard/page.jsx', finalBuf)
console.log(`\nDone! File written. Has 🔥: ${finalBuf.indexOf(Buffer.from('🔥', 'utf8')) !== -1}`)
