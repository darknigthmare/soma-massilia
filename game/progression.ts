import { STATION_INSTALLATIONS } from './content';
import type {
  BodyId,
  EncounterState,
  OperationId,
  RouteId,
  SaveData,
  StationLevels,
  TalentId,
} from './types';

export function beginCampaign(
  save: SaveData,
  bodyId: BodyId,
  route: RouteId,
): SaveData {
  if (save.campaign.stage !== 'contract') return save;
  return {
    ...save,
    updatedAt: new Date().toISOString(),
    campaign: {
      ...save.campaign,
      stage: 'docks',
      checkpoint: 'docks-entree',
      bodyId,
      route,
    },
    bodies: {
      ...save.bodies,
      [bodyId]: { ...save.bodies[bodyId], unlocked: true },
    },
    codex: [...new Set([...save.codex, 'venus'])],
    weapons: {
      ...save.weapons,
      smg: { ...save.weapons.smg, unlocked: route === 'combat' },
    },
    encounter: null,
  };
}

export function advanceCampaign(save: SaveData, event: string): SaveData {
  const next: SaveData = structuredClone(save);
  next.updatedAt = new Date().toISOString();

  switch (event) {
    case 'registry-hacked':
      if (next.campaign.stage !== 'docks') return save;
      next.campaign.registryRecovered = true;
      next.campaign.licenseRevoked = true;
      next.campaign.stage = 'revocation';
      next.campaign.checkpoint = 'revocation-active';
      next.resources.data += 35;
      next.resources.xp += 120;
      next.codex = [...new Set([...next.codex, 'collector'])];
      break;
    case 'root-installed':
      if (next.campaign.stage !== 'revocation') return save;
      next.campaign.rootInstalled = true;
      next.campaign.stage = 'nara';
      next.campaign.checkpoint = 'racine-clandestine';
      next.resources.xp += 100;
      next.weapons.smg.unlocked = true;
      break;
    case 'nara-freed':
      if (next.campaign.stage !== 'nara') return save;
      next.campaign.naraFreed = true;
      next.campaign.naraTrust =
        next.campaign.route === 'identity'
          ? 25
          : next.campaign.route === 'sabotage'
            ? 18
            : 10;
      next.campaign.stage = 'collector';
      next.campaign.checkpoint = 'nara-recrutee';
      next.companions.nara = {
        recruited: true,
        trust: next.campaign.naraTrust,
        order: 'follow',
      };
      next.resources.influence += 20;
      next.resources.xp += 150;
      next.weapons.rifle.unlocked = true;
      next.bodies.mole.unlocked = true;
      next.bodies.sibylle.unlocked = true;
      next.codex = [...new Set([...next.codex, 'nara'])];
      break;
    case 'anchor-destroyed':
      if (
        next.campaign.stage !== 'collector' ||
        next.campaign.collectorAnchors === 0
      )
        return save;
      next.campaign.collectorAnchors = Math.max(
        0,
        next.campaign.collectorAnchors - 1,
      );
      next.resources.data += 20;
      next.resources.xp += 60;
      break;
    case 'collector-transfer':
      if (next.campaign.stage !== 'collector') return save;
      next.campaign.collectorTransfers += 1;
      break;
    case 'collector-defeated':
      if (
        next.campaign.stage !== 'collector' ||
        next.campaign.collectorAnchors > 0
      )
        return save;
      next.campaign.collectorDefeated = true;
      next.campaign.stationReached = true;
      next.campaign.stage = 'station';
      next.campaign.checkpoint = 'station-zero';
      next.resources.credits += 260;
      next.resources.salvage += 240;
      next.resources.data += 100;
      next.resources.influence += 40;
      next.resources.xp += 400;
      next.station.core = Math.max(1, next.station.core);
      next.codex = [...new Set([...next.codex, 'station-zero', 'districts'])];
      next.achievements = [...new Set([...next.achievements, 'dette-soldee'])];
      break;
    case 'station-upgraded':
      if (
        next.campaign.stage !== 'station' ||
        !Object.entries(next.station).some(
          ([id, level]) => id !== 'core' && level > 0,
        )
      )
        return save;
      next.campaign.stage = 'complete';
      next.campaign.checkpoint = 'cellule-null-fondee';
      next.campaign.endingsSeen = [
        ...new Set([...next.campaign.endingsSeen, 'prologue-cellule-null']),
      ];
      next.achievements = [...new Set([...next.achievements, 'cellule-null'])];
      break;
    default:
      return save;
  }

  if (next.campaign.stage !== save.campaign.stage) next.encounter = null;
  return next;
}

export function upgradeStation(
  save: SaveData,
  installationId: keyof StationLevels,
): SaveData {
  if (!save.campaign.stationReached || save.campaign.stage !== 'station')
    return save;
  const installation = STATION_INSTALLATIONS.find(
    (item) => item.id === installationId,
  );
  if (!installation) return save;

  const current = save.station[installationId];
  if (current >= 3) return save;
  const target = current + 1;
  const coreCap =
    installationId === 'core' ? 3 : Math.max(1, save.station.core);
  if (target > coreCap) return save;
  const cost = installation.cost[target];
  if (save.resources.salvage < cost) return save;

  return {
    ...save,
    updatedAt: new Date().toISOString(),
    resources: { ...save.resources, salvage: save.resources.salvage - cost },
    station: { ...save.station, [installationId]: target },
  };
}

export function setNaraOrder(
  save: SaveData,
  order: SaveData['companions']['nara']['order'],
): SaveData {
  return {
    ...save,
    companions: { nara: { ...save.companions.nara, order } },
  };
}

export function resolveSyndicateOperation(
  save: SaveData,
  operation: 'velours' | 'mistral' | 'phocee',
): SaveData {
  if (
    !save.campaign.stationReached ||
    save.campaign.stage !== 'operation' ||
    save.activeOperation !== operation ||
    !save.encounter ||
    save.encounter.entities.some((e) => e.id === 'mission-data' && e.alive)
  )
    return save;
  const bonus = 1 + save.station.syndicate * 0.15;
  const rewards = {
    velours: { influence: 16, credits: 90, data: 60, salvage: 160 },
    mistral: { influence: 24, credits: 60, data: 45, salvage: 210 },
    phocee: { influence: 12, credits: 140, data: 25, salvage: 180 },
  }[operation];
  return {
    ...save,
    activeOperation: null,
    encounter: null,
    campaign: {
      ...save.campaign,
      stage: 'station',
      checkpoint: 'retour-operation',
    },
    operations: {
      ...save.operations,
      [operation]: save.operations[operation] + 1,
    },
    updatedAt: new Date().toISOString(),
    resources: {
      ...save.resources,
      influence:
        save.resources.influence + Math.round(rewards.influence * bonus),
      credits: save.resources.credits + Math.round(rewards.credits * bonus),
      data: save.resources.data + Math.round(rewards.data * bonus),
      salvage: save.resources.salvage + Math.round(rewards.salvage * bonus),
      xp: save.resources.xp + 220,
    },
    achievements: [
      ...new Set([...save.achievements, `operation-${operation}`]),
    ],
  };
}

export function launchOperation(
  save: SaveData,
  operation: OperationId,
): SaveData {
  if (save.campaign.stage !== 'station' || !save.campaign.stationReached)
    return save;
  return {
    ...save,
    activeOperation: operation,
    encounter: null,
    campaign: {
      ...save.campaign,
      stage: 'operation',
      checkpoint: 'operation-' + operation,
    },
  };
}

export function availableTalentPoints(save: SaveData): number {
  return Math.max(
    0,
    Math.floor(save.resources.xp / 200) -
      Object.values(save.talents).reduce((a, b) => a + b, 0),
  );
}

export function learnTalent(save: SaveData, id: TalentId): SaveData {
  if (
    save.campaign.stage !== 'station' ||
    availableTalentPoints(save) < 1 ||
    save.talents[id] >= 3
  )
    return save;
  return { ...save, talents: { ...save.talents, [id]: save.talents[id] + 1 } };
}

export function recordEncounter(
  save: SaveData,
  encounter: EncounterState,
): SaveData {
  if (save.campaign.stage !== encounter.stage) return save;
  const previous =
    save.encounter?.stage === encounter.stage ? save.encounter : null;
  return {
    ...save,
    updatedAt: new Date().toISOString(),
    encounter: structuredClone(encounter),
    playtimeSeconds:
      save.playtimeSeconds +
      Math.max(0, encounter.elapsed - (previous?.elapsed ?? 0)),
    statistics: {
      ...save.statistics,
      kills:
        save.statistics.kills +
        Math.max(0, encounter.kills - (previous?.kills ?? 0)),
      shots:
        save.statistics.shots +
        Math.max(0, encounter.shots - (previous?.shots ?? 0)),
      hits:
        save.statistics.hits +
        Math.max(0, encounter.hits - (previous?.hits ?? 0)),
    },
  };
}

export function collectLoot(save: SaveData, id: string): SaveData {
  const key =
    'cache-' +
    save.campaign.stage +
    '-' +
    (save.activeOperation ?? '') +
    '-' +
    (save.activeOperation ? save.operations[save.activeOperation] : '') +
    '-' +
    id;
  if (save.achievements.includes(key)) return save;
  return {
    ...save,
    resources: {
      ...save.resources,
      credits: save.resources.credits + 35,
      salvage: save.resources.salvage + 30,
    },
    achievements: [...save.achievements, key],
  };
}

export function canFinishCollector(save: SaveData): boolean {
  return (
    save.campaign.stage === 'collector' && save.campaign.collectorAnchors === 0
  );
}
