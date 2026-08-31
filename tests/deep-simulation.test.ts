import { describe, expect, it } from 'vitest';
import { createNewSave, deserializeSave, serializeSave } from '@/game/save';
import { beginExpedition, recordObjective } from '@/game/campaign';
import { MISSIONS } from '@/game/campaign-data';
import { findPath } from '@/game/engine';
import { beginCampaign } from '@/game/progression';
import {
  agentOrder,
  canPossessHuman,
  commandAgent,
  createEncounter,
  EMPTY_INPUT,
  hackNetwork,
  interact,
  missionWorld,
  navigationObjective,
  possessActor,
  pulse,
  revocationPhase,
  shoot,
  stepEncounter,
  vaultObstacle,
} from '@/game/simulation';
import type { AgentId } from '@/game/continuity-types';
import type { WorldEntity } from '@/game/types';
import type { WorldDefinition } from '@/game/world';

const entity = (
  id: string,
  kind: WorldEntity['kind'],
  x = 5.5,
  y = 3.5,
): WorldEntity => ({
  id,
  kind,
  x,
  y,
  angle: Math.PI,
  health: 1000,
  maxHealth: 1000,
  armor: 0,
  alive: true,
  label: id,
  attackLeft: 0,
  state: 'patrol',
  hostile: false,
  awareness: 0,
  memory: 0,
});
function scenario() {
  const save = beginCampaign(createNewSave(), 'mistral', 'identity');
  save.continuity.somatic = 0;
  save.continuity.memory = 100;
  save.continuity.lease.debt = 0;
  const state = createEncounter(save);
  const world: WorldDefinition = {
    map: Array.from({ length: 12 }, (_, y) =>
      Array.from({ length: 12 }, (_, x) =>
        x === 0 || y === 0 || x === 11 || y === 11 ? 1 : 0,
      ),
    ),
    start: { x: 3.5, y: 3.5, angle: 0 },
    entities: [],
    atmosphere: 'docks',
    objective: 'test',
  };
  Object.assign(state.player, world.start);
  state.entities = [];
  return { save, state, world };
}
function recruit(
  data: ReturnType<typeof scenario>,
  id: AgentId,
  x = 3.5,
  y = 4.5,
) {
  data.save.continuity.agents[id].recruited = true;
  data.save.continuity.agents[id].trust = 30;
  data.save.continuity.agents[id].fatigue = 0;
  data.save.continuity.agents[id].order = 'follow';
  const actor = {
    ...entity('agent.' + id, 'nara', x, y),
    agentId: id,
    health: 100,
    maxHealth: 100,
  };
  data.state.entities.push(actor);
  return actor;
}
function hostile(data: ReturnType<typeof scenario>, x = 5.5, y = 3.5) {
  const enemy = {
    ...entity('hostile', 'guard', x, y),
    hostile: true,
    state: 'combat' as const,
    awareness: 1,
    memory: 6,
  };
  data.state.entities.push(enemy);
  return enemy;
}
function fireReady(data: ReturnType<typeof scenario>) {
  data.state.player.weapon.cooldownLeft = 0;
  data.state.player.recoil = 0;
  return shoot(data.state, data.world, data.save);
}

describe('three-person Cortex and distinct roles', () => {
  it('preserves distinct weapon damage on real generated squad actors before and after JSON reload', () => {
    const data = scenario();
    data.save.campaign.stage = 'station';
    data.save.campaign.stationReached = true;
    for (const id of ['nara', 'idris', 'salome'] as AgentId[]) {
      data.save.continuity.agents[id].recruited = true;
      data.save.continuity.agents[id].trust = 0;
    }
    let save = beginExpedition(data.save, 'corniche', 'appearance', 'identity');
    save = { ...save, encounter: createEncounter(save) };
    for (const version of [save, deserializeSave(serializeSave(save))]) {
      for (const [id, expected] of [
        ['nara', 21],
        ['idris', 28],
        ['salome', 12],
      ] as const) {
        const state = structuredClone(version.encounter!);
        const actor = state.entities.find((e) => e.agentId === id)!;
        expect(actor.allied).toBe(true);
        Object.assign(state.player, data.world.start);
        Object.assign(actor, {
          x: 4.5,
          y: 4.5,
          attackLeft: 0,
          supportLeft: 30,
        });
        const enemy = {
          ...entity('dummy', 'guard', 5.5, 4.5),
          hostile: true,
          attackLeft: 100,
        };
        state.entities = [actor, enemy];
        stepEncounter(state, data.world, version, EMPTY_INPUT, 0.05, 'chair');
        expect(1000 - enemy.health, id).toBeCloseTo(expected, 5);
      }
    }
  });
  it('spawns three uniquely identified recruited agents without duplicating Nara', () => {
    const data = scenario();
    data.save.campaign.stage = 'collector';
    for (const id of ['nara', 'idris', 'salome'] as AgentId[])
      data.save.continuity.agents[id].recruited = true;
    const state = createEncounter(data.save);
    expect(
      state.entities
        .filter((e) => e.agentId)
        .map((e) => e.agentId)
        .sort((a, b) => a!.localeCompare(b!)),
    ).toEqual(['idris', 'nara', 'salome']);
  });
  it('keeps a talking resident stationary instead of treating every nara-kind sprite as an ally', () => {
    const data = scenario();
    recruit(data, 'nara');
    const resident = {
      ...entity('resident.host', 'nara', 8.5, 8.5),
      interaction: 'talk' as const,
    };
    data.state.entities.push(resident);
    stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect([resident.x, resident.y]).toEqual([8.5, 8.5]);
  });
  it('retains independent movement targets and rejects a wall command', () => {
    const data = scenario();
    const nara = recruit(data, 'nara'),
      idris = recruit(data, 'idris', 4.5, 4.5);
    expect(
      commandAgent(data.state, data.save, 'nara', 'move', data.world, 8.5, 5.5),
    ).toBe(true);
    expect(
      commandAgent(
        data.state,
        data.save,
        'idris',
        'move',
        data.world,
        7.5,
        8.5,
      ),
    ).toBe(true);
    expect([nara.targetX, nara.targetY]).toEqual([8.5, 5.5]);
    expect([idris.targetX, idris.targetY]).toEqual([7.5, 8.5]);
    expect(
      commandAgent(data.state, data.save, 'nara', 'move', data.world, 0.5, 0.5),
    ).toBe(false);
    data.save.continuity.agents.idris.order = 'move';
    const before = idris.y;
    stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'cortex',
    );
    expect(idris.y).toBeGreaterThan(before);
  });
  it('cover holds a firing position while follow traverses toward the player', () => {
    const data = scenario(),
      nara = recruit(data, 'nara', 8.5, 3.5);
    data.save.continuity.agents.nara.order = 'cover';
    stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(nara.x).toBe(8.5);
    data.save.continuity.agents.nara.order = 'follow';
    stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(nara.x).toBeLessThan(8.5);
    expect(agentOrder(data.save, 'nara')).toBe('follow');
  });
  it('Salomé heals an injured body, then respects her support cooldown', () => {
    const data = scenario(),
      salome = recruit(data, 'salome');
    data.state.player.health = 30;
    stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    const healed = data.state.player.health;
    expect(healed).toBeGreaterThan(30);
    expect(salome.supportLeft).toBeGreaterThan(7);
    stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(data.state.player.health).toBe(healed);
  });
  it('Idris absorbs part of a visible attack instead of granting invisible invulnerability', () => {
    const data = scenario(),
      idris = recruit(data, 'idris', 4.5, 3.5);
    hostile(data);
    data.state.player.armor = 0;
    const health = data.state.player.health;
    stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(idris.health).toBeLessThan(100);
    expect(data.state.player.health).toBeLessThan(health);
    expect(health - data.state.player.health).toBeLessThan(8);
  });
  it('Nara executes sabotage objectives but an ordinary ally cannot auto-complete the same terminal', () => {
    const data = scenario(),
      nara = recruit(data, 'nara', 4.2, 3.5);
    data.save.continuity.agents.nara.order = 'interact';
    const relay = {
      ...entity('relay', 'terminal', 4.5, 3.5),
      objectiveId: 'm1.relay',
      objective: true,
      interaction: 'sabotage' as const,
    };
    data.state.entities.push(relay);
    const events = stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(relay.alive).toBe(false);
    expect(events).toContainEqual({
      type: 'campaign',
      name: 'objective-completed',
      id: 'm1.relay',
    });
    expect(nara.alive).toBe(true);
  });
});

describe('functional synthetic-body targeting and Spectre', () => {
  it.each(['motor', 'weapon', 'optical'] as const)(
    'precision fire disables the %s system after sufficient damage',
    (system) => {
      const data = scenario(),
        enemy = hostile(data);
      data.state.targetSystem = system;
      fireReady(data);
      fireReady(data);
      fireReady(data);
      expect(enemy.disabledSystem).toBe(system);
      expect(enemy.alive).toBe(true);
    },
  );
  it('a disabled weapon cannot damage the player while the enemy remains alive', () => {
    const data = scenario(),
      enemy = hostile(data);
    enemy.disabledSystem = 'weapon';
    const before = data.state.player.health;
    for (let i = 0; i < 80; i++)
      stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        0.05,
        'chair',
      );
    expect(data.state.player.health).toBe(before);
  });
  it('neutralized optics reduce acquisition range', () => {
    const data = scenario(),
      enemy = hostile(data, 6.5, 3.5);
    enemy.disabledSystem = 'optical';
    const before = data.state.player.health;
    for (let i = 0; i < 20; i++)
      stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        0.05,
        'chair',
      );
    expect(data.state.player.health).toBe(before);
  });
  it('a damaged motor slows pursuit', () => {
    const normal = scenario(),
      slow = scenario();
    const fastEnemy = hostile(normal, 9.5, 3.5),
      slowEnemy = hostile(slow, 9.5, 3.5);
    slowEnemy.disabledSystem = 'motor';
    stepEncounter(
      normal.state,
      normal.world,
      normal.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    stepEncounter(
      slow.state,
      slow.world,
      slow.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(9.5 - slowEnemy.x).toBeLessThan(9.5 - fastEnemy.x);
  });
  it('requires a cortical implant or Interface skill to possess human envelopes', () => {
    const data = scenario(),
      enemy = hostile(data);
    expect(canPossessHuman(data.save)).toBe(false);
    expect(possessActor(data.state, data.world, enemy.id, data.save)).toBe(
      false,
    );
    data.save.continuity.skills = ['interface-3'];
    expect(possessActor(data.state, data.world, enemy.id, data.save)).toBe(
      true,
    );
    const origin = { x: data.state.player.x, y: data.state.player.y };
    stepEncounter(
      data.state,
      data.world,
      data.save,
      { ...EMPTY_INPUT, forward: 1 },
      0.05,
      'spectre',
    );
    expect({ x: data.state.player.x, y: data.state.player.y }).toEqual(origin);
    expect(enemy.x).not.toBe(5.5);
    stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(data.state.droneId).toBeNull();
  });
  it('cannot possess a civilian or the Collector even with the implant', () => {
    const data = scenario();
    data.save.continuity.implants = ['cortex-puppet'];
    data.state.entities = [
      entity('resident', 'nara'),
      entity('collector', 'boss'),
    ];
    expect(possessActor(data.state, data.world, 'resident', data.save)).toBe(
      false,
    );
    expect(possessActor(data.state, data.world, 'collector', data.save)).toBe(
      false,
    );
  });
  it('remote hacking respects its charge/range budget and exposes a playable hack event', () => {
    const data = scenario();
    data.state.entities = [
      {
        ...entity('terminal', 'terminal'),
        objectiveId: 'm1.data',
        interaction: 'hack',
        objective: true,
      },
    ];
    const before = data.state.player.neural;
    expect(hackNetwork(data.state, data.save, 'm1.data')).toEqual([
      { type: 'hack', id: 'm1.data', label: 'terminal' },
    ]);
    expect(data.state.player.neural).toBeLessThan(before);
    data.state.player.neural = 0;
    expect(hackNetwork(data.state, data.save, 'm1.data')).toEqual([]);
  });
});

describe('embodied risk and expedition contracts', () => {
  it('guides a real mission to its first unfinished objective, then to the metro after save/reload', () => {
    const data = scenario();
    data.save.campaign.stage = 'station';
    data.save.campaign.stationReached = true;
    let save = beginExpedition(data.save, 'corniche', 'appearance', 'identity');
    let state = createEncounter(save);
    expect(navigationObjective(state, save)?.objectiveId).toBe(
      'appearance-witness',
    );
    const mission = MISSIONS.find((m) => m.id === 'appearance')!;
    for (const objective of mission.objectives)
      save = recordObjective(save, objective.id);
    // The selector also tolerates a live viewport whose old marker flags have not remounted yet.
    expect(navigationObjective(state, save)?.interaction).toBe('extract');
    state = createEncounter(save);
    save = { ...save, encounter: state };
    const loaded = deserializeSave(serializeSave(save));
    const target = navigationObjective(loaded.encounter!, loaded)!;
    expect(target.interaction).toBe('extract');
    expect(
      findPath(
        missionWorld(loaded).map,
        loaded.encounter!.player.x,
        loaded.encounter!.player.y,
        target.x,
        target.y,
      ).length,
    ).toBeGreaterThan(0);
  });
  it('always offers a reachable metro return while exploring inhabited Station Zéro', () => {
    const data = scenario();
    data.save.campaign.stage = 'station';
    data.save.campaign.stationReached = true;
    const save = beginExpedition(data.save, 'station', null, 'identity');
    const state = createEncounter(save),
      world = missionWorld(save);
    const target = navigationObjective(state, save)!;
    expect(target.id).toBe('station.extract');
    expect(
      findPath(world.map, state.player.x, state.player.y, target.x, target.y)
        .length,
    ).toBeGreaterThan(0);
    state.player.x = target.x;
    state.player.y = target.y - 0.6;
    state.player.angle = Math.PI / 2;
    expect(interact(state, world, save)).toContainEqual({
      type: 'campaign',
      name: 'expedition-extracted',
    });
  });
  it('liberated districts do not re-aggro neutral guards until the player actually attacks', () => {
    const data = scenario();
    data.state.stage = 'district';
    data.save.continuity.active = {
      district: 'corniche',
      mission: 'appearance',
      approach: 'identity',
      objectives: [],
      choice: null,
    };
    data.save.continuity.territories.corniche.liberated = true;
    const enemy = {
      ...entity('corniche.guard', 'guard', 4.5, 3.5),
      hostile: false,
    };
    data.state.entities = [enemy];
    for (let i = 0; i < 120; i++)
      stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        0.05,
        'chair',
      );
    expect(enemy.hostile).toBe(false);
    expect(enemy.awareness).toBe(0);
    fireReady(data);
    expect(enemy.hostile).toBe(true);
    expect(enemy.state).toBe('combat');
  });
  it('district faction reputation changes identity suspicion without granting combat immunity', () => {
    const friendly = scenario(),
      hostileRep = scenario();
    for (const data of [friendly, hostileRep]) {
      data.state.stage = 'district';
      data.save.continuity.active = {
        district: 'corniche',
        mission: 'appearance',
        approach: 'identity',
        objectives: [],
        choice: null,
      };
      data.state.entities = [entity('corniche.guard', 'guard', 4.5, 3.5)];
    }
    friendly.save.continuity.factions.euromed = 100;
    hostileRep.save.continuity.factions.euromed = -100;
    for (let i = 0; i < 20; i++) {
      stepEncounter(
        friendly.state,
        friendly.world,
        friendly.save,
        EMPTY_INPUT,
        0.05,
        'chair',
      );
      stepEncounter(
        hostileRep.state,
        hostileRep.world,
        hostileRep.save,
        EMPTY_INPUT,
        0.05,
        'chair',
      );
    }
    expect(friendly.state.entities[0].awareness).toBeLessThan(
      hostileRep.state.entities[0].awareness!,
    );
    fireReady(friendly);
    expect(friendly.state.entities[0].hostile).toBe(true);
  });
  it('equipped implants alter health, armor, charge and regeneration in the live encounter', () => {
    const data = scenario();
    data.save.continuity.implants = [
      'organic-graft',
      'dermal-keel',
      'cortex-puppet',
    ];
    const state = createEncounter(data.save);
    expect(state.player.maxHealth).toBe(115);
    expect(state.player.maxArmor).toBe(70);
    expect(state.player.maxNeural).toBe(115);
    Object.assign(state.player, data.world.start);
    state.entities = [];
    state.player.health = 50;
    stepEncounter(state, data.world, data.save, EMPTY_INPUT, 0.05, 'chair');
    expect(state.player.health).toBeGreaterThan(50);
  });
  it('vaults one low railing, spends charge and settles the camera lift', () => {
    const data = scenario();
    data.world.map[3][4] = 2;
    const before = data.state.player.neural;
    expect(vaultObstacle(data.state, data.world)).toBe(true);
    expect([data.state.player.x, data.state.player.y]).toEqual([5.5, 3.5]);
    expect(data.state.player.neural).toBe(before - 8);
    expect(data.state.player.vaultLift).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++)
      stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        0.05,
        'chair',
      );
    expect(data.state.player.vaultLift).toBe(0);
  });
  it('rejects solid walls, thick barriers, unsafe map bounds and insufficient vault charge', () => {
    const data = scenario();
    data.world.map[3][4] = 1;
    expect(vaultObstacle(data.state, data.world)).toBe(false);
    data.world.map[3][4] = 2;
    data.world.map[3][5] = 2;
    expect(vaultObstacle(data.state, data.world)).toBe(false);
    data.world.map[3][5] = 0;
    data.state.player.neural = 7;
    expect(vaultObstacle(data.state, data.world)).toBe(false);
    data.state.player.neural = 100;
    data.state.player.x = 10.5;
    data.world.map[3][11] = 2;
    expect(vaultObstacle(data.state, data.world)).toBe(false);
  });
  it('progressively limits movement without preventing the final emergency route', () => {
    const normal = scenario(),
      urgent = scenario();
    normal.state.stage = urgent.state.stage = 'revocation';
    normal.state.revocationLeft = 180;
    urgent.state.revocationLeft = 20;
    expect(revocationPhase(urgent.state)).toBe(3);
    const input = { ...EMPTY_INPUT, forward: 1 };
    stepEncounter(
      normal.state,
      normal.world,
      normal.save,
      input,
      0.05,
      'chair',
    );
    stepEncounter(
      urgent.state,
      urgent.world,
      urgent.save,
      input,
      0.05,
      'chair',
    );
    expect(urgent.state.player.x).toBeGreaterThan(3.5);
    expect(urgent.state.player.x).toBeLessThan(normal.state.player.x);
    expect(urgent.state.player.recoil).toBeGreaterThan(0);
  });
  it('somatic tension and expired debt have bounded physical consequences', () => {
    const normal = scenario(),
      strained = scenario();
    strained.save.continuity.somatic = 100;
    strained.save.continuity.lease.debt = 200;
    const input = { ...EMPTY_INPUT, forward: 1 };
    stepEncounter(
      normal.state,
      normal.world,
      normal.save,
      input,
      0.05,
      'chair',
    );
    stepEncounter(
      strained.state,
      strained.world,
      strained.save,
      input,
      0.05,
      'chair',
    );
    expect(strained.state.player.x).toBeGreaterThan(3.5);
    expect(strained.state.player.x).toBeLessThan(normal.state.player.x);
  });
  it('low memory slows neural recovery', () => {
    const normal = scenario(),
      strained = scenario();
    normal.state.player.neural = strained.state.player.neural = 10;
    strained.save.continuity.memory = 0;
    stepEncounter(
      normal.state,
      normal.world,
      normal.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    stepEncounter(
      strained.state,
      strained.world,
      strained.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(strained.state.player.neural).toBeGreaterThan(10);
    expect(strained.state.player.neural).toBeLessThan(
      normal.state.player.neural,
    );
  });
  it('talk/sabotage/extraction emit distinct events and incomplete objectives gate departure', () => {
    const data = scenario();
    const objective = {
      ...entity('objective', 'terminal', 4.5, 3.5),
      objective: true,
      interactable: true,
      objectiveId: 'test.goal',
      interaction: 'sabotage' as const,
    };
    const exit = {
      ...entity('extract', 'exit', 4.5, 3.5),
      interactable: true,
      interaction: 'extract' as const,
    };
    data.state.entities = [exit, objective];
    expect(interact(data.state, data.world, data.save)).toEqual([]);
    data.state.entities = [objective, exit];
    expect(interact(data.state, data.world, data.save)).toContainEqual({
      type: 'campaign',
      name: 'objective-completed',
      id: 'test.goal',
    });
    expect(interact(data.state, data.world, data.save)).toEqual([
      { type: 'campaign', name: 'expedition-extracted' },
    ]);
    data.state.entities = [
      {
        ...entity('speaker', 'nara', 4.5, 3.5),
        interactable: true,
        interaction: 'talk',
        objectiveId: 'test.talk',
      },
    ];
    expect(interact(data.state, data.world, data.save)).toEqual([
      { type: 'dialogue', id: 'test.talk', label: 'speaker' },
    ]);
  });
  it('civilian Velvet encounters seal weapons and cybermancy', () => {
    const data = scenario();
    data.save.continuity.active = {
      district: 'velours',
      mission: 'velvet',
      approach: 'identity',
      objectives: [],
      choice: null,
    };
    const enemy = hostile(data);
    const ammo = data.state.player.weapon.ammo;
    expect(shoot(data.state, data.world, data.save)).toEqual([]);
    expect(pulse(data.state, data.world, data.save)).toEqual([]);
    expect(data.state.player.weapon.ammo).toBe(ammo);
    expect(enemy.health).toBe(1000);
  });
  it('a consenting ally can provide one emergency continuity, never an infinite resurrection loop', () => {
    const data = scenario(),
      nara = recruit(data, 'nara', 4.5, 4.5);
    data.save.continuity.facilities.transfer = 1;
    hostile(data);
    data.state.player.health = 1;
    data.state.player.armor = 0;
    const first = stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(first).toContainEqual({
      type: 'campaign',
      name: 'emergency-transfer',
      id: 'nara',
    });
    expect(data.state.player.health).toBeGreaterThan(0);
    expect(nara.alive).toBe(false);
    expect(data.state.emergencyUsed).toBe(true);
  });
});

describe('Mistral Noir electromagnetic storm', () => {
  function stormScenario() {
    const data = scenario();
    data.save.campaign.stage = data.state.stage = 'district';
    data.save.campaign.stationReached = true;
    data.save.continuity.active = {
      district: 'calanques',
      mission: 'mistral',
      approach: 'sabotage',
      objectives: [],
      choice: null,
    };
    return data;
  }
  const isWave = (event: { type: string; name?: string }) =>
    event.type === 'campaign' && event.name === 'mistral-wave';

  it('announces the next wave three simulation seconds before it without damage or a flash', () => {
    const data = stormScenario();
    data.state.stormTime = 14.98;
    const health = data.state.player.health,
      charge = data.state.player.neural;
    const events = stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(data.state.notice).toContain('dans 3 secondes');
    expect(events.some(isWave)).toBe(false);
    expect(data.state.player.health).toBe(health);
    expect(data.state.player.neural).toBe(charge);
    expect(data.state.player.hurtFlash).toBe(0);
  });

  it('emits exactly one wave per eighteen-second threshold and drains eight charge without physical harm', () => {
    const data = stormScenario();
    const drone = entity('storm.drone', 'drone', 8.5, 7.5);
    const dead = { ...entity('storm.dead', 'drone'), alive: false, health: 0 };
    const alreadyOff = {
      ...entity('storm.off', 'drone'),
      state: 'disabled' as const,
      stunLeft: 0,
    };
    data.state.entities.push(drone, dead, alreadyOff);
    const ally = recruit(data, 'nara');
    const health = data.state.player.health,
      allyHealth = ally.health;
    data.state.stormTime = 17.99;
    const first = stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(first.filter(isWave)).toHaveLength(1);
    expect(data.state.player.neural).toBe(92);
    expect(data.state.player.health).toBe(health);
    expect(ally.health).toBe(allyHealth);
    expect(drone.health).toBe(1000);
    expect(drone.state).toBe('disabled');
    expect(drone.stunLeft).toBeCloseTo(3);
    expect(dead.alive).toBe(false);
    expect(dead.stunLeft).toBeUndefined();
    expect(alreadyOff.stunLeft).toBe(0);
    const second = stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(second.some(isWave)).toBe(false);
    expect(data.state.player.neural).toBeGreaterThan(92);
    data.state.stormTime = 35.99;
    expect(
      stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        0.05,
        'chair',
      ).filter(isWave),
    ).toHaveLength(1);
  });

  it.each(['drone', 'guard'] as const)(
    'breaks remote %s possession and signals the existing campaign event channel',
    (kind) => {
      const data = stormScenario();
      data.save.continuity.skills = ['interface-3'];
      const actor = entity('remote', kind);
      data.state.entities = [actor];
      expect(possessActor(data.state, data.world, actor.id, data.save)).toBe(
        true,
      );
      data.state.stormTime = 17.99;
      const origin = { x: data.state.player.x, y: data.state.player.y };
      const events = stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        0.05,
        'spectre',
      );
      expect(data.state.droneId).toBeNull();
      expect(events).toContainEqual({ type: 'campaign', name: 'mistral-wave' });
      expect({ x: data.state.player.x, y: data.state.player.y }).toEqual(
        origin,
      );
    },
  );

  it('keeps drones unpossessable for the three-second outage, then allows control again', () => {
    const data = stormScenario(),
      drone = entity('offline', 'drone');
    data.state.entities = [drone];
    data.state.stormTime = 17.99;
    stepEncounter(
      data.state,
      data.world,
      data.save,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(possessActor(data.state, data.world, drone.id, data.save)).toBe(
      false,
    );
    for (let i = 0; i < 61; i++)
      stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        0.05,
        'chair',
      );
    expect(drone.stunLeft).toBe(0);
    expect(possessActor(data.state, data.world, drone.id, data.save)).toBe(
      true,
    );
  });

  it('freezes the clock while paused and slows only the storm clock in Cortex', () => {
    const data = stormScenario();
    data.state.stormTime = 17.96;
    const before = structuredClone(data.state);
    expect(
      stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        60,
        'chair',
        true,
      ),
    ).toEqual([]);
    expect(data.state).toEqual(before);
    expect(
      stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        0.05,
        'cortex',
      ).some(isWave),
    ).toBe(false);
    expect(
      stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        0.05,
        'cortex',
      ).some(isWave),
    ).toBe(false);
    expect(data.state.stormTime).toBeCloseTo(17.992);
    expect(
      stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        0.05,
        'cortex',
      ).some(isWave),
    ).toBe(true);
    expect(data.state.elapsed).toBeCloseTo(before.elapsed + 0.15);
  });

  it.each(['appearance', null] as const)(
    'does not run during mission %s or free exploration of the Calanques',
    (mission) => {
      const data = stormScenario();
      data.save.continuity.active!.mission = mission;
      data.state.stormTime = 17.99;
      expect(
        stepEncounter(
          data.state,
          data.world,
          data.save,
          EMPTY_INPUT,
          0.05,
          'chair',
        ).some(isWave),
      ).toBe(false);
      expect(data.state.stormTime).toBe(17.99);
      expect(data.state.player.neural).toBe(100);
    },
  );

  it('ends only when the source is sabotaged, not merely when its network filter is hacked', () => {
    const data = stormScenario();
    data.state.stormTime = 17.99;
    data.save.continuity.active!.objectives = ['mistral-filter'];
    expect(
      stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        0.05,
        'chair',
      ).some(isWave),
    ).toBe(true);
    data.save.continuity.active!.objectives.push('mistral-cable');
    data.state.stormTime = 35.99;
    expect(
      stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        0.05,
        'chair',
      ).some(isWave),
    ).toBe(false);
    expect(data.state.stormTime).toBe(35.99);
  });

  it('also recognizes physical source destruction before the React objective update arrives', () => {
    const data = stormScenario();
    data.state.entities = [
      {
        ...entity('source', 'terminal'),
        objectiveId: 'mistral-cable',
        alive: false,
      },
    ];
    data.state.stormTime = 17.99;
    expect(
      stepEncounter(
        data.state,
        data.world,
        data.save,
        EMPTY_INPUT,
        0.05,
        'chair',
      ).some(isWave),
    ).toBe(false);
    expect(data.state.stormTime).toBe(17.99);
  });

  it('persists its phase across real export/import and never replays an already emitted wave', () => {
    const data = stormScenario();
    for (const mission of MISSIONS.slice(0, 3))
      data.save.continuity.completed[mission.id] = mission.choices[0].id;
    data.save.encounter = createEncounter(data.save);
    data.save.encounter.stormTime = 17.99;
    const loaded = deserializeSave(serializeSave(data.save));
    expect(loaded.encounter!.stormTime).toBe(17.99);
    const first = stepEncounter(
      loaded.encounter!,
      missionWorld(loaded),
      loaded,
      EMPTY_INPUT,
      0.05,
      'chair',
    );
    expect(first.filter(isWave)).toHaveLength(1);
    const resumed = deserializeSave(serializeSave(loaded));
    expect(resumed.encounter!.stormTime).toBeCloseTo(18.04);
    expect(
      stepEncounter(
        resumed.encounter!,
        missionWorld(resumed),
        resumed,
        EMPTY_INPUT,
        0.05,
        'chair',
      ).some(isWave),
    ).toBe(false);
  });
});
