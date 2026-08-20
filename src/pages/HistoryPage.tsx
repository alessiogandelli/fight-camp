import { useMemo, useState } from 'react';
import { useStore } from '../store/AppStore';
import { useI18n } from '../lib/i18n';
import type { SessionRecord, WorkoutType } from '../types';
import { WORKOUT_TYPES, workoutTypeMeta, workoutTypeLabel } from '../types';
import { uid } from '../lib/id';
import { dateKey, dayLabel, fmtClock, fmtDistance, fmtPace } from '../lib/format';
import { localeFor } from '../lib/messages';
import { computeLoad } from '../lib/stats';
import { Button, Card, Chip, ConfirmDialog, EmptyState, Field, Modal, Select, Stepper, TextArea, TextInput, TimeField } from '../components/ui';
import { IconClock, IconPlus, IconTrash } from '../components/Icons';
import { useToast } from '../components/Toast';

type TypeFilter = 'all' | WorkoutType;

export default function HistoryPage() {
  const { data, deleteSession } = useStore();
  const toast = useToast();
  const { t, lang } = useI18n();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<SessionRecord | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const sessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTs = to ? new Date(`${to}T23:59:59`).getTime() : null;
    return data.sessions
      .filter((s) => {
        if (typeFilter !== 'all' && s.type !== typeFilter) return false;
        if (fromTs != null && s.date < fromTs) return false;
        if (toTs != null && s.date > toTs) return false;
        if (q && !`${s.name} ${s.notes ?? ''}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .slice()
      .sort((a, b) => b.date - a.date);
  }, [data.sessions, query, typeFilter, from, to]);

  const groups = useMemo(() => {
    const map = new Map<string, SessionRecord[]>();
    for (const s of sessions) {
      const k = dateKey(s.date);
      const arr = map.get(k) ?? [];
      arr.push(s);
      map.set(k, arr);
    }
    return Array.from(map.entries());
  }, [sessions]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black uppercase tracking-[0.14em]">{t('history.title')}</h1>
        <Button size="sm" variant="ghost" onClick={() => setLogOpen(true)}>
          <IconPlus size={16} /> {t('history.logSession')}
        </Button>
      </div>

      <div className="mt-4">
        <TextInput placeholder={t('history.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <Chip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>
          {t('common.all')}
        </Chip>
        {WORKOUT_TYPES.map((t) => (
          <Chip key={t.id} active={typeFilter === t.id} onClick={() => setTypeFilter(t.id)}>
            {workoutTypeLabel(t.id, lang)}
          </Chip>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label={t('history.from')}>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-12 w-full rounded-xl border border-line bg-panel2 px-3 text-sm text-ink outline-none focus:border-accent"
          />
        </Field>
        <Field label={t('history.to')}>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-12 w-full rounded-xl border border-line bg-panel2 px-3 text-sm text-ink outline-none focus:border-accent"
          />
        </Field>
      </div>

      {groups.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<IconClock size={34} />}
            title={t('history.empty')}
            message={t('history.emptyMsg')}
            action={
              <Button variant="primary" onClick={() => setLogOpen(true)}>
                <IconPlus size={16} /> {t('history.logOne')}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {groups.map(([key, list]) => (
            <div key={key}>
              <div className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-mut">
                {dayLabel(list[0].date, lang)}
              </div>
              <div className="flex flex-col gap-2">
                {list.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    expanded={expanded === s.id}
                    onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
                    onDelete={() => setToDelete(s)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ManualLogModal open={logOpen} onClose={() => setLogOpen(false)} />

      <ConfirmDialog
        open={toDelete != null}
        title={t('history.deleteSession')}
        message={t('history.deleteMsg')}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            deleteSession(toDelete.id);
            toast.show(t('history.sessionDeleted'));
          }
          setToDelete(null);
        }}
      />
    </div>
  );
}

function SessionCard({
  session: s,
  expanded,
  onToggle,
  onDelete,
}: {
  session: SessionRecord;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { t, lang } = useI18n();
  const meta = workoutTypeMeta(s.type);
  const time = new Date(s.date).toLocaleTimeString(localeFor(lang), { hour: '2-digit', minute: '2-digit' });

  const detail = (() => {
    if (s.source === 'timer') {
      const rounds = s.roundsCompleted != null ? `${s.roundsCompleted} ${t('history.rnd')}` : '';
      const work = s.workDuration != null ? `${fmtClock(s.workDuration)} ${t('history.workUnit')}` : '';
      return [rounds, work, fmtClock(s.duration)].filter(Boolean).join(' · ');
    }
    if (s.type === 'running' && s.running) {
      return [fmtDistance(s.running.distanceKm), fmtClock(s.duration), fmtPace(s.running.paceSecPerKm)]
        .filter(Boolean)
        .join(' · ');
    }
    if (s.type === 'strength' && s.strength && s.strength.length > 0) {
      return `${s.strength.length} ${t('unit.exercises')} · ${fmtClock(s.duration)}`;
    }
    return fmtClock(s.duration);
  })();

  return (
    <Card className="p-0">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="text-xl" aria-hidden>
          {meta.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-sm font-black uppercase tracking-wider">{s.name}</span>
            <span className="tabular shrink-0 text-[10px] font-bold text-mut">{time}</span>
          </span>
          <span className="tabular mt-0.5 block text-[11px] font-semibold uppercase tracking-wider text-mut">
            {detail}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {s.rpe != null ? <span className="text-xs font-black text-accent">RPE {s.rpe}</span> : null}
          {s.load > 0 ? <span className="tabular text-[10px] font-bold uppercase text-mut">{t('common.load')} {s.load}</span> : null}
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-line px-4 py-3">
          {s.notes ? <p className="text-sm text-ink/90">{s.notes}</p> : null}
          {s.energyBefore != null || s.feelingAfter ? (
            <p className="mt-1 text-[11px] uppercase tracking-wider text-mut">
              {s.energyBefore != null ? t('history.energyBefore', { n: s.energyBefore }) : ''}
              {s.energyBefore != null && s.feelingAfter ? ' · ' : ''}
              {s.feelingAfter ? t('history.feelingAfter', { feeling: t(`feeling.${s.feelingAfter}`) }) : ''}
            </p>
          ) : null}
          {s.strength && s.strength.length > 0 ? (
            <div className="mt-2 flex flex-col gap-1">
              {s.strength.map((e, i) => (
                <div key={i} className="tabular text-xs text-mut">
                  {e.exercise} — {e.sets} × {e.reps}
                  {e.weightKg ? ` @ ${e.weightKg}kg` : ''}
                </div>
              ))}
            </div>
          ) : null}
          {s.combosUsed && s.combosUsed.length > 0 ? (
            <div className="mt-2">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-mut">{t('history.combosUsed')}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {s.combosUsed.map((c) => (
                  <span key={c.id} className="rounded-full border border-line bg-panel2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="outline" className="text-accent" onClick={onDelete}>
              <IconTrash size={14} /> {t('common.delete')}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function ManualLogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addSession } = useStore();
  const toast = useToast();
  const { t, lang } = useI18n();
  const [type, setType] = useState<WorkoutType>('running');
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(1800);
  const [rpe, setRpe] = useState(6);
  const [notes, setNotes] = useState('');
  const [distance, setDistance] = useState('');
  const [exercises, setExercises] = useState<{ exercise: string; sets: number; reps: number; weightKg?: number }[]>([]);

  const save = () => {
    if (duration < 60) {
      toast.show(t('history.minDuration'));
      return;
    }
    const distKm = parseFloat(distance);
    const record: SessionRecord = {
      id: uid(),
      date: Date.now(),
      type,
      source: 'manual',
      name: (name.trim() || workoutTypeLabel(type, lang)).toUpperCase(),
      duration,
      rpe,
      load: computeLoad(duration, rpe),
      notes: notes.trim() || undefined,
      running:
        type === 'running'
          ? {
              distanceKm: Number.isFinite(distKm) && distKm > 0 ? distKm : undefined,
              paceSecPerKm: Number.isFinite(distKm) && distKm > 0 ? duration / distKm : undefined,
            }
          : undefined,
      strength:
        type === 'strength' && exercises.length > 0
          ? exercises.filter((e) => e.exercise.trim())
          : undefined,
    };
    addSession(record);
    toast.show(t('history.sessionLogged'));
    onClose();
    setName('');
    setNotes('');
    setDistance('');
    setExercises([]);
  };

  return (
    <Modal open={open} onClose={onClose} title={t('history.logSession')} wide>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('common.type')}>
            <Select value={type} onChange={(e) => setType(e.target.value as WorkoutType)}>
              {WORKOUT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {workoutTypeLabel(t.id, lang)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('history.nameOptional')}>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === 'it' ? 'Corsa mattutina' : 'Morning run'} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('common.duration')}>
            <TimeField value={duration} onChange={setDuration} min={60} step={60} max={21600} />
          </Field>
          <Field label={t('history.rpeLoad', { n: computeLoad(duration, rpe) })}>
            <Stepper value={rpe} onChange={setRpe} min={1} max={10} />
          </Field>
        </div>
        {type === 'running' ? (
          <Field label={t('history.distance')}>
            <TextInput value={distance} onChange={(e) => setDistance(e.target.value)} inputMode="decimal" placeholder="8.2" />
          </Field>
        ) : null}
        {type === 'strength' ? (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-mut">{t('history.exercises')}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExercises((e) => [...e, { exercise: '', sets: 3, reps: 10 }])}
              >
                <IconPlus size={14} /> {t('history.add')}
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {exercises.map((e, i) => (
                <div key={i} className="grid grid-cols-[1fr_repeat(3,56px)_36px] items-center gap-1.5">
                  <TextInput
                    value={e.exercise}
                    onChange={(ev) =>
                      setExercises((xs) => xs.map((x, j) => (j === i ? { ...x, exercise: ev.target.value } : x)))
                    }
                    placeholder={t('history.exercisePlaceholder')}
                    className="h-11 text-sm"
                  />
                  <MiniNum
                    value={e.sets}
                    label={t('history.sets')}
                    onChange={(v) => setExercises((xs) => xs.map((x, j) => (j === i ? { ...x, sets: v } : x)))}
                  />
                  <MiniNum
                    value={e.reps}
                    label={t('history.reps')}
                    onChange={(v) => setExercises((xs) => xs.map((x, j) => (j === i ? { ...x, reps: v } : x)))}
                  />
                  <MiniNum
                    value={e.weightKg ?? 0}
                    label={t('history.kg')}
                    onChange={(v) =>
                      setExercises((xs) => xs.map((x, j) => (j === i ? { ...x, weightKg: v || undefined } : x)))
                    }
                  />
                  <button
                    onClick={() => setExercises((xs) => xs.filter((_, j) => j !== i))}
                    className="flex h-11 items-center justify-center text-accent"
                    aria-label={t('history.removeExercise')}
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              ))}
              {exercises.length === 0 ? (
                <p className="text-xs text-mut">{t('history.noExercises')}</p>
              ) : null}
            </div>
          </div>
        ) : null}
        <Field label={t('history.notes')}>
          <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button variant="primary" size="lg" onClick={save}>
          {t('history.saveSession')}
        </Button>
      </div>
    </Modal>
  );
}

function MiniNum({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <label className="flex flex-col">
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
        className="h-11 w-full rounded-lg border border-line bg-panel2 px-1 text-center text-sm text-ink outline-none focus:border-accent"
      />
      <span className="mt-0.5 text-center text-[8px] font-bold uppercase text-mut">{label}</span>
    </label>
  );
}
