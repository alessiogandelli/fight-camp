let ctx: AudioContext | null = null;

type AC = typeof AudioContext;

const SAMPLE_RATE = 22050;

interface PartialSpec {
  freq: number;
  durMs: number;
  type: OscillatorType;
  gain: number;
  delay?: number;
}

const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

// ---------------------------------------------------------------------------
// WebAudio path (desktop Chrome/Firefox/Android + macOS Safari after unlock)
// ---------------------------------------------------------------------------

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
  primeElements();
  attachVisibilityUnlock();
}

function tone(p: PartialSpec): void {
  if (!ctx || ctx.state !== 'running') return;
  try {
    const t0 = ctx.currentTime + (p.delay ?? 0) / 1000;
    const dur = p.durMs / 1000;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = p.type;
    osc.frequency.setValueAtTime(p.freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(p.gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Audio element fallback path (iOS Safari: works even with the silent switch)
// ---------------------------------------------------------------------------

function encodeWav(samples: number[]): string {
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, SAMPLE_RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  writeStr(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

function renderCue(partials: PartialSpec[]): string {
  const totalMs = partials.reduce((m, p) => Math.max(m, (p.delay ?? 0) + p.durMs), 0) + 60;
  const n = Math.ceil((totalMs / 1000) * SAMPLE_RATE);
  const out = new Float64Array(n);
  for (const p of partials) {
    const start = Math.floor(((p.delay ?? 0) / 1000) * SAMPLE_RATE);
    const len = Math.floor((p.durMs / 1000) * SAMPLE_RATE);
    const durSec = p.durMs / 1000;
    for (let i = 0; i < len; i++) {
      const t = i / SAMPLE_RATE;
      const attack = Math.min(1, t / 0.005);
      const decay = Math.pow(0.001, t / durSec);
      const env = attack * decay;
      const ph = 2 * Math.PI * p.freq * t;
      let s: number;
      switch (p.type) {
        case 'square':
          s = Math.sign(Math.sin(ph));
          break;
        case 'triangle':
          s = (2 / Math.PI) * Math.asin(Math.sin(ph));
          break;
        default:
          s = Math.sin(ph);
      }
      out[start + i] += s * env * p.gain;
    }
  }
  return encodeWav(Array.from(out));
}

const POOL_SIZE = 4;
let pool: HTMLAudioElement[] = [];

function primeElements(): void {
  try {
    if (pool.length === 0) {
      for (let i = 0; i < POOL_SIZE; i++) {
        const a = new Audio();
        a.preload = 'auto';
        pool.push(a);
      }
    }
    const silent = renderCue([]);
    for (const a of pool) {
      a.src = silent;
      void a.play().catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

function playUrl(url: string): void {
  try {
    if (pool.length === 0) primeElements();
    const el = pool.find((a) => a.paused || a.ended) ?? pool[0];
    el.src = url;
    void el.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Cue definitions
// ---------------------------------------------------------------------------

interface Cue {
  name: string;
  partials: PartialSpec[];
}

const BELL = (delay = 0): PartialSpec[] => [
  { freq: 880, durMs: 620, type: 'triangle', gain: 0.38, delay },
  { freq: 1760, durMs: 420, type: 'sine', gain: 0.12, delay },
  { freq: 2637, durMs: 220, type: 'sine', gain: 0.05, delay },
];

const CUES: Cue[] = [
  { name: 'prep', partials: [{ freq: 660, durMs: 220, type: 'triangle', gain: 0.25 }] },
  { name: 'count', partials: [{ freq: 780, durMs: 70, type: 'square', gain: 0.12 }] },
  {
    name: 'warn',
    partials: [
      { freq: 980, durMs: 90, type: 'square', gain: 0.16 },
      { freq: 980, durMs: 90, type: 'square', gain: 0.16, delay: 150 },
    ],
  },
  { name: 'slot', partials: [{ freq: 1180, durMs: 55, type: 'square', gain: 0.09 }] },
  { name: 'work', partials: [...BELL(0), ...BELL(300)] },
  {
    name: 'rest',
    partials: [
      { freq: 520, durMs: 340, type: 'triangle', gain: 0.28 },
      { freq: 390, durMs: 460, type: 'triangle', gain: 0.22, delay: 190 },
    ],
  },
  { name: 'done', partials: [...BELL(0), ...BELL(320), ...BELL(640)] },
];

const urlCache = new Map<string, string>();

function cueUrl(cue: Cue): string {
  let u = urlCache.get(cue.name);
  if (!u) {
    u = renderCue(cue.partials);
    urlCache.set(cue.name, u);
  }
  return u;
}

function play(name: string): void {
  const cue = CUES.find((c) => c.name === name);
  if (!cue) return;
  const webAudioReady = !!ctx && ctx.state === 'running';
  if (isIOS || !webAudioReady) {
    playUrl(cueUrl(cue));
    return;
  }
  for (const p of cue.partials) tone(p);
}

let visibilityAttached = false;

function attachVisibilityUnlock(): void {
  if (visibilityAttached || typeof document === 'undefined') return;
  visibilityAttached = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx) void ctx.resume().catch(() => {});
  });
}

export const sound = {
  unlock: unlockAudio,
  prep: () => play('prep'),
  count: () => play('count'),
  warn: () => play('warn'),
  slot: () => play('slot'),
  work: () => play('work'),
  rest: () => play('rest'),
  done: () => play('done'),
};
