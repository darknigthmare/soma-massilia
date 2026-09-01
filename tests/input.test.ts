import { describe, expect, it } from 'vitest';
import {
  gamepadButtonEdges,
  gamepadInput,
  gamepadIntent,
  togglePauseOverlay,
} from '@/game/input';

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

  it('routes gameplay and Cortex buttons through one deterministic contract', () => {
    expect(gamepadIntent('chair', false, [0])).toEqual({
      type: 'action',
      action: 'interact',
    });
    expect(gamepadIntent('chair', false, [4])).toEqual({
      type: 'action',
      action: 'cortex',
    });
    expect(gamepadIntent('cortex', false, [12])).toEqual({
      type: 'cortex',
      button: 12,
    });
    expect(gamepadIntent('cortex', false, [8])).toEqual({
      type: 'action',
      action: 'spectre',
    });
  });

  it('seals every command behind pause except Start and toggles only pause', () => {
    expect(gamepadIntent('cortex', true, [0, 2, 5, 12])).toBeNull();
    expect(gamepadIntent('cortex', true, [9, 0])).toEqual({ type: 'pause' });
    expect(togglePauseOverlay('none')).toBe('pause');
    expect(togglePauseOverlay('pause')).toBe('none');
    expect(togglePauseOverlay('settings')).toBe('settings');
    expect(togglePauseOverlay('death')).toBe('death');
  });

  it('prioritizes state changes over confirmations in ambiguous chords', () => {
    expect(gamepadIntent('cortex', false, [0, 2])).toEqual({
      type: 'cortex',
      button: 2,
    });
    expect(gamepadIntent('chair', false, [0, 4])).toEqual({
      type: 'action',
      action: 'cortex',
    });
  });
});
