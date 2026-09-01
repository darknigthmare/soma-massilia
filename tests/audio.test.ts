import { describe, expect, it } from 'vitest';
import { spatialPan } from '@/game/audio';

describe('spatial combat audio', () => {
  it('pans sources relative to the listener heading', () => {
    const listener = { x: 0, y: 0, angle: 0 };
    expect(spatialPan(listener, { x: 5, y: 0 })).toBeCloseTo(0);
    expect(spatialPan(listener, { x: 0, y: 5 })).toBeCloseTo(1);
    expect(spatialPan(listener, { x: 0, y: -5 })).toBeCloseTo(-1);
    expect(spatialPan(listener)).toBe(0);
  });
});
