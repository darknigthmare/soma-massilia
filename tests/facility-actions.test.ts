import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FacilityActionsPanel } from '@/components/game/FacilityActionsPanel';
import { DISTRICTS, FACILITIES } from '@/game/campaign-data';
import { changeBody } from '@/game/campaign';
import {
  FACILITY_ACTION_IDS,
  createFacilityReadiness,
  getFacilityActions,
  performFacilityAction,
  type FacilityActionId,
  type FacilityReadinessState,
} from '@/game/facilities';
import { createNewSave } from '@/game/save';
import type { AgentId } from '@/game/continuity-types';
import type { SaveData } from '@/game/types';

type ContinuityWithReadiness = SaveData['continuity'] & {
  facilityReadiness: FacilityReadinessState;
};

function readiness(save: SaveData): FacilityReadinessState {
  return (save.continuity as ContinuityWithReadiness).facilityReadiness;
}

function preparedSave(): SaveData {
  const save = createNewSave();
  save.campaign.stage = 'station';
  save.campaign.stationReached = true;
  save.campaign.collectorDefeated = true;
  save.campaign.naraFreed = true;
  save.continuity.cycle = 7;
  save.continuity.somatic = 60;
  save.continuity.memory = 60;
  save.continuity.visited = DISTRICTS.map((district) => district.id);
  save.resources = {
    credits: 2_000,
    influence: 2_000,
    salvage: 2_000,
    data: 2_000,
    xp: 2_000,
  };
  for (const facility of FACILITIES)
    save.continuity.facilities[facility.id] = 3;
  for (const agent of ['nara', 'idris', 'salome'] as AgentId[]) {
    save.continuity.agents[agent].recruited = true;
    save.continuity.agents[agent].trust = 50;
    save.continuity.agents[agent].fatigue = 50;
  }
  save.companions.nara.recruited = true;
  save.companions.nara.trust = 50;
  save.campaign.naraTrust = 50;
  (save.continuity as ContinuityWithReadiness).facilityReadiness =
    createFacilityReadiness();
  readiness(save).evidenceProcessed = 1;
  save.continuity.evidence = ['preuve-port', 'preuve-if', 'preuve-corniche'];
  save.continuity.territories.port.unrest = 50;
  save.continuity.territories.port.control = 10;
  return save;
}

describe('declarative facility actions', () => {
  it('exposes exactly one distinct, paid, cycle-bound action for each facility', () => {
    const save = preparedSave();
    const actions = FACILITIES.flatMap((facility) =>
      getFacilityActions(save, facility.id),
    );
    expect(actions).toHaveLength(13);
    expect(new Set(actions.map((action) => action.id)).size).toBe(13);
    expect(new Set(actions.map((action) => action.facilityId))).toEqual(
      new Set(FACILITIES.map((facility) => facility.id)),
    );
    expect(actions.map((action) => action.id)).toEqual(FACILITY_ACTION_IDS);
    for (const action of actions) {
      expect(action.cooldown).toBe('cycle');
      expect(action.minLevel).toBeGreaterThan(0);
      expect(
        Object.values(action.cost).reduce(
          (total, amount) => total + (amount ?? 0),
          0,
        ),
      ).toBeGreaterThan(0);
      expect(action.available, action.id).toBe(true);
    }
  });

  it.each<{
    id: FacilityActionId;
    payload?: string;
    verify: (save: SaveData) => void;
  }>([
    {
      id: 'morphology.reconcile',
      verify: (save) => expect(save.continuity.somatic).toBe(42),
    },
    {
      id: 'lab.synthesize-stabilizer',
      verify: (save) => expect(readiness(save).stabilizers).toBe(1),
    },
    {
      id: 'armory.calibrate',
      payload: 'precision',
      verify: (save) =>
        expect(readiness(save).weaponCalibration).toBe('precision'),
    },
    {
      id: 'drones.prepare-package',
      payload: 'recovery',
      verify: (save) => expect(readiness(save).dronePackage).toBe('recovery'),
    },
    {
      id: 'transfer.assign-emergency',
      payload: 'idris',
      verify: (save) => expect(readiness(save).emergencyAgent).toBe('idris'),
    },
    {
      id: 'chapel.restore-memory',
      verify: (save) => expect(save.continuity.memory).toBe(72),
    },
    {
      id: 'bar.debrief-agent',
      payload: 'nara',
      verify: (save) => {
        expect(save.continuity.agents.nara).toMatchObject({
          fatigue: 38,
          trust: 53,
        });
        expect(save.companions.nara.trust).toBe(53);
        expect(save.campaign.naraTrust).toBe(53);
      },
    },
    {
      id: 'command.assign-lead',
      payload: 'salome',
      verify: (save) => {
        expect(save.continuity.selectedAgent).toBe('salome');
        expect(save.continuity.agents.salome.fatigue).toBe(45);
      },
    },
    {
      id: 'interrogation.process-evidence',
      verify: (save) => {
        expect(readiness(save).evidenceProcessed).toBe(2);
        expect(save.resources.influence).toBe(2_008);
      },
    },
    {
      id: 'media.broadcast',
      payload: 'port',
      verify: (save) => {
        expect(readiness(save).mediaTarget).toBe('port');
        expect(save.continuity.territories.port).toMatchObject({
          unrest: 42,
          control: 13,
        });
      },
    },
    {
      id: 'garage.prepare-insertion',
      payload: 'skiff',
      verify: (save) => expect(readiness(save).insertion).toBe('skiff'),
    },
    {
      id: 'quarters.rest-agent',
      payload: 'idris',
      verify: (save) => expect(save.continuity.agents.idris.fatigue).toBe(25),
    },
    {
      id: 'refuge.host-resident',
      verify: (save) => {
        expect(readiness(save).hostedResidents).toBe(1);
        expect(save.resources.influence).toBe(2_003);
        expect(save.continuity.factions.phocee).toBe(7);
      },
    },
  ])('$id applies its own useful effect', ({ id, payload, verify }) => {
    const result = performFacilityAction(preparedSave(), id, payload);
    verify(result);
  });

  it('is immutable and idempotent within a cycle, including resource costs and journal', () => {
    const save = preparedSave();
    const before = structuredClone(save);
    const first = performFacilityAction(save, 'armory.calibrate', 'quiet');
    expect(save).toEqual(before);
    expect(first).not.toBe(save);
    expect(first.resources.salvage).toBe(save.resources.salvage - 24);
    expect(first.resources.data).toBe(save.resources.data - 6);
    expect(readiness(first).lastUsedCycle.armory).toBe(7);
    expect(first.continuity.journal.at(-1)).toContain('Calibrer');
    const second = performFacilityAction(first, 'armory.calibrate', 'rupture');
    expect(second).toBe(first);
    expect(readiness(second).weaponCalibration).toBe('quiet');
  });

  it('makes the action available again after the campaign cycle advances', () => {
    const first = performFacilityAction(
      preparedSave(),
      'drones.prepare-package',
      'scout',
    );
    const nextCycle = structuredClone(first);
    nextCycle.continuity.cycle += 1;
    expect(getFacilityActions(nextCycle, 'drones')[0].available).toBe(true);
    const second = performFacilityAction(
      nextCycle,
      'drones.prepare-package',
      'recovery',
    );
    expect(readiness(second).dronePackage).toBe('recovery');
    expect(readiness(second).lastUsedCycle.drones).toBe(8);
  });

  it('rejects missing levels, remote use, insufficient resources and invalid payloads without mutation', () => {
    const level = preparedSave();
    level.continuity.facilities.armory = 0;
    expect(getFacilityActions(level, 'armory')[0]).toMatchObject({
      available: false,
      reason: 'Installation de niveau 1 requise.',
    });
    expect(performFacilityAction(level, 'armory.calibrate', 'quiet')).toBe(
      level,
    );

    const remote = preparedSave();
    remote.campaign.stage = 'district';
    remote.continuity.active = {
      district: 'port',
      mission: null,
      approach: 'identity',
      objectives: [],
      choice: null,
      socialResolutions: [],
    };
    expect(getFacilityActions(remote, 'lab')[0].reason).toContain(
      'Station Zéro',
    );
    expect(performFacilityAction(remote, 'lab.synthesize-stabilizer')).toBe(
      remote,
    );

    const poor = preparedSave();
    poor.resources.salvage = 0;
    expect(getFacilityActions(poor, 'garage')[0].reason).toContain(
      'Ressources manquantes',
    );
    expect(
      performFacilityAction(poor, 'garage.prepare-insertion', 'metro'),
    ).toBe(poor);

    const invalid = preparedSave();
    expect(performFacilityAction(invalid, 'armory.calibrate', 'unknown')).toBe(
      invalid,
    );
    expect(performFacilityAction(invalid, 'unknown.action')).toBe(invalid);
  });

  it('enforces consent, reconnaissance, route levels and capacity prerequisites', () => {
    const save = preparedSave();
    save.continuity.agents.idris.trust = 19;
    const transfer = getFacilityActions(save, 'transfer')[0];
    expect(
      transfer.options.find((option) => option.id === 'idris'),
    ).toMatchObject({ available: false });
    expect(
      performFacilityAction(save, 'transfer.assign-emergency', 'idris'),
    ).toBe(save);

    const unknownCity = preparedSave();
    unknownCity.continuity.visited = ['port'];
    const media = getFacilityActions(unknownCity, 'media')[0];
    expect(
      media.options.find((option) => option.id === 'port')?.available,
    ).toBe(true);
    expect(
      media.options.find((option) => option.id === 'couronne')?.available,
    ).toBe(false);

    const basicGarage = preparedSave();
    basicGarage.continuity.facilities.garage = 1;
    const routes = getFacilityActions(basicGarage, 'garage')[0].options;
    expect(routes.map(({ id, available }) => [id, available])).toEqual([
      ['metro', true],
      ['roof', false],
      ['skiff', false],
    ]);

    const fullRefuge = preparedSave();
    readiness(fullRefuge).hostedResidents = 6;
    expect(getFacilityActions(fullRefuge, 'refuge')[0].available).toBe(false);
    expect(performFacilityAction(fullRefuge, 'refuge.host-resident')).toBe(
      fullRefuge,
    );

    const noEvidence = preparedSave();
    noEvidence.continuity.evidence = [];
    readiness(noEvidence).evidenceProcessed = 0;
    expect(getFacilityActions(noEvidence, 'interrogation')[0].available).toBe(
      false,
    );
    expect(getFacilityActions(noEvidence, 'media')[0].available).toBe(false);
  });

  it('initializes readiness safely when an older normalized save has no readiness block', () => {
    const save = preparedSave();
    delete (save.continuity as Partial<ContinuityWithReadiness>)
      .facilityReadiness;
    save.continuity.evidence = [];
    const next = performFacilityAction(
      save,
      'garage.prepare-insertion',
      'skiff',
    );
    expect(readiness(next)).toMatchObject({
      insertion: 'skiff',
      stabilizers: 0,
      evidenceProcessed: 0,
      hostedResidents: 0,
    });
    expect(readiness(next).lastUsedCycle.garage).toBe(7);
  });

  it('makes a synthesized stabilizer a one-shot consumable for the next body transfer', () => {
    const save = preparedSave();
    save.bodies.mole.unlocked = true;
    save.continuity.facilities.lab = 1;
    save.continuity.facilities.transfer = 0;
    const synthesized = performFacilityAction(
      save,
      'lab.synthesize-stabilizer',
    );
    const transferred = changeBody(synthesized, 'mole');
    expect(readiness(synthesized).stabilizers).toBe(1);
    expect(readiness(transferred).stabilizers).toBe(0);
    expect(transferred.continuity.somatic).toBe(65);
    expect(transferred.continuity.memory).toBe(60);
  });

  it('uses non-coercive language for the testimony room', () => {
    const action = getFacilityActions(preparedSave(), 'interrogation')[0];
    const text =
      `${action.label} ${action.description} ${action.result}`.toLowerCase();
    expect(text).toContain('témoignage volontaire');
    expect(text).toContain('sans coercition');
    expect(text).not.toContain('torture');
  });

  it('renders action-specific accessible names and descriptions', () => {
    const save = preparedSave();
    const action = getFacilityActions(save, 'garage')[0];
    const html = renderToStaticMarkup(
      createElement(FacilityActionsPanel, {
        save,
        facilityId: 'garage',
        onChange: () => undefined,
      }),
    );
    expect(html).toContain('aria-labelledby');
    expect(html).toContain('aria-describedby');
    expect(html).toContain(`aria-label="Confirmer ${action.label} ·`);
    expect(html).toContain(`pour ${action.label}`);
  });

  it.each(FACILITIES.map((facility) => facility.id))(
    '%s never spends resources twice in the same cycle',
    (facilityId) => {
      const action = getFacilityActions(preparedSave(), facilityId)[0];
      const payload = action.options.find((option) => option.available)?.id;
      const first = performFacilityAction(preparedSave(), action.id, payload);
      const resources = { ...first.resources };
      const second = performFacilityAction(first, action.id, payload);
      expect(second).toBe(first);
      expect(second.resources).toEqual(resources);
    },
  );
});
