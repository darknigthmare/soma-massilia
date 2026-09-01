import type { ActionState, WorldEntity } from './types';

export type FeedbackCue = 'none' | 'flash' | 'marker';

export interface VisualAccessibility {
  reduceMotion: boolean;
  reduceFlashes: boolean;
}

export interface EntityVisualState {
  action: ActionState;
  fallen: boolean;
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
  opacity: number;
  muzzleCue: FeedbackCue;
  impactCue: FeedbackCue;
}

export function resolvedEntityAction(entity: WorldEntity): ActionState {
  if (entity.captureState === 'restrained') return 'restrained';
  if (entity.captureState === 'incapacitated') return 'incapacitated';
  return entity.actionState ?? (entity.alive ? 'idle' : 'dead');
}

/** Pure visual contract shared by the canvas renderer and accessibility tests. */
export function entityVisualState(
  entity: WorldEntity,
  size: number,
  accessibility: VisualAccessibility,
): EntityVisualState {
  const action = resolvedEntityAction(entity);
  const fallen = ['dead', 'incapacitated', 'restrained'].includes(action);
  let offsetX = 0;
  let offsetY = 0;

  if (!accessibility.reduceMotion) {
    if (action === 'move')
      offsetY += Math.sin(entity.motionPhase ?? 0) * size * 0.025;
    if (action === 'attack')
      offsetY += Math.min(
        size * 0.045,
        Math.max(0, entity.actionLeft ?? 0) * size * 0.2,
      );
    if (action === 'hurt')
      offsetX +=
        Math.sin(Math.max(0, entity.actionLeft ?? 0) * 90) * size * 0.025;
  }

  // Fallen postures convey durable state, so they remain static with reduced motion.
  if (fallen) offsetY -= size * 0.06;
  const activeMuzzle = (entity.muzzleFlash ?? 0) > 0 && !fallen;
  const activeImpact = (entity.impactFlash ?? 0) > 0;

  return {
    action,
    fallen,
    offsetX,
    offsetY,
    rotation: fallen ? -Math.PI / 2 : 0,
    scale: fallen ? 0.86 : 1,
    opacity: action === 'dead' ? 0.62 : 1,
    muzzleCue: activeMuzzle
      ? accessibility.reduceFlashes
        ? 'marker'
        : 'flash'
      : 'none',
    impactCue: activeImpact
      ? accessibility.reduceFlashes
        ? 'marker'
        : 'flash'
      : 'none',
  };
}
