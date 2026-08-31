import { AGENTS, DISTRICTS, FACILITIES, MISSIONS } from './campaign-data';
import type { DistrictId, FacilityId } from './continuity-types';
import { resolvedSocialOption } from './social';
import type { RouteId, SaveData, WorldEntity } from './types';
import { createWorld, type WorldDefinition } from './world';

type Point = readonly [x: number, y: number];
type Rect = readonly [left: number, top: number, right: number, bottom: number];
type Block = readonly [...Rect, material: number];
type Room = readonly [...Rect, material: number, doors: readonly Rect[]];

interface DistrictPlan {
  atmosphere: WorldDefinition['atmosphere'];
  blocks: readonly Block[];
  rooms: readonly Room[];
  identityDoor: Rect;
  serviceDoor: Rect;
  objectives: readonly Point[];
  patrols: readonly Point[];
  drone: Point;
  relay: Point;
  cache: Point;
  resident: { name: string; quote: string };
}

/** These are authored floor plans, not seeded mazes. Zero is walkable floor;
 * materials 1–4 are solid walls. Wide streets connect every room and metro exit. */
const PLANS: Record<DistrictId, DistrictPlan> = {
  port: {
    atmosphere: 'docks',
    // Three warehouses face a broad quay; cargo islands leave a central avenue.
    blocks: [
      [5, 13, 7, 15, 2],
      [14, 13, 17, 16, 2],
      [9, 18, 12, 18, 2],
    ],
    rooms: [
      [3, 4, 7, 8, 1, [[5, 8, 6, 8]]],
      [10, 4, 14, 8, 2, [[11, 8, 12, 8]]],
      [17, 4, 20, 8, 1, [[18, 8, 19, 8]]],
    ],
    identityDoor: [3, 6, 3, 7],
    serviceDoor: [20, 6, 20, 7],
    objectives: [
      [5.5, 6.5],
      [12.5, 6.5],
      [18.5, 6.5],
    ],
    patrols: [
      [11.5, 10.5],
      [18.5, 19.5],
      [3.5, 10.5],
      [16.5, 11.5],
      [11.5, 17.5],
      [20.5, 10.5],
    ],
    drone: [8.5, 10.5],
    relay: [20.5, 18.5],
    cache: [4.5, 21.5],
    resident: {
      name: 'Lina, pilote de remorqueur',
      quote:
        'Le Port a trois entrées : la douane pour les badges, les quais pour les convois et les conduites pour ceux qu’on efface. Le métro reste à nous.',
    },
  },
  corniche: {
    atmosphere: 'collector',
    // Upper clinics, a split retaining terrace, and lower residential courts.
    blocks: [
      [5, 11, 9, 12, 1],
      [13, 11, 18, 12, 1],
      [9, 18, 13, 18, 2],
    ],
    rooms: [
      [3, 3, 8, 7, 4, [[5, 7, 6, 7]]],
      [15, 3, 20, 7, 4, [[17, 7, 18, 7]]],
      [4, 15, 8, 18, 1, [[6, 15, 7, 15]]],
      [15, 15, 19, 18, 1, [[16, 15, 17, 15]]],
    ],
    identityDoor: [3, 4, 3, 5],
    serviceDoor: [20, 4, 20, 5],
    objectives: [
      [5.5, 5.5],
      [17.5, 5.5],
      [11.5, 9.5],
    ],
    patrols: [
      [11.5, 6.5],
      [19.5, 11.5],
      [8.5, 10.5],
      [11.5, 15.5],
      [20.5, 19.5],
      [3.5, 8.5],
    ],
    drone: [13.5, 14.5],
    relay: [20.5, 10.5],
    cache: [10.5, 20.5],
    resident: {
      name: 'Élias, jardinier sous contrat',
      quote:
        'La clinique appelle cela un jardin suspendu. Nous appelons cela l’étage où les visages coûtent plus cher que les personnes.',
    },
  },
  velours: {
    atmosphere: 'prison',
    // Four private salons surround a public patio and its central bar.
    blocks: [
      [10, 10, 13, 12, 3],
      [10, 18, 13, 18, 2],
    ],
    rooms: [
      [3, 3, 9, 8, 3, [[6, 8, 7, 8]]],
      [14, 3, 20, 8, 3, [[16, 8, 17, 8]]],
      [3, 15, 9, 20, 3, [[6, 15, 7, 15]]],
      [14, 15, 20, 20, 3, [[16, 15, 17, 15]]],
      [3, 10, 6, 13, 3, [[6, 11, 6, 12]]],
      [17, 10, 20, 13, 3, [[17, 11, 17, 12]]],
    ],
    identityDoor: [3, 5, 3, 6],
    serviceDoor: [20, 16, 20, 17],
    objectives: [
      [5.5, 5.5],
      [17.5, 5.5],
      [5.5, 17.5],
    ],
    patrols: [
      [11.5, 6.5],
      [11.5, 16.5],
      [7.5, 12.5],
      [16.5, 12.5],
      [12.5, 20.5],
      [20.5, 14.5],
    ],
    drone: [12.5, 14.5],
    relay: [21.5, 7.5],
    cache: [19.5, 21.5],
    resident: {
      name: 'Axelle, vestiaire des invités',
      quote:
        'Ce soir, les armes restent au vestiaire. Une invitation peut ouvrir une porte; elle ne peut jamais remplacer le oui de la personne qui se trouve derrière.',
    },
  },
  forge: {
    atmosphere: 'revocation',
    // Two northern workshops feed one large assembly hall through a service yard.
    blocks: [
      [5, 5, 6, 7, 2],
      [16, 5, 17, 7, 2],
      [9, 16, 10, 18, 2],
      [14, 16, 15, 18, 2],
      [10, 13, 13, 13, 2],
    ],
    rooms: [
      [
        3,
        3,
        9,
        10,
        2,
        [
          [9, 6, 9, 7],
          [5, 10, 6, 10],
        ],
      ],
      [
        14,
        3,
        20,
        10,
        2,
        [
          [14, 6, 14, 7],
          [17, 10, 18, 10],
        ],
      ],
      [
        7,
        14,
        17,
        20,
        2,
        [
          [11, 14, 12, 14],
          [17, 17, 17, 18],
        ],
      ],
    ],
    identityDoor: [3, 5, 3, 6],
    serviceDoor: [20, 5, 20, 6],
    objectives: [
      [7.5, 5.5],
      [18.5, 5.5],
      [12.5, 18.5],
    ],
    patrols: [
      [11.5, 5.5],
      [11.5, 12.5],
      [4.5, 12.5],
      [19.5, 12.5],
      [20.5, 18.5],
      [5.5, 18.5],
    ],
    drone: [12.5, 11.5],
    relay: [21.5, 6.5],
    cache: [3.5, 21.5],
    resident: {
      name: 'Marin, soudeur des Craies',
      quote:
        'Les trois halls ne fabriquent pas des propriétaires. On remet des corps en état et on rend la clé à la personne qui les habite.',
    },
  },
  calanques: {
    atmosphere: 'docks',
    // Stepped limestone masses form broad irregular coves, not a rectangular maze.
    blocks: [
      [3, 3, 7, 6, 1],
      [3, 7, 5, 10, 1],
      [4, 11, 8, 13, 1],
      [3, 14, 5, 17, 1],
      [15, 3, 20, 5, 1],
      [17, 6, 20, 9, 1],
      [14, 10, 18, 12, 1],
      [18, 13, 20, 17, 1],
      [9, 5, 10, 7, 1],
      [10, 15, 13, 17, 1],
      [10, 19, 13, 19, 2],
    ],
    rooms: [[5, 17, 9, 20, 2, [[7, 17, 8, 17]]]],
    identityDoor: [5, 9, 5, 10],
    serviceDoor: [18, 11, 18, 12],
    objectives: [
      [12.5, 4.5],
      [7.5, 9.5],
      [12.5, 12.5],
    ],
    patrols: [
      [12.5, 7.5],
      [10.5, 10.5],
      [9.5, 14.5],
      [16.5, 15.5],
      [16.5, 19.5],
      [7.5, 15.5],
    ],
    drone: [11.5, 12.5],
    relay: [20.5, 19.5],
    cache: [9.5, 21.5],
    resident: {
      name: 'Rami, gardien des câbles',
      quote:
        'Sous la roche, certaines voix ont choisi de rester ensemble. D’autres appellent à l’aide. Écoutez-les avant de couper ce qui les relie.',
    },
  },
  relais: {
    atmosphere: 'revocation',
    // Four server cloisters join at a wide processional cross.
    blocks: [
      [5, 5, 6, 8, 4],
      [8, 5, 8, 8, 4],
      [15, 5, 16, 8, 4],
      [5, 15, 6, 18, 4],
      [15, 15, 16, 18, 4],
      [11, 14, 12, 14, 2],
    ],
    rooms: [
      [
        3,
        3,
        10,
        10,
        4,
        [
          [10, 6, 10, 7],
          [6, 10, 7, 10],
        ],
      ],
      [
        13,
        3,
        20,
        10,
        4,
        [
          [13, 6, 13, 7],
          [16, 10, 17, 10],
        ],
      ],
      [
        3,
        13,
        10,
        20,
        4,
        [
          [6, 13, 7, 13],
          [10, 16, 10, 17],
        ],
      ],
      [
        13,
        13,
        20,
        20,
        4,
        [
          [16, 13, 17, 13],
          [13, 16, 13, 17],
        ],
      ],
    ],
    identityDoor: [3, 6, 3, 7],
    serviceDoor: [20, 16, 20, 17],
    objectives: [
      [4.5, 4.5],
      [18.5, 5.5],
      [8.5, 17.5],
    ],
    patrols: [
      [11.5, 5.5],
      [17.5, 11.5],
      [5.5, 11.5],
      [11.5, 18.5],
      [11.5, 8.5],
      [19.5, 12.5],
    ],
    drone: [12.5, 12.5],
    relay: [20.5, 11.5],
    cache: [3.5, 21.5],
    resident: {
      name: 'Ninon, archiviste des pèlerins',
      quote:
        'La Bonne Mère peut garder une mémoire, pas l’exiger. Les registres de volonté sont à l’étage des serveurs, derrière les galeries.',
    },
  },
  if: {
    atmosphere: 'prison',
    // Six cell blocks open onto the central guard spine; side walks form a loop.
    blocks: [
      [6, 3, 6, 6, 2],
      [17, 3, 17, 6, 2],
      [3, 12, 6, 12, 2],
      [10, 14, 12, 14, 2],
    ],
    rooms: [
      [3, 3, 9, 8, 1, [[9, 5, 9, 6]]],
      [3, 10, 9, 15, 1, [[9, 12, 9, 13]]],
      [3, 17, 9, 20, 1, [[9, 18, 9, 19]]],
      [14, 3, 20, 8, 1, [[14, 5, 14, 6]]],
      [14, 10, 20, 15, 1, [[14, 12, 14, 13]]],
      [14, 17, 20, 20, 1, [[14, 18, 14, 19]]],
    ],
    identityDoor: [3, 5, 3, 6],
    serviceDoor: [20, 11, 20, 12],
    objectives: [
      [4.5, 6.5],
      [18.5, 6.5],
      [4.5, 13.5],
    ],
    patrols: [
      [11.5, 6.5],
      [11.5, 12.5],
      [11.5, 18.5],
      [19.5, 9.5],
      [6.5, 16.5],
      [19.5, 16.5],
    ],
    drone: [12.5, 16.5],
    relay: [21.5, 9.5],
    cache: [2.5, 21.5],
    resident: {
      name: 'Dalia, aide aux anciens détenus',
      quote:
        'Les cellules ouvrent sur l’allée centrale. Ne confondez jamais une enveloppe de garde avec celui qui l’habite : leurs contrats ne disent pas tout.',
    },
  },
  couronne: {
    atmosphere: 'collector',
    // Nested civic enclosures create a public ring, a legal court, and a core.
    blocks: [
      [10, 9, 13, 11, 4],
      [5, 5, 6, 7, 4],
      [17, 5, 18, 7, 4],
      [5, 15, 6, 17, 4],
      [17, 15, 18, 17, 4],
      [10, 17, 13, 17, 2],
    ],
    rooms: [
      [
        4,
        3,
        19,
        19,
        4,
        [
          [10, 19, 13, 19],
          [4, 10, 4, 12],
          [19, 10, 19, 12],
        ],
      ],
      [
        8,
        7,
        15,
        15,
        4,
        [
          [10, 15, 12, 15],
          [8, 10, 8, 11],
          [15, 10, 15, 12],
        ],
      ],
    ],
    identityDoor: [4, 5, 4, 6],
    serviceDoor: [19, 16, 19, 17],
    objectives: [
      [11.5, 5.5],
      [6.5, 11.5],
      [11.5, 13.5],
    ],
    patrols: [
      [7.5, 9.5],
      [16.5, 9.5],
      [7.5, 14.5],
      [16.5, 14.5],
      [11.5, 16.5],
      [20.5, 8.5],
    ],
    drone: [11.5, 6.5],
    relay: [21.5, 18.5],
    cache: [4.5, 21.5],
    resident: {
      name: 'Sacha, greffier dissident',
      quote:
        'La première enceinte trie les badges, la seconde trie les droits. Au centre, SÔMA appelle la révocation une simple opération administrative.',
    },
  },
};

function paint(map: number[][], area: Rect, material: number): void {
  const [left, top, right, bottom] = area;
  for (let y = top; y <= bottom; y += 1)
    for (let x = left; x <= right; x += 1) map[y][x] = material;
}

function floorPlan(
  size: number,
  rooms: readonly Room[],
  blocks: readonly Block[] = [],
): number[][] {
  const map = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) =>
      Number(x === 0 || y === 0 || x === size - 1 || y === size - 1),
    ),
  );
  for (const [left, top, right, bottom, material, doors] of rooms) {
    paint(map, [left, top, right, top], material);
    paint(map, [left, bottom, right, bottom], material);
    paint(map, [left, top, left, bottom], material);
    paint(map, [right, top, right, bottom], material);
    for (const door of doors) paint(map, door, 0);
  }
  for (const [left, top, right, bottom, material] of blocks)
    paint(map, [left, top, right, bottom], material);
  return map;
}

function actor(
  id: string,
  kind: WorldEntity['kind'],
  point: Point,
  label: string,
  fields: Partial<WorldEntity> = {},
): WorldEntity {
  return {
    id,
    kind,
    x: point[0],
    y: point[1],
    angle: 0,
    label,
    health: 100,
    maxHealth: 100,
    armor: 0,
    alive: true,
    hostile: false,
    ...fields,
  };
}

const ENTRIES: Record<
  RouteId,
  { start: WorldDefinition['start']; squad: readonly Point[]; label: string }
> = {
  combat: {
    start: { x: 11.5, y: 21.5, angle: -Math.PI / 2 },
    squad: [
      [10.5, 21.5],
      [12.5, 21.5],
      [13.5, 21.5],
    ],
    label: 'quai principal',
  },
  identity: {
    start: { x: 2.5, y: 11.5, angle: 0 },
    squad: [
      [2.5, 10.5],
      [2.5, 12.5],
      [1.5, 11.5],
    ],
    label: 'accès accrédité',
  },
  sabotage: {
    start: { x: 21.5, y: 21.5, angle: -Math.PI / 2 },
    squad: [
      [20.5, 21.5],
      [21.5, 20.5],
      [22.5, 21.5],
    ],
    label: 'passage technique',
  },
};

/** No objectiveId on squad actors: talking to an ally must not finish a witness objective. */
function squadActors(
  save: SaveData,
  positions: readonly Point[],
): WorldEntity[] {
  return AGENTS.filter(
    (agent) => save.continuity.agents[agent.id]?.recruited,
  ).map((agent, index) => {
    const state = save.continuity.agents[agent.id];
    const heavy = state.body === 'mole';
    return actor(`agent.${agent.id}`, 'nara', positions[index], agent.name, {
      agentId: agent.id,
      allied: true,
      interactable: true,
      interaction: 'talk',
      health: heavy ? 155 : 105,
      maxHealth: heavy ? 155 : 105,
      armor: heavy ? 80 : 30,
      quote: agent.description,
    });
  });
}

// Short original in-world lines accompany the source mission objective labels.
const WITNESS_QUOTES: Record<string, string> = {
  'appearance-witness':
    'MAËLLE — J’ai quarante et un ans. La clinique a multiplié mon ancien corps pour vendre ma célébrité. Mes copies ont développé des personnalités distinctes : écoutez-les, elles ne m’appartiennent pas.',
  'years-idris':
    'IDRIS — Quarante-quatre ans sur mon dossier. Trois jours réels dans cette prison, cent vingt ans vécus. Copiez les noms avant de faire tomber la porte.',
  'velvet-invitation':
    'LE PORTIER — Votre couverture est valide. Aucune arme, aucune impulsion dans les salons. Les invités conservent le droit de partir.',
  'velvet-salome':
    'SALOMÉ — J’ai trente-huit ans. J’ai conçu un protocole de consentement; ils en ont fait un titre de propriété. Gardez une copie du registre.',
  'mistral-voices':
    'LE CHŒUR — Certaines voix sont ici par choix. D’autres nous ont été imposées. Offrez à chacune une sortie; ne choisissez pas sa fin.',
  'faith-pilgrim':
    'JEANNE — Soixante-sept ans, et assez de souvenirs pour une vie. Je refuse la copie. Respectez aussi ceux qui voudront rester.',
  'incarnation-council':
    'LES TÉMOINS — Prenez les clés pour ouvrir nos portes, pas pour signer à notre place. Notre mandat reste révocable.',
};

function districtActors(
  save: SaveData,
  id: DistrictId,
  approach: RouteId,
): WorldEntity[] {
  const plan = PLANS[id];
  const liberated = save.continuity.territories[id]?.liberated ?? false;
  const active = save.continuity.active!;
  const social = active.mission === 'velvet';
  const entities: WorldEntity[] = [];

  // Cover and technical entry genuinely change patrol pressure. A heavy human
  // chassis remains a possession candidate without assigning ownership to any AI.
  if (!social) {
    const count = approach === 'combat' ? 6 : approach === 'identity' ? 3 : 4;
    plan.patrols.slice(0, count).forEach((point, index) => {
      const heavy = index === 1;
      entities.push(
        actor(
          `${id}.guard.${index}`,
          heavy ? 'heavy' : 'guard',
          point,
          heavy
            ? 'Châssis humain lourd de saisie'
            : index === 0
              ? 'Garde militaire sous licence'
              : 'Garde de concession',
          {
            hostile: approach !== 'identity' && !liberated,
            state: 'patrol',
            angle: index * 1.2,
            health: heavy ? 150 : 78,
            maxHealth: heavy ? 150 : 78,
            armor: heavy ? 95 : 30,
          },
        ),
      );
    });
    entities.push(
      actor(
        `${id}.drone`,
        'drone',
        plan.drone,
        'Drone de contrôle de quartier',
        {
          hostile: approach === 'combat' && !liberated,
          state: approach === 'sabotage' || liberated ? 'disabled' : 'patrol',
          health: 44,
          maxHealth: 44,
          armor: 18,
        },
      ),
    );
  }

  const relayId = `relay.${id}`;
  const relayDone = active.objectives.includes(relayId);
  entities.push(
    actor(
      relayId,
      'terminal',
      plan.relay,
      liberated
        ? 'Relais de quartier libéré'
        : 'Relais de contrôle territorial',
      {
        objectiveId: relayId,
        interaction: 'hack',
        interactable: !relayDone,
        objective: false,
        quote:
          'Ce relais est une opération locale facultative. Il ne remplace aucun objectif de la mission.',
      },
    ),
    actor(
      `cache.${id}`,
      'loot',
      plan.cache,
      'Cache locale : soins et ravitaillement',
      { interactable: true },
    ),
    actor(`resident.${id}`, 'nara', [2.5, 16.5], plan.resident.name, {
      interactable: true,
      interaction: 'talk',
      quote: plan.resident.quote,
    }),
    actor(`${id}.extract`, 'exit', [11.5, 22.5], 'Métro — retour au Syndicat', {
      interactable: true,
      interaction: 'extract',
      quote:
        'Retour à Station Zéro pour préparer la prochaine sortie avec la Cellule.',
    }),
    ...squadActors(save, ENTRIES[approach].squad),
  );
  return entities;
}

interface StationRoom {
  id: FacilityId;
  room: Room;
  terminal: Point;
  resident: Point;
}

/** Six western workshops, six eastern living spaces, and command to the north.
 * All thirteen have double doors into a ten-tile-wide, readable central hall. */
const STATION_ROOMS: readonly StationRoom[] = [
  {
    id: 'morphology',
    room: [3, 3, 10, 6, 2, [[10, 4, 10, 5]]],
    terminal: [5.5, 4.5],
    resident: [8.5, 4.5],
  },
  {
    id: 'lab',
    room: [3, 7, 10, 10, 4, [[10, 8, 10, 9]]],
    terminal: [5.5, 8.5],
    resident: [8.5, 8.5],
  },
  {
    id: 'armory',
    room: [3, 11, 10, 14, 2, [[10, 12, 10, 13]]],
    terminal: [5.5, 12.5],
    resident: [8.5, 12.5],
  },
  {
    id: 'drones',
    room: [3, 15, 10, 18, 2, [[10, 16, 10, 17]]],
    terminal: [5.5, 16.5],
    resident: [8.5, 16.5],
  },
  {
    id: 'transfer',
    room: [3, 19, 10, 22, 4, [[10, 20, 10, 21]]],
    terminal: [5.5, 20.5],
    resident: [8.5, 20.5],
  },
  {
    id: 'chapel',
    room: [3, 23, 10, 27, 3, [[10, 24, 10, 25]]],
    terminal: [5.5, 25.5],
    resident: [8.5, 25.5],
  },
  {
    id: 'bar',
    room: [21, 3, 28, 6, 3, [[21, 4, 21, 5]]],
    terminal: [25.5, 4.5],
    resident: [23.5, 4.5],
  },
  {
    id: 'interrogation',
    room: [21, 7, 28, 10, 1, [[21, 8, 21, 9]]],
    terminal: [25.5, 8.5],
    resident: [23.5, 8.5],
  },
  {
    id: 'media',
    room: [21, 11, 28, 14, 4, [[21, 12, 21, 13]]],
    terminal: [25.5, 12.5],
    resident: [23.5, 12.5],
  },
  {
    id: 'garage',
    room: [21, 15, 28, 18, 2, [[21, 16, 21, 17]]],
    terminal: [25.5, 16.5],
    resident: [23.5, 16.5],
  },
  {
    id: 'quarters',
    room: [21, 19, 28, 22, 1, [[21, 20, 21, 21]]],
    terminal: [25.5, 20.5],
    resident: [23.5, 20.5],
  },
  {
    id: 'refuge',
    room: [21, 23, 28, 27, 1, [[21, 24, 21, 25]]],
    terminal: [25.5, 25.5],
    resident: [23.5, 25.5],
  },
  {
    id: 'command',
    room: [12, 3, 19, 8, 4, [[15, 8, 16, 8]]],
    terminal: [15.5, 5.5],
    resident: [18.5, 5.5],
  },
];

const STATION_RESIDENTS: Partial<
  Record<FacilityId, { name: string; quote: string }>
> = {
  morphology: {
    name: 'Léonie, technicienne de morphologie',
    quote:
      'Un corps compatible n’est pas un corps obligatoire. Vous pouvez essayer, refuser et repartir.',
  },
  drones: {
    name: 'Noé, mécanicien de drones',
    quote:
      'L’atelier entretient les machines. Pour une incarnation humaine, parlez au laboratoire et préparez une sortie de secours.',
  },
  chapel: {
    name: 'Tess, gardienne des mémoires',
    quote:
      'Personne ne vous demandera de laisser une copie ici. Ce banc appartient à ceux qui ont besoin de silence.',
  },
  bar: {
    name: 'Malo, service du Dernier Souffle',
    quote:
      'Les contrats s’arrêtent à la porte du bar. Les équipiers gardent leur chambre et leur nom.',
  },
  interrogation: {
    name: 'Aline, dépositaire des témoignages',
    quote:
      'Ce lieu recueille les preuves, pas les aveux. Chaque témoin peut interrompre l’entretien.',
  },
  garage: {
    name: 'Jules, conducteur du métro clandestin',
    quote:
      'Le quai de départ est au sud du grand hall. La carte du Syndicat prépare votre prochaine destination.',
  },
  refuge: {
    name: 'Silas, ancien docker',
    quote:
      'J’ai retrouvé un corps avant de retrouver du travail. Ici, personne n’a demandé de garantie sur mes souvenirs.',
  },
};

function stationWorld(save: SaveData): WorldDefinition {
  const entities: WorldEntity[] = [];
  for (const place of STATION_ROOMS) {
    const facility = FACILITIES.find((item) => item.id === place.id)!;
    entities.push(
      actor(`facility.${place.id}`, 'terminal', place.terminal, facility.name, {
        facilityId: place.id,
        objectiveId: `facility.${place.id}`,
        interaction: 'service',
        interactable: true,
        objective: false,
        quote: `${facility.description} ${facility.effect}`,
      }),
    );
    const resident = STATION_RESIDENTS[place.id];
    if (resident)
      entities.push(
        actor(
          `station.resident.${place.id}`,
          'nara',
          place.resident,
          resident.name,
          {
            interactable: true,
            interaction: 'talk',
            quote: resident.quote,
          },
        ),
      );
  }
  entities.push(
    actor(
      'station.extract',
      'exit',
      [15.5, 29.5],
      'Métro — préparation au Syndicat',
      {
        interactable: true,
        interaction: 'extract',
        quote:
          'Ouvrir la carte stratégique et préparer une sortie depuis Station Zéro.',
      },
    ),
    actor('station.supply', 'loot', [18.5, 27.5], 'Réserve de la Cellule', {
      interactable: true,
    }),
    ...squadActors(save, [
      [14.5, 25.5],
      [16.5, 25.5],
      [15.5, 24.5],
    ]),
  );
  return {
    districtName: 'Station Zéro',
    accent: '#80c4bd',
    atmosphere: 'docks',
    map: floorPlan(
      32,
      STATION_ROOMS.map((place) => place.room),
    ),
    start: { x: 15.5, y: 27.5, angle: -Math.PI / 2 },
    entities,
    objective:
      'Explorer les treize installations et rencontrer les habitants. Le métro au sud ramène à la préparation du Syndicat.',
  };
}

/** Builds a fresh physical world without mutating the save or reviving completed
 * mission actions. Legacy stages continue to use their exact existing world. */
export function createDistrictWorld(save: SaveData): WorldDefinition {
  const active = save.continuity?.active;
  if (!active)
    return createWorld(
      save.campaign.stage,
      save.campaign.route,
      save.campaign.collectorAnchors,
      save.activeOperation,
    );
  if (active.district === 'station') return stationWorld(save);

  const mission = MISSIONS.find((item) => item.id === active.mission);
  const id = mission?.district ?? active.district;
  const definition = DISTRICTS.find((item) => item.id === id)!;
  const plan = PLANS[id];
  // The gala remains a social, unarmed space even if a forged save says combat.
  const approach = active.mission === 'velvet' ? 'identity' : active.approach;
  const map = floorPlan(24, plan.rooms, plan.blocks);
  if (approach === 'identity') paint(map, plan.identityDoor, 0);
  if (approach === 'sabotage') paint(map, plan.serviceDoor, 0);
  const entities = districtActors(save, id, approach);
  const brokerResolution =
    active.mission === 'velvet'
      ? resolvedSocialOption(save, 'velvet-broker')
      : null;
  const brokerResolved = brokerResolution !== null;
  const brokerCapture = save.continuity.captures.find(
    (capture) => capture.id === 'velvet-broker',
  );
  const brokerSurrendered =
    brokerResolution === 'broker-blackmail' &&
    brokerCapture?.status === 'surrendered';
  const brokerCaptured =
    brokerResolution === 'broker-blackmail' &&
    brokerCapture !== undefined &&
    brokerCapture.status !== 'surrendered';

  if (active.mission === 'velvet') {
    const auctionPoint = plan.objectives[2];
    entities.push(
      actor(
        'social.velvet-broker',
        brokerSurrendered || brokerCaptured ? 'guard' : 'nara',
        [auctionPoint[0] + 2, auctionPoint[1]],
        'Courtier du registre des corps',
        {
          interaction: 'talk',
          interactable: !brokerResolved || brokerSurrendered,
          objective: brokerSurrendered,
          objectiveId:
            brokerSurrendered || brokerCaptured
              ? 'capture.velvet-broker'
              : undefined,
          ...(brokerSurrendered || brokerCaptured
            ? {
                health: 1,
                maxHealth: 100,
                state: 'disabled' as const,
                hostile: false,
                captureState: brokerCaptured
                  ? ('restrained' as const)
                  : ('incapacitated' as const),
                actionState: brokerCaptured
                  ? ('restrained' as const)
                  : ('incapacitated' as const),
              }
            : {}),
          quote:
            'Le registre ne quittera pas cette salle sans couverture, accord, paiement ou preuve. Aucun lot ne vous appartient pour autant.',
        },
      ),
    );
  }

  for (const [index, objective] of (mission?.objectives ?? []).entries()) {
    const done = active.objectives.includes(objective.id);
    const talk = objective.interaction === 'talk';
    const auctionLocked =
      active.mission === 'velvet' &&
      objective.id === 'velvet-auction' &&
      !brokerResolved;
    entities.push(
      actor(
        `objective.${objective.id}`,
        talk ? 'nara' : 'terminal',
        plan.objectives[index],
        objective.label,
        {
          objectiveId: objective.id,
          interaction: objective.interaction,
          objective: !done,
          interactable: talk || (!done && !auctionLocked),
          // Witnesses persist after conversation; they are never made squad agents.
          quote: auctionLocked
            ? 'Le courtier doit d’abord ouvrir l’accès au registre. Le terminal reste un objectif de piratage.'
            : WITNESS_QUOTES[objective.id],
        },
      ),
    );
  }

  const pending = mission?.objectives.find(
    (item) => !active.objectives.includes(item.id),
  );
  return {
    districtName: definition.name,
    accent: definition.color,
    atmosphere: plan.atmosphere,
    map,
    start: { ...ENTRIES[approach].start },
    entities,
    objective: mission
      ? `${mission.title} — ${pending?.label ?? 'Rejoindre le métro pour extraire la Cellule.'}${active.mission === 'velvet' ? ' Zone sociale : armes et impulsions interdites.' : ''}`
      : `${definition.name} — explorer le quartier depuis le ${ENTRIES[approach].label}, agir sur le relais facultatif puis revenir au métro.`,
  };
}
