import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SocialEncounterPanel } from '@/components/game/SocialEncounterPanel';
import { SOCIAL_ENCOUNTERS, SOCIAL_EVIDENCE } from '@/game/social-data';
import {
  captureRecord,
  listSocialOptions,
  previewSocialOption,
  resolveSocialOption,
  resolvedSocialOption,
  socialResolutionKey,
  updateCaptureStatus,
} from '@/game/social';
import { createNewSave } from '@/game/save';
import type { AgentId, FacilityReadiness } from '@/game/continuity-types';
import type { SaveData } from '@/game/types';

const AGENTS: AgentId[] = ['nara', 'idris', 'salome'];

function readiness(): FacilityReadiness {
  return {
    lastUsedCycle: {},
    stabilizers: 0,
    weaponCalibration: 'none',
    dronePackage: 'none',
    emergencyAgent: null,
    mediaTarget: null,
    insertion: 'metro',
    hostedResidents: 0,
    evidenceProcessed: 0,
  };
}

function velvetSave(): SaveData {
  const save = createNewSave();
  save.campaign.stage = 'district';
  save.campaign.bodyId = 'mistral';
  save.campaign.stationReached = true;
  save.resources.credits = 500;
  save.continuity.active = {
    district: 'velours',
    mission: 'velvet',
    approach: 'identity',
    objectives: [],
    choice: null,
    socialResolutions: [],
  };
  save.continuity.identity.presentation = 'corporate';
  save.continuity.evidence = [];
  save.continuity.captures = [];
  save.continuity.agentRelations = Object.fromEntries(
    AGENTS.map((from) => [
      from,
      Object.fromEntries(AGENTS.map((to) => [to, 0])),
    ]),
  ) as SaveData['continuity']['agentRelations'];
  save.continuity.facilityReadiness = readiness();
  save.continuity.agents.nara.trust = 40;
  save.continuity.agents.idris.trust = 20;
  save.continuity.agents.salome.trust = 0;
  for (const agent of AGENTS)
    save.continuity.agents[agent].engagementPolicy = 'weapons-free';
  return save;
}

function resolve(
  save: SaveData,
  encounter: Parameters<typeof resolveSocialOption>[1],
  option: Parameters<typeof resolveSocialOption>[2],
): SaveData {
  const result = resolveSocialOption(save, encounter, option);
  expect(result.status).toBe('applied');
  return result.save;
}

function reachSalome(save = velvetSave()): SaveData {
  const gate = resolve(save, 'velvet-gate', 'gate-negotiate');
  return resolve(gate, 'velvet-broker', 'broker-negotiate');
}

describe('Velvet social data', () => {
  it('defines exactly three sequential encounters and all five authored methods', () => {
    expect(SOCIAL_ENCOUNTERS.map((encounter) => encounter.id)).toEqual([
      'velvet-gate',
      'velvet-broker',
      'velvet-salome',
    ]);
    expect(
      new Set(
        SOCIAL_ENCOUNTERS.flatMap((encounter) =>
          encounter.options.map((option) => option.method),
        ),
      ),
    ).toEqual(
      new Set(['cover', 'negotiate', 'corruption', 'blackmail', 'withdraw']),
    );
    expect(
      SOCIAL_ENCOUNTERS.flatMap((encounter) => encounter.options).every(
        (option) =>
          option.consent === 'respected' || Boolean(option.hardBlockedReason),
      ),
    ).toBe(true);
  });

  it('reacts deterministically to presentation, body and the equipped social implant', () => {
    const save = velvetSave();
    save.campaign.bodyId = 'mole';
    const blocked = previewSocialOption(save, 'velvet-gate', 'gate-cover');
    expect(blocked.available).toBe(false);
    expect(blocked.blockedReasons.join(' ')).toContain('MÔLE-9');

    save.continuity.implants.push('social-mask');
    const masked = previewSocialOption(save, 'velvet-gate', 'gate-cover');
    expect(masked.available).toBe(true);
    expect(masked.notes.join(' ')).toContain('consentement');
    expect(
      masked.reactions
        .filter((reaction) => reaction.agent === 'nara')
        .reduce((total, reaction) => total + reaction.trustDelta, 0),
    ).toBe(0);
  });

  it('requires the authored evidence before blackmail becomes available', () => {
    const save = velvetSave();
    const blocked = previewSocialOption(save, 'velvet-gate', 'gate-blackmail');
    expect(blocked.available).toBe(false);
    expect(blocked.blockedReasons.join(' ')).toContain('Preuve manquante');
    save.continuity.evidence.push(SOCIAL_EVIDENCE.detentionLedger);
    expect(
      previewSocialOption(save, 'velvet-gate', 'gate-blackmail').available,
    ).toBe(true);
  });
});

describe('deterministic and idempotent social reducer', () => {
  it('applies the exact previewed corruption cost and distinct reactions once', () => {
    const save = velvetSave();
    const before = structuredClone(save);
    const preview = previewSocialOption(save, 'velvet-gate', 'gate-corruption');
    expect(preview.available).toBe(true);
    const result = resolveSocialOption(save, 'velvet-gate', 'gate-corruption');
    expect(result.status).toBe('applied');
    expect(save).toEqual(before);
    expect(result.save.resources.credits).toBe(
      before.resources.credits - preview.cost.credits!,
    );
    expect(result.save.continuity.agents.nara.trust).toBe(37);
    expect(result.save.continuity.agents.idris.trust).toBe(19);
    expect(result.save.continuity.agentRelations.nara.idris).toBe(-1);
    expect(result.save.continuity.active?.socialResolutions).toEqual([
      socialResolutionKey('velvet-gate', 'gate-corruption'),
    ]);
    expect(result.save.continuity.socialHistory).toEqual([
      socialResolutionKey('velvet-gate', 'gate-corruption'),
    ]);

    const repeated = resolveSocialOption(
      result.save,
      'velvet-gate',
      'gate-corruption',
    );
    expect(repeated.status).toBe('already-resolved');
    expect(repeated.save).toBe(result.save);
    expect(repeated.save.resources.credits).toBe(result.save.resources.credits);
  });

  it('keeps a committed social consequence idempotent after retreat and re-entry', () => {
    const save = velvetSave();
    const applied = resolveSocialOption(save, 'velvet-gate', 'gate-negotiate');
    expect(applied.status).toBe('applied');
    const trust = applied.save.continuity.agents.nara.trust;
    const returned = structuredClone(applied.save);
    returned.continuity.active = {
      district: 'velours',
      mission: 'velvet',
      approach: 'identity',
      objectives: [],
      choice: null,
      socialResolutions: [],
    };

    const repeated = resolveSocialOption(
      returned,
      'velvet-gate',
      'gate-negotiate',
    );
    expect(repeated.status).toBe('already-resolved');
    expect(repeated.save).toBe(returned);
    expect(repeated.save.continuity.agents.nara.trust).toBe(trust);
    expect(resolvedSocialOption(returned, 'velvet-gate')).toBe(
      'gate-negotiate',
    );
  });

  it('carries negotiated evidence and individual relations through all three encounters', () => {
    const ready = reachSalome();
    expect(ready.continuity.evidence).toContain(
      SOCIAL_EVIDENCE.auctionRegistry,
    );
    const result = resolveSocialOption(
      ready,
      'velvet-salome',
      'salome-negotiate',
    );
    expect(result.status).toBe('applied');
    expect(result.save.continuity.evidence).toContain(
      SOCIAL_EVIDENCE.salomeTestimony,
    );
    expect(result.save.continuity.agents.nara.trust).toBe(48);
    expect(result.save.continuity.agents.idris.trust).toBe(25);
    expect(result.save.continuity.agents.salome.trust).toBe(7);
    expect(result.save.continuity.agentRelations.nara.salome).toBe(4);
    expect(result.save.continuity.agentRelations.salome.nara).toBe(3);
  });

  it('never unlocks coercion of Salomé through money, evidence or implants', () => {
    const save = reachSalome();
    save.resources.credits = 100_000;
    save.continuity.implants = ['social-mask', 'offensive-vector'];
    save.continuity.evidence.push(SOCIAL_EVIDENCE.detentionLedger);
    for (const option of [
      'salome-corruption-refused',
      'salome-blackmail-refused',
    ] as const) {
      const preview = previewSocialOption(save, 'velvet-salome', option);
      expect(preview.available).toBe(false);
      expect(preview.blockedReasons.join(' ')).toContain(
        'Limite de consentement',
      );
      const result = resolveSocialOption(save, 'velvet-salome', option);
      expect(result.status).toBe('blocked');
      expect(result.save).toBe(save);
    }
    expect(save.continuity.active?.socialResolutions).toHaveLength(2);
    expect(save.resources.credits).toBe(100_000);
  });

  it('keeps withdrawal free, repeatable and non-committing', () => {
    const save = velvetSave();
    const result = resolveSocialOption(save, 'velvet-gate', 'gate-withdraw');
    expect(result.status).toBe('withdrawn');
    expect(result.save).toBe(save);
    expect(result.save.continuity.active?.socialResolutions).toEqual([]);
    expect(
      listSocialOptions(result.save, 'velvet-gate').find(
        (option) => option.option.id === 'gate-negotiate',
      )?.available,
    ).toBe(true);
  });
});

describe('capture continuity', () => {
  it('records surrender once and enforces forward-only capture transitions', () => {
    const save = velvetSave();
    save.continuity.evidence.push(SOCIAL_EVIDENCE.detentionLedger);
    const gate = resolve(save, 'velvet-gate', 'gate-negotiate');
    const broker = resolve(gate, 'velvet-broker', 'broker-blackmail');
    expect(captureRecord(broker, 'velvet-broker')).toMatchObject({
      source: 'velvet',
      status: 'surrendered',
    });

    const captured = updateCaptureStatus(broker, 'velvet-broker', 'captured');
    expect(captured.status).toBe('applied');
    expect(captured.capture?.status).toBe('captured');
    const testimony = updateCaptureStatus(
      captured.save,
      'velvet-broker',
      'testimony',
    );
    expect(testimony.status).toBe('applied');
    const repeated = updateCaptureStatus(
      testimony.save,
      'velvet-broker',
      'testimony',
    );
    expect(repeated.status).toBe('unchanged');
    expect(repeated.save).toBe(testimony.save);
    expect(
      updateCaptureStatus(testimony.save, 'velvet-broker', 'surrendered')
        .status,
    ).toBe('blocked');
  });
});

describe('accessible integration panel', () => {
  it('renders labelled deterministic choices and explicit disabled reasons', () => {
    const save = velvetSave();
    save.campaign.bodyId = 'mole';
    const html = renderToStaticMarkup(
      createElement(SocialEncounterPanel, {
        save,
        encounterId: 'velvet-gate',
        onResolve: () => undefined,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain('aria-labelledby');
    expect(html).toContain('aria-describedby');
    expect(html).toContain('aria-label="Fermer la rencontre sociale"');
    expect(html).toContain(
      'aria-label="Confirmer : Demander le passage au nom du Réseau"',
    );
    expect(html).toContain(
      'aria-label="Indisponible : Présenter la couverture corporatiste"',
    );
    expect(html).toContain('Aucun jet aléatoire');
    expect(html).toContain('MÔLE-9');
    expect(html).toContain('disabled=""');
  });
});
