'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Crosshair, Pause, Radio, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BODIES, WEAPONS } from '@/game/content';
import { applyDamage, canOccupy, createWeaponState, fireWeapon, impulseEffect, lineOfSight, normalizeAngle, resolveEntityDefeat, shortestAngle, startReload, tickWeapon } from '@/game/engine';
import { compassLabel, facingReticleTarget, renderWorld } from '@/game/renderer';
import type { BodyId, CampaignStage, GameMode, GameSettings, NaraOrder, PlayerState, RouteId, WeaponId, WorldEntity, WorldSnapshot } from '@/game/types';
import { createWorld } from '@/game/world';

type GameEvent = 'registry-hacked' | 'root-installed' | 'nara-freed' | 'anchor-destroyed' | 'collector-transfer' | 'collector-defeated';

interface RaycastViewportProps {
  stage: CampaignStage;
  route: RouteId | null;
  bodyId: BodyId;
  unlockedWeapons: WeaponId[];
  selectedWeapon: WeaponId;
  settings: GameSettings;
  mode: GameMode;
  naraOrder: NaraOrder;
  collectorAnchors: number;
  onEvent: (event: GameEvent) => void;
  onModeChange: (mode: GameMode) => void;
  onWeaponChange: (weapon: WeaponId) => void;
  onHackRequest: (id: string, label: string) => void;
  onNaraOrder: (order: NaraOrder) => void;
  onLoot: () => void;
  onDeath: () => void;
  onSound: (name: 'interact' | 'hack' | 'success' | 'damage' | 'impulse' | 'denied', weapon?: WeaponId) => void;
}

const RENDER_WIDTH = 480;
const RENDER_HEIGHT = 270;
const ENEMY_DAMAGE = { guard: 7, heavy: 13, drone: 6, boss: 18 } as const;
const CENTER_ANGLE = 0.13;

function makePlayer(bodyId: BodyId, selectedWeapon: WeaponId): PlayerState {
  const body = BODIES[bodyId];
  return { x: 2.5, y: 14.2, angle: -Math.PI / 2, health: body.integrity, maxHealth: body.integrity, armor: body.armor, maxArmor: body.armor, neural: body.neural, maxNeural: body.neural, weapon: createWeaponState(selectedWeapon), recoil: 0, hurtFlash: 0 };
}

function enemyKinds(entity: WorldEntity): entity is WorldEntity & { kind: 'guard' | 'heavy' | 'drone' | 'boss' } {
  return entity.kind === 'guard' || entity.kind === 'heavy' || entity.kind === 'drone' || entity.kind === 'boss';
}

function nearestInteractable(player: PlayerState, entities: WorldEntity[]): WorldEntity | null {
  return entities
    .filter((entity) => entity.alive && (entity.interactable || entity.kind === 'loot'))
    .map((entity) => ({ entity, distance: Math.hypot(entity.x - player.x, entity.y - player.y), angle: Math.abs(shortestAngle(player.angle, Math.atan2(entity.y - player.y, entity.x - player.x))) }))
    .filter((item) => item.distance < 1.65 && item.angle < 0.9)
    .sort((a, b) => a.distance - b.distance)[0]?.entity ?? null;
}

function objectiveDistance(player: PlayerState, entities: WorldEntity[]): number | null {
  const target = entities.find((entity) => entity.alive && entity.objective);
  return target ? Math.hypot(target.x - player.x, target.y - player.y) : null;
}

export function RaycastViewport(props: RaycastViewportProps) {
  const { stage, route, bodyId, unlockedWeapons, selectedWeapon, settings, mode, naraOrder, collectorAnchors, onEvent, onModeChange, onWeaponChange, onHackRequest, onNaraOrder, onLoot, onDeath, onSound } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef(new Set<string>());
  const rafRef = useRef<number | null>(null);
  const collectorAnchorsRef = useRef(collectorAnchors);
  const selectedWeaponRef = useRef(selectedWeapon);
  collectorAnchorsRef.current = collectorAnchors;
  selectedWeaponRef.current = selectedWeapon;
  const worldRef = useRef(createWorld(stage, route, collectorAnchors));
  const playerRef = useRef<PlayerState>(makePlayer(bodyId, selectedWeapon));
  const lastRef = useRef(0);
  const seenRef = useRef<Record<string, number>>({});
  const fireHeldRef = useRef(false);
  const eventLockRef = useRef(false);
  const [snapshot, setSnapshot] = useState<WorldSnapshot>(() => ({ player: playerRef.current, entities: worldRef.current.entities, alertLevel: 0, objective: worldRef.current.objective, prompt: null, fps: 0 }));
  const body = BODIES[bodyId];

  useEffect(() => {
    const created = createWorld(stage, route, collectorAnchorsRef.current);
    const player = makePlayer(bodyId, selectedWeaponRef.current);
    player.x = created.start.x;
    player.y = created.start.y;
    player.angle = created.start.angle;
    worldRef.current = created;
    playerRef.current = player;
    seenRef.current = {};
    eventLockRef.current = false;
    setSnapshot({ player, entities: created.entities, alertLevel: 0, objective: created.objective, prompt: null, fps: 0 });
  }, [stage, route, bodyId]);

  useEffect(() => {
    if (playerRef.current.weapon.id !== selectedWeapon) playerRef.current = { ...playerRef.current, weapon: createWeaponState(selectedWeapon) };
  }, [selectedWeapon]);

  const switchWeapon = useCallback((weapon: WeaponId) => {
    if (!unlockedWeapons.includes(weapon)) {
      onSound('denied');
      return;
    }
    onWeaponChange(weapon);
  }, [onSound, onWeaponChange, unlockedWeapons]);

  const interact = useCallback(() => {
    const player = playerRef.current;
    const target = nearestInteractable(player, worldRef.current.entities);
    if (!target) {
      onSound('denied');
      return;
    }
    if (target.kind === 'loot') {
      target.alive = false;
      onLoot();
      onSound('success');
      return;
    }
    if (target.kind === 'terminal') {
      onSound('hack');
      onModeChange('spectre');
      onHackRequest(target.id, target.label);
      return;
    }
    if (target.kind === 'anchor') {
      target.health = 0;
      target.alive = false;
      onEvent('anchor-destroyed');
      onSound('success');
    }
  }, [onEvent, onHackRequest, onModeChange, onLoot, onSound]);

  const resolveDefeat = useCallback((target: WorldEntity) => {
    const outcome = resolveEntityDefeat(target, worldRef.current.entities);
    if (outcome) onEvent(outcome);
  }, [onEvent]);

  const fire = useCallback(() => {
    const player = playerRef.current;
    const fired = fireWeapon(player.weapon);
    player.weapon = fired.state;
    if (!fired.fired) {
      onSound('denied');
      return;
    }
    const spec = WEAPONS[player.weapon.id];
    player.recoil = Math.min(0.22, player.recoil + spec.recoil);
    onSound('interact', player.weapon.id);
    const target = facingReticleTarget(player, worldRef.current.entities, settings.aimAssist ? CENTER_ANGLE * 1.6 : CENTER_ANGLE, spec.range);
    if (!target || !lineOfSight(worldRef.current.map, player.x, player.y, target.x, target.y)) return;
    const distance = Math.hypot(target.x - player.x, target.y - player.y);
    const falloff = player.weapon.id === 'blade' ? (distance < spec.range ? 1.15 : 0) : Math.max(0.48, 1 - distance / (spec.range * 1.65));
    const damage = applyDamage(target.health, target.armor, fired.damage * falloff, spec.armorPiercing);
    target.health = damage.health;
    target.armor = damage.armor;
    resolveDefeat(target);
  }, [onSound, resolveDefeat, settings.aimAssist]);

  const impulse = useCallback(() => {
    const player = playerRef.current;
    if (player.neural < 28) {
      onSound('denied');
      return;
    }
    player.neural -= 28;
    onSound('impulse');
    for (const entity of worldRef.current.entities) {
      if (!entity.alive || !enemyKinds(entity)) continue;
      const distance = Math.hypot(entity.x - player.x, entity.y - player.y);
      if (distance > 4.1 || !lineOfSight(worldRef.current.map, player.x, player.y, entity.x, entity.y)) continue;
      const effect = impulseEffect(entity.kind);
      entity.armor = Math.max(0, entity.armor - effect.armorDamage);
      entity.health = Math.max(0, entity.health - effect.damage);
      if (entity.health <= 0) resolveDefeat(entity);
      else entity.state = 'disabled';
    }
  }, [onSound, resolveDefeat]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      keysRef.current.add(event.code);
      keysRef.current.add(event.key.toLowerCase());
      if (event.code === 'Tab') {
        event.preventDefault();
        onModeChange(mode === 'cortex' ? 'chair' : 'cortex');
      }
      if (event.code === 'Digit1') switchWeapon('pistol');
      if (event.code === 'Digit2') switchWeapon('smg');
      if (event.code === 'Digit3') switchWeapon('rifle');
      if (event.code === 'Digit4') switchWeapon('blade');
      if (event.code === 'KeyE') interact();
      if (event.code === 'KeyR') {
        playerRef.current.weapon = startReload(playerRef.current.weapon);
        onSound('interact', playerRef.current.weapon.id);
      }
      if (event.code === 'KeyF') impulse();
      if (event.code === 'Space' && !event.repeat) fire();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.code);
      keysRef.current.delete(event.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [fire, impulse, interact, mode, onModeChange, onSound, switchWeapon]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onPointerMove = (event: PointerEvent) => {
      if (document.pointerLockElement === canvas) playerRef.current.angle = normalizeAngle(playerRef.current.angle + event.movementX * settings.sensitivity * 0.0035);
    };
    document.addEventListener('pointermove', onPointerMove);
    return () => document.removeEventListener('pointermove', onPointerMove);
  }, [settings.sensitivity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = RENDER_WIDTH;
    canvas.height = RENDER_HEIGHT;
    const tick = (now: number) => {
      const deltaRaw = lastRef.current ? Math.min(0.05, (now - lastRef.current) / 1000) : 0.016;
      lastRef.current = now;
      const delta = mode === 'cortex' ? deltaRaw * 0.32 : deltaRaw;
      const player = playerRef.current;
      const activeWorld = worldRef.current;
      const keys = keysRef.current;
      const layoutZqsd = settings.controlLayout === 'zqsd' || (settings.controlLayout === 'auto' && navigator.language.toLowerCase().startsWith('fr'));
      const forwardKey = layoutZqsd ? 'z' : 'w';
      const leftKey = layoutZqsd ? 'q' : 'a';
      if (mode !== 'cortex') {
        const rotSpeed = deltaRaw * (1.65 + settings.sensitivity * 2.2);
        if (keys.has('ArrowLeft')) player.angle = normalizeAngle(player.angle - rotSpeed);
        if (keys.has('ArrowRight')) player.angle = normalizeAngle(player.angle + rotSpeed);
        const speed = body.mobility * ((keys.has('ShiftLeft') || keys.has('ShiftRight')) ? 3.05 : 2.05) * deltaRaw;
        let dx = 0;
        let dy = 0;
        if (keys.has('ArrowUp') || keys.has('KeyW') || keys.has(forwardKey)) { dx += Math.cos(player.angle) * speed; dy += Math.sin(player.angle) * speed; }
        if (keys.has('ArrowDown') || keys.has('KeyS') || keys.has('s')) { dx -= Math.cos(player.angle) * speed * 0.62; dy -= Math.sin(player.angle) * speed * 0.62; }
        if (keys.has('KeyA') || keys.has(leftKey)) { dx += Math.cos(player.angle - Math.PI / 2) * speed * 0.72; dy += Math.sin(player.angle - Math.PI / 2) * speed * 0.72; }
        if (keys.has('KeyD') || keys.has('d')) { dx += Math.cos(player.angle + Math.PI / 2) * speed * 0.72; dy += Math.sin(player.angle + Math.PI / 2) * speed * 0.72; }
        if (canOccupy(activeWorld.map, player.x + dx, player.y, 0.22)) player.x += dx;
        if (canOccupy(activeWorld.map, player.x, player.y + dy, 0.22)) player.y += dy;
      }
      player.weapon = tickWeapon(player.weapon, deltaRaw);
      player.recoil = Math.max(0, player.recoil - deltaRaw * 0.7);
      player.hurtFlash = Math.max(0, player.hurtFlash - deltaRaw * 0.8);
      player.neural = Math.min(player.maxNeural, player.neural + deltaRaw * 2.3);
      if (fireHeldRef.current && player.weapon.id === 'smg') fire();
      let alertLevel = 0;
      for (const entity of activeWorld.entities) {
        if (!entity.alive) continue;
        if (entity.kind === 'nara') {
          const dist = Math.hypot(player.x - entity.x, player.y - entity.y);
          if (naraOrder === 'follow' && dist > 1.35 && canOccupy(activeWorld.map, entity.x + (player.x - entity.x) * delta, entity.y + (player.y - entity.y) * delta, 0.22)) {
            entity.x += (player.x - entity.x) * delta;
            entity.y += (player.y - entity.y) * delta;
          }
          if (naraOrder === 'cover') {
            const target = activeWorld.entities.find((item) => item.alive && item.hostile && Math.hypot(item.x - entity.x, item.y - entity.y) < 6);
            if (target) {
              const damage = applyDamage(target.health, target.armor, deltaRaw * 18, 0.15);
              target.health = damage.health;
              target.armor = damage.armor;
              if (target.health <= 0) resolveDefeat(target);
            }
          }
          continue;
        }
        if (!enemyKinds(entity) || !entity.hostile || entity.state === 'disabled') continue;
        const dx = player.x - entity.x;
        const dy = player.y - entity.y;
        const distance = Math.hypot(dx, dy);
        const sees = distance < (entity.kind === 'drone' ? 8 : 6.5) && lineOfSight(activeWorld.map, entity.x, entity.y, player.x, player.y);
        if (sees) seenRef.current[entity.id] = now / 1000;
        const active = sees || now / 1000 - (seenRef.current[entity.id] ?? -999) < 5 || entity.state === 'combat';
        if (!active) continue;
        alertLevel += entity.kind === 'heavy' || entity.kind === 'boss' ? 2 : 1;
        entity.angle = Math.atan2(dy, dx);
        const move = (entity.kind === 'heavy' ? 0.72 : entity.kind === 'boss' ? 0.95 : 1.05) * delta;
        if (distance > (entity.kind === 'drone' ? 2.2 : 1.3)) {
          const nx = entity.x + Math.cos(entity.angle) * move;
          const ny = entity.y + Math.sin(entity.angle) * move;
          if (canOccupy(activeWorld.map, nx, entity.y, 0.2)) entity.x = nx;
          if (canOccupy(activeWorld.map, entity.x, ny, 0.2)) entity.y = ny;
        } else {
          const hit = applyDamage(player.health, player.armor, ENEMY_DAMAGE[entity.kind] * deltaRaw, entity.kind === 'boss' ? 0.25 : 0.05);
          player.health = hit.health;
          player.armor = hit.armor;
          player.hurtFlash = Math.min(0.55, player.hurtFlash + deltaRaw * 1.8);
          if (player.health <= 0 && !eventLockRef.current) {
            eventLockRef.current = true;
            onDeath();
          }
        }
      }
      renderWorld(ctx, activeWorld.map, player, activeWorld.entities, settings, stage, activeWorld.atmosphere);
      const promptTarget = nearestInteractable(player, activeWorld.entities);
      const prompt = promptTarget ? `${promptTarget.kind === 'terminal' ? 'Pirater' : promptTarget.kind === 'loot' ? 'Ouvrir' : 'Activer'} · ${promptTarget.label}` : null;
      setSnapshot({ player: { ...player, weapon: { ...player.weapon } }, entities: activeWorld.entities.map((entity) => ({ ...entity })), alertLevel, objective: activeWorld.objective, prompt, fps: Math.round(1 / Math.max(0.001, deltaRaw)) });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [body.mobility, fire, mode, naraOrder, onDeath, resolveDefeat, settings, stage]);

  const healthPercent = Math.max(0, (snapshot.player.health / snapshot.player.maxHealth) * 100);
  const armorPercent = Math.max(0, (snapshot.player.armor / snapshot.player.maxArmor) * 100);
  const neuralPercent = Math.max(0, (snapshot.player.neural / snapshot.player.maxNeural) * 100);
  const distance = objectiveDistance(snapshot.player, snapshot.entities);
  const enemiesAlive = snapshot.entities.filter((entity) => entity.alive && entity.hostile).length;

  return (
    <section className="relative grid min-h-dvh grid-rows-[auto_minmax(0,1fr)_auto] bg-[#05070a] text-foreground">
      <header className="z-10 grid gap-2 border-b border-border bg-background/85 px-3 py-2 backdrop-blur md:grid-cols-[1fr_auto_1fr] md:items-center md:px-5">
        <div>
          <p className="font-mono text-[10px] uppercase text-muted-foreground">{stage} · {body.name} · {compassLabel(snapshot.player.angle)}</p>
          <p className="text-sm font-black uppercase leading-tight">{snapshot.objective}</p>
        </div>
        <div className="flex items-center justify-center gap-1">
          {(['chair', 'cortex', 'spectre'] as GameMode[]).map((item) => <Button key={item} size="sm" variant={mode === item ? 'default' : 'outline'} className="h-8 rounded-none px-3 text-[10px] uppercase" onClick={() => onModeChange(item)}>{item}</Button>)}
        </div>
        <div className="flex items-center justify-end gap-2 font-mono text-[10px] uppercase text-muted-foreground"><span>FPS {snapshot.fps}</span><span>Alerte {alertLevelLabel(snapshot.alertLevel)}</span><span>Objectif {distance === null ? '--' : `${distance.toFixed(1)}m`}</span></div>
      </header>
      <div className="relative min-h-0 overflow-hidden">
        <canvas ref={canvasRef} className="h-full w-full touch-none bg-black [image-rendering:pixelated]" aria-label="Vue subjective raycastée de Néo-Massilia" onClick={() => canvasRef.current?.requestPointerLock?.()} onPointerDown={(event) => { fireHeldRef.current = true; if (event.button === 0) fire(); }} onPointerUp={() => { fireHeldRef.current = false; }} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-5 w-5 border border-primary/70" /></div>
        {mode === 'cortex' && <aside className="absolute right-3 top-3 w-[min(360px,calc(100vw-1.5rem))] border border-accent/40 bg-background/92 p-3 backdrop-blur"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Mode Cortex · ralentissement tactique</p><div className="mt-3 grid grid-cols-5 gap-1">{(['follow', 'hold', 'cover', 'focus', 'interact'] as NaraOrder[]).map((order) => <Button key={order} size="sm" variant={naraOrder === order ? 'default' : 'outline'} className="h-8 rounded-none px-1 text-[9px] uppercase" onClick={() => onNaraOrder(order)}>{order}</Button>)}</div><div className="mt-3 grid grid-cols-8 gap-px border border-border bg-border p-px">{Array.from({ length: 64 }, (_, index) => { const x = index % 8; const y = Math.floor(index / 8); const isPlayer = Math.round(snapshot.player.x / 2) === x && Math.round(snapshot.player.y / 2) === y; const hasEnemy = snapshot.entities.some((entity) => entity.alive && entity.hostile && Math.round(entity.x / 2) === x && Math.round(entity.y / 2) === y); const hasObjective = snapshot.entities.some((entity) => entity.alive && entity.objective && Math.round(entity.x / 2) === x && Math.round(entity.y / 2) === y); return <span key={index} className={'aspect-square ' + (isPlayer ? 'bg-primary' : hasObjective ? 'bg-accent' : hasEnemy ? 'bg-destructive' : 'bg-card')} />; })}</div></aside>}
        <div className="absolute bottom-3 left-3 right-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-xl border border-border bg-background/88 p-3 backdrop-blur"><div className="grid gap-2 sm:grid-cols-3"><Meter icon={<Crosshair size={14} />} label="Chair" value={healthPercent} tone="primary" /><Meter icon={<Shield size={14} />} label="Blindage" value={armorPercent} tone="accent" /><Meter icon={<Zap size={14} />} label="Charge" value={neuralPercent} tone="neural" /></div><div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase"><span className="border border-border bg-card px-2 py-1">{WEAPONS[snapshot.player.weapon.id].name}</span><span className="border border-border bg-card px-2 py-1">{snapshot.player.weapon.id === 'blade' ? 'lame' : `${snapshot.player.weapon.ammo}/${snapshot.player.weapon.reserve}`}</span><span className="border border-border bg-card px-2 py-1">Hostiles {enemiesAlive}</span>{snapshot.prompt && <button type="button" className="pointer-events-auto border border-primary bg-primary px-2 py-1 text-primary-foreground" onClick={interact}>{snapshot.prompt}</button>}</div></div>
          <div className="pointer-events-auto grid grid-cols-4 gap-1 border border-border bg-background/88 p-2 backdrop-blur">{(['pistol', 'smg', 'rifle', 'blade'] as WeaponId[]).map((weapon) => <Button key={weapon} variant={snapshot.player.weapon.id === weapon ? 'default' : 'outline'} size="sm" disabled={!unlockedWeapons.includes(weapon)} className="h-9 rounded-none px-2 text-[10px] uppercase" onClick={() => switchWeapon(weapon)}>{weapon}</Button>)}<Button variant="outline" size="sm" className="col-span-2 h-9 rounded-none text-[10px] uppercase" onClick={interact}><Radio className="mr-1 size-3" /> Action</Button><Button variant="outline" size="sm" className="h-9 rounded-none text-[10px] uppercase" onClick={impulse}>Impulsion</Button><Button variant="outline" size="sm" className="h-9 rounded-none text-[10px] uppercase" onClick={() => { playerRef.current.weapon = startReload(playerRef.current.weapon); }}><Pause className="size-3" /></Button></div>
        </div>
      </div>
      <footer className="z-10 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/92 px-3 py-2 font-mono text-[10px] uppercase text-muted-foreground md:px-5"><span>ZQSD/WASD · souris · clavier</span><span>Adultes · contenu public non explicite</span></footer>
    </section>
  );
}

function Meter({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'primary' | 'accent' | 'neural' }) {
  const color = tone === 'primary' ? 'bg-primary' : tone === 'accent' ? 'bg-accent' : 'bg-[#d85d94]';
  return <div><div className="mb-1 flex items-center gap-1 font-mono text-[10px] uppercase text-muted-foreground">{icon}{label}</div><div className="h-2 border border-border bg-card"><span className={'block h-full ' + color} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>;
}

function alertLevelLabel(level: number): string {
  if (level <= 0) return 'vert';
  if (level < 3) return 'orange';
  return 'rouge';
}
