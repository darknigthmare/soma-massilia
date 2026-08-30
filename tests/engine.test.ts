import { describe, expect, it } from 'vitest';
import { applyDamage, canOccupy, castRay, createHackState, captureHackNode, fireWeapon, isHackSolvable, resolveEntityDefeat, startReload, tickWeapon } from '@/game/engine';
import { createWorld } from '@/game/world';
import { createWeaponState } from '@/game/engine';

describe('raycast engine', () => {
  it('casts stable wall hits in the docks map', () => {
    const world = createWorld('docks', 'combat');
    const hit = castRay(world.map, world.start.x, world.start.y, world.start.angle);
    expect(hit.distance).toBeGreaterThan(0.5);
    expect(hit.wall).toBeGreaterThan(0);
  });

  it('blocks movement through walls and accepts open floor', () => {
    const world = createWorld('revocation', 'identity');
    expect(canOccupy(world.map, 1.5, 1.5)).toBe(true);
    expect(canOccupy(world.map, 0.2, 0.2)).toBe(false);
  });

  it('applies armor piercing damage predictably', () => {
    const result = applyDamage(100, 40, 50, 0.5);
    expect(result.health).toBeLessThan(100);
    expect(result.armor).toBeLessThan(40);
    expect(result.health).toBeGreaterThan(40);
  });

  it('fires, reloads and respects magazine state', () => {
    let weapon = createWeaponState('pistol', 12);
    const shot = fireWeapon(weapon);
    expect(shot.fired).toBe(true);
    expect(shot.state.ammo).toBe(11);
    weapon = startReload({ ...shot.state, ammo: 6 });
    expect(weapon.reloading).toBeGreaterThan(0);
    weapon = tickWeapon(weapon, 2);
    expect(weapon.ammo).toBe(12);
    expect(weapon.reserve).toBe(6);
  });

  it('transfers or defeats the Collector consistently for every damage source', () => {
    const world = createWorld('collector', 'combat', 2);
    const boss = world.entities.find((entity) => entity.kind === 'boss');
    expect(boss).toBeDefined();
    boss!.health = 0;
    expect(resolveEntityDefeat(boss!, world.entities)).toBe('collector-transfer');
    expect(boss!.alive).toBe(true);
    expect(boss!.health).toBe(boss!.maxHealth);

    for (const entity of world.entities) {
      if (entity.kind === 'anchor') entity.alive = false;
    }
    boss!.health = 0;
    expect(resolveEntityDefeat(boss!, world.entities)).toBe('collector-defeated');
    expect(boss!.alive).toBe(false);
  });

  it('reports a destroyed anchor once', () => {
    const world = createWorld('collector', 'combat', 1);
    const anchor = world.entities.find((entity) => entity.kind === 'anchor')!;
    anchor.health = 0;
    expect(resolveEntityDefeat(anchor, world.entities)).toBe('anchor-destroyed');
    expect(resolveEntityDefeat(anchor, world.entities)).toBeNull();
  });
});

describe('spectre hack graph', () => {
  it('creates a solvable deterministic grid', () => {
    const state = createHackState(2197);
    expect(isHackSolvable(state)).toBe(true);
    expect(state.nodes).toHaveLength(25);
  });

  it('captures adjacent nodes and rejects non linked jumps', () => {
    const start = createHackState(42);
    const next = captureHackNode(start, start.nodes[0].links[0], 'none');
    expect(next.current).not.toBe(0);
    const illegal = captureHackNode(next, 24, 'none');
    expect(illegal.current).toBe(next.current);
  });
});
