/** Deterministic original pixel materials; generated once, never in the frame loop. */
const materials = new Map<string, HTMLCanvasElement>();
export function wallMaterial(
  kind: number,
  atmosphere: string,
): HTMLCanvasElement {
  const key = kind + atmosphere;
  const existing = materials.get(key);
  if (existing) return existing;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const rgb =
    kind === 2
      ? [104, 66, 46]
      : kind === 3
        ? [22, 63, 70]
        : atmosphere === 'revocation'
          ? [68, 39, 48]
          : [48, 58, 65];
  ctx.fillStyle = 'rgb(' + rgb.join(',') + ')';
  ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const n = ((x * 197 + y * 139 + x * y * 13) % 29) - 14;
      ctx.fillStyle =
        'rgb(' + rgb.map((c) => Math.max(0, c + n)).join(',') + ')';
      ctx.fillRect(x, y, 1, 1);
    }
  if (kind === 2) {
    for (let y = 0; y < 64; y += 16) {
      ctx.fillStyle = '#211b1a';
      ctx.fillRect(0, y, 64, 2);
      for (let x = y % 32 ? 16 : 0; x < 64; x += 32) ctx.fillRect(x, y, 2, 16);
      ctx.fillStyle = '#9a7757';
      ctx.fillRect(0, y + 2, 64, 1);
    }
  } else {
    ctx.fillStyle = '#101c25';
    ctx.fillRect(0, 0, 3, 64);
    ctx.fillRect(61, 0, 3, 64);
    ctx.fillRect(0, 2, 64, 2);
    ctx.fillRect(0, 58, 64, 6);
    ctx.fillStyle = '#677078';
    ctx.fillRect(3, 4, 1, 54);
    ctx.fillRect(4, 4, 56, 1);
    for (const x of [7, 56])
      for (const y of [8, 54]) {
        ctx.fillStyle = '#0b141c';
        ctx.fillRect(x, y, 3, 3);
        ctx.fillStyle = '#7e8a91';
        ctx.fillRect(x, y, 2, 1);
      }
    if (kind === 3) {
      ctx.fillStyle = '#07151c';
      ctx.fillRect(11, 14, 42, 28);
      ctx.fillStyle = '#55c9c0';
      ctx.fillRect(14, 17, 25, 1);
      ctx.fillRect(14, 21, 33, 1);
      ctx.fillStyle = '#347979';
      ctx.fillRect(14, 25, 18, 1);
      ctx.fillRect(14, 29, 29, 1);
      ctx.fillStyle = '#cb8853';
      ctx.fillRect(14, 35, 4, 3);
    } else {
      ctx.fillStyle = '#17252d';
      for (let y = 16; y < 40; y += 4) ctx.fillRect(13, y, 38, 2);
      ctx.fillStyle = '#c18645';
      ctx.fillRect(5, 47, 54, 5);
      ctx.fillStyle = '#30333a';
      for (let x = 5; x < 59; x += 12) ctx.fillRect(x, 47, 6, 5);
    }
  }
  materials.set(key, canvas);
  return canvas;
}
