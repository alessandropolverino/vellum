import { SfxItem, SynthPresetId } from '../types/dnd';
import { storageRepository } from './storageRepository';

interface ActiveTrack {
  sfxId: string;
  name: string;
  loop: boolean;
  stopFn: () => void;
  setVolumeFn: (vol: number) => void;
}

class SoundboardEngine {
  private ctx: AudioContext | null = null;
  private activeTracks: Map<string, ActiveTrack> = new Map();
  private listeners: Set<() => void> = new Set();
  private masterVolume = 0.85;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  isPlaying(sfxId: string): boolean {
    return this.activeTracks.has(sfxId);
  }

  getActiveTrackIds(): string[] {
    return Array.from(this.activeTracks.keys());
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this.notify();
  }

  stop(sfxId: string) {
    const track = this.activeTracks.get(sfxId);
    if (track) {
      track.stopFn();
      this.activeTracks.delete(sfxId);
      this.notify();
    }
  }

  stopAll() {
    for (const track of this.activeTracks.values()) {
      track.stopFn();
    }
    this.activeTracks.clear();
    this.notify();
  }

  toggle(item: SfxItem) {
    if (this.isPlaying(item.id)) {
      this.stop(item.id);
    } else {
      this.play(item);
    }
  }

  play(item: SfxItem) {
    // If looping track is already active, toggle it off; if one-shot, restart it
    if (this.activeTracks.has(item.id)) {
      this.stop(item.id);
      if (item.loop) return;
    }

    const effectiveVolume = item.defaultVolume * this.masterVolume;

    // 1. If user provided a custom audio file URL / DataURL / media protocol, play via HTMLAudioElement
    if (item.customAudioUrl && item.customAudioUrl.trim().length > 0) {
      this.activeTracks.set(item.id, {
        sfxId: item.id,
        name: item.name,
        loop: item.loop,
        stopFn: () => {},
        setVolumeFn: () => {},
      });
      this.notify();

      storageRepository.resolveAudioUrl(item.customAudioUrl).then((resolvedUrl) => {
        if (!this.activeTracks.has(item.id)) return;
        const audio = new Audio(resolvedUrl);
        audio.loop = item.loop;
        audio.volume = Math.max(0, Math.min(1, effectiveVolume));
        audio.onended = () => {
          if (!item.loop) {
            this.activeTracks.delete(item.id);
            this.notify();
          }
        };
        audio.play().catch((err) => {
          console.warn('Errore riproduzione file audio custom, fallback su synth:', err);
          this.playProceduralSynth(item, effectiveVolume);
        });

        const track = this.activeTracks.get(item.id);
        if (track) {
          track.stopFn = () => {
            audio.pause();
            audio.currentTime = 0;
          };
          track.setVolumeFn = (v) => {
            audio.volume = Math.max(0, Math.min(1, v * this.masterVolume));
          };
        }
      });
      return;
    }

    // 2. Built-in procedural Web Audio synthesizer
    this.playProceduralSynth(item, effectiveVolume);
  }

  private createNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private playProceduralSynth(item: SfxItem, volume: number) {
    const ctx = this.getContext();
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.01, volume), ctx.currentTime);
    masterGain.connect(ctx.destination);

    let stopped = false;
    const cleanupFns: Array<() => void> = [];

    const registerCleanup = (fn: () => void) => cleanupFns.push(fn);

    const finishOneShot = (durationMs: number) => {
      const timer = window.setTimeout(() => {
        if (!stopped) {
          this.activeTracks.delete(item.id);
          this.notify();
        }
      }, durationMs);
      registerCleanup(() => window.clearTimeout(timer));
    };

    const preset: SynthPresetId = item.synthPreset || 'thunder_clap';
    const now = ctx.currentTime;

    switch (preset) {
      case 'tavern_hearth':
      case 'rain_storm':
      case 'dungeon_wind': {
        // Warm crackling fire or rain ambience loop
        const noise = ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(ctx, 4);
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = preset === 'rain_storm' ? 'bandpass' : 'lowpass';
        filter.frequency.value = preset === 'rain_storm' ? 950 : 360;

        noise.connect(filter);
        filter.connect(masterGain);
        noise.start();
        registerCleanup(() => {
          try {
            noise.stop();
          } catch {}
        });

        // Subtle crackle/gust interval
        const interval = window.setInterval(() => {
          if (stopped) return;
          const popOsc = ctx.createOscillator();
          const popGain = ctx.createGain();
          popOsc.type = 'triangle';
          popOsc.frequency.setValueAtTime(
            preset === 'rain_storm' ? 180 + Math.random() * 120 : 90 + Math.random() * 220,
            ctx.currentTime
          );
          popGain.gain.setValueAtTime(0.08, ctx.currentTime);
          popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
          popOsc.connect(popGain);
          popGain.connect(masterGain);
          popOsc.start();
          popOsc.stop(ctx.currentTime + 0.13);
        }, preset === 'rain_storm' ? 450 : 280);

        registerCleanup(() => window.clearInterval(interval));
        if (!item.loop) finishOneShot(4000);
        break;
      }

      case 'crypt_whispers': {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sawtooth';
        osc1.frequency.value = 65.41; // C2 drone
        osc2.frequency.value = 98.0; // G2 fifth

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 240;

        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.25;
        lfoGain.gain.value = 90;
        lfo.connect(filter.frequency);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(masterGain);

        osc1.start();
        osc2.start();
        lfo.start();
        registerCleanup(() => {
          try {
            osc1.stop();
            osc2.stop();
            lfo.stop();
          } catch {}
        });
        if (!item.loop) finishOneShot(4500);
        break;
      }

      case 'combat_drums': {
        const triggerDrumHit = (freq: number, dur: number, accent: number) => {
          if (stopped) return;
          const t = ctx.currentTime;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          osc.frequency.exponentialRampToValueAtTime(32, t + dur);
          g.gain.setValueAtTime(accent, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + dur);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(t);
          osc.stop(t + dur + 0.02);
        };

        let step = 0;
        triggerDrumHit(115, 0.28, 0.9);
        const interval = window.setInterval(() => {
          step = (step + 1) % 4;
          if (step === 0) triggerDrumHit(115, 0.28, 0.9);
          else if (step === 2) triggerDrumHit(88, 0.22, 0.65);
          else if (step === 3) triggerDrumHit(140, 0.14, 0.45);
        }, 320);

        registerCleanup(() => window.clearInterval(interval));
        if (!item.loop) finishOneShot(3200);
        break;
      }

      case 'thunder_clap': {
        const noise = ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(ctx, 2.8);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(750, now);
        filter.frequency.exponentialRampToValueAtTime(75, now + 2.5);

        const g = ctx.createGain();
        g.gain.setValueAtTime(1.0, now);
        g.gain.exponentialRampToValueAtTime(0.01, now + 2.6);

        noise.connect(filter);
        filter.connect(g);
        g.connect(masterGain);
        noise.start(now);
        noise.stop(now + 2.7);
        finishOneShot(2700);
        break;
      }

      case 'creaking_door': {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(135, now);
        osc.frequency.linearRampToValueAtTime(92, now + 0.7);
        osc.frequency.linearRampToValueAtTime(160, now + 1.4);
        osc.frequency.linearRampToValueAtTime(60, now + 2.0);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 320;
        filter.Q.value = 4;

        g.gain.setValueAtTime(0.01, now);
        g.gain.linearRampToValueAtTime(0.65, now + 0.2);
        g.gain.exponentialRampToValueAtTime(0.01, now + 2.1);

        osc.connect(filter);
        filter.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + 2.15);
        finishOneShot(2200);
        break;
      }

      case 'sword_clash':
      case 'trap_trigger': {
        const freqs = preset === 'sword_clash' ? [920, 1480, 2150, 2760] : [540, 1180, 1720];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = idx % 2 === 0 ? 'square' : 'sawtooth';
          osc.frequency.setValueAtTime(f, now + idx * 0.03);
          osc.frequency.exponentialRampToValueAtTime(f * 0.65, now + 0.55);
          g.gain.setValueAtTime(0.35, now + idx * 0.03);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(now + idx * 0.03);
          osc.stop(now + 0.65);
        });
        finishOneShot(750);
        break;
      }

      case 'dragon_roar': {
        const osc = ctx.createOscillator();
        const noise = ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(ctx, 2.5);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(75, now + 1.2);
        osc.frequency.linearRampToValueAtTime(42, now + 2.3);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(420, now);
        filter.frequency.linearRampToValueAtTime(140, now + 2.3);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.05, now);
        g.gain.linearRampToValueAtTime(0.95, now + 0.35);
        g.gain.exponentialRampToValueAtTime(0.01, now + 2.4);

        osc.connect(filter);
        noise.connect(filter);
        filter.connect(g);
        g.connect(masterGain);

        osc.start(now);
        noise.start(now);
        osc.stop(now + 2.45);
        noise.stop(now + 2.45);
        finishOneShot(2500);
        break;
      }

      case 'arcane_blast': {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
        osc.frequency.exponentialRampToValueAtTime(65, now + 1.2);

        g.gain.setValueAtTime(0.7, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

        osc.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + 1.3);
        finishOneShot(1350);
        break;
      }

      case 'healing_chime': {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.11);
          g.gain.setValueAtTime(0.35, now + i * 0.11);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 1.4);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(now + i * 0.11);
          osc.stop(now + i * 0.11 + 1.45);
        });
        finishOneShot(1900);
        break;
      }

      case 'war_horn':
      case 'dice_roll':
      default: {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now); // A2 horn
        osc.frequency.linearRampToValueAtTime(164.81, now + 0.4); // E3

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 460;

        g.gain.setValueAtTime(0.02, now);
        g.gain.linearRampToValueAtTime(0.75, now + 0.35);
        g.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

        osc.connect(filter);
        filter.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + 2.05);
        finishOneShot(2100);
        break;
      }
    }

    this.activeTracks.set(item.id, {
      sfxId: item.id,
      name: item.name,
      loop: item.loop,
      stopFn: () => {
        stopped = true;
        cleanupFns.forEach((fn) => fn());
        try {
          masterGain.disconnect();
        } catch {}
      },
      setVolumeFn: (v) => {
        masterGain.gain.setValueAtTime(Math.max(0.01, v * this.masterVolume), ctx.currentTime);
      },
    });

    this.notify();
  }
}

export const soundboardEngine = new SoundboardEngine();
