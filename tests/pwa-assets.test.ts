import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('PWA application assets', () => {
  it('ships a valid PNG-backed ICO fallback for browsers requesting favicon.ico', async () => {
    const favicon = await readFile(
      path.join(process.cwd(), 'public', 'favicon.ico'),
    );
    expect([...favicon.subarray(0, 6)]).toEqual([0, 0, 1, 0, 1, 0]);
    expect(favicon.readUInt32LE(18)).toBe(22);
    expect([...favicon.subarray(22, 30)]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });
});
