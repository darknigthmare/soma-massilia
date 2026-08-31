import { describe, expect, it } from 'vitest';
import {
  captureHackNode,
  canOccupy,
  createHackState,
  findPath,
  suggestHackStep,
} from '@/game/engine';
import { createNewSave, deserializeSave, serializeSave } from '@/game/save';
import {
  advanceCampaign,
  abortSortie,
  beginCampaign,
  launchOperation,
  learnTalent,
  recordEncounter,
  resolveSyndicateOperation,
  upgradeStation,
} from '@/game/progression';
import {
  createEncounter,
  createRetryEncounter,
  EMPTY_INPUT,
  interact,
  missionWorld,
  possessDrone,
  pulse,
  shoot,
  stepEncounter,
  switchWeapon,
} from '@/game/simulation';
import { keyboardInput, gamepadInput } from '@/game/input';
import { createWorld } from '@/game/world';
import type { CampaignStage, OperationId, SaveData } from '@/game/types';

function campaign(stage: CampaignStage = 'docks'): SaveData {
  const save = beginCampaign(createNewSave(), 'mistral', 'combat');
  save.campaign.stage = stage;
  save.weapons.smg.unlocked = save.weapons.rifle.unlocked = true;
  return save;
}

describe('level reachability', () => {
  for (const stage of [
    'docks',
    'revocation',
    'nara',
    'collector',
    'operation',
  ] as const) {
    for (const route of ['combat', 'identity', 'sabotage'] as const) {
      it(
        stage +
          ' / ' +
          route +
          ': every actor and objective is reachable on open floor',
        () => {
          const world = createWorld(stage, route, 3, 'velours');
          expect(canOccupy(world.map, world.start.x, world.start.y)).toBe(true);
          for (const e of world.entities) {
            expect(canOccupy(world.map, e.x, e.y, 0.18), e.id).toBe(true);
            const sameCell =
              Math.floor(e.x) === Math.floor(world.start.x) &&
              Math.floor(e.y) === Math.floor(world.start.y);
            expect(
              sameCell ||
                findPath(world.map, world.start.x, world.start.y, e.x, e.y)
                  .length > 0,
              e.id,
            ).toBe(true);
          }
        },
      );
    }
  }
  it.each<OperationId>(['velours', 'mistral', 'phocee'])(
    'operation %s has reachable archive and extraction',
    (operation) => {
      const world = createWorld('operation', 'combat', 3, operation);
      for (const e of world.entities.filter((e) => e.kind === 'terminal'))
        expect(
          findPath(world.map, world.start.x, world.start.y, e.x, e.y).length,
        ).toBeGreaterThan(0);
    },
  );
});

describe('runtime invariants', () => {
  it('Nara resumes covering when her anchor sabotage order has no remaining target', () => {
    const save = campaign(),
      world = missionWorld(save),
      state = createEncounter(save);
    save.companions.nara = { recruited: true, trust: 30, order: 'interact' };
    const guard = state.entities.find((e) => e.kind === 'guard')!;
    Object.assign(guard, { x: 3.5, y: 14.5, hostile: true });
    state.player.x = 4.5;
    state.player.y = 14.5;
    state.entities = [
      guard,
      {
        ...guard,
        id: 'nara',
        kind: 'nara',
        x: 2.5,
        hostile: false,
        attackLeft: 0,
      },
    ];
    const before = guard.health;
    stepEncounter(state, world, save, EMPTY_INPUT, 0.05, 'chair');
    expect(guard.health).toBeLessThan(before);
  });
  it('preserves magazine and reserve after switching away and back', () => {
    const save = campaign(),
      world = missionWorld(save),
      state = createEncounter(save);
    shoot(state, world, save);
    switchWeapon(state, 'smg', save);
    switchWeapon(state, 'pistol', save);
    expect(state.player.weapon.ammo).toBe(11);
    expect(state.player.weapon.reserve).toBe(72);
    expect(state.player.weapon.cooldownLeft).toBeGreaterThan(0);
  });
  it('pauses absolutely everything, including a revocation deadline and firing', () => {
    const save = campaign('revocation'),
      world = missionWorld(save),
      state = createEncounter(save);
    const before = structuredClone(state);
    for (let i = 0; i < 300; i++)
      stepEncounter(
        state,
        world,
        save,
        { ...EMPTY_INPUT, fire: true, forward: 1 },
        0.05,
        'chair',
        true,
      );
    expect(state).toEqual(before);
  });
  it('does not allow interaction through a wall', () => {
    const save = campaign(),
      state = createEncounter(save),
      world = missionWorld(save);
    world.map = ['11111', '10101', '10101', '11111'].map((row) =>
      Array.from(row).map(Number),
    );
    state.player.x = 1.7;
    state.player.y = 1.5;
    state.player.angle = 0;
    state.entities = [
      {
        id: 'wall-terminal',
        kind: 'terminal',
        x: 3.1,
        y: 1.5,
        angle: 0,
        alive: true,
        health: 1,
        maxHealth: 1,
        armor: 0,
        label: '',
        interactable: true,
      },
    ];
    expect(interact(state, world)).toEqual([]);
  });
  it('recovers from a cybermancy stun after the defined duration', () => {
    const save = campaign(),
      world = missionWorld(save),
      state = createEncounter(save);
    const guard = state.entities.find((e) => e.kind === 'heavy')!;
    state.player.x = guard.x - 0.7;
    state.player.y = guard.y;
    pulse(state, world, save);
    expect(guard.stunLeft).toBe(1.2);
    for (let i = 0; i < 40; i++)
      stepEncounter(state, world, save, EMPTY_INPUT, 0.05, 'chair');
    expect(guard.stunLeft).toBe(0);
    expect(guard.state).not.toBe('disabled');
  });
  it('slows attack cooldown and revocation clock with the same Cortex time', () => {
    const save = campaign('revocation'),
      world = missionWorld(save),
      state = createEncounter(save);
    const before = state.revocationLeft;
    for (let i = 0; i < 20; i++)
      stepEncounter(state, world, save, EMPTY_INPUT, 0.05, 'cortex');
    expect(before - state.revocationLeft).toBeCloseTo(0.32, 4);
  });
  it('requires neural charge and range for drone possession, leaving the body in place', () => {
    const save = campaign(),
      world = missionWorld(save),
      state = createEncounter(save);
    const drone = state.entities.find((e) => e.kind === 'drone')!;
    state.player.x = drone.x - 1;
    state.player.y = drone.y;
    state.player.neural = 0;
    expect(possessDrone(state, world, drone.id, save)).toBe(false);
    state.player.neural = 100;
    expect(possessDrone(state, world, drone.id, save)).toBe(true);
    const before = { x: state.player.x, y: state.player.y };
    stepEncounter(
      state,
      world,
      save,
      { ...EMPTY_INPUT, forward: 1 },
      0.05,
      'spectre',
    );
    expect({ x: state.player.x, y: state.player.y }).toEqual(before);
    expect(state.player.neural).toBeLessThan(68);
  });
  it('prevents damage through walls even when an enemy remembers the player', () => {
    const save = campaign(),
      world = missionWorld(save),
      state = createEncounter(save);
    world.map = ['11111', '10101', '10101', '11111'].map((row) =>
      Array.from(row).map(Number),
    );
    state.player.x = 1.5;
    state.player.y = 1.5;
    const guard = state.entities.find((e) => e.kind === 'guard')!;
    Object.assign(guard, {
      x: 3.5,
      y: 1.5,
      hostile: true,
      awareness: 1,
      memory: 6,
      state: 'combat',
      attackLeft: 0,
    });
    state.entities = [guard];
    for (let i = 0; i < 80; i++)
      stepEncounter(state, world, save, EMPTY_INPUT, 0.05, 'chair');
    expect(state.player.health).toBe(state.player.maxHealth);
  });
});

describe('hacking executable solutions', () => {
  it('finishes 250 seeded grids within the trace budget using actual game actions', () => {
    for (let seed = 0; seed < 250; seed++) {
      let state = createHackState(seed);
      for (const id of [1, 2, 3, 4, 9, 14, 19, 24])
        state = captureHackNode(state, id);
      expect(state.completed, String(seed)).toBe(true);
      expect(state.failed).toBe(false);
    }
  });
  it('the assistant can actually finish seeded puzzles', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let state = createHackState(seed);
      for (let i = 0; i < 60 && !state.completed; i++) {
        const step = suggestHackStep(state);
        expect(step, String(seed)).not.toBeNull();
        state = captureHackNode(state, step!.nodeId, step!.program);
      }
      expect(state.completed, String(seed)).toBe(true);
    }
  });
  it('hitting ice at trace 90 fails immediately, and captured nodes remain traversable', () => {
    let state = createHackState(42);
    state.nodes[1].ice = true;
    state.trace = 90;
    expect(captureHackNode(state, 1).failed).toBe(true);
    state = createHackState(42);
    state = captureHackNode(state, 1);
    state = captureHackNode(state, 0);
    expect(state.current).toBe(0);
    expect(state.trace).toBe(9);
  });
});

describe('saves and progression integrity', () => {
  it('persists a death explicitly so reload offers reincarnation instead of a frozen body', () => {
    let save = campaign('collector');
    const state = createEncounter(save);
    state.player.health = 0;
    save = recordEncounter(save, state);
    expect(deserializeSave(serializeSave(save)).encounter?.player.health).toBe(
      0,
    );
  });
  it('retry preserves exact out-of-order anchor cuts, with fresh health and counters', () => {
    let save = campaign('collector');
    const state = createEncounter(save);
    state.entities.find((e) => e.id === 'anchor-0')!.alive = false;
    state.player.health = 0;
    state.shots = 20;
    save = advanceCampaign(recordEncounter(save, state), 'anchor-destroyed');
    const retry = createRetryEncounter(save);
    expect(retry.player.health).toBe(retry.player.maxHealth);
    expect(retry.shots).toBe(0);
    expect(
      retry.entities
        .filter((e) => e.kind === 'anchor' && e.alive)
        .map((e) => e.id),
    ).toEqual(['anchor-1', 'anchor-2']);
  });
  it('round-trips exact location, ammo and arbitrary cut anchor IDs', () => {
    let save = campaign('collector');
    const state = createEncounter(save);
    state.player.x = 3.5;
    state.player.y = 13.5;
    state.inventory.pistol.ammo = 4;
    state.entities.find((e) => e.id === 'anchor-2')!.alive = false;
    save = recordEncounter(save, state);
    save = advanceCampaign(save, 'anchor-destroyed');
    const loaded = deserializeSave(serializeSave(save));
    expect(loaded.encounter?.player.x).toBe(3.5);
    expect(loaded.encounter?.player.weapon.ammo).toBe(4);
    expect(
      loaded.encounter?.entities.find((e) => e.id === 'anchor-2')?.alive,
    ).toBe(false);
    expect(
      loaded.encounter?.entities.find((e) => e.id === 'anchor-1')?.alive,
    ).toBe(true);
  });
  it('clamps settings and rejects foreign/future files without replacing progress', () => {
    const save = createNewSave();
    const loaded = deserializeSave(
      JSON.stringify({
        ...save,
        settings: { sensitivity: 999, masterVolume: 'loud', hackAssist: 'yes' },
      }),
    );
    expect(loaded.settings.sensitivity).toBe(1);
    expect(loaded.settings.masterVolume).toBe(0.75);
    expect(loaded.settings.hackAssist).toBe(false);
    expect(() => deserializeSave('{"hello":"world"}')).toThrow(/campagne/);
    expect(() =>
      deserializeSave(JSON.stringify({ ...save, schemaVersion: 999 })),
    ).toThrow(/récente/);
  });
  it('does not count the same checkpoint twice', () => {
    let save = campaign();
    const state = createEncounter(save);
    state.kills = 2;
    state.shots = 8;
    state.hits = 5;
    state.elapsed = 20;
    save = recordEncounter(recordEncounter(save, state), state);
    expect(save.statistics.kills).toBe(2);
    expect(save.playtimeSeconds).toBe(20);
  });
  it('makes all six facilities effective or progression-gating and rejects overspending', () => {
    let save = campaign('station');
    save.campaign.stationReached = true;
    save.resources.salvage = 10000;
    save.resources.xp = 400;
    save = upgradeStation(save, 'clinic');
    save = upgradeStation(save, 'arsenal');
    save = learnTalent(save, 'soma');
    const state = createEncounter(save);
    expect(state.player.maxHealth).toBe(115);
    expect(state.inventory.pistol.reserve).toBe(86);
    const before = save.station.clinic;
    save = upgradeStation(save, 'clinic');
    expect(save.station.clinic).toBe(before); // core cap
    save.resources.salvage = 0;
    expect(upgradeStation(save, 'core')).toBe(save);
  });
  it('pays a Syndicate operation only after retrieval and only once', () => {
    let save = campaign('station');
    save.campaign.stationReached = true;
    save = launchOperation(save, 'velours');
    expect(resolveSyndicateOperation(save, 'velours')).toBe(save);
    const state = structuredClone(save.encounter!);
    state.entities.find((e) => e.id === 'mission-data')!.alive = false;
    save = recordEncounter(save, state);
    save = resolveSyndicateOperation(save, 'velours');
    expect(save.campaign.stage).toBe('station');
    expect(save.operations.velours).toBe(1);
    expect(save.resources.salvage).toBe(200);
    expect(resolveSyndicateOperation(save, 'velours')).toBe(save);
  });
  it('spends operation preparations on launch and cannot reuse them after abandonment', () => {
    let save = campaign('station');
    save.campaign.stationReached = true;
    save.continuity.agents.nara.recruited = true;
    Object.assign(save.continuity.facilityReadiness, {
      weaponCalibration: 'precision',
      dronePackage: 'recovery',
      emergencyAgent: 'nara',
      insertion: 'skiff',
    });
    save = launchOperation(save, 'mistral');
    expect(save.encounter).toMatchObject({
      weaponCalibration: 'precision',
      dronePackage: 'recovery',
      emergencyAgent: 'nara',
    });
    expect(save.continuity.facilityReadiness).toMatchObject({
      weaponCalibration: 'none',
      dronePackage: 'none',
      emergencyAgent: null,
      insertion: 'metro',
    });
    save = abortSortie(save);
    expect(save.campaign).toMatchObject({
      stage: 'station',
      checkpoint: 'operation-abandonnee',
    });
    expect(save.activeOperation).toBeNull();
    expect(save.encounter).toBeNull();
    save = launchOperation(save, 'mistral');
    expect(save.encounter).toMatchObject({
      weaponCalibration: 'none',
      dronePackage: 'none',
      emergencyAgent: null,
    });
  });
});

describe('input contracts', () => {
  it('does not apply both physical and logical keys in AZERTY mode', () => {
    const input = keyboardInput(new Set(['KeyW', 'z']), 'zqsd');
    expect(input.forward).toBe(1);
    expect(input.strafe).toBe(0);
    expect(keyboardInput(new Set(['KeyA', 'q']), 'zqsd').strafe).toBe(-1);
  });
  it('ignores stick drift and maps a standard controller', () => {
    expect(gamepadInput([0.1, -0.05, 0.15], []).forward).toBe(0);
    const buttons = Array.from({ length: 12 }, (_, i) => ({
      pressed: i === 7,
    }));
    expect(gamepadInput([1, -1, 0], buttons)).toMatchObject({
      forward: 1,
      strafe: 1,
      fire: true,
    });
  });
});
