'use client';

import { Button } from '@/components/ui/button';
import { BODIES, STATION_INSTALLATIONS } from '@/game/content';
import type { BodyId, SaveData, StationLevels, TalentId } from '@/game/types';
import { OPERATIONS, TALENTS } from '@/game/narrative';
import { availableTalentPoints } from '@/game/progression';

interface StationZeroProps {
  save: SaveData;
  onUpgrade: (id: keyof StationLevels) => void;
  onFinish: () => void;
  onBodyChange: (id: BodyId) => void;
  onOperation: (id: 'velours' | 'mistral' | 'phocee') => void;
  onOpenCodex: () => void;
  onTalent: (id: TalentId) => void;
}

export function StationZero({
  save,
  onUpgrade,
  onFinish,
  onBodyChange,
  onOperation,
  onOpenCodex,
  onTalent,
}: StationZeroProps) {
  const hasUpgrade = Object.entries(save.station).some(
    ([id, level]) => id !== 'core' && level > 0,
  );

  return (
    <section className="h-full overflow-y-auto bg-[#080d12] px-4 pb-24 pt-5 text-foreground sm:px-7 sm:pt-7">
      <header className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-5 border-b border-primary/30 pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-primary">
            Cellule NULL · hub clandestin
          </p>
          <h2 className="mt-1 text-4xl font-black uppercase tracking-[-0.04em] sm:text-6xl">
            Station Zéro
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Ici, aucune conscience n’est appelée originale. Seulement présente.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-px border border-border bg-border font-mono text-[10px] uppercase">
          {[
            ['Crédits', save.resources.credits],
            ['Influence', save.resources.influence],
            ['Ferraille', save.resources.salvage],
            ['Données', save.resources.data],
          ].map(([label, value]) => (
            <div key={label} className="bg-card px-3 py-2 text-center">
              <span className="block text-muted-foreground">{label}</span>
              <strong className="mt-1 block text-sm text-accent">
                {value}
              </strong>
            </div>
          ))}
        </div>
      </header>

      <div className="mx-auto mt-6 grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold uppercase tracking-[0.24em]">
              Installations / niveau 0–3
            </h3>
            <span className="font-mono text-[10px] text-muted-foreground">
              Cœur max : {save.station.core}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STATION_INSTALLATIONS.map((installation) => {
              const id = installation.id as keyof StationLevels;
              const level = save.station[id];
              const nextLevel = Math.min(3, level + 1);
              const cost = installation.cost[nextLevel];
              const cap = id === 'core' ? 3 : Math.max(1, save.station.core);
              const blocked =
                level >= 3 || nextLevel > cap || save.resources.salvage < cost;
              return (
                <article
                  key={id}
                  className="flex min-h-52 flex-col border border-border bg-card/80 p-4"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-3xl text-primary" aria-hidden="true">
                      {installation.icon}
                    </span>
                    <span className="font-mono text-xs text-accent">
                      NIV. {level}/3
                    </span>
                  </div>
                  <h4 className="mt-4 font-bold uppercase">
                    {installation.name}
                  </h4>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {installation.description}
                  </p>
                  <Button
                    aria-label={'Améliorer ' + installation.name}
                    variant={level === 0 ? 'default' : 'outline'}
                    className="mt-4 w-full rounded-none text-xs"
                    disabled={blocked}
                    onClick={() => onUpgrade(id)}
                  >
                    {level >= 3
                      ? 'Maximal'
                      : nextLevel > cap
                        ? 'Cœur insuffisant'
                        : `Améliorer · ${cost} F`}
                  </Button>
                </article>
              );
            })}
          </div>

          <div className="mt-7">
            <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.24em]">
              Mode Syndicat · opérations
            </h3>
            <div className="grid gap-3 lg:grid-cols-3">
              {OPERATIONS.map((operation) => {
                const completed = save.operations[operation.id];
                return (
                  <article
                    key={operation.id}
                    className="border border-border bg-secondary/45 p-4"
                  >
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
                      {operation.faction}
                    </p>
                    <h4 className="mt-2 font-bold uppercase">
                      {operation.title}
                    </h4>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {operation.description}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {operation.reward}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 w-full rounded-none text-xs"
                      aria-label={'Lancer ' + operation.title}
                      onClick={() => onOperation(operation.id)}
                    >
                      {completed
                        ? 'Rejouer · rang ' + (completed + 1)
                        : 'Partir en opération'}
                    </Button>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="border border-accent/35 bg-card p-4">
            <p className="font-mono text-xs uppercase text-accent">
              Conscience / {save.resources.xp} XP
            </p>
            <h3 className="mt-2 text-xl font-bold">
              {availableTalentPoints(save)} points de talent
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Un point tous les 200 XP. Effets appliqués au départ des missions.
            </p>
            <div className="mt-3 space-y-2">
              {TALENTS.map((talent) => (
                <div key={talent.id} className="border border-border p-3">
                  <strong className="text-sm">
                    {talent.name} · {save.talents[talent.id]}/3
                  </strong>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {talent.description}
                  </p>
                  <Button
                    size="sm"
                    className="mt-2"
                    variant="outline"
                    disabled={
                      availableTalentPoints(save) < 1 ||
                      save.talents[talent.id] >= 3
                    }
                    onClick={() => onTalent(talent.id)}
                  >
                    Apprendre {talent.name}
                  </Button>
                </div>
              ))}
            </div>
          </section>
          <section className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Clinique des Corps
            </p>
            <h3 className="mt-1 text-lg font-black uppercase">
              Enveloppe active
            </h3>
            <div className="mt-4 space-y-2">
              {(Object.keys(BODIES) as BodyId[]).map((id) => {
                const body = BODIES[id];
                const unlocked = save.bodies[id].unlocked;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => onBodyChange(id)}
                    className={
                      'w-full border p-3 text-left disabled:opacity-35 ' +
                      (save.campaign.bodyId === id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-secondary/40')
                    }
                  >
                    <span className="flex justify-between text-xs font-bold uppercase">
                      <span>{body.name}</span>
                      <span className="font-mono text-accent">
                        {unlocked ? `NIV. ${save.bodies[id].level}` : 'VERROU'}
                      </span>
                    </span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {body.specialty}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border border-accent/35 bg-accent/5 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
              Nara Velvet · confiance {save.companions.nara.trust}
            </p>
            <blockquote className="mt-3 text-sm leading-relaxed">
              « On n’a pas sauvé nos corps. On a récupéré le droit de décider
              qui les perdra ensuite. »
            </blockquote>
          </section>

          <Button
            variant="outline"
            className="w-full rounded-none"
            onClick={onOpenCodex}
          >
            Ouvrir le Codex permanent
          </Button>
          <Button
            className="h-12 w-full rounded-none font-bold uppercase"
            onClick={onFinish}
          >
            Continuer la campagne Incarnation
          </Button>
          {!hasUpgrade && (
            <p className="text-center text-[10px] text-muted-foreground">
              Améliorez une installation pour sceller le chapitre.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
