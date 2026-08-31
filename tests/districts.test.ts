import { describe, expect, it } from 'vitest';
import { AGENTS, DISTRICTS, FACILITIES, MISSIONS } from '@/game/campaign-data';
import { createDistrictWorld } from '@/game/districts';
import { canOccupy, findPath } from '@/game/engine';
import { createNewSave } from '@/game/save';
import { createWorld, type WorldDefinition } from '@/game/world';
import type { DistrictId, MissionId } from '@/game/continuity-types';
import type { CampaignStage, RouteId, SaveData } from '@/game/types';

const APPROACHES: RouteId[] = ['combat', 'identity', 'sabotage'];

function expedition(
  district: DistrictId | 'station',
  approach: RouteId = 'combat',
  mission: MissionId | null = null,
): SaveData {
  const save = createNewSave();
  save.campaign.stage = 'district';
  save.campaign.bodyId = 'mistral';
  save.continuity.active = {
    district,
    approach,
    mission,
    objectives: [],
    choice: null,
  };
  return save;
}

function reachableCells(world: WorldDefinition): Set<string> {
  const start = [Math.floor(world.start.x), Math.floor(world.start.y)];
  const seen = new Set([start.join(',')]);
  const queue = [start];
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      const key = `${nx},${ny}`;
      if (world.map[ny]?.[nx] !== 0 || seen.has(key)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

function expectReachable(world: WorldDefinition): void {
  expect(canOccupy(world.map, world.start.x, world.start.y, 0.24)).toBe(true);
  const reachable = reachableCells(world);
  for (const entity of world.entities) {
    expect(canOccupy(world.map, entity.x, entity.y, 0.24), entity.id).toBe(
      true,
    );
    expect(
      reachable.has(`${Math.floor(entity.x)},${Math.floor(entity.y)}`),
      entity.id,
    ).toBe(true);
  }
  // Also catch hidden disconnected cells that currently have no objective.
  const walkableCount = world.map.flat().filter((tile) => tile === 0).length;
  expect(
    reachable.size,
    'all authored floor is connected without requiring a vault',
  ).toBe(walkableCount);
  expect(new Set(world.entities.map((entity) => entity.id)).size).toBe(
    world.entities.length,
  );
  expect(
    new Set(world.entities.map((entity) => `${entity.x},${entity.y}`)).size,
  ).toBe(world.entities.length);
}

describe('authored district floor plans', () => {
  for (const district of DISTRICTS) {
    for (const approach of APPROACHES) {
      it(`${district.id}/${approach}: all actors and every floor tile are reachable`, () => {
        const world = createDistrictWorld(expedition(district.id, approach));
        expect(world.map).toHaveLength(24);
        expect(world.map.every((row) => row.length === 24)).toBe(true);
        expect(world.map[0].every((tile) => tile > 0)).toBe(true);
        expect(world.map[23].every((tile) => tile > 0)).toBe(true);
        expect(world.map.every((row) => row[0] > 0 && row[23] > 0)).toBe(true);
        expect(world.districtName).toBe(district.name);
        expect(world.accent).toBe(district.color);
        expectReachable(world);
      });
    }
  }

  it('has eight distinct, deterministic authored layouts rather than recolored legacy maps', () => {
    const layouts = DISTRICTS.map((district) =>
      JSON.stringify(createDistrictWorld(expedition(district.id)).map),
    );
    expect(new Set(layouts).size).toBe(8);
    expect(
      DISTRICTS.map((district) =>
        JSON.stringify(createDistrictWorld(expedition(district.id)).map),
      ),
    ).toEqual(layouts);
  });

  it('keeps the port quay as a wide, readable three-tile avenue', () => {
    const world = createDistrictWorld(expedition('port'));
    for (const y of [9, 10, 11])
      expect(world.map[y].slice(1, 23).every((tile) => tile === 0)).toBe(true);
    expect(
      world.map.flat().filter((tile) => tile === 0).length,
    ).toBeGreaterThan(350);
  });

  for (const district of DISTRICTS) {
    it(`${district.id}: approaches change entry, access doors, objective path and patrol pressure`, () => {
      const worlds = APPROACHES.map((approach) =>
        createDistrictWorld(expedition(district.id, approach)),
      );
      expect(
        new Set(worlds.map((world) => `${world.start.x},${world.start.y}`))
          .size,
      ).toBe(3);
      expect(
        new Set(worlds.map((world) => JSON.stringify(world.map))).size,
      ).toBe(3);
      const paths = worlds.map((world) => {
        const relay = world.entities.find(
          (entity) => entity.id === `relay.${district.id}`,
        )!;
        return JSON.stringify(
          findPath(world.map, world.start.x, world.start.y, relay.x, relay.y),
        );
      });
      expect(new Set(paths).size).toBe(3);
      expect(
        worlds[0].entities.filter((entity) => entity.hostile),
      ).toHaveLength(7);
      expect(
        worlds[1].entities.filter((entity) => entity.hostile),
      ).toHaveLength(0);
      expect(
        worlds[2].entities.filter((entity) => entity.hostile),
      ).toHaveLength(4);
      expect(
        worlds[2].entities.find((entity) => entity.kind === 'drone')?.state,
      ).toBe('disabled');
    });
  }

  it('places useful thin type-2 railings with safe landings in all eight districts', () => {
    for (const district of DISTRICTS) {
      const { map } = createDistrictWorld(expedition(district.id));
      const vaultable = map.some((row, y) =>
        row.some(
          (tile, x) =>
            tile === 2 &&
            ((map[y - 1]?.[x] === 0 && map[y + 1]?.[x] === 0) ||
              (row[x - 1] === 0 && row[x + 1] === 0)),
        ),
      );
      expect(vaultable, district.id).toBe(true);
    }
  });
});

describe('physical campaign objectives', () => {
  for (const mission of MISSIONS) {
    for (const approach of APPROACHES) {
      it(`${mission.id}/${approach}: each source objective is a reachable physical interaction`, () => {
        const save = expedition(mission.district, approach, mission.id);
        for (const agent of AGENTS)
          save.continuity.agents[agent.id].recruited = true;
        const world = createDistrictWorld(save);
        expectReachable(world);
        for (const objective of mission.objectives) {
          const matches = world.entities.filter(
            (entity) => entity.objectiveId === objective.id,
          );
          expect(matches).toHaveLength(1);
          expect(matches[0]).toMatchObject({
            interaction: objective.interaction,
            interactable: true,
            objective: true,
            alive: true,
          });
          expect(matches[0].kind).toBe(
            objective.interaction === 'talk' ? 'nara' : 'terminal',
          );
          expect(matches[0].agentId).toBeUndefined();
          if (objective.interaction === 'talk')
            expect(matches[0].quote?.length).toBeGreaterThan(30);
        }
        expect(
          world.entities.find((entity) => entity.kind === 'exit'),
        ).toMatchObject({ interaction: 'extract', interactable: true });
      });
    }

    it(`${mission.id}: completed objectives stay completed and witnesses are not deleted on return`, () => {
      const save = expedition(mission.district, 'identity', mission.id);
      save.continuity.active!.objectives = mission.objectives.map(
        (objective) => objective.id,
      );
      const world = createDistrictWorld(save);
      for (const objective of mission.objectives) {
        const entity = world.entities.find(
          (item) => item.objectiveId === objective.id,
        )!;
        expect(entity.alive).toBe(true);
        expect(entity.objective).toBe(false);
        expect(entity.interactable).toBe(objective.interaction === 'talk');
      }
      expect(world.objective).toContain('métro');
    });
  }

  it('uses the mission district if an imported expedition contains a mismatched district', () => {
    const world = createDistrictWorld(
      expedition('port', 'identity', 'appearance'),
    );
    expect(world.districtName).toBe(
      DISTRICTS.find((district) => district.id === 'corniche')!.name,
    );
    expectReachable(world);
  });

  it.each(APPROACHES)(
    'keeps the Velvet gala peaceful and explicitly unarmed even with approach %s',
    (approach) => {
      const world = createDistrictWorld(
        expedition('velours', approach, 'velvet'),
      );
      expect(
        world.entities.some((entity) =>
          ['guard', 'heavy', 'drone', 'boss'].includes(entity.kind),
        ),
      ).toBe(false);
      expect(world.entities.some((entity) => entity.hostile)).toBe(false);
      expect(world.objective).toContain('armes et impulsions interdites');
      expect(world.start).toEqual(
        createDistrictWorld(expedition('velours', 'identity', 'velvet')).start,
      );
    },
  );
});

describe('local visits, companions and station', () => {
  for (const district of DISTRICTS) {
    it(`${district.id}: a repeat visit has optional relay, cache, resident and return metro`, () => {
      const save = expedition(district.id);
      save.continuity.completed.appearance = 'return-face';
      const world = createDistrictWorld(save);
      expect(
        world.entities.find((entity) => entity.id === `relay.${district.id}`),
      ).toMatchObject({
        objectiveId: `relay.${district.id}`,
        interaction: 'hack',
        objective: false,
      });
      expect(world.entities.some((entity) => entity.kind === 'loot')).toBe(
        true,
      );
      expect(
        world.entities.find((entity) => entity.id === `resident.${district.id}`)
          ?.quote?.length,
      ).toBeGreaterThan(30);
      expect(world.entities.some((entity) => entity.objective)).toBe(false);
      expect(
        world.entities.find((entity) => entity.interaction === 'extract')
          ?.label,
      ).toContain('Syndicat');
      expect(
        world.entities.some(
          (entity) => entity.kind === 'heavy' && !entity.allied,
        ),
      ).toBe(true);
    });
  }

  it('respects liberated territory and does not reactivate a captured relay', () => {
    const save = expedition('port');
    save.continuity.territories.port.liberated = true;
    save.continuity.active!.objectives.push('relay.port');
    const world = createDistrictWorld(save);
    expect(world.entities.some((entity) => entity.hostile)).toBe(false);
    expect(
      world.entities.find((entity) => entity.id === 'relay.port'),
    ).toMatchObject({ alive: true, interactable: false, objective: false });
  });

  it('spawns only recruited agents, separately from resident NPCs and mission witnesses', () => {
    for (const district of [
      ...DISTRICTS.map((item) => item.id),
      'station',
    ] as const) {
      for (const approach of APPROACHES) {
        const save = expedition(district, approach);
        for (const agent of AGENTS)
          save.continuity.agents[agent.id].recruited = false;
        expect(
          createDistrictWorld(save).entities.some((entity) => entity.agentId),
        ).toBe(false);
        for (const agent of AGENTS)
          save.continuity.agents[agent.id].recruited = true;
        const world = createDistrictWorld(save);
        expect(
          world.entities
            .filter((entity) => entity.agentId)
            .map((entity) => entity.agentId)
            .sort((a, b) => String(a).localeCompare(String(b))),
        ).toEqual(['idris', 'nara', 'salome']);
        for (const agent of world.entities.filter((entity) => entity.agentId)) {
          expect(agent).toMatchObject({
            kind: 'nara',
            allied: true,
            hostile: false,
          });
          expect(agent.objectiveId).toBeUndefined();
        }
        expectReachable(world);
      }
    }
  });

  it('provides a peaceful, inhabited 32x32 station with all thirteen physical services', () => {
    const world = createDistrictWorld(expedition('station'));
    expect(world.map).toHaveLength(32);
    expect(world.map.every((row) => row.length === 32)).toBe(true);
    expectReachable(world);
    expect(
      world.entities.filter((entity) => entity.interaction === 'service'),
    ).toHaveLength(13);
    for (const facility of FACILITIES)
      expect(
        world.entities.find((entity) => entity.facilityId === facility.id),
      ).toMatchObject({
        id: `facility.${facility.id}`,
        objectiveId: `facility.${facility.id}`,
        label: facility.name,
        interaction: 'service',
        interactable: true,
        objective: false,
      });
    expect(
      world.entities.filter((entity) =>
        entity.id.startsWith('station.resident.'),
      ).length,
    ).toBeGreaterThanOrEqual(7);
    expect(world.entities.some((entity) => entity.hostile)).toBe(false);
    expect(
      world.entities.find((entity) => entity.kind === 'exit'),
    ).toMatchObject({ interaction: 'extract', interactable: true });
  });

  it('returns fresh map and actor objects without changing the save', () => {
    const save = expedition('couronne', 'sabotage', 'incarnation');
    const before = structuredClone(save);
    const first = createDistrictWorld(save),
      second = createDistrictWorld(save);
    first.map[1][1] = 4;
    first.entities[0].health = 0;
    expect(second.map[1][1]).toBe(0);
    expect(second.entities[0].health).toBeGreaterThan(0);
    expect(save).toEqual(before);
  });
});

describe('legacy campaign compatibility', () => {
  for (const stage of [
    'docks',
    'revocation',
    'nara',
    'collector',
    'operation',
  ] as CampaignStage[]) {
    it(`${stage}: clearing the expedition restores the exact legacy map and mission actors`, () => {
      const save = createNewSave();
      save.campaign.stage = stage;
      save.campaign.route = 'sabotage';
      save.activeOperation = stage === 'operation' ? 'velours' : null;
      save.continuity.active = null;
      expect(createDistrictWorld(save)).toEqual(
        createWorld(
          stage,
          'sabotage',
          save.campaign.collectorAnchors,
          save.activeOperation,
        ),
      );
    });
  }
});
