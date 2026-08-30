'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import type { GameSettings } from '@/game/types';

interface SettingsPanelProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onClose: () => void;
}

const TOGGLES: { key: keyof GameSettings; label: string; help: string }[] = [
  { key: 'subtitles', label: 'Sous-titres', help: 'Affiche toutes les répliques et annonces.' },
  { key: 'scanlines', label: 'Balayage CRT', help: 'Texture d’écran diégétique.' },
  { key: 'streamMode', label: 'Mode diffusion', help: 'Adoucit les références sensibles.' },
  { key: 'highContrast', label: 'Contraste renforcé', help: 'Renforce murs, cibles et texte.' },
  { key: 'reduceMotion', label: 'Mouvements réduits', help: 'Coupe balancement et transitions longues.' },
  { key: 'reduceFlashes', label: 'Flashs réduits', help: 'Supprime les éclairs de dégâts et de tir.' },
  { key: 'largeText', label: 'Texte agrandi', help: 'Augmente les informations critiques.' },
  { key: 'aimAssist', label: 'Aide à la visée', help: 'Élargit légèrement la cible au centre.' },
  { key: 'hackAssist', label: 'Aide Spectre', help: 'Propose un prochain nœud sûr.' },
];

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <section
      className="pointer-events-auto max-h-[88dvh] w-[min(92vw,720px)] overflow-y-auto border border-border bg-card/98 p-5 sm:p-7"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">Interface somatique</p>
          <h2 id="settings-title" className="mt-1 text-2xl font-black uppercase">Options & accessibilité</h2>
        </div>
        <Button variant="ghost" className="rounded-none" onClick={onClose}>Fermer</Button>
      </header>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-5">
          {([
            ['masterVolume', 'Volume général'],
            ['musicVolume', 'Ambiance'],
            ['sfxVolume', 'Effets'],
            ['sensitivity', 'Sensibilité'],
          ] as const).map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-2 flex justify-between text-xs uppercase">
                <span>{label}</span>
                <span className="font-mono text-muted-foreground">{Math.round(settings[key] * 100)}%</span>
              </span>
              <Slider
                value={[settings[key]]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={(value) => set(key, Array.isArray(value) ? value[0] : value)}
              />
            </label>
          ))}
          <label className="block">
            <span className="mb-2 block text-xs uppercase">Disposition clavier</span>
            <select
              value={settings.controlLayout}
              onChange={(event) => set('controlLayout', event.target.value as GameSettings['controlLayout'])}
              className="h-10 w-full border border-input bg-secondary px-3 text-sm"
            >
              <option value="auto">Automatique WASD / ZQSD</option>
              <option value="wasd">WASD</option>
              <option value="zqsd">ZQSD</option>
            </select>
          </label>
        </div>

        <div className="grid gap-2">
          {TOGGLES.map((item) => (
            <label key={item.key} className="flex cursor-pointer gap-3 border border-border bg-secondary/40 p-3">
              <Checkbox
                checked={Boolean(settings[item.key])}
                onCheckedChange={(checked) => set(item.key, Boolean(checked) as never)}
                aria-label={item.label}
              />
              <span>
                <strong className="block text-xs uppercase">{item.label}</strong>
                <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{item.help}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
