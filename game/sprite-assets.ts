/** Original RGB sprite sources stay intact. Chroma is interpreted once, in memory. */
type Frame = { x: number; y: number; width: number; height: number };
type SpriteSheet = { image: HTMLCanvasElement; frames: Frame[] };
const loaded: Partial<Record<'guard' | 'nara', SpriteSheet>> = {};
let pending: Promise<void> | null = null;
export function getSpriteSheet(
  kind: 'guard' | 'nara',
): SpriteSheet | undefined {
  return loaded[kind];
}

export function loadSpriteAssets(): Promise<void> {
  if (pending) return pending;
  pending = Promise.all(
    (['guard', 'nara'] as const).map(async (kind) => {
      const image = new Image();
      image.src =
        kind === 'guard'
          ? '/art/soma-guard-chroma.png'
          : '/art/nara-velvet-chroma.png';
      await image.decode();
      const surface = document.createElement('canvas');
      surface.width = image.naturalWidth;
      surface.height = image.naturalHeight;
      const ctx = surface.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, surface.width, surface.height);
      // Remove the key including anti-aliased fringes, retaining the dark plum coat.
      for (let i = 0; i < pixels.data.length; i += 4) {
        const r = pixels.data[i],
          g = pixels.data[i + 1],
          b = pixels.data[i + 2];
        if (r > 95 && b > 95 && g < Math.min(r, b) * 0.38)
          pixels.data[i + 3] = 0;
      }
      // Despill only the surviving silhouette boundary, not interior garment colors.
      for (let y = 1; y < surface.height - 1; y++)
        for (let x = 1; x < surface.width - 1; x++) {
          const i = (y * surface.width + x) * 4,
            p = pixels.data;
          if (
            !p[i + 3] ||
            [i - 4, i + 4, i - surface.width * 4, i + surface.width * 4].every(
              (n) => p[n + 3],
            )
          )
            continue;
          const spill = Math.max(0, Math.min(p[i], p[i + 2]) - p[i + 1] - 24);
          p[i] -= spill;
          p[i + 2] -= spill;
        }
      ctx.putImageData(pixels, 0, 0);
      const frames: Frame[] = [];
      for (let index = 0; index < 8; index += 1) {
        const x0 = Math.round(((index % 4) * surface.width) / 4),
          x1 = Math.round((((index % 4) + 1) * surface.width) / 4);
        const y0 = Math.round((Math.floor(index / 4) * surface.height) / 2),
          y1 = Math.round(((Math.floor(index / 4) + 1) * surface.height) / 2);
        let left = x1,
          top = y1,
          right = x0,
          bottom = y0;
        for (let y = y0; y < y1; y += 1)
          for (let x = x0; x < x1; x += 1) {
            if (pixels.data[(y * surface.width + x) * 4 + 3]) {
              left = Math.min(left, x);
              right = Math.max(right, x);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
          }
        frames.push({
          x: left,
          y: top,
          width: right - left + 1,
          height: bottom - top + 1,
        });
      }
      loaded[kind] = { image: surface, frames };
    }),
  )
    .then(() => undefined)
    .catch(() => {
      pending = null;
    });
  return pending;
}
