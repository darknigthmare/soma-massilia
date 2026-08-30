import { STATION_INSTALLATIONS } from './content';
import type { BodyId, RouteId, SaveData, StationLevels } from './types';

export function beginCampaign(save: SaveData, bodyId: BodyId, route: RouteId): SaveData {
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
        next.campaign.route === 'identity' ? 25 : next.campaign.route === 'sabotage' ? 18 : 10;
      next.campaign.stage = 'collector';
      next.campaign.checkpoint = 'nara-recrutee';
      next.companions.nara = { recruited: true, trust: next.campaign.naraTrust, order: 'follow' };
      next.resources.influence += 20;
      next.resources.xp += 150;
      next.weapons.rifle.unlocked = true;
      next.bodies.mole.unlocked = true;
      next.bodies.sibylle.unlocked = true;
      next.codex = [...new Set([...next.codex, 'nara'])];
      break;
    case 'anchor-destroyed':
      if (next.campaign.stage !== 'collector') return save;
      next.campaign.collectorAnchors = Math.max(0, next.campaign.collectorAnchors - 1);
      next.resources.data += 20;
      next.resources.xp += 60;
      break;
    case 'collector-transfer':
      if (next.campaign.stage !== 'collector') return save;
      next.campaign.collectorTransfers = Math.min(3, next.campaign.collectorTransfers + 1);
      break;
    case 'collector-defeated':
      if (next.campaign.stage !== 'collector' || next.campaign.collectorAnchors > 0) return save;
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
      if (next.campaign.stage !== 'station') return save;
      next.campaign.stage = 'complete';
      next.campaign.checkpoint = 'cellule-null-fondee';
      next.campaign.endingsSeen = [...new Set([...next.campaign.endingsSeen, 'prologue-cellule-null'])];
      next.achievements = [...new Set([...next.achievements, 'cellule-null'])];
      break;
    default:
      return save;
  }

  return next;
}

export function upgradeStation(save: SaveData, installationId: keyof StationLevels): SaveData {
  const installation = STATION_INSTALLATIONS.find((item) => item.id === installationId);
  if (!installation) return save;

  const current = save.station[installationId];
  if (current >= 3) return save;
  const target = current + 1;
  const coreCap = installationId === 'core' ? 3 : Math.max(1, save.station.core);
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

export function setNaraOrder(save: SaveData, order: SaveData['companions']['nara']['order']): SaveData {
  return {
    ...save,
    companions: { nara: { ...save.companions.nara, order } },
  };
}

export function resolveSyndicateOperation(
  save: SaveData,
  operation: 'velours' | 'mistral' | 'phocee',
): SaveData {
  if (!save.campaign.stationReached) return save;
  const rewards = {
    velours: { influence: 12, credits: 55, data: 18, salvage: 0 },
    mistral: { influence: 18, credits: 20, data: 8, salvage: 35 },
    phocee: { influence: 8, credits: 80, data: 0, salvage: 25 },
  }[operation];
  return {
    ...save,
    updatedAt: new Date().toISOString(),
    resources: {
      ...save.resources,
      influence: save.resources.influence + rewards.influence,
      credits: save.resources.credits + rewards.credits,
      data: save.resources.data + rewards.data,
      salvage: save.resources.salvage + rewards.salvage,
    },
    achievements: [...new Set([...save.achievements, `operation-${operation}`])],
  };
}

export function canFinishCollector(save: SaveData): boolean {
  return save.campaign.stage === 'collector' && save.campaign.collectorAnchors === 0;
}
