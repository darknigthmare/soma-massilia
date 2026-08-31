import { WEAPONS } from './content';
import type {
  EnemyKind,
  EnemyState,
  HackState,
  WeaponId,
  WeaponState,
  WorldEntity,
} from './types';

export const TAU = Math.PI * 2;

export function normalizeAngle(angle: number): number {
  return ((angle % TAU) + TAU) % TAU;
}

export function shortestAngle(from: number, to: number): number {
  let delta = normalizeAngle(to) - normalizeAngle(from);
  if (delta > Math.PI) delta -= TAU;
  if (delta < -Math.PI) delta += TAU;
  return delta;
}

export function angleToDirection(
  entityAngle: number,
  viewerAngle: number,
): number {
  const relative = normalizeAngle(viewerAngle - entityAngle + Math.PI / 8);
  return Math.floor(relative / (Math.PI / 4)) % 8;
}

export interface RayHit {
  distance: number;
  mapX: number;
  mapY: number;
  side: 0 | 1;
  wall: number;
  textureX: number;
}

export function castRay(
  map: number[][],
  startX: number,
  startY: number,
  angle: number,
  maxDistance = 32,
): RayHit {
  const rayDirX = Math.cos(angle);
  const rayDirY = Math.sin(angle);
  let mapX = Math.floor(startX);
  let mapY = Math.floor(startY);
  const deltaDistX = Math.abs(1 / (rayDirX || 1e-9));
  const deltaDistY = Math.abs(1 / (rayDirY || 1e-9));
  const stepX = rayDirX < 0 ? -1 : 1;
  const stepY = rayDirY < 0 ? -1 : 1;
  let sideDistX =
    rayDirX < 0
      ? (startX - mapX) * deltaDistX
      : (mapX + 1 - startX) * deltaDistX;
  let sideDistY =
    rayDirY < 0
      ? (startY - mapY) * deltaDistY
      : (mapY + 1 - startY) * deltaDistY;
  let side: 0 | 1 = 0;
  let wall = 0;
  let distance = 0;

  while (distance < maxDistance) {
    if (sideDistX < sideDistY) {
      distance = sideDistX;
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      distance = sideDistY;
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }
    if (
      distance > maxDistance ||
      mapY < 0 ||
      mapY >= map.length ||
      mapX < 0 ||
      mapX >= map[mapY].length
    ) {
      distance = maxDistance;
      break;
    }
    wall = map[mapY][mapX];
    if (wall > 0) {
      distance =
        side === 0
          ? (mapX - startX + (1 - stepX) / 2) / (rayDirX || 1e-9)
          : (mapY - startY + (1 - stepY) / 2) / (rayDirY || 1e-9);
      break;
    }
  }

  const hit =
    side === 0 ? startY + distance * rayDirY : startX + distance * rayDirX;
  let textureX = hit - Math.floor(hit);
  if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0))
    textureX = 1 - textureX;

  return {
    distance: Math.max(0.0001, Math.abs(distance || maxDistance)),
    mapX,
    mapY,
    side,
    wall,
    textureX,
  };
}

export function canOccupy(
  map: number[][],
  x: number,
  y: number,
  radius = 0.2,
): boolean {
  const checks = [
    [x - radius, y - radius],
    [x + radius, y - radius],
    [x - radius, y + radius],
    [x + radius, y + radius],
  ];
  return checks.every(([px, py]) => {
    const row = map[Math.floor(py)];
    return Boolean(row) && row[Math.floor(px)] === 0;
  });
}

export function lineOfSight(
  map: number[][],
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  const distance = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(2, Math.ceil(distance * 8));
  for (let index = 1; index < steps; index += 1) {
    const t = index / steps;
    const x = Math.floor(ax + (bx - ax) * t);
    const y = Math.floor(ay + (by - ay) * t);
    if (map[y]?.[x] !== 0) return false;
  }
  return true;
}

export function applyDamage(
  health: number,
  armor: number,
  amount: number,
  armorPiercing = 0,
): { health: number; armor: number; absorbed: number } {
  const protectedAmount =
    amount * (1 - Math.max(0, Math.min(1, armorPiercing)));
  const absorbable = protectedAmount * 0.7;
  const absorbed = Math.min(armor, absorbable);
  return {
    health: Math.max(0, health - Math.max(0, amount - absorbed)),
    armor: Math.max(0, armor - absorbed),
    absorbed,
  };
}

export function createWeaponState(
  id: WeaponId,
  reserveOverride?: number,
): WeaponState {
  const spec = WEAPONS[id];
  return {
    id,
    ammo: spec.magazine,
    reserve: reserveOverride ?? spec.reserve,
    cooldownLeft: 0,
    reloading: 0,
  };
}

export function tickWeapon(state: WeaponState, delta: number): WeaponState {
  const next = {
    ...state,
    cooldownLeft: Math.max(0, state.cooldownLeft - delta),
    reloading: Math.max(0, state.reloading - delta),
  };
  if (state.reloading > 0 && next.reloading === 0) {
    const spec = WEAPONS[state.id];
    const needed = Math.max(0, spec.magazine - state.ammo);
    const moved = Math.min(needed, state.reserve);
    next.ammo += moved;
    next.reserve -= moved;
  }
  return next;
}

export function startReload(state: WeaponState): WeaponState {
  const spec = WEAPONS[state.id];
  if (
    state.id === 'blade' ||
    state.reloading > 0 ||
    state.ammo >= spec.magazine ||
    state.reserve <= 0
  )
    return state;
  return { ...state, reloading: state.id === 'smg' ? 1.45 : 1.2 };
}

export function fireWeapon(state: WeaponState): {
  state: WeaponState;
  fired: boolean;
  damage: number;
} {
  const spec = WEAPONS[state.id];
  if (
    state.cooldownLeft > 0 ||
    state.reloading > 0 ||
    (state.id !== 'blade' && state.ammo <= 0)
  ) {
    return { state, fired: false, damage: 0 };
  }
  return {
    state: {
      ...state,
      ammo: state.id === 'blade' ? 1 : state.ammo - 1,
      cooldownLeft: spec.cooldown,
    },
    fired: true,
    damage: spec.damage,
  };
}

export function nextEnemyState(
  state: EnemyState,
  seesPlayer: boolean,
  hearsNoise: boolean,
  secondsSinceSeen: number,
): EnemyState {
  if (state === 'disabled') return state;
  if (seesPlayer)
    return state === 'patrol' || state === 'suspicion' ? 'alert' : 'combat';
  if (hearsNoise && state === 'patrol') return 'suspicion';
  if ((state === 'alert' || state === 'combat') && secondsSinceSeen > 2)
    return 'search';
  if (state === 'search' && secondsSinceSeen > 7) return 'patrol';
  if (state === 'suspicion' && secondsSinceSeen > 3) return 'investigate';
  return state;
}

export function impulseEffect(kind: EnemyKind): {
  damage: number;
  stun: number;
  armorDamage: number;
} {
  if (kind === 'drone') return { damage: 24, stun: 4, armorDamage: 999 };
  if (kind === 'heavy') return { damage: 14, stun: 1.2, armorDamage: 45 };
  if (kind === 'boss') return { damage: 16, stun: 0.6, armorDamage: 20 };
  return { damage: 28, stun: 2.2, armorDamage: 30 };
}

export type DefeatOutcome =
  | 'anchor-destroyed'
  | 'collector-transfer'
  | 'collector-defeated'
  | null;

export function resolveEntityDefeat(
  target: WorldEntity,
  entities: WorldEntity[],
): DefeatOutcome {
  if (!target.alive || target.health > 0) return null;
  target.alive = false;
  if (target.kind === 'anchor') return 'anchor-destroyed';
  if (target.kind !== 'boss') return null;
  const liveAnchors = entities.filter(
    (entity) => entity.kind === 'anchor' && entity.alive,
  ).length;
  if (liveAnchors === 0) return 'collector-defeated';
  target.health = target.maxHealth;
  target.alive = true;
  target.variant = (target.variant ?? 0) + 1;
  const anchor = entities.find(
    (entity) => entity.kind === 'anchor' && entity.alive,
  )!;
  target.x = anchor.x;
  target.y = anchor.y;
  target.armor = 65;
  target.stunLeft = 1.8;
  return 'collector-transfer';
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createHackState(seed: number, extraBurns = 0): HackState {
  const random = seededRandom(seed);
  const nodes = Array.from({ length: 25 }, (_, id) => ({
    id,
    x: id % 5,
    y: Math.floor(id / 5),
    links: [] as number[],
    captured: id === 0,
    ice: id > 0 && id < 24 && random() > 0.72,
    target: id === 24,
  }));

  const path: number[] = [];
  for (let y = 0; y < 5; y += 1) {
    const row = Array.from({ length: 5 }, (_, x) => y * 5 + x);
    path.push(...(y % 2 === 0 ? row : row.reverse()));
  }
  for (let index = 0; index < path.length - 1; index += 1) {
    const a = path[index];
    const b = path[index + 1];
    nodes[a].links.push(b);
    nodes[b].links.push(a);
  }
  for (const node of nodes) {
    for (const candidate of [
      node.id - 5,
      node.id + 5,
      node.id - 1,
      node.id + 1,
    ]) {
      if (
        candidate >= 0 &&
        candidate < 25 &&
        Math.abs(nodes[candidate].x - node.x) +
          Math.abs(nodes[candidate].y - node.y) ===
          1 &&
        !node.links.includes(candidate) &&
        random() > 0.58
      ) {
        node.links.push(candidate);
        nodes[candidate].links.push(node.id);
      }
    }
  }

  // An eight-hop route is always reachable within trace and program budgets.
  const safePath = [0, 1, 2, 3, 4, 9, 14, 19, 24];
  for (let i = 0; i < safePath.length; i += 1) {
    const node = nodes[safePath[i]];
    node.ice = false;
    const next = safePath[i + 1];
    if (next !== undefined && !node.links.includes(next)) {
      node.links.push(next);
      nodes[next].links.push(node.id);
    }
  }
  return {
    seed,
    nodes,
    current: 0,
    trace: 0,
    programs: { ghost: 2, fork: 1, burn: 2 + extraBurns, puppet: 1 },
    completed: false,
    failed: false,
  };
}

export type HackProgram = 'none' | 'ghost' | 'fork' | 'burn' | 'puppet';

export function captureHackNode(
  state: HackState,
  nodeId: number,
  program: HackProgram = 'none',
): HackState {
  if (state.completed || state.failed) return state;
  const node = state.nodes[nodeId];
  const current = state.nodes[state.current];
  if (!node || !current.links.includes(nodeId)) return state;
  // Captured network nodes remain traversable; a fork must never seal the route.
  if (node.captured)
    return { ...state, current: nodeId, completed: node.target };
  if (node.ice && program !== 'burn') {
    const trace = Math.min(100, state.trace + 18);
    return { ...state, trace, failed: trace >= 100 };
  }
  if (program !== 'none' && state.programs[program] <= 0) return state;

  const next: HackState = {
    ...state,
    nodes: state.nodes.map((item) =>
      item.id === nodeId
        ? {
            ...item,
            captured: true,
            ice: program === 'burn' ? false : item.ice,
          }
        : item,
    ),
    current: nodeId,
    trace: Math.max(
      0,
      state.trace + (program === 'ghost' ? -12 : node.ice ? 16 : 9),
    ),
    programs: {
      ...state.programs,
      ...(program === 'none' ? {} : { [program]: state.programs[program] - 1 }),
    },
    completed: node.target,
    failed: false,
  };

  if (program === 'fork') {
    const extra = next.nodes[nodeId].links.find(
      (id) => !next.nodes[id].captured && !next.nodes[id].ice,
    );
    if (extra !== undefined) {
      next.nodes = next.nodes.map((item) =>
        item.id === extra ? { ...item, captured: true } : item,
      );
      next.trace += 4;
    }
  }
  next.trace = Math.min(100, next.trace);
  next.failed = next.trace >= 100;
  next.completed = next.completed && !next.failed;
  return next;
}

export function isHackSolvable(state: HackState): boolean {
  return state.completed || suggestHackStep(state) !== null;
}

/** Dijkstra over node/program budgets, including trace. Returned move is executable. */
export function suggestHackStep(
  state: HackState,
): { nodeId: number; program: HackProgram } | null {
  if (state.failed || state.completed) return null;
  type Search = {
    id: number;
    trace: number;
    burn: number;
    ghost: number;
    first: { nodeId: number; program: HackProgram } | null;
  };
  const queue: Search[] = [
    {
      id: state.current,
      trace: state.trace,
      burn: state.programs.burn,
      ghost: state.programs.ghost,
      first: null,
    },
  ];
  const best = new Map<string, number>();
  while (queue.length) {
    queue.sort((a, b) => a.trace - b.trace);
    const current = queue.shift()!;
    const key = [current.id, current.burn, current.ghost].join(':');
    if ((best.get(key) ?? Infinity) <= current.trace) continue;
    best.set(key, current.trace);
    if (state.nodes[current.id].target) return current.first;
    for (const id of state.nodes[current.id].links) {
      const node = state.nodes[id];
      const programs: HackProgram[] = node.captured
        ? ['none']
        : node.ice
          ? ['burn']
          : ['none', 'ghost'];
      for (const program of programs) {
        if (
          (program === 'burn' && current.burn <= 0) ||
          (program === 'ghost' && current.ghost <= 0)
        )
          continue;
        const trace = Math.max(
          0,
          current.trace +
            (node.captured ? 0 : program === 'ghost' ? -12 : node.ice ? 16 : 9),
        );
        if (trace >= 100) continue;
        queue.push({
          id,
          trace,
          burn: current.burn - Number(program === 'burn'),
          ghost: current.ghost - Number(program === 'ghost'),
          first: current.first ?? { nodeId: id, program },
        });
      }
    }
  }
  return null;
}

export function findPath(
  map: number[][],
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { x: number; y: number }[] {
  const width = map[0].length;
  const start = Math.floor(ay) * width + Math.floor(ax);
  const end = Math.floor(by) * width + Math.floor(bx);
  if (!canOccupy(map, Math.floor(bx) + 0.5, Math.floor(by) + 0.5)) return [];
  const queue = [start];
  const previous = new Map<number, number>([[start, -1]]);
  for (let i = 0; i < queue.length; i += 1) {
    const id = queue[i];
    if (id === end) {
      const path = [];
      for (let n = end; n !== start; n = previous.get(n)!)
        path.unshift({ x: (n % width) + 0.5, y: Math.floor(n / width) + 0.5 });
      return path;
    }
    for (const next of [id - width, id + width, id - 1, id + 1]) {
      const x = next % width,
        y = Math.floor(next / width);
      if (
        Math.abs(x - (id % width)) + Math.abs(y - Math.floor(id / width)) !==
          1 ||
        previous.has(next) ||
        map[y]?.[x] !== 0
      )
        continue;
      previous.set(next, id);
      queue.push(next);
    }
  }
  return [];
}
