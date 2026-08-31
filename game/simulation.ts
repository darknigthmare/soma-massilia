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
import { createDistrictWorld } from './districts';
import { implantBonuses } from './campaign';
import { AGENTS, DISTRICTS } from './campaign-data';
import type { AgentId } from './continuity-types';
import type {
  DronePackage,
  EngagementPolicy,
  EncounterState,
  GameMode,
  NaraOrder,
  SaveData,
  TacticalCommand,
  WeaponId,
  WeaponCalibration,
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
export type SimulationCampaignEventName =
  | 'anchor-destroyed'
  | 'collector-transfer'
  | 'collector-defeated'
  | 'expedition-extracted'
  | 'objective-completed'
  | 'operation-extracted'
  | 'loot-collected'
  | 'mistral-wave'
  | 'emergency-transfer'
  | 'drone-recovery';

export type SimulationEvent =
  | {
      type: 'sound';
      name: 'interact' | 'impulse' | 'damage' | 'denied' | 'success' | 'reload';
      weapon?: WeaponId;
    }
  | {
      type: 'combat';
      name: 'hit' | 'incapacitated' | 'restrained' | 'defeated' | 'sync';
      sourceId: string;
      targetId: string;
      damage?: number;
      nonLethal?: boolean;
    }
  | { type: 'campaign'; name: SimulationCampaignEventName; id?: string }
  | { type: 'hack'; id: string; label: string }
  | { type: 'dialogue'; id: string; label: string }
  | { type: 'death' };
export const isEnemy = (entity: WorldEntity) =>
  ['guard', 'heavy', 'drone', 'boss'].includes(entity.kind);
const AGENT_IDS: AgentId[] = ['nara', 'idris', 'salome'];
const POLICIES: EngagementPolicy[] = [
  'hold-fire',
  'return-fire',
  'non-lethal',
  'weapons-free',
];
const WEAPON_CALIBRATIONS: WeaponCalibration[] = [
  'none',
  'precision',
  'rupture',
  'quiet',
];
const DRONE_PACKAGES: DronePackage[] = ['none', 'scout', 'recovery'];
export const MAX_TACTICAL_QUEUE = 3;
const SYNC_TIMEOUT_SECONDS = 5;

function normalizedWeaponCalibration(value: unknown): WeaponCalibration {
  return WEAPON_CALIBRATIONS.includes(value as WeaponCalibration)
    ? (value as WeaponCalibration)
    : 'none';
}

function normalizedDronePackage(value: unknown): DronePackage {
  return DRONE_PACKAGES.includes(value as DronePackage)
    ? (value as DronePackage)
    : 'none';
}

export function engagementPolicy(
  save: SaveData,
  id: AgentId,
): EngagementPolicy {
  const profile = save.continuity.agents[
    id
  ] as (typeof save.continuity.agents)[AgentId] & {
    engagementPolicy?: EngagementPolicy;
  };
  return POLICIES.includes(profile.engagementPolicy ?? 'weapons-free')
    ? (profile.engagementPolicy ?? 'weapons-free')
    : 'weapons-free';
}

function tacticalQueues(
  state: EncounterState,
): Record<AgentId, TacticalCommand[]> {
  state.tacticalQueues ??= { nara: [], idris: [], salome: [] };
  for (const id of AGENT_IDS) state.tacticalQueues[id] ??= [];
  state.tacticalSequence ??= 0;
  return state.tacticalQueues;
}

function advanceSynchronizedCommandClock(
  state: EncounterState,
  wallTime: number,
  tacticalTime: number,
): void {
  const slowedTime = Math.max(0, wallTime - tacticalTime);
  if (slowedTime === 0) return;
  // issuedAt remains in the encounter clock domain, but its effective epoch
  // advances while the simulation is slowed. Therefore sync age accrues only
  // at the same tactical rate as movement and weapon cooldowns, including
  // across save/resume without adding a second persisted clock.
  for (const queue of Object.values(tacticalQueues(state)))
    for (const command of queue)
      if (command.order === 'sync') command.issuedAt += slowedTime;
}

function setAction(
  entity: WorldEntity,
  actionState: NonNullable<WorldEntity['actionState']>,
  seconds: number,
): void {
  entity.actionState = actionState;
  entity.actionLeft = Math.max(entity.actionLeft ?? 0, seconds);
}

function isCapturable(entity: WorldEntity): boolean {
  return (
    entity.alive &&
    isEnemy(entity) &&
    entity.kind !== 'boss' &&
    !entity.allied &&
    entity.captureState !== 'restrained'
  );
}

export function missionWorld(save: SaveData): WorldDefinition {
  if (save.campaign.stage === 'district') return createDistrictWorld(save);
  return createWorld(
    save.campaign.stage,
    save.campaign.route,
    save.campaign.collectorAnchors,
    save.activeOperation,
  );
}

export function createEncounter(save: SaveData): EncounterState {
  const world = missionWorld(save);
  const implants = implantBonuses(save);
  const weaponCalibration = normalizedWeaponCalibration(
    save.continuity.facilityReadiness?.weaponCalibration,
  );
  const dronePackage = normalizedDronePackage(
    save.continuity.facilityReadiness?.dronePackage,
  );
  const emergencyAgent = AGENTS.some(
    (agent) => agent.id === save.continuity.facilityReadiness?.emergencyAgent,
  )
    ? save.continuity.facilityReadiness.emergencyAgent
    : null;
  const body = BODIES[save.campaign.bodyId ?? 'mistral'];
  const health =
    body.integrity +
    save.talents.soma * 15 +
    save.station.clinic * 10 +
    implants.health;
  const armor = body.armor + save.station.clinic * 10 + implants.armor;
  const neural =
    body.neural +
    save.talents.interface * 15 +
    save.station.spectre * 10 +
    implants.neural;
  const inventory = Object.fromEntries(
    (Object.keys(WEAPONS) as WeaponId[]).map((id) => [
      id,
      createWeaponState(
        id,
        Math.round(WEAPONS[id].reserve * (1 + save.station.arsenal * 0.2)),
      ),
    ]),
  ) as EncounterState['inventory'];
  const entities: WorldEntity[] = world.entities.map((item) => ({
    ...item,
    homeX: item.x,
    homeY: item.y,
    attackLeft: 1.5,
    awareness: 0,
    memory: 0,
    actionState: 'idle',
    actionLeft: 0,
    motionPhase: 0,
    muzzleFlash: 0,
    impactFlash: 0,
    captureState:
      item.captureState ??
      (isEnemy(item) && item.kind !== 'boss' && !item.allied
        ? 'active'
        : undefined),
  }));
  // Recruited adults join as distinct actors, never as extra copies of Nara.
  if (
    save.campaign.stage === 'district' ||
    save.campaign.stage === 'operation' ||
    save.campaign.stage === 'collector'
  ) {
    for (const id of ['nara', 'idris', 'salome'] as AgentId[]) {
      if (!isAgentRecruited(save, id)) continue;
      const existing = entities.find(
        (e) => e.agentId === id || (id === 'nara' && e.id === 'nara'),
      );
      if (existing) {
        existing.agentId = id;
        continue;
      }
      const position = nearbyFloor(
        world.map,
        world.start.x,
        world.start.y,
        entities,
      );
      entities.push({
        id: 'squad-' + id,
        kind: 'nara',
        agentId: id,
        ...position,
        angle: world.start.angle,
        health: id === 'idris' ? 180 : 110,
        maxHealth: id === 'idris' ? 180 : 110,
        armor: id === 'idris' ? 80 : 25,
        alive: true,
        hostile: false,
        label: AGENT_NAMES[id],
        attackLeft: 0,
        supportLeft: 0,
        actionState: 'idle',
        actionLeft: 0,
        motionPhase: 0,
        muzzleFlash: 0,
        impactFlash: 0,
      });
    }
  }
  const sealedCivilianZone =
    save.campaign.stage === 'station' ||
    save.continuity.active?.mission === 'velvet' ||
    save.continuity.active?.district === 'station';
  if (
    dronePackage === 'scout' &&
    !sealedCivilianZone &&
    !entities.some((entity) => entity.id === 'facility.scout-drone')
  ) {
    const position = nearbyFloor(
      world.map,
      world.start.x,
      world.start.y,
      entities,
    );
    entities.push({
      id: 'facility.scout-drone',
      kind: 'drone',
      ...position,
      angle: world.start.angle,
      health: 72,
      maxHealth: 72,
      armor: 30,
      alive: true,
      state: 'patrol',
      hostile: false,
      allied: true,
      label: 'Drone éclaireur Cellule NULL',
      homeX: position.x,
      homeY: position.y,
      attackLeft: 0,
      supportLeft: 0,
      awareness: 0,
      memory: 0,
      actionState: 'idle',
      actionLeft: 0,
      motionPhase: 0,
      muzzleFlash: 0,
      impactFlash: 0,
    });
  }
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
    targetSystem: 'torso',
    selectedAgent: save.continuity.selectedAgent,
    tacticalQueues: { nara: [], idris: [], salome: [] },
    tacticalSequence: 0,
    weaponCalibration,
    dronePackage,
    emergencyAgent,
    emergencyUsed: false,
    recoveryUsed: false,
  };
}

export const AGENT_NAMES = Object.fromEntries(
  AGENTS.map((agent) => [agent.id, agent.name]),
) as Record<AgentId, string>;
export function isAgentRecruited(save: SaveData, id: AgentId): boolean {
  return (
    save.continuity.agents[id].recruited ||
    (id === 'nara' && save.companions.nara.recruited)
  );
}
export function agentOrder(save: SaveData, id: AgentId): NaraOrder {
  return id === 'nara' && !save.continuity.agents.nara.recruited
    ? save.companions.nara.order
    : save.continuity.agents[id].order;
}
function nearbyFloor(
  map: number[][],
  x: number,
  y: number,
  entities: WorldEntity[],
) {
  for (let radius = 0; radius <= 3; radius++)
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++) {
        const px = Math.floor(x) + dx + 0.5,
          py = Math.floor(y) + dy + 0.5;
        if (
          canOccupy(map, px, py) &&
          !entities.some(
            (e) => e.alive && Math.hypot(e.x - px, e.y - py) < 0.45,
          )
        )
          return { x: px, y: py };
      }
  return { x, y };
}

export interface TacticalCommandOptions {
  x?: number;
  y?: number;
  targetId?: string;
}

export function queueTacticalCommand(
  state: EncounterState,
  save: SaveData,
  id: AgentId,
  order: NaraOrder,
  world: WorldDefinition,
  options: TacticalCommandOptions = {},
): boolean {
  const agent = state.entities.find(
    (entity) =>
      entity.alive &&
      (entity.agentId === id || (id === 'nara' && entity.id === 'nara')),
  );
  const queue = tacticalQueues(state)[id];
  if (
    !agent ||
    !isAgentRecruited(save, id) ||
    queue.length >= MAX_TACTICAL_QUEUE
  )
    return false;

  let x = options.x,
    y = options.y,
    targetId = options.targetId;
  if (order === 'retreat') {
    x ??= world.start.x;
    y ??= world.start.y;
  }
  if (order === 'move' || order === 'retreat') {
    if (
      x === undefined ||
      y === undefined ||
      !canOccupy(world.map, x, y) ||
      (!lineOfSight(world.map, agent.x, agent.y, x, y) &&
        findPath(world.map, agent.x, agent.y, x, y).length === 0)
    )
      return false;
  }
  if (order === 'focus' || order === 'sync' || order === 'capture') {
    const target =
      state.entities.find((entity) => entity.id === targetId) ??
      aimedTarget(state, world);
    if (
      !target ||
      !isEnemy(target) ||
      target.allied ||
      (order === 'capture' && !isCapturable(target))
    )
      return false;
    targetId = target.id;
  }
  const command: TacticalCommand = {
    id: state.tacticalSequence!,
    order,
    issuedAt: state.elapsed,
    ...(x === undefined ? {} : { x }),
    ...(y === undefined ? {} : { y }),
    ...(targetId === undefined ? {} : { targetId }),
  };
  state.tacticalSequence! += 1;
  queue.push(command);
  state.selectedAgent = id;
  return true;
}

export function clearTacticalQueue(state: EncounterState, id: AgentId): void {
  tacticalQueues(state)[id] = [];
}

/** Each actor retains its own tactical target. */
export function commandAgent(
  state: EncounterState,
  save: SaveData,
  id: AgentId,
  order: NaraOrder,
  world: WorldDefinition,
  x?: number,
  y?: number,
): boolean {
  const agent = state.entities.find(
    (e) => e.alive && (e.agentId === id || (id === 'nara' && e.id === 'nara')),
  );
  if (!agent || !isAgentRecruited(save, id)) return false;
  if (order === 'sync' || order === 'capture' || order === 'retreat')
    return queueTacticalCommand(state, save, id, order, world, { x, y });
  if (order === 'move') {
    if (
      x === undefined ||
      y === undefined ||
      !canOccupy(world.map, x, y) ||
      (!lineOfSight(world.map, agent.x, agent.y, x, y) &&
        findPath(world.map, agent.x, agent.y, x, y).length === 0)
    )
      return false;
    agent.targetX = x;
    agent.targetY = y;
  } else if (order === 'cover' || order === 'hold') {
    agent.targetX = agent.x;
    agent.targetY = agent.y;
  }
  if (order === 'focus') agent.focusId = aimedTarget(state, world)?.id ?? null;
  agent.tacticalOrder = order;
  state.selectedAgent = id;
  return true;
}

export function canPossessHuman(save: SaveData): boolean {
  return (
    save.continuity.implants.includes('cortex-puppet') ||
    save.continuity.skills.includes('interface-3')
  );
}

/** Loss of functions is staged; the final route remains walkable and hackable. */
export function revocationPhase(state: EncounterState): 0 | 1 | 2 | 3 {
  if (state.stage !== 'revocation') return 0;
  return state.revocationLeft <= 30
    ? 3
    : state.revocationLeft <= 75
      ? 2
      : state.revocationLeft <= 135
        ? 1
        : 0;
}

/** A low railing occupies one tile. Solid walls, thick barriers and unsafe landings cannot be crossed. */
export function vaultObstacle(
  state: EncounterState,
  world: WorldDefinition,
): boolean {
  if (
    state.player.health <= 0 ||
    state.droneId ||
    state.player.neural < 8 ||
    (state.player.vaultLift ?? 0) > 0
  )
    return false;
  const player = state.player,
    c = Math.cos(player.angle),
    s = Math.sin(player.angle);
  const dx = Math.abs(c) >= Math.abs(s) ? Math.sign(c) : 0,
    dy = dx === 0 ? Math.sign(s) : 0;
  const cellX = Math.floor(player.x),
    cellY = Math.floor(player.y);
  const x = cellX + dx * 2 + 0.5,
    y = cellY + dy * 2 + 0.5;
  if (
    world.map[cellY + dy]?.[cellX + dx] !== 2 ||
    !canOccupy(world.map, x, y)
  ) {
    state.notice = 'Aucun rebord bas franchissable avec une réception sûre.';
    return false;
  }
  player.x = x;
  player.y = y;
  player.neural -= 8;
  player.vaultLift = 0.8;
  state.notice = 'Rebord franchi · charge −8.';
  return true;
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
  const preparedSave = previous
    ? {
        ...save,
        continuity: {
          ...save.continuity,
          facilityReadiness: {
            ...save.continuity.facilityReadiness,
            weaponCalibration: normalizedWeaponCalibration(
              previous.weaponCalibration,
            ),
            dronePackage: normalizedDronePackage(previous.dronePackage),
            emergencyAgent: previous.emergencyAgent,
          },
        },
      }
    : save;
  const retry = createEncounter(
    save.campaign.stage === 'collector' && previous
      ? {
          ...preparedSave,
          campaign: { ...save.campaign, collectorAnchors: 3 },
        }
      : preparedSave,
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

export function reloadWeapon(state: EncounterState): SimulationEvent[] {
  const current = state.player.weapon;
  state.player.weapon = startReload(current);
  state.inventory[state.player.weapon.id] = state.player.weapon;
  return state.player.weapon === current
    ? []
    : [{ type: 'sound', name: 'reload', weapon: state.player.weapon.id }];
}

function defeat(
  state: EncounterState,
  target: WorldEntity,
  events: SimulationEvent[],
  sourceId = 'system',
) {
  const wasAlive = target.alive;
  const outcome = resolveEntityDefeat(target, state.entities);
  if (wasAlive && !target.alive) {
    setAction(target, 'dead', 0);
    if (isEnemy(target)) {
      state.kills += 1;
      events.push({
        type: 'combat',
        name: 'defeated',
        sourceId,
        targetId: target.id,
      });
    }
  } else if (outcome === 'collector-transfer') {
    target.impactFlash = 0.25;
    setAction(target, 'hurt', 0.3);
  }
  if (outcome) events.push({ type: 'campaign', name: outcome, id: target.id });
}

function markImpact(target: WorldEntity): void {
  target.impactFlash = 0.16;
  if (target.alive && target.captureState !== 'incapacitated')
    setAction(target, 'hurt', 0.18);
}

function agentDamage(
  state: EncounterState,
  target: WorldEntity,
  source: WorldEntity,
  damage: number,
  armorPiercing: number,
  nonLethal: boolean,
  events: SimulationEvent[],
): void {
  const before = target.health;
  const result = applyDamage(
    target.health,
    target.armor,
    damage,
    armorPiercing,
  );
  Object.assign(target, result);
  markImpact(target);
  events.push({
    type: 'combat',
    name: 'hit',
    sourceId: source.id,
    targetId: target.id,
    damage: Math.max(0, before - target.health),
    nonLethal,
  });
  if (nonLethal && isEnemy(target) && !target.allied && target.health <= 0) {
    target.health = 1;
    target.captureState = 'incapacitated';
    target.state = 'disabled';
    target.hostile = false;
    target.stunLeft = 0;
    setAction(target, 'incapacitated', 0);
    events.push({
      type: 'combat',
      name: 'incapacitated',
      sourceId: source.id,
      targetId: target.id,
      nonLethal: true,
    });
    return;
  }
  defeat(state, target, events, source.id);
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
  if (
    save.continuity.active?.mission === 'velvet' ||
    save.continuity.active?.district === 'station'
  ) {
    state.notice =
      'Zone civile : armement sous scellés. Les identités se négocient sans violence.';
    return events;
  }
  const implants = implantBonuses(save);
  const drone = state.entities.find((e) => e.id === state.droneId && e.alive);
  if (drone) {
    if ((drone.attackLeft ?? 0) > 0) return events;
    drone.attackLeft = 0.35;
    drone.muzzleFlash = 0.12;
    setAction(drone, 'attack', 0.18);
    const target = aimedTarget(state, world, 0.2, 7);
    if (target) {
      const before = target.health;
      Object.assign(target, applyDamage(target.health, target.armor, 18, 0.3));
      markImpact(target);
      events.push({
        type: 'combat',
        name: 'hit',
        sourceId: drone.id,
        targetId: target.id,
        damage: Math.max(0, before - target.health),
      });
      defeat(state, target, events, drone.id);
      state.hitMarker = 0.15;
    }
    events.push({ type: 'sound', name: 'interact', weapon: 'smg' });
    return events;
  }
  const fired = fireWeapon(state.player.weapon);
  if (!fired.fired) {
    if (state.player.weapon.ammo === 0) events.push(...reloadWeapon(state));
    return events;
  }
  state.shots += 1;
  state.player.weapon = fired.state;
  state.inventory[fired.state.id] = fired.state;
  const spec = WEAPONS[fired.state.id];
  const body = save.campaign.bodyId;
  const precisionCalibration = state.weaponCalibration === 'precision';
  state.player.recoil = Math.min(
    0.2,
    state.player.recoil +
      spec.recoil *
        (body === 'mole' ? 0.5 : 1) *
        (precisionCalibration ? 0.7 : 1),
  );
  if (spec.id !== 'blade')
    state.noise =
      (spec.id === 'pistol' ? 1 : 2.5) *
      (state.weaponCalibration === 'quiet' ? 0.4 : 1);
  events.push({ type: 'sound', name: 'interact', weapon: spec.id });
  const spread =
    ((save.settings.aimAssist ? 0.2 : 0.11) / (1 + state.player.recoil * 2)) *
    (precisionCalibration ? 1.12 : 1);
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
    (1 + implants.damage) *
    (state.targetSystem && state.targetSystem !== 'torso' ? 0.65 : 1) *
    Math.max(0.6, 1 - distance / (spec.range * 2.5));
  Object.assign(
    target,
    applyDamage(
      target.health,
      target.armor,
      damage,
      spec.armorPiercing +
        save.station.arsenal * 0.05 +
        (state.weaponCalibration === 'rupture' ? 0.18 : 0),
    ),
  );
  markImpact(target);
  events.push({
    type: 'combat',
    name: 'hit',
    sourceId: state.droneId ?? 'player',
    targetId: target.id,
    damage,
  });
  // Precision trades raw damage for a durable, visible loss of a synthetic function.
  if (
    state.targetSystem &&
    state.targetSystem !== 'torso' &&
    isEnemy(target) &&
    target.kind !== 'boss'
  ) {
    target.systemDamage = (target.systemDamage ?? 0) + damage;
    if (target.systemDamage >= 18) {
      target.disabledSystem = state.targetSystem;
      target.systemDamage = 0;
      state.notice =
        target.label +
        ' : système ' +
        { motor: 'moteur', weapon: 'd’armement', optical: 'optique' }[
          state.targetSystem
        ] +
        ' neutralisé.';
    }
  }
  if (isEnemy(target)) {
    target.hostile = true;
    target.awareness = 1;
    target.memory = 7;
    target.state = 'combat';
  }
  defeat(state, target, events, state.droneId ?? 'player');
  return events;
}

export function pulse(
  state: EncounterState,
  world: WorldDefinition,
  save: SaveData,
): SimulationEvent[] {
  if (
    save.continuity.active?.mission === 'velvet' ||
    save.continuity.active?.district === 'station'
  ) {
    state.notice = 'Zone civile : impulsion inhibée.';
    return [];
  }
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
            implantBonuses(save).pulse +
            (save.campaign.bodyId === 'sibylle' ? 0.25 : 0)),
    );
    entity.stunLeft = effect.stun;
    entity.state = 'disabled';
    entity.hostile = true;
    markImpact(entity);
    events.push({
      type: 'combat',
      name: 'hit',
      sourceId: 'player',
      targetId: entity.id,
      damage: effect.damage,
    });
    defeat(state, entity, events, 'player');
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

/** The navigation marker follows unfinished work, then the real exit, including peaceful Station Zéro. */
export function navigationObjective(
  state: EncounterState,
  save: SaveData,
): WorldEntity | undefined {
  const pending = state.entities.find(
    (entity) =>
      entity.alive &&
      entity.objective &&
      (!entity.objectiveId ||
        !save.continuity.active?.objectives.includes(entity.objectiveId)),
  );
  if (pending) return pending;
  if (state.stage === 'district')
    return state.entities.find(
      (entity) => entity.alive && entity.interaction === 'extract',
    );
  return state.entities.find(
    (entity) => entity.alive && entity.kind === 'boss',
  );
}

export function interact(
  state: EncounterState,
  world: WorldDefinition,
  save?: SaveData,
): SimulationEvent[] {
  const target = nearestInteraction(state, world);
  if (!target || state.player.health <= 0) return [];
  const objectiveId = target.objectiveId ?? target.id;
  if (
    target.interaction === 'talk' ||
    target.interaction === 'service' ||
    target.interaction === 'transfer'
  )
    return [{ type: 'dialogue', id: objectiveId, label: target.label }];
  if (target.interaction === 'extract') {
    const remaining = state.entities.filter(
      (e) =>
        e.alive &&
        e.objectiveId &&
        e.interaction !== 'extract' &&
        e.interaction !== 'service' &&
        e.interaction !== 'transfer' &&
        e.objective &&
        !save?.continuity.active?.objectives.includes(e.objectiveId),
    );
    if (remaining.length) {
      state.notice =
        'Avant l’extraction : ' + remaining.map((e) => e.label).join(' · ');
      return [];
    }
    return [{ type: 'campaign', name: 'expedition-extracted' }];
  }
  if (target.interaction === 'sabotage') {
    target.alive = false;
    state.notice = target.label + ' : neutralisé.';
    return [
      { type: 'campaign', name: 'objective-completed', id: objectiveId },
      { type: 'sound', name: 'success' },
    ];
  }
  if (target.kind === 'terminal')
    return [{ type: 'hack', id: objectiveId, label: target.label }];
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
  return possessActor(state, world, id, save, true);
}

export function possessActor(
  state: EncounterState,
  world: WorldDefinition,
  id: string,
  save: SaveData,
  dronesOnly = false,
): boolean {
  const drone = state.entities.find(
    (e) =>
      e.id === id &&
      e.alive &&
      (e.kind === 'drone' ||
        (!dronesOnly &&
          canPossessHuman(save) &&
          (e.kind === 'guard' || e.kind === 'heavy'))),
  );
  const bonus = implantBonuses(save);
  const stormClock = state.stormTime ?? 0;
  const stormDisabled =
    drone?.kind === 'drone' &&
    (drone.stunLeft ?? 0) > 0 &&
    save.continuity.active?.mission === 'mistral' &&
    stormClock >= 18 &&
    stormClock % 18 < 3;
  const cost =
    (save.campaign.bodyId === 'sibylle' ? 18 : 32) *
    (drone?.kind === 'drone' ? 1 : 1.5) *
    Math.max(0.25, 1 - bonus.possession);
  if (
    !drone ||
    stormDisabled ||
    state.droneId !== null ||
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
    (drone.kind === 'drone'
      ? 'Drone incarné.'
      : 'Enveloppe distante incarnée.') +
    ' Votre corps reste exposé. Chair pour revenir.';
  return true;
}

/** Spectre reaches a local network endpoint, including endpoints behind a physical wall. */
export function hackNetwork(
  state: EncounterState,
  save: SaveData,
  id: string,
): SimulationEvent[] {
  const target = state.entities.find(
    (e) =>
      e.alive &&
      e.interactable !== false &&
      (e.id === id || e.objectiveId === id) &&
      e.interaction === 'hack',
  );
  const cost = 8 * Math.max(0.25, 1 - implantBonuses(save).possession);
  const actor = cameraActor(state);
  if (
    !target ||
    Math.hypot(target.x - actor.x, target.y - actor.y) >
      5 + save.talents.interface ||
    state.player.neural < cost ||
    state.player.health <= 0
  ) {
    state.notice = 'Point réseau hors portée ou charge insuffisante.';
    return [];
  }
  state.player.neural -= cost;
  return [
    { type: 'hack', id: target.objectiveId ?? target.id, label: target.label },
  ];
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
  const step = Math.min(
    distance * (entity.disabledSystem === 'motor' ? 0.25 : 1),
    length,
  );
  if (step > 0) {
    if (
      (entity.actionLeft ?? 0) <= 0 ||
      entity.actionState === 'idle' ||
      entity.actionState === 'move'
    )
      setAction(entity, 'move', 0.12);
    entity.motionPhase = (entity.motionPhase ?? 0) + step * 8;
  }
  if (canOccupy(map, entity.x + (dx / length) * step, entity.y, 0.18))
    entity.x += (dx / length) * step;
  if (canOccupy(map, entity.x, entity.y + (dy / length) * step, 0.18))
    entity.y += (dy / length) * step;
}

function squadActor(
  state: EncounterState,
  id: AgentId,
): WorldEntity | undefined {
  return state.entities.find(
    (entity) =>
      entity.alive &&
      (entity.agentId === id || (id === 'nara' && entity.id === 'nara')),
  );
}

function agentCanFire(
  save: SaveData,
  id: AgentId,
  target: WorldEntity,
): boolean {
  const policy = engagementPolicy(save, id);
  if (policy === 'hold-fire') return false;
  if (policy === 'return-fire')
    return target.state === 'combat' || Boolean(target.memory);
  return true;
}

function fireAgentAt(
  state: EncounterState,
  save: SaveData,
  source: WorldEntity,
  id: AgentId,
  target: WorldEntity,
  events: SimulationEvent[],
  forceNonLethal = false,
): boolean {
  if (
    !source.alive ||
    !target.alive ||
    source.attackLeft !== 0 ||
    !agentCanFire(save, id, target)
  )
    return false;
  const profile = save.continuity.agents[id];
  const cooperation = Math.max(0.55, 1 + Math.max(-100, profile.trust) / 300);
  const fatigue = 1 + profile.fatigue / 150;
  const damage =
    (id === 'idris' ? 28 : id === 'salome' ? 12 : 21) *
    (1 + save.station.cortex * 0.2) *
    cooperation;
  source.attackLeft = 0.9 * fatigue;
  source.muzzleFlash = 0.12;
  setAction(source, 'attack', 0.2);
  agentDamage(
    state,
    target,
    source,
    damage,
    0.25,
    forceNonLethal || engagementPolicy(save, id) === 'non-lethal',
    events,
  );
  return true;
}

function resolveSynchronizedOrders(
  state: EncounterState,
  world: WorldDefinition,
  save: SaveData,
  time: number,
  events: SimulationEvent[],
): void {
  const groups = new Map<
    string,
    { id: AgentId; actor: WorldEntity; command: TacticalCommand }[]
  >();
  for (const id of AGENT_IDS) {
    const command = tacticalQueues(state)[id][0];
    if (command?.order !== 'sync' || !command.targetId) continue;
    const actor = squadActor(state, id);
    const target = state.entities.find(
      (entity) => entity.id === command.targetId && entity.alive,
    );
    if (!actor || !target || !isEnemy(target) || target.allied) {
      tacticalQueues(state)[id].shift();
      continue;
    }
    const group = groups.get(target.id) ?? [];
    group.push({ id, actor, command });
    groups.set(target.id, group);
  }
  for (const [targetId, group] of groups) {
    const target = state.entities.find(
      (entity) => entity.id === targetId && entity.alive,
    );
    if (!target) continue;
    if (group.length < 2) {
      const member = group[0];
      if (state.elapsed - member.command.issuedAt >= SYNC_TIMEOUT_SECONDS) {
        tacticalQueues(state)[member.id].shift();
        state.notice =
          AGENT_NAMES[member.id] +
          ' : tir synchronisé annulé, aucun second tireur prêt.';
      }
      continue;
    }
    let ready = true;
    for (const member of group) {
      const distance = Math.hypot(
        target.x - member.actor.x,
        target.y - member.actor.y,
      );
      const visible = lineOfSight(
        world.map,
        member.actor.x,
        member.actor.y,
        target.x,
        target.y,
      );
      if (
        distance > 7 ||
        !visible ||
        member.actor.attackLeft !== 0 ||
        !agentCanFire(save, member.id, target)
      ) {
        ready = false;
        if (distance > 6.2 || !visible)
          moveToward(member.actor, target.x, target.y, world.map, time * 1.6);
      }
    }
    if (!ready) {
      // Start the group timeout when its newest member joins, so a late second
      // shooter still receives a full window to move, cool down or change policy.
      const groupFormedAt = Math.max(
        ...group.map((member) => member.command.issuedAt),
      );
      if (state.elapsed - groupFormedAt >= SYNC_TIMEOUT_SECONDS) {
        for (const member of group) tacticalQueues(state)[member.id].shift();
        state.notice =
          group.map((member) => AGENT_NAMES[member.id]).join(' + ') +
          ' : tir synchronisé annulé, tireurs non prêts ou règles d’engagement incompatibles.';
      }
      continue;
    }
    for (const member of group) {
      if (target.alive && target.captureState !== 'incapacitated')
        fireAgentAt(state, save, member.actor, member.id, target, events);
      else {
        member.actor.muzzleFlash = 0.12;
        setAction(member.actor, 'attack', 0.2);
      }
      tacticalQueues(state)[member.id].shift();
    }
    events.push({
      type: 'combat',
      name: 'sync',
      sourceId: group.map((member) => member.actor.id).join('+'),
      targetId,
    });
    state.notice = 'Cortex : tir synchronisé exécuté.';
  }
}

/** Mistral uses a persisted simulation clock: menus freeze it and Cortex slows it.
 * The source objective, not merely a successful network minigame, ends the storm. */
function stepMistralStorm(
  state: EncounterState,
  save: SaveData,
  time: number,
): SimulationEvent[] {
  const active = save.continuity.active;
  if (
    active?.mission !== 'mistral' ||
    active.objectives.includes('mistral-cable') ||
    state.entities.some(
      (entity) => entity.objectiveId === 'mistral-cable' && !entity.alive,
    )
  )
    return [];
  const previous = state.stormTime ?? 0;
  state.stormTime = previous + time;
  const wave = Math.floor(state.stormTime / 18) > Math.floor(previous / 18);
  if (!wave) {
    if (
      Math.floor((state.stormTime + 3) / 18) > Math.floor((previous + 3) / 18)
    ) {
      state.notice =
        'Mistral Noir — onde électromagnétique dans 3 secondes. Préparez le retour au corps.';
    }
    return [];
  }
  state.player.neural = Math.max(0, state.player.neural - 8);
  state.droneId = null;
  for (const entity of state.entities) {
    if (!entity.alive || entity.kind !== 'drone') continue;
    // A drone already switched off by sabotage must not wake up after this wave.
    if (entity.state === 'disabled' && (entity.stunLeft ?? 0) <= 0) continue;
    entity.stunLeft = Math.max(entity.stunLeft ?? 0, 3 + time);
    entity.state = 'disabled';
  }
  state.notice =
    'Mistral Noir — onde EM : −8 charge. Projection interrompue; drones neutralisés pendant 3 secondes.';
  return [
    { type: 'campaign', name: 'mistral-wave' },
    { type: 'sound', name: 'denied' },
  ];
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
  player.vaultLift = Math.max(0, (player.vaultLift ?? 0) - dt * 2.4);
  const implants = implantBonuses(save);
  const phase = revocationPhase(state);
  const compatibility =
    1 - Math.min(0.25, Math.max(0, save.continuity.somatic - 50) / 200);
  const continuity = Math.min(
    1,
    Math.max(0.6, 0.6 + save.continuity.memory / 125),
  );
  const overdue =
    !save.continuity.lease.owned && save.continuity.lease.debt >= 120;
  const district =
    state.stage === 'district' ? save.continuity.active?.district : undefined;
  const districtDefinition = DISTRICTS.find((item) => item.id === district);
  const reputation = districtDefinition
    ? save.continuity.factions[districtDefinition.faction]
    : 0;
  const liberated =
    district && district !== 'station'
      ? save.continuity.territories[district].liberated
      : false;
  state.elapsed += dt;
  advanceSynchronizedCommandClock(state, dt, time);
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
      player.neural +
        time * (save.campaign.bodyId === 'sibylle' ? 4 : 2.3) * continuity,
    );
  if (player.health > 0 && implants.regen > 0)
    player.health = Math.min(
      player.maxHealth,
      player.health + implants.regen * time,
    );
  if (state.stage === 'revocation') {
    state.revocationLeft = Math.max(0, state.revocationLeft - time);
    if (state.revocationLeft === 0) player.health = 0;
  }
  events.push(...stepMistralStorm(state, save, time));
  if (mode !== 'cortex') {
    const actor = cameraActor(state);
    actor.angle = normalizeAngle(
      actor.angle + input.turn * dt * (1.8 + save.settings.sensitivity * 1.8),
    );
    const speed =
      (state.droneId
        ? 2.8
        : BODIES[save.campaign.bodyId ?? 'mistral'].mobility *
          (input.crouch ? 1.15 : input.sprint ? 3.3 : 2.3) *
          (1 + implants.speed) *
          compatibility *
          (overdue ? 0.85 : 1) *
          (phase === 3 ? 0.6 : phase === 2 ? 0.75 : phase === 1 ? 0.9 : 1)) *
      dt;
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
  if (phase >= 2)
    player.recoil = Math.max(player.recoil, phase === 3 ? 0.16 : 0.08);
  player.hurtFlash = Math.max(0, player.hurtFlash - dt * 0.8);
  tacticalQueues(state);
  for (const entity of state.entities) {
    entity.attackLeft = Math.max(0, (entity.attackLeft ?? 0) - time);
    entity.supportLeft = Math.max(0, (entity.supportLeft ?? 0) - time);
    entity.muzzleFlash = Math.max(0, (entity.muzzleFlash ?? 0) - dt);
    entity.impactFlash = Math.max(0, (entity.impactFlash ?? 0) - dt);
    if (Number.isFinite(entity.actionLeft))
      entity.actionLeft = Math.max(0, (entity.actionLeft ?? 0) - time);
    if ((entity.actionLeft ?? 0) === 0) {
      entity.actionState =
        entity.captureState === 'incapacitated'
          ? 'incapacitated'
          : entity.captureState === 'restrained'
            ? 'restrained'
            : entity.alive
              ? 'idle'
              : 'dead';
    }
  }
  resolveSynchronizedOrders(state, world, save, time, events);
  if (input.fire) events.push(...shoot(state, world, save));

  for (const entity of state.entities) {
    if (!entity.alive) continue;
    if (
      entity.captureState === 'incapacitated' ||
      entity.captureState === 'restrained'
    )
      continue;
    if ((entity.stunLeft ?? 0) > 0) {
      entity.stunLeft = Math.max(0, entity.stunLeft! - time);
      if (!entity.stunLeft) entity.state = 'search';
      continue;
    }
    // Sabotage initially disables a drone, but it can still be possessed.
    if (entity.state === 'disabled') continue;
    if (entity.id === state.droneId) continue;
    if (entity.kind === 'nara' || entity.allied) {
      const agentId =
        entity.agentId ?? (entity.id === 'nara' ? 'nara' : undefined);
      if (!entity.allied && (!agentId || !isAgentRecruited(save, agentId)))
        continue;
      const profile = agentId ? save.continuity.agents[agentId] : null;
      const queue = agentId ? tacticalQueues(state)[agentId] : [];
      let command = queue[0];
      if (
        agentId &&
        command &&
        ['follow', 'hold', 'cover', 'focus', 'interact'].includes(command.order)
      ) {
        entity.tacticalOrder = command.order;
        if (command.order === 'focus')
          entity.focusId = command.targetId ?? entity.focusId ?? null;
        if (command.order === 'hold' || command.order === 'cover') {
          entity.targetX = entity.x;
          entity.targetY = entity.y;
        }
        queue.shift();
        command = queue[0];
      }
      const order = agentId
        ? (command?.order ?? entity.tacticalOrder ?? agentOrder(save, agentId))
        : 'follow';
      const cooperation = Math.max(
        0.55,
        1 + Math.max(-100, profile?.trust ?? 0) / 300,
      );
      const fatigue = 1 + (profile?.fatigue ?? 0) / 150;
      if (agentId && command?.order === 'sync') continue;
      if (agentId && command?.order === 'retreat') {
        const x = command.x ?? world.start.x,
          y = command.y ?? world.start.y;
        if (Math.hypot(entity.x - x, entity.y - y) <= 0.35) {
          entity.tacticalOrder = 'hold';
          entity.targetX = entity.x;
          entity.targetY = entity.y;
          queue.shift();
          state.notice = AGENT_NAMES[agentId] + ' : repli terminé.';
        } else moveToward(entity, x, y, world.map, (time * 2.2) / fatigue);
        continue;
      }
      if (agentId && command?.order === 'move') {
        const x = command.x!,
          y = command.y!;
        if (Math.hypot(entity.x - x, entity.y - y) <= 0.3) {
          queue.shift();
          entity.tacticalOrder = queue.length ? entity.tacticalOrder : 'cover';
          state.notice = AGENT_NAMES[agentId] + ' : position atteinte.';
        } else moveToward(entity, x, y, world.map, (time * 2) / fatigue);
        continue;
      }
      if (agentId && command?.order === 'capture') {
        const target = state.entities.find(
          (candidate) => candidate.id === command!.targetId,
        );
        if (!target || !isCapturable(target)) {
          queue.shift();
          state.notice = 'Cortex : cible de capture devenue invalide.';
          continue;
        }
        const distance = Math.hypot(target.x - entity.x, target.y - entity.y);
        if (distance > 0.85) {
          moveToward(
            entity,
            target.x,
            target.y,
            world.map,
            (time * 1.85) / fatigue,
          );
          continue;
        }
        if ((target.captureState ?? 'active') === 'active') {
          target.health = Math.max(1, Math.min(target.health, 1));
          target.captureState = 'incapacitated';
          target.state = 'disabled';
          target.hostile = false;
          target.stunLeft = 0;
          markImpact(target);
          setAction(target, 'incapacitated', 0);
          setAction(entity, 'interact', 0.35);
          events.push({
            type: 'combat',
            name: 'incapacitated',
            sourceId: entity.id,
            targetId: target.id,
            nonLethal: true,
          });
          continue;
        }
        target.captureState = 'restrained';
        target.capturedBy = agentId;
        target.hostile = false;
        target.state = 'disabled';
        setAction(target, 'restrained', 0);
        setAction(entity, 'interact', 0.35);
        queue.shift();
        state.notice =
          AGENT_NAMES[agentId] + ' : ' + target.label + ' sous contention.';
        events.push({
          type: 'combat',
          name: 'restrained',
          sourceId: entity.id,
          targetId: target.id,
          nonLethal: true,
        });
        continue;
      }
      // Salomé stabilizes biological allies; this has a cooldown and cannot resurrect the dead.
      if (
        agentId === 'salome' &&
        entity.supportLeft === 0 &&
        order !== 'hold'
      ) {
        const patient = [
          player,
          ...state.entities.filter((e) => e.agentId && e.alive),
        ]
          .filter(
            (e) =>
              e.health > 0 &&
              e.health < e.maxHealth &&
              Math.hypot(e.x - entity.x, e.y - entity.y) < 4 &&
              lineOfSight(world.map, entity.x, entity.y, e.x, e.y),
          )
          .sort((a, b) => a.health / a.maxHealth - b.health / b.maxHealth)[0];
        if (patient) {
          patient.health = Math.min(
            patient.maxHealth,
            patient.health + 22 * cooperation,
          );
          entity.supportLeft = 8 * fatigue;
          state.notice = 'Salomé : continuité stabilisée.';
        }
      }
      const anchor =
        order === 'interact' && (profile?.trust ?? 0) > -40
          ? state.entities
              .filter(
                (e) =>
                  e.alive &&
                  (e.kind === 'anchor' ||
                    (agentId === 'nara' &&
                      e.interaction === 'sabotage' &&
                      e.objective)),
              )
              .sort(
                (a, b) =>
                  Math.hypot(a.x - entity.x, a.y - entity.y) -
                  Math.hypot(b.x - entity.x, b.y - entity.y),
              )[0]
          : null;
      if (anchor) {
        if (Math.hypot(anchor.x - entity.x, anchor.y - entity.y) < 0.9) {
          anchor.health = 0;
          if (anchor.kind === 'anchor') defeat(state, anchor, events);
          else {
            anchor.alive = false;
            events.push({
              type: 'campaign',
              name: 'objective-completed',
              id: anchor.objectiveId ?? anchor.id,
            });
          }
        } else moveToward(entity, anchor.x, anchor.y, world.map, time * 1.8);
      } else if (
        order === 'move' &&
        entity.targetX !== undefined &&
        entity.targetY !== undefined
      ) {
        moveToward(
          entity,
          entity.targetX,
          entity.targetY,
          world.map,
          (time * 2) / fatigue,
        );
      } else if (
        order !== 'hold' &&
        order !== 'cover' &&
        order !== 'move' &&
        Math.hypot(player.x - entity.x, player.y - entity.y) > 1.8
      )
        moveToward(entity, player.x, player.y, world.map, (time * 2) / fatigue);
      if (
        order === 'hold' ||
        anchor ||
        (agentId && engagementPolicy(save, agentId) === 'hold-fire')
      )
        continue;
      const candidates = state.entities.filter(
        (e) =>
          e.alive &&
          (e.captureState ?? 'active') === 'active' &&
          e.hostile &&
          !e.allied &&
          isEnemy(e) &&
          Math.hypot(e.x - entity.x, e.y - entity.y) < 7 &&
          lineOfSight(world.map, entity.x, entity.y, e.x, e.y),
      );
      const target =
        candidates.find(
          (e) =>
            order === 'focus' && e.id === (entity.focusId ?? state.focusId),
        ) ?? candidates[0];
      if (target && entity.attackLeft === 0) {
        if (agentId) fireAgentAt(state, save, entity, agentId, target, events);
        else {
          const before = target.health;
          Object.assign(
            target,
            applyDamage(target.health, target.armor, 16 * cooperation, 0.25),
          );
          entity.attackLeft = 0.9 * fatigue;
          entity.muzzleFlash = 0.12;
          setAction(entity, 'attack', 0.2);
          markImpact(target);
          events.push({
            type: 'combat',
            name: 'hit',
            sourceId: entity.id,
            targetId: target.id,
            damage: Math.max(0, before - target.health),
          });
          defeat(state, target, events, entity.id);
        }
      }
      continue;
    }
    if (!isEnemy(entity)) continue;
    // A liberated district stays peaceful until an actor is actually attacked.
    // Reputation softens detection; it never erases an already engaged combat.
    if (liberated && !entity.hostile && entity.kind !== 'boss') {
      entity.awareness = 0;
      entity.memory = 0;
      entity.state = 'patrol';
      entity.angle = normalizeAngle(entity.angle + time * 0.15);
      continue;
    }
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
      (1 - save.talents.ghost * 0.12) *
      Math.max(0.25, 1 - implants.stealth) *
      Math.max(0.7, Math.min(1.3, 1 - reputation / 333)) *
      (entity.disabledSystem === 'optical' ? 0.3 : 1);
    const disguise =
      ((state.stage === 'docks' && save.campaign.route === 'identity') ||
        (state.stage === 'district' &&
          save.continuity.active?.approach === 'identity')) &&
      !entity.hostile;
    const sees =
      visible &&
      distance < (disguise ? 1.6 : range) &&
      (viewAngle < 1.25 || distance < 1.6 || entity.state === 'combat');
    const hears = state.noise > 0 && distance < (state.noise > 1 ? 10 : 4);
    if (sees || hears) {
      entity.awareness = Math.min(
        1,
        (entity.awareness ?? 0) +
          time *
            (hears ? 3 : disguise ? 0.25 : 1.2) *
            Math.max(0.5, Math.min(1.5, 1 - reputation / 200)),
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
        if (
          entity.attackLeft === 0 &&
          sees &&
          entity.disabledSystem !== 'weapon'
        ) {
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
          const defender = state.entities.find(
            (e) =>
              e.agentId === 'idris' &&
              e.alive &&
              e.health > 0 &&
              agentOrder(save, 'idris') !== 'hold' &&
              Math.hypot(e.x - player.x, e.y - player.y) < 3 &&
              lineOfSight(world.map, e.x, e.y, entity.x, entity.y),
          );
          if (defender) {
            const defenderBefore = defender.health;
            Object.assign(
              defender,
              applyDamage(defender.health, defender.armor, damage * 0.55, 0.1),
            );
            markImpact(defender);
            events.push({
              type: 'combat',
              name: 'hit',
              sourceId: entity.id,
              targetId: defender.id,
              damage: Math.max(0, defenderBefore - defender.health),
            });
            if (defender.health <= 0) {
              defender.alive = false;
              setAction(defender, 'dead', 0);
              state.notice =
                'Idris hors de combat. La Cellule le récupérera à l’extraction.';
            }
          }
          const playerBefore = player.health;
          const hit = applyDamage(
            player.health,
            player.armor,
            damage * (defender ? 0.45 : 1),
            entity.kind === 'boss' ? 0.2 : 0.05,
          );
          player.health = hit.health;
          player.armor = hit.armor;
          player.hurtFlash = 0.35;
          entity.muzzleFlash = 0.12;
          setAction(entity, 'attack', 0.2);
          entity.attackLeft =
            entity.kind === 'boss' ? 1.5 : entity.kind === 'drone' ? 1.4 : 1.8;
          events.push({
            type: 'combat',
            name: 'hit',
            sourceId: entity.id,
            targetId: 'player',
            damage: Math.max(0, playerBefore - player.health),
          });
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
    const emergencyAvailable =
      !state.emergencyUsed &&
      state.stage !== 'revocation' &&
      (save.continuity.facilities.transfer > 0 || canPossessHuman(save));
    const preferredAgent =
      state.emergencyAgent ??
      save.continuity.facilityReadiness?.emergencyAgent ??
      null;
    const eligibleRelay = (entity: WorldEntity): boolean =>
      Boolean(
        emergencyAvailable &&
        entity.agentId &&
        isAgentRecruited(save, entity.agentId) &&
        entity.alive &&
        entity.health > 0 &&
        save.continuity.agents[entity.agentId].trust >= 20,
      );
    const preferredRelay = preferredAgent
      ? state.entities.find(
          (entity) =>
            entity.agentId === preferredAgent && eligibleRelay(entity),
        )
      : null;
    const relay =
      preferredRelay ?? state.entities.find((entity) => eligibleRelay(entity));
    if (relay?.agentId) {
      state.emergencyUsed = true;
      Object.assign(player, {
        x: relay.x,
        y: relay.y,
        angle: relay.angle,
        health: Math.max(20, relay.health * 0.5),
        maxHealth: relay.maxHealth,
        armor: relay.armor,
        maxArmor: Math.max(relay.armor, 25),
        neural: Math.max(15, player.maxNeural * 0.2),
      });
      relay.alive = false;
      state.notice =
        relay.label +
        ' ouvre son relais de secours. Une seule continuité d’urgence par sortie.';
      events.push({
        type: 'campaign',
        name: 'emergency-transfer',
        id: relay.agentId,
      });
    } else if (state.dronePackage === 'recovery' && !state.recoveryUsed) {
      state.recoveryUsed = true;
      player.health = Math.max(1, Math.ceil(player.maxHealth * 0.25));
      player.hurtFlash = 0;
      state.notice =
        'Module recovery : stabilisation autonome à 25 % d’intégrité. Secours consommé pour cette sortie.';
      events.push({
        type: 'campaign',
        name: 'drone-recovery',
        id: 'facility.recovery-drone',
      });
    } else events.push({ type: 'death' });
  }
  return events;
}
