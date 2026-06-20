import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/** Convert RGBA pixel array to BGR + write into buffer at offset, bottom-up */
function writeBGR(dst, dstOff, pixels, width, height) {
  const rowBytes = width * 3;
  const rowPad = (4 - (rowBytes % 4)) % 4;
  const rowSize = rowBytes + rowPad;
  for (let y = 0; y < height; y++) {
    const srcRow = (height - 1 - y) * width * 4;
    const dstRow = dstOff + y * rowSize;
    for (let x = 0; x < width; x++) {
      const si = srcRow + x * 4;
      const di = dstRow + x * 3;
      dst[di]     = pixels[si + 2]; // B
      dst[di + 1] = pixels[si + 1]; // G
      dst[di + 2] = pixels[si];     // R
    }
  }
}

/** Write 1-bit transparency mask, bottom-up */
function writeMask(dst, dstOff, pixels, width, height) {
  const rowBytes = Math.ceil(width / 8);
  const rowPad = (4 - (rowBytes % 4)) % 4;
  const rowSize = rowBytes + rowPad;
  for (let y = 0; y < height; y++) {
    const srcRow = (height - 1 - y) * width * 4;
    const dstRow = dstOff + y * rowSize;
    for (let x = 0; x < width; x++) {
      const alpha = pixels[srcRow + x * 4 + 3];
      if (alpha < 128) {
        const byteIdx = dstRow + Math.floor(x / 8);
        dst[byteIdx] |= (1 << (7 - (x % 8)));
      }
    }
  }
}

async function main() {
  const { Jimp } = await import('jimp');
  const src = await Jimp.read(join(ROOT, 'icons', 'icon.png'));

  const sizes = [16, 32, 48, 64, 128, 256];
  const entries = await Promise.all(sizes.map(async (s) => {
    const cloned = src.clone().resize({ w: s });
    const { data, width, height } = cloned.bitmap;
    const pixels = new Uint8Array(data);

    // BMP body: BITMAPINFOHEADER(40) + BGR pixels + mask
    const rowBytes = width * 3;
    const rowPad = (4 - (rowBytes % 4)) % 4;
    const bmpSize = 40 + (rowBytes + rowPad) * height;
    const maskRowBytes = Math.ceil(width / 8);
    const maskRowPad = (4 - (maskRowBytes % 4)) % 4;
    const maskSize = (maskRowBytes + maskRowPad) * height;
    const imageSize = bmpSize + maskSize;

    const body = new Uint8Array(imageSize);
    // BITMAPINFOHEADER
    const dv = new DataView(body.buffer);
    dv.setUint32(0, 40, true);    // header size
    dv.setUint32(4, width, true);
    dv.setUint32(8, height * 2, true); // doubled for ICO mask
    dv.setUint16(12, 1, true);    // planes
    dv.setUint16(14, 24, true);   // bpp
    dv.setUint32(16, 0, true);    // compression
    dv.setUint32(20, bmpSize, true); // image size
    dv.setUint32(24, 0, true);    // x pixels per meter
    dv.setUint32(28, 0, true);    // y pixels per meter
    dv.setUint32(32, 0, true);    // colors used
    dv.setUint32(36, 0, true);    // important colors

    writeBGR(body, 40, pixels, width, height);
    writeMask(body, 40 + (rowBytes + rowPad) * height, pixels, width, height);

    return { width, height, body };
  }));

  // Build ICO file
  const headerSize = 6;
  const dirSize = 16;
  let dataOffset = headerSize + dirSize * sizes.length;
  const parts = [];

  // Header
  const hdr = Buffer.alloc(headerSize);
  hdr.writeUInt16LE(0, 0);     // reserved
  hdr.writeUInt16LE(1, 2);     // type=ICO
  hdr.writeUInt16LE(sizes.length, 4);
  parts.push(hdr);

  // Directory entries
  for (const e of entries) {
    const w = e.width >= 256 ? 0 : e.width;
    const h = e.height >= 256 ? 0 : e.height;
    const entry = Buffer.alloc(dirSize);
    entry.writeUInt8(w, 0);
    entry.writeUInt8(h, 1);
    entry.writeUInt8(0, 2);    // color count
    entry.writeUInt8(0, 3);    // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(24, 6); // bpp
    entry.writeUInt32LE(e.body.length, 8);   // data size
    entry.writeUInt32LE(dataOffset, 12);     // data offset
    parts.push(entry);
    dataOffset += e.body.length;
  }

  // Image data
  for (const e of entries) {
    parts.push(Buffer.from(e.body));
  }

  const ico = Buffer.concat(parts);
  writeFileSync(join(ROOT, 'icons', 'icon.ico'), ico);
  console.log(`icon.ico generated: ${ico.length} bytes (${sizes.join('/')})`);
}

main().catch(e => { console.error(e); process.exit(1); });
