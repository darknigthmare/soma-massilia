'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  captureHackNode,
  createHackState,
  suggestHackStep,
  type HackProgram,
} from '@/game/engine';

interface HackingGridProps {
  seed: number;
  targetName: string;
  assisted: boolean;
  extraBurns?: number;
  onComplete: (usedPuppet: boolean) => void;
  onCancel: () => void;
}

const PROGRAMS: {
  id: Exclude<HackProgram, 'none'>;
  label: string;
  glyph: string;
  help: string;
}[] = [
  {
    id: 'ghost',
    label: 'Fantôme',
    glyph: '◌',
    help: 'Réduit la trace de 12 %.',
  },
  {
    id: 'fork',
    label: 'Fourche',
    glyph: '⑂',
    help: 'Capture un nœud voisin supplémentaire.',
  },
  {
    id: 'burn',
    label: 'Brûlure',
    glyph: '×',
    help: 'Dissout une glace sans déclencher sa pénalité.',
  },
  {
    id: 'puppet',
    label: 'Marionnette',
    glyph: '◇',
    help: '+12 données ; retourne les drones de l’opération.',
  },
];

export function HackingGrid({
  seed,
  targetName,
  assisted,
  extraBurns = 0,
  onComplete,
  onCancel,
}: HackingGridProps) {
  const [state, setState] = useState(() => createHackState(seed, extraBurns));
  const [program, setProgram] = useState<HackProgram>('none');
  const [usedPuppet, setUsedPuppet] = useState(false);

  const available = useMemo(
    () =>
      state.nodes.filter((node) =>
        state.nodes[state.current].links.includes(node.id),
      ),
    [state],
  );

  const capture = (nodeId: number) => {
    const effective = program;
    const next = captureHackNode(state, nodeId, effective);
    if (next !== state) {
      setState(next);
      if (effective === 'puppet' && next.current === nodeId)
        setUsedPuppet(true);
      setProgram('none');
    }
  };

  const assist = () => {
    const step = suggestHackStep(state);
    if (step) setState(captureHackNode(state, step.nodeId, step.program));
  };

  return (
    <section
      className="hacking-panel pointer-events-auto w-full border border-accent/60 bg-[#071418] p-4 text-foreground sm:p-6"
      aria-labelledby="spectre-title"
    >
      <header className="flex items-start justify-between gap-4 border-b border-accent/25 pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-accent">
            Mode Spectre · intrusion active
          </p>
          <h2
            id="spectre-title"
            className="mt-1 text-xl font-black uppercase sm:text-2xl"
          >
            {targetName}
          </h2>
        </div>
        <Button
          variant="ghost"
          className="rounded-none font-mono text-xs"
          onClick={onCancel}
        >
          Éjecter
        </Button>
      </header>
      <p className="mt-3 text-sm text-muted-foreground">
        Rejoignez Ω avant 100 % de trace. Nœuds capturés : retour gratuit. Glace
        ◆ : Brûlure nécessaire.
      </p>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_190px]">
        <div>
          <div className="relative mx-auto aspect-square w-full max-w-[430px] border border-accent/20 bg-black/35 p-5">
            <svg
              className="absolute inset-5 h-[calc(100%-2.5rem)] w-[calc(100%-2.5rem)]"
              aria-hidden="true"
            >
              {state.nodes.flatMap((node) =>
                node.links
                  .filter((target) => target > node.id)
                  .map((target) => {
                    const linked = state.nodes[target];
                    const active = node.captured && linked.captured;
                    return (
                      <line
                        key={`${node.id}-${target}`}
                        x1={`${node.x * 25 + 1}%`}
                        y1={`${node.y * 25 + 1}%`}
                        x2={`${linked.x * 25 + 1}%`}
                        y2={`${linked.y * 25 + 1}%`}
                        stroke={active ? '#4de9d1' : '#28434a'}
                        strokeWidth={active ? 2.2 : 1}
                      />
                    );
                  }),
              )}
            </svg>
            <div className="relative grid h-full grid-cols-5 grid-rows-5 gap-2">
              {state.nodes.map((node) => {
                const selectable = available.some(
                  (item) => item.id === node.id,
                );
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => capture(node.id)}
                    disabled={!selectable || state.completed || state.failed}
                    aria-label={`Nœud ${node.id + 1}${node.target ? ', cible' : ''}${node.ice ? ', glace' : ''}`}
                    aria-current={
                      state.current === node.id ? 'step' : undefined
                    }
                    className={[
                      'relative z-10 m-auto grid size-9 place-items-center border font-mono text-xs transition sm:size-10',
                      node.target
                        ? 'rotate-45 border-primary bg-primary/15 text-primary'
                        : '',
                      node.captured
                        ? 'border-accent bg-accent text-accent-foreground shadow-[0_0_14px_rgb(77_233_209/35%)]'
                        : '',
                      selectable
                        ? 'cursor-pointer border-accent/80 bg-[#102a2d] hover:scale-110 hover:bg-accent/30'
                        : '',
                      !node.captured && !selectable && !node.target
                        ? 'border-[#294148] bg-[#0b181b] text-muted-foreground'
                        : '',
                    ].join(' ')}
                  >
                    <span className={node.target ? '-rotate-45' : ''}>
                      {node.target ? 'Ω' : node.ice ? '◆' : node.id + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
            <span>Trace</span>
            <div className="h-2 flex-1 border border-border bg-black/40">
              <div
                className={
                  state.trace > 70
                    ? 'h-full bg-destructive transition-all'
                    : 'h-full bg-primary transition-all'
                }
                style={{ width: `${Math.min(100, state.trace)}%` }}
              />
            </div>
            <span>{Math.round(state.trace)}%</span>
          </div>
        </div>

        <aside className="space-y-2">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Programmes
          </p>
          {PROGRAMS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={
                state.programs[item.id] <= 0 || state.completed || state.failed
              }
              onClick={() =>
                setProgram((current) =>
                  current === item.id ? 'none' : item.id,
                )
              }
              className={
                'w-full border p-3 text-left transition disabled:opacity-35 ' +
                (program === item.id
                  ? 'border-primary bg-primary/15'
                  : 'border-border bg-secondary/70 hover:border-accent/55')
              }
            >
              <span className="flex items-center justify-between">
                <strong className="text-xs uppercase">
                  {item.glyph} {item.label}
                </strong>
                <span className="font-mono text-xs text-accent">
                  ×{state.programs[item.id]}
                </span>
              </span>
              <span className="mt-1 block text-[10px] leading-relaxed text-muted-foreground">
                {item.help}
              </span>
            </button>
          ))}
          {assisted && !state.completed && !state.failed && (
            <Button
              variant="outline"
              className="mt-2 w-full rounded-none text-xs"
              onClick={assist}
            >
              Suggérer un chemin
            </Button>
          )}
        </aside>
      </div>

      {!state.completed && !state.failed && (
        <Button
          className="mt-3"
          variant="ghost"
          onClick={() => {
            setState(createHackState(state.seed, extraBurns));
            setUsedPuppet(false);
            setProgram('none');
          }}
        >
          Recommencer l’intrusion
        </Button>
      )}
      {(state.completed || state.failed) && (
        <div
          className={
            'mt-5 border p-4 ' +
            (state.completed
              ? 'border-accent bg-accent/10'
              : 'border-destructive bg-destructive/10')
          }
        >
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em]">
            {state.completed
              ? 'Racine capturée · signature falsifiée'
              : 'Trace critique · intrusion rejetée'}
          </p>
          <Button
            className="mt-3 rounded-none"
            variant={state.completed ? 'default' : 'outline'}
            onClick={() => {
              if (state.completed) onComplete(usedPuppet);
              else {
                setState(createHackState(state.seed + 1, extraBurns));
                setUsedPuppet(false);
                setProgram('none');
              }
            }}
          >
            {state.completed
              ? 'Injecter la commande'
              : 'Réancrer la conscience'}
          </Button>
        </div>
      )}
    </section>
  );
}
