import type { GameMode, GameSettings } from './types';
import { EMPTY_INPUT, type InputFrame } from './simulation';

export type GamepadIntent =
  | { type: 'pause' }
  | {
      type: 'action';
      action:
        | 'interact'
        | 'reload'
        | 'pulse'
        | 'cortex'
        | 'next-weapon'
        | 'spectre';
    }
  | { type: 'cortex'; button: number };

const GAMEPLAY_GAMEPAD_ACTIONS: Record<
  number,
  Extract<GamepadIntent, { type: 'action' }>['action']
> = {
  0: 'interact',
  2: 'reload',
  3: 'pulse',
  4: 'cortex',
  5: 'next-weapon',
  8: 'spectre',
};

const GAMEPLAY_GAMEPAD_PRIORITY = [4, 8, 0, 2, 3, 5] as const;
const CORTEX_GAMEPAD_PRIORITY = [4, 8, 12, 13, 14, 15, 3, 2, 5, 1, 0] as const;

export function keyboardInput(
  keys: Set<string>,
  layout: GameSettings['controlLayout'],
): InputFrame {
  // Auto follows physical key positions; explicit layouts follow logical characters.
  const forward = layout === 'auto' ? 'KeyW' : layout === 'zqsd' ? 'z' : 'w';
  const left = layout === 'auto' ? 'KeyA' : layout === 'zqsd' ? 'q' : 'a';
  return {
    forward:
      Number(keys.has(forward) || keys.has('ArrowUp')) -
      Number(
        keys.has(layout === 'auto' ? 'KeyS' : 's') || keys.has('ArrowDown'),
      ),
    strafe:
      Number(keys.has(layout === 'auto' ? 'KeyD' : 'd')) -
      Number(keys.has(left)),
    turn: Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')),
    sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    crouch: keys.has('ControlLeft') || keys.has('ControlRight'),
    fire: keys.has('Space'),
  };
}
export function gamepadInput(
  axes: readonly number[],
  buttons: readonly { pressed: boolean }[],
): InputFrame {
  const deadzone = (v = 0) =>
    Math.abs(v) < 0.18
      ? 0
      : Math.sign(v) * Math.min(1, (Math.abs(v) - 0.18) / 0.82);
  return {
    ...EMPTY_INPUT,
    strafe: deadzone(axes[0]),
    forward: -deadzone(axes[1]) || 0,
    turn: deadzone(axes[2]),
    fire: Boolean(buttons[7]?.pressed),
    sprint: Boolean(buttons[10]?.pressed),
    crouch: Boolean(buttons[1]?.pressed),
  };
}

/** Returns buttons pressed on this frame only, so menus never repeat at 60 Hz. */
export function gamepadButtonEdges(
  buttons: readonly boolean[],
  previous: readonly boolean[],
): number[] {
  const pressed: number[] = [];
  buttons.forEach((value, index) => {
    if (value && !previous[index]) pressed.push(index);
  });
  return pressed;
}

/**
 * Resolves at most one semantic command per frame. This makes chords
 * deterministic and keeps Start usable while every other command is sealed by
 * the pause overlay.
 */
export function gamepadIntent(
  mode: GameMode,
  paused: boolean,
  pressedEdges: readonly number[],
): GamepadIntent | null {
  if (pressedEdges.includes(9)) return { type: 'pause' };
  if (paused) return null;
  const priority =
    mode === 'cortex' ? CORTEX_GAMEPAD_PRIORITY : GAMEPLAY_GAMEPAD_PRIORITY;
  const button = priority.find((candidate) => pressedEdges.includes(candidate));
  if (button === undefined) return null;
  if (mode === 'cortex') {
    if (button === 4) return { type: 'action', action: 'cortex' };
    if (button === 8) return { type: 'action', action: 'spectre' };
    return { type: 'cortex', button };
  }
  return { type: 'action', action: GAMEPLAY_GAMEPAD_ACTIONS[button] };
}

/** Start toggles only the pause panel; it never dismisses modal story states. */
export function togglePauseOverlay<T extends string>(
  current: T,
): T | 'none' | 'pause' {
  if (current === 'none') return 'pause';
  if (current === 'pause') return 'none';
  return current;
}
