const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'icons');
const SIZES = [16, 32, 48, 64, 96, 128, 256];
const OUTPUT = path.join(ICONS_DIR, 'icon_png.ico');

function readPngFromIco(filePath) {
  const buf = fs.readFileSync(filePath);
  // ICO header: 6 bytes, Directory entry: 16 bytes, then image data starts
  const dirEntrySize = 16;
  const imgOffset = 6 + dirEntrySize;
  const imgSize = buf.readUInt32LE(6 + 8); // offset in dir entry: size at byte 8
  return buf.subarray(imgOffset, imgOffset + imgSize);
}

function buildMultiIco(entries) {
  const headerSize = 6;
  const dirEntrySize = 16;
  let dataOffset = headerSize + dirEntrySize * entries.length;

  const parts = [];

  // ICO header
  const hdr = Buffer.alloc(headerSize);
  hdr.writeUInt16LE(0, 0);      // reserved
  hdr.writeUInt16LE(1, 2);      // type = ICO
  hdr.writeUInt16LE(entries.length, 4);
  parts.push(hdr);

  // Directory entries
  for (const e of entries) {
    const w = e.width >= 256 ? 0 : e.width;
    const h = e.height >= 256 ? 0 : e.height;
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(w, 0);
    entry.writeUInt8(h, 1);
    entry.writeUInt8(0, 2);      // color count
    entry.writeUInt8(0, 3);      // reserved
    entry.writeUInt16LE(1, 4);   // planes
    entry.writeUInt16LE(32, 6);  // bpp (32-bit for PNG)
    entry.writeUInt32LE(e.data.length, 8);
    entry.writeUInt32LE(dataOffset, 12);
    parts.push(entry);
    dataOffset += e.data.length;
  }

  // PNG data
  for (const e of entries) {
    parts.push(e.data);
  }

  return Buffer.concat(parts);
}

function main() {
  const entries = SIZES.map(size => {
    const filePath = path.join(ICONS_DIR, `${size}x${size}.ico`);
    if (!fs.existsSync(filePath)) {
      console.error(`\n  [错误] 找不到 ${size}x${size}.ico，请先生成`);
      process.exit(1);
    }
    const data = readPngFromIco(filePath);
    return { width: size, height: size, data };
  });

  const ico = buildMultiIco(entries);
  fs.writeFileSync(OUTPUT, ico);
  console.log(`\n  ✓ icon_png.ico 生成成功: ${ico.length} bytes (${SIZES.join('/')})`);
}

main();
