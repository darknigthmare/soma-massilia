'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Download, RotateCcw, Settings, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BODIES, GAME_VERSION, ROUTES, STAGE_COPY } from '@/game/content';
import { SomaAudio } from '@/game/audio';
import { DEFAULT_SETTINGS, createNewSave, deserializeSave, loadLocalSave, persistLocalSave, serializeSave } from '@/game/save';
import { advanceCampaign, beginCampaign, resolveSyndicateOperation, setNaraOrder, upgradeStation } from '@/game/progression';
import type { BodyId, GameMode, RouteId, SaveData, StationLevels, WeaponId } from '@/game/types';
import { CodexPanel } from './CodexPanel';
import { HackingGrid } from './HackingGrid';
import { RaycastViewport } from './RaycastViewport';
import { SettingsPanel } from './SettingsPanel';
import { StationZero } from './StationZero';

type Overlay = 'none' | 'settings' | 'codex' | 'death';
type HackTarget = { id: string; label: string; seed: number } | null;

const DIALOGUE: Record<string, { speaker: string; line: string }[]> = {
  contract: [
    { speaker: 'VÉNUS', line: 'Néo-Massilia, 2197. Ta chair est louée, ta dette respire encore.' },
    { speaker: 'LE REVENANT', line: 'Alors on commence par voler la clause qui me possède.' },
  ],
  docks: [
    { speaker: 'VÉNUS', line: 'Le registre dort dans les Docks de Velours. Il sait à qui appartient ton pouls.' },
  ],
  revocation: [
    { speaker: 'SÔMA', line: 'Licence somatique révoquée. Veuillez rester conscient pendant la reprise de propriété.' },
    { speaker: 'VÉNUS', line: 'Cours. Installe ma racine avant que tes muscles deviennent juridiques.' },
  ],
  nara: [
    { speaker: 'NARA VELVET', line: 'Tu veux ma carte des identités ? Commence par ouvrir cette cage.' },
  ],
  collector: [
    { speaker: 'LE COLLECTEUR', line: 'On ne tue pas une fonction. On la transfère.' },
    { speaker: 'NARA VELVET', line: 'Alors coupe ses ancres, Revenant. Après, il restera seulement un corps qui a peur.' },
  ],
  station: [
    { speaker: 'VÉNUS', line: 'Station Zéro répond. Six installations, une cellule, aucune garantie de salut.' },
  ],
};

function unlockedWeapons(save: SaveData): WeaponId[] {
  return (Object.keys(save.weapons) as WeaponId[]).filter((id) => save.weapons[id].unlocked);
}

function eventForTerminal(id: string): 'registry-hacked' | 'root-installed' | 'nara-freed' | null {
  if (id === 'registry') return 'registry-hacked';
  if (id === 'root') return 'root-installed';
  if (id === 'nara-cell') return 'nara-freed';
  return null;
}

export function SomaGame() {
  const [save, setSave] = useState<SaveData | null>(null);
  const [selectedBody, setSelectedBody] = useState<BodyId>('mistral');
  const [selectedRoute, setSelectedRoute] = useState<RouteId>('identity');
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponId>('pistol');
  const [mode, setMode] = useState<GameMode>('chair');
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [hack, setHack] = useState<HackTarget>(null);
  const [message, setMessage] = useState<string>('');
  const [gameKey, setGameKey] = useState(0);
  const audioRef = useRef<SomaAudio | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loaded = loadLocalSave() ?? createNewSave();
    setSave(loaded);
    setSelectedBody(loaded.campaign.bodyId ?? 'mistral');
    setSelectedRoute(loaded.campaign.route ?? 'identity');
  }, []);

  useEffect(() => {
    if (!save) return;
    persistLocalSave(save);
    document.documentElement.classList.toggle('soma-large-text', save.settings.largeText);
    document.documentElement.classList.toggle('soma-no-scanlines', !save.settings.scanlines);
  }, [save]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!save) return;
    audioRef.current?.applySettings(save.settings);
  }, [save]);

  const arsenal = useMemo(() => (save ? unlockedWeapons(save) : []), [save]);

  if (!save) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background text-foreground">
        <div className="scanlines" aria-hidden="true" />
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-primary">Synchronisation corticale...</p>
      </main>
    );
  }

  const stage = save.campaign.stage;
  const stageCopy = STAGE_COPY[stage];
  const bodyId = save.campaign.bodyId ?? selectedBody;

  const unlockAudio = async () => {
    if (!audioRef.current) audioRef.current = new SomaAudio(save.settings);
    await audioRef.current.unlock();
  };

  const play = (name: 'boot' | 'interact' | 'hack' | 'success' | 'damage' | 'impulse' | 'upgrade' | 'denied', weapon?: WeaponId) => {
    if (weapon) audioRef.current?.fire(weapon);
    else audioRef.current?.play(name);
  };

  const updateSave = (updater: (current: SaveData) => SaveData, sound?: Parameters<typeof play>[0]) => {
    setSave((current) => {
      const next = updater(current ?? createNewSave());
      return persistLocalSave(next);
    });
    if (sound) play(sound);
  };

  const startCampaign = async () => {
    await unlockAudio();
    play('boot');
    updateSave((current) => beginCampaign(current, selectedBody, selectedRoute));
    setSelectedWeapon('pistol');
    setMessage('VÉNUS injectée. La Dette de Chair commence aux Docks de Velours.');
  };

  const handleEvent = (event: Parameters<typeof advanceCampaign>[1]) => {
    updateSave((current) => advanceCampaign(current, event), event === 'collector-transfer' ? 'damage' : 'success');
    if (event !== 'anchor-destroyed') setGameKey((key) => key + 1);
    const lines = {
      'registry-hacked': 'Le registre est copié. SÔMA déclenche la révocation corporelle.',
      'root-installed': 'La racine clandestine maintient ta conscience active. Direction Nara Velvet.',
      'nara-freed': 'Nara rejoint la Cellule NULL. Le Collecteur verrouille ses ancres.',
      'anchor-destroyed': 'Ancre coupée. La conscience du Collecteur perd une issue.',
      'collector-transfer': 'Le Collecteur transfère sa conscience dans une autre enveloppe.',
      'collector-defeated': 'Le Collecteur tombe. Station Zéro s’allume sous la ville.',
    }[event];
    setMessage(lines ?? 'Etat de campagne synchronise.');
  };

  const completeHack = (usedPuppet: boolean) => {
    if (!hack) return;
    const event = eventForTerminal(hack.id);
    setHack(null);
    setMode('chair');
    if (event) handleEvent(event);
    if (usedPuppet) {
      updateSave((current) => ({ ...current, resources: { ...current.resources, data: current.resources.data + 12 }, achievements: [...new Set([...current.achievements, 'spectre-marionnette'])] }));
    }
  };

  const exportSave = () => {
    const blob = new Blob([serializeSave(save)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `soma-massilia-${save.saveId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSave = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imported = deserializeSave(await file.text());
      setSave(persistLocalSave(imported));
      setSelectedBody(imported.campaign.bodyId ?? 'mistral');
      setSelectedRoute(imported.campaign.route ?? 'identity');
      setSelectedWeapon(unlockedWeapons(imported)[0] ?? 'pistol');
      setMessage('Sauvegarde importée et migrée.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import impossible.');
      play('denied');
    }
  };

  const reset = () => {
    const fresh = createNewSave(save?.settings ?? DEFAULT_SETTINGS);
    setSave(persistLocalSave(fresh));
    setSelectedBody('mistral');
    setSelectedRoute('identity');
    setSelectedWeapon('pistol');
    setGameKey((key) => key + 1);
    setMessage('Nouvelle dette ouverte.');
  };

  const chrome = (
    <div className="fixed right-3 top-3 z-40 flex gap-1">
      <Button size="icon" variant="outline" className="rounded-none bg-background/85" onClick={() => setOverlay('codex')} aria-label="Codex"><BookOpen className="size-4" /></Button>
      <Button size="icon" variant="outline" className="rounded-none bg-background/85" onClick={() => setOverlay('settings')} aria-label="Options"><Settings className="size-4" /></Button>
      <Button size="icon" variant="outline" className="rounded-none bg-background/85" onClick={exportSave} aria-label="Exporter"><Download className="size-4" /></Button>
      <Button size="icon" variant="outline" className="rounded-none bg-background/85" onClick={() => inputRef.current?.click()} aria-label="Importer"><Upload className="size-4" /></Button>
      <input ref={inputRef} type="file" accept="application/json" className="hidden" onChange={(event) => void importSave(event.target.files?.[0])} />
    </div>
  );

  return (
    <main className="min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="scanlines" aria-hidden="true" />
      {chrome}
      {stage === 'contract' ? (
        <ContractScreen selectedBody={selectedBody} selectedRoute={selectedRoute} onBody={setSelectedBody} onRoute={setSelectedRoute} onStart={() => void startCampaign()} hasSave={save.campaign.stage !== 'contract'} onReset={reset} />
      ) : stage === 'complete' ? (
        <CompleteScreen save={save} onReset={reset} onCodex={() => setOverlay('codex')} />
      ) : stage === 'station' ? (
        <StationZero
          save={save}
          onUpgrade={(id: keyof StationLevels) => updateSave((current) => upgradeStation(current, id), 'upgrade')}
          onFinish={() => handleEvent('station-upgraded')}
          onBodyChange={(id) => updateSave((current) => ({ ...current, campaign: { ...current.campaign, bodyId: id } }))}
          onOperation={(id) => updateSave((current) => resolveSyndicateOperation(current, id), 'success')}
          onOpenCodex={() => setOverlay('codex')}
        />
      ) : (
        <RaycastViewport
          key={`${stage}-${gameKey}-${bodyId}`}
          stage={stage}
          route={save.campaign.route}
          bodyId={bodyId}
          unlockedWeapons={arsenal}
          selectedWeapon={selectedWeapon}
          settings={save.settings}
          mode={mode}
          naraOrder={save.companions.nara.order}
          collectorAnchors={save.campaign.collectorAnchors}
          onEvent={handleEvent}
          onModeChange={setMode}
          onWeaponChange={setSelectedWeapon}
          onHackRequest={(id, label) => setHack({ id, label, seed: Math.abs(Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0) + save.resources.data + save.resources.xp) })}
          onNaraOrder={(order) => updateSave((current) => setNaraOrder(current, order))}
          onLoot={() => updateSave((current) => ({ ...current, resources: { ...current.resources, credits: current.resources.credits + 45, salvage: current.resources.salvage + 35, data: current.resources.data + 10 }, weapons: { ...current.weapons, smg: { ...current.weapons.smg, unlocked: true } } }))}
          onDeath={() => setOverlay('death')}
          onSound={play}
        />
      )}

      <StoryRail stage={stageCopy} lines={DIALOGUE[stage] ?? []} message={message} version={GAME_VERSION} onReset={reset} />

      {(hack || overlay !== 'none') && <div className="fixed inset-0 z-50 grid place-items-center bg-black/72 p-3 backdrop-blur-sm">{hack && <HackingGrid seed={hack.seed} targetName={hack.label} assisted={save.settings.hackAssist} onComplete={completeHack} onCancel={() => { setHack(null); setMode('chair'); }} />}{overlay === 'codex' && <CodexPanel unlocked={save.codex} onClose={() => setOverlay('none')} />}{overlay === 'settings' && <SettingsPanel settings={save.settings} onChange={(settings) => setSave((current) => current ? { ...current, settings } : current)} onClose={() => setOverlay('none')} />}{overlay === 'death' && <DeathPanel onRetry={() => { setOverlay('none'); setGameKey((key) => key + 1); }} onReset={reset} />}</div>}
    </main>
  );
}

function ContractScreen({ selectedBody, selectedRoute, onBody, onRoute, onStart, onReset }: { selectedBody: BodyId; selectedRoute: RouteId; onBody: (id: BodyId) => void; onRoute: (id: RouteId) => void; onStart: () => void; hasSave: boolean; onReset: () => void }) {
  return (
    <section className="grid min-h-dvh gap-6 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:px-8">
      <div className="flex min-h-[52dvh] flex-col justify-between border-b border-primary/25 pb-5 lg:border-b-0 lg:pb-0">
        <header className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground"><span>Néo-Massilia · 2197</span><span className="ml-4 text-primary">Licence somatique révocable</span></header>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.34em] text-accent">Vertical Slice 0.1.0 · reconstruction originale</p>
          <h1 className="mt-3 max-w-5xl text-balance text-[clamp(3.5rem,11vw,10rem)] font-black uppercase leading-[0.84]">SOMA<span className="text-primary">{'//'}</span>MASSILIA</h1>
          <p className="mt-5 max-w-2xl border-l-2 border-primary pl-5 text-lg leading-relaxed text-muted-foreground">Votre corps est un abonnement. Votre identité, une clause révocable.</p>
        </div>
        <footer className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Action-RPG raycasté · Chair · Cortex · Spectre · Syndicat</footer>
      </div>
      <aside className="h-full overflow-y-auto border border-border bg-card/88 p-4 backdrop-blur lg:p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Contrat de chair</p>
        <h2 className="mt-1 text-2xl font-black uppercase">Choisir une enveloppe</h2>
        <div className="mt-4 grid gap-2">
          {(Object.keys(BODIES) as BodyId[]).map((id) => <button key={id} type="button" onClick={() => onBody(id)} className={'border p-3 text-left ' + (selectedBody === id ? 'border-primary bg-primary/12' : 'border-border bg-secondary/50')}><span className="flex justify-between text-sm font-black uppercase"><span>{BODIES[id].name}</span><span className="font-mono text-accent">{BODIES[id].integrity}/{BODIES[id].armor}</span></span><span className="mt-1 block text-xs text-muted-foreground">{BODIES[id].specialty}</span><span className="mt-2 block font-mono text-[10px] uppercase text-primary">{BODIES[id].implants.join(' · ')}</span></button>)}
        </div>
        <h2 className="mt-5 text-2xl font-black uppercase">Méthode d’entrée</h2>
        <div className="mt-3 grid gap-2">
          {(Object.keys(ROUTES) as RouteId[]).map((id) => <button key={id} type="button" onClick={() => onRoute(id)} className={'border p-3 text-left ' + (selectedRoute === id ? 'border-accent bg-accent/12' : 'border-border bg-secondary/50')}><span className="flex justify-between text-xs font-bold uppercase"><span>{ROUTES[id].name}</span><span className="font-mono text-accent">{ROUTES[id].subtitle}</span></span><span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{ROUTES[id].detail}</span></button>)}
        </div>
        <Button className="mt-5 h-12 w-full rounded-none font-mono font-bold uppercase tracking-[0.14em]" onClick={onStart}>Signer et incarner</Button>
        <Button variant="ghost" className="mt-2 w-full rounded-none text-xs" onClick={onReset}><RotateCcw className="mr-2 size-3" /> Réinitialiser</Button>
      </aside>
    </section>
  );
}

function StoryRail({ stage, lines, message, version, onReset }: { stage: { act: string; title: string; objective: string }; lines: { speaker: string; line: string }[]; message: string; version: string; onReset: () => void }) {
  return <aside className="pointer-events-none fixed left-3 top-3 z-30 hidden max-w-[410px] border border-border bg-background/82 p-3 backdrop-blur xl:block"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{stage.act} · v{version}</p><h2 className="mt-1 text-lg font-black uppercase">{stage.title}</h2><p className="mt-1 text-xs text-muted-foreground">{stage.objective}</p>{lines.map((line) => <p key={line.speaker + line.line} className="mt-2 text-xs leading-relaxed"><strong className="text-accent">{line.speaker}</strong> · {line.line}</p>)}{message && <p className="mt-3 border-t border-border pt-2 text-xs text-primary">{message}</p>}<button type="button" className="pointer-events-auto mt-3 font-mono text-[10px] uppercase text-muted-foreground hover:text-primary" onClick={onReset}>nouvelle partie</button></aside>;
}

function DeathPanel({ onRetry, onReset }: { onRetry: () => void; onReset: () => void }) {
  return <section className="w-[min(92vw,480px)] border border-destructive bg-card p-6 text-center"><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-destructive">Révocation complète</p><h2 className="mt-2 text-3xl font-black uppercase">Conscience isolée</h2><p className="mt-3 text-sm text-muted-foreground">La sauvegarde locale reste intacte. Reprends au seuil de la zone ou rouvre une nouvelle dette.</p><div className="mt-5 flex gap-2"><Button className="flex-1 rounded-none" onClick={onRetry}>Reprendre</Button><Button className="flex-1 rounded-none" variant="outline" onClick={onReset}>Nouveau contrat</Button></div></section>;
}

function CompleteScreen({ save, onReset, onCodex }: { save: SaveData; onReset: () => void; onCodex: () => void }) {
  return (
    <section className="grid min-h-dvh place-items-center bg-[#06080b] px-4 py-10 text-center">
      <div className="w-[min(980px,94vw)] border border-primary/45 bg-card/90 p-6 shadow-[0_0_80px_rgb(214_106_61/10%)] sm:p-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-primary">Vertical Slice 0.1.0 terminee</p>
        <h1 className="mt-3 text-4xl font-black uppercase leading-none sm:text-7xl">Cellule NULL fondee</h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">
          Le Revenant, VÉNUS et Nara Velvet tiennent Station Zéro. Le Collecteur a perdu ses ancres, mais Néo-Massilia conserve encore des contrats a rompre.
        </p>
        <div className="mx-auto mt-7 grid max-w-2xl grid-cols-3 gap-px border border-border bg-border font-mono text-[10px] uppercase">
          <div className="bg-background p-3"><span className="block text-muted-foreground">XP</span><strong className="text-accent">{save.resources.xp}</strong></div>
          <div className="bg-background p-3"><span className="block text-muted-foreground">Données</span><strong className="text-accent">{save.resources.data}</strong></div>
          <div className="bg-background p-3"><span className="block text-muted-foreground">Succès</span><strong className="text-accent">{save.achievements.length}</strong></div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button className="rounded-none" onClick={onCodex}>Lire le Codex</Button>
          <Button className="rounded-none" variant="outline" onClick={onReset}>Nouvelle partie</Button>
        </div>
      </div>
    </section>
  );
}
