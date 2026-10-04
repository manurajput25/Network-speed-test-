import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 6; // color type 6: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // no interlace

  const ihdrChunk = writeChunk('IHDR', ihdr);

  // Scanlines with filter 0
  const rowSize = width * 4;
  const scanlines = Buffer.alloc(height * (rowSize + 1));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowSize + 1);
    scanlines[rowOffset] = 0; // filter byte
    rgbaBuffer.copy(scanlines, rowOffset + 1, y * rowSize, (y + 1) * rowSize);
  }

  const compressed = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = writeChunk('IDAT', compressed);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function drawSpeedometer(size, isMaskable = false) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const scale = isMaskable ? 0.75 : 0.90;
  const rOuter = (size / 2) * scale;
  const rTrack = rOuter * 0.78;
  const trackWidth = size * 0.06;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx); // [-PI, PI]

      // Default background
      let r = 8, g = 14, b = 28, a = isMaskable ? 255 : (dist <= rOuter ? 255 : 0);

      if (dist <= rOuter) {
        // Subtle radial gradient disc
        const radFactor = dist / rOuter;
        r = Math.round(12 - radFactor * 8);
        g = Math.round(20 - radFactor * 12);
        b = Math.round(38 - radFactor * 22);

        // Outer neon ring
        if (Math.abs(dist - rOuter) < 2.5) {
          r = 0; g = 240; b = 255;
        }

        // Speedometer Arc: sweep from 135 deg to 405 deg (270 deg total)
        // In screen coords, bottom-left is ~0.75*PI to bottom-right ~0.25*PI
        const angleDeg = (angle * 180 / Math.PI + 360) % 360;
        const inArcSweep = angleDeg >= 135 || angleDeg <= 45;

        if (inArcSweep && Math.abs(dist - rTrack) <= trackWidth / 2) {
          // Track background
          r = 30; g = 41; b = 59;

          // Active filled part: from 135 deg to ~330 deg (top-right)
          let activePart = false;
          if (angleDeg >= 135 || angleDeg <= 10) activePart = true;

          if (activePart) {
            // Neon cyan gradient
            const arcFrac = angleDeg >= 135 ? (angleDeg - 135) / 235 : (angleDeg + 225) / 235;
            r = Math.round(2 + arcFrac * 10);
            g = Math.round(180 + arcFrac * 60);
            b = 255;
          }
        }

        // Needle (pointing towards ~45 deg / top-right)
        // Needle line from center out to rTrack
        const needleAngle = -Math.PI / 4; // -45 deg (pointing up-right)
        const dotProduct = (dx * Math.cos(needleAngle) + dy * Math.sin(needleAngle));
        const perpDist = Math.abs(-dx * Math.sin(needleAngle) + dy * Math.cos(needleAngle));

        if (dotProduct > 0 && dotProduct < rTrack && perpDist < size * 0.02) {
          if (perpDist < size * 0.008) {
            r = 255; g = 255; b = 255; // White spine
          } else {
            r = 0; g = 240; b = 255; // Cyan edge
          }
        }

        // Center hub cap
        if (dist <= size * 0.08) {
          r = 7; g = 12; b = 24;
          if (dist <= size * 0.04) {
            r = 0; g = 240; b = 255;
          }
        }
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }

  return encodePNG(size, size, buf);
}

// Ensure public dir exists
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), drawSpeedometer(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), drawSpeedometer(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), drawSpeedometer(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), drawSpeedometer(180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), drawSpeedometer(32, false));

console.log('Successfully generated all PWA icons!');
