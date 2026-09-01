import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SIZE = 768;
const artDirectory = path.join(process.cwd(), 'public', 'art');
const outputDirectory = path.join(artDirectory, 'runtime');
const sources = {
  guard: ['soma-guard-chroma.png', 'magenta'],
  heavy: ['soma-heavy-v04-chroma.png', 'magenta'],
  collector: ['collector-v04-chroma.png', 'magenta'],
  nara: ['nara-velvet-chroma.png', 'magenta'],
  idris: ['idris-senn-chroma.png', 'green'],
  salome: ['salome-craie-chroma.png', 'green'],
  'civilian-worker': ['soma-civilian-worker-v05-chroma.png', 'magenta'],
  'civilian-witness': ['soma-civilian-witness-v05-chroma.png', 'magenta'],
};

function keyAndDespill(data, info, chroma) {
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let source = 0, target = 0; source < data.length; source += 3) {
    const r = data[source];
    const g = data[source + 1];
    const b = data[source + 2];
    const keyed =
      chroma === 'green'
        ? g > 95 && Math.max(r, b) < g * 0.38
        : r > 95 && b > 95 && g < Math.min(r, b) * 0.38;
    rgba[target] = r;
    rgba[target + 1] = g;
    rgba[target + 2] = b;
    rgba[target + 3] = keyed ? 0 : 255;
    target += 4;
  }
  for (let y = 1; y < info.height - 1; y += 1)
    for (let x = 1; x < info.width - 1; x += 1) {
      const index = (y * info.width + x) * 4;
      if (
        !rgba[index + 3] ||
        [
          index - 4,
          index + 4,
          index - info.width * 4,
          index + info.width * 4,
        ].every((neighbor) => rgba[neighbor + 3])
      )
        continue;
      if (chroma === 'green') {
        const spill = Math.max(
          0,
          rgba[index + 1] - Math.max(rgba[index], rgba[index + 2]) - 24,
        );
        rgba[index + 1] -= spill;
      } else {
        const spill = Math.max(
          0,
          Math.min(rgba[index], rgba[index + 2]) - rgba[index + 1] - 24,
        );
        rgba[index] -= spill;
        rgba[index + 2] -= spill;
      }
    }
  return rgba;
}

function frameBounds(data, width, height, kind) {
  const frames = [];
  for (let index = 0; index < 8; index += 1) {
    const x0 = Math.round(((index % 4) * width) / 4);
    const x1 = Math.round((((index % 4) + 1) * width) / 4);
    const y0 = Math.round((Math.floor(index / 4) * height) / 2);
    const y1 = Math.round(((Math.floor(index / 4) + 1) * height) / 2);
    let left = x1;
    let top = y1;
    let right = x0;
    let bottom = y0;
    let pixels = 0;
    for (let y = y0; y < y1; y += 1)
      for (let x = x0; x < x1; x += 1) {
        if (data[(y * width + x) * 4 + 3] <= 8) continue;
        pixels += 1;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    if (pixels < 500 || right < left || bottom < top)
      throw new Error(`Sprite ${kind}: direction ${index} is empty.`);
    frames.push({
      x: left,
      y: top,
      width: right - left + 1,
      height: bottom - top + 1,
    });
  }
  return frames;
}

await mkdir(outputDirectory, { recursive: true });
const manifest = {};
for (const [kind, [filename, chroma]] of Object.entries(sources)) {
  const input = await sharp(path.join(artDirectory, filename))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const keyed = keyAndDespill(input.data, input.info, chroma);
  const resized = await sharp(keyed, {
    raw: {
      width: input.info.width,
      height: input.info.height,
      channels: 4,
    },
  })
    .resize(SIZE, SIZE, { kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const frames = frameBounds(
    resized.data,
    resized.info.width,
    resized.info.height,
    kind,
  );
  const outputName = `${kind}.webp`;
  await sharp(resized.data, {
    raw: {
      width: resized.info.width,
      height: resized.info.height,
      channels: 4,
    },
  })
    .webp({ lossless: true, effort: 6 })
    .toFile(path.join(outputDirectory, outputName));
  manifest[kind] = {
    src: `/art/runtime/${outputName}`,
    width: SIZE,
    height: SIZE,
    frames,
  };
}
await writeFile(
  path.join(outputDirectory, 'sprites.json'),
  JSON.stringify({ version: 1, sprites: manifest }),
);
console.log(
  `Runtime sprites: ${Object.keys(manifest).length} alpha sheets at ${SIZE}x${SIZE}.`,
);
