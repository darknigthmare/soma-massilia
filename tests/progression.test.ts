import { describe, expect, it } from 'vitest';
import {
  advanceCampaign,
  beginCampaign,
  resolveSyndicateOperation,
  setNaraOrder,
  upgradeStation,
} from '@/game/progression';
import { createNewSave } from '@/game/save';

describe('campaign progression', () => {
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
