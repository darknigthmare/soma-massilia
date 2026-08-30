import type { CampaignStage, RouteId, WorldEntity } from './types';

export interface WorldDefinition {
  map: number[][];
  start: { x: number; y: number; angle: number };
  entities: WorldEntity[];
  objective: string;
  atmosphere: 'docks' | 'revocation' | 'prison' | 'collector';
}

const MAP_DOCKS = [
  '1111111111111111',
  '1000000000000001',
  '1022200000111001',
  '1000200000100001',
  '1000201110103001',
  '1000001000100001',
  '1011101000000001',
  '1000101001111001',
  '1000100001000001',
  '1000111101000001',
  '1000000001000001',
  '1033011101000001',
  '1000010000000001',
  '1000010001111001',
  '1000000000000001',
  '1111111111111111',
];

const MAP_REVOCATION = [
  '1111111111111111',
  '1000000000000001',
  '1011110111110101',
  '1000010000010101',
  '1022010333010001',
  '1000010000011101',
  '1011011111000001',
  '1001000001011101',
  '1001011101000101',
  '1001000101000101',
  '1011000101110101',
  '1000000100000101',
  '1011110111100101',
  '1000000000000001',
  '1000000000000001',
  '1111111111111111',
];

const MAP_PRISON = [
  '1111111111111111',
  '1000000000000001',
  '1011110111111101',
  '1010000100000101',
  '1010333103330101',
  '1010000100000101',
  '1011110111110101',
  '1000000000010101',
  '1011111111010101',
  '1000000001010101',
  '1011110101010101',
  '1010000100010101',
  '1010333111110101',
  '1010000000000001',
  '1000000000000001',
  '1111111111111111',
];

const MAP_COLLECTOR = [
  '1111111111111111',
  '1000000000000001',
  '1000111001110001',
  '1000100000010001',
  '1011101110111001',
  '1000001000100001',
  '1000001000100001',
  '1011100000111001',
  '1000100000100001',
  '1000110301100001',
  '1000000000000001',
  '1011101110111001',
  '1000100000100001',
  '1000000000000001',
  '1000000000000001',
  '1111111111111111',
];

function parseMap(rows: string[]): number[][] {
  return rows.map((row) => Array.from(row).map(Number));
}

function entity(
  id: string,
  kind: WorldEntity['kind'],
  x: number,
  y: number,
  label: string,
  overrides: Partial<WorldEntity> = {},
): WorldEntity {
  return {
    id,
    kind,
    x,
    y,
    angle: 0,
    health: 70,
    maxHealth: 70,
    armor: 25,
    alive: true,
    label,
    ...overrides,
  };
}

function dockEntities(route: RouteId | null): WorldEntity[] {
  const guardCount = route === 'combat' ? 6 : route === 'identity' ? 3 : 4;
  const patrols = [
    [5.5, 2.5],
    [9.5, 4.5],
    [4.5, 8.5],
    [12.5, 9.5],
    [8.5, 12.5],
    [12.5, 13.5],
  ].slice(0, guardCount);
  return [
    ...patrols.map(([x, y], index) =>
      entity(`guard-${index}`, index === 4 ? 'heavy' : 'guard', x, y, index === 4 ? 'Lourd de saisie' : 'Garde de licence', {
        hostile: route !== 'identity',
        state: 'patrol',
        health: index === 4 ? 145 : 72,
        maxHealth: index === 4 ? 145 : 72,
        armor: index === 4 ? 100 : 25,
        angle: index * 0.9,
      }),
    ),
    entity('drone-docks', 'drone', 10.5, 6.5, 'Drone Mouche', {
      hostile: route !== 'sabotage',
      state: route === 'sabotage' ? 'disabled' : 'patrol',
      health: 44,
      maxHealth: 44,
      armor: 18,
    }),
    entity('registry', 'terminal', 13.5, 2.5, 'Registre des licences', {
      interactable: true,
      objective: true,
      health: 1,
      maxHealth: 1,
      armor: 0,
    }),
    entity('loot-docks', 'loot', 2.5, 12.5, 'Cache du Réseau Velours', {
      interactable: true,
      health: 1,
      maxHealth: 1,
      armor: 0,
    }),
  ];
}

export function createWorld(stage: CampaignStage, route: RouteId | null, anchors = 3): WorldDefinition {
  if (stage === 'revocation') {
    return {
      map: parseMap(MAP_REVOCATION),
      start: { x: 2.5, y: 13.5, angle: -Math.PI / 2 },
      atmosphere: 'revocation',
      objective: 'Atteindre la racine clandestine avant l’arrêt somatique.',
      entities: [
        entity('root', 'terminal', 13.5, 2.5, 'Racine clandestine', {
          interactable: true,
          objective: true,
          health: 1,
          maxHealth: 1,
          armor: 0,
        }),
        entity('revocation-drone', 'drone', 7.5, 7.5, 'Drone de révocation', {
          hostile: true,
          state: 'combat',
          health: 45,
          maxHealth: 45,
          armor: 15,
        }),
      ],
    };
  }

  if (stage === 'nara') {
    return {
      map: parseMap(MAP_PRISON),
      start: { x: 2.5, y: 14.2, angle: -Math.PI / 2 },
      atmosphere: 'prison',
      objective: 'Pirater la consignation et libérer Nara Velvet.',
      entities: [
        entity('nara-cell', 'terminal', 13.5, 3.5, 'Console de consignation', {
          interactable: true,
          objective: true,
          health: 1,
          maxHealth: 1,
          armor: 0,
        }),
        entity('nara', 'nara', 12.5, 4.5, 'Nara Velvet', {
          alive: true,
          hostile: false,
          health: 100,
          maxHealth: 100,
          armor: 35,
        }),
        entity('prison-guard-1', 'guard', 7.5, 9.5, 'Garde de licence', { hostile: true, state: 'patrol' }),
        entity('prison-guard-2', 'guard', 11.5, 13.5, 'Garde de licence', { hostile: true, state: 'patrol' }),
        entity('prison-heavy', 'heavy', 12.5, 7.5, 'Lourd de saisie', {
          hostile: true,
          state: 'patrol',
          health: 150,
          maxHealth: 150,
          armor: 110,
        }),
      ],
    };
  }

  if (stage === 'collector') {
    const anchorPositions = [
      [3.5, 3.5],
      [12.5, 3.5],
      [8.5, 12.5],
    ];
    return {
      map: parseMap(MAP_COLLECTOR),
      start: { x: 2.5, y: 13.5, angle: -Math.PI / 4 },
      atmosphere: 'collector',
      objective: 'Couper les ancres de conscience puis abattre Le Collecteur.',
      entities: [
        ...anchorPositions.slice(0, anchors).map(([x, y], index) =>
          entity(`anchor-${index}`, 'anchor', x, y, `Ancre de conscience 0${index + 1}`, {
            interactable: true,
            objective: true,
            health: 55,
            maxHealth: 55,
            armor: 0,
          }),
        ),
        entity('collector', 'boss', 8.5, 7.5, 'Le Collecteur', {
          hostile: true,
          state: 'combat',
          health: 230,
          maxHealth: 230,
          armor: 90,
          variant: 0,
        }),
        entity('nara', 'nara', 3.2, 13.1, 'Nara Velvet', {
          alive: true,
          hostile: false,
          health: 100,
          maxHealth: 100,
          armor: 35,
        }),
        entity('collector-drone-1', 'drone', 5.5, 8.5, 'Essaim de saisie', {
          hostile: true,
          state: 'combat',
          health: 42,
          maxHealth: 42,
          armor: 12,
        }),
        entity('collector-drone-2', 'drone', 11.5, 8.5, 'Essaim de saisie', {
          hostile: true,
          state: 'combat',
          health: 42,
          maxHealth: 42,
          armor: 12,
        }),
      ],
    };
  }

  return {
    map: parseMap(MAP_DOCKS),
    start: { x: 2.5, y: 14.2, angle: -Math.PI / 2 },
    atmosphere: 'docks',
    objective: 'Atteindre et pirater le registre des licences.',
    entities: dockEntities(route),
  };
}
