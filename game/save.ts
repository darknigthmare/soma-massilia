import { BODIES, SAVE_SCHEMA_VERSION, WEAPONS } from './content';
import type {
  BodyId,
  GameSettings,
  SaveData,
  StationLevels,
  WeaponId,
} from './types';
import { createEncounter, missionWorld } from './simulation';
import { canOccupy, normalizeAngle } from './engine';
import { createContinuity, normalizeContinuity } from './campaign';

export const SAVE_KEY = 'soma-massilia.save.v5';

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.75,
  musicVolume: 0.45,
  sfxVolume: 0.8,
  sensitivity: 0.55,
  scanlines: true,
  streamMode: false,
  highContrast: false,
  reduceMotion: false,
  reduceFlashes: false,
  largeText: false,
  aimAssist: true,
  hackAssist: false,
  controlLayout: 'auto',
  subtitles: true,
  difficulty: 'standard',
  touchControls: false,
};

const DEFAULT_STATION: StationLevels = {
  clinic: 0,
  arsenal: 0,
  cortex: 0,
  spectre: 0,
  syndicate: 0,
  core: 0,
};

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID();
  return `save-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createNewSave(settings: Partial<GameSettings> = {}): SaveData {
  const bodies = Object.fromEntries(
    (Object.keys(BODIES) as BodyId[]).map((id) => [
      id,
      {
        unlocked: id === 'mistral',
        integrity: BODIES[id].integrity,
        implants: [...BODIES[id].implants],
        level: 1,
      },
    ]),
  ) as SaveData['bodies'];

  const weapons = Object.fromEntries(
    (Object.keys(WEAPONS) as WeaponId[]).map((id) => [
      id,
      {
        unlocked: id === 'pistol' || id === 'blade',
        reserve: WEAPONS[id].reserve,
      },
    ]),
  ) as SaveData['weapons'];

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    continuity: createContinuity(),
    saveId: makeId(),
    updatedAt: new Date().toISOString(),
    playtimeSeconds: 0,
    campaign: {
      stage: 'contract',
      checkpoint: 'contrat-ouvert',
      route: null,
      bodyId: null,
      registryRecovered: false,
      licenseRevoked: false,
      rootInstalled: false,
      naraFreed: false,
      naraTrust: 0,
      collectorAnchors: 3,
      collectorTransfers: 0,
      collectorDefeated: false,
      stationReached: false,
      endingsSeen: [],
    },
    resources: { credits: 80, influence: 0, salvage: 40, data: 10, xp: 0 },
    weapons,
    bodies,
    companions: { nara: { recruited: false, trust: 0, order: 'follow' } },
    station: { ...DEFAULT_STATION },
    codex: ['neo-massilia', 'soma', 'revocation'],
    settings: { ...DEFAULT_SETTINGS, ...settings },
    achievements: [],
    encounter: null,
    talents: { executor: 0, ghost: 0, interface: 0, soma: 0, cybermancy: 0 },
    operations: { velours: 0, mistral: 0, phocee: 0 },
    activeOperation: null,
    ending: null,
    dialogueSeen: [],
    statistics: { kills: 0, shots: 0, hits: 0, deaths: 0, hacks: 0 },
  };
}

function finiteInt(
  value: unknown,
  fallback: number,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.round(value)))
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function migrateSave(input: unknown): SaveData {
  if (!isRecord(input))
    throw new Error('Le fichier ne contient pas une sauvegarde valide.');
  if (!isRecord(input.campaign))
    throw new Error('Ce fichier ne contient pas de campagne SOMA.');
  if (
    typeof input.schemaVersion === 'number' &&
    input.schemaVersion > SAVE_SCHEMA_VERSION
  )
    throw new Error(
      'Cette sauvegarde vient d’une version plus récente du jeu.',
    );

  const fresh = createNewSave();
  const campaign = isRecord(input.campaign) ? input.campaign : {};
  const resources = isRecord(input.resources) ? input.resources : {};
  const settings = isRecord(input.settings) ? input.settings : {};
  const companions = isRecord(input.companions) ? input.companions : {};
  const nara = isRecord(companions.nara) ? companions.nara : {};
  const station = isRecord(input.station) ? input.station : {};
  const bodies = isRecord(input.bodies) ? input.bodies : {};
  const weapons = isRecord(input.weapons) ? input.weapons : {};

  const allowedStages = [
    'contract',
    'docks',
    'revocation',
    'nara',
    'collector',
    'station',
    'complete',
    'operation',
    'district',
  ];
  const allowedBodies = ['mistral', 'mole', 'sibylle'];
  const allowedRoutes = ['combat', 'identity', 'sabotage'];

  const migrated: SaveData = {
    ...fresh,
    saveId: typeof input.saveId === 'string' ? input.saveId : fresh.saveId,
    updatedAt: new Date().toISOString(),
    playtimeSeconds: finiteInt(input.playtimeSeconds, 0),
    campaign: {
      ...fresh.campaign,
      stage:
        typeof campaign.stage === 'string' &&
        allowedStages.includes(campaign.stage)
          ? (campaign.stage as SaveData['campaign']['stage'])
          : fresh.campaign.stage,
      checkpoint:
        typeof campaign.checkpoint === 'string'
          ? campaign.checkpoint
          : fresh.campaign.checkpoint,
      route:
        typeof campaign.route === 'string' &&
        allowedRoutes.includes(campaign.route)
          ? (campaign.route as SaveData['campaign']['route'])
          : null,
      bodyId:
        typeof campaign.bodyId === 'string' &&
        allowedBodies.includes(campaign.bodyId)
          ? (campaign.bodyId as BodyId)
          : null,
      registryRecovered: Boolean(campaign.registryRecovered),
      licenseRevoked: Boolean(campaign.licenseRevoked),
      rootInstalled: Boolean(campaign.rootInstalled),
      naraFreed: Boolean(campaign.naraFreed),
      naraTrust: finiteInt(campaign.naraTrust, 0, -100, 100),
      collectorAnchors: finiteInt(campaign.collectorAnchors, 3, 0, 3),
      collectorTransfers: finiteInt(campaign.collectorTransfers, 0, 0, 3),
      collectorDefeated: Boolean(campaign.collectorDefeated),
      stationReached: Boolean(campaign.stationReached),
      endingsSeen: Array.isArray(campaign.endingsSeen)
        ? campaign.endingsSeen
            .filter((item): item is string => typeof item === 'string')
            .slice(0, 12)
        : [],
    },
    resources: {
      credits: finiteInt(resources.credits, fresh.resources.credits),
      influence: finiteInt(resources.influence, fresh.resources.influence),
      salvage: finiteInt(
        resources.salvage ?? resources.ferraille,
        fresh.resources.salvage,
      ),
      data: finiteInt(
        resources.data ?? resources.donnees,
        fresh.resources.data,
      ),
      xp: finiteInt(resources.xp, fresh.resources.xp),
    },
    settings: normalizeSettings(settings),
    companions: {
      nara: {
        recruited: Boolean(nara.recruited),
        trust: finiteInt(nara.trust, 0, -100, 100),
        order:
          typeof nara.order === 'string' &&
          ['follow', 'hold', 'cover', 'focus', 'interact', 'move'].includes(
            nara.order,
          )
            ? (nara.order as SaveData['companions']['nara']['order'])
            : 'follow',
      },
    },
    station: {
      clinic: finiteInt(station.clinic, 0, 0, 3),
      arsenal: finiteInt(station.arsenal, 0, 0, 3),
      cortex: finiteInt(station.cortex, 0, 0, 3),
      spectre: finiteInt(station.spectre, 0, 0, 3),
      syndicate: finiteInt(station.syndicate, 0, 0, 3),
      core: finiteInt(station.core, 0, 0, 3),
    },
    codex: Array.isArray(input.codex)
      ? input.codex
          .filter((item): item is string => typeof item === 'string')
          .slice(0, 100)
      : fresh.codex,
    achievements: Array.isArray(input.achievements)
      ? input.achievements
          .filter((item): item is string => typeof item === 'string')
          .slice(0, 100)
      : [],
  };

  for (const id of Object.keys(fresh.bodies) as BodyId[]) {
    const body = isRecord(bodies[id]) ? bodies[id] : {};
    migrated.bodies[id] = {
      unlocked: Boolean(body.unlocked ?? fresh.bodies[id].unlocked),
      integrity: finiteInt(
        body.integrity,
        BODIES[id].integrity,
        0,
        BODIES[id].integrity,
      ),
      implants: Array.isArray(body.implants)
        ? body.implants
            .filter((item): item is string => typeof item === 'string')
            .slice(0, 12)
        : fresh.bodies[id].implants,
      level: finiteInt(body.level, 1, 1, 30),
    };
  }

  for (const id of Object.keys(fresh.weapons) as WeaponId[]) {
    const weapon = isRecord(weapons[id]) ? weapons[id] : {};
    migrated.weapons[id] = {
      unlocked: Boolean(weapon.unlocked ?? fresh.weapons[id].unlocked),
      reserve: finiteInt(weapon.reserve, fresh.weapons[id].reserve, 0, 999),
    };
  }

  migrated.schemaVersion = SAVE_SCHEMA_VERSION;
  for (const key of Object.keys(
    fresh.talents,
  ) as (keyof SaveData['talents'])[]) {
    migrated.talents[key] = finiteInt(
      isRecord(input.talents) ? input.talents[key] : 0,
      0,
      0,
      3,
    );
  }
  for (const key of Object.keys(
    fresh.operations,
  ) as (keyof SaveData['operations'])[]) {
    migrated.operations[key] = finiteInt(
      isRecord(input.operations) ? input.operations[key] : 0,
      0,
      0,
      9999,
    );
  }
  for (const key of Object.keys(
    fresh.statistics,
  ) as (keyof SaveData['statistics'])[]) {
    migrated.statistics[key] = finiteInt(
      isRecord(input.statistics) ? input.statistics[key] : 0,
      0,
      0,
      9999999,
    );
  }
  migrated.activeOperation = ['velours', 'mistral', 'phocee'].includes(
    String(input.activeOperation),
  )
    ? (input.activeOperation as SaveData['activeOperation'])
    : null;
  migrated.ending = ['free', 'shelter', 'network'].includes(
    String(input.ending),
  )
    ? (input.ending as SaveData['ending'])
    : null;
  migrated.dialogueSeen = Array.isArray(input.dialogueSeen)
    ? input.dialogueSeen
        .filter((v): v is string => typeof v === 'string')
        .slice(0, 40)
    : [];
  if (migrated.campaign.stage === 'operation' && !migrated.activeOperation)
    migrated.campaign.stage = 'station';
  if (migrated.campaign.stage !== 'contract' && !migrated.campaign.bodyId)
    migrated.campaign.bodyId = 'mistral';
  // Legacy hub saves can contain incomplete flags. The stage is authoritative.
  if (['station', 'complete', 'operation'].includes(migrated.campaign.stage)) {
    migrated.campaign.stationReached = true;
    migrated.campaign.naraFreed = true;
    migrated.campaign.collectorDefeated = true;
    migrated.companions.nara.recruited = true;
    migrated.weapons.smg.unlocked = migrated.weapons.rifle.unlocked = true;
    migrated.bodies.mole.unlocked = migrated.bodies.sibylle.unlocked = true;
  }
  migrated.continuity = normalizeContinuity(input.continuity, migrated);
  if (migrated.campaign.stage === 'district' && !migrated.continuity.active)
    migrated.campaign.stage = migrated.campaign.stationReached
      ? 'station'
      : 'contract';
  migrated.encounter = normalizeEncounter(input.encounter, migrated);
  return migrated;
}

function finite(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

export function normalizeSettings(
  input: Record<string, unknown>,
): GameSettings {
  const settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof GameSettings)[]) {
    const value = input[key];
    if (
      typeof DEFAULT_SETTINGS[key] === 'boolean' &&
      typeof value === 'boolean'
    )
      Object.assign(settings, { [key]: value });
  }
  for (const key of [
    'masterVolume',
    'musicVolume',
    'sfxVolume',
    'sensitivity',
  ] as const)
    settings[key] = finite(input[key], DEFAULT_SETTINGS[key], 0, 1);
  if (['auto', 'wasd', 'zqsd'].includes(String(input.controlLayout)))
    settings.controlLayout =
      input.controlLayout as GameSettings['controlLayout'];
  if (['story', 'standard', 'hard'].includes(String(input.difficulty)))
    settings.difficulty = input.difficulty as GameSettings['difficulty'];
  return settings;
}

function normalizeEncounter(
  raw: unknown,
  save: SaveData,
): SaveData['encounter'] {
  if (
    !isRecord(raw) ||
    raw.stage !== save.campaign.stage ||
    ![
      'docks',
      'revocation',
      'nara',
      'collector',
      'operation',
      'district',
    ].includes(save.campaign.stage)
  )
    return null;
  if (
    !isRecord(raw.player) ||
    !Array.isArray(raw.entities) ||
    !isRecord(raw.inventory)
  )
    return null;
  const base = createEncounter(save);
  const map = missionWorld(save).map;
  const p = raw.player;
  const x = finite(p.x, -1, -1, map[0].length),
    y = finite(p.y, -1, -1, map.length);
  if (!canOccupy(map, x, y) || typeof p.health !== 'number' || p.health < 0)
    return null;
  base.player.x = x;
  base.player.y = y;
  base.player.angle = normalizeAngle(finite(p.angle, 0, -1000, 1000));
  base.player.health = finite(
    p.health,
    base.player.maxHealth,
    0,
    base.player.maxHealth,
  );
  base.player.armor = finite(
    p.armor,
    base.player.maxArmor,
    0,
    base.player.maxArmor,
  );
  base.player.neural = finite(
    p.neural,
    base.player.maxNeural,
    0,
    base.player.maxNeural,
  );
  for (const id of Object.keys(base.inventory) as WeaponId[]) {
    const w = isRecord(raw.inventory[id]) ? raw.inventory[id] : {};
    base.inventory[id].ammo = finiteInt(
      w.ammo,
      base.inventory[id].ammo,
      0,
      WEAPONS[id].magazine,
    );
    base.inventory[id].reserve = finiteInt(
      w.reserve,
      base.inventory[id].reserve,
      0,
      999,
    );
    base.inventory[id].cooldownLeft = finite(w.cooldownLeft, 0, 0, 2);
    base.inventory[id].reloading = finite(w.reloading, 0, 0, 2);
  }
  const selected =
    isRecord(p.weapon) &&
    typeof p.weapon.id === 'string' &&
    p.weapon.id in WEAPONS
      ? (p.weapon.id as WeaponId)
      : 'pistol';
  base.player.weapon =
    base.inventory[save.weapons[selected].unlocked ? selected : 'pistol'];
  // Restore only known entities from the authoritative level, never imported code/labels.
  // Recreate all three anchor IDs so out-of-order destruction survives a reload.
  if (base.stage === 'collector')
    base.entities = createEncounter({
      ...save,
      campaign: { ...save.campaign, collectorAnchors: 3 },
    }).entities;
  for (const entity of base.entities) {
    const e = raw.entities.find(
      (item: unknown) => isRecord(item) && item.id === entity.id,
    );
    if (!isRecord(e)) {
      if (entity.kind === 'anchor') entity.alive = false;
      continue;
    }
    const ex = finite(e.x, entity.x, 0.2, map[0].length - 0.2),
      ey = finite(e.y, entity.y, 0.2, map.length - 0.2);
    if (canOccupy(map, ex, ey, 0.18)) {
      entity.x = ex;
      entity.y = ey;
    }
    entity.angle = normalizeAngle(finite(e.angle, entity.angle, -1000, 1000));
    entity.health = finite(e.health, entity.health, 0, entity.maxHealth);
    entity.armor = finite(e.armor, entity.armor, 0, 250);
    entity.alive = typeof e.alive === 'boolean' ? e.alive : entity.alive;
    entity.hostile =
      typeof e.hostile === 'boolean' ? e.hostile : entity.hostile;
    entity.allied =
      (e.allied === true &&
        ['drone', 'guard', 'heavy'].includes(entity.kind)) ||
      Boolean(entity.agentId);
    if (['motor', 'weapon', 'optical'].includes(String(e.disabledSystem)))
      entity.disabledSystem = e.disabledSystem as
        | 'motor'
        | 'weapon'
        | 'optical';
    entity.supportLeft = finite(e.supportLeft, 0, 0, 30);
    entity.systemDamage = finite(e.systemDamage, 0, 0, 10000);
    entity.focusId =
      typeof e.focusId === 'string' &&
      base.entities.some((v) => v.id === e.focusId)
        ? e.focusId
        : null;
    entity.variant = finiteInt(e.variant, 0, 0, 9999);
    entity.stunLeft = finite(e.stunLeft, 0, 0, 5);
    entity.attackLeft = finite(e.attackLeft, 1, 0, 3);
    entity.awareness = finite(e.awareness, 0, 0, 1);
    entity.memory = finite(e.memory, 0, 0, 7);
    entity.state = [
      'patrol',
      'suspicion',
      'investigate',
      'alert',
      'combat',
      'search',
      'disabled',
    ].includes(String(e.state))
      ? (e.state as typeof entity.state)
      : 'patrol';
    if (typeof e.targetX === 'number')
      entity.targetX = finite(e.targetX, entity.x, 0.2, map[0].length - 0.2);
    if (typeof e.targetY === 'number')
      entity.targetY = finite(e.targetY, entity.y, 0.2, map.length - 0.2);
  }
  if (
    base.stage === 'operation' &&
    !base.entities.some((e) => e.id === 'mission-data' && e.alive)
  ) {
    const exit = base.entities.find((e) => e.kind === 'exit');
    if (exit) exit.objective = true;
  }
  base.elapsed = finite(raw.elapsed, 0, 0, 1e7);
  base.revocationLeft = finite(raw.revocationLeft, base.revocationLeft, 0, 300);
  if (
    ['torso', 'motor', 'weapon', 'optical'].includes(String(raw.targetSystem))
  )
    base.targetSystem = raw.targetSystem as typeof base.targetSystem;
  if (['nara', 'idris', 'salome'].includes(String(raw.selectedAgent)))
    base.selectedAgent = raw.selectedAgent as typeof base.selectedAgent;
  base.emergencyUsed = raw.emergencyUsed === true;
  base.stormTime = finite(raw.stormTime, 0, 0, 1e7);
  base.droneId =
    typeof raw.droneId === 'string' &&
    base.entities.some((e) => e.id === raw.droneId && e.alive && e.allied)
      ? raw.droneId
      : null;
  for (const key of ['kills', 'shots', 'hits'] as const)
    base[key] = finiteInt(raw[key], 0, 0, 1e7);
  return base;
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify(
    {
      ...save,
      schemaVersion: SAVE_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

export function deserializeSave(raw: string): SaveData {
  if (raw.length > 1_000_000)
    throw new Error('Sauvegarde trop volumineuse (maximum 1 Mo).');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Le fichier JSON est corrompu ou incomplet.');
  }
  return migrateSave(parsed);
}

export function loadLocalSave(): SaveData | null {
  if (typeof window === 'undefined') return null;
  try {
    for (const key of [
      SAVE_KEY,
      SAVE_KEY + '.backup',
      'soma-massilia.save.v4',
      'soma-massilia.save.v4.backup',
      'soma-massilia.save.v3',
      'soma-massilia.save.v2',
      'soma-massilia.save.v1',
    ]) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        return deserializeSave(raw);
      } catch {
        /* Try the last known-good backup. */
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function persistLocalSave(save: SaveData): SaveData {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw) {
      try {
        deserializeSave(raw);
        window.localStorage.setItem(SAVE_KEY + '.backup', raw);
      } catch {
        /* Do not back up corrupt data. */
      }
    }
    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ ...save, schemaVersion: SAVE_SCHEMA_VERSION }),
    );
  }
  return save;
}

export function clearLocalSave(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(SAVE_KEY);
}
