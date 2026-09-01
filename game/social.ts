import { socialEncounter } from './social-data';
import type {
  AgentId,
  CaptureRecord,
  CaptureStatus,
  FactionId,
} from './continuity-types';
import type { SaveData } from './types';
import type {
  CaptureTransitionResult,
  SocialConditionalModifier,
  SocialCost,
  SocialEffect,
  SocialEncounterDefinition,
  SocialEncounterId,
  SocialOptionDefinition,
  SocialOptionId,
  SocialOptionPreview,
  SocialReaction,
  SocialRequirement,
  SocialRequirementEvaluation,
  SocialResolutionResult,
} from './social-types';

const AGENT_IDS: AgentId[] = ['nara', 'idris', 'salome'];
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

export interface SocialContext {
  encounterId: SocialEncounterId;
  presentation: SaveData['continuity']['identity']['presentation'];
  bodyId: SaveData['campaign']['bodyId'];
  implants: string[];
  evidence: string[];
  resolutions: string[];
  factions: Record<FactionId, number>;
  trust: Record<AgentId, number>;
  relations: Record<AgentId, Record<AgentId, number>>;
  presentAgents: AgentId[];
}

export function agentRelationLabel(value: number): string {
  const relation = clamp(
    Number.isFinite(value) ? Math.trunc(value) : 0,
    -100,
    100,
  );
  if (relation >= 25) return 'alliance solide';
  if (relation >= 5) return 'confiance';
  if (relation >= 1) return 'favorable';
  if (relation <= -25) return 'rupture';
  if (relation <= -5) return 'défiance';
  if (relation <= -1) return 'tension';
  return 'neutre';
}

export function socialResolutionKey(
  encounterId: SocialEncounterId,
  optionId: SocialOptionId,
): string {
  return `${encounterId}:${optionId}`;
}

function activeResolutions(save: SaveData): string[] {
  return [
    ...(save.continuity.socialHistory ?? []),
    ...(save.continuity.active?.socialResolutions ?? []),
  ];
}

function presentSocialAgents(
  save: SaveData,
  encounter: SocialEncounterDefinition,
): Set<AgentId> {
  return new Set([
    ...AGENT_IDS.filter((agent) => save.continuity.agents[agent].recruited),
    ...(encounter.presentAgents ?? []),
  ]);
}

export function resolvedSocialOption(
  save: SaveData,
  encounterId: SocialEncounterId,
): SocialOptionId | null {
  const encounter = socialEncounter(encounterId);
  if (!encounter) return null;
  const prefix = `${encounterId}:`;
  const stored = activeResolutions(save).find((item) =>
    item.startsWith(prefix),
  );
  if (!stored) return null;
  const optionId = stored.slice(prefix.length) as SocialOptionId;
  return encounter.options.some((option) => option.id === optionId)
    ? optionId
    : null;
}

export function getSocialContext(
  save: SaveData,
  encounterId: SocialEncounterId,
): SocialContext {
  const encounter = socialEncounter(encounterId);
  const presentAgents = encounter
    ? [...presentSocialAgents(save, encounter)]
    : AGENT_IDS.filter((agent) => save.continuity.agents[agent].recruited);
  return {
    encounterId,
    presentation: save.continuity.identity.presentation,
    bodyId: save.campaign.bodyId,
    implants: [...save.continuity.implants],
    evidence: [...(save.continuity.evidence ?? [])],
    resolutions: [...activeResolutions(save)],
    factions: { ...save.continuity.factions },
    trust: Object.fromEntries(
      AGENT_IDS.map((id) => [id, save.continuity.agents[id].trust]),
    ) as Record<AgentId, number>,
    relations: relationMatrix(save),
    presentAgents,
  };
}

function profileEvaluation(
  save: SaveData,
  requirement: Extract<SocialRequirement, { kind: 'profile' }>,
): SocialRequirementEvaluation {
  const presentation = save.continuity.identity.presentation;
  const body = save.campaign.bodyId;
  const masked = save.continuity.implants.includes('social-mask');
  const presentationAccepted =
    requirement.profile === 'credible-corporate-gala'
      ? presentation === 'corporate'
      : presentation === 'corporate' || presentation === 'velours';
  const bodyAccepted = body !== 'mole' || masked;
  const met = presentationAccepted && bodyAccepted;
  let reason = requirement.label;
  if (!presentationAccepted)
    reason =
      requirement.profile === 'credible-corporate-gala'
        ? 'Choisissez une présentation corporatiste à Station Zéro.'
        : 'Choisissez une présentation corporatiste ou Velours.';
  else if (!bodyAccepted)
    reason =
      'Le châssis militaire MÔLE-9 exige le Masque de présence pour cette couverture.';
  return { label: requirement.label, met, reason };
}

function evaluateRequirement(
  save: SaveData,
  requirement: SocialRequirement,
  presentAgents: ReadonlySet<AgentId>,
): SocialRequirementEvaluation {
  if (requirement.kind === 'profile')
    return profileEvaluation(save, requirement);
  if (requirement.kind === 'evidence') {
    const met = (save.continuity.evidence ?? []).includes(requirement.id);
    return {
      label: requirement.label,
      met,
      reason: met
        ? requirement.label
        : `Preuve manquante : ${requirement.label}.`,
    };
  }
  if (requirement.kind === 'presentation') {
    const met = requirement.anyOf.includes(
      save.continuity.identity.presentation,
    );
    return {
      label: requirement.label,
      met,
      reason: met
        ? requirement.label
        : `Présentation requise : ${requirement.label}.`,
    };
  }
  if (requirement.kind === 'implant') {
    const met = save.continuity.implants.includes(requirement.id);
    return {
      label: requirement.label,
      met,
      reason: met
        ? requirement.label
        : `Implant requis : ${requirement.label}.`,
    };
  }
  if (requirement.kind === 'faction') {
    const current = save.continuity.factions[requirement.faction];
    const met = current >= requirement.minimum;
    return {
      label: requirement.label,
      met,
      reason: met
        ? requirement.label
        : `${requirement.label} ; valeur actuelle : ${current}.`,
    };
  }
  if (requirement.kind === 'trust') {
    const current = save.continuity.agents[requirement.agent].trust;
    const met = current >= requirement.minimum;
    return {
      label: requirement.label,
      met,
      reason: met
        ? requirement.label
        : `${requirement.label} ; valeur actuelle : ${current}.`,
    };
  }
  if (requirement.kind === 'relation') {
    const current = clamp(
      save.continuity.agentRelations?.[requirement.from]?.[requirement.to] ?? 0,
      -100,
      100,
    );
    const bothPresent =
      presentAgents.has(requirement.from) && presentAgents.has(requirement.to);
    const met = bothPresent && current >= requirement.minimum;
    return {
      label: requirement.label,
      met,
      reason: met
        ? requirement.label
        : !bothPresent
          ? `Présence requise : ${requirement.label}.`
          : `${requirement.label} ; valeur actuelle : ${current}.`,
    };
  }
  if (requirement.kind === 'prior-resolution') {
    const resolved = resolvedSocialOption(save, requirement.encounterId);
    const met =
      resolved !== null &&
      (!requirement.optionIds || requirement.optionIds.includes(resolved));
    return {
      label: requirement.label,
      met,
      reason: met
        ? requirement.label
        : `Étape sociale requise : ${requirement.label}.`,
    };
  }
  const exhaustive: never = requirement;
  return exhaustive;
}

function costReasons(save: SaveData, cost: SocialCost): string[] {
  const reasons: string[] = [];
  for (const key of ['credits', 'data', 'influence'] as const) {
    const amount = Math.max(0, cost[key] ?? 0);
    if (save.resources[key] < amount)
      reasons.push(
        `${amount} ${key === 'credits' ? 'crédits' : key === 'data' ? 'données' : 'influence'} requis ; ${save.resources[key]} disponibles.`,
      );
  }
  return reasons;
}

function modifierApplies(
  save: SaveData,
  modifier: SocialConditionalModifier,
  presentAgents: ReadonlySet<AgentId>,
): boolean {
  return modifier.requirements.every(
    (requirement) => evaluateRequirement(save, requirement, presentAgents).met,
  );
}

function reactionsForPresentAgents(
  reactions: SocialReaction[],
  presentAgents: ReadonlySet<AgentId>,
): SocialReaction[] {
  return reactions.flatMap((reaction) => {
    if (!presentAgents.has(reaction.agent)) return [];
    if (!reaction.relations) return [{ ...reaction }];
    const relations = Object.fromEntries(
      (Object.entries(reaction.relations) as [AgentId, number][]).filter(
        ([target]) => presentAgents.has(target),
      ),
    ) as Partial<Record<AgentId, number>>;
    return [{ ...reaction, relations }];
  });
}

function optionFor(
  encounter: SocialEncounterDefinition,
  optionId: SocialOptionId,
): SocialOptionDefinition | null {
  return encounter.options.find((option) => option.id === optionId) ?? null;
}

export function previewSocialOption(
  save: SaveData,
  encounterId: SocialEncounterId,
  optionId: SocialOptionId,
): SocialOptionPreview {
  const encounter = socialEncounter(encounterId);
  if (!encounter)
    throw new Error(`Rencontre sociale inconnue : ${encounterId}`);
  const option = optionFor(encounter, optionId);
  if (!option || option.encounterId !== encounterId)
    throw new Error(`Option sociale inconnue : ${encounterId}/${optionId}`);

  const presentAgents = presentSocialAgents(save, encounter);
  const requirements = option.requirements.map((requirement) =>
    evaluateRequirement(save, requirement, presentAgents),
  );
  const resolvedOptionId = resolvedSocialOption(save, encounterId);
  const alreadyResolved = resolvedOptionId !== null;
  const blockedReasons = requirements
    .filter((requirement) => !requirement.met)
    .map((requirement) => requirement.reason);
  if (save.continuity.active?.mission !== encounter.mission)
    blockedReasons.unshift(
      `Cette rencontre est disponible uniquement pendant ${encounter.mission}.`,
    );
  if (alreadyResolved)
    blockedReasons.unshift(
      resolvedOptionId === optionId
        ? 'Cette résolution a déjà été appliquée.'
        : `Cette rencontre est déjà résolue par ${resolvedOptionId}.`,
    );
  if (option.hardBlockedReason)
    blockedReasons.unshift(option.hardBlockedReason);
  blockedReasons.push(...costReasons(save, option.cost));

  const modifiers = (option.modifiers ?? []).filter((modifier) =>
    modifierApplies(save, modifier, presentAgents),
  );
  const reactions = reactionsForPresentAgents(
    [
      ...option.reactions,
      ...modifiers.flatMap((modifier) => modifier.reactions ?? []),
    ],
    presentAgents,
  );
  return {
    encounter,
    option,
    available: blockedReasons.length === 0,
    alreadyResolved,
    resolvedOptionId,
    blockedReasons: [...new Set(blockedReasons)],
    requirements,
    cost: { ...option.cost },
    effects: [
      ...option.effects,
      ...modifiers.flatMap((modifier) => modifier.effects ?? []),
    ],
    reactions,
    notes: modifiers.flatMap((modifier) => modifier.notes),
  };
}

export function listSocialOptions(
  save: SaveData,
  encounterId: SocialEncounterId,
): SocialOptionPreview[] {
  const encounter = socialEncounter(encounterId);
  if (!encounter) return [];
  return encounter.options.map((option) =>
    previewSocialOption(save, encounterId, option.id),
  );
}

function relationMatrix(
  save: SaveData,
): Record<AgentId, Record<AgentId, number>> {
  return Object.fromEntries(
    AGENT_IDS.map((from) => [
      from,
      Object.fromEntries(
        AGENT_IDS.map((to) => [
          to,
          clamp(save.continuity.agentRelations?.[from]?.[to] ?? 0, -100, 100),
        ]),
      ),
    ]),
  ) as Record<AgentId, Record<AgentId, number>>;
}

function applyCost(save: SaveData, cost: SocialCost): void {
  for (const key of ['credits', 'data', 'influence'] as const)
    save.resources[key] -= Math.max(0, cost[key] ?? 0);
}

function applyEffect(save: SaveData, effect: SocialEffect): void {
  if (effect.kind === 'faction') {
    save.continuity.factions[effect.faction] = clamp(
      save.continuity.factions[effect.faction] + effect.delta,
      -100,
      100,
    );
    return;
  }
  if (effect.kind === 'territory') {
    const territory = save.continuity.territories[effect.district];
    territory.control = clamp(
      territory.control + effect.controlDelta,
      -100,
      100,
    );
    territory.unrest = clamp(territory.unrest + effect.unrestDelta, 0, 100);
    if (territory.control >= 50) territory.liberated = true;
    return;
  }
  if (effect.kind === 'evidence') {
    const evidence = save.continuity.evidence ?? [];
    save.continuity.evidence =
      effect.operation === 'add'
        ? [...new Set([...evidence, effect.evidenceId])]
        : evidence.filter((id) => id !== effect.evidenceId);
    return;
  }
  if (effect.kind === 'capture') {
    const captures = save.continuity.captures ?? [];
    if (!captures.some((capture) => capture.id === effect.capture.id))
      save.continuity.captures = [...captures, { ...effect.capture }];
    return;
  }
  save.continuity.journal = [...save.continuity.journal, effect.text].slice(
    -100,
  );
}

function applyReaction(
  save: SaveData,
  reaction: SocialReaction,
  presentAgents: ReadonlySet<AgentId>,
): void {
  if (!presentAgents.has(reaction.agent)) return;
  const agent = save.continuity.agents[reaction.agent];
  agent.trust = clamp(agent.trust + reaction.trustDelta, -100, 100);
  for (const [target, delta] of Object.entries(reaction.relations ?? {}) as [
    AgentId,
    number,
  ][]) {
    if (!presentAgents.has(target)) continue;
    save.continuity.agentRelations[reaction.agent][target] = clamp(
      save.continuity.agentRelations[reaction.agent][target] + delta,
      -100,
      100,
    );
  }
}

export function resolveSocialOption(
  save: SaveData,
  encounterId: SocialEncounterId,
  optionId: SocialOptionId,
): SocialResolutionResult {
  const preview = previewSocialOption(save, encounterId, optionId);
  if (preview.alreadyResolved)
    return { save, preview, status: 'already-resolved' };
  if (!preview.available) return { save, preview, status: 'blocked' };
  if (!preview.option.commits) return { save, preview, status: 'withdrawn' };

  const next = structuredClone(save);
  next.continuity.evidence = [...(next.continuity.evidence ?? [])];
  next.continuity.captures = [...(next.continuity.captures ?? [])];
  next.continuity.agentRelations = relationMatrix(next);
  applyCost(next, preview.cost);
  for (const effect of preview.effects) applyEffect(next, effect);
  const presentAgents = presentSocialAgents(next, preview.encounter);
  for (const reaction of preview.reactions)
    applyReaction(next, reaction, presentAgents);
  next.continuity.active!.socialResolutions = [
    ...(next.continuity.active!.socialResolutions ?? []),
    socialResolutionKey(encounterId, optionId),
  ];
  next.continuity.socialHistory = [
    ...new Set([
      ...(next.continuity.socialHistory ?? []),
      socialResolutionKey(encounterId, optionId),
    ]),
  ];
  next.continuity.journal = [
    ...next.continuity.journal,
    `${preview.encounter.title} — ${preview.option.outcome}`,
  ].slice(-100);
  next.updatedAt = new Date().toISOString();
  return { save: next, preview, status: 'applied' };
}

const CAPTURE_TRANSITIONS: Record<CaptureStatus, CaptureStatus[]> = {
  surrendered: ['captured', 'released'],
  captured: ['testimony', 'released', 'transferred'],
  testimony: ['released', 'transferred'],
  released: [],
  transferred: [],
};

export function canTransitionCaptureStatus(
  from: CaptureStatus,
  to: CaptureStatus,
): boolean {
  return from === to || CAPTURE_TRANSITIONS[from].includes(to);
}

export function updateCaptureStatus(
  save: SaveData,
  captureId: string,
  status: CaptureStatus,
): CaptureTransitionResult {
  const capture = (save.continuity.captures ?? []).find(
    (item) => item.id === captureId,
  );
  if (!capture || !canTransitionCaptureStatus(capture.status, status))
    return { save, status: 'blocked', capture: capture ?? null };
  if (capture.status === status)
    return { save, status: 'unchanged', capture: { ...capture } };
  const next = structuredClone(save);
  const updated = next.continuity.captures.find(
    (item) => item.id === captureId,
  )!;
  updated.status = status;
  next.updatedAt = new Date().toISOString();
  return { save: next, status: 'applied', capture: { ...updated } };
}

export function captureRecord(
  save: SaveData,
  captureId: string,
): CaptureRecord | null {
  const capture = (save.continuity.captures ?? []).find(
    (item) => item.id === captureId,
  );
  return capture ? { ...capture } : null;
}
