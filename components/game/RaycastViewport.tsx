'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BODIES, STAGE_COPY, WEAPONS } from '@/game/content';
import { findPath } from '@/game/engine';
import { gamepadInput, keyboardInput } from '@/game/input';
import { renderWorld, compassLabel } from '@/game/renderer';
import {
  aimedTarget,
  cameraActor,
  createEncounter,
  EMPTY_INPUT,
  interact,
  missionWorld,
  nearestInteraction,
  possessDrone,
  pulse,
  reloadWeapon,
  shoot,
  stepEncounter,
  switchWeapon,
  type SimulationEvent,
} from '@/game/simulation';
import type {
  EncounterState,
  GameMode,
  NaraOrder,
  SaveData,
  WeaponId,
} from '@/game/types';
import { loadSpriteAssets } from '@/game/sprite-assets';

interface Props {
  save: SaveData;
  mode: GameMode;
  paused: boolean;
  onMode: (mode: GameMode) => void;
  onEvents: (events: SimulationEvent[], encounter: EncounterState) => void;
  onCheckpoint: (encounter: EncounterState) => void;
  onOrder: (order: NaraOrder) => void;
  onPause: () => void;
}

const ORDERS: { id: NaraOrder; label: string; help: string }[] = [
  { id: 'follow', label: 'Suivre', help: 'Suit votre position et riposte.' },
  { id: 'hold', label: 'Tenir', help: 'Reste en place et cesse le feu.' },
  {
    id: 'cover',
    label: 'Couvrir',
    help: 'Suit et engage les hostiles visibles.',
  },
  {
    id: 'focus',
    label: 'Cibler',
    help: 'Priorité à la cible dans votre viseur.',
  },
  {
    id: 'interact',
    label: 'Ancres',
    help: 'Rejoint et coupe les ancres de conscience.',
  },
];

export function RaycastViewport(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [world] = useState(() => missionWorld(props.save));
  const stateRef = useRef<EncounterState | null>(null);
  if (!stateRef.current)
    stateRef.current = props.save.encounter
      ? structuredClone(props.save.encounter)
      : createEncounter(props.save);
  const [view, setView] = useState(() => structuredClone(stateRef.current!));
  const [fps, setFps] = useState(0);
  const [touch, setTouch] = useState(false);
  const [pad, setPad] = useState(false);
  const keys = useRef(new Set<string>());
  const touches = useRef(new Set<string>());
  const firing = useRef(false);
  const lastPadButtons = useRef<boolean[]>([]);
  const [expandedMap, setExpandedMap] = useState(false);

  const emit = (events: SimulationEvent[]) => {
    if (events.length)
      latest.current.onEvents(events, structuredClone(stateRef.current!));
  };
  const action = (name: string) => {
    if (latest.current.paused || stateRef.current!.player.health <= 0) return;
    const state = stateRef.current!,
      { save, mode } = latest.current;
    if (name === 'fire') emit(shoot(state, world, save));
    if (name === 'interact') emit(interact(state, world));
    if (name === 'pulse') emit(pulse(state, world, save));
    if (name === 'reload') reloadWeapon(state);
    if (name === 'cortex')
      latest.current.onMode(mode === 'cortex' ? 'chair' : 'cortex');
    if (name === 'spectre')
      latest.current.onMode(mode === 'spectre' ? 'chair' : 'spectre');
    if (name in WEAPONS) switchWeapon(state, name as WeaponId, save);
    if (name === 'next-weapon') {
      const unlocked = (Object.keys(WEAPONS) as WeaponId[]).filter(
        (id) => save.weapons[id].unlocked,
      );
      switchWeapon(
        state,
        unlocked[
          (unlocked.indexOf(state.player.weapon.id) + 1) % unlocked.length
        ],
        save,
      );
    }
  };
  const actionRef = useRef(action);
  actionRef.current = action;

  useEffect(() => {
    void loadSpriteAssets();
    const media = window.matchMedia('(pointer: coarse)');
    setTouch(media.matches);
    const mediaChange = () => setTouch(media.matches);
    media.addEventListener('change', mediaChange);
    const keyDown = (event: KeyboardEvent) => {
      if (
        latest.current.paused ||
        (event.target instanceof HTMLElement &&
          event.target.matches('input,select,textarea'))
      )
        return;
      if (event.code === 'Escape') {
        latest.current.onPause();
        return;
      }
      keys.current.add(event.code);
      keys.current.add(event.key.toLowerCase());
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
          event.code,
        )
      )
        event.preventDefault();
      if (event.repeat) return;
      const command: Record<string, string> = {
        KeyE: 'interact',
        KeyR: 'reload',
        KeyF: 'pulse',
        KeyC: 'cortex',
        KeyV: 'spectre',
        Digit1: 'pistol',
        Digit2: 'smg',
        Digit3: 'rifle',
        Digit4: 'blade',
      };
      if (command[event.code]) actionRef.current(command[event.code]);
      if (event.code === 'KeyM') setExpandedMap((v) => !v);
      if (event.code === 'Tab' && document.pointerLockElement) {
        event.preventDefault();
        actionRef.current('cortex');
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      keys.current.delete(event.code);
      keys.current.delete(event.key.toLowerCase());
    };
    const clear = () => {
      keys.current.clear();
      touches.current.clear();
      firing.current = false;
    };
    const blur = () => {
      clear();
      latest.current.onPause();
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    const up = () => {
      firing.current = false;
    };
    const move = (event: PointerEvent) => {
      if (
        document.pointerLockElement === canvasRef.current &&
        !latest.current.paused
      )
        cameraActor(stateRef.current!).angle +=
          event.movementX *
          (0.0006 + latest.current.save.settings.sensitivity * 0.005);
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur);
    window.addEventListener('pointerup', up);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('pointermove', move);
    return () => {
      media.removeEventListener('change', mediaChange);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
      window.removeEventListener('pointerup', up);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('pointermove', move);
    };
  }, []);

  useEffect(() => {
    if (props.paused) {
      keys.current.clear();
      touches.current.clear();
      firing.current = false;
      document.exitPointerLock?.();
      latest.current.onCheckpoint(structuredClone(stateRef.current!));
    }
  }, [props.paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      canvas.width = Math.max(320, Math.min(720, Math.round(bounds.width)));
      canvas.height = Math.max(
        160,
        Math.round((canvas.width * bounds.height) / Math.max(1, bounds.width)),
      );
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    let last = 0,
      hudTime = 0,
      checkpointTime = 0,
      animation = 0;
    const tick = (now: number) => {
      const seconds = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const { save, mode, paused } = latest.current;
      const state = stateRef.current!;
      const input = keyboardInput(keys.current, save.settings.controlLayout);
      const gamepad = navigator.getGamepads?.().find((p) => p?.connected);
      if (gamepad) {
        const controls = gamepadInput(gamepad.axes, gamepad.buttons);
        input.forward += controls.forward;
        input.strafe += controls.strafe;
        input.turn += controls.turn;
        input.fire ||= controls.fire;
        input.sprint ||= controls.sprint;
        input.crouch ||= controls.crouch;
        const buttons = gamepad.buttons.map((b) => b.pressed);
        const commands: Record<number, string> = {
          0: 'interact',
          2: 'reload',
          3: 'pulse',
          4: 'cortex',
          5: 'next-weapon',
          8: 'spectre',
        };
        buttons.forEach((pressed, index) => {
          if (pressed && !lastPadButtons.current[index]) {
            if (index === 9) latest.current.onPause();
            else if (commands[index]) actionRef.current(commands[index]);
          }
        });
        lastPadButtons.current = buttons;
      }
      input.forward +=
        Number(touches.current.has('forward')) -
        Number(touches.current.has('back'));
      input.strafe +=
        Number(touches.current.has('right')) -
        Number(touches.current.has('left'));
      input.turn +=
        Number(touches.current.has('turn-right')) -
        Number(touches.current.has('turn-left'));
      input.fire ||= firing.current || touches.current.has('fire');
      const events = stepEncounter(
        state,
        world,
        save,
        paused ? EMPTY_INPUT : input,
        seconds,
        mode,
        paused,
      );
      if (events.length)
        latest.current.onEvents(events, structuredClone(state));
      const camera = cameraActor(state);
      renderWorld(
        ctx,
        world.map,
        { ...state.player, ...camera },
        state.entities,
        save.settings,
        state.stage,
        world.atmosphere,
      );
      if (now - hudTime > 100) {
        setView(structuredClone(state));
        setFps(Math.round(1 / Math.max(seconds, 0.001)));
        setPad(Boolean(gamepad));
        hudTime = now;
      }
      if (now - checkpointTime > 4000 && !paused && state.player.health > 0) {
        latest.current.onCheckpoint(structuredClone(state));
        checkpointTime = now;
      }
      animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animation);
      observer.disconnect();
    };
  }, [world]);

  const camera = cameraActor(view);
  const target = nearestInteraction(view, world);
  const enemy = aimedTarget(view, world);
  const body = BODIES[props.save.campaign.bodyId ?? 'mistral'];
  const objective =
    view.entities.find((e) => e.alive && e.objective) ??
    view.entities.find((e) => e.alive && e.kind === 'boss');
  const path = objective
    ? findPath(world.map, camera.x, camera.y, objective.x, objective.y)
    : [];
  const showTouch = touch || props.save.settings.touchControls;
  const hold = (name: string, label: string) => (
    <button
      className="touch-key"
      aria-label={label}
      key={name}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        touches.current.add(name);
      }}
      onPointerUp={() => touches.current.delete(name)}
      onPointerCancel={() => touches.current.delete(name)}
      onLostPointerCapture={() => touches.current.delete(name)}
    >
      {label}
    </button>
  );

  return (
    <section
      className="game-shell"
      aria-label="Mission active"
      data-stage={view.stage}
    >
      <header className="mission-heading">
        <div>
          <span className="eyebrow">
            {STAGE_COPY[view.stage].title} / {body.name}
          </span>
          <h1>
            {view.entities.some((e) => e.id === 'mission-data' && !e.alive)
              ? 'Rejoindre l’extraction Cellule NULL'
              : world.objective}
          </h1>
        </div>
        <nav aria-label="Modes de conscience">
          {(['chair', 'cortex', 'spectre'] as GameMode[]).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={props.mode === mode ? 'default' : 'outline'}
              onClick={() => props.onMode(mode)}
              aria-pressed={props.mode === mode}
            >
              {mode}
            </Button>
          ))}
        </nav>
      </header>
      <div className="world-view">
        <canvas
          ref={canvasRef}
          aria-label="Vue subjective de Néo-Massilia. ZQSD ou WASD pour bouger, flèches pour tourner."
          tabIndex={0}
          onPointerDown={(event) => {
            if (event.pointerType === 'touch') {
              event.currentTarget.setPointerCapture(event.pointerId);
              return;
            }
            if (event.button !== 0 || props.paused) return;
            if (document.pointerLockElement === canvasRef.current)
              firing.current = true;
            else {
              canvasRef.current?.focus();
              void canvasRef.current
                ?.requestPointerLock?.()
                ?.catch(() => undefined);
            }
          }}
          onPointerMove={(event) => {
            if (event.pointerType === 'touch' && event.buttons && !props.paused)
              cameraActor(stateRef.current!).angle += event.movementX * 0.008;
          }}
          onContextMenu={(event) => event.preventDefault()}
        />
        <div
          className={'crosshair ' + (view.hitMarker > 0 ? 'hit' : '')}
          aria-hidden="true"
        >
          +
        </div>
        <div className="compass">
          <span>{compassLabel(camera.angle)}</span>
          {view.stage === 'revocation' && (
            <strong>RÉVOCATION {Math.ceil(view.revocationLeft)} s</strong>
          )}
          {view.stage === 'collector' && (
            <strong>
              ANCRES{' '}
              {
                view.entities.filter((e) => e.kind === 'anchor' && e.alive)
                  .length
              }
              /3 · TRANSFERTS {props.save.campaign.collectorTransfers}
            </strong>
          )}
          {view.droneId && <strong>DRONE / CHARGE −4/s</strong>}
        </div>
        {enemy && (
          <div className="target-readout">
            {enemy.label} · {Math.ceil(enemy.health)} PV
            {enemy.state === 'disabled'
              ? ' · INHIBÉ'
              : enemy.awareness && enemy.awareness >= 1
                ? ' · ENGAGÉ'
                : ''}
          </div>
        )}
        <aside
          className={
            'tactical-map ' +
            (expandedMap || props.mode === 'cortex' ? 'expanded' : '')
          }
        >
          <button
            aria-label="Agrandir la carte"
            onClick={() => setExpandedMap((value) => !value)}
          >
            CARTE / M
          </button>
          <svg
            viewBox="0 0 160 160"
            role="img"
            aria-label="Carte tactique. Orange : objectif, cyan : allié, rouge : ennemi."
          >
            {world.map.flatMap((row, y) =>
              row.map((wall, x) =>
                wall ? (
                  <rect
                    key={x + y * 16}
                    x={x * 10}
                    y={y * 10}
                    width="10"
                    height="10"
                    fill={wall === 3 ? '#245a5e' : '#45515b'}
                  />
                ) : null,
              ),
            )}
            {path.length > 0 && (
              <polyline
                points={[
                  [camera.x * 10, camera.y * 10],
                  ...path.map((p) => [p.x * 10, p.y * 10]),
                ]
                  .map((p) => p.join(','))
                  .join(' ')}
                fill="none"
                stroke="#ef9c55"
                strokeWidth="0.7"
                strokeDasharray="2 2"
              />
            )}
            {view.entities
              .filter((e) => e.alive)
              .map((e) => (
                <circle
                  key={e.id}
                  cx={e.x * 10}
                  cy={e.y * 10}
                  r={e.objective ? 2.5 : 1.6}
                  fill={
                    e.objective ? '#ffae63' : e.hostile ? '#ff6577' : '#6ff9de'
                  }
                />
              ))}
            <circle
              cx={camera.x * 10}
              cy={camera.y * 10}
              r="2.6"
              fill="white"
            />
            <line
              x1={camera.x * 10}
              y1={camera.y * 10}
              x2={camera.x * 10 + Math.cos(camera.angle) * 7}
              y2={camera.y * 10 + Math.sin(camera.angle) * 7}
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
          <output
            aria-label="Coordonnées"
            data-x={camera.x.toFixed(2)}
            data-y={camera.y.toFixed(2)}
            data-angle={camera.angle.toFixed(3)}
          >
            X {camera.x.toFixed(1)} / Y {camera.y.toFixed(1)}
          </output>
        </aside>
        {props.mode === 'cortex' && (
          <aside className="mode-panel">
            <h2>
              Cortex / Temps ×
              {Math.max(0.15, 0.32 - props.save.station.cortex * 0.04).toFixed(
                2,
              )}
            </h2>
            {props.save.companions.nara.recruited ? (
              <>
                <p>
                  Nara Velvet · confiance {props.save.companions.nara.trust}
                </p>
                <div className="order-grid">
                  {ORDERS.map((order) => (
                    <Button
                      key={order.id}
                      title={order.help}
                      aria-pressed={
                        props.save.companions.nara.order === order.id
                      }
                      variant={
                        props.save.companions.nara.order === order.id
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() => {
                        if (order.id === 'focus')
                          stateRef.current!.focusId =
                            aimedTarget(stateRef.current!, world)?.id ?? null;
                        props.onOrder(order.id);
                      }}
                    >
                      {order.label}
                    </Button>
                  ))}
                </div>
                <p>
                  {
                    ORDERS.find(
                      (o) => o.id === props.save.companions.nara.order,
                    )?.help
                  }
                </p>
              </>
            ) : (
              <p>
                Pas encore d’allié recruté. Observez la carte et préparez votre
                itinéraire.
              </p>
            )}
          </aside>
        )}
        {props.mode === 'spectre' && (
          <aside className="mode-panel">
            <h2>Spectre / Réseau local</h2>
            <p>
              Possédez un drone à portée. Déplacement et tir passent dans son
              châssis ; votre corps reste exposé.
            </p>
            {view.entities
              .filter((e) => e.kind === 'drone' && e.alive)
              .map((e) => (
                <Button
                  key={e.id}
                  variant="outline"
                  disabled={
                    Math.hypot(e.x - view.player.x, e.y - view.player.y) >
                      8 + props.save.talents.interface || Boolean(view.droneId)
                  }
                  onClick={() => {
                    if (
                      !possessDrone(stateRef.current!, world, e.id, props.save)
                    )
                      stateRef.current!.notice =
                        'Charge insuffisante pour cette possession.';
                  }}
                >
                  {e.label} ·{' '}
                  {Math.hypot(e.x - view.player.x, e.y - view.player.y).toFixed(
                    0,
                  )}{' '}
                  m
                </Button>
              ))}
            {!view.entities.some((e) => e.kind === 'drone' && e.alive) && (
              <p>
                Aucun drone disponible. Les terminaux se piratent à proximité
                avec E.
              </p>
            )}
            {view.droneId && (
              <Button onClick={() => props.onMode('chair')}>
                Réintégrer le corps
              </Button>
            )}
          </aside>
        )}
        {target && (
          <Button
            className="interaction-prompt"
            onClick={() => action('interact')}
          >
            E ·{' '}
            {target.kind === 'terminal'
              ? 'Pirater'
              : target.kind === 'anchor'
                ? 'Couper'
                : 'Activer'}{' '}
            {target.label}
          </Button>
        )}
        {showTouch && (
          <div className="touch-controls">
            <div className="touch-move">
              {hold('left', '◀')}
              {hold('forward', '▲')}
              {hold('right', '▶')}
              <span />
              {hold('back', '▼')}
              <span />
            </div>
            <div className="touch-look">
              {hold('turn-left', 'Tourner gauche')}
              {hold('turn-right', 'Tourner droite')}
              {hold('fire', 'Tirer')}
            </div>
          </div>
        )}
        {view.notice && props.save.settings.subtitles && (
          <p className="field-notice" role="status">
            {view.notice}
          </p>
        )}
      </div>
      <footer className="combat-hud">
        <div className="vitals">
          <Meter
            label="Intégrité"
            value={view.player.health}
            max={view.player.maxHealth}
          />
          <Meter
            label="Blindage"
            value={view.player.armor}
            max={view.player.maxArmor}
          />
          <Meter
            label="Charge"
            value={view.player.neural}
            max={view.player.maxNeural}
          />
        </div>
        <div className="weapon-hud">
          <strong>{WEAPONS[view.player.weapon.id].name}</strong>
          <output aria-label="Munitions">
            {view.player.weapon.id === 'blade'
              ? 'LAME'
              : view.player.weapon.ammo + ' / ' + view.player.weapon.reserve}
          </output>
          <small>
            {view.player.weapon.reloading > 0
              ? 'RECHARGEMENT…'
              : pad
                ? 'MANETTE CONNECTÉE'
                : fps + ' FPS'}
          </small>
        </div>
        <div className="action-bar">
          {(Object.keys(WEAPONS) as WeaponId[]).map((weapon, i) => (
            <Button
              key={weapon}
              size="sm"
              aria-label={WEAPONS[weapon].name}
              title={WEAPONS[weapon].description}
              variant={view.player.weapon.id === weapon ? 'default' : 'outline'}
              disabled={!props.save.weapons[weapon].unlocked}
              onClick={() => action(weapon)}
            >
              {i + 1} {['Pistolet', 'Mitraillette', 'Fusil', 'Lame'][i]}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => action('reload')}>
            R · Recharger
          </Button>
          <Button size="sm" variant="outline" onClick={() => action('pulse')}>
            F · Impulsion
          </Button>
        </div>
      </footer>
    </section>
  );
}

function Meter({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  return (
    <div className="vital">
      <span>
        {label}{' '}
        <output>
          {Math.ceil(value)}/{max}
        </output>
      </span>
      <meter aria-label={label} min={0} max={max} value={Math.max(0, value)} />
    </div>
  );
}
