import type {
  AgentId,
  CaptureRecord,
  CaptureStatus,
  DistrictId,
  FactionId,
  MissionId,
} from './continuity-types';

export type SocialEncounterId =
  | 'velvet-gate'
  | 'velvet-broker'
  | 'velvet-salome';

export type SocialMethod =
  | 'cover'
  | 'negotiate'
  | 'corruption'
  | 'blackmail'
  | 'withdraw';

export type SocialOptionId =
  | 'gate-cover'
  | 'gate-negotiate'
  | 'gate-corruption'
  | 'gate-blackmail'
  | 'gate-withdraw'
  | 'broker-cover'
  | 'broker-negotiate'
  | 'broker-corruption'
  | 'broker-blackmail'
  | 'broker-withdraw'
  | 'salome-cover'
  | 'salome-negotiate'
  | 'salome-corruption-refused'
  | 'salome-blackmail-refused'
  | 'salome-withdraw';

export type SocialProfileId =
  | 'credible-corporate-gala'
  | 'credible-velours-buyer';

export type SocialRequirement =
  | {
      kind: 'evidence';
      id: string;
      label: string;
    }
  | {
      kind: 'presentation';
      anyOf: ('neutral' | 'corporate' | 'velours' | 'worker')[];
      label: string;
    }
  | {
      kind: 'implant';
      id: string;
      label: string;
    }
  | {
      kind: 'faction';
      faction: FactionId;
      minimum: number;
      label: string;
    }
  | {
      kind: 'trust';
      agent: AgentId;
      minimum: number;
      label: string;
    }
  | {
      kind: 'prior-resolution';
      encounterId: SocialEncounterId;
      optionIds?: SocialOptionId[];
      label: string;
    }
  | {
      kind: 'profile';
      profile: SocialProfileId;
      label: string;
    };

export interface SocialCost {
  credits?: number;
  data?: number;
  influence?: number;
}

export type SocialEffect =
  | {
      kind: 'faction';
      faction: FactionId;
      delta: number;
      text: string;
    }
  | {
      kind: 'territory';
      district: DistrictId;
      controlDelta: number;
      unrestDelta: number;
      text: string;
    }
  | {
      kind: 'evidence';
      evidenceId: string;
      operation: 'add' | 'consume';
      text: string;
    }
  | {
      kind: 'capture';
      capture: CaptureRecord;
      text: string;
    }
  | {
      kind: 'journal';
      text: string;
    };

export interface SocialReaction {
  agent: AgentId;
  trustDelta: number;
  relations?: Partial<Record<AgentId, number>>;
  text: string;
}

export interface SocialConditionalModifier {
  requirements: SocialRequirement[];
  notes: string[];
  effects?: SocialEffect[];
  reactions?: SocialReaction[];
}

export interface SocialOptionDefinition {
  id: SocialOptionId;
  encounterId: SocialEncounterId;
  method: SocialMethod;
  label: string;
  description: string;
  outcome: string;
  requirements: SocialRequirement[];
  cost: SocialCost;
  effects: SocialEffect[];
  reactions: SocialReaction[];
  modifiers?: SocialConditionalModifier[];
  commits: boolean;
  consent: 'respected' | 'refused';
  hardBlockedReason?: string;
}

export interface SocialEncounterDefinition {
  id: SocialEncounterId;
  mission: MissionId;
  title: string;
  speaker: string;
  introduction: string;
  options: SocialOptionDefinition[];
}

export interface SocialRequirementEvaluation {
  label: string;
  met: boolean;
  reason: string;
}

export interface SocialOptionPreview {
  encounter: SocialEncounterDefinition;
  option: SocialOptionDefinition;
  available: boolean;
  alreadyResolved: boolean;
  resolvedOptionId: SocialOptionId | null;
  blockedReasons: string[];
  requirements: SocialRequirementEvaluation[];
  cost: SocialCost;
  effects: SocialEffect[];
  reactions: SocialReaction[];
  notes: string[];
}

export interface SocialResolutionResult {
  save: import('./types').SaveData;
  preview: SocialOptionPreview;
  status: 'applied' | 'blocked' | 'already-resolved' | 'withdrawn';
}

export interface CaptureTransitionResult {
  save: import('./types').SaveData;
  status: 'applied' | 'blocked' | 'unchanged';
  capture: CaptureRecord | null;
}

export interface CaptureTransition {
  from: CaptureStatus;
  to: CaptureStatus;
}
