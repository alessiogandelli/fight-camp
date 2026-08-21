import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { sound } from './audio';
import { vibrate } from './vibrate';

export type PushupPhase = 'up' | 'down';

export interface DetectorParams {
  minDelta: number;
  downFrac: number;
  upFrac: number;
  minDownMs: number;
  cooldownMs: number;
  emaAlpha: number;
}

export const DEFAULT_PARAMS: DetectorParams = {
  minDelta: 25,
  downFrac: 0.35,
  upFrac: 0.65,
  minDownMs: 150,
  cooldownMs: 500,
  emaAlpha: 0.35,
};

export interface DetectorState {
  phase: PushupPhase;
  refBright: number;
  refDark: number;
  smoothed: number;
  lastCountAt: number;
  downSince: number;
}

export function createDetector(): DetectorState {
  return { phase: 'up', refBright: 128, refDark: 128, smoothed: 128, lastCountAt: -Infinity, downSince: 0 };
}

/**
 * Advances the detector with a new luminance sample (0..255).
 * Returns the updated state and whether a rep was completed (down -> up).
 */
export function stepDetector(
  prev: DetectorState,
  luminance: number,
  now: number,
  p: DetectorParams,
): { state: DetectorState; counted: boolean } {
  const lum = Math.max(0, Math.min(255, luminance));

  const smoothed = prev.smoothed + (lum - prev.smoothed) * p.emaAlpha;

  // Slowly adapting references for the "bright" (up) and "dark" (down) ends.
  const adapt = 0.02;
  const refBright = smoothed > prev.refBright ? smoothed : prev.refBright + (smoothed - prev.refBright) * adapt;
  const refDark = smoothed < prev.refDark ? smoothed : prev.refDark + (smoothed - prev.refDark) * adapt;

  const delta = refBright - refDark;
  if (delta < p.minDelta) {
    return {
      state: { phase: 'up', refBright, refDark, smoothed, lastCountAt: prev.lastCountAt, downSince: 0 },
      counted: false,
    };
  }

  const downThreshold = refDark + delta * p.downFrac;
  const upThreshold = refDark + delta * p.upFrac;

  let phase = prev.phase;
  let downSince = prev.downSince;
  let lastCountAt = prev.lastCountAt;
  let counted = false;

  if (phase === 'up') {
    if (smoothed < downThreshold) {
      phase = 'down';
      downSince = now;
    }
  } else {
    if (smoothed > upThreshold) {
      const downDuration = now - downSince;
      if (downDuration >= p.minDownMs && now - lastCountAt >= p.cooldownMs) {
        counted = true;
        lastCountAt = now;
      }
      phase = 'up';
      downSince = 0;
    }
  }

  return { state: { phase, refBright, refDark, smoothed, lastCountAt, downSince }, counted };
}

/** Maps a 0..100 sensitivity slider value to detector params. */
export function paramsForSensitivity(sensitivity: number): DetectorParams {
  const s = Math.max(0, Math.min(100, sensitivity));
  return {
    ...DEFAULT_PARAMS,
    minDelta: 60 - (s / 100) * 52,
  };
}

export interface PushupCounts {
  videoRef: RefObject<HTMLVideoElement>;
  count: number;
  running: boolean;
  error: string | null;
  luminance: number;
  delta: number;
  calibrated: boolean;
  sensitivity: number;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  setSensitivity: (v: number) => void;
}

function luminanceOf(data: Uint8ClampedArray): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  return sum / (data.length / 4);
}

/**
 * Push-up counter based on front-camera luminance proximity.
 * The phone lies face-up on the floor: descending over the camera darkens the
 * frame, rising brightens it again. One dark -> bright cycle counts a rep.
 */
export function usePushupCounter(options?: { soundOn?: boolean; vibrationOn?: boolean }): PushupCounts {
  const { soundOn = true, vibrationOn = true } = options ?? {};
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const detectorRef = useRef(createDetector());
  const lastFrameRef = useRef(0);

  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [luminance, setLuminance] = useState(0);
  const [delta, setDelta] = useState(0);
  const [calibrated, setCalibrated] = useState(false);
  const [sensitivity, setSensitivityState] = useState(50);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setRunning(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const sample = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const w = 32;
    const h = 24;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const lum = luminanceOf(data);
    const params = paramsForSensitivity(sensitivity);
    const res = stepDetector(detectorRef.current, lum, performance.now(), params);
    detectorRef.current = res.state;
    setLuminance(lum / 255);
    setDelta(res.state.refBright - res.state.refDark);
    setCalibrated(res.state.refBright - res.state.refDark >= params.minDelta);
    if (res.counted) {
      setCount((c) => c + 1);
      if (soundOn) sound.count();
      vibrate(60, vibrationOn);
    }
  }, [sensitivity, soundOn, vibrationOn]);

  const loop = useCallback(
    (now: number) => {
      if (now - lastFrameRef.current >= 30) {
        lastFrameRef.current = now;
        sample();
      }
      rafRef.current = requestAnimationFrame(loop);
    },
    [sample],
  );

  const start = useCallback(async () => {
    setError(null);
    sound.unlock();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('video missing');
      }
      video.srcObject = stream;
      await video.play();
      detectorRef.current = createDetector();
      lastFrameRef.current = 0;
      setRunning(true);
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      setRunning(false);
      const name = (e as { name?: string }).name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('permission');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setError('no-camera');
      } else {
        setError('generic');
      }
    }
  }, [loop]);

  const reset = useCallback(() => {
    setCount(0);
    detectorRef.current = createDetector();
  }, []);

  const setSensitivity = useCallback((v: number) => setSensitivityState(v), []);

  return {
    videoRef,
    count,
    running,
    error,
    luminance,
    delta,
    calibrated,
    sensitivity,
    start,
    stop,
    reset,
    setSensitivity,
  };
}
