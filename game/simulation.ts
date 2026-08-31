import { BODIES, WEAPONS } from './content';
import {
  applyDamage,
  canOccupy,
  createWeaponState,
  findPath,
  fireWeapon,
  impulseEffect,
  lineOfSight,
  normalizeAngle,
  resolveEntityDefeat,
  shortestAngle,
  startReload,
  tickWeapon,
} from './engine';
import { createWorld, type WorldDefinition } from './world';
import type {
  EncounterState,
  GameMode,
  SaveData,
  WeaponId,
  WorldEntity,
} from './types';

export interface InputFrame {
  forward: number;
  strafe: number;
  turn: number;
  sprint: boolean;
  crouch: boolean;
  fire: boolean;
}
export const EMPTY_INPUT: InputFrame = {
  forward: 0,
  strafe: 0,
  turn: 0,
  sprint: false,
  crouch: false,
  fire: false,
};
export type SimulationEvent =
  | {
      type: 'sound';
      name: 'interact' | 'impulse' | 'damage' | 'denied' | 'success';
      weapon?: WeaponId;
    }
  | { type: 'campaign'; name: string; id?: string }
  | { type: 'hack'; id: string; label: string }
  | { type: 'death' };
export const isEnemy = (entity: WorldEntity) =>
  ['guard', 'heavy', 'drone', 'boss'].includes(entity.kind);

export function missionWorld(save: SaveData): WorldDefinition {
  return createWorld(
    save.campaign.stage,
    save.campaign.route,
    save.campaign.collectorAnchors,
    save.activeOperation,
  );
}

export function createEncounter(save: SaveData): EncounterState {
  const world = missionWorld(save);
  const body = BODIES[save.campaign.bodyId ?? 'mistral'];
  const health =
    body.integrity + save.talents.soma * 15 + save.station.clinic * 10;
  const armor = body.armor + save.station.clinic * 10;
  const neural =
    body.neural + save.talents.interface * 15 + save.station.spectre * 10;
  const inventory = Object.fromEntries(
    (Object.keys(WEAPONS) as WeaponId[]).map((id) => [
      id,
      createWeaponState(
        id,
        Math.round(WEAPONS[id].reserve * (1 + save.station.arsenal * 0.2)),
      ),
    ]),
  ) as EncounterState['inventory'];
  const entities = world.entities.map((item) => ({
    ...item,
    homeX: item.x,
    homeY: item.y,
    attackLeft: 1.5,
    awareness: 0,
    memory: 0,
  }));
  if (save.activeOperation)
    for (const entity of entities) {
      if (!isEnemy(entity)) continue;
      const multiplier =
        1 + Math.min(5, save.operations[save.activeOperation]) * 0.08;
      entity.health = entity.maxHealth = Math.round(
        entity.maxHealth * multiplier,
      );
    }
  if (!entities.some((e) => e.kind === 'loot'))
    entities.push({
      id: 'supply-' + save.campaign.stage,
      kind: 'loot',
      x: world.start.x + 1,
      y: world.start.y,
      angle: 0,
      health: 1,
      maxHealth: 1,
      armor: 0,
      alive: true,
      interactable: true,
      label: 'Réserve clandestine : soins et munitions',
      homeX: world.start.x + 1,
      homeY: world.start.y,
      attackLeft: 0,
      awareness: 0,
      memory: 0,
    });
  return {
    stage: save.campaign.stage,
    player: {
      ...world.start,
      health,
      maxHealth: health,
      armor,
      maxArmor: armor,
      neural,
      maxNeural: neural,
      weapon: inventory.pistol,
      recoil: 0,
      hurtFlash: 0,
    },
    inventory,
    entities,
    elapsed: 0,
    revocationLeft:
      save.settings.difficulty === 'story'
        ? 300
        : save.settings.difficulty === 'hard'
          ? 135
          : 210,
    kills: 0,
    shots: 0,
    hits: 0,
    noise: 0,
    hitMarker: 0,
    droneId: null,
    focusId: null,
    notice: '',
  };
}

export function cameraActor(state: EncounterState): {
  x: number;
  y: number;
  angle: number;
} {
  return (
    state.entities.find((e) => e.id === state.droneId && e.alive) ??
    state.player
  );
}

/** Restart a failed zone without resurrecting any already-severed consciousness anchor. */
export function createRetryEncounter(save: SaveData): EncounterState {
  const previous = save.encounter;
  const retry = createEncounter(
    save.campaign.stage === 'collector' && previous
      ? { ...save, campaign: { ...save.campaign, collectorAnchors: 3 } }
      : save,
  );
  if (retry.stage === 'collector' && previous)
    for (const anchor of retry.entities.filter((e) => e.kind === 'anchor')) {
      anchor.alive = previous.entities.some(
        (e) => e.id === anchor.id && e.alive,
      );
      if (!anchor.alive) anchor.health = 0;
    }
  return retry;
}

export function switchWeapon(
  state: EncounterState,
  id: WeaponId,
  save: SaveData,
): boolean {
  if (!save.weapons[id].unlocked) return false;
  state.inventory[state.player.weapon.id] = state.player.weapon;
  state.player.weapon = state.inventory[id];
  return true;
}

export function reloadWeapon(state: EncounterState): void {
  state.player.weapon = startReload(state.player.weapon);
  state.inventory[state.player.weapon.id] = state.player.weapon;
}

function defeat(
  state: EncounterState,
  target: WorldEntity,
  events: SimulationEvent[],
) {
  const wasAlive = target.alive;
  const outcome = resolveEntityDefeat(target, state.entities);
  if (wasAlive && !target.alive && isEnemy(target)) state.kills += 1;
  if (outcome) events.push({ type: 'campaign', name: outcome, id: target.id });
}

export function aimedTarget(
  state: EncounterState,
  world: WorldDefinition,
  maxAngle = 0.19,
  range = 16,
): WorldEntity | null {
  const camera = cameraActor(state);
  return (
    state.entities
      .filter(
        (e) =>
          e.alive &&
          !e.allied &&
          e.id !== state.droneId &&
          (isEnemy(e) || e.kind === 'anchor'),
      )
      .map((entity) => ({
        entity,
        distance: Math.hypot(entity.x - camera.x, entity.y - camera.y),
        angle: Math.abs(
          shortestAngle(
            camera.angle,
            Math.atan2(entity.y - camera.y, entity.x - camera.x),
          ),
        ),
      }))
      .filter(
        (e) =>
          e.distance <= range &&
          e.angle < maxAngle &&
          lineOfSight(world.map, camera.x, camera.y, e.entity.x, e.entity.y),
      )
      .sort((a, b) => a.distance - b.distance)[0]?.entity ?? null
  );
}

export function shoot(
  state: EncounterState,
  world: WorldDefinition,
  save: SaveData,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  if (state.player.health <= 0) return events;
  const drone = state.entities.find((e) => e.id === state.droneId && e.alive);
  if (drone) {
    if ((drone.attackLeft ?? 0) > 0) return events;
    drone.attackLeft = 0.35;
    const target = aimedTarget(state, world, 0.2, 7);
    if (target) {
      Object.assign(target, applyDamage(target.health, target.armor, 18, 0.3));
      defeat(state, target, events);
      state.hitMarker = 0.15;
    }
    events.push({ type: 'sound', name: 'interact', weapon: 'smg' });
    return events;
  }
  const fired = fireWeapon(state.player.weapon);
  if (!fired.fired) {
    if (state.player.weapon.ammo === 0) reloadWeapon(state);
    return events;
  }
  state.shots += 1;
  state.player.weapon = fired.state;
  state.inventory[fired.state.id] = fired.state;
  const spec = WEAPONS[fired.state.id];
  const body = save.campaign.bodyId;
  state.player.recoil = Math.min(
    0.2,
    state.player.recoil + spec.recoil * (body === 'mole' ? 0.5 : 1),
  );
  if (spec.id !== 'blade') state.noise = spec.id === 'pistol' ? 1 : 2.5;
  events.push({ type: 'sound', name: 'interact', weapon: spec.id });
  const spread =
    (save.settings.aimAssist ? 0.2 : 0.11) / (1 + state.player.recoil * 2);
  const target = aimedTarget(
    state,
    world,
    spec.id === 'blade' ? 0.5 : spread,
    spec.range,
  );
  if (!target) return events;
  state.hits += 1;
  state.hitMarker = 0.16;
  const distance = Math.hypot(
    target.x - state.player.x,
    target.y - state.player.y,
  );
  const behind =
    Math.abs(
      shortestAngle(
        target.angle,
        Math.atan2(state.player.y - target.y, state.player.x - target.x),
      ),
    ) > 2;
  const backstab = spec.id === 'blade' && behind ? 3 : 1;
  const specialty =
    (body === 'mistral' && (spec.id === 'pistol' || spec.id === 'blade')) ||
    (body === 'mole' && (spec.id === 'rifle' || spec.id === 'smg'))
      ? 1.15
      : 1;
  const damage =
    fired.damage *
    backstab *
    specialty *
    (1 + save.talents.executor * 0.08) *
    Math.max(0.6, 1 - distance / (spec.range * 2.5));
  Object.assign(
    target,
    applyDamage(
      target.health,
      target.armor,
      damage,
      spec.armorPiercing + save.station.arsenal * 0.05,
    ),
  );
  if (isEnemy(target)) {
    target.hostile = true;
    target.awareness = 1;
    target.memory = 7;
    target.state = 'combat';
  }
  defeat(state, target, events);
  return events;
}

export function pulse(
  state: EncounterState,
  world: WorldDefinition,
  save: SaveData,
): SimulationEvent[] {
  const cost = 28 - save.talents.cybermancy * 3;
  if (state.player.health <= 0 || state.player.neural < cost)
    return [{ type: 'sound', name: 'denied' }];
  state.player.neural -= cost;
  const events: SimulationEvent[] = [{ type: 'sound', name: 'impulse' }];
  const camera = cameraActor(state);
  for (const entity of state.entities) {
    if (!entity.alive || !isEnemy(entity) || entity.allied) continue;
    if (
      Math.hypot(entity.x - camera.x, entity.y - camera.y) > 4.1 ||
      !lineOfSight(world.map, camera.x, camera.y, entity.x, entity.y)
    )
      continue;
    const effect = impulseEffect(
      entity.kind as 'guard' | 'heavy' | 'drone' | 'boss',
    );
    entity.armor = Math.max(0, entity.armor - effect.armorDamage);
    entity.health = Math.max(
      0,
      entity.health -
        effect.damage *
          (1 +
            save.talents.cybermancy * 0.2 +
            (save.campaign.bodyId === 'sibylle' ? 0.25 : 0)),
    );
    entity.stunLeft = effect.stun;
    entity.state = 'disabled';
    entity.hostile = true;
    defeat(state, entity, events);
  }
  return events;
}

export function nearestInteraction(
  state: EncounterState,
  world: WorldDefinition,
): WorldEntity | null {
  const actor = cameraActor(state);
  return (
    state.entities
      .filter(
        (e) =>
          e.alive &&
          e.interactable &&
          Math.hypot(e.x - actor.x, e.y - actor.y) < 1.65 &&
          Math.abs(
            shortestAngle(
              actor.angle,
              Math.atan2(e.y - actor.y, e.x - actor.x),
            ),
          ) < 1.2 &&
          lineOfSight(world.map, actor.x, actor.y, e.x, e.y),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - actor.x, a.y - actor.y) -
          Math.hypot(b.x - actor.x, b.y - actor.y),
      )[0] ?? null
  );
}

export function interact(
  state: EncounterState,
  world: WorldDefinition,
): SimulationEvent[] {
  const target = nearestInteraction(state, world);
  if (!target || state.player.health <= 0) return [];
  if (target.kind === 'terminal')
    return [{ type: 'hack', id: target.id, label: target.label }];
  if (target.kind === 'exit') {
    if (state.entities.some((e) => e.id === 'mission-data' && e.alive)) {
      state.notice = 'Les archives doivent être copiées avant l’extraction.';
      return [];
    }
    return [{ type: 'campaign', name: 'operation-extracted' }];
  }
  target.alive = false;
  if (target.kind === 'anchor')
    return [
      { type: 'campaign', name: 'anchor-destroyed', id: target.id },
      { type: 'sound', name: 'success' },
    ];
  if (target.kind === 'loot') {
    state.player.health = Math.min(
      state.player.maxHealth,
      state.player.health + 45,
    );
    state.player.armor = Math.min(
      state.player.maxArmor,
      state.player.armor + 25,
    );
    for (const id of Object.keys(state.inventory) as WeaponId[])
      if (id !== 'blade') state.inventory[id].reserve += WEAPONS[id].magazine;
    state.notice = 'Réserve récupérée : intégrité, blindage et munitions.';
    return [
      { type: 'campaign', name: 'loot-collected', id: target.id },
      { type: 'sound', name: 'success' },
    ];
  }
  return [];
}

export function possessDrone(
  state: EncounterState,
  world: WorldDefinition,
  id: string,
  save: SaveData,
): boolean {
  const drone = state.entities.find(
    (e) => e.id === id && e.alive && e.kind === 'drone',
  );
  const cost = save.campaign.bodyId === 'sibylle' ? 18 : 32;
  if (
    !drone ||
    state.player.neural < cost ||
    Math.hypot(drone.x - state.player.x, drone.y - state.player.y) >
      8 + save.talents.interface
  )
    return false;
  // Network possession uses proximity, not optical line of sight.
  if (!canOccupy(world.map, drone.x, drone.y)) return false;
  state.player.neural -= cost;
  drone.allied = true;
  drone.hostile = false;
  drone.state = 'patrol';
  drone.stunLeft = 0;
  state.droneId = id;
  state.notice =
    'Drone incarné. Votre corps reste au point d’entrée. Chair pour revenir.';
  return true;
}

function moveToward(
  entity: WorldEntity,
  x: number,
  y: number,
  map: number[][],
  distance: number,
) {
  let target = { x, y };
  if (!lineOfSight(map, entity.x, entity.y, x, y))
    target = findPath(map, entity.x, entity.y, x, y)[0] ?? target;
  const dx = target.x - entity.x,
    dy = target.y - entity.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.05) return;
  entity.angle = Math.atan2(dy, dx);
  const step = Math.min(distance, length);
  if (canOccupy(map, entity.x + (dx / length) * step, entity.y, 0.18))
    entity.x += (dx / length) * step;
  if (canOccupy(map, entity.x, entity.y + (dy / length) * step, 0.18))
    entity.y += (dy / length) * step;
}

/** All gameplay time runs through here. Pausing never advances AI, timers or resources. */
export function stepEncounter(
  state: EncounterState,
  world: WorldDefinition,
  save: SaveData,
  input: InputFrame,
  seconds: number,
  mode: GameMode,
  paused = false,
): SimulationEvent[] {
  if (paused || state.player.health <= 0) return [];
  const dt = Math.max(0, Math.min(seconds, 0.05));
  const tacticalScale = Math.max(0.15, 0.32 - save.station.cortex * 0.04);
  const time =
    dt * (mode === 'cortex' ? tacticalScale : state.droneId ? 0.4 : 1);
  const events: SimulationEvent[] = [];
  const player = state.player;
  state.elapsed += dt;
  state.noise = Math.max(0, state.noise - time);
  state.hitMarker = Math.max(0, state.hitMarker - dt);
  if (mode !== 'spectre') state.droneId = null;
  if (state.droneId) {
    player.neural = Math.max(0, player.neural - dt * 4);
    if (
      player.neural === 0 ||
      !state.entities.some((e) => e.id === state.droneId && e.alive)
    )
      state.droneId = null;
  } else
    player.neural = Math.min(
      player.maxNeural,
      player.neural + time * (save.campaign.bodyId === 'sibylle' ? 4 : 2.3),
    );
  if (state.stage === 'revocation') {
    state.revocationLeft = Math.max(0, state.revocationLeft - time);
    if (state.revocationLeft === 0) player.health = 0;
  }
  if (mode !== 'cortex') {
    const actor = cameraActor(state);
    actor.angle = normalizeAngle(
      actor.angle + input.turn * dt * (1.8 + save.settings.sensitivity * 1.8),
    );
    const speed =
      (state.droneId
        ? 2.8
        : BODIES[save.campaign.bodyId ?? 'mistral'].mobility *
          (input.crouch ? 1.15 : input.sprint ? 3.3 : 2.3)) * dt;
    const length = Math.max(1, Math.hypot(input.forward, input.strafe));
    const dx =
      ((Math.cos(actor.angle) * input.forward -
        Math.sin(actor.angle) * input.strafe) /
        length) *
      speed;
    const dy =
      ((Math.sin(actor.angle) * input.forward +
        Math.cos(actor.angle) * input.strafe) /
        length) *
      speed;
    if (canOccupy(world.map, actor.x + dx, actor.y, 0.2)) actor.x += dx;
    if (canOccupy(world.map, actor.x, actor.y + dy, 0.2)) actor.y += dy;
  }
  for (const id of Object.keys(state.inventory) as WeaponId[])
    state.inventory[id] = tickWeapon(state.inventory[id], time);
  player.weapon = state.inventory[player.weapon.id];
  player.recoil = Math.max(0, player.recoil - dt * 0.7);
  player.hurtFlash = Math.max(0, player.hurtFlash - dt * 0.8);
  if (input.fire) events.push(...shoot(state, world, save));

  for (const entity of state.entities) {
    if (!entity.alive) continue;
    entity.attackLeft = Math.max(0, (entity.attackLeft ?? 0) - time);
    if ((entity.stunLeft ?? 0) > 0) {
      entity.stunLeft = Math.max(0, entity.stunLeft! - time);
      if (!entity.stunLeft) entity.state = 'search';
      continue;
    }
    // Sabotage initially disables a drone, but it can still be possessed.
    if (entity.state === 'disabled') continue;
    if (entity.id === state.droneId) continue;
    if (entity.kind === 'nara' || entity.allied) {
      if (entity.kind === 'nara' && !save.companions.nara.recruited) continue;
      const order = entity.allied ? 'cover' : save.companions.nara.order;
      const anchor =
        order === 'interact'
          ? state.entities
              .filter((e) => e.alive && e.kind === 'anchor')
              .sort(
                (a, b) =>
                  Math.hypot(a.x - entity.x, a.y - entity.y) -
                  Math.hypot(b.x - entity.x, b.y - entity.y),
              )[0]
          : null;
      if (anchor) {
        if (Math.hypot(anchor.x - entity.x, anchor.y - entity.y) < 0.9) {
          anchor.health = 0;
          defeat(state, anchor, events);
        } else moveToward(entity, anchor.x, anchor.y, world.map, time * 1.8);
      } else if (
        order !== 'hold' &&
        Math.hypot(player.x - entity.x, player.y - entity.y) > 1.8
      )
        moveToward(entity, player.x, player.y, world.map, time * 2);
      if (order === 'hold' || anchor) continue;
      const candidates = state.entities.filter(
        (e) =>
          e.alive &&
          e.hostile &&
          !e.allied &&
          isEnemy(e) &&
          Math.hypot(e.x - entity.x, e.y - entity.y) < 7 &&
          lineOfSight(world.map, entity.x, entity.y, e.x, e.y),
      );
      const target =
        candidates.find((e) => order === 'focus' && e.id === state.focusId) ??
        candidates[0];
      if (target && entity.attackLeft === 0) {
        Object.assign(
          target,
          applyDamage(
            target.health,
            target.armor,
            (entity.allied ? 16 : 21) * (1 + save.station.cortex * 0.2),
            0.25,
          ),
        );
        entity.attackLeft = 0.9;
        defeat(state, target, events);
      }
      continue;
    }
    if (!isEnemy(entity)) continue;
    const distance = Math.hypot(player.x - entity.x, player.y - entity.y);
    const visible = lineOfSight(
      world.map,
      entity.x,
      entity.y,
      player.x,
      player.y,
    );
    const viewAngle = Math.abs(
      shortestAngle(
        entity.angle,
        Math.atan2(player.y - entity.y, player.x - entity.x),
      ),
    );
    const range =
      (entity.kind === 'drone' ? 8 : 6.5) *
      (input.crouch ? 0.65 : 1) *
      (1 - save.talents.ghost * 0.12);
    const disguise =
      state.stage === 'docks' &&
      save.campaign.route === 'identity' &&
      !entity.hostile;
    const sees =
      visible &&
      distance < (disguise ? 1.6 : range) &&
      (viewAngle < 1.25 || distance < 1.6 || entity.state === 'combat');
    const hears = state.noise > 0 && distance < (state.noise > 1 ? 10 : 4);
    if (sees || hears) {
      entity.awareness = Math.min(
        1,
        (entity.awareness ?? 0) + time * (hears ? 3 : disguise ? 0.25 : 1.2),
      );
      entity.targetX = player.x;
      entity.targetY = player.y;
      entity.memory = 6;
    } else {
      entity.awareness = Math.max(0, (entity.awareness ?? 0) - time * 0.12);
      entity.memory = Math.max(0, (entity.memory ?? 0) - time);
    }
    if ((entity.awareness ?? 0) >= 1) {
      entity.hostile = true;
      entity.state = 'combat';
    } else if ((entity.awareness ?? 0) > 0.15) entity.state = 'suspicion';
    if (!entity.memory && entity.state === 'combat') entity.state = 'search';
    const active =
      entity.hostile &&
      (entity.state === 'combat' || entity.state === 'search');
    if (active && entity.memory) {
      const attackRange =
        entity.kind === 'heavy' ? 3.5 : entity.kind === 'boss' ? 4 : 4.5;
      if (!visible || distance > attackRange)
        moveToward(
          entity,
          entity.targetX ?? player.x,
          entity.targetY ?? player.y,
          world.map,
          time * (entity.kind === 'heavy' ? 0.85 : 1.15),
        );
      else {
        entity.angle = Math.atan2(player.y - entity.y, player.x - entity.x);
        if (entity.attackLeft === 0 && sees) {
          const difficulty =
            save.settings.difficulty === 'story'
              ? 0.4
              : save.settings.difficulty === 'hard'
                ? 1.4
                : 1;
          const damage =
            (entity.kind === 'boss'
              ? 16
              : entity.kind === 'heavy'
                ? 13
                : entity.kind === 'drone'
                  ? 6
                  : 8) * difficulty;
          const hit = applyDamage(
            player.health,
            player.armor,
            damage,
            entity.kind === 'boss' ? 0.2 : 0.05,
          );
          player.health = hit.health;
          player.armor = hit.armor;
          player.hurtFlash = 0.35;
          entity.attackLeft =
            entity.kind === 'boss' ? 1.5 : entity.kind === 'drone' ? 1.4 : 1.8;
          events.push({ type: 'sound', name: 'damage' });
        }
      }
    } else if (!disguise) {
      // Patrol turns in place, then returns home after losing contact.
      if (
        entity.homeX !== undefined &&
        Math.hypot(entity.x - entity.homeX, entity.y - entity.homeY!) > 0.5
      )
        moveToward(entity, entity.homeX, entity.homeY!, world.map, time * 0.65);
      else entity.angle = normalizeAngle(entity.angle + time * 0.25);
      if (!entity.memory) entity.state = 'patrol';
    }
  }
  if (player.health <= 0) {
    state.droneId = null;
    events.push({ type: 'death' });
  }
  return events;
}
