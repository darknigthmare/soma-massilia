'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { BODIES, GAME_VERSION, ROUTES, STAGE_COPY } from '@/game/content';
import { SomaAudio } from '@/game/audio';
import {
  createNewSave,
  deserializeSave,
  loadLocalSave,
  persistLocalSave,
  serializeSave,
} from '@/game/save';
import {
  advanceCampaign,
  beginCampaign,
  collectLoot,
  launchOperation,
  learnTalent,
  recordEncounter,
  rewardIntrusion,
  resolveSyndicateOperation,
  setNaraOrder,
  upgradeStation,
} from '@/game/progression';
import { BRIEFINGS, ENDINGS } from '@/game/narrative';
import type {
  BodyId,
  EncounterState,
  GameMode,
  RouteId,
  SaveData,
} from '@/game/types';
import type { SimulationEvent } from '@/game/simulation';
import { createRetryEncounter } from '@/game/simulation';
import { CodexPanel } from './CodexPanel';
import { HackingGrid } from './HackingGrid';
import { RaycastViewport } from './RaycastViewport';
import { SettingsPanel } from './SettingsPanel';
import { StationZero } from './StationZero';
import { ContinuityHub } from './ContinuityHub';
import { MISSIONS, DISTRICTS, FACILITIES } from '@/game/campaign-data';
import {
  beginExpedition,
  recordObjective,
  chooseMission,
  finishExpedition,
  changeBody,
  upgradeFacility,
} from '@/game/campaign';
import type { DistrictId, MissionId, AgentId } from '@/game/continuity-types';

type Overlay =
  | 'none'
  | 'pause'
  | 'settings'
  | 'codex'
  | 'death'
  | 'briefing'
  | 'recruit'
  | 'finale'
  | 'reset'
  | 'help'
  | 'credits'
  | 'export';
type FieldDialogue = {
  id: string;
  label: string;
  quote: string;
  objective: string | null;
  facility: string | null;
} | null;
type HackTarget = { id: string; label: string; seed: number } | null;

export function SomaGame() {
  const [save, setSave] = useState<SaveData | null>(null);
  const [selectedBody, setSelectedBody] = useState<BodyId>('mistral');
  const [selectedRoute, setSelectedRoute] = useState<RouteId>('identity');
  const [mode, setMode] = useState<GameMode>('chair');
  const [overlay, setOverlay] = useState<
    Overlay | 'district-briefing' | 'field-dialogue' | 'mission-choice'
  >('none');
  const [legacyHub, setLegacyHub] = useState(false);
  const [fieldDialogue, setFieldDialogue] = useState<FieldDialogue>(null);
  const [hack, setHack] = useState<HackTarget>(null);
  const [message, setMessage] = useState('');
  const [storageError, setStorageError] = useState('');
  const [dead, setDead] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const audioRef = useRef<SomaAudio | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    const loaded =
      loadLocalSave() ??
      createNewSave({
        reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
          .matches,
      });
    setSave(loaded);
    setSelectedBody(loaded.campaign.bodyId ?? 'mistral');
    setSelectedRoute(loaded.campaign.route ?? 'identity');
    const fallen = loaded.encounter?.player.health === 0;
    setDead(fallen);
    if (loaded.campaign.stage !== 'contract')
      setOverlay(fallen ? 'death' : 'pause');
    return () => audioRef.current?.dispose();
  }, []);

  useEffect(() => {
    if (!save) return;
    try {
      persistLocalSave(save);
      setStorageError('');
    } catch {
      setStorageError(
        'Stockage local indisponible. Exportez votre sauvegarde avant de quitter.',
      );
    }
    document.documentElement.classList.toggle(
      'soma-large-text',
      save.settings.largeText,
    );
    document.documentElement.classList.toggle(
      'soma-high-contrast',
      save.settings.highContrast,
    );
    document.documentElement.classList.toggle(
      'soma-no-scanlines',
      !save.settings.scanlines,
    );
    document.documentElement.classList.toggle(
      'soma-reduced-motion',
      save.settings.reduceMotion,
    );
    audioRef.current?.applySettings(save.settings);
  }, [save]);

  useEffect(() => {
    if (
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    )
      return;
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() =>
        setMessage('Installation hors ligne indisponible sur ce navigateur.'),
      );
  }, []);

  const stage = save?.campaign.stage;
  useEffect(() => {
    if (!stage || !BRIEFINGS[stage]) return;
    const current = saveRef.current!;
    const token =
      stage === 'operation'
        ? 'operation-' +
          current.activeOperation +
          '-' +
          current.operations[current.activeOperation!]
        : stage;
    if (!current.dialogueSeen.includes(token)) setOverlay('briefing');
  }, [stage, gameKey]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (
        event.code !== 'Escape' ||
        hack ||
        ['briefing', 'recruit', 'death', 'finale'].includes(overlay)
      )
        return;
      if (overlay === 'none') return;
      setOverlay(dead ? 'death' : 'none');
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [hack, overlay, dead]);

  if (!save)
    return (
      <main className="boot-screen">
        <strong>
          SOMA<span>{'//'}</span>MASSILIA
        </strong>
        <p>Synchronisation de la conscience…</p>
      </main>
    );
  const active = [
    'docks',
    'revocation',
    'nara',
    'collector',
    'operation',
    'district',
  ].includes(save.campaign.stage);
  const update = (fn: (current: SaveData) => SaveData) =>
    setSave((current) => (current ? fn(current) : current));
  const unlockAudio = () => {
    if (!audioRef.current) audioRef.current = new SomaAudio(save.settings);
    void audioRef.current.unlock().catch(() => undefined);
  };
  const checkpoint = (encounter: EncounterState) =>
    update((current) => recordEncounter(current, encounter));
  const travel = (
    district: DistrictId | 'station',
    mission: MissionId | null,
    approach: RouteId,
  ) => {
    const next = beginExpedition(save, district, mission, approach);
    if (next === save) {
      setMessage('Cette opération n’est pas encore disponible.');
      return;
    }
    setSave(next);
    setMode('chair');
    setDead(false);
    setOverlay('district-briefing');
    setGameKey((n) => n + 1);
  };
  const completeFieldObjective = (id: string) => {
    update((current) => {
      const next = recordObjective(current, id);
      if (!next.encounter) return next;
      const encounter = structuredClone(next.encounter);
      const entity = encounter.entities.find(
        (e) => e.id === id || e.objectiveId === id,
      );
      if (entity) {
        entity.objective = false;
        entity.interactable = false;
      }
      encounter.notice =
        'Objectif accompli. Suivez le prochain repère orange sur la carte.';
      return { ...next, encounter };
    });
    setGameKey((n) => n + 1);
  };
  const events = (items: SimulationEvent[], encounter: EncounterState) => {
    for (const item of items) {
      if (item.type === 'sound') {
        if (item.weapon) audioRef.current?.fire(item.weapon);
        else audioRef.current?.play(item.name);
      }
      if (item.type === 'hack') {
        checkpoint(encounter);
        setHack({
          id: item.id,
          label: item.label,
          seed:
            Array.from(item.id).reduce((n, c) => n + c.charCodeAt(0), 2197) +
            (save.activeOperation ? save.operations[save.activeOperation] : 0),
        });
      }
      if (item.type === 'dialogue') {
        checkpoint(encounter);
        const target = encounter.entities.find(
          (e) => e.id === item.id || e.objectiveId === item.id,
        );
        const mission = MISSIONS.find(
          (m) => m.id === save.continuity.active?.mission,
        );
        const objective = target?.objectiveId ?? item.id;
        setFieldDialogue({
          id: item.id,
          label: item.label,
          quote:
            target?.quote ??
            mission?.briefing[1] ??
            'À Néo-Massilia, une conscience ne peut pas être réduite à son contrat. Écoutez les habitants avant de décider pour eux.',
          objective: mission?.objectives.some((o) => o.id === objective)
            ? objective
            : null,
          facility: target?.facilityId ?? null,
        });
        setOverlay('field-dialogue');
      }
      if (item.type === 'death') {
        setDead(true);
        setOverlay('death');
        update((current) => ({
          ...recordEncounter(current, encounter),
          statistics: {
            ...current.statistics,
            deaths: current.statistics.deaths + 1,
          },
        }));
      }
    }
    const campaignEvents = items.filter((item) => item.type === 'campaign');
    if (campaignEvents.length)
      update((current) => {
        let next = recordEncounter(current, encounter);
        for (const item of campaignEvents) {
          if (item.name === 'loot-collected')
            next = collectLoot(next, item.id ?? '');
          else if (item.name === 'operation-extracted' && next.activeOperation)
            next = resolveSyndicateOperation(next, next.activeOperation);
          else if (item.name === 'objective-completed')
            next = recordObjective(next, item.id ?? '');
          else if (item.name === 'expedition-extracted') {
            if (
              !next.continuity.active?.mission ||
              next.continuity.active.choice
            )
              next = finishExpedition(next);
          } else if (item.name === 'emergency-transfer') {
            const agentId = (
              ['nara', 'idris', 'salome'].includes(item.id ?? '')
                ? item.id
                : 'nara'
            ) as AgentId;
            const agent = next.continuity.agents[agentId];
            next = {
              ...next,
              campaign: { ...next.campaign, bodyId: agent.body },
              continuity: {
                ...next.continuity,
                agents: {
                  ...next.continuity.agents,
                  [agentId]: {
                    ...agent,
                    fatigue: Math.min(100, agent.fatigue + 30),
                  },
                },
                memory: Math.max(0, next.continuity.memory - 8),
                somatic: Math.min(100, next.continuity.somatic + 15),
                journal: [
                  ...next.continuity.journal,
                  'Transfert d’urgence : un agent a protégé votre continuité, au prix d’une fracture mémorielle.',
                ],
              },
            };
          } else next = advanceCampaign(next, item.name);
        }
        return next;
      });
    if (campaignEvents.some((event) => event.name === 'collector-transfer'))
      setMessage('Le Collecteur transfère sa conscience. Coupez ses ancres.');
    if (campaignEvents.some((event) => event.name === 'anchor-destroyed'))
      setMessage('Ancre de conscience coupée.');
    if (campaignEvents.some((event) => event.name === 'mistral-wave'))
      setMode('chair');
    if (campaignEvents.some((event) => event.name === 'expedition-extracted')) {
      if (save.continuity.active?.mission && !save.continuity.active.choice)
        setOverlay('mission-choice');
      else {
        setOverlay('none');
        setMode('chair');
        setLegacyHub(false);
      }
    }
  };

  const completeHack = (puppet: boolean) => {
    if (!hack) return;
    const id = hack.id;
    setHack(null);
    setMode('chair');
    audioRef.current?.play('success');
    if (save.campaign.stage === 'district') {
      const target = save.encounter?.entities.find(
        (e) => e.id === id || e.objectiveId === id,
      );
      completeFieldObjective(target?.objectiveId ?? id);
      update((current) => rewardIntrusion(current, puppet));
      return;
    }
    update((current) => ({
      ...current,
      statistics: {
        ...current.statistics,
        hacks: current.statistics.hacks + 1,
      },
      resources: {
        ...current.resources,
        data: current.resources.data + (puppet ? 12 : 0),
      },
      achievements: puppet
        ? [...new Set([...current.achievements, 'spectre-marionnette'])]
        : current.achievements,
    }));
    if (id === 'nara-cell') {
      setOverlay('recruit');
      return;
    }
    if (id === 'mission-data') {
      update((current) => {
        if (!current.encounter) return current;
        const encounter = structuredClone(current.encounter);
        const terminal = encounter.entities.find((e) => e.id === id);
        if (terminal) terminal.alive = false;
        const extraction = encounter.entities.find((e) => e.kind === 'exit');
        if (extraction) extraction.objective = true;
        encounter.notice = 'Archives copiées. Rejoindre le point d’extraction.';
        if (puppet)
          for (const e of encounter.entities)
            if (e.kind === 'drone') {
              e.allied = true;
              e.hostile = false;
              e.state = 'patrol';
            }
        return { ...current, encounter };
      });
      setGameKey((n) => n + 1);
    } else
      update((current) =>
        advanceCampaign(
          current,
          id === 'registry' ? 'registry-hacked' : 'root-installed',
        ),
      );
  };
  const exportSave = () => setOverlay('export');
  const importSave = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 1_000_000)
        throw new Error('Sauvegarde trop volumineuse (maximum 1 Mo).');
      const imported = deserializeSave(await file.text());
      setSave(imported);
      setSelectedBody(imported.campaign.bodyId ?? 'mistral');
      setSelectedRoute(imported.campaign.route ?? 'identity');
      const fallen = imported.encounter?.player.health === 0;
      setDead(fallen);
      setHack(null);
      setMode('chair');
      setOverlay(
        fallen
          ? 'death'
          : imported.campaign.stage === 'contract'
            ? 'none'
            : 'pause',
      );
      setGameKey((n) => n + 1);
      setMessage('Sauvegarde importée. Migration vérifiée.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import impossible.');
    }
    if (inputRef.current) inputRef.current.value = '';
  };
  const reset = () => {
    setSave(createNewSave(save.settings));
    setSelectedBody('mistral');
    setSelectedRoute('identity');
    setMode('chair');
    setDead(false);
    setHack(null);
    setOverlay('none');
    setGameKey((n) => n + 1);
    setMessage('');
  };
  const closeOverlay = () => {
    if (hack) {
      setHack(null);
      return;
    }
    if (['briefing', 'recruit', 'death', 'finale'].includes(overlay)) return;
    setOverlay(dead ? 'death' : 'none');
  };
  const enterBriefing = () => {
    const token =
      save.campaign.stage === 'operation'
        ? 'operation-' +
          save.activeOperation +
          '-' +
          save.operations[save.activeOperation!]
        : save.campaign.stage;
    update((current) => ({
      ...current,
      dialogueSeen: [...new Set([...current.dialogueSeen, token])],
    }));
    setOverlay('none');
    unlockAudio();
  };
  const briefing = BRIEFINGS[save.campaign.stage];
  const fieldMission = MISSIONS.find(
    (m) => m.id === save.continuity.active?.mission,
  );
  const fieldDistrict = DISTRICTS.find(
    (d) => d.id === save.continuity.active?.district,
  );
  const fieldFacility = FACILITIES.find(
    (f) => f.id === fieldDialogue?.facility,
  );

  return (
    <main className="soma-app" onPointerDownCapture={unlockAudio}>
      <div className="scanlines" aria-hidden="true" />
      <header className="app-bar">
        <span className="brand">
          SOMA<span>{'//'}</span>MASSILIA
        </span>
        <span className="app-status">
          {active ? 'CONSCIENCE ACTIVE' : 'NÉO-MASSILIA / 2197'}
        </span>
        <div>
          <Button size="sm" variant="ghost" onClick={() => setOverlay('codex')}>
            Codex
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOverlay('settings')}
          >
            Options
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOverlay('pause')}
          >
            {active ? 'Pause' : 'Menu'}
          </Button>
        </div>
      </header>
      <input
        ref={inputRef}
        type="file"
        aria-label="Importer une sauvegarde"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => void importSave(event.target.files?.[0])}
      />
      <div id="main-content">
        {save.campaign.stage === 'contract' && (
          <ContractScreen
            selectedBody={selectedBody}
            selectedRoute={selectedRoute}
            onBody={setSelectedBody}
            onRoute={setSelectedRoute}
            onStart={() => {
              update((current) =>
                beginCampaign(current, selectedBody, selectedRoute),
              );
              unlockAudio();
              audioRef.current?.play('boot');
            }}
            onHelp={() => setOverlay('help')}
          />
        )}
        {active && (
          <RaycastViewport
            key={save.campaign.stage + '-' + gameKey}
            save={save}
            mode={mode}
            paused={overlay !== 'none' || Boolean(hack)}
            onMode={setMode}
            onEvents={events}
            onCheckpoint={checkpoint}
            onOrder={(order, agentId = 'nara') =>
              update((current) => ({
                ...(agentId === 'nara'
                  ? setNaraOrder(current, order)
                  : current),
                continuity: {
                  ...current.continuity,
                  selectedAgent: agentId,
                  agents: {
                    ...current.continuity.agents,
                    [agentId]: { ...current.continuity.agents[agentId], order },
                  },
                },
              }))
            }
            onPause={() =>
              setOverlay((current) => (current === 'none' ? 'pause' : current))
            }
          />
        )}
        {save.campaign.stage === 'station' && !legacyHub && (
          <ContinuityHub
            save={save}
            onChange={update}
            onTravel={travel}
            onLegacy={() => setLegacyHub(true)}
          />
        )}
        {save.campaign.stage === 'station' && legacyHub && (
          <div className="legacy-station">
            <Button
              className="legacy-back"
              variant="outline"
              onClick={() => setLegacyHub(false)}
            >
              Retour au commandement
            </Button>
            <StationZero
              save={save}
              onUpgrade={(id) => {
                update((current) => upgradeStation(current, id));
                audioRef.current?.play('upgrade');
              }}
              onFinish={() => {
                setLegacyHub(false);
                setOverlay('none');
              }}
              onBodyChange={(id) =>
                update((current) => changeBody(current, id))
              }
              onOperation={(id) => {
                update((current) => launchOperation(current, id));
                setMode('chair');
              }}
              onTalent={(id) => update((current) => learnTalent(current, id))}
              onOpenCodex={() => setOverlay('codex')}
            />
          </div>
        )}
        {save.campaign.stage === 'complete' && (
          <CompleteScreen
            save={save}
            onHub={() =>
              update((current) => ({
                ...current,
                campaign: { ...current.campaign, stage: 'station' },
              }))
            }
            onReset={() => setOverlay('reset')}
            onCredits={() => setOverlay('credits')}
          />
        )}
      </div>
      {(message || storageError) && (
        <div className="save-message" role="status">
          <span>{storageError || message}</span>
          <button
            aria-label="Masquer le message"
            onClick={() => setMessage('')}
          >
            ×
          </button>
        </div>
      )}
      <Dialog
        open={Boolean(hack) || overlay !== 'none'}
        onOpenChange={(open) => {
          if (!open) closeOverlay();
        }}
      >
        <DialogContent
          className="game-dialog sm:max-w-[820px]"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            {hack
              ? 'Piratage Spectre'
              : overlay === 'settings'
                ? 'Options'
                : 'Interface de conscience'}
          </DialogTitle>
          {hack ? (
            <HackingGrid
              key={hack.id}
              seed={hack.seed}
              targetName={hack.label}
              assisted={save.settings.hackAssist}
              extraBurns={
                save.station.spectre +
                (save.campaign.bodyId === 'sibylle' ? 1 : 0)
              }
              onComplete={completeHack}
              onCancel={() => setHack(null)}
            />
          ) : (
            <>
              {overlay === 'codex' && (
                <CodexPanel
                  unlocked={save.codex}
                  onClose={() => setOverlay(dead ? 'death' : 'none')}
                />
              )}
              {overlay === 'settings' && (
                <SettingsPanel
                  settings={save.settings}
                  onChange={(settings) =>
                    update((current) => ({ ...current, settings }))
                  }
                  onClose={() => setOverlay(dead ? 'death' : 'none')}
                />
              )}
              {overlay === 'pause' && (
                <section className="menu-panel">
                  <p className="eyebrow">Continuité protégée</p>
                  <h2>{active ? 'Jeu en pause' : 'Votre conscience'}</h2>
                  <p>
                    {STAGE_COPY[save.campaign.stage].title} ·{' '}
                    {Math.floor(save.playtimeSeconds / 60)} min ·{' '}
                    {save.resources.xp} XP
                  </p>
                  <div className="menu-actions">
                    <Button onClick={() => setOverlay('none')}>
                      {active ? 'Reprendre la partie' : 'Retour'}
                    </Button>
                    {save.campaign.stage === 'district' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          update((current) => ({
                            ...current,
                            encounter: null,
                            continuity: {
                              ...current.continuity,
                              active: null,
                              journal: [
                                ...current.continuity.journal,
                                'Retraite vers Station Zéro : opération non validée, aucune récompense.',
                              ],
                            },
                            campaign: { ...current.campaign, stage: 'station' },
                          }));
                          setOverlay('none');
                          setMode('chair');
                        }}
                      >
                        Retraite vers Station Zéro (sans récompense)
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setOverlay('help')}
                    >
                      Commandes & règles
                    </Button>
                    <Button variant="outline" onClick={exportSave}>
                      Exporter la sauvegarde
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => inputRef.current?.click()}
                    >
                      Importer une sauvegarde
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setOverlay('credits')}
                    >
                      Crédits & provenance
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setOverlay('reset')}
                    >
                      Nouvelle partie
                    </Button>
                    {save.campaign.stage === 'operation' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          update((current) => ({
                            ...current,
                            activeOperation: null,
                            encounter: null,
                            campaign: { ...current.campaign, stage: 'station' },
                          }));
                          setOverlay('none');
                        }}
                      >
                        Abandonner l’opération
                      </Button>
                    )}
                  </div>
                  <p className="muted">
                    Sauvegarde automatique toutes les quatre secondes et à
                    chaque pause. Un export vous appartient, même hors ligne.
                  </p>
                </section>
              )}
              {overlay === 'briefing' && briefing && (
                <section className="menu-panel">
                  <p className="eyebrow">
                    {briefing.speaker} / liaison sécurisée
                  </p>
                  <h2>{briefing.title}</h2>
                  {briefing.lines.map((line) => (
                    <p key={line}>
                      {save.settings.streamMode
                        ? line.replaceAll('corps', 'enveloppe')
                        : line}
                    </p>
                  ))}
                  <p className="mission-instruction">{briefing.goal}</p>
                  <Button onClick={enterBriefing}>Entrer dans la zone</Button>
                </section>
              )}
              {overlay === 'district-briefing' && (
                <section className="menu-panel">
                  <p className="eyebrow">
                    Liaison métro / {fieldDistrict?.name ?? 'Station Zéro'}
                  </p>
                  <h2>
                    {fieldMission?.title ??
                      fieldDistrict?.name ??
                      'Un lieu pour rester'}
                  </h2>
                  {(
                    fieldMission?.briefing ?? [
                      fieldDistrict?.description ??
                        'La clinique, les ateliers et les quartiers des consciences libérées occupent l’ancienne station. Parlez aux habitants et retrouvez le métro pour préparer une opération.',
                    ]
                  ).map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  {fieldMission && (
                    <ol className="field-objectives">
                      {fieldMission.objectives.map((o) => (
                        <li key={o.id}>{o.label}</li>
                      ))}
                    </ol>
                  )}
                  <p className="mission-instruction">
                    E pour interagir · Cortex pour la carte et les agents ·
                    rejoignez le métro pour l’extraction.{' '}
                    {fieldMission?.id === 'velvet'
                      ? 'Mission sans arme : votre identité et vos choix ouvrent les portes.'
                      : ''}
                  </p>
                  <Button
                    onClick={() => {
                      setOverlay('none');
                      unlockAudio();
                    }}
                  >
                    Descendre du métro
                  </Button>
                </section>
              )}
              {overlay === 'field-dialogue' && fieldDialogue && (
                <section className="menu-panel">
                  <p className="eyebrow">Liaison de proximité</p>
                  <h2>{fieldDialogue.label}</h2>
                  <p>{fieldDialogue.quote}</p>
                  {fieldFacility && (
                    <>
                      <p>
                        {fieldFacility.description} {fieldFacility.effect}
                      </p>
                      <Button
                        onClick={() =>
                          update((current) =>
                            upgradeFacility(current, fieldFacility.id),
                          )
                        }
                      >
                        Améliorer ·{' '}
                        {fieldFacility.cost *
                          (save.continuity.facilities[fieldFacility.id] +
                            1)}{' '}
                        ferraille
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => {
                      if (fieldDialogue.objective)
                        completeFieldObjective(fieldDialogue.objective);
                      setOverlay('none');
                      setFieldDialogue(null);
                    }}
                  >
                    {fieldDialogue.objective
                      ? 'Confirmer l’échange'
                      : 'Reprendre la visite'}
                  </Button>
                </section>
              )}
              {overlay === 'mission-choice' && fieldMission && (
                <section className="menu-panel">
                  <p className="eyebrow">
                    Extraction / décision irréversible pour cette opération
                  </p>
                  <h2>{fieldMission.title}</h2>
                  <p>
                    Les objectifs sont remplis. Le retour à Station Zéro engage
                    votre décision et ses conséquences dans la ville.
                  </p>
                  <div className="mission-choices">
                    {fieldMission.choices.map((choice) => (
                      <button
                        key={choice.id}
                        onClick={() => {
                          update((current) =>
                            finishExpedition(chooseMission(current, choice.id)),
                          );
                          setOverlay('none');
                          setMode('chair');
                          setLegacyHub(false);
                        }}
                      >
                        <strong>{choice.label}</strong>
                        <span>{choice.text}</span>
                      </button>
                    ))}
                  </div>
                  <Button variant="outline" onClick={() => setOverlay('none')}>
                    Rester dans le quartier
                  </Button>
                </section>
              )}
              {overlay === 'recruit' && (
                <section className="menu-panel">
                  <p className="eyebrow">Nara Velvet / 32 ans</p>
                  <h2>Personne ne me possède.</h2>
                  <p>
                    « La porte est ouverte. Et maintenant ? Tu vas réclamer les
                    données, ou me laisser décider de ce que je fais avec ? »
                  </p>
                  <div className="menu-actions">
                    {[
                      { label: 'Tu es libre. J’aimerais ton aide.', trust: 20 },
                      {
                        label: 'Partageons le risque et les informations.',
                        trust: 10,
                      },
                    ].map((choice) => (
                      <Button
                        key={choice.label}
                        variant="outline"
                        onClick={() => {
                          update((current) => {
                            const next = advanceCampaign(current, 'nara-freed');
                            next.companions.nara.trust += choice.trust;
                            next.campaign.naraTrust =
                              next.companions.nara.trust;
                            next.continuity.agents.nara.trust =
                              next.companions.nara.trust;
                            return next;
                          });
                          setOverlay('none');
                        }}
                      >
                        {choice.label}
                      </Button>
                    ))}
                  </div>
                  <p className="muted">
                    Votre réponse modifie la confiance de Nara. Elle rejoint la
                    Cellule de son plein gré.
                  </p>
                </section>
              )}
              {overlay === 'death' && (
                <section className="menu-panel">
                  <p className="eyebrow">Enveloppe hors service</p>
                  <h2>La conscience demeure.</h2>
                  <p>
                    Votre progression est conservée. La reprise répare votre
                    corps et redémarre cette zone ; les ancres déjà coupées
                    restent coupées.
                  </p>
                  <Button
                    onClick={() => {
                      update((current) => ({
                        ...current,
                        continuity: {
                          ...current.continuity,
                          memory: Math.max(0, current.continuity.memory - 3),
                          somatic: Math.min(
                            100,
                            current.continuity.somatic + 5,
                          ),
                        },
                        encounter: createRetryEncounter(current),
                      }));
                      setDead(false);
                      setOverlay('none');
                      setMode('chair');
                      setGameKey((n) => n + 1);
                    }}
                  >
                    Réincarner au point de contrôle
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setOverlay('settings')}
                  >
                    Régler la difficulté
                  </Button>
                </section>
              )}
              {overlay === 'finale' && (
                <section className="menu-panel">
                  <p className="eyebrow">Protocole Incarnation</p>
                  <h2>Que faire de nos clés ?</h2>
                  <p>
                    Le Collecteur ne peut plus revenir. La Cellule NULL contrôle
                    désormais les clauses de révocation. Nara refuse qu’un
                    nouveau propriétaire prenne la place de SÔMA.
                  </p>
                  <div className="menu-actions">
                    {(Object.keys(ENDINGS) as (keyof typeof ENDINGS)[]).map(
                      (id) => (
                        <Button
                          key={id}
                          variant="outline"
                          onClick={() => {
                            update((current) => ({
                              ...advanceCampaign(current, 'station-upgraded'),
                              ending: id,
                              campaign: {
                                ...advanceCampaign(current, 'station-upgraded')
                                  .campaign,
                                endingsSeen: [
                                  ...new Set([
                                    ...current.campaign.endingsSeen,
                                    id,
                                  ]),
                                ],
                              },
                            }));
                            setOverlay('none');
                          }}
                        >
                          {ENDINGS[id].choice}
                        </Button>
                      ),
                    )}
                  </div>
                </section>
              )}
              {overlay === 'reset' && (
                <section className="menu-panel">
                  <h2>Ouvrir un nouveau contrat ?</h2>
                  <p>
                    Cette action remplace la partie locale active. Exportez-la
                    si vous souhaitez conserver ce parcours et ses choix.
                  </p>
                  <div className="menu-actions">
                    <Button variant="outline" onClick={exportSave}>
                      Exporter avant de recommencer
                    </Button>
                    <Button onClick={reset}>
                      Confirmer la nouvelle partie
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setOverlay('pause')}
                    >
                      Annuler
                    </Button>
                  </div>
                </section>
              )}
              {overlay === 'export' && (
                <section className="menu-panel">
                  <p className="eyebrow">Continuité portable / JSON v5</p>
                  <h2>Votre sauvegarde vous appartient.</h2>
                  <p>
                    Téléchargez le fichier puis conservez-le hors du navigateur.
                    Si votre navigateur refuse le téléchargement, copiez le
                    contenu ci-dessous dans un fichier .json.
                  </p>
                  <a
                    className="save-download"
                    download={'soma-massilia-' + save.saveId + '.json'}
                    href={
                      'data:application/json;charset=utf-8,' +
                      encodeURIComponent(serializeSave(save))
                    }
                  >
                    Télécharger le fichier JSON
                  </a>
                  <label className="export-label" htmlFor="portable-save">
                    Contenu de la sauvegarde
                  </label>
                  <textarea
                    id="portable-save"
                    className="export-content"
                    readOnly
                    spellCheck={false}
                    value={serializeSave(save)}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <Button variant="outline" onClick={() => setOverlay('pause')}>
                    Retour au menu
                  </Button>
                </section>
              )}
              {overlay === 'help' && (
                <HelpPanel onClose={() => setOverlay('pause')} />
              )}
              {overlay === 'credits' && (
                <section className="menu-panel">
                  <p className="eyebrow">SOMA//MASSILIA · {GAME_VERSION}</p>
                  <h2>La Chair sous Licence</h2>
                  <p>
                    Univers original conçu avec l’utilisateur. Code, moteur
                    raycasté et musique procédurale créés pour ce projet.
                    Planches de personnages et couverture générées avec OpenAI.
                  </p>
                  <p>
                    Cette édition est une reconstruction de la conversation «
                    Concevoir un jeu cyberpunk ». L’archive originale annoncée
                    n’a pas été retrouvée. Aucun asset d’un jeu existant n’est
                    utilisé.
                  </p>
                  <p>
                    Fiction adulte : dette corporelle, coercition, perte
                    d’identité et violence stylisée. Tous les personnages sont
                    adultes ; aucune scène sexuellement explicite.
                  </p>
                  <p className="muted">
                    Édition 0.3.0 : prologue, campagne Incarnation, huit
                    secteurs explorables et Station Zéro. Une adaptation
                    raycastée originale du postulat, sans prétendre restaurer
                    l’archive perdue.
                  </p>
                  <Button onClick={() => setOverlay('pause')}>Retour</Button>
                </section>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ContractScreen({
  selectedBody,
  selectedRoute,
  onBody,
  onRoute,
  onStart,
  onHelp,
}: {
  selectedBody: BodyId;
  selectedRoute: RouteId;
  onBody: (id: BodyId) => void;
  onRoute: (id: RouteId) => void;
  onStart: () => void;
  onHelp: () => void;
}) {
  return (
    <section className="contract-screen">
      <div className="contract-art">
        <div className="contract-copy">
          <p className="eyebrow">
            LA CHAIR SOUS LICENCE / ÉDITION {GAME_VERSION}
          </p>
          <h1>
            SOMA<span>{'//'}</span>
            <br />
            MASSILIA
          </h1>
          <p>
            Votre corps est un abonnement.
            <br />
            Votre identité, une clause révocable.
          </p>
          <div className="contract-tags">
            <span>CHARGEZ VOTRE CONSCIENCE.</span>
            <span>CHOISISSEZ CE QUI RESTE HUMAIN.</span>
          </div>
        </div>
      </div>
      <aside className="contract-controls">
        <p className="eyebrow">Prologue / La Dette de Chair</p>
        <h2>Incarnez votre dette.</h2>
        <p className="muted">
          Trois corps loués. Trois manières de rompre le contrat.
        </p>
        <fieldset>
          <legend>01 / Enveloppe somatique</legend>
          {(Object.keys(BODIES) as BodyId[]).map((id) => (
            <button
              className={
                'selection-row ' + (selectedBody === id ? 'selected' : '')
              }
              key={id}
              aria-pressed={selectedBody === id}
              onClick={() => onBody(id)}
            >
              <span>
                <strong>{BODIES[id].name}</strong>
                <small>{BODIES[id].specialty}</small>
              </span>
              <span className="body-stats">
                {BODIES[id].integrity} PV
                <br />
                {BODIES[id].armor} BL
              </span>
            </button>
          ))}
          <p className="implant-readout">
            {BODIES[selectedBody].implants.join(' / ')}
          </p>
        </fieldset>
        <fieldset>
          <legend>02 / Méthode d’entrée</legend>
          <div className="route-tabs">
            {(Object.keys(ROUTES) as RouteId[]).map((id) => (
              <Button
                key={id}
                variant={selectedRoute === id ? 'default' : 'outline'}
                onClick={() => onRoute(id)}
                aria-pressed={selectedRoute === id}
              >
                {ROUTES[id].name}
              </Button>
            ))}
          </div>
          <p className="route-detail">{ROUTES[selectedRoute].detail}</p>
        </fieldset>
        <Button className="start-button" onClick={onStart}>
          Signer et incarner <span aria-hidden="true">→</span>
        </Button>
        <Button variant="ghost" onClick={onHelp}>
          Commandes & règles de jeu
        </Button>
        <p className="content-note">
          Fiction adulte · violence stylisée · aucune scène explicite
          <br />
          Clavier / souris · manette · tactile
        </p>
      </aside>
    </section>
  );
}

function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <section className="menu-panel">
      <p className="eyebrow">Guide de continuité</p>
      <h2>Commandes & règles</h2>
      <dl className="controls-list">
        <dt>WASD / ZQSD</dt>
        <dd>
          Déplacement. Auto suit les positions physiques ; disposition réglable
          dans Options.
        </dd>
        <dt>Flèches ← → / souris</dt>
        <dd>
          Tourner. Cliquez dans la vue pour capturer la souris. Échap libère et
          met en pause.
        </dd>
        <dt>Espace / clic</dt>
        <dd>
          Tirer. Maintenir pour le tir continu. La lame ne consomme pas de
          munitions.
        </dd>
        <dt>R / F / E</dt>
        <dd>Recharger / impulsion cybermancienne / interagir.</dd>
        <dt>1–4 / Maj / Ctrl</dt>
        <dd>
          Armes / courir / furtivité. La lame dans le dos inflige des dégâts
          triples.
        </dd>
        <dt>C / V / M</dt>
        <dd>
          Cortex / Spectre / carte agrandie. Tab fonctionne aussi quand la
          souris est capturée.
        </dd>
        <dt>B / Franchir</dt>
        <dd>
          Franchir un garde-corps bas si le sol derrière est libre. Coût : 8 de
          charge.
        </dd>
        <dt>Escouade Cortex</dt>
        <dd>
          Sélectionnez Nara, Idris ou Salomé, puis un ordre individuel. Cliquez
          sur la carte pour un déplacement ; choisissez le système ciblé pour
          gêner un adversaire.
        </dd>
        <dt>Manette standard</dt>
        <dd>
          Sticks : bouger / tourner. RT : tirer. A : agir. X : recharger. Y :
          impulsion. LB : Cortex. RB : arme. Select : Spectre. Start : pause.
        </dd>
        <dt>Tactile</dt>
        <dd>
          Pavé gauche : déplacement. Glissez sur la vue pour regarder. Tir et
          rotation à droite. Activation manuelle possible dans Options.
        </dd>
      </dl>
      <p>
        Les menus et intrusions suspendent les dangers. Le Cortex ralentit
        ennemis et armes. Le Spectre contrôle un drone et consomme de la charge.
        Votre corps reste vulnérable. Un implant cortical ou Interface III
        permet aussi la possession des hôtes humains.
      </p>
      <p>
        Après le prologue, six opérations se préparent à Station Zéro.
        Accomplissez les objectifs physiques, rejoignez le métro et choisissez
        votre décision pour recevoir les récompenses. Les relais territoriaux
        sont facultatifs. La retraite ne termine pas la mission.
      </p>
      <p>
        Les implants ont une capacité limitée ; les aptitudes utilisent un point
        tous les 200 XP. La location, la fatigue et les transferts ont un coût.
        Le refuge et le repos restaurent la continuité. Les choix finaux Exode
        numérique et Retour à la chair clôturent les expéditions.
      </p>
      <p>
        Piratage : rejoignez Ω par les nœuds reliés avant 100 % de trace. Les
        nœuds déjà capturés sont traversables gratuitement. Brûlure franchit la
        glace ; Fantôme diminue la trace. Chaque grille possède une route sans
        glace.
      </p>
      <Button onClick={onClose}>Retour</Button>
    </section>
  );
}

function CompleteScreen({
  save,
  onHub,
  onReset,
  onCredits,
}: {
  save: SaveData;
  onHub: () => void;
  onReset: () => void;
  onCredits: () => void;
}) {
  const ending = ENDINGS[save.ending ?? 'free'];
  return (
    <section className="ending-screen">
      <div>
        <p className="eyebrow">La Dette de Chair / Épilogue</p>
        <h1>{ending.title}</h1>
        <p>{ending.text}</p>
        <strong className="ending-stamp">CELLULE NULL FONDÉE</strong>
        <div className="end-stats">
          <span>{Math.floor(save.playtimeSeconds / 60)} MIN</span>
          <span>{save.statistics.kills} HOSTILES NEUTRALISÉS</span>
          <span>{save.resources.xp} XP</span>
          <span>{save.statistics.hacks} INTRUSIONS</span>
        </div>
        <div className="menu-actions">
          <Button onClick={onHub}>Continuer à Station Zéro</Button>
          <Button variant="outline" onClick={onCredits}>
            Crédits & provenance
          </Button>
          <Button variant="ghost" onClick={onReset}>
            Nouveau contrat
          </Button>
        </div>
        <p className="muted">
          Le prologue est terminé. La base et ses opérations restent jouables.
        </p>
      </div>
    </section>
  );
}
