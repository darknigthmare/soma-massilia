import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SIZE = 512;
const EXACT_DISTANCE = 7;
const SOFT_DISTANCE = 56;
const EDGE_ALPHA_FLOOR = 16;
const COMPONENT_ALPHA_FLOOR = 24;
const MIN_COMPONENT_PIXELS = 64;
const MAX_COMPONENTS = 4;
const artDirectory = path.join(process.cwd(), 'public', 'art');
const outputDirectory = path.join(artDirectory, 'runtime', 'viewmodels');
const sources = {
  pistol: 'soma-viewmodel-pistol-v01.png',
  smg: 'soma-viewmodel-smg-v01.png',
  rifle: 'soma-viewmodel-rifle-v01.png',
  blade: 'soma-viewmodel-blade-v01.png',
};

function dominantBackgrounds(data, width, height) {
  const frequencies = new Map();
  const sampleHeight = Math.max(1, Math.floor(height * 0.18));
  for (let y = 0; y < sampleHeight; y += 1)
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const key = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`;
      frequencies.set(key, (frequencies.get(key) ?? 0) + 1);
    }
  return [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key]) => key.split(',').map(Number));
}

function colorDistance(data, offset, backgrounds) {
  let closest = Number.POSITIVE_INFINITY;
  let selected = backgrounds[0];
  for (const background of backgrounds) {
    const distance = Math.hypot(
      data[offset] - background[0],
      data[offset + 1] - background[1],
      data[offset + 2] - background[2],
    );
    if (distance < closest) {
      closest = distance;
      selected = background;
    }
  }
  return { distance: closest, background: selected };
}

function keyCheckerboard(data, width, height, weapon) {
  const backgrounds = dominantBackgrounds(data, width, height);
  if (backgrounds.length !== 2)
    throw new Error(`Viewmodel ${weapon}: checkerboard colors not detected.`);
  const total = width * height;
  const reachable = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const enqueue = (pixel) => {
    if (reachable[pixel]) return;
    const { distance } = colorDistance(data, pixel * 4, backgrounds);
    if (distance > SOFT_DISTANCE) return;
    reachable[pixel] = 1;
    queue[tail] = pixel;
    tail += 1;
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const pixel = queue[head];
    head += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    for (let deltaY = -1; deltaY <= 1; deltaY += 1)
      for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
        if (deltaX === 0 && deltaY === 0) continue;
        const neighborX = x + deltaX;
        const neighborY = y + deltaY;
        if (
          neighborX < 0 ||
          neighborX >= width ||
          neighborY < 0 ||
          neighborY >= height
        )
          continue;
        enqueue(neighborY * width + neighborX);
      }
  }

  const rgba = Buffer.from(data);
  let transparent = 0;
  let opaque = 0;
  for (let pixel = 0; pixel < total; pixel += 1) {
    const offset = pixel * 4;
    const { distance, background } = colorDistance(rgba, offset, backgrounds);
    let alpha = 255;
    if (distance <= EXACT_DISTANCE) alpha = 0;
    else if (reachable[pixel])
      alpha = Math.round(
        ((distance - EXACT_DISTANCE) / (SOFT_DISTANCE - EXACT_DISTANCE)) * 255,
      );
    if (alpha === 0) {
      rgba[offset] = 0;
      rgba[offset + 1] = 0;
      rgba[offset + 2] = 0;
    } else if (alpha < 255) {
      const normalized = alpha / 255;
      for (let channel = 0; channel < 3; channel += 1)
        rgba[offset + channel] = Math.max(
          0,
          Math.min(
            255,
            Math.round(
              (rgba[offset + channel] -
                background[channel] * (1 - normalized)) /
                normalized,
            ),
          ),
        );
    }
    rgba[offset + 3] = alpha;
    if (alpha === 0) transparent += 1;
    if (alpha === 255) opaque += 1;
  }
  if (transparent < total * 0.25 || opaque < total * 0.08)
    throw new Error(
      `Viewmodel ${weapon}: implausible foreground/background separation.`,
    );
  return rgba;
}

function assertCleanAlpha(data, width, height, weapon) {
  const total = width * height;
  const seen = new Uint8Array(total);
  const stack = new Int32Array(total);
  const componentSizes = [];
  for (let start = 0; start < total; start += 1) {
    if (seen[start] || data[start * 4 + 3] <= COMPONENT_ALPHA_FLOOR) continue;
    let stackLength = 1;
    let size = 0;
    stack[0] = start;
    seen[start] = 1;
    while (stackLength > 0) {
      stackLength -= 1;
      const pixel = stack[stackLength];
      size += 1;
      const x = pixel % width;
      for (const neighbor of [
        pixel - 1,
        pixel + 1,
        pixel - width,
        pixel + width,
      ]) {
        if (
          neighbor < 0 ||
          neighbor >= total ||
          seen[neighbor] ||
          data[neighbor * 4 + 3] <= COMPONENT_ALPHA_FLOOR ||
          Math.abs((neighbor % width) - x) > 1
        )
          continue;
        seen[neighbor] = 1;
        stack[stackLength] = neighbor;
        stackLength += 1;
      }
    }
    componentSizes.push(size);
  }
  const fragments = componentSizes.filter(
    (size) => size < MIN_COMPONENT_PIXELS,
  );
  if (
    componentSizes.length === 0 ||
    componentSizes.length > MAX_COMPONENTS ||
    fragments.length > 0
  )
    throw new Error(
      `Viewmodel ${weapon}: suspicious alpha islands (${componentSizes.join(', ')}).`,
    );
}

function removeAlphaIslands(data, width, height) {
  const total = width * height;
  const seen = new Uint8Array(total);
  const stack = new Int32Array(total);
  const component = new Int32Array(total);
  for (let start = 0; start < total; start += 1) {
    if (seen[start] || data[start * 4 + 3] <= COMPONENT_ALPHA_FLOOR) continue;
    let stackLength = 1;
    let componentLength = 0;
    stack[0] = start;
    seen[start] = 1;
    while (stackLength > 0) {
      stackLength -= 1;
      const pixel = stack[stackLength];
      component[componentLength] = pixel;
      componentLength += 1;
      const x = pixel % width;
      for (const neighbor of [
        pixel - 1,
        pixel + 1,
        pixel - width,
        pixel + width,
      ]) {
        if (
          neighbor < 0 ||
          neighbor >= total ||
          seen[neighbor] ||
          data[neighbor * 4 + 3] <= COMPONENT_ALPHA_FLOOR ||
          Math.abs((neighbor % width) - x) > 1
        )
          continue;
        seen[neighbor] = 1;
        stack[stackLength] = neighbor;
        stackLength += 1;
      }
    }
    if (componentLength >= MIN_COMPONENT_PIXELS) continue;
    for (let index = 0; index < componentLength; index += 1) {
      const offset = component[index] * 4;
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
    }
  }
}

await mkdir(outputDirectory, { recursive: true });
const manifest = {};
for (const [weapon, filename] of Object.entries(sources)) {
  const sourcePath = path.join(artDirectory, filename);
  const metadata = await sharp(sourcePath).metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width !== metadata.height ||
    metadata.width < 1024
  )
    throw new Error(
      `Viewmodel ${weapon}: expected a square source of at least 1024px.`,
    );
  const decoded = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const hadRealAlpha =
    metadata.hasAlpha &&
    decoded.data.some((value, index) => index % 4 === 3 && value === 0);
  const rgba = hadRealAlpha
    ? decoded.data
    : keyCheckerboard(
        decoded.data,
        decoded.info.width,
        decoded.info.height,
        weapon,
      );
  const outputName = `${weapon}.webp`;
  const resized = await sharp(rgba, {
    raw: {
      width: decoded.info.width,
      height: decoded.info.height,
      channels: 4,
    },
  })
    .resize(SIZE, SIZE, { kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let pixel = 0; pixel < SIZE * SIZE; pixel += 1) {
    const alphaOffset = pixel * 4 + 3;
    if (resized.data[alphaOffset] >= EDGE_ALPHA_FLOOR) continue;
    resized.data[alphaOffset] = 0;
    resized.data[alphaOffset - 3] = 0;
    resized.data[alphaOffset - 2] = 0;
    resized.data[alphaOffset - 1] = 0;
  }
  removeAlphaIslands(resized.data, SIZE, SIZE);
  const runtime = await sharp(resized.data, {
    raw: {
      width: SIZE,
      height: SIZE,
      channels: 4,
    },
  })
    .webp({ quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toBuffer();
  const verified = await sharp(runtime)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assertCleanAlpha(
    verified.data,
    verified.info.width,
    verified.info.height,
    weapon,
  );
  await writeFile(path.join(outputDirectory, outputName), runtime);
  manifest[`viewmodel-${weapon}`] = {
    src: `/art/runtime/viewmodels/${outputName}`,
    width: SIZE,
    height: SIZE,
    frames: Array.from({ length: 8 }, () => ({
      x: 0,
      y: 0,
      width: SIZE,
      height: SIZE,
    })),
  };
}
await writeFile(
  path.join(outputDirectory, 'viewmodels.json'),
  JSON.stringify({ version: 1, sprites: manifest }),
);
console.log(
  `Runtime viewmodels: ${Object.keys(manifest).length} alpha sheets at ${SIZE}x${SIZE}.`,
);
