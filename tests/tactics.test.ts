import { describe, expect, it } from 'vitest';
import { beginCampaign } from '@/game/progression';
import { createNewSave } from '@/game/save';
import {
  clearTacticalQueue,
  createEncounter,
  EMPTY_INPUT,
  MAX_TACTICAL_QUEUE,
  queueTacticalCommand,
  reloadWeapon,
  shoot,
  stepEncounter,
} from '@/game/simulation';
import type { AgentId } from '@/game/continuity-types';
import type { EngagementPolicy, WorldEntity } from '@/game/types';
import type { WorldDefinition } from '@/game/world';

const actor = (
  id: string,
  kind: WorldEntity['kind'],
  x: number,
  y: number,
): WorldEntity => ({
  id,
  kind,
  x,
  y,
  angle: 0,
  health: 100,
  maxHealth: 100,
  armor: 0,
  alive: true,
  label: id,
  attackLeft: 0,
  supportLeft: 100,
  state: 'patrol',
  hostile: false,
  awareness: 0,
  memory: 0,
  actionState: 'idle',
  actionLeft: 0,
  motionPhase: 0,
});

function scenario() {
  const save = beginCampaign(createNewSave(), 'mistral', 'combat');
  const world: WorldDefinition = {
    map: Array.from({ length: 12 }, (_, y) =>
      Array.from({ length: 12 }, (_, x) =>
        x === 0 || y === 0 || x === 11 || y === 11 ? 1 : 0,
      ),
    ),
    start: { x: 3.5, y: 3.5, angle: 0 },
    entities: [],
    atmosphere: 'docks',
    objective: 'test tactique',
  };
  const state = createEncounter(save);
  Object.assign(state.player, world.start);
  state.entities = [];
  state.tacticalQueues = { nara: [], idris: [], salome: [] };
  state.tacticalSequence = 0;
  return { save, state, world };
}

function recruit(
  data: ReturnType<typeof scenario>,
  id: AgentId,
  x = 4.5,
  y = 3.5,
  policy: EngagementPolicy = 'weapons-free',
) {
  data.save.continuity.agents[id].recruited = true;
  data.save.continuity.agents[id].trust = 30;
  data.save.continuity.agents[id].fatigue = 0;
  data.save.continuity.agents[id].order = 'follow';
  data.save.continuity.agents[id].engagementPolicy = policy;
  const entity = {
    ...actor('agent.' + id, 'nara', x, y),
    agentId: id,
    allied: true,
  };
  data.state.entities.push(entity);
  return entity;
}

function hostile(
  data: ReturnType<typeof scenario>,
  id = 'hostile',
  x = 5.5,
  y = 3.5,
  health = 100,
) {
  const entity = {
    ...actor(id, 'guard', x, y),
    health,
    maxHealth: health,
    hostile: true,
    state: 'combat' as const,
    awareness: 1,
    memory: 6,
    attackLeft: 100,
    captureState: 'active' as const,
  };
  data.state.entities.push(entity);
  return entity;
}

describe('facility encounter preparations', () => {
  it('copies readiness and deploys one allied scout without taking the camera', () => {
    const save = beginCampaign(createNewSave(), 'mistral', 'combat');
    save.continuity.facilityReadiness.weaponCalibration = 'precision';
    save.continuity.facilityReadiness.dronePackage = 'scout';
    const state = createEncounter(save);
    const scouts = state.entities.filter(
      (entity) => entity.id === 'facility.scout-drone',
    );
    expect(state.weaponCalibration).toBe('precision');
    expect(state.dronePackage).toBe('scout');
    expect(scouts).toHaveLength(1);
    expect(scouts[0]).toMatchObject({
      kind: 'drone',
      allied: true,
      hostile: false,
      alive: true,
    });
    expect(scouts[0].interactable).not.toBe(true);
    expect(state.droneId).toBeNull();
    expect(save.continuity.facilityReadiness.dronePackage).toBe('scout');

    save.campaign.stage = 'station';
    expect(
      createEncounter(save).entities.some(
        (entity) => entity.id === 'facility.scout-drone',
      ),
    ).toBe(false);
    save.campaign.stage = 'district';
    save.campaign.stationReached = true;
    save.continuity.active = {
      district: 'velours',
      mission: 'velvet',
      approach: 'identity',
      objectives: [],
      choice: null,
      socialResolutions: [],
    };
    expect(
      createEncounter(save).entities.some(
        (entity) => entity.id === 'facility.scout-drone',
      ),
    ).toBe(false);
  });

  it('makes precision recoil and aim tolerance deterministic', () => {
    const baseline = scenario();
    const precision = scenario();
    baseline.save.settings.aimAssist = false;
    precision.save.settings.aimAssist = false;
    baseline.state.weaponCalibration = 'none';
    precision.state.weaponCalibration = 'precision';
    const targetY = 3.5 + Math.tan(0.103) * 2;
    hostile(baseline, 'baseline-angle', 5.5, targetY, 200);
    const precisionTarget = hostile(
      precision,
      'precision-angle',
      5.5,
      targetY,
      200,
    );
    shoot(baseline.state, baseline.world, baseline.save);
    shoot(precision.state, precision.world, precision.save);
    expect(baseline.state.hits).toBe(0);
    expect(precision.state.hits).toBe(1);
    expect(precisionTarget.health).toBeLessThan(200);
    expect(precision.state.player.recoil).toBeLessThan(
      baseline.state.player.recoil,
    );
  });

  it('makes rupture pierce more armor and quiet lower weapon noise', () => {
    const baseline = scenario();
    const rupture = scenario();
    const quiet = scenario();
    baseline.state.weaponCalibration = 'none';
    rupture.state.weaponCalibration = 'rupture';
    quiet.state.weaponCalibration = 'quiet';
    const baselineTarget = hostile(baseline, 'baseline-armor', 5.5, 3.5, 500);
    const ruptureTarget = hostile(rupture, 'rupture-armor', 5.5, 3.5, 500);
    baselineTarget.armor = ruptureTarget.armor = 100;
    shoot(baseline.state, baseline.world, baseline.save);
    shoot(rupture.state, rupture.world, rupture.save);
    shoot(quiet.state, quiet.world, quiet.save);
    expect(ruptureTarget.health).toBeLessThan(baselineTarget.health);
    expect(quiet.state.noise).toBeLessThan(baseline.state.noise);
  });
});

describe('Cortex command queues', () => {
  it('caps each independent queue at three deterministic commands', () => {
    const data = scenario();
    recruit(data, 'nara');
    for (let index = 0; index < MAX_TACTICAL_QUEUE; index++)
      expect(
        queueTacticalCommand(
          data.state,
          data.save,
          'nara',
          'cover',
          data.world,
        ),
      ).toBe(true);
    expect(
      queueTacticalCommand(data.state, data.save, 'nara', 'hold', data.world),
    ).toBe(false);
    expect(data.state.tacticalQueues?.nara.map((item) => item.id)).toEqual([
      0, 1, 2,
    ]);
    clearTacticalQueue(data.state, 'nara');
    expect(data.state.tacticalQueues?.nara).toEqual([]);
  });

  it('executes move then cover in order and keeps the posture', () => {
    const data = scenario();
    const nara = recruit(data, 'nara');
    expect(
      queueTacticalCommand(data.state, data.save, 'nara', 'move', data.world, {
        x: 7.5,
        y: 3.5,
      }),
    ).toBe(true);
    expect(
      queueTacticalCommand(data.state, data.save, 'nara', 'cover', data.world),
    ).toBe(true);
    for (
      let index = 0;
      index < 120 && data.state.tacticalQueues!.nara.length;
      index++
    )
      stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        0.05,
        'chair',
      );
    expect(data.state.tacticalQueues?.nara).toEqual([]);
    expect(Math.abs(nara.x - 7.5)).toBeLessThanOrEqual(0.3);
    expect(nara.tacticalOrder).toBe('cover');
  });

  it('reaches the insertion point then holds after retreat', () => {
    const data = scenario();
    const idris = recruit(data, 'idris', 8.5, 8.5);
    expect(
      queueTacticalCommand(
        data.state,
        data.save,
        'idris',
        'retreat',
        data.world,
      ),
    ).toBe(true);
    for (
      let index = 0;
      index < 180 && data.state.tacticalQueues!.idris.length;
      index++
    )
      stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        0.05,
        'chair',
      );
    expect(data.state.tacticalQueues?.idris).toEqual([]);
    expect(Math.hypot(idris.x - 3.5, idris.y - 3.5)).toBeLessThan(0.4);
    expect(idris.tacticalOrder).toBe('hold');
  });

  it('fires a synchronized volley on one simulation tick', () => {
    const data = scenario();
    const nara = recruit(data, 'nara', 4.5, 3.5);
    const idris = recruit(data, 'idris', 4.5, 4.5);
    const target = hostile(data, 'sync-target', 6.5, 3.5, 500);
    for (const id of ['nara', 'idris'] as AgentId[])
      expect(
        queueTacticalCommand(data.state, data.save, id, 'sync', data.world, {
          targetId: target.id,
        }),
      ).toBe(true);
    const events = stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'cortex',
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'combat',
        name: 'sync',
        targetId: target.id,
      }),
    );
    expect(target.health).toBeLessThan(500);
    expect(nara.actionState).toBe('attack');
    expect(idris.actionState).toBe('attack');
    expect(data.state.tacticalQueues?.nara).toEqual([]);
    expect(data.state.tacticalQueues?.idris).toEqual([]);
  });

  it('expires a blocked synchronized group on tactical rather than wall time', () => {
    const data = scenario();
    recruit(data, 'nara', 4.5, 3.5, 'weapons-free');
    recruit(data, 'salome', 4.5, 4.5, 'hold-fire');
    const target: WorldEntity = hostile(data, 'blocked-sync', 6.5, 3.5, 500);
    // Keep this target valid for Cortex without letting autonomous fire obscure
    // the exact tick on which the blocked synchronized group is cancelled.
    target.hostile = false;
    target.state = 'patrol';
    target.memory = 0;
    for (const id of ['nara', 'salome'] as AgentId[])
      expect(
        queueTacticalCommand(data.state, data.save, id, 'sync', data.world, {
          targetId: target.id,
        }),
      ).toBe(true);

    const events = [] as ReturnType<typeof stepEncounter>;
    for (let index = 0; index < 100; index++)
      events.push(
        ...stepEncounter(
          data.state,
          data.world,
          data.save,
          EMPTY_INPUT,
          0.05,
          'cortex',
        ),
      );

    // Five wall-clock seconds represent only 1.6 tactical seconds in Cortex.
    expect(data.state.tacticalQueues?.nara).toHaveLength(1);
    expect(data.state.tacticalQueues?.salome).toHaveLength(1);
    expect(data.state.notice).not.toMatch(/tir synchronisé annulé/i);

    for (
      let index = 100;
      index < 400 &&
      (data.state.tacticalQueues!.nara.length > 0 ||
        data.state.tacticalQueues!.salome.length > 0);
      index++
    )
      events.push(
        ...stepEncounter(
          data.state,
          data.world,
          data.save,
          EMPTY_INPUT,
          0.05,
          'cortex',
        ),
      );

    expect(data.state.tacticalQueues?.nara).toEqual([]);
    expect(data.state.tacticalQueues?.salome).toEqual([]);
    expect(target.health).toBe(500);
    expect(events).not.toContainEqual(
      expect.objectContaining({ type: 'combat', name: 'sync' }),
    );
    expect(data.state.notice).toMatch(/tir synchronisé annulé/i);
  });
});

describe('rules of engagement and capture', () => {
  it('emits one typed reload sound only when a reload actually starts', () => {
    const data = scenario();
    data.state.player.weapon.ammo = 1;
    expect(reloadWeapon(data.state)).toEqual([
      {
        type: 'sound',
        name: 'reload',
        weapon: data.state.player.weapon.id,
      },
    ]);
    expect(reloadWeapon(data.state)).toEqual([]);
  });

  it('enforces hold-fire and return-fire before weapons-free', () => {
    const data = scenario();
    const nara = recruit(data, 'nara', 4.5, 3.5, 'hold-fire');
    const target: WorldEntity = hostile(data);
    stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(target.health).toBe(100);

    data.save.continuity.agents.nara.engagementPolicy = 'return-fire';
    target.state = 'patrol';
    target.memory = 0;
    nara.attackLeft = 0;
    stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(target.health).toBe(100);

    data.save.continuity.agents.nara.engagementPolicy = 'weapons-free';
    nara.attackLeft = 0;
    stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(target.health).toBeLessThan(100);
  });

  it('turns every lethal agent hit into incapacitation under non-lethal policy', () => {
    const data = scenario();
    recruit(data, 'nara', 4.5, 3.5, 'non-lethal');
    const target = hostile(data, 'non-lethal-target', 5.5, 3.5, 5);
    const events = stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(target.alive).toBe(true);
    expect(target.health).toBe(1);
    expect(target.captureState).toBe('incapacitated');
    expect(target.actionState).toBe('incapacitated');
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'combat',
        name: 'incapacitated',
        targetId: target.id,
        nonLethal: true,
      }),
    );
  });

  it('incapacitates a boss non-lethally without making it capturable', () => {
    const data = scenario();
    recruit(data, 'nara', 4.5, 3.5, 'non-lethal');
    const boss = hostile(data, 'non-lethal-boss', 5.5, 3.5, 5);
    boss.kind = 'boss';
    const events = stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );

    expect(boss).toMatchObject({
      alive: true,
      health: 1,
      captureState: 'incapacitated',
      actionState: 'incapacitated',
      state: 'disabled',
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'combat',
        name: 'incapacitated',
        targetId: boss.id,
        nonLethal: true,
      }),
    );
    expect(events).not.toContainEqual(
      expect.objectContaining({ name: 'defeated', targetId: boss.id }),
    );
    expect(
      queueTacticalCommand(
        data.state,
        data.save,
        'nara',
        'capture',
        data.world,
        { targetId: boss.id },
      ),
    ).toBe(false);
  });

  it('captures through active, incapacitated and restrained states', () => {
    const data = scenario();
    recruit(data, 'nara', 4.5, 3.5);
    const target = hostile(data, 'capture-target', 5.1, 3.5);
    expect(
      queueTacticalCommand(
        data.state,
        data.save,
        'nara',
        'capture',
        data.world,
        { targetId: target.id },
      ),
    ).toBe(true);
    const first = stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'cortex',
    );
    expect(target.captureState).toBe('incapacitated');
    expect(first).toContainEqual(
      expect.objectContaining({ name: 'incapacitated' }),
    );
    const second = stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'cortex',
    );
    expect(target.captureState).toBe('restrained');
    expect(target.capturedBy).toBe('nara');
    expect(data.state.tacticalQueues?.nara).toEqual([]);
    expect(second).toContainEqual(
      expect.objectContaining({ name: 'restrained' }),
    );
  });

  it('refuses bosses, civilians and allied actors as capture targets', () => {
    const data = scenario();
    recruit(data, 'nara');
    const boss = hostile(data, 'boss', 5.5, 3.5);
    boss.kind = 'boss';
    const civilian = actor('civilian', 'nara', 5.5, 4.5);
    const ally = {
      ...actor('allied-guard', 'guard', 5.5, 5.5),
      allied: true,
    };
    data.state.entities.push(civilian, ally);
    for (const target of [boss, civilian, ally])
      expect(
        queueTacticalCommand(
          data.state,
          data.save,
          'nara',
          'capture',
          data.world,
          { targetId: target.id },
        ),
      ).toBe(false);
  });
});
