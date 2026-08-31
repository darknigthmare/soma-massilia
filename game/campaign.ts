import {
  AGENTS,
  CAMPAIGN_ENDINGS,
  CAMPAIGN_FACTIONS,
  DISTRICTS,
  FACILITIES,
  IMPLANTS,
  MISSIONS,
  SKILLS,
} from './campaign-data';
import type { CampaignBonuses, MissionDefinition } from './campaign-data';
import type {
  AgentId,
  ContinuityState,
  DistrictId,
  EndingId,
  FacilityId,
  MissionId,
} from './continuity-types';
import type { BodyId, NaraOrder, RouteId, SaveData } from './types';

const BODY_CAPACITY: Record<BodyId, number> = {
  mistral: 60,
  mole: 100,
  sibylle: 80,
};
const ORDERS: NaraOrder[] = [
  'follow',
  'hold',
  'cover',
  'focus',
  'interact',
  'move',
];
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const integer = (value: unknown, fallback: number, min = 0, max = 100) =>
  typeof value === 'number' && Number.isFinite(value)
    ? clamp(Math.floor(value), min, max)
    : fallback;
const strings = (value: unknown) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter((item): item is string => typeof item === 'string'),
        ),
      ].slice(0, 200)
    : [];
const bodyId = (value: unknown, fallback: BodyId): BodyId =>
  value === 'mistral' || value === 'mole' || value === 'sibylle'
    ? value
    : fallback;
const missionById = (id: unknown) =>
  MISSIONS.find((mission) => mission.id === id);
const appendJournal = (continuity: ContinuityState, text: string) => {
  continuity.journal = [...continuity.journal, text].slice(-100);
};
const copy = (save: SaveData): SaveData => {
  const next = structuredClone(save);
  next.continuity = normalizeContinuity(save.continuity, save);
  next.updatedAt = new Date().toISOString();
  return next;
};
const unlocked = (save: SaveData) =>
  save.campaign.stationReached || save.campaign.collectorDefeated;
const atBase = (save: SaveData) =>
  unlocked(save) &&
  !['flesh', 'exodus'].includes(save.continuity.ending ?? '') &&
  (save.campaign.stage === 'station' ||
    save.campaign.stage === 'complete' ||
    (save.campaign.stage === 'district' &&
      save.continuity.active?.district === 'station'));

export function createContinuity(): ContinuityState {
  return {
    chapter: 0,
    cycle: 0,
    active: null,
    completed: {},
    visited: [],
    factions: {
      soma: -20,
      euromed: 0,
      velours: 5,
      phocee: 5,
      mistral: 0,
      if: -15,
      chalk: 0,
    },
    territories: Object.fromEntries(
      DISTRICTS.map((district) => [
        district.id,
        { control: 0, unrest: 15, liberated: false },
      ]),
    ) as ContinuityState['territories'],
    agents: Object.fromEntries(
      AGENTS.map((agent) => [
        agent.id,
        {
          recruited: false,
          trust: 0,
          body: agent.body,
          order: 'follow',
          fatigue: 0,
        },
      ]),
    ) as ContinuityState['agents'],
    selectedAgent: 'nara',
    facilities: Object.fromEntries(
      FACILITIES.map((facility) => [facility.id, 0]),
    ) as ContinuityState['facilities'],
    implants: [],
    ownedImplants: [],
    skills: [],
    lease: { debt: 40, due: 3, owned: false },
    somatic: 0,
    memory: 100,
    identity: { name: 'Le Revenant', presentation: 'neutral' },
    ending: null,
    journal: [
      'VÉNUS : la continuité n’est pas la propriété. Le Protocole Incarnation reste à découvrir.',
    ],
  };
}

/** Accept only known identifiers. Old prologue saves gain this layer without replaying the prologue. */
export function normalizeContinuity(
  raw: unknown,
  save: SaveData,
): ContinuityState {
  const fresh = createContinuity(),
    source = record(raw),
    completed = record(source.completed);
  for (const mission of MISSIONS) {
    const choice = mission.choices.find(
      (item) => item.id === completed[mission.id],
    );
    if (choice && mission.requires.every((id) => fresh.completed[id]))
      fresh.completed[mission.id] = choice.id;
  }
  fresh.chapter = Object.keys(fresh.completed).length;
  fresh.cycle = integer(source.cycle, fresh.chapter, fresh.chapter, 1_000_000);
  fresh.visited = strings(source.visited).filter((id): id is DistrictId =>
    DISTRICTS.some((item) => item.id === id),
  );
  const factions = record(source.factions),
    territories = record(source.territories),
    agents = record(source.agents),
    facilities = record(source.facilities);
  for (const faction of CAMPAIGN_FACTIONS)
    fresh.factions[faction.id] = integer(
      factions[faction.id],
      fresh.factions[faction.id],
      -100,
      100,
    );
  for (const district of DISTRICTS) {
    const state = record(territories[district.id]);
    fresh.territories[district.id] = {
      control: integer(state.control, 0, -100, 100),
      unrest: integer(state.unrest, 15),
      liberated: state.liberated === true,
    };
  }
  for (const agent of AGENTS) {
    const state = record(agents[agent.id]);
    const order = ORDERS.includes(state.order as NaraOrder)
      ? (state.order as NaraOrder)
      : 'follow';
    fresh.agents[agent.id] = {
      recruited: state.recruited === true,
      trust: integer(state.trust, 0, -100, 100),
      fatigue: integer(state.fatigue, 0),
      body: bodyId(state.body, agent.body),
      order,
    };
  }
  if (save.companions.nara.recruited) {
    fresh.agents.nara.recruited = true;
    fresh.agents.nara.trust = Math.max(
      fresh.agents.nara.trust,
      save.companions.nara.trust,
    );
  }
  for (const mission of MISSIONS) {
    const recruit = mission.choices.find(
      (choice) => choice.id === fresh.completed[mission.id],
    )?.recruit;
    if (recruit) fresh.agents[recruit].recruited = true;
  }
  fresh.selectedAgent = AGENTS.some(
    (agent) =>
      agent.id === source.selectedAgent && fresh.agents[agent.id].recruited,
  )
    ? (source.selectedAgent as AgentId)
    : 'nara';
  for (const facility of FACILITIES)
    fresh.facilities[facility.id] = integer(facilities[facility.id], 0, 0, 3);
  fresh.ownedImplants = strings(source.ownedImplants).filter((id) =>
    IMPLANTS.some((implant) => implant.id === id),
  );
  let capacity =
    BODY_CAPACITY[save.campaign.bodyId ?? 'mistral'] +
    fresh.facilities.morphology * 10;
  fresh.implants = strings(source.implants).filter((id) => {
    const implant = IMPLANTS.find((item) => item.id === id);
    if (
      !implant ||
      !fresh.ownedImplants.includes(id) ||
      implant.load > capacity
    )
      return false;
    capacity -= implant.load;
    return true;
  });
  const requestedSkills = strings(source.skills);
  let points = Math.max(
    0,
    Math.floor(save.resources.xp / 200) -
      Object.values(save.talents).reduce((total, rank) => total + rank, 0),
  );
  for (const skill of SKILLS)
    if (
      requestedSkills.includes(skill.id) &&
      (!skill.requires || fresh.skills.includes(skill.requires)) &&
      points >= skill.cost
    ) {
      fresh.skills.push(skill.id);
      points -= skill.cost;
    }
  const lease = record(source.lease);
  fresh.lease = {
    debt: integer(lease.debt, 40, 0, 100_000),
    due: integer(lease.due, 3, 0, 3),
    owned: lease.owned === true,
  };
  fresh.somatic = integer(source.somatic, 0);
  fresh.memory = integer(source.memory, 100);
  const identity = record(source.identity);
  fresh.identity.name =
    typeof identity.name === 'string'
      ? Array.from(identity.name)
          .filter(
            (character) =>
              character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
          )
          .join('')
          .trim()
          .slice(0, 40) || 'Le Revenant'
      : 'Le Revenant';
  fresh.identity.presentation = [
    'neutral',
    'corporate',
    'velours',
    'worker',
  ].includes(identity.presentation as string)
    ? (identity.presentation as ContinuityState['identity']['presentation'])
    : 'neutral';
  fresh.ending =
    fresh.completed.incarnation &&
    CAMPAIGN_ENDINGS.some((ending) => ending.id === source.ending)
      ? (source.ending as EndingId)
      : null;
  fresh.journal = strings(source.journal)
    .map((line) => line.slice(0, 800))
    .slice(-100);
  if (!fresh.journal.length) fresh.journal = createContinuity().journal;
  const active = record(source.active);
  const district =
    DISTRICTS.find((item) => item.id === active.district)?.id ??
    (active.district === 'station' ? 'station' : null);
  const mission = missionById(active.mission);
  const canResume =
    unlocked(save) &&
    district &&
    (active.mission === null ||
      (mission &&
        mission.district === district &&
        !fresh.completed[mission.id] &&
        mission.requires.every((id) => fresh.completed[id])));
  if (canResume) {
    const allowed = [
      ...(mission?.objectives.map((item) => item.id) ?? []),
      ...(district === 'station' ? [] : [`relay.${district}`]),
    ];
    const objectives = strings(active.objectives).filter((id) =>
      allowed.includes(id),
    );
    fresh.active = {
      district,
      mission: mission?.id ?? null,
      approach: ['combat', 'identity', 'sabotage'].includes(
        active.approach as string,
      )
        ? (active.approach as RouteId)
        : 'sabotage',
      objectives,
      choice:
        mission &&
        mission.objectives.every((item) => objectives.includes(item.id)) &&
        mission.choices.some((choice) => choice.id === active.choice)
          ? (active.choice as string)
          : null,
    };
  }
  return fresh;
}

export function availableMissions(save: SaveData): MissionDefinition[] {
  if (!unlocked(save) || save.continuity.ending) return [];
  return MISSIONS.filter(
    (mission) =>
      !save.continuity.completed[mission.id] &&
      mission.requires.every((id) => save.continuity.completed[id]),
  );
}

export function beginExpedition(
  save: SaveData,
  district: DistrictId | 'station',
  mission: MissionId | null,
  approach: RouteId,
): SaveData {
  if (
    !atBase(save) ||
    save.continuity.active ||
    !['combat', 'identity', 'sabotage'].includes(approach)
  )
    return save;
  if (district !== 'station' && !DISTRICTS.some((item) => item.id === district))
    return save;
  const definition = missionById(mission);
  if (
    mission !== null &&
    (!definition ||
      definition.district !== district ||
      !availableMissions(save).some((item) => item.id === mission))
  )
    return save;
  const next = copy(save);
  next.continuity.active = {
    district,
    mission,
    approach: mission === 'velvet' ? 'identity' : approach,
    objectives: [],
    choice: null,
  };
  if (district !== 'station')
    next.continuity.visited = [
      ...new Set([...next.continuity.visited, district]),
    ];
  next.campaign.stage = 'district';
  next.campaign.checkpoint = definition
    ? `mission-${definition.id}`
    : `district-${district}`;
  next.activeOperation = null;
  next.encounter = null;
  appendJournal(
    next.continuity,
    definition
      ? `Départ : ${definition.title}. ${mission === 'velvet' ? 'Infiltration désarmée sous couverture.' : 'Les preuves ne valent que si vous revenez.'}`
      : `Exploration : ${district === 'station' ? 'Station Zéro' : DISTRICTS.find((item) => item.id === district)!.name}.`,
  );
  return next;
}

export function recordObjective(save: SaveData, id: string): SaveData {
  const active = save.continuity.active;
  if (
    !active ||
    save.campaign.stage !== 'district' ||
    active.objectives.includes(id)
  )
    return save;
  const mission = missionById(active.mission);
  const valid =
    mission?.objectives.some((objective) => objective.id === id) ||
    (active.district !== 'station' &&
      id === `relay.${active.district}` &&
      !save.continuity.territories[active.district].liberated);
  if (!valid) return save;
  const next = copy(save);
  next.continuity.active!.objectives.push(id);
  appendJournal(
    next.continuity,
    `Objectif : ${mission?.objectives.find((objective) => objective.id === id)?.label ?? 'Relais de concession neutralisé'}. Extraction encore nécessaire.`,
  );
  return next;
}

export function chooseMission(save: SaveData, choice: string): SaveData {
  const active = save.continuity.active,
    mission = missionById(active?.mission);
  if (
    save.campaign.stage !== 'district' ||
    !active ||
    !mission ||
    active.choice ||
    !mission.objectives.every((objective) =>
      active.objectives.includes(objective.id),
    ) ||
    !mission.choices.some((item) => item.id === choice)
  )
    return save;
  const next = copy(save);
  next.continuity.active!.choice = choice;
  return next;
}

/** A choice becomes political reality only when its witnesses/data are extracted. No instant mission rewards. */
export function finishExpedition(save: SaveData): SaveData {
  const active = save.continuity.active;
  if (!active || save.campaign.stage !== 'district') return save;
  const mission = missionById(active.mission),
    choice = mission?.choices.find((item) => item.id === active.choice);
  if (
    mission &&
    (save.continuity.completed[mission.id] ||
      !choice ||
      !mission.objectives.every((objective) =>
        active.objectives.includes(objective.id),
      ))
  )
    return save;
  const next = copy(save),
    continuity = next.continuity;
  if (mission && choice) {
    continuity.completed[mission.id] = choice.id;
    continuity.chapter = Object.keys(continuity.completed).length;
    continuity.cycle += 1;
    const reward = { ...mission.reward };
    reward.credits = Math.round(
      reward.credits * (1 + continuity.facilities.garage * 0.1),
    );
    reward.data = Math.round(
      reward.data * (1 + continuity.facilities.interrogation * 0.1),
    );
    reward.influence = Math.round(
      reward.influence * (1 + continuity.facilities.command * 0.1),
    );
    for (const key of Object.keys(reward) as (keyof typeof reward)[])
      next.resources[key] += reward[key];
    if (choice.faction)
      continuity.factions[choice.faction] = clamp(
        continuity.factions[choice.faction] + (choice.reputation ?? 0),
        -100,
        100,
      );
    const district = continuity.territories[mission.district],
      emancipation = (choice.control ?? 0) >= 0;
    const control =
      (choice.control ?? 0) +
      (emancipation ? continuity.facilities.media * 3 : 0);
    district.control = clamp(district.control + control, -100, 100);
    district.unrest = clamp(
      district.unrest +
        (active.approach === 'combat' ? 15 : -5) +
        (emancipation ? -10 : 10),
      0,
      100,
    );
    if (district.control >= 50) district.liberated = true;
    const opposition = emancipation ? 'soma' : 'phocee';
    continuity.factions[opposition] = clamp(
      continuity.factions[opposition] - 10,
      -100,
      100,
    );
    if (choice.recruit) {
      continuity.agents[choice.recruit].recruited = true;
      continuity.agents[choice.recruit].trust = Math.max(
        35,
        continuity.agents[choice.recruit].trust,
      );
      appendJournal(
        continuity,
        `${AGENTS.find((agent) => agent.id === choice.recruit)!.name} rejoint volontairement la Cellule NULL.`,
      );
    }
    for (const agent of AGENTS)
      if (continuity.agents[agent.id].recruited) {
        const state = continuity.agents[agent.id];
        state.trust = clamp(
          state.trust + (emancipation ? 5 : -8) + continuity.facilities.bar * 2,
          -100,
          100,
        );
        state.fatigue = clamp(
          state.fatigue +
            (active.approach === 'combat' ? 20 : 10) -
            continuity.facilities.quarters * 10,
          0,
          100,
        );
      }
    continuity.somatic = clamp(
      continuity.somatic + 8 - continuity.facilities.refuge * 8,
      0,
      100,
    );
    continuity.memory = clamp(
      continuity.memory + continuity.facilities.chapel * 5,
      0,
      100,
    );
    if (!continuity.lease.owned) {
      continuity.lease.due = Math.max(0, continuity.lease.due - 1);
      if (!continuity.lease.due) {
        continuity.lease.debt = Math.min(100_000, continuity.lease.debt + 60);
        continuity.lease.due = 3;
        appendJournal(
          continuity,
          'Échéance somatique : 60 crédits de loyer ajoutés à la dette. Le paiement reste disponible à Station Zéro.',
        );
      }
    }
    appendJournal(continuity, `${mission.title} — ${choice.text}`);
    appendJournal(
      continuity,
      `Extraction confirmée : +${reward.credits} crédits, +${reward.salvage} ferraille, +${reward.data} données, +${reward.influence} influence, +${reward.xp} XP.`,
    );
    next.achievements = [
      ...new Set([...next.achievements, `campaign-${mission.id}`]),
    ];
  }
  // Optional district relays also survive story missions; use the pre-extraction flag
  // so political gains in this same extraction cannot swallow the relay reward.
  if (
    active.district !== 'station' &&
    active.objectives.includes(`relay.${active.district}`) &&
    !save.continuity.territories[active.district].liberated
  ) {
    const territory = continuity.territories[active.district];
    territory.control = Math.max(60, territory.control + 35);
    territory.unrest = Math.max(0, territory.unrest - 10);
    territory.liberated = true;
    next.resources.influence += 15;
    next.resources.data += 30;
    next.resources.xp += 80;
    appendJournal(
      continuity,
      `Le relais de ${DISTRICTS.find((district) => district.id === active.district)!.name} passe sous contrôle local : +15 influence, +30 données, +80 XP. Les gardes perdent leur autorité sur ce secteur.`,
    );
  }
  next.companions.nara.trust = continuity.agents.nara.trust;
  next.campaign.naraTrust = continuity.agents.nara.trust;
  continuity.active = null;
  next.campaign.stage = 'station';
  next.campaign.checkpoint = mission
    ? `extraction-${mission.id}`
    : 'station-zero';
  next.encounter = null;
  return next;
}

export function implantCapacity(save: SaveData): number {
  return (
    BODY_CAPACITY[save.campaign.bodyId ?? 'mistral'] +
    save.continuity.facilities.morphology * 10
  );
}
export function implantLoad(save: SaveData): number {
  return IMPLANTS.filter((implant) =>
    save.continuity.implants.includes(implant.id),
  ).reduce((total, implant) => total + implant.load, 0);
}

export function buyImplant(save: SaveData, id: string): SaveData {
  const implant = IMPLANTS.find((item) => item.id === id);
  if (
    !atBase(save) ||
    !implant ||
    save.continuity.ownedImplants.includes(id) ||
    save.resources.credits < implant.cost
  )
    return save;
  const next = copy(save);
  next.resources.credits -= implant.cost;
  next.continuity.ownedImplants.push(id);
  appendJournal(
    next.continuity,
    `${implant.name} acquis. Activez-le après contrôle de la capacité somatique.`,
  );
  return next;
}

export function toggleImplant(save: SaveData, id: string): SaveData {
  const implant = IMPLANTS.find((item) => item.id === id);
  if (!atBase(save) || !implant || !save.continuity.ownedImplants.includes(id))
    return save;
  const active = save.continuity.implants.includes(id);
  if (!active && implantLoad(save) + implant.load > implantCapacity(save))
    return save;
  const next = copy(save);
  next.continuity.implants = active
    ? next.continuity.implants.filter((item) => item !== id)
    : [...next.continuity.implants, id];
  appendJournal(
    next.continuity,
    `${implant.name} ${active ? 'retiré' : 'installé'}.`,
  );
  return next;
}

export function availableSkillPoints(save: SaveData): number {
  const spent = SKILLS.filter((skill) =>
    save.continuity.skills.includes(skill.id),
  ).reduce((sum, skill) => sum + skill.cost, 0);
  return Math.max(
    0,
    Math.floor(save.resources.xp / 200) -
      Object.values(save.talents).reduce((sum, rank) => sum + rank, 0) -
      spent,
  );
}

export function buySkill(save: SaveData, id: string): SaveData {
  const skill = SKILLS.find((item) => item.id === id);
  if (
    !atBase(save) ||
    !skill ||
    save.continuity.skills.includes(id) ||
    (skill.requires && !save.continuity.skills.includes(skill.requires)) ||
    availableSkillPoints(save) < skill.cost
  )
    return save;
  const next = copy(save);
  next.continuity.skills.push(id);
  appendJournal(
    next.continuity,
    `Apprentissage : ${skill.name}. ${skill.description}`,
  );
  return next;
}

export function upgradeFacility(save: SaveData, id: FacilityId): SaveData {
  const facility = FACILITIES.find((item) => item.id === id);
  if (!atBase(save) || !facility) return save;
  const level = save.continuity.facilities[id],
    cost = facility.cost * (level + 1);
  if (level >= 3 || save.resources.salvage < cost) return save;
  const next = copy(save);
  next.resources.salvage -= cost;
  next.continuity.facilities[id] += 1;
  appendJournal(
    next.continuity,
    `${facility.name} passe au niveau ${level + 1}. ${facility.effect}`,
  );
  return next;
}

export function changeBody(save: SaveData, id: BodyId): SaveData {
  if (
    !atBase(save) ||
    !Object.hasOwn(BODY_CAPACITY, id) ||
    !save.bodies[id]?.unlocked ||
    save.campaign.bodyId === id
  )
    return save;
  const capacity =
    BODY_CAPACITY[id] + save.continuity.facilities.morphology * 10;
  if (implantLoad(save) > capacity) return save;
  const next = copy(save);
  next.campaign.bodyId = id;
  next.encounter = null;
  next.continuity.somatic = clamp(
    next.continuity.somatic +
      Math.max(4, 20 - next.continuity.facilities.transfer * 4),
    0,
    100,
  );
  next.continuity.memory = clamp(
    next.continuity.memory -
      Math.max(0, 5 - next.continuity.facilities.lab * 2),
    0,
    100,
  );
  if (!next.continuity.lease.owned)
    next.continuity.lease.debt = Math.min(
      100_000,
      next.continuity.lease.debt + 20,
    );
  appendJournal(
    next.continuity,
    `Transfert vers ${id.toUpperCase()} : tension ${next.continuity.somatic}/100, mémoire ${next.continuity.memory}/100.${next.continuity.lease.owned ? '' : ' Frais de licence : 20 crédits.'}`,
  );
  return next;
}

export function payLease(save: SaveData): SaveData {
  if (
    !atBase(save) ||
    save.continuity.lease.debt <= 0 ||
    save.resources.credits <= 0
  )
    return save;
  const next = copy(save),
    payment = Math.min(next.resources.credits, next.continuity.lease.debt);
  next.resources.credits -= payment;
  next.continuity.lease.debt -= payment;
  appendJournal(
    next.continuity,
    `Dette somatique : ${payment} crédits payés. Solde ${next.continuity.lease.debt}.`,
  );
  return next;
}

export function restContinuity(save: SaveData): SaveData {
  const cost = save.continuity.facilities.refuge ? 0 : 35;
  if (
    !atBase(save) ||
    save.resources.credits < cost ||
    (save.continuity.memory === 100 &&
      save.continuity.somatic === 0 &&
      AGENTS.every((agent) => save.continuity.agents[agent.id].fatigue === 0))
  )
    return save;
  const next = copy(save);
  next.resources.credits -= cost;
  next.continuity.memory = Math.min(
    100,
    next.continuity.memory + 20 + next.continuity.facilities.chapel * 5,
  );
  next.continuity.somatic = Math.max(
    0,
    next.continuity.somatic - 30 - next.continuity.facilities.refuge * 5,
  );
  for (const agent of AGENTS)
    next.continuity.agents[agent.id].fatigue = Math.max(
      0,
      next.continuity.agents[agent.id].fatigue -
        40 -
        next.continuity.facilities.quarters * 10,
    );
  appendJournal(
    next.continuity,
    `Repos à Station Zéro : mémoire et compatibilité stabilisées; fatigue réduite.${cost ? ` Coût : ${cost} crédits.` : ' Le refuge prend les soins en charge.'}`,
  );
  return next;
}

export function chooseEnding(save: SaveData, id: EndingId): SaveData {
  const ending = CAMPAIGN_ENDINGS.find((item) => item.id === id);
  if (
    !atBase(save) ||
    !ending ||
    !save.continuity.completed.incarnation ||
    save.continuity.ending
  )
    return save;
  const next = copy(save),
    continuity = next.continuity;
  continuity.ending = id;
  if (id === 'liberation') {
    continuity.lease = { debt: 0, due: 3, owned: true };
    for (const district of DISTRICTS)
      continuity.territories[district.id] = {
        control: 100,
        unrest: 35,
        liberated: true,
      };
    continuity.factions.phocee = 100;
    continuity.factions.soma = -100;
  } else if (id === 'syndicate') {
    continuity.lease = { debt: 0, due: 3, owned: true };
    continuity.factions.soma = 100;
    continuity.factions.euromed = Math.max(50, continuity.factions.euromed);
    next.resources.credits += 600;
    for (const district of DISTRICTS) {
      continuity.territories[district.id].control = -50;
      continuity.territories[district.id].liberated = false;
    }
    continuity.agents.nara.trust = clamp(
      continuity.agents.nara.trust - 25,
      -100,
      100,
    );
  } else if (id === 'communion') {
    continuity.factions.mistral = 100;
    continuity.memory = 100;
    continuity.somatic = 0;
    continuity.lease = { debt: 0, due: 3, owned: true };
  } else if (id === 'exodus') {
    continuity.memory = 100;
    continuity.somatic = 0;
    continuity.factions.mistral = Math.max(60, continuity.factions.mistral);
    continuity.implants = [];
    continuity.lease = { debt: 0, due: 3, owned: true };
  } else {
    continuity.factions.chalk = 100;
    continuity.implants = [];
    continuity.somatic = 0;
    continuity.memory = 100;
    continuity.lease = { debt: 0, due: 3, owned: true };
  }
  next.companions.nara.trust = continuity.agents.nara.trust;
  next.campaign.naraTrust = continuity.agents.nara.trust;
  next.campaign.endingsSeen = [
    ...new Set([...next.campaign.endingsSeen, `campaign-${id}`]),
  ];
  next.achievements = [...new Set([...next.achievements, `ending-${id}`])];
  appendJournal(continuity, `${ending.title} — ${ending.text}`);
  return next;
}

/** All fields are additive; fraction fields are 0.1 = +10%, regeneration is integrity/second. */
export function implantBonuses(save: SaveData): CampaignBonuses {
  const result: CampaignBonuses = {
    health: 0,
    armor: 0,
    neural: 0,
    speed: 0,
    damage: 0,
    stealth: 0,
    pulse: 0,
    possession: 0,
    regen: 0,
  };
  const continuity = save.continuity;
  if (!continuity) return result;
  const effects = [
    ...IMPLANTS.filter((item) => continuity.implants.includes(item.id)),
    ...SKILLS.filter((item) => continuity.skills.includes(item.id)),
  ];
  for (const item of effects)
    for (const key of Object.keys(item.effect) as (keyof CampaignBonuses)[])
      result[key] += item.effect[key] ?? 0;
  result.health += continuity.facilities.refuge * 10;
  result.neural += continuity.facilities.drones * 10;
  result.damage += continuity.facilities.armory * 0.05;
  result.speed = Math.min(0.5, result.speed);
  result.damage = Math.min(2, result.damage);
  result.stealth = Math.min(0.75, result.stealth);
  result.pulse = Math.min(3, result.pulse);
  result.possession = Math.min(0.75, result.possession);
  return result;
}
