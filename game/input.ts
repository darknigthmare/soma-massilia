import type { GameSettings } from './types';
import { EMPTY_INPUT, type InputFrame } from './simulation';

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
