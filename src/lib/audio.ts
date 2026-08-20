let ctx: AudioContext | null = null;

type AC = typeof AudioContext;

export function unlockAudio(): void {
  try {
    if (!ctx) {
      const Ctor: AC | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone(freq: number, durMs: number, opts: ToneOpts = {}): void {
  if (!ctx || ctx.state !== 'running') return;
  try {
    const t0 = ctx.currentTime + (opts.delay ?? 0) / 1000;
    const dur = durMs / 1000;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    const peak = opts.gain ?? 0.25;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    /* ignore */
  }
}

function bell(delay = 0): void {
  tone(880, 620, { type: 'triangle', gain: 0.38, delay });
  tone(1760, 420, { type: 'sine', gain: 0.12, delay });
  tone(2637, 220, { type: 'sine', gain: 0.05, delay });
}

export const sound = {
  unlock: unlockAudio,
  prep: () => tone(660, 220, { type: 'triangle', gain: 0.25 }),
  count: () => tone(780, 70, { type: 'square', gain: 0.12 }),
  warn: () => {
    tone(980, 90, { type: 'square', gain: 0.16 });
    tone(980, 90, { type: 'square', gain: 0.16, delay: 150 });
  },
  slot: () => tone(1180, 55, { type: 'square', gain: 0.09 }),
  work: () => {
    bell(0);
    bell(300);
  },
  rest: () => {
    tone(520, 340, { type: 'triangle', gain: 0.28 });
    tone(390, 460, { type: 'triangle', gain: 0.22, delay: 190 });
  },
  done: () => {
    bell(0);
    bell(320);
    bell(640);
  },
};
