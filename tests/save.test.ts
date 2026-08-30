import { describe, expect, it } from 'vitest';
import { createNewSave, deserializeSave, migrateSave, serializeSave } from '@/game/save';
import { SAVE_SCHEMA_VERSION } from '@/game/content';

describe('save system', () => {
  it('round trips current saves', () => {
    const save = createNewSave({ scanlines: false });
    const parsed = deserializeSave(serializeSave(save));
    expect(parsed.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(parsed.settings.scanlines).toBe(false);
    expect(parsed.codex).toContain('neo-massilia');
  });

  it('migrates older or partial payloads safely', () => {
    const migrated = migrateSave({ schemaVersion: 1, campaign: { stage: 'station', collectorAnchors: -5 }, resources: { ferraille: 900 }, station: { core: 7 }, settings: { hackAssist: true } });
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(migrated.campaign.collectorAnchors).toBe(0);
    expect(migrated.station.core).toBe(3);
    expect(migrated.resources.salvage).toBe(900);
    expect(migrated.settings.hackAssist).toBe(true);
  });

  it('rejects malformed JSON imports', () => {
    expect(() => deserializeSave('{broken')).toThrow(/corrompu/);
  });
});
