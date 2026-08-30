export type BodyId = 'mistral' | 'mole' | 'sibylle';
export type WeaponId = 'pistol' | 'smg' | 'rifle' | 'blade';
export type RouteId = 'combat' | 'identity' | 'sabotage';
export type CampaignStage =
  | 'contract'
  | 'docks'
  | 'revocation'
  | 'nara'
  | 'collector'
  | 'station'
  | 'complete';
export type GameMode = 'chair' | 'cortex' | 'spectre' | 'syndicate';
export type NaraOrder = 'follow' | 'hold' | 'cover' | 'focus' | 'interact';
export type EnemyKind = 'guard' | 'heavy' | 'drone' | 'boss';
export type EnemyState = 'patrol' | 'suspicion' | 'investigate' | 'alert' | 'combat' | 'search' | 'disabled';

export interface BodySpec {
  id: BodyId;
  name: string;
  designation: string;
  tagline: string;
  integrity: number;
  armor: number;
  neural: number;
  mobility: number;
  specialty: string;
  implants: string[];
}

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  damage: number;
  magazine: number;
  reserve: number;
  cooldown: number;
  recoil: number;
  armorPiercing: number;
  range: number;
  description: string;
}

export interface WeaponState {
  id: WeaponId;
  ammo: number;
  reserve: number;
  cooldownLeft: number;
  reloading: number;
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  sensitivity: number;
  scanlines: boolean;
  streamMode: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  reduceFlashes: boolean;
  largeText: boolean;
  aimAssist: boolean;
  hackAssist: boolean;
  controlLayout: 'auto' | 'wasd' | 'zqsd';
  subtitles: boolean;
}

export interface StationLevels {
  clinic: number;
  arsenal: number;
  cortex: number;
  spectre: number;
  syndicate: number;
  core: number;
}

export interface Resources {
  credits: number;
  influence: number;
  salvage: number;
  data: number;
  xp: number;
}

export interface CampaignState {
  stage: CampaignStage;
  checkpoint: string;
  route: RouteId | null;
  bodyId: BodyId | null;
  registryRecovered: boolean;
  licenseRevoked: boolean;
  rootInstalled: boolean;
  naraFreed: boolean;
  naraTrust: number;
  collectorAnchors: number;
  collectorTransfers: number;
  collectorDefeated: boolean;
  stationReached: boolean;
  endingsSeen: string[];
}

export interface SaveData {
  schemaVersion: number;
  saveId: string;
  updatedAt: string;
  playtimeSeconds: number;
  campaign: CampaignState;
  resources: Resources;
  weapons: Record<WeaponId, { unlocked: boolean; reserve: number }>;
  bodies: Record<BodyId, { unlocked: boolean; integrity: number; implants: string[]; level: number }>;
  companions: {
    nara: { recruited: boolean; trust: number; order: NaraOrder };
  };
  station: StationLevels;
  codex: string[];
  settings: GameSettings;
  achievements: string[];
}

export interface WorldEntity {
  id: string;
  kind: EnemyKind | 'nara' | 'terminal' | 'anchor' | 'loot' | 'exit';
  x: number;
  y: number;
  angle: number;
  health: number;
  maxHealth: number;
  armor: number;
  alive: boolean;
  state?: EnemyState;
  label: string;
  hostile?: boolean;
  interactable?: boolean;
  objective?: boolean;
  variant?: number;
}

export interface PlayerState {
  x: number;
  y: number;
  angle: number;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  neural: number;
  maxNeural: number;
  weapon: WeaponState;
  recoil: number;
  hurtFlash: number;
}

export interface WorldSnapshot {
  player: PlayerState;
  entities: WorldEntity[];
  alertLevel: number;
  objective: string;
  prompt: string | null;
  fps: number;
}

export interface HackNode {
  id: number;
  x: number;
  y: number;
  links: number[];
  captured: boolean;
  ice: boolean;
  target: boolean;
}

export interface HackState {
  seed: number;
  nodes: HackNode[];
  current: number;
  trace: number;
  programs: {
    ghost: number;
    fork: number;
    burn: number;
    puppet: number;
  };
  completed: boolean;
  failed: boolean;
}
