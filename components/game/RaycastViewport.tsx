'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BODIES, STAGE_COPY, WEAPONS } from '@/game/content';
import { findPath } from '@/game/engine';
import { gamepadInput, keyboardInput } from '@/game/input';
import { renderWorld, compassLabel } from '@/game/renderer';
import {
  aimedTarget,
  AGENT_NAMES,
  agentOrder,
  canPossessHuman,
  cameraActor,
  clearTacticalQueue,
  createEncounter,
  EMPTY_INPUT,
  engagementPolicy,
  interact,
  hackNetwork,
  isAgentRecruited,
  MAX_TACTICAL_QUEUE,
  missionWorld,
  nearestInteraction,
  navigationObjective,
  possessActor,
  pulse,
  queueTacticalCommand,
  reloadWeapon,
  revocationPhase,
  shoot,
  stepEncounter,
  switchWeapon,
  vaultObstacle,
  type SimulationEvent,
} from '@/game/simulation';
import type {
  EngagementPolicy,
  EncounterState,
  GameMode,
  NaraOrder,
  SaveData,
  TacticalCommand,
  WeaponId,
  WorldEntity,
} from '@/game/types';
import { loadSpriteAssets } from '@/game/sprite-assets';
import type { AgentId } from '@/game/continuity-types';

interface Props {
  save: SaveData;
  mode: GameMode;
  paused: boolean;
  onMode: (mode: GameMode) => void;
  onEvents: (events: SimulationEvent[], encounter: EncounterState) => void;
  onCheckpoint: (encounter: EncounterState) => void;
  onOrder: (order: NaraOrder, agentId?: AgentId) => void;
  onEngagementPolicy: (agentId: AgentId, policy: EngagementPolicy) => void;
  onPause: () => void;
}

const ORDERS: { id: NaraOrder; label: string; help: string }[] = [
  { id: 'follow', label: 'Suivre', help: 'Suit votre position et riposte.' },
  { id: 'hold', label: 'Tenir', help: 'Reste en place et cesse le feu.' },
  {
    id: 'cover',
    label: 'Couvrir',
    help: 'Garde sa position et engage les hostiles visibles.',
  },
  {
    id: 'focus',
    label: 'Cibler',
    help: 'Priorité à la cible dans votre viseur.',
  },
  {
    id: 'interact',
    label: 'Saboter',
    help: 'Coupe les ancres. Nara neutralise aussi les équipements de mission.',
  },
  {
    id: 'sync',
    label: 'Tir sync.',
    help: 'Attend un second agent assigné à la même cible avant la volée.',
  },
  {
    id: 'capture',
    label: 'Capturer',
    help: 'Incapacite puis entrave une cible valide.',
  },
  {
    id: 'retreat',
    label: 'Repli',
    help: 'Retourne au point d’insertion puis tient la position.',
  },
];

const ENGAGEMENT_POLICIES: {
  id: EngagementPolicy;
  label: string;
  help: string;
}[] = [
  {
    id: 'hold-fire',
    label: 'Feu interdit',
    help: 'Aucun tir autonome.',
  },
  {
    id: 'return-fire',
    label: 'Riposte',
    help: 'Tire seulement sur une menace déjà engagée.',
  },
  {
    id: 'non-lethal',
    label: 'Non létal',
    help: 'Les tirs d’agent neutralisent sans exécuter.',
  },
  {
    id: 'weapons-free',
    label: 'Feu libre',
    help: 'Engage toute cible hostile visible.',
  },
];

function tacticalCommandLabel(
  command: TacticalCommand,
  entities: WorldEntity[],
): string {
  const order = ORDERS.find((item) => item.id === command.order);
  const target = command.targetId
    ? entities.find((entity) => entity.id === command.targetId)
    : undefined;
  if (
    command.order === 'move' &&
    command.x !== undefined &&
    command.y !== undefined
  )
    return `Déplacement · X ${command.x.toFixed(1)} / Y ${command.y.toFixed(1)}`;
  if (target) return `${order?.label ?? command.order} · ${target.label}`;
  return order?.label ?? command.order;
}

export function RaycastViewport(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cortexPanelRef = useRef<HTMLElement>(null);
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
  const [tacticalCursor, setTacticalCursor] = useState({
    x: world.start.x,
    y: world.start.y,
  });

  const emit = (events: SimulationEvent[]) => {
    if (events.length)
      latest.current.onEvents(events, structuredClone(stateRef.current!));
  };
  const action = (name: string) => {
    if (latest.current.paused || stateRef.current!.player.health <= 0) return;
    const state = stateRef.current!,
      { save, mode } = latest.current;
    if (name === 'fire') emit(shoot(state, world, save));
    if (name === 'interact') emit(interact(state, world, save));
    if (name === 'pulse') emit(pulse(state, world, save));
    if (name === 'reload') emit(reloadWeapon(state));
    if (name === 'vault' && mode !== 'cortex') vaultObstacle(state, world);
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
      if (latest.current.paused) return;
      const target = event.target instanceof Element ? event.target : null;
      if (
        target?.closest(
          'input,select,textarea,[contenteditable]:not([contenteditable="false"])',
        )
      )
        return;
      if (event.code === 'Escape') {
        latest.current.onPause();
        return;
      }
      if (target?.closest('button,a,[role="button"]')) return;
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
        KeyB: 'vault',
        Digit1: 'pistol',
        Digit2: 'smg',
        Digit3: 'rifle',
        Digit4: 'blade',
      };
      if (command[event.code]) actionRef.current(command[event.code]);
      if (event.code === 'KeyM') setExpandedMap((v) => !v);
      if (
        event.code === 'Tab' &&
        document.pointerLockElement &&
        latest.current.mode !== 'cortex'
      ) {
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
    if (props.mode !== 'cortex') return;
    document.exitPointerLock?.();
    const frame = requestAnimationFrame(() => cortexPanelRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [props.mode]);

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
        world.accent,
        save.continuity.active?.mission === 'velvet' ||
          save.continuity.active?.district === 'station',
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
  const squad = (['nara', 'idris', 'salome'] as AgentId[]).filter(
    (id) =>
      isAgentRecruited(props.save, id) &&
      view.entities.some(
        (e) =>
          e.alive && (e.agentId === id || (id === 'nara' && e.id === 'nara')),
      ),
  );
  const selectedAgent = squad.includes(view.selectedAgent ?? 'nara')
    ? (view.selectedAgent ?? 'nara')
    : (squad[0] ?? 'nara');
  const selectedOrder = agentOrder(props.save, selectedAgent);
  const selectedQueue = view.tacticalQueues?.[selectedAgent] ?? [];
  const selectedPolicy = engagementPolicy(props.save, selectedAgent);
  const selectedPolicyCopy = ENGAGEMENT_POLICIES.find(
    (policy) => policy.id === selectedPolicy,
  );
  const tacticalCursorOpen =
    world.map[Math.floor(tacticalCursor.y)]?.[Math.floor(tacticalCursor.x)] ===
    0;
  const captureTargetValid = Boolean(
    enemy &&
    enemy.kind !== 'boss' &&
    !enemy.allied &&
    enemy.alive &&
    enemy.captureState !== 'restrained',
  );
  const phase = revocationPhase(view);
  const publishTacticalState = () => {
    const snapshot = structuredClone(stateRef.current!);
    latest.current.onCheckpoint(snapshot);
    setView(snapshot);
  };
  const queueOrder = (
    order: NaraOrder,
    options: { x?: number; y?: number; targetId?: string } = {},
  ) => {
    if (props.paused || props.mode !== 'cortex') return false;
    const queued = queueTacticalCommand(
      stateRef.current!,
      props.save,
      selectedAgent,
      order,
      world,
      options,
    );
    if (queued) {
      if (['follow', 'hold', 'cover', 'focus', 'interact'].includes(order))
        latest.current.onOrder(order, selectedAgent);
      stateRef.current!.notice =
        AGENT_NAMES[selectedAgent] +
        ' : ordre ajouté (' +
        stateRef.current!.tacticalQueues![selectedAgent].length +
        '/' +
        MAX_TACTICAL_QUEUE +
        ').';
    } else
      stateRef.current!.notice =
        'Ordre refusé : file pleine, cible invalide ou trajet inaccessible.';
    publishTacticalState();
    return queued;
  };
  const moveAgent = (x: number, y: number) => {
    queueOrder('move', { x, y });
  };
  const objective = navigationObjective(view, props.save);
  const headingToMetro = objective?.interaction === 'extract';
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
            {world.districtName ?? STAGE_COPY[view.stage].title} / {body.name}
          </span>
          <h1>
            {headingToMetro
              ? props.save.continuity.active?.district === 'station'
                ? 'Rejoindre le métro — retour au commandement'
                : props.save.continuity.active?.mission
                  ? 'Objectifs accomplis — rejoindre le métro'
                  : 'Métro — retour à Station Zéro'
              : view.entities.some((e) => e.id === 'mission-data' && !e.alive)
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
            <strong>
              RÉVOCATION {Math.ceil(view.revocationLeft)} s ·{' '}
              {
                [
                  'Licence menacée',
                  'Motricité −10 %',
                  'Motricité −25 % / optiques instables',
                  'Motricité −40 % / arrêt imminent',
                ][phase]
              }
            </strong>
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
          {view.droneId && <strong>INCARNATION DISTANTE / CHARGE −4/s</strong>}
        </div>
        {enemy && (
          <div className="target-readout">
            {enemy.label} · {Math.ceil(enemy.health)} PV
            {enemy.disabledSystem &&
              ' · ' +
                {
                  motor: 'MOTEUR COUPÉ',
                  weapon: 'ARME COUPÉE',
                  optical: 'OPTIQUES COUPÉES',
                }[enemy.disabledSystem]}
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
            viewBox={
              '0 0 ' + world.map[0].length * 10 + ' ' + world.map.length * 10
            }
            role="button"
            tabIndex={props.mode === 'cortex' ? 0 : -1}
            aria-disabled={props.mode !== 'cortex'}
            aria-label={
              props.mode === 'cortex'
                ? 'Carte tactique interactive. Cliquer une case pour ajouter un déplacement à la file de l’agent choisi. Clavier : flèches pour choisir une case, Entrée pour confirmer.'
                : 'Carte tactique du secteur et itinéraire actif.'
            }
            aria-describedby={
              props.mode === 'cortex' ? 'tactical-cursor-status' : undefined
            }
            onClick={(event) => {
              if (props.mode !== 'cortex') return;
              const point = event.currentTarget.createSVGPoint();
              point.x = event.clientX;
              point.y = event.clientY;
              const transform = event.currentTarget.getScreenCTM();
              if (!transform) return;
              const local = point.matrixTransform(transform.inverse());
              const x = Math.floor(local.x / 10) + 0.5,
                y = Math.floor(local.y / 10) + 0.5;
              setTacticalCursor({ x, y });
              moveAgent(x, y);
            }}
            onKeyDown={(event) => {
              if (props.mode !== 'cortex') return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                moveAgent(tacticalCursor.x, tacticalCursor.y);
              }
              const delta: Record<string, [number, number]> = {
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
              };
              if (delta[event.key]) {
                event.preventDefault();
                event.stopPropagation();
                const [dx, dy] = delta[event.key];
                setTacticalCursor((c) => ({
                  x: Math.max(
                    0.5,
                    Math.min(world.map[0].length - 0.5, c.x + dx),
                  ),
                  y: Math.max(0.5, Math.min(world.map.length - 0.5, c.y + dy)),
                }));
              }
            }}
          >
            {world.map.flatMap((row, y) =>
              row.map((wall, x) =>
                wall ? (
                  <rect
                    key={x + y * world.map[0].length}
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
                  r={e.objective || e.id === objective?.id ? 2.5 : 1.6}
                  fill={
                    e.objective || e.id === objective?.id
                      ? '#ffae63'
                      : e.hostile
                        ? '#ff6577'
                        : '#6ff9de'
                  }
                >
                  <title>
                    {e.label}
                    {e.id === objective?.id ? ' — itinéraire actif' : ''}
                  </title>
                </circle>
              ))}
            <circle
              cx={camera.x * 10}
              cy={camera.y * 10}
              r="2.6"
              fill="white"
            />
            {props.mode === 'cortex' && (
              <circle
                cx={tacticalCursor.x * 10}
                cy={tacticalCursor.y * 10}
                r="4"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1"
              />
            )}
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
          {props.mode === 'cortex' && (
            <output
              id="tactical-cursor-status"
              className="tactical-cursor-status"
              aria-live="polite"
            >
              Curseur X {tacticalCursor.x.toFixed(1)} / Y{' '}
              {tacticalCursor.y.toFixed(1)} ·{' '}
              {tacticalCursorOpen ? 'case libre' : 'case bloquée'}
            </output>
          )}
        </aside>
        {props.mode === 'cortex' && (
          <aside
            ref={cortexPanelRef}
            className="mode-panel"
            tabIndex={-1}
            aria-labelledby="cortex-panel-title"
          >
            <h2 id="cortex-panel-title">
              Cortex / Temps ×
              {Math.max(0.15, 0.32 - props.save.station.cortex * 0.04).toFixed(
                2,
              )}
            </h2>
            {squad.length > 0 ? (
              <>
                <div
                  className="cortex-agent-selector order-grid"
                  role="group"
                  aria-label="Agent commandé"
                >
                  {squad.map((id) => (
                    <Button
                      key={id}
                      size="sm"
                      variant={selectedAgent === id ? 'default' : 'outline'}
                      aria-pressed={selectedAgent === id}
                      onClick={() => {
                        stateRef.current!.selectedAgent = id;
                        props.onCheckpoint(structuredClone(stateRef.current!));
                        setView(structuredClone(stateRef.current!));
                      }}
                    >
                      {AGENT_NAMES[id]} ·{' '}
                      {view.tacticalQueues?.[id]?.length ?? 0}/
                      {MAX_TACTICAL_QUEUE}
                    </Button>
                  ))}
                </div>
                <p className="cortex-agent-status">
                  {AGENT_NAMES[selectedAgent]} · confiance{' '}
                  {props.save.continuity.agents[selectedAgent].trust} · fatigue{' '}
                  {props.save.continuity.agents[selectedAgent].fatigue}
                </p>
                <div className="engagement-policy-control">
                  <label htmlFor={'engagement-policy-' + selectedAgent}>
                    Règle d’engagement
                  </label>
                  <select
                    id={'engagement-policy-' + selectedAgent}
                    className="engagement-policy-select"
                    value={selectedPolicy}
                    onChange={(event) => {
                      const policy = event.target.value as EngagementPolicy;
                      latest.current.onEngagementPolicy(selectedAgent, policy);
                      stateRef.current!.notice =
                        AGENT_NAMES[selectedAgent] +
                        ' : ' +
                        ENGAGEMENT_POLICIES.find(
                          (item) => item.id === policy,
                        )!.label.toLowerCase() +
                        '.';
                      setView(structuredClone(stateRef.current!));
                    }}
                  >
                    {ENGAGEMENT_POLICIES.map((policy) => (
                      <option key={policy.id} value={policy.id}>
                        {policy.label}
                      </option>
                    ))}
                  </select>
                  <small>{selectedPolicyCopy?.help}</small>
                </div>
                <div
                  className="cortex-order-controls order-grid"
                  role="group"
                  aria-label="Ajouter un ordre à la file"
                >
                  {ORDERS.map((order) => (
                    <Button
                      key={order.id}
                      title={order.help}
                      aria-label={`${order.label} — ${order.help}`}
                      variant={
                        selectedQueue.some(
                          (command) => command.order === order.id,
                        )
                          ? 'default'
                          : 'outline'
                      }
                      disabled={
                        selectedQueue.length >= MAX_TACTICAL_QUEUE ||
                        (['focus', 'sync'].includes(order.id) && !enemy) ||
                        (order.id === 'capture' && !captureTargetValid)
                      }
                      onClick={() =>
                        queueOrder(order.id, {
                          targetId: ['focus', 'sync', 'capture'].includes(
                            order.id,
                          )
                            ? enemy?.id
                            : undefined,
                        })
                      }
                    >
                      {order.label}
                    </Button>
                  ))}
                </div>
                <p className="cortex-active-order">
                  Posture mémorisée :{' '}
                  {ORDERS.find((order) => order.id === selectedOrder)?.label ??
                    selectedOrder}
                </p>
                <section
                  className="tactical-queues"
                  aria-label="État des files tactiques"
                  aria-live="polite"
                >
                  <h3>Files tactiques · maximum {MAX_TACTICAL_QUEUE}</h3>
                  {squad.map((id) => {
                    const queue = view.tacticalQueues?.[id] ?? [];
                    return (
                      <article
                        className="tactical-queue"
                        data-agent={id}
                        data-count={queue.length}
                        key={'queue-' + id}
                      >
                        <header className="tactical-queue-heading">
                          <strong>{AGENT_NAMES[id]}</strong>
                          <span>
                            {queue.length}/{MAX_TACTICAL_QUEUE}
                          </span>
                          <Button
                            className="tactical-queue-clear"
                            size="sm"
                            variant="outline"
                            disabled={queue.length === 0}
                            onClick={() => {
                              clearTacticalQueue(stateRef.current!, id);
                              stateRef.current!.notice =
                                AGENT_NAMES[id] + ' : file effacée.';
                              publishTacticalState();
                            }}
                          >
                            Effacer
                          </Button>
                        </header>
                        {queue.length ? (
                          <ol className="tactical-queue-items">
                            {queue.map((command, index) => (
                              <li key={command.id}>
                                <span>{index + 1}.</span>{' '}
                                {tacticalCommandLabel(command, view.entities)}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="tactical-queue-empty">File libre</p>
                        )}
                      </article>
                    );
                  })}
                </section>
                <p className="cortex-placement-help">
                  Placement : cliquez la carte, ou flèches puis Entrée. Pour un
                  tir synchronisé, ajoutez le même ordre sur la même cible à
                  deux agents. La capture refuse boss, civils et alliés.
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
              Prenez un drone
              {canPossessHuman(props.save)
                ? ' ou une enveloppe synthétique'
                : ''}
              . Votre corps reste exposé. Les points réseau sont joignables
              derrière les murs.
            </p>
            {view.entities
              .filter(
                (e) =>
                  e.alive &&
                  e.interactable !== false &&
                  e.interaction === 'hack' &&
                  e.objective,
              )
              .map((e) => (
                <Button
                  key={'network-' + e.id}
                  size="sm"
                  variant="outline"
                  disabled={
                    Math.hypot(e.x - camera.x, e.y - camera.y) >
                    5 + props.save.talents.interface
                  }
                  onClick={() =>
                    emit(
                      hackNetwork(
                        stateRef.current!,
                        props.save,
                        e.objectiveId ?? e.id,
                      ),
                    )
                  }
                >
                  Réseau · {e.label}
                </Button>
              ))}
            {view.entities
              .filter(
                (e) =>
                  e.alive &&
                  (e.kind === 'drone' ||
                    (canPossessHuman(props.save) &&
                      ['guard', 'heavy'].includes(e.kind))),
              )
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
                      !possessActor(stateRef.current!, world, e.id, props.save)
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
            {target.interaction === 'talk'
              ? 'Dialoguer'
              : target.interaction === 'service'
                ? 'Installation'
                : target.interaction === 'extract'
                  ? 'Extraire'
                  : target.interaction === 'sabotage'
                    ? 'Saboter'
                    : target.kind === 'terminal'
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
          <label className="text-xs">
            Système visé{' '}
            <select
              aria-label="Système visé"
              value={view.targetSystem ?? 'torso'}
              className="border border-border bg-card p-1"
              onChange={(event) => {
                stateRef.current!.targetSystem = event.target
                  .value as EncounterState['targetSystem'];
                setView(structuredClone(stateRef.current!));
              }}
            >
              <option value="torso">Torse · dégâts</option>
              <option value="motor">Moteur · ralentir</option>
              <option value="weapon">Arme · désarmer</option>
              <option value="optical">Optiques · aveugler</option>
            </select>
          </label>
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
          <Button size="sm" variant="outline" onClick={() => action('vault')}>
            B · Franchir
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
