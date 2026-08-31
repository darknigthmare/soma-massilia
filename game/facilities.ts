import { AGENTS, DISTRICTS, FACILITIES } from './campaign-data';
import type {
  AgentId,
  DistrictId,
  FacilityReadiness,
  FacilityId,
} from './continuity-types';
import type { EncounterState, Resources, SaveData } from './types';

export type WeaponCalibration = 'none' | 'precision' | 'rupture' | 'quiet';
export type DronePackage = 'none' | 'scout' | 'recovery';
export type InsertionMode = 'metro' | 'roof' | 'skiff';

export type FacilityReadinessState = FacilityReadiness;

export type FacilityActionId =
  | 'morphology.reconcile'
  | 'lab.synthesize-stabilizer'
  | 'armory.calibrate'
  | 'drones.prepare-package'
  | 'transfer.assign-emergency'
  | 'chapel.restore-memory'
  | 'bar.debrief-agent'
  | 'command.assign-lead'
  | 'interrogation.process-evidence'
  | 'media.broadcast'
  | 'garage.prepare-insertion'
  | 'quarters.rest-agent'
  | 'refuge.host-resident';

export type FacilityActionCost = Partial<Record<keyof Resources, number>>;

export interface FacilityActionOption {
  id: string;
  label: string;
  description?: string;
  available: boolean;
  reason: string | null;
}

export interface FacilityActionView {
  id: FacilityActionId;
  facilityId: FacilityId;
  label: string;
  description: string;
  result: string;
  minLevel: number;
  cooldown: 'cycle';
  cost: FacilityActionCost;
  options: FacilityActionOption[];
  available: boolean;
  reason: string | null;
}

type ContinuityWithReadiness = SaveData['continuity'] & {
  facilityReadiness?: FacilityReadinessState;
};

interface ActionDefinition {
  id: FacilityActionId;
  facilityId: FacilityId;
  label: string;
  description: string;
  result: string;
  minLevel: number;
  cost: FacilityActionCost;
  options?: (
    save: SaveData,
    readiness: FacilityReadinessState,
  ) => FacilityActionOption[];
  prerequisite?: (
    save: SaveData,
    readiness: FacilityReadinessState,
  ) => string | null;
  apply: (
    save: SaveData,
    readiness: FacilityReadinessState,
    payload?: string,
  ) => void;
}

const RESOURCE_LABELS: Record<keyof Resources, string> = {
  credits: 'crédits',
  influence: 'influence',
  salvage: 'ferraille',
  data: 'données',
  xp: 'XP',
};

const CALIBRATIONS: readonly FacilityActionOption[] = [
  {
    id: 'precision',
    label: 'Précision',
    description: 'Prépare une visée stable pour la prochaine sortie.',
    available: true,
    reason: null,
  },
  {
    id: 'rupture',
    label: 'Rupture',
    description: 'Prépare des réglages contre les blindages.',
    available: true,
    reason: null,
  },
  {
    id: 'quiet',
    label: 'Silencieux',
    description: 'Prépare une signature sonore réduite.',
    available: true,
    reason: null,
  },
];

const DRONE_PACKAGES: readonly FacilityActionOption[] = [
  {
    id: 'scout',
    label: 'Reconnaissance',
    description: 'Prépare les capteurs et la cartographie locale.',
    available: true,
    reason: null,
  },
  {
    id: 'recovery',
    label: 'Récupération',
    description: 'Prépare le remorquage et les outils de secours.',
    available: true,
    reason: null,
  },
];

export function createFacilityReadiness(): FacilityReadinessState {
  return {
    lastUsedCycle: {},
    stabilizers: 0,
    weaponCalibration: 'none',
    dronePackage: 'none',
    emergencyAgent: null,
    mediaTarget: null,
    insertion: 'metro',
    hostedResidents: 0,
    evidenceProcessed: 0,
  };
}

function readinessOf(save: SaveData): FacilityReadinessState {
  const raw = (save.continuity as ContinuityWithReadiness).facilityReadiness;
  const defaults = createFacilityReadiness();
  if (!raw) return defaults;
  return {
    lastUsedCycle: { ...raw.lastUsedCycle },
    // Preserve normalized imports above the fabrication cap; the lab simply
    // refuses to add another dose once three are available.
    stabilizers: Math.max(0, Math.min(9, Math.floor(raw.stabilizers ?? 0))),
    weaponCalibration: ['none', 'precision', 'rupture', 'quiet'].includes(
      raw.weaponCalibration,
    )
      ? raw.weaponCalibration
      : 'none',
    dronePackage: ['none', 'scout', 'recovery'].includes(raw.dronePackage)
      ? raw.dronePackage
      : 'none',
    emergencyAgent: AGENTS.some((agent) => agent.id === raw.emergencyAgent)
      ? raw.emergencyAgent
      : null,
    mediaTarget: DISTRICTS.some((district) => district.id === raw.mediaTarget)
      ? raw.mediaTarget
      : null,
    insertion: ['metro', 'roof', 'skiff'].includes(raw.insertion)
      ? raw.insertion
      : 'metro',
    hostedResidents: Math.max(0, Math.floor(raw.hostedResidents ?? 0)),
    evidenceProcessed: Math.max(0, Math.floor(raw.evidenceProcessed ?? 0)),
  };
}

function writeReadiness(
  save: SaveData,
  readiness: FacilityReadinessState,
): void {
  (save.continuity as ContinuityWithReadiness).facilityReadiness = readiness;
}

/**
 * Commit one departure atomically: keep the encounter's prepared loadout while
 * returning every single-use installation to its idle state.
 */
export function consumeDeparturePreparations(
  save: SaveData,
  encounter: EncounterState | null = save.encounter,
): SaveData {
  const current = readinessOf(save);
  const prepared =
    current.weaponCalibration !== 'none' ||
    current.dronePackage !== 'none' ||
    current.emergencyAgent !== null ||
    current.insertion !== 'metro';
  const encounterChanged = encounter !== save.encounter;
  if (!prepared && !encounterChanged) return save;

  const next = structuredClone(save);
  const readiness = readinessOf(next);
  readiness.weaponCalibration = 'none';
  readiness.dronePackage = 'none';
  readiness.emergencyAgent = null;
  readiness.insertion = 'metro';
  writeReadiness(next, readiness);
  if (encounterChanged)
    next.encounter = encounter ? structuredClone(encounter) : null;
  if (prepared)
    next.continuity.journal = [
      ...next.continuity.journal,
      'Préparations de sortie consommées : l’arsenal, les drones, le relais et le garage sont revenus en attente.',
    ].slice(-100);
  next.updatedAt = new Date().toISOString();
  return next;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function atStation(save: SaveData): boolean {
  return (
    !['flesh', 'exodus'].includes(save.continuity.ending ?? '') &&
    (save.campaign.stage === 'station' ||
      save.campaign.stage === 'complete' ||
      (save.campaign.stage === 'district' &&
        save.continuity.active?.district === 'station'))
  );
}

function missingResources(
  save: SaveData,
  cost: FacilityActionCost,
): string | null {
  const missing = (Object.keys(cost) as (keyof Resources)[])
    .filter((resource) => save.resources[resource] < (cost[resource] ?? 0))
    .map(
      (resource) =>
        `${(cost[resource] ?? 0) - save.resources[resource]} ${RESOURCE_LABELS[resource]}`,
    );
  return missing.length
    ? `Ressources manquantes : ${missing.join(', ')}.`
    : null;
}

function recruitedAgentOptions(
  save: SaveData,
  predicate: (agent: AgentId) => string | null = () => null,
): FacilityActionOption[] {
  return AGENTS.map((agent) => {
    const recruited = save.continuity.agents[agent.id].recruited;
    const reason = recruited
      ? predicate(agent.id)
      : `${agent.name} n’a pas rejoint la Cellule.`;
    return {
      id: agent.id,
      label: agent.name,
      description: agent.description,
      available: reason === null,
      reason,
    };
  });
}

function districtOptions(save: SaveData): FacilityActionOption[] {
  return DISTRICTS.map((district) => {
    const known = save.continuity.visited.includes(district.id);
    return {
      id: district.id,
      label: district.name,
      description: district.description,
      available: known,
      reason: known ? null : 'Le quartier doit d’abord être reconnu.',
    };
  });
}

function insertionOptions(save: SaveData): FacilityActionOption[] {
  const level = save.continuity.facilities.garage;
  return [
    {
      id: 'metro',
      label: 'Métro clandestin',
      description: 'Insertion stable par le réseau de Station Zéro.',
      available: true,
      reason: null,
    },
    {
      id: 'roof',
      label: 'Dépose en toiture',
      description: 'Itinéraire vertical préparé par l’équipe du garage.',
      available: level >= 2,
      reason: level >= 2 ? null : 'Garage de niveau 2 requis.',
    },
    {
      id: 'skiff',
      label: 'Skiff des canaux',
      description: 'Insertion discrète par les voies d’eau entretenues.',
      available: level >= 3,
      reason: level >= 3 ? null : 'Garage de niveau 3 requis.',
    },
  ];
}

const DEFINITIONS: readonly ActionDefinition[] = [
  {
    id: 'morphology.reconcile',
    facilityId: 'morphology',
    label: 'Réconcilier l’enveloppe',
    description:
      'Effectuer un ajustement volontaire de posture, interfaces et repères proprioceptifs.',
    result: 'Tension somatique −18.',
    minLevel: 1,
    cost: { credits: 25 },
    prerequisite: (save) =>
      save.continuity.somatic > 0
        ? null
        : 'La compatibilité somatique est déjà stable.',
    apply: (save) => {
      save.continuity.somatic = Math.max(0, save.continuity.somatic - 18);
    },
  },
  {
    id: 'lab.synthesize-stabilizer',
    facilityId: 'lab',
    label: 'Synthétiser un stabilisateur',
    description:
      'Transformer des données neurochimiques et des pièces stériles en dose de transfert.',
    result: 'Ajoute un stabilisateur, maximum 3.',
    minLevel: 1,
    cost: { data: 12, salvage: 10 },
    prerequisite: (_save, readiness) =>
      readiness.stabilizers < 3
        ? null
        : 'La réserve contient déjà trois stabilisateurs.',
    apply: (_save, readiness) => {
      readiness.stabilizers = Math.min(3, readiness.stabilizers + 1);
    },
  },
  {
    id: 'armory.calibrate',
    facilityId: 'armory',
    label: 'Calibrer l’armement',
    description:
      'Choisir un réglage documenté pour la prochaine sortie, sans modifier les armes à l’aveugle.',
    result: 'Mémorise un calibrage de précision, rupture ou discrétion.',
    minLevel: 1,
    cost: { salvage: 24, data: 6 },
    options: () => CALIBRATIONS.map((option) => ({ ...option })),
    apply: (_save, readiness, payload) => {
      readiness.weaponCalibration = payload as Exclude<
        WeaponCalibration,
        'none'
      >;
    },
  },
  {
    id: 'drones.prepare-package',
    facilityId: 'drones',
    label: 'Préparer un module drone',
    description:
      'Affecter les batteries et capteurs à la reconnaissance ou au secours.',
    result: 'Mémorise le module drone de la prochaine sortie.',
    minLevel: 1,
    cost: { salvage: 20, data: 10 },
    options: () => DRONE_PACKAGES.map((option) => ({ ...option })),
    apply: (_save, readiness, payload) => {
      readiness.dronePackage = payload as Exclude<DronePackage, 'none'>;
    },
  },
  {
    id: 'transfer.assign-emergency',
    facilityId: 'transfer',
    label: 'Préparer un relais d’urgence',
    description:
      'Désigner un allié recruté et consentant comme relais unique de continuité.',
    result: 'Mémorise l’allié volontaire pour la prochaine sortie.',
    minLevel: 1,
    cost: { data: 18, credits: 10 },
    options: (save) =>
      recruitedAgentOptions(save, (agent) =>
        save.continuity.agents[agent].trust >= 20
          ? null
          : 'Confiance 20 requise pour un consentement valide.',
      ),
    apply: (_save, readiness, payload) => {
      readiness.emergencyAgent = payload as AgentId;
    },
  },
  {
    id: 'chapel.restore-memory',
    facilityId: 'chapel',
    label: 'Restaurer un repère mémoriel',
    description:
      'Comparer volontairement les souvenirs conservés sans créer de copie supplémentaire.',
    result: 'Continuité mémorielle +12.',
    minLevel: 1,
    cost: { data: 8 },
    prerequisite: (save) =>
      save.continuity.memory < 100
        ? null
        : 'La continuité mémorielle est déjà complète.',
    apply: (save) => {
      save.continuity.memory = Math.min(100, save.continuity.memory + 12);
    },
  },
  {
    id: 'bar.debrief-agent',
    facilityId: 'bar',
    label: 'Débriefer avec un équipier',
    description:
      'Offrir du temps hors contrat à un membre recruté, selon son propre rythme.',
    result: 'Fatigue −12 et confiance +3 pour l’agent choisi.',
    minLevel: 1,
    cost: { credits: 20 },
    options: (save) =>
      recruitedAgentOptions(save, (agent) => {
        const state = save.continuity.agents[agent];
        return state.fatigue > 0 || state.trust < 100
          ? null
          : 'Cet équipier est déjà reposé et en confiance maximale.';
      }),
    apply: (save, _readiness, payload) => {
      const agent = payload as AgentId;
      const state = save.continuity.agents[agent];
      state.fatigue = Math.max(0, state.fatigue - 12);
      state.trust = Math.min(100, state.trust + 3);
      if (agent === 'nara') {
        save.companions.nara.trust = state.trust;
        save.campaign.naraTrust = state.trust;
      }
    },
  },
  {
    id: 'command.assign-lead',
    facilityId: 'command',
    label: 'Désigner le relais tactique',
    description:
      'Confier explicitement la coordination de la prochaine sortie à un membre recruté.',
    result: 'Sélectionne l’agent Cortex et réduit sa fatigue de 5.',
    minLevel: 1,
    cost: { influence: 12 },
    options: (save) => recruitedAgentOptions(save),
    apply: (save, _readiness, payload) => {
      const agent = payload as AgentId;
      save.continuity.selectedAgent = agent;
      save.continuity.agents[agent].fatigue = Math.max(
        0,
        save.continuity.agents[agent].fatigue - 5,
      );
    },
  },
  {
    id: 'interrogation.process-evidence',
    facilityId: 'interrogation',
    label: 'Traiter un témoignage volontaire',
    description:
      'Vérifier, anonymiser et indexer une preuve sans coercition ni aveu forcé.',
    result: 'Archive une preuve et convertit 15 données en 8 influence.',
    minLevel: 1,
    cost: { data: 15 },
    prerequisite: (save, readiness) =>
      readiness.evidenceProcessed < (save.continuity.evidence?.length ?? 0)
        ? null
        : 'Aucune preuve volontaire non traitée n’est disponible.',
    apply: (save, readiness) => {
      readiness.evidenceProcessed += 1;
      save.resources.influence += 8;
    },
  },
  {
    id: 'media.broadcast',
    facilityId: 'media',
    label: 'Diffuser des preuves locales',
    description:
      'Choisir un quartier déjà reconnu et publier une preuve contextualisée.',
    result: 'Tension locale −8, contrôle NULL +3 et cible mémorisée.',
    minLevel: 1,
    cost: { data: 12, influence: 5 },
    options: (save) => districtOptions(save),
    prerequisite: (_save, readiness) =>
      readiness.evidenceProcessed > 0
        ? null
        : 'Traitez d’abord un témoignage volontaire.',
    apply: (save, readiness, payload) => {
      const district = payload as DistrictId;
      const territory = save.continuity.territories[district];
      territory.unrest = Math.max(0, territory.unrest - 8);
      territory.control = clamp(territory.control + 3, -100, 100);
      readiness.mediaTarget = district;
    },
  },
  {
    id: 'garage.prepare-insertion',
    facilityId: 'garage',
    label: 'Préparer l’insertion',
    description:
      'Affecter les pièces et l’équipe de conduite à un itinéraire précis.',
    result: 'Mémorise métro, toiture ou skiff pour la prochaine sortie.',
    minLevel: 1,
    cost: { salvage: 18 },
    options: (save) => insertionOptions(save),
    apply: (_save, readiness, payload) => {
      readiness.insertion = payload as InsertionMode;
    },
  },
  {
    id: 'quarters.rest-agent',
    facilityId: 'quarters',
    label: 'Réserver une chambre calme',
    description:
      'Donner à un équipier recruté un espace fermé dont il garde la clé.',
    result: 'Fatigue −25 pour l’agent choisi.',
    minLevel: 1,
    cost: { credits: 15 },
    options: (save) =>
      recruitedAgentOptions(save, (agent) =>
        save.continuity.agents[agent].fatigue > 0
          ? null
          : 'Cet équipier est déjà entièrement reposé.',
      ),
    apply: (save, _readiness, payload) => {
      const agent = payload as AgentId;
      save.continuity.agents[agent].fatigue = Math.max(
        0,
        save.continuity.agents[agent].fatigue - 25,
      );
    },
  },
  {
    id: 'refuge.host-resident',
    facilityId: 'refuge',
    label: 'Accueillir une personne libérée',
    description:
      'Financer une place durable au refuge sans dette corporelle ni transfert imposé.',
    result: 'Ajoute un résident accueilli et renforce la confiance civique.',
    minLevel: 1,
    cost: { credits: 20, salvage: 15 },
    prerequisite: (save, readiness) =>
      readiness.hostedResidents < save.continuity.facilities.refuge * 2
        ? null
        : 'Toutes les places de ce niveau sont occupées.',
    apply: (save, readiness) => {
      readiness.hostedResidents += 1;
      save.resources.influence += 3;
      save.continuity.factions.phocee = Math.min(
        100,
        save.continuity.factions.phocee + 2,
      );
    },
  },
];

function definitionById(id: string): ActionDefinition | undefined {
  return DEFINITIONS.find((definition) => definition.id === id);
}

function actionReason(
  save: SaveData,
  definition: ActionDefinition,
  readiness: FacilityReadinessState,
  options: FacilityActionOption[],
): string | null {
  if (!atStation(save))
    return 'Cette action exige une présence à Station Zéro.';
  const level = save.continuity.facilities[definition.facilityId] ?? 0;
  if (level < definition.minLevel)
    return `Installation de niveau ${definition.minLevel} requise.`;
  if (readiness.lastUsedCycle[definition.facilityId] === save.continuity.cycle)
    return `Action déjà effectuée pendant le cycle ${save.continuity.cycle}.`;
  const missing = missingResources(save, definition.cost);
  if (missing) return missing;
  const prerequisite = definition.prerequisite?.(save, readiness) ?? null;
  if (prerequisite) return prerequisite;
  if (definition.options && !options.some((option) => option.available))
    return 'Aucune option valide pour cette action.';
  return null;
}

export function getFacilityActions(
  save: SaveData,
  facilityId: FacilityId,
): FacilityActionView[] {
  const readiness = readinessOf(save);
  return DEFINITIONS.filter(
    (definition) => definition.facilityId === facilityId,
  ).map((definition) => {
    const options = definition.options?.(save, readiness) ?? [];
    const reason = actionReason(save, definition, readiness, options);
    return {
      id: definition.id,
      facilityId: definition.facilityId,
      label: definition.label,
      description: definition.description,
      result: definition.result,
      minLevel: definition.minLevel,
      cooldown: 'cycle',
      cost: { ...definition.cost },
      options,
      available: reason === null,
      reason,
    };
  });
}

export function performFacilityAction(
  save: SaveData,
  actionId: string,
  payload?: string,
): SaveData {
  const definition = definitionById(actionId);
  if (!definition) return save;
  const view = getFacilityActions(save, definition.facilityId).find(
    (action) => action.id === definition.id,
  );
  if (!view?.available) return save;
  if (definition.options) {
    const selected = view.options.find((option) => option.id === payload);
    if (!selected?.available) return save;
  }

  const next = structuredClone(save);
  const readiness = readinessOf(next);
  for (const resource of Object.keys(definition.cost) as (keyof Resources)[])
    next.resources[resource] -= definition.cost[resource] ?? 0;
  definition.apply(next, readiness, payload);
  readiness.lastUsedCycle[definition.facilityId] = next.continuity.cycle;
  writeReadiness(next, readiness);
  const facility = FACILITIES.find((item) => item.id === definition.facilityId);
  next.continuity.journal = [
    ...next.continuity.journal,
    `${facility?.name ?? definition.facilityId} — ${definition.label}. ${definition.result}`,
  ].slice(-100);
  return next;
}

export const FACILITY_ACTION_IDS = DEFINITIONS.map(
  (definition) => definition.id,
) as readonly FacilityActionId[];
