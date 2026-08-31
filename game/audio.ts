import type { GameSettings, WeaponId } from './types';

type SfxName =
  | 'boot'
  | 'interact'
  | 'hack'
  | 'success'
  | 'damage'
  | 'impulse'
  | 'upgrade'
  | 'denied';

export class SomaAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private ambience: OscillatorNode[] = [];
  private settings: GameSettings;

  constructor(settings: GameSettings) {
    this.settings = settings;
  }

  async unlock(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!this.context) {
      const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioCtor) return;
      this.context = new AudioCtor();
      this.master = this.context.createGain();
      this.music = this.context.createGain();
      this.sfx = this.context.createGain();
      this.music.connect(this.master);
      this.sfx.connect(this.master);
      this.master.connect(this.context.destination);
      this.createAmbience();
      this.applySettings(this.settings);
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  applySettings(settings: GameSettings): void {
    this.settings = settings;
    if (!this.context || !this.master || !this.music || !this.sfx) return;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(settings.masterVolume, now, 0.02);
    this.music.gain.setTargetAtTime(settings.musicVolume * 0.22, now, 0.05);
    this.sfx.gain.setTargetAtTime(settings.sfxVolume * 0.42, now, 0.02);
  }

  private createAmbience(): void {
    if (!this.context || !this.music || this.ambience.length) return;
    const frequencies = [43.65, 65.41, 98];
    frequencies.forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      const lfo = this.context!.createOscillator();
      const lfoGain = this.context!.createGain();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.11 : 0.035;
      lfo.frequency.value = 0.025 + index * 0.017;
      lfoGain.gain.value = 0.012;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      oscillator.connect(gain);
      gain.connect(this.music!);
      oscillator.start();
      lfo.start();
      this.ambience.push(oscillator, lfo);
    });
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    detune = 0,
    delay = 0,
  ): void {
    if (!this.context || !this.sfx) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.001, volume),
      start + 0.008,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.sfx);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  play(name: SfxName): void {
    if (!this.context) return;
    const recipes: Record<SfxName, () => void> = {
      boot: () => {
        this.tone(110, 0.28, 'sine', 0.18);
        this.tone(330, 0.16, 'triangle', 0.1, 0, 0.12);
      },
      interact: () => this.tone(420, 0.1, 'square', 0.08),
      hack: () => {
        this.tone(620, 0.08, 'square', 0.08);
        this.tone(930, 0.08, 'square', 0.06, 0, 0.06);
      },
      success: () => {
        this.tone(392, 0.2, 'sine', 0.09);
        this.tone(587, 0.28, 'sine', 0.08, 0, 0.1);
      },
      damage: () => this.tone(72, 0.28, 'sawtooth', 0.16, -600),
      impulse: () => {
        this.tone(55, 0.5, 'sine', 0.22);
        this.tone(880, 0.18, 'sawtooth', 0.06, -1200);
      },
      upgrade: () => {
        [220, 277, 330, 440].forEach((frequency, index) =>
          this.tone(frequency, 0.24, 'triangle', 0.075, 0, index * 0.07),
        );
      },
      denied: () => {
        this.tone(120, 0.12, 'square', 0.1);
        this.tone(90, 0.18, 'square', 0.08, 0, 0.08);
      },
    };
    recipes[name]();
  }

  fire(weapon: WeaponId): void {
    if (!this.context) return;
    if (weapon === 'blade') {
      this.tone(760, 0.12, 'sawtooth', 0.07, -1400);
      return;
    }
    const frequency = weapon === 'rifle' ? 52 : weapon === 'smg' ? 86 : 72;
    const duration = weapon === 'rifle' ? 0.22 : 0.13;
    this.tone(
      frequency,
      duration,
      'sawtooth',
      weapon === 'rifle' ? 0.23 : 0.16,
    );
    this.tone(frequency * 4, duration * 0.55, 'square', 0.05, -700);
  }

  reload(weapon: WeaponId): void {
    this.tone(weapon === 'rifle' ? 180 : 230, 0.08, 'square', 0.06);
    this.tone(weapon === 'smg' ? 310 : 270, 0.08, 'square', 0.05, 0, 0.32);
  }

  dispose(): void {
    this.ambience.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        // Already stopped.
      }
    });
    this.ambience = [];
    void this.context?.close();
    this.context = null;
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
