import { describe, expect, it } from 'vitest';
import {
  createNewSave,
  deserializeSave,
  migrateSave,
  serializeSave,
} from '@/game/save';
import { SAVE_SCHEMA_VERSION } from '@/game/content';
import { createEncounter } from '@/game/simulation';
import { beginCampaign } from '@/game/progression';

describe('save system', () => {
  it('round trips current saves', () => {
    const save = createNewSave({ scanlines: false });
    const parsed = deserializeSave(serializeSave(save));
    expect(parsed.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(parsed.settings.scanlines).toBe(false);
    expect(parsed.codex).toContain('neo-massilia');
  });

  it('migrates older or partial payloads safely', () => {
    const migrated = migrateSave({
      schemaVersion: 1,
      campaign: { stage: 'station', collectorAnchors: -5 },
      resources: { ferraille: 900 },
      station: { core: 7 },
      settings: { hackAssist: true },
    });
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(migrated.campaign.collectorAnchors).toBe(0);
    expect(migrated.station.core).toBe(3);
    expect(migrated.resources.salvage).toBe(900);
    expect(migrated.settings.hackAssist).toBe(true);
  });

  it('migrates v5 tactical queues and non-lethal captures into v6', () => {
    const save = createNewSave();
    save.schemaVersion = 5;
    save.campaign.stage = 'collector';
    save.campaign.bodyId = 'mistral';
    save.campaign.naraFreed = true;
    save.companions.nara.recruited = true;
    save.continuity.agents.nara.recruited = true;
    save.encounter = createEncounter(save);
    const target = save.encounter.entities.find(
      (entity) =>
        ['guard', 'heavy', 'drone'].includes(entity.kind) && !entity.allied,
    )!;
    target.captureState = 'restrained';
    target.capturedBy = 'nara';
    target.hostile = false;
    target.health = 1;
    save.encounter.tacticalQueues = {
      nara: [
        {
          id: 4,
          order: 'capture',
          issuedAt: 12,
          targetId: target.id,
        },
      ],
      idris: [],
      salome: [],
    };
    save.encounter.tacticalSequence = 5;

    const migrated = migrateSave(JSON.parse(JSON.stringify(save)));
    const restored = migrated.encounter!.entities.find(
      (entity) => entity.id === target.id,
    )!;
    expect(migrated.schemaVersion).toBe(6);
    expect(restored.captureState).toBe('restrained');
    expect(restored.capturedBy).toBe('nara');
    expect(restored.actionState).toBe('restrained');
    expect(migrated.encounter!.tacticalQueues!.nara).toEqual([
      expect.objectContaining({ id: 4, order: 'capture', targetId: target.id }),
    ]);
    expect(migrated.encounter!.tacticalSequence).toBe(5);
    expect(migrated.continuity.facilityReadiness).toBeDefined();
    expect(migrated.continuity.captures).toEqual([]);
  });

  it('round trips permanent social resolutions and rejects malformed history', () => {
    const save = createNewSave();
    save.continuity.socialHistory = [
      'velvet-gate:gate-negotiate',
      'velvet-broker:broker-blackmail',
    ];
    const raw = JSON.parse(serializeSave(save));
    raw.continuity.socialHistory.push(
      'velvet-gate:gate-negotiate',
      'unknown:forged',
      '../unsafe',
    );

    const migrated = migrateSave(raw);
    expect(migrated.continuity.socialHistory).toEqual([
      'velvet-gate:gate-negotiate',
      'velvet-broker:broker-blackmail',
    ]);
    expect(
      deserializeSave(serializeSave(migrated)).continuity.socialHistory,
    ).toEqual(migrated.continuity.socialHistory);
  });

  it('resumes encounter preparation copies after station readiness is consumed', () => {
    const save = beginCampaign(createNewSave(), 'mistral', 'combat');
    save.continuity.facilityReadiness.weaponCalibration = 'rupture';
    save.continuity.facilityReadiness.dronePackage = 'recovery';
    save.continuity.facilityReadiness.emergencyAgent = 'nara';
    save.encounter = createEncounter(save);
    save.encounter.recoveryUsed = true;
    save.continuity.facilityReadiness.weaponCalibration = 'none';
    save.continuity.facilityReadiness.dronePackage = 'none';
    save.continuity.facilityReadiness.emergencyAgent = null;

    const restored = deserializeSave(serializeSave(save));
    expect(restored.encounter).toMatchObject({
      weaponCalibration: 'rupture',
      dronePackage: 'recovery',
      emergencyAgent: 'nara',
      recoveryUsed: true,
    });
    expect(restored.continuity.facilityReadiness).toMatchObject({
      weaponCalibration: 'none',
      dronePackage: 'none',
      emergencyAgent: null,
    });
  });

  it('restores a prepared scout as an ally without automatic possession', () => {
    const save = beginCampaign(createNewSave(), 'mistral', 'combat');
    save.continuity.facilityReadiness.dronePackage = 'scout';
    save.encounter = createEncounter(save);
    save.continuity.facilityReadiness.dronePackage = 'none';

    const restored = deserializeSave(serializeSave(save));
    expect(restored.encounter?.dronePackage).toBe('scout');
    expect(
      restored.encounter?.entities.find(
        (entity) => entity.id === 'facility.scout-drone',
      ),
    ).toMatchObject({
      kind: 'drone',
      allied: true,
      alive: true,
    });
    expect(restored.encounter?.droneId).toBeNull();
  });

  it('rejects malformed JSON imports', () => {
    expect(() => deserializeSave('{broken')).toThrow(/corrompu/);
  });
});
