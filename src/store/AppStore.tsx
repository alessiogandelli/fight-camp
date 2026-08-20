import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  AppData,
  Combination,
  SessionRecord,
  Settings,
  Technique,
  TimerPreset,
  WeekPlanItem,
  Workout,
} from '../types';
import { loadData, saveData } from '../data/storage';
import { uid } from '../lib/id';

export interface Store {
  data: AppData;
  addTechnique: (t: Omit<Technique, 'id'>) => Technique;
  deleteTechnique: (id: string) => void;
  saveCombination: (c: Combination) => void;
  deleteCombination: (id: string) => void;
  duplicateCombination: (id: string) => Combination | null;
  toggleFavorite: (id: string) => void;
  saveWorkout: (w: Workout) => void;
  deleteWorkout: (id: string) => void;
  duplicateWorkout: (id: string) => Workout | null;
  addSession: (s: SessionRecord) => void;
  deleteSession: (id: string) => void;
  savePreset: (p: TimerPreset) => void;
  deletePreset: (id: string) => void;
  addPlan: (p: WeekPlanItem) => void;
  togglePlan: (id: string) => void;
  deletePlan: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
}

const StoreCtx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
    saveData(data);
  }, [data]);

  const api = useMemo(() => {
    const addTechnique: Store['addTechnique'] = (t) => {
      const tech = { ...t, id: uid() };
      setData((d) => ({ ...d, techniques: [...d.techniques, tech] }));
      return tech;
    };
    const deleteTechnique: Store['deleteTechnique'] = (id) => {
      setData((d) => ({
        ...d,
        techniques: d.techniques.filter((t) => t.id !== id),
        combinations: d.combinations
          .map((c) => ({ ...c, techniqueIds: c.techniqueIds.filter((tid) => tid !== id) }))
          .filter((c) => c.techniqueIds.length > 0),
      }));
    };
    const saveCombination: Store['saveCombination'] = (c) => {
      setData((d) => {
        const exists = d.combinations.some((x) => x.id === c.id);
        return {
          ...d,
          combinations: exists ? d.combinations.map((x) => (x.id === c.id ? c : x)) : [...d.combinations, c],
        };
      });
    };
    const deleteCombination: Store['deleteCombination'] = (id) => {
      setData((d) => ({
        ...d,
        combinations: d.combinations.filter((c) => c.id !== id),
        workouts: d.workouts.map((w) => ({
          ...w,
          rounds: w.rounds.map((r) => ({ ...r, combinationIds: r.combinationIds.filter((cid) => cid !== id) })),
        })),
      }));
    };
    const duplicateCombination: Store['duplicateCombination'] = (id) => {
      const src = dataRef.current.combinations.find((c) => c.id === id);
      if (!src) return null;
      const copy: Combination = {
        ...src,
        id: uid(),
        name: `${src.name} COPY`,
        favorite: false,
        createdAt: Date.now(),
      };
      setData((d) => ({ ...d, combinations: [...d.combinations, copy] }));
      return copy;
    };
    const toggleFavorite: Store['toggleFavorite'] = (id) => {
      setData((d) => ({
        ...d,
        combinations: d.combinations.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c)),
      }));
    };
    const saveWorkout: Store['saveWorkout'] = (w) => {
      setData((d) => {
        const exists = d.workouts.some((x) => x.id === w.id);
        return { ...d, workouts: exists ? d.workouts.map((x) => (x.id === w.id ? w : x)) : [...d.workouts, w] };
      });
    };
    const deleteWorkout: Store['deleteWorkout'] = (id) => {
      setData((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== id) }));
    };
    const duplicateWorkout: Store['duplicateWorkout'] = (id) => {
      const src = dataRef.current.workouts.find((w) => w.id === id);
      if (!src) return null;
      const copy: Workout = {
        ...src,
        id: uid(),
        name: `${src.name} COPY`,
        createdAt: Date.now(),
        rounds: src.rounds.map((r) => ({ ...r, id: uid() })),
      };
      setData((d) => ({ ...d, workouts: [...d.workouts, copy] }));
      return copy;
    };
    const addSession: Store['addSession'] = (s) => {
      setData((d) => ({ ...d, sessions: [...d.sessions, s] }));
    };
    const deleteSession: Store['deleteSession'] = (id) => {
      setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
    };
    const savePreset: Store['savePreset'] = (p) => {
      setData((d) => {
        const exists = d.presets.some((x) => x.id === p.id);
        return { ...d, presets: exists ? d.presets.map((x) => (x.id === p.id ? p : x)) : [...d.presets, p] };
      });
    };
    const deletePreset: Store['deletePreset'] = (id) => {
      setData((d) => ({ ...d, presets: d.presets.filter((p) => p.id !== id) }));
    };
    const addPlan: Store['addPlan'] = (p) => {
      setData((d) => ({ ...d, plans: [...d.plans, p] }));
    };
    const togglePlan: Store['togglePlan'] = (id) => {
      setData((d) => ({ ...d, plans: d.plans.map((p) => (p.id === id ? { ...p, done: !p.done } : p)) }));
    };
    const deletePlan: Store['deletePlan'] = (id) => {
      setData((d) => ({ ...d, plans: d.plans.filter((p) => p.id !== id) }));
    };
    const setSettings: Store['setSettings'] = (patch) => {
      setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    };
    return {
      addTechnique,
      deleteTechnique,
      saveCombination,
      deleteCombination,
      duplicateCombination,
      toggleFavorite,
      saveWorkout,
      deleteWorkout,
      duplicateWorkout,
      addSession,
      deleteSession,
      savePreset,
      deletePreset,
      addPlan,
      togglePlan,
      deletePlan,
      setSettings,
    };
  }, []);

  const value = useMemo<Store>(() => ({ data, ...api }), [data, api]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreCtx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
