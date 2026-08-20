import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionPlan } from './plan';
import { segmentStart } from './plan';
import { eventsBetween, resolvePlan, type CueEvent, type ResolvedState } from './resolve';
import { sound } from '../lib/audio';
import { vibrate } from '../lib/vibrate';

export type EngineStatus = 'idle' | 'running' | 'paused' | 'done';

export interface EngineOptions {
  soundOn: boolean;
  vibrationOn: boolean;
  initialElapsedMs?: number;
  onSnapshot?: (elapsedMs: number, status: EngineStatus) => void;
  onDone?: () => void;
}

export interface EngineControls {
  status: EngineStatus;
  view: ResolvedState;
  start: () => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  skip: () => void;
  prev: () => void;
  restart: () => void;
}

export function useSessionEngine(plan: SessionPlan, opts: EngineOptions): EngineControls {
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const initialMs = Math.min(opts.initialElapsedMs ?? 0, plan.totalSeconds * 1000);
  const [status, setStatus] = useState<EngineStatus>(initialMs > 0 ? 'paused' : 'idle');
  const [view, setView] = useState<ResolvedState>(() => resolvePlan(plan, initialMs / 1000));
  const accRef = useRef(initialMs);
  const resumeRef = useRef<number | null>(null);
  const lastTRef = useRef(initialMs / 1000);
  const doneRef = useRef(false);

  const totalMs = useCallback(
    () => accRef.current + (resumeRef.current != null ? Date.now() - resumeRef.current : 0),
    [],
  );

  const cue = useCallback((evs: CueEvent[]) => {
    const o = optsRef.current;
    const play = (fn: () => void) => {
      if (o.soundOn) fn();
    };
    if (evs.some((e) => e.type === 'done')) {
      play(sound.done);
      vibrate([300, 100, 300], o.vibrationOn);
      return;
    }
    const segs = evs.filter((e): e is Extract<CueEvent, { type: 'segment' }> => e.type === 'segment');
    if (segs.length > 0) {
      const s = segs[segs.length - 1];
      if (s.kind === 'work') {
        play(sound.work);
        vibrate(250, o.vibrationOn);
      } else if (s.kind === 'rest') {
        play(sound.rest);
        vibrate(120, o.vibrationOn);
      } else {
        play(sound.prep);
        vibrate(120, o.vibrationOn);
      }
    }
    if (evs.some((e) => e.type === 'warn')) {
      play(sound.warn);
      vibrate([80, 60, 80], o.vibrationOn);
    }
    if (evs.some((e) => e.type === 'count')) {
      play(sound.count);
      vibrate(40, o.vibrationOn);
    }
    if (segs.length === 0 && evs.some((e) => e.type === 'slot')) {
      play(sound.slot);
      vibrate(30, o.vibrationOn);
    }
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    accRef.current = plan.totalSeconds * 1000;
    resumeRef.current = null;
    lastTRef.current = plan.totalSeconds;
    setStatus('done');
    setView(resolvePlan(plan, plan.totalSeconds));
    cue([{ type: 'done' }]);
    optsRef.current.onSnapshot?.(plan.totalSeconds * 1000, 'done');
    optsRef.current.onDone?.();
  }, [plan, cue]);

  const jumpTo = useCallback(
    (sec: number) => {
      const target = Math.max(0, Math.min(sec, plan.totalSeconds));
      accRef.current = target * 1000;
      if (resumeRef.current != null) resumeRef.current = Date.now();
      lastTRef.current = target;
      if (target >= plan.totalSeconds) {
        finish();
        return;
      }
      const st = resolvePlan(plan, target);
      setView(st);
      if (resumeRef.current != null && st.segment) {
        cue([{ type: 'segment', kind: st.segment.kind, round: st.segment.round, index: st.segIndex }]);
      }
      optsRef.current.onSnapshot?.(target * 1000, resumeRef.current != null ? 'running' : 'paused');
    },
    [plan, cue, finish],
  );

  useEffect(() => {
    if (status !== 'running') return;
    const iv = window.setInterval(() => {
      const ms = totalMs();
      const t = ms / 1000;
      if (t >= plan.totalSeconds) {
        finish();
        return;
      }
      const evs = eventsBetween(plan, lastTRef.current, t);
      lastTRef.current = t;
      if (evs.length > 0) cue(evs);
      setView(resolvePlan(plan, t));
      optsRef.current.onSnapshot?.(ms, 'running');
    }, 100);
    return () => window.clearInterval(iv);
  }, [status, plan, finish, cue, totalMs]);

  const start = useCallback(() => {
    if (status !== 'idle') return;
    sound.unlock();
    doneRef.current = false;
    accRef.current = 0;
    lastTRef.current = 0;
    resumeRef.current = Date.now();
    setStatus('running');
    setView(resolvePlan(plan, 0));
    const first = plan.segments[0];
    if (first) cue([{ type: 'segment', kind: first.kind, round: first.round, index: 0 }]);
    optsRef.current.onSnapshot?.(0, 'running');
  }, [status, plan, cue]);

  const pause = useCallback(() => {
    if (status !== 'running') return;
    accRef.current = totalMs();
    resumeRef.current = null;
    setStatus('paused');
    optsRef.current.onSnapshot?.(accRef.current, 'paused');
  }, [status, totalMs]);

  const resume = useCallback(() => {
    if (status !== 'paused') return;
    if (lastTRef.current >= plan.totalSeconds) return;
    sound.unlock();
    resumeRef.current = Date.now();
    setStatus('running');
  }, [status, plan.totalSeconds]);

  const toggle = useCallback(() => {
    if (status === 'running') pause();
    else if (status === 'paused') resume();
    else if (status === 'idle') start();
  }, [status, pause, resume, start]);

  const skip = useCallback(() => {
    if (status === 'idle' || status === 'done') return;
    const t = lastTRef.current;
    let acc = 0;
    let target = plan.totalSeconds;
    for (const s of plan.segments) {
      const end = acc + s.duration;
      if (t < end - 0.001) {
        target = end;
        break;
      }
      acc = end;
    }
    jumpTo(target);
  }, [status, plan, jumpTo]);

  const prev = useCallback(() => {
    if (status === 'idle' || status === 'done') return;
    const t = lastTRef.current;
    const st = resolvePlan(plan, t);
    let target: number;
    if (st.segElapsed > 2 || st.segIndex === 0) target = segmentStart(plan, st.segIndex);
    else target = segmentStart(plan, st.segIndex - 1);
    jumpTo(target);
  }, [status, plan, jumpTo]);

  const restart = useCallback(() => {
    if (status === 'idle') return;
    doneRef.current = false;
    accRef.current = 0;
    lastTRef.current = 0;
    if (status === 'running') resumeRef.current = Date.now();
    else resumeRef.current = null;
    setStatus(status === 'running' ? 'running' : 'paused');
    setView(resolvePlan(plan, 0));
    optsRef.current.onSnapshot?.(0, status === 'running' ? 'running' : 'paused');
  }, [status, plan]);

  return { status, view, start, pause, resume, toggle, skip, prev, restart };
}
