import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const svg = await readFile(new URL('../public/favicon.svg', import.meta.url));
const iconTasks = Promise.all(
  [192, 512].map((size) =>
    sharp(svg)
      .resize(size, size)
      .png()
      .toFile(
        new URL(
          '../public/icon-' + size + '.png',
          import.meta.url,
        ).pathname.replace(/^\/([A-Z]:)/, '$1'),
      ),
  ),
);
const faviconPng = await sharp(svg).resize(64, 64).png().toBuffer();
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader.writeUInt8(64, 6);
icoHeader.writeUInt8(64, 7);
icoHeader.writeUInt8(0, 8);
icoHeader.writeUInt8(0, 9);
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(faviconPng.length, 14);
icoHeader.writeUInt32LE(22, 18);
await Promise.all([
  iconTasks,
  writeFile(
    new URL('../public/favicon.ico', import.meta.url),
    Buffer.concat([icoHeader, faviconPng]),
  ),
]);
console.log('Original application icons: ICO, 192 and 512 px.');
