import type { AgentId } from './continuity-types';
import { canOccupy, findPath, lineOfSight } from './engine';
import type { EncounterState, FormationId, WorldEntity } from './types';

export interface FormationPosition {
  x: number;
  y: number;
}

export const FORMATION_IDS = ['column', 'wedge', 'line'] as const;
export const FORMATION_FALLBACK_RADIUS = 2;

const AGENT_IDS: AgentId[] = ['nara', 'idris', 'salome'];
const MIN_SLOT_DISTANCE = 0.8;
const ACTOR_RADIUS = 0.18;

type LocalOffset = { forward: number; lateral: number };

const FORMATION_OFFSETS: Record<FormationId, Record<AgentId, LocalOffset>> = {
  column: {
    nara: { forward: -1.2, lateral: 0 },
    idris: { forward: -2.2, lateral: 0 },
    salome: { forward: -3.2, lateral: 0 },
  },
  wedge: {
    nara: { forward: -1.1, lateral: -1 },
    idris: { forward: -1.1, lateral: 1 },
    salome: { forward: -2.1, lateral: 0 },
  },
  line: {
    nara: { forward: -1.4, lateral: -1.3 },
    idris: { forward: -1.4, lateral: 0 },
    salome: { forward: -1.4, lateral: 1.3 },
  },
};

export function isFormationId(value: unknown): value is FormationId {
  return FORMATION_IDS.includes(value as FormationId);
}

export function setFormation(state: EncounterState, id: FormationId): boolean {
  if (!isFormationId(id)) return false;
  state.formation = id;
  return true;
}

function rotateOffset(
  origin: FormationPosition,
  angle: number,
  offset: LocalOffset,
): FormationPosition {
  const forwardX = Math.cos(angle);
  const forwardY = Math.sin(angle);
  const lateralX = -forwardY;
  const lateralY = forwardX;
  return {
    x: origin.x + forwardX * offset.forward + lateralX * offset.lateral,
    y: origin.y + forwardY * offset.forward + lateralY * offset.lateral,
  };
}

function fallbackCandidates(ideal: FormationPosition): FormationPosition[] {
  const centerX = Math.floor(ideal.x) + 0.5;
  const centerY = Math.floor(ideal.y) + 0.5;
  const candidates: FormationPosition[] = [];
  for (let radius = 0; radius <= FORMATION_FALLBACK_RADIUS; radius++)
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        candidates.push({ x: centerX + dx, y: centerY + dy });
      }
  return candidates.sort((a, b) => {
    const distanceA = Math.hypot(a.x - ideal.x, a.y - ideal.y);
    const distanceB = Math.hypot(b.x - ideal.x, b.y - ideal.y);
    return distanceA - distanceB || a.y - b.y || a.x - b.x;
  });
}

function farEnough(
  candidate: FormationPosition,
  occupied: FormationPosition[],
): boolean {
  return occupied.every(
    (position) =>
      Math.hypot(candidate.x - position.x, candidate.y - position.y) >=
      MIN_SLOT_DISTANCE,
  );
}

function formationAgentId(entity: WorldEntity): AgentId | null {
  return entity.agentId ?? (entity.id === 'nara' ? 'nara' : null);
}

/**
 * Resolves every active squad slot together so two followers never select the
 * same fallback cell. Results depend only on the portable encounter and map.
 */
export function formationTargets(
  state: EncounterState,
  map: number[][],
): Partial<Record<AgentId, FormationPosition>> {
  const formation = isFormationId(state.formation) ? state.formation : 'column';
  const origin = { x: state.player.x, y: state.player.y };
  const actors = new Map(
    state.entities
      .filter((entity) => entity.alive && formationAgentId(entity))
      .map((entity) => [formationAgentId(entity)!, entity]),
  );
  const ideals = Object.fromEntries(
    AGENT_IDS.map((id) => [
      id,
      rotateOffset(
        origin,
        state.player.angle,
        FORMATION_OFFSETS[formation][id],
      ),
    ]),
  ) as Record<AgentId, FormationPosition>;
  const staticOccupied: FormationPosition[] = [
    origin,
    ...state.entities
      .filter((entity) => entity.alive && !formationAgentId(entity))
      .map((entity) => ({ x: entity.x, y: entity.y })),
  ];
  const resolved: Partial<Record<AgentId, FormationPosition>> = {};
  const reserved: FormationPosition[] = [];

  for (const id of AGENT_IDS) {
    const actor = actors.get(id);
    if (!actor) continue;
    const ideal = ideals[id];
    const otherActorPositions = AGENT_IDS.filter(
      (otherId) => otherId !== id && actors.has(otherId),
    ).map((otherId) => {
      const other = actors.get(otherId)!;
      return { x: other.x, y: other.y };
    });
    const otherIdeals = AGENT_IDS.filter(
      (otherId) => otherId !== id && actors.has(otherId),
    ).map((otherId) => ideals[otherId]);
    const candidates = [ideal, ...fallbackCandidates(ideal)];
    const target = candidates.find(
      (candidate) =>
        canOccupy(map, candidate.x, candidate.y, ACTOR_RADIUS) &&
        farEnough(candidate, staticOccupied) &&
        farEnough(candidate, otherActorPositions) &&
        farEnough(candidate, reserved) &&
        farEnough(candidate, otherIdeals) &&
        (lineOfSight(map, actor.x, actor.y, candidate.x, candidate.y) ||
          findPath(map, actor.x, actor.y, candidate.x, candidate.y).length > 0),
    );
    if (!target) continue;
    resolved[id] = target;
    reserved.push(target);
  }

  return resolved;
}
