import { describe, expect, it } from 'vitest';
import { entityVisualState, resolvedEntityAction } from '@/game/visual-layers';
import type { WorldEntity } from '@/game/types';

function actor(overrides: Partial<WorldEntity> = {}): WorldEntity {
  return {
    id: 'actor',
    kind: 'guard',
    x: 1,
    y: 1,
    angle: 0,
    health: 100,
    maxHealth: 100,
    armor: 0,
    alive: true,
    label: 'Acteur test',
    actionState: 'idle',
    ...overrides,
  };
}

describe('accessible actor visual layers', () => {
  it('keeps action motion by default and removes it with reduced motion', () => {
    const moving = actor({ actionState: 'move', motionPhase: Math.PI / 2 });
    expect(
      entityVisualState(moving, 100, {
        reduceMotion: false,
        reduceFlashes: false,
      }).offsetY,
    ).toBeCloseTo(2.5);
    expect(
      entityVisualState(moving, 100, {
        reduceMotion: true,
        reduceFlashes: false,
      }).offsetY,
    ).toBe(0);

    const attacking = actor({ actionState: 'attack', actionLeft: 0.2 });
    expect(
      entityVisualState(attacking, 100, {
        reduceMotion: false,
        reduceFlashes: false,
      }).offsetY,
    ).toBe(4);
    expect(
      entityVisualState(attacking, 100, {
        reduceMotion: true,
        reduceFlashes: false,
      }).offsetY,
    ).toBe(0);

    const hurt = actor({ actionState: 'hurt', actionLeft: 0.17 });
    expect(
      entityVisualState(hurt, 100, {
        reduceMotion: true,
        reduceFlashes: false,
      }).offsetX,
    ).toBe(0);
  });

  it('preserves durable fallen-state readability with reduced motion', () => {
    const dead = entityVisualState(
      actor({ alive: false, actionState: 'dead' }),
      100,
      { reduceMotion: true, reduceFlashes: true },
    );
    expect(dead).toMatchObject({
      action: 'dead',
      fallen: true,
      offsetX: 0,
      offsetY: -6,
      rotation: -Math.PI / 2,
      scale: 0.86,
      opacity: 0.62,
    });
  });

  it('replaces bright transient feedback with fixed markers', () => {
    const firing = actor({ muzzleFlash: 0.1, impactFlash: 0.1 });
    expect(
      entityVisualState(firing, 100, {
        reduceMotion: false,
        reduceFlashes: false,
      }),
    ).toMatchObject({ muzzleCue: 'flash', impactCue: 'flash' });
    expect(
      entityVisualState(firing, 100, {
        reduceMotion: false,
        reduceFlashes: true,
      }),
    ).toMatchObject({ muzzleCue: 'marker', impactCue: 'marker' });
  });

  it('gives capture state precedence and never shows a fallen muzzle cue', () => {
    const restrained = actor({
      actionState: 'attack',
      captureState: 'restrained',
      muzzleFlash: 0.1,
    });
    expect(resolvedEntityAction(restrained)).toBe('restrained');
    expect(
      entityVisualState(restrained, 100, {
        reduceMotion: false,
        reduceFlashes: true,
      }),
    ).toMatchObject({
      action: 'restrained',
      fallen: true,
      muzzleCue: 'none',
    });
  });
});
