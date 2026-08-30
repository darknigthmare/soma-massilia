import { angleToDirection, castRay, normalizeAngle, shortestAngle } from './engine';
import type { CampaignStage, GameSettings, PlayerState, WorldEntity } from './types';

const FOV = Math.PI / 3;

const PALETTES: Record<string, { sky: string; horizon: string; floor: string; fog: string; accent: string }> = {
  docks: { sky: '#090d15', horizon: '#1b2831', floor: '#111419', fog: '#cc653d', accent: '#e36e42' },
  revocation: { sky: '#12090e', horizon: '#351219', floor: '#120d12', fog: '#e33f4f', accent: '#ff4059' },
  prison: { sky: '#071319', horizon: '#123039', floor: '#0b1517', fog: '#3ad4c3', accent: '#4de9d1' },
  collector: { sky: '#100b13', horizon: '#2b172e', floor: '#100d14', fog: '#d34f8b', accent: '#ff6a9f' },
};

function wallColor(wall: number, side: 0 | 1, distance: number, atmosphere: string): string {
  const base =
    wall === 2 ? [139, 70, 48] :
    wall === 3 ? [35, 119, 122] :
    atmosphere === 'revocation' ? [116, 44, 52] :
    [58, 70, 78];
  const shade = Math.max(0.16, Math.min(1, 1.35 / (1 + distance * 0.16))) * (side ? 0.72 : 1);
  return 'rgb(' + base.map((channel) => Math.round(channel * shade)).join(' ') + ')';
}

function drawWallTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  height: number,
  textureX: number,
  wall: number,
  distance: number,
): void {
  if (height < 8) return;
  ctx.globalAlpha = Math.max(0.08, 0.34 - distance * 0.018);
  ctx.fillStyle = wall === 3 ? '#4de9d1' : wall === 2 ? '#f0a06d' : '#d3d7d2';
  if ((Math.floor(textureX * 12) + Math.floor(top / 18)) % 4 === 0) {
    ctx.fillRect(x, top, 1, height);
  }
  const seam = Math.floor(top + height * 0.52);
  ctx.fillRect(x, seam, 1, 1);
  ctx.globalAlpha = 1;
}

function drawSkyline(ctx: CanvasRenderingContext2D, width: number, horizon: number, accent: string): void {
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#06090c';
  for (let index = 0; index < 28; index += 1) {
    const buildingWidth = 9 + ((index * 13) % 24);
    const height = 8 + ((index * 29) % 46);
    const x = index * (width / 27) - 8;
    ctx.fillRect(x, horizon - height, buildingWidth, height);
    if (index % 4 === 0) ctx.fillRect(x + buildingWidth * 0.4, horizon - height - 10, 2, 10);
  }
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.18;
  for (let index = 0; index < 18; index += 1) {
    ctx.fillRect((index * 43) % width, horizon - 6 - ((index * 17) % 34), 1, 1);
  }
  ctx.restore();
}

function drawHumanSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  size: number,
  entity: WorldEntity,
  direction: number,
): void {
  const hostile = entity.hostile;
  const boss = entity.kind === 'boss';
  const nara = entity.kind === 'nara';
  const heavy = entity.kind === 'heavy';
  const bodyWidth = size * (heavy || boss ? 0.44 : 0.34);
  const bodyHeight = size * 0.56;
  const center = x;
  const top = baseY - size;
  const offset = (direction === 2 || direction === 3 ? 1 : direction === 6 || direction === 7 ? -1 : 0) * size * 0.04;

  ctx.save();
  ctx.translate(offset, 0);
  ctx.fillStyle = 'rgb(0 0 0 / 35%)';
  ctx.beginPath();
  ctx.ellipse(center, baseY, bodyWidth * 0.8, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = nara ? '#8b315f' : boss ? '#55213f' : heavy ? '#373d45' : '#232b31';
  ctx.fillRect(center - bodyWidth / 2, top + size * 0.32, bodyWidth, bodyHeight);
  ctx.fillStyle = nara ? '#d74f8b' : hostile ? '#cf5f3e' : '#4de9d1';
  ctx.fillRect(center - bodyWidth * 0.42, top + size * 0.38, bodyWidth * 0.84, size * 0.035);
  ctx.fillRect(center + (direction % 2 ? -1 : 1) * bodyWidth * 0.22, top + size * 0.46, size * 0.025, size * 0.22);

  ctx.fillStyle = nara ? '#b97b65' : '#68717a';
  ctx.beginPath();
  ctx.arc(center, top + size * 0.21, size * (heavy || boss ? 0.14 : 0.12), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hostile ? '#ff774d' : '#4de9d1';
  const eyeOffset = direction === 0 ? 0 : direction < 4 ? size * 0.03 : -size * 0.03;
  ctx.fillRect(center + eyeOffset - size * 0.035, top + size * 0.2, size * 0.07, Math.max(1, size * 0.015));

  ctx.fillStyle = '#15191d';
  ctx.fillRect(center - bodyWidth * 0.45, top + size * 0.86, bodyWidth * 0.35, size * 0.14);
  ctx.fillRect(center + bodyWidth * 0.1, top + size * 0.86, bodyWidth * 0.35, size * 0.14);
  if (boss) {
    ctx.strokeStyle = '#ff6a9f';
    ctx.lineWidth = Math.max(1, size * 0.018);
    ctx.beginPath();
    ctx.arc(center, top + size * 0.5, bodyWidth * 0.78, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMachineSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  size: number,
  entity: WorldEntity,
): void {
  const top = baseY - size;
  ctx.save();
  if (entity.kind === 'drone') {
    ctx.fillStyle = 'rgb(0 0 0 / 32%)';
    ctx.beginPath();
    ctx.ellipse(x, baseY - size * 0.3, size * 0.25, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#27343c';
    ctx.beginPath();
    ctx.moveTo(x, top + size * 0.34);
    ctx.lineTo(x + size * 0.27, top + size * 0.5);
    ctx.lineTo(x, top + size * 0.66);
    ctx.lineTo(x - size * 0.27, top + size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = entity.state === 'disabled' ? '#5a6a6a' : '#ff613f';
    ctx.fillRect(x - size * 0.05, top + size * 0.47, size * 0.1, size * 0.045);
    ctx.strokeStyle = '#4de9d1';
    ctx.lineWidth = Math.max(1, size * 0.012);
    ctx.beginPath();
    ctx.arc(x, top + size * 0.5, size * 0.32, 0, Math.PI * 2);
    ctx.stroke();
  } else if (entity.kind === 'terminal') {
    ctx.fillStyle = '#121a1f';
    ctx.fillRect(x - size * 0.24, top + size * 0.3, size * 0.48, size * 0.7);
    ctx.strokeStyle = '#4de9d1';
    ctx.lineWidth = Math.max(1, size * 0.012);
    ctx.strokeRect(x - size * 0.19, top + size * 0.38, size * 0.38, size * 0.25);
    ctx.fillStyle = '#4de9d1';
    ctx.globalAlpha = 0.45;
    ctx.fillRect(x - size * 0.15, top + size * 0.42, size * 0.3, size * 0.03);
    ctx.fillRect(x - size * 0.15, top + size * 0.49, size * 0.22, size * 0.02);
  } else if (entity.kind === 'anchor') {
    ctx.strokeStyle = '#ff6a9f';
    ctx.lineWidth = Math.max(1, size * 0.025);
    ctx.beginPath();
    ctx.arc(x, top + size * 0.48, size * 0.23, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, top + size * 0.48, size * 0.12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ff6a9f';
    ctx.fillRect(x - size * 0.025, top + size * 0.16, size * 0.05, size * 0.7);
  } else if (entity.kind === 'loot') {
    ctx.fillStyle = '#45341d';
    ctx.fillRect(x - size * 0.24, baseY - size * 0.43, size * 0.48, size * 0.43);
    ctx.strokeStyle = '#e3a64a';
    ctx.strokeRect(x - size * 0.24, baseY - size * 0.43, size * 0.48, size * 0.43);
    ctx.fillStyle = '#e3a64a';
    ctx.fillRect(x - size * 0.04, baseY - size * 0.3, size * 0.08, size * 0.11);
  }
  ctx.restore();
}

function drawEntity(
  ctx: CanvasRenderingContext2D,
  entity: WorldEntity,
  screenX: number,
  baseY: number,
  size: number,
  direction: number,
): void {
  if (entity.kind === 'guard' || entity.kind === 'heavy' || entity.kind === 'boss' || entity.kind === 'nara') {
    drawHumanSprite(ctx, screenX, baseY, size, entity, direction);
  } else {
    drawMachineSprite(ctx, screenX, baseY, size, entity);
  }
  if (entity.health < entity.maxHealth && entity.alive) {
    const width = size * 0.55;
    ctx.fillStyle = '#17191d';
    ctx.fillRect(screenX - width / 2, baseY - size - 6, width, 3);
    ctx.fillStyle = entity.hostile ? '#e05252' : '#4de9d1';
    ctx.fillRect(screenX - width / 2, baseY - size - 6, width * (entity.health / entity.maxHealth), 3);
  }
  if (entity.objective) {
    ctx.strokeStyle = '#f27a45';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenX - 5, baseY - size - 10);
    ctx.lineTo(screenX, baseY - size - 15);
    ctx.lineTo(screenX + 5, baseY - size - 10);
    ctx.stroke();
  }
}

function drawWeapon(ctx: CanvasRenderingContext2D, width: number, height: number, player: PlayerState): void {
  const spec = player.weapon.id;
  const recoil = player.recoil * height;
  ctx.save();
  ctx.translate(width / 2, height + recoil);
  ctx.fillStyle = '#090b0e';
  ctx.strokeStyle = '#8f9aa0';
  ctx.lineWidth = 1;
  if (spec === 'blade') {
    ctx.beginPath();
    ctx.moveTo(-12, -10);
    ctx.lineTo(58, -100);
    ctx.lineTo(25, -18);
    ctx.closePath();
    ctx.fillStyle = '#aebec0';
    ctx.fill();
    ctx.stroke();
  } else {
    const wide = spec === 'rifle' ? 78 : spec === 'smg' ? 60 : 42;
    const tall = spec === 'pistol' ? 48 : 38;
    ctx.fillRect(-wide / 2, -tall, wide, tall);
    ctx.strokeRect(-wide / 2, -tall, wide, tall);
    ctx.fillStyle = '#d05f3c';
    ctx.fillRect(-wide * 0.18, -tall * 0.82, wide * 0.36, 3);
    ctx.fillStyle = '#1d2428';
    ctx.fillRect(-8, -tall * 0.1, 16, 24);
  }
  ctx.restore();
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  map: number[][],
  player: PlayerState,
  entities: WorldEntity[],
  settings: GameSettings,
  stage: CampaignStage,
  atmosphere: string,
): number[] {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const palette = PALETTES[atmosphere] ?? PALETTES.docks;
  const horizon = Math.floor(height * 0.48);
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, palette.sky);
  sky.addColorStop(1, palette.horizon);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon);
  const floor = ctx.createLinearGradient(0, horizon, 0, height);
  floor.addColorStop(0, palette.floor);
  floor.addColorStop(1, '#050609');
  ctx.fillStyle = floor;
  ctx.fillRect(0, horizon, width, height - horizon);
  drawSkyline(ctx, width, horizon, palette.accent);

  const depthBuffer = Array.from<number>({ length: width });
  for (let x = 0; x < width; x += 1) {
    const camera = (x / width - 0.5) * FOV;
    const hit = castRay(map, player.x, player.y, player.angle + camera);
    const corrected = hit.distance * Math.cos(camera);
    depthBuffer[x] = corrected;
    const wallHeight = Math.min(height * 1.8, height / Math.max(0.05, corrected));
    const top = Math.floor(horizon - wallHeight / 2);
    ctx.fillStyle = wallColor(hit.wall, hit.side, corrected, atmosphere);
    ctx.fillRect(x, top, 1, Math.ceil(wallHeight));
    drawWallTexture(ctx, x, top, wallHeight, hit.textureX, hit.wall, corrected);
    if (x % 2 === 0 && corrected < 7) {
      ctx.fillStyle = 'rgb(255 255 255 / 2%)';
      ctx.fillRect(x, horizon + wallHeight / 2, 1, height - horizon);
    }
  }

  const visible = entities
    .filter((entity) => entity.alive)
    .map((entity) => {
      const dx = entity.x - player.x;
      const dy = entity.y - player.y;
      return { entity, distance: Math.hypot(dx, dy), angle: shortestAngle(player.angle, Math.atan2(dy, dx)) };
    })
    .filter((item) => Math.abs(item.angle) < FOV * 0.72 && item.distance > 0.25)
    .sort((a, b) => b.distance - a.distance);

  for (const item of visible) {
    const screenX = width * (0.5 + item.angle / FOV);
    const size = Math.min(height * 1.25, height / item.distance);
    const column = Math.max(0, Math.min(width - 1, Math.floor(screenX)));
    if (item.distance > depthBuffer[column] + 0.25) continue;
    const baseY = horizon + size * 0.52;
    drawEntity(
      ctx,
      item.entity,
      screenX,
      baseY,
      size,
      angleToDirection(item.entity.angle, Math.atan2(player.y - item.entity.y, player.x - item.entity.x)),
    );
  }

  if (!settings.reduceMotion) drawWeapon(ctx, width, height, player);
  if (stage === 'revocation') {
    ctx.fillStyle = 'rgb(219 42 71 / 8%)';
    ctx.fillRect(0, 0, width, height);
    if (!settings.reduceFlashes) {
      ctx.globalAlpha = 0.08 + Math.sin(performance.now() / 90) * 0.04;
      ctx.fillStyle = '#e22f47';
      for (let index = 0; index < 7; index += 1) ctx.fillRect(0, (index * 47) % height, width, 2);
      ctx.globalAlpha = 1;
    }
  }
  if (player.hurtFlash > 0 && !settings.reduceFlashes) {
    ctx.fillStyle = 'rgb(220 38 54 / ' + Math.min(0.3, player.hurtFlash) + ')';
    ctx.fillRect(0, 0, width, height);
  }
  if (settings.highContrast) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgb(255 255 255 / 6%)';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
  }
  return depthBuffer;
}

export function facingReticleTarget(
  player: PlayerState,
  entities: WorldEntity[],
  maxAngle: number,
  maxDistance: number,
): WorldEntity | null {
  return (
    entities
      .filter((entity) => entity.alive && (entity.hostile || entity.kind === 'anchor'))
      .map((entity) => ({
        entity,
        distance: Math.hypot(entity.x - player.x, entity.y - player.y),
        angle: Math.abs(shortestAngle(player.angle, Math.atan2(entity.y - player.y, entity.x - player.x))),
      }))
      .filter((item) => item.distance <= maxDistance && item.angle <= maxAngle)
      .sort((a, b) => a.angle - b.angle || a.distance - b.distance)[0]?.entity ?? null
  );
}

export function compassLabel(angle: number): string {
  return ['E', 'SE', 'S', 'SO', 'O', 'NO', 'N', 'NE'][Math.round(normalizeAngle(angle) / (Math.PI / 4)) % 8];
}
