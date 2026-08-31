'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CODEX_ENTRIES, FACTIONS } from '@/game/content';

interface CodexPanelProps {
  unlocked: string[];
  onClose: () => void;
}

export function CodexPanel({ unlocked, onClose }: CodexPanelProps) {
  const entries = CODEX_ENTRIES.filter((entry) => unlocked.includes(entry.id));
  const [selected, setSelected] = useState(entries[0]?.id ?? '');
  const entry = entries.find((item) => item.id === selected) ?? entries[0];

  return (
    <section
      className="pointer-events-auto grid max-h-[86dvh] w-[min(94vw,900px)] overflow-hidden border border-border bg-card/98 md:grid-cols-[260px_minmax(0,1fr)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="codex-title"
    >
      <aside className="max-h-[86dvh] overflow-y-auto border-b border-border bg-[#0a0f14] p-4 md:border-b-0 md:border-r">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
          Archive locale
        </p>
        <h2 id="codex-title" className="mt-1 text-2xl font-black uppercase">
          Codex
        </h2>
        <nav className="mt-5 grid gap-1" aria-label="Entrées du Codex">
          {entries.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              className={
                'border px-3 py-3 text-left ' +
                (item.id === entry?.id
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent hover:border-border hover:bg-secondary')
              }
            >
              <span className="block font-mono text-[9px] uppercase text-muted-foreground">
                {item.category}
              </span>
              <strong className="mt-1 block text-xs uppercase">
                {item.title}
              </strong>
            </button>
          ))}
        </nav>
      </aside>
      <article className="overflow-y-auto p-6 sm:p-9">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-primary">
              {entry?.category}
            </p>
            <h3 className="mt-2 text-3xl font-black uppercase sm:text-5xl">
              {entry?.title}
            </h3>
          </div>
          <Button variant="ghost" className="rounded-none" onClick={onClose}>
            Fermer
          </Button>
        </div>
        <p className="mt-8 max-w-2xl text-base leading-8 text-muted-foreground">
          {entry?.body}
        </p>
        {entry?.id === 'neo-massilia' && (
          <div className="mt-9 border-t border-border pt-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
              Forces en présence
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {FACTIONS.map((faction, index) => (
                <li
                  key={faction}
                  className="border border-border bg-secondary/45 p-3 text-xs uppercase"
                >
                  <span className="mr-3 font-mono text-muted-foreground">
                    0{index + 1}
                  </span>
                  {faction}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-10 border border-primary/25 bg-primary/5 p-4 text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Règle de continuité :</strong> une
          sauvegarde de conscience est une copie divergente, jamais une
          résurrection certaine.
        </div>
      </article>
    </section>
  );
}
