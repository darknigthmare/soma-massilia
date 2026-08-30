import { BODIES, SAVE_SCHEMA_VERSION, WEAPONS } from './content';
import type { BodyId, GameSettings, SaveData, StationLevels, WeaponId } from './types';

export const SAVE_KEY = 'soma-massilia.save.v3';

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
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `save-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createNewSave(settings: Partial<GameSettings> = {}): SaveData {
  const bodies = Object.fromEntries(
    (Object.keys(BODIES) as BodyId[]).map((id) => [
      id,
      { unlocked: id === 'mistral', integrity: BODIES[id].integrity, implants: [...BODIES[id].implants], level: 1 },
    ]),
  ) as SaveData['bodies'];

  const weapons = Object.fromEntries(
    (Object.keys(WEAPONS) as WeaponId[]).map((id) => [
      id,
      { unlocked: id === 'pistol' || id === 'blade', reserve: WEAPONS[id].reserve },
    ]),
  ) as SaveData['weapons'];

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
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
  };
}

function finiteInt(value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.round(value)))
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function migrateSave(input: unknown): SaveData {
  if (!isRecord(input)) throw new Error('Le fichier ne contient pas une sauvegarde valide.');

  const fresh = createNewSave();
  const campaign = isRecord(input.campaign) ? input.campaign : {};
  const resources = isRecord(input.resources) ? input.resources : {};
  const settings = isRecord(input.settings) ? input.settings : {};
  const companions = isRecord(input.companions) ? input.companions : {};
  const nara = isRecord(companions.nara) ? companions.nara : {};
  const station = isRecord(input.station) ? input.station : {};
  const bodies = isRecord(input.bodies) ? input.bodies : {};
  const weapons = isRecord(input.weapons) ? input.weapons : {};

  const allowedStages = ['contract', 'docks', 'revocation', 'nara', 'collector', 'station', 'complete'];
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
        typeof campaign.stage === 'string' && allowedStages.includes(campaign.stage)
          ? (campaign.stage as SaveData['campaign']['stage'])
          : fresh.campaign.stage,
      checkpoint: typeof campaign.checkpoint === 'string' ? campaign.checkpoint : fresh.campaign.checkpoint,
      route:
        typeof campaign.route === 'string' && allowedRoutes.includes(campaign.route)
          ? (campaign.route as SaveData['campaign']['route'])
          : null,
      bodyId:
        typeof campaign.bodyId === 'string' && allowedBodies.includes(campaign.bodyId)
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
        ? campaign.endingsSeen.filter((item): item is string => typeof item === 'string').slice(0, 12)
        : [],
    },
    resources: {
      credits: finiteInt(resources.credits, fresh.resources.credits),
      influence: finiteInt(resources.influence, fresh.resources.influence),
      salvage: finiteInt(resources.salvage ?? resources.ferraille, fresh.resources.salvage),
      data: finiteInt(resources.data ?? resources.donnees, fresh.resources.data),
      xp: finiteInt(resources.xp, fresh.resources.xp),
    },
    settings: {
      ...fresh.settings,
      ...Object.fromEntries(
        Object.entries(settings).filter(([key]) => key in fresh.settings),
      ),
    } as GameSettings,
    companions: {
      nara: {
        recruited: Boolean(nara.recruited),
        trust: finiteInt(nara.trust, 0, -100, 100),
        order:
          typeof nara.order === 'string' && ['follow', 'hold', 'cover', 'focus', 'interact'].includes(nara.order)
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
      ? input.codex.filter((item): item is string => typeof item === 'string').slice(0, 100)
      : fresh.codex,
    achievements: Array.isArray(input.achievements)
      ? input.achievements.filter((item): item is string => typeof item === 'string').slice(0, 100)
      : [],
  };

  for (const id of Object.keys(fresh.bodies) as BodyId[]) {
    const body = isRecord(bodies[id]) ? bodies[id] : {};
    migrated.bodies[id] = {
      unlocked: Boolean(body.unlocked ?? fresh.bodies[id].unlocked),
      integrity: finiteInt(body.integrity, BODIES[id].integrity, 0, BODIES[id].integrity),
      implants: Array.isArray(body.implants)
        ? body.implants.filter((item): item is string => typeof item === 'string').slice(0, 12)
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
  return migrated;
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify({ ...save, schemaVersion: SAVE_SCHEMA_VERSION, updatedAt: new Date().toISOString() }, null, 2);
}

export function deserializeSave(raw: string): SaveData {
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
  const raw = window.localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return deserializeSave(raw);
  } catch {
    return null;
  }
}

export function persistLocalSave(save: SaveData): SaveData {
  const normalized = migrateSave(save);
  if (typeof window !== 'undefined') window.localStorage.setItem(SAVE_KEY, serializeSave(normalized));
  return normalized;
}

export function clearLocalSave(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(SAVE_KEY);
}
