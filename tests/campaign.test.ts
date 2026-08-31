import { describe, expect, it } from 'vitest';
import {
  AGENTS,
  CAMPAIGN_ENDINGS,
  CAMPAIGN_FACTIONS,
  DISTRICTS,
  FACILITIES,
  IMPLANTS,
  MISSIONS,
  SKILLS,
} from '@/game/campaign-data';
import {
  availableMissions,
  availableSkillPoints,
  beginExpedition,
  buyImplant,
  buySkill,
  changeBody,
  chooseEnding,
  chooseMission,
  createContinuity,
  finishExpedition,
  implantBonuses,
  implantCapacity,
  implantLoad,
  normalizeContinuity,
  payLease,
  recordObjective,
  restContinuity,
  toggleImplant,
  upgradeFacility,
} from '@/game/campaign';
import {
  createNewSave,
  serializeSave,
  deserializeSave,
  migrateSave,
} from '@/game/save';
import type { MissionId } from '@/game/continuity-types';
import type { SaveData } from '@/game/types';

function hub(): SaveData {
  const save = createNewSave();
  save.campaign = {
    ...save.campaign,
    stage: 'station',
    bodyId: 'mistral',
    stationReached: true,
    collectorDefeated: true,
    collectorAnchors: 0,
    naraFreed: true,
  };
  save.companions.nara = { recruited: true, trust: 40, order: 'follow' };
  save.resources = {
    credits: 2000,
    data: 1000,
    salvage: 3000,
    influence: 100,
    xp: 2000,
  };
  for (const body of Object.values(save.bodies)) body.unlocked = true;
  save.continuity = normalizeContinuity(undefined, save);
  return save;
}

function readyToExtract(
  save: SaveData,
  id: MissionId,
  choiceIndex = 0,
): SaveData {
  const mission = MISSIONS.find((item) => item.id === id)!;
  let next = beginExpedition(save, mission.district, id, 'sabotage');
  for (const objective of mission.objectives)
    next = recordObjective(next, objective.id);
  return chooseMission(next, mission.choices[choiceIndex].id);
}

function fullCampaign(): SaveData {
  let save = hub();
  for (const mission of MISSIONS)
    save = finishExpedition(readyToExtract(save, mission.id));
  return save;
}

describe('source-backed long-form campaign data', () => {
  it('contains eight districts, seven factions, thirteen facilities and fifteen prerequisite skills', () => {
    expect(DISTRICTS).toHaveLength(8);
    expect(CAMPAIGN_FACTIONS).toHaveLength(7);
    expect(FACILITIES).toHaveLength(13);
    expect(SKILLS).toHaveLength(15);
    expect(new Set(IMPLANTS.map((item) => item.family)).size).toBe(8);
    expect(AGENTS.map((agent) => agent.age)).toEqual([32, 44, 38]);
    expect(MISSIONS.map((mission) => mission.title)).toEqual([
      'Une Apparence de Trop',
      'Les Années d’If',
      'La Nuit de Velours',
      'Mistral Noir',
      'Bonne Mère, Mauvaise Foi',
      'Le Dernier Abonnement',
    ]);
    expect(CAMPAIGN_ENDINGS.map((ending) => ending.title)).toEqual([
      'Libération somatique',
      'Le Nouveau Syndicat',
      'Conscience commune',
      'Exode numérique',
      'Retour à la chair',
    ]);
    expect(MISSIONS[0].choices).toHaveLength(4);
  });

  it('keeps mission identifiers, objectives and prerequisite links consistent', () => {
    const ids = new Set(MISSIONS.map((mission) => mission.id));
    expect(ids.size).toBe(MISSIONS.length);
    const objectives = MISSIONS.flatMap((mission) =>
      mission.objectives.map((objective) => objective.id),
    );
    expect(new Set(objectives).size).toBe(objectives.length);
    for (const mission of MISSIONS) {
      expect(
        DISTRICTS.some((district) => district.id === mission.district),
      ).toBe(true);
      expect(mission.requires.every((id) => ids.has(id))).toBe(true);
      expect(
        mission.choices.every(
          (choice) =>
            !choice.recruit ||
            AGENTS.some((agent) => agent.id === choice.recruit),
        ),
      ).toBe(true);
    }
  });
});

describe('campaign progression and political consequences', () => {
  it('opens the first new mission for old completed-prologue saves without replaying them', () => {
    const save = hub();
    save.campaign.stage = 'complete';
    save.ending = 'free';
    expect(availableMissions(save).map((item) => item.id)).toEqual([
      'appearance',
    ]);
    expect(
      beginExpedition(save, 'corniche', 'appearance', 'identity').campaign
        .stage,
    ).toBe('district');
    expect(availableMissions(createNewSave())).toEqual([]);
  });

  it('guards district, stage, prerequisites, unknown objectives and premature choices', () => {
    const save = hub();
    expect(beginExpedition(save, 'if', 'years', 'combat')).toBe(save);
    expect(beginExpedition(save, 'if', 'appearance', 'combat')).toBe(save);
    const active = beginExpedition(save, 'corniche', 'appearance', 'identity');
    expect(recordObjective(active, 'not-an-objective')).toBe(active);
    expect(chooseMission(active, 'return-face')).toBe(active);
    expect(finishExpedition(active)).toBe(active);
    expect(beginExpedition(active, 'port', null, 'combat')).toBe(active);
  });

  it('commits rewards only after all objectives, a valid decision and extraction, exactly once', () => {
    const save = hub(),
      ready = readyToExtract(save, 'appearance');
    expect(ready.resources).toEqual(save.resources);
    expect(ready.continuity.factions).toEqual(save.continuity.factions);
    const result = finishExpedition(ready);
    expect(result.resources.xp).toBe(save.resources.xp + MISSIONS[0].reward.xp);
    expect(result.continuity.completed.appearance).toBe('return-face');
    expect(result.continuity.territories.corniche.control).toBe(25);
    expect(result.continuity.factions.phocee).toBe(23);
    expect(result.continuity.active).toBeNull();
    expect(finishExpedition(result)).toBe(result);
    expect(beginExpedition(result, 'corniche', 'appearance', 'identity')).toBe(
      result,
    );
    expect(availableMissions(result).map((item) => item.id)).toEqual(['years']);
  });

  it('makes adverse decisions affect faction power and companion trust', () => {
    const save = hub(),
      result = finishExpedition(readyToExtract(save, 'appearance', 3));
    expect(result.continuity.territories.corniche.control).toBe(-25);
    expect(result.continuity.factions.soma).toBe(-8);
    expect(result.continuity.agents.nara.trust).toBe(32);
    expect(result.companions.nara.trust).toBe(32);
    expect(
      normalizeContinuity(result.continuity, result).agents.nara.trust,
    ).toBe(32);
  });

  it('recruits Idris and Salomé only through the chosen political outcomes', () => {
    const first = finishExpedition(readyToExtract(hub(), 'appearance'));
    const freed = finishExpedition(readyToExtract(first, 'years'));
    const bargained = finishExpedition(readyToExtract(first, 'years', 2));
    expect(freed.continuity.agents.idris.recruited).toBe(true);
    expect(bargained.continuity.agents.idris.recruited).toBe(false);
    const velvet = readyToExtract(freed, 'velvet');
    expect(velvet.continuity.active?.approach).toBe('identity');
    expect(finishExpedition(velvet).continuity.agents.salome.recruited).toBe(
      true,
    );
    expect(
      finishExpedition(readyToExtract(freed, 'velvet', 2)).continuity.agents
        .salome.recruited,
    ).toBe(false);
  });

  it('completes the six-mission sequence and unlocks every canonical ending independently', () => {
    const save = fullCampaign();
    expect(save.continuity.chapter).toBe(6);
    expect(save.continuity.cycle).toBe(6);
    expect(Object.keys(save.continuity.completed)).toHaveLength(6);
    expect(chooseEnding(hub(), 'liberation').continuity.ending).toBeNull();
    for (const ending of CAMPAIGN_ENDINGS) {
      const result = chooseEnding(save, ending.id);
      expect(result.continuity.ending).toBe(ending.id);
      expect(result.achievements).toContain(`ending-${ending.id}`);
      expect(result.continuity.lease.owned).toBe(true);
      expect(chooseEnding(result, 'syndicate')).toBe(result);
      expect(availableMissions(result)).toEqual([]);
    }
    expect(chooseEnding(save, 'syndicate').continuity.factions.soma).toBe(100);
    expect(
      chooseEnding(save, 'liberation').continuity.territories.port.liberated,
    ).toBe(true);
    expect(chooseEnding(save, 'flesh').continuity.implants).toEqual([]);
  });

  it('only rewards a free-exploration relay after extraction and never farms it twice', () => {
    const save = hub();
    const exploring = beginExpedition(save, 'port', null, 'sabotage');
    const hacked = recordObjective(exploring, 'relay.port');
    expect(hacked.resources).toEqual(save.resources);
    const done = finishExpedition(hacked);
    expect(done.resources.xp).toBe(save.resources.xp + 80);
    expect(done.continuity.territories.port.liberated).toBe(true);
    const repeat = beginExpedition(done, 'port', null, 'sabotage');
    expect(recordObjective(repeat, 'relay.port')).toBe(repeat);
    expect(finishExpedition(repeat).resources).toEqual(done.resources);
    expect(done.continuity.cycle).toBe(0);
  });

  it('keeps a story relay optional, persists it, and pays its reward only at extraction', () => {
    const save = hub();
    const started = beginExpedition(save, 'corniche', 'appearance', 'identity');
    const relay = recordObjective(started, 'relay.corniche');
    expect(relay.continuity.active?.objectives).toEqual(['relay.corniche']);
    expect(finishExpedition(relay)).toBe(relay);
    expect(chooseMission(relay, 'return-face')).toBe(relay);
    let resumed = deserializeSave(serializeSave(relay));
    expect(resumed.continuity.active?.objectives).toContain('relay.corniche');
    for (const objective of MISSIONS[0].objectives)
      resumed = recordObjective(resumed, objective.id);
    const extracted = finishExpedition(chooseMission(resumed, 'return-face'));
    expect(extracted.resources.xp).toBe(
      save.resources.xp + MISSIONS[0].reward.xp + 80,
    );
    expect(extracted.resources.data).toBe(
      save.resources.data + MISSIONS[0].reward.data + 30,
    );
    expect(extracted.continuity.territories.corniche.liberated).toBe(true);
    const again = beginExpedition(extracted, 'corniche', null, 'sabotage');
    expect(recordObjective(again, 'relay.corniche')).toBe(again);
    expect(finishExpedition(again).resources).toEqual(extracted.resources);
    const noRelay = finishExpedition(readyToExtract(save, 'appearance'));
    expect(noRelay.continuity.completed.appearance).toBe('return-face');
    expect(noRelay.resources.xp).toBe(
      save.resources.xp + MISSIONS[0].reward.xp,
    );
  });

  it('cannot collect a relay again during a later story in a liberated district', () => {
    const save = hub();
    const liberated = finishExpedition(
      recordObjective(
        beginExpedition(save, 'corniche', null, 'sabotage'),
        'relay.corniche',
      ),
    );
    const story = beginExpedition(
      liberated,
      'corniche',
      'appearance',
      'identity',
    );
    expect(recordObjective(story, 'relay.corniche')).toBe(story);
    const extracted = finishExpedition(readyToExtract(liberated, 'appearance'));
    expect(extracted.resources.xp).toBe(
      liberated.resources.xp + MISSIONS[0].reward.xp,
    );
  });

  it('keeps organic and digital departures terminal instead of permitting post-ending transfers', () => {
    const save = fullCampaign();
    for (const ending of ['flesh', 'exodus'] as const) {
      const ended = chooseEnding(save, ending);
      expect(beginExpedition(ended, 'port', null, 'combat')).toBe(ended);
      expect(changeBody(ended, 'mole')).toBe(ended);
      expect(buyImplant(ended, 'cortex-puppet')).toBe(ended);
      expect(upgradeFacility(ended, 'lab')).toBe(ended);
    }
  });

  it('permits physical Station Zero services and a return without free resources', () => {
    const save = hub(),
      physical = beginExpedition(save, 'station', null, 'identity');
    expect(
      upgradeFacility(physical, 'refuge').continuity.facilities.refuge,
    ).toBe(1);
    expect(finishExpedition(physical).resources).toEqual(save.resources);
  });
});

describe('somatic economy and progression', () => {
  it('owns, equips and removes implants while enforcing capacity and prices', () => {
    const save = hub();
    let next = buyImplant(save, 'cortex-puppet');
    expect(next.resources.credits).toBe(save.resources.credits - 210);
    expect(buyImplant(next, 'cortex-puppet')).toBe(next);
    expect(toggleImplant(save, 'cortex-puppet')).toBe(save);
    next = toggleImplant(next, 'cortex-puppet');
    expect(implantLoad(next)).toBe(20);
    expect(implantBonuses(next).possession).toBe(0.15);
    next = toggleImplant(next, 'cortex-puppet');
    expect(implantLoad(next)).toBe(0);
    next.continuity.ownedImplants = IMPLANTS.map((item) => item.id);
    for (const implant of IMPLANTS) next = toggleImplant(next, implant.id);
    expect(implantLoad(next)).toBeLessThanOrEqual(implantCapacity(next));
    expect(next.continuity.implants.length).toBeLessThan(IMPLANTS.length);
  });

  it('applies real facility effects, charges scaling costs and caps levels', () => {
    let save = hub();
    const initial = save.resources.salvage;
    save = upgradeFacility(save, 'morphology');
    expect(implantCapacity(save)).toBe(70);
    save = upgradeFacility(upgradeFacility(save, 'morphology'), 'morphology');
    expect(save.resources.salvage).toBe(initial - 90 - 180 - 270);
    expect(upgradeFacility(save, 'morphology')).toBe(save);
    save = upgradeFacility(
      upgradeFacility(upgradeFacility(save, 'armory'), 'drones'),
      'refuge',
    );
    expect(implantBonuses(save)).toMatchObject({
      damage: 0.05,
      neural: 10,
      health: 10,
    });
  });

  it('requires skill prerequisites and spends one shared pool with legacy talents', () => {
    const save = hub();
    save.resources.xp = 800;
    expect(buySkill(save, 'interface-3')).toBe(save);
    let next = buySkill(
      buySkill(buySkill(save, 'interface-1'), 'interface-2'),
      'interface-3',
    );
    expect(next.continuity.skills).toEqual([
      'interface-1',
      'interface-2',
      'interface-3',
    ]);
    expect(availableSkillPoints(next)).toBe(0);
    expect(buySkill(next, 'soma-1')).toBe(next);
    expect(buySkill(next, 'interface-1')).toBe(next);
    next = hub();
    next.resources.xp = 200;
    next.talents.soma = 1;
    expect(buySkill(next, 'interface-1')).toBe(next);
  });

  it('charges rent every three extracted story missions and allows partial payments', () => {
    let save = hub();
    for (const mission of MISSIONS.slice(0, 3))
      save = finishExpedition(readyToExtract(save, mission.id));
    expect(save.continuity.lease).toEqual({ debt: 100, due: 3, owned: false });
    save.resources.credits = 25;
    const paid = payLease(save);
    expect(paid.continuity.lease.debt).toBe(75);
    expect(paid.resources.credits).toBe(0);
    expect(payLease(paid)).toBe(paid);
  });

  it('applies transfer tension and memory loss, improves them with facilities, and supports rest', () => {
    const save = hub(),
      changed = changeBody(save, 'mole');
    expect(changed.continuity.somatic).toBe(20);
    expect(changed.continuity.memory).toBe(95);
    expect(changed.continuity.lease.debt).toBe(60);
    expect(changeBody(changed, 'mole')).toBe(changed);
    const rest = restContinuity(changed);
    expect(rest.resources.credits).toBe(changed.resources.credits - 35);
    expect(rest.continuity.memory).toBe(100);
    expect(rest.continuity.somatic).toBe(0);
    const lab = upgradeFacility(upgradeFacility(save, 'lab'), 'transfer');
    expect(changeBody(lab, 'mole').continuity.somatic).toBe(16);
    expect(changeBody(lab, 'mole').continuity.memory).toBe(97);
  });

  it('refuses an incompatible body instead of silently deleting purchased implants', () => {
    const save = changeBody(hub(), 'mole');
    save.continuity.ownedImplants = [
      'cortex-puppet',
      'dermal-keel',
      'offensive-vector',
      'cybermancy-tide',
    ];
    save.continuity.implants = [...save.continuity.ownedImplants];
    expect(implantLoad(save)).toBe(76);
    expect(changeBody(save, 'mistral')).toBe(save);
    expect(changeBody(save, 'sibylle').campaign.bodyId).toBe('sibylle');
  });
});

describe('continuity migration and portability', () => {
  it('normalizes malformed fields, removes unknown content and guards prerequisite injection', () => {
    const save = hub();
    const normalized = normalizeContinuity(
      {
        chapter: 999,
        cycle: Infinity,
        memory: NaN,
        somatic: -100,
        completed: { years: 'free-prisoners', nonexistent: 'yes' },
        factions: { soma: -1000 },
        skills: ['interface-3', 'unknown'],
        ownedImplants: ['unknown'],
        identity: { name: `  Rev${String.fromCharCode(1)}enant  ` },
        facilities: { lab: 999 },
        lease: { debt: -400 },
        journal: ['a'.repeat(900)],
      },
      save,
    );
    expect(normalized.chapter).toBe(0);
    expect(normalized.completed).toEqual({});
    expect(normalized.memory).toBe(100);
    expect(normalized.somatic).toBe(0);
    expect(normalized.facilities.lab).toBe(3);
    expect(normalized.factions.soma).toBe(-100);
    expect(normalized.skills).toEqual([]);
    expect(normalized.ownedImplants).toEqual([]);
    expect(normalized.identity.name).toBe('Revenant');
    expect(normalized.journal[0]).toHaveLength(800);
    expect(normalized.lease.debt).toBe(0);
  });

  it('preserves legal partial objectives and move orders but rejects premature decisions', () => {
    const save = beginExpedition(hub(), 'corniche', 'appearance', 'identity');
    const raw = structuredClone(save.continuity);
    raw.active!.objectives = [
      'appearance-witness',
      'unknown',
      'appearance-witness',
    ];
    raw.active!.choice = 'return-face';
    raw.agents.nara.order = 'move';
    const normalized = normalizeContinuity(raw, save);
    expect(normalized.active?.objectives).toEqual(['appearance-witness']);
    expect(normalized.active?.choice).toBeNull();
    expect(normalized.agents.nara.order).toBe('move');
  });

  it('round trips all six completed missions and the final choice in an exported save', () => {
    const save = chooseEnding(fullCampaign(), 'communion');
    const result = deserializeSave(serializeSave(save));
    expect(result.continuity.completed).toEqual(save.continuity.completed);
    expect(result.continuity.ending).toBe('communion');
    expect(result.continuity.agents.idris.recruited).toBe(true);
    expect(result.continuity.agents.salome.recruited).toBe(true);
  });

  it('applies every economic and recovery facility on real extraction', () => {
    const save = hub();
    for (const facility of FACILITIES)
      save.continuity.facilities[facility.id] = 1;
    save.continuity.somatic = 50;
    save.continuity.memory = 70;
    save.continuity.agents.nara.fatigue = 30;
    const done = finishExpedition(readyToExtract(save, 'appearance'));
    expect(done.resources.credits - save.resources.credits).toBe(264);
    expect(done.resources.data - save.resources.data).toBe(77);
    expect(done.resources.influence - save.resources.influence).toBe(22);
    expect(done.continuity.territories.corniche.control).toBe(28);
    expect(done.continuity.agents.nara.trust).toBe(47);
    expect(done.continuity.agents.nara.fatigue).toBe(30);
    expect(done.continuity.memory).toBe(75);
    expect(done.continuity.somatic).toBe(50);
    expect(implantBonuses(done)).toMatchObject({
      damage: 0.05,
      neural: 10,
      health: 10,
    });
    expect(implantCapacity(done)).toBe(70);
    expect(changeBody(done, 'mole').continuity.somatic).toBe(66);
    expect(changeBody(done, 'mole').continuity.memory).toBe(72);
  });

  it('round trips a live district expedition without granting unearned objectives or choices', () => {
    const save = recordObjective(
      beginExpedition(hub(), 'corniche', 'appearance', 'identity'),
      'appearance-witness',
    );
    const loaded = deserializeSave(serializeSave(save));
    expect(loaded.campaign.stage).toBe('district');
    expect(loaded.continuity.active?.district).toBe('corniche');
    expect(loaded.continuity.active?.objectives).toEqual([
      'appearance-witness',
    ]);
    expect(loaded.continuity.active?.choice).toBeNull();
    expect(finishExpedition(loaded)).toBe(loaded);
  });

  it('migrates schema-four prologue completion directly to new missions without granting a full-campaign ending', () => {
    const legacy = {
      ...hub(),
      schemaVersion: 4,
      continuity: undefined,
      ending: 'network',
    };
    legacy.campaign.stage = 'complete';
    const loaded = migrateSave(legacy);
    expect(loaded.campaign.stationReached).toBe(true);
    expect(loaded.continuity.completed).toEqual({});
    expect(loaded.continuity.ending).toBeNull();
    expect(availableMissions(loaded).map((mission) => mission.id)).toEqual([
      'appearance',
    ]);
  });

  it('never mutates its input on successful progression or purchases', () => {
    const save = hub(),
      before = structuredClone(save);
    buyImplant(save, 'cortex-puppet');
    upgradeFacility(save, 'lab');
    readyToExtract(save, 'appearance');
    expect(save).toEqual(before);
    expect(createContinuity()).not.toBe(createContinuity());
  });
});
