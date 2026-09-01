import { describe, expect, it } from 'vitest';
import { gamepadButtonEdges, gamepadInput } from '@/game/input';

describe('gamepad contracts', () => {
  it('maps movement and trigger while rejecting stick drift', () => {
    expect(gamepadInput([0.1, -0.05, 0.15], []).forward).toBe(0);
    const buttons = Array.from({ length: 12 }, (_, index) => ({
      pressed: index === 7,
    }));
    expect(gamepadInput([1, -1, 0], buttons)).toMatchObject({
      forward: 1,
      strafe: 1,
      fire: true,
    });
  });

  it('emits menu buttons only on rising edges', () => {
    expect(gamepadButtonEdges([true, false, true], [])).toEqual([0, 2]);
    expect(
      gamepadButtonEdges([true, true, false], [true, false, true]),
    ).toEqual([1]);
    expect(gamepadButtonEdges([false, false], [true, true])).toEqual([]);
  });
});
