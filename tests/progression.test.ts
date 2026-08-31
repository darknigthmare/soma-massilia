import { describe, expect, it } from 'vitest';
import {
  advanceCampaign,
  beginCampaign,
  rewardIntrusion,
  resolveSyndicateOperation,
  setNaraOrder,
  upgradeStation,
} from '@/game/progression';
import { createNewSave } from '@/game/save';
import { createEncounter } from '@/game/simulation';

describe('campaign progression', () => {
  it('applies Marionnette reward and drone takeover without mutating the source', () => {
    const save = beginCampaign(createNewSave(), 'mistral', 'identity');
    save.encounter = createEncounter(save);
    const drone = save.encounter.entities.find((e) => e.kind === 'drone');
    expect(drone).toBeDefined();
    const next = rewardIntrusion(save, true);
    expect(next.resources.data).toBe(save.resources.data + 12);
    expect(next.statistics.hacks).toBe(save.statistics.hacks + 1);
    expect(
      next.encounter?.entities.find((e) => e.id === drone?.id),
    ).toMatchObject({ allied: true, hostile: false });
    expect(drone?.allied).not.toBe(true);
    expect(rewardIntrusion(save, false).resources.data).toBe(
      save.resources.data,
    );
  });
  it('plays the required vertical slice sequence through Station Zero', () => {
    let save = beginCampaign(createNewSave(), 'sibylle', 'sabotage');
    expect(save.campaign.stage).toBe('docks');
    save = advanceCampaign(save, 'registry-hacked');
    expect(save.campaign.licenseRevoked).toBe(true);
    save = advanceCampaign(save, 'root-installed');
    expect(save.weapons.smg.unlocked).toBe(true);
    save = advanceCampaign(save, 'nara-freed');
    expect(save.companions.nara.recruited).toBe(true);
    save = advanceCampaign(save, 'anchor-destroyed');
    save = advanceCampaign(save, 'anchor-destroyed');
    save = advanceCampaign(save, 'anchor-destroyed');
    expect(save.campaign.collectorAnchors).toBe(0);
    save = advanceCampaign(save, 'collector-defeated');
    expect(save.campaign.stage).toBe('station');
    save = upgradeStation(save, 'clinic');
    expect(save.station.clinic).toBe(1);
    save = advanceCampaign(save, 'station-upgraded');
    expect(save.campaign.stage).toBe('complete');
    expect(save.achievements).toContain('cellule-null');
  });

  it('requires anchors to be cut before the Collector can fall', () => {
    let save = beginCampaign(createNewSave(), 'mistral', 'combat');
    save = advanceCampaign(
      advanceCampaign(
        advanceCampaign(save, 'registry-hacked'),
        'root-installed',
      ),
      'nara-freed',
    );
    const blocked = advanceCampaign(save, 'collector-defeated');
    expect(blocked.campaign.stage).toBe('collector');
  });

  it('resolves Nara orders and Syndicate operations only after Station Zero', () => {
    const save = setNaraOrder(createNewSave(), 'cover');
    expect(save.companions.nara.order).toBe('cover');
    const before = resolveSyndicateOperation(save, 'velours');
    expect(before.resources.influence).toBe(0);
  });
});
