import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

async function main() {
  const { default: icojs } = await import('icojs');
  const { Jimp } = await import('jimp');

  const src = await Jimp.read(join(ROOT, 'icons', 'icon.png'));
  const sizes = [16, 32, 48, 64, 128, 256];
  const images = await Promise.all(sizes.map(async (s) => {
    const cloned = src.clone().resize({ w: s });
    const buf = await cloned.getBuffer('image/png');
    return { width: s, height: s, buffer: buf };
  }));

  const icoData = await icojs.encodeIco(images);
  writeFileSync(join(ROOT, 'icons', 'icon.ico'), Buffer.from(icoData));
  console.log(`icon.ico generated: ${icoData.byteLength} bytes (${sizes.join('/')})`);
}

main().catch(e => { console.error(e); process.exit(1); });
