import type { BodyId, RouteId, NaraOrder } from './types';

export type DistrictId =
  | 'port'
  | 'corniche'
  | 'velours'
  | 'forge'
  | 'calanques'
  | 'relais'
  | 'if'
  | 'couronne';
export type MissionId =
  | 'appearance'
  | 'years'
  | 'velvet'
  | 'mistral'
  | 'faith'
  | 'incarnation';
export type FactionId =
  | 'soma'
  | 'euromed'
  | 'velours'
  | 'phocee'
  | 'mistral'
  | 'if'
  | 'chalk';
export type AgentId = 'nara' | 'idris' | 'salome';
export type EndingId =
  | 'liberation'
  | 'syndicate'
  | 'communion'
  | 'exodus'
  | 'flesh';
export type ImplantFamily =
  | 'cortex'
  | 'optical'
  | 'dermal'
  | 'motor'
  | 'organic'
  | 'social'
  | 'offensive'
  | 'cybermancy';
export type FacilityId =
  | 'morphology'
  | 'lab'
  | 'armory'
  | 'drones'
  | 'transfer'
  | 'chapel'
  | 'bar'
  | 'command'
  | 'interrogation'
  | 'media'
  | 'garage'
  | 'quarters'
  | 'refuge';

export interface Expedition {
  district: DistrictId | 'station';
  mission: MissionId | null;
  approach: RouteId;
  objectives: string[];
  choice: string | null;
}

/** Long-form campaign state, versioned separately from the legacy prologue. */
export interface ContinuityState {
  chapter: number;
  cycle: number;
  active: Expedition | null;
  completed: Partial<Record<MissionId, string>>;
  visited: DistrictId[];
  factions: Record<FactionId, number>;
  territories: Record<
    DistrictId,
    { control: number; unrest: number; liberated: boolean }
  >;
  agents: Record<
    AgentId,
    {
      recruited: boolean;
      trust: number;
      body: BodyId;
      order: NaraOrder;
      fatigue: number;
    }
  >;
  selectedAgent: AgentId;
  facilities: Record<FacilityId, number>;
  implants: string[];
  ownedImplants: string[];
  skills: string[];
  lease: { debt: number; due: number; owned: boolean };
  somatic: number;
  memory: number;
  identity: {
    name: string;
    presentation: 'neutral' | 'corporate' | 'velours' | 'worker';
  };
  ending: EndingId | null;
  journal: string[];
}
