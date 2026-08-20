import { useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useStore } from '../store/AppStore';
import { useI18n } from '../lib/i18n';
import type { WeekPlanItem, WorkoutType } from '../types';
import { WORKOUT_TYPES, workoutTypeMeta, workoutTypeLabel } from '../types';
import { uid } from '../lib/id';
import { dateKey, fmtClock, fmtMinutes } from '../lib/format';
import { localeFor } from '../lib/messages';
import {
  bagStats,
  comboUsageStats,
  filterSince,
  monthlyBuckets,
  sessionsPerWeek,
  startOfWeek,
  streaks,
  techniqueUsageStats,
  volumeStats,
  weeklyBuckets,
} from '../lib/stats';
import { Button, Card, Field, Modal, Segmented, Select, StatCard, Stepper, TextInput, cx } from '../components/ui';
import { IconCheck, IconChevronDown, IconChevronUp, IconPlus, IconX } from '../components/Icons';

type Range = 'week' | 'month' | 'all';

export default function StatsPage() {
  const { data } = useStore();
  const { t, lang } = useI18n();
  const [range, setRange] = useState<Range>('month');

  const sessions = data.sessions;
  const ranged = useMemo(
    () => filterSince(sessions, range === 'week' ? 7 : range === 'month' ? 30 : undefined),
    [sessions, range],
  );
  const vol = useMemo(() => volumeStats(ranged), [ranged]);
  const streak = useMemo(() => streaks(sessions), [sessions]);
  const perWeek = useMemo(() => sessionsPerWeek(sessions), [sessions]);
  const bag = useMemo(() => bagStats(sessions), [sessions]);
  const comboUse = useMemo(() => comboUsageStats(sessions), [sessions]);
  const techUse = useMemo(() => techniqueUsageStats(sessions), [sessions]);
  const wBuckets = useMemo(() => weeklyBuckets(sessions, 8), [sessions]);
  const mBuckets = useMemo(() => monthlyBuckets(sessions, 6, lang), [sessions, lang]);

  const maxTech = techUse.length > 0 ? techUse[0].count : 1;

  return (
    <div>
      <h1 className="text-xl font-black uppercase tracking-[0.14em]">{t('stats.title')}</h1>

      {sessions.length === 0 ? (
        <Card className="mt-4 p-6 text-center text-sm text-mut">
          {t('stats.empty')}
        </Card>
      ) : null}

      <div className="mt-4">
        <Segmented
          options={[
            { id: 'week', label: t('stats.7days') },
            { id: 'month', label: t('stats.30days') },
            { id: 'all', label: t('stats.allTime') },
          ]}
          value={range}
          onChange={setRange}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t('stats.sessions')} value={String(vol.sessions)} />
        <StatCard label={t('stats.trainingTime')} value={fmtMinutes(vol.minutes * 60)} />
        <StatCard label={t('stats.rounds')} value={String(vol.rounds)} />
        <StatCard label={t('stats.workTime')} value={fmtClock(vol.workSeconds)} />
      </div>

      <Section title={t('stats.trainingLoad')}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card>
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-mut">{t('stats.weeklyLoad')}</div>
            <LoadChart buckets={wBuckets} />
          </Card>
          <Card>
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-mut">{t('stats.monthlyLoad')}</div>
            <LoadChart buckets={mBuckets} />
          </Card>
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-wider text-mut/60">
          {t('stats.loadNote')}
        </p>
      </Section>

      <Section title={t('stats.consistency')}>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label={t('stats.currentStreak')} value={`${streak.current}d`} />
          <StatCard label={t('stats.longestStreak')} value={`${streak.longest}d`} />
          <StatCard label={t('stats.sessionsPerWeek')} value={String(perWeek)} />
        </div>
      </Section>

      <Section title={t('stats.heavyBag')}>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label={t('stats.bagSessions')} value={String(bag.sessions)} />
          <StatCard label={t('stats.bagRounds')} value={String(bag.rounds)} />
          <StatCard label={t('stats.bagTime')} value={fmtClock(bag.seconds)} />
        </div>
      </Section>

      <Section title={t('stats.mostUsed')}>
        {comboUse.length === 0 ? (
          <Card className="p-5 text-center text-sm text-mut">{t('stats.mostUsedEmpty')}</Card>
        ) : (
          <Card className="flex flex-col divide-y divide-line p-0">
            {comboUse.slice(0, 6).map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <span className="tabular w-6 text-center text-lg font-black text-mut">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-wider">{c.name}</span>
                <span className="tabular shrink-0 text-xs font-bold text-mut">
                  {c.count} {t(c.count === 1 ? 'unit.session' : 'unit.sessions')}
                </span>
              </div>
            ))}
          </Card>
        )}
      </Section>

      <Section title={t('stats.techFreq')}>
        {techUse.length === 0 ? (
          <Card className="p-5 text-center text-sm text-mut">{t('stats.techEmpty')}</Card>
        ) : (
          <Card className="flex flex-col gap-2.5 p-4">
            {techUse.slice(0, 10).map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-[11px] font-black uppercase tracking-wider">
                  {t.name}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-panel2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(t.count / maxTech) * 100}%` }} />
                </div>
                <span className="tabular w-8 shrink-0 text-right text-xs font-bold text-mut">{t.count}</span>
              </div>
            ))}
          </Card>
        )}
      </Section>

      <WeeklyOverview />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-mut">{title}</h2>
      {children}
    </div>
  );
}

function LoadChart({ buckets }: { buckets: { label: string; load: number }[] }) {
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="label" stroke="#9a9aa5" fontSize={9} tickLine={false} axisLine={false} interval={0} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            contentStyle={{
              background: '#121216',
              border: '1px solid #26262e',
              borderRadius: 10,
              fontSize: 12,
              color: '#f4f4f1',
            }}
            labelStyle={{ color: '#9a9aa5' }}
          />
          <Bar dataKey="load" fill="#ff4d4d" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeeklyOverview() {
  const { data, addPlan, togglePlan, deletePlan } = useStore();
  const { t, lang } = useI18n();
  const [offset, setOffset] = useState(0);
  const [planFor, setPlanFor] = useState<string | null>(null);

  const weekStart = useMemo(() => {
    const ws = startOfWeek(new Date());
    ws.setDate(ws.getDate() + offset * 7);
    return ws;
  }, [offset]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const key = dateKey(d.getTime());
      return {
        key,
        date: d,
        label: d.toLocaleDateString(localeFor(lang), { weekday: 'short' }).toUpperCase(),
        sessions: data.sessions.filter((s) => dateKey(s.date) === key).sort((a, b) => a.date - b.date),
        plans: data.plans.filter((p) => p.dateKey === key),
      };
    });
  }, [weekStart, data.sessions, data.plans, lang]);

  const totals = useMemo(() => {
    const allSessions = days.flatMap((d) => d.sessions);
    const minutes = Math.round(allSessions.reduce((a, s) => a + s.duration, 0) / 60);
    const load = allSessions.reduce((a, s) => a + s.load, 0);
    const planned = days.flatMap((d) => d.plans).length;
    return { minutes, load, planned, sessions: allSessions.length };
  }, [days]);

  return (
    <Section title={t('stats.weeklyOverview')}>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setOffset(offset - 1)} className="p-2 text-mut hover:text-ink" aria-label={t('stats.prevWeek')}>
          <IconChevronUp size={18} className="rotate-[-90deg]" />
        </button>
        <div className="text-center">
          <div className="text-sm font-black uppercase tracking-wider">
            {offset === 0 ? t('stats.thisWeek') : offset === -1 ? t('stats.lastWeek') : `${weekStart.toLocaleDateString(localeFor(lang), { month: 'short', day: 'numeric' })}`}
          </div>
          <div className="tabular text-[10px] font-bold uppercase tracking-wider text-mut">
            {t('stats.sessionsLine', { n: totals.sessions, time: fmtMinutes(totals.minutes * 60), load: totals.load })}
          </div>
        </div>
        <button onClick={() => setOffset(offset + 1)} className="p-2 text-mut hover:text-ink" aria-label={t('stats.nextWeek')}>
          <IconChevronDown size={18} className="rotate-[-90deg]" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        {days.map((d) => (
          <div key={d.key} className="rounded-xl border border-line bg-panel p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-mut">{d.label}</span>
              <span className="tabular text-[10px] text-mut/60">{d.date.getDate()}</span>
            </div>
            <div className="mt-1.5 flex min-h-10 flex-col gap-1">
              {d.sessions.map((s) => {
                const meta = workoutTypeMeta(s.type);
                return (
                  <div key={s.id} className="flex items-center gap-1.5 rounded-lg bg-panel2 px-2 py-1">
                    <span className="text-xs" aria-hidden>
                      {meta.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[10px] font-bold uppercase">{workoutTypeLabel(s.type, lang)}</span>
                    <span className="tabular text-[9px] text-mut">{Math.round(s.duration / 60)}m</span>
                  </div>
                );
              })}
              {d.plans.map((p) => {
                const meta = workoutTypeMeta(p.type);
                return (
                  <div
                    key={p.id}
                    className={cx(
                      'flex items-center gap-1.5 rounded-lg border border-dashed border-line px-2 py-1',
                      p.done ? 'opacity-50' : '',
                    )}
                  >
                    <button onClick={() => togglePlan(p.id)} aria-label={t('stats.togglePlan')}>
                      {p.done ? <IconCheck size={11} className="text-go" /> : <span className="block h-[11px] w-[11px] rounded-full border border-mut" />}
                    </button>
                    <span className="text-xs" aria-hidden>
                      {meta.icon}
                    </span>
                    <span className={cx('min-w-0 flex-1 truncate text-[10px] font-bold uppercase', p.done ? 'line-through' : '')}>
                      {p.label || workoutTypeLabel(p.type, lang)}
                    </span>
                    <button onClick={() => deletePlan(p.id)} className="text-mut hover:text-accent" aria-label={t('stats.deletePlan')}>
                      <IconX size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setPlanFor(d.key)}
              className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-line py-1 text-[9px] font-black uppercase tracking-wider text-mut/70 hover:text-mut"
            >
              <IconPlus size={10} /> {t('stats.plan')}
            </button>
          </div>
        ))}
      </div>
      <AddPlanModal dateKey={planFor} onClose={() => setPlanFor(null)} onAdd={addPlan} />
    </Section>
  );
}

function AddPlanModal({
  dateKey: key,
  onClose,
  onAdd,
}: {
  dateKey: string | null;
  onClose: () => void;
  onAdd: (p: WeekPlanItem) => void;
}) {
  const { t, lang } = useI18n();
  const [type, setType] = useState<WorkoutType>('heavy-bag');
  const [label, setLabel] = useState('');
  const [minutes, setMinutes] = useState(60);

  const save = () => {
    if (!key) return;
    onAdd({
      id: uid(),
      dateKey: key,
      type,
      label: label.trim().toUpperCase(),
      durationMin: minutes,
      done: false,
    });
    setLabel('');
    onClose();
  };

  return (
    <Modal open={key != null} onClose={onClose} title={t('stats.planSession')}>
      <div className="flex flex-col gap-4">
        <Field label={t('common.type')}>
          <Select value={type} onChange={(e) => setType(e.target.value as WorkoutType)}>
            {WORKOUT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {workoutTypeLabel(t.id, lang)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('stats.labelOptional')}>
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder={lang === 'it' ? 'Padwork con l\'allenatore' : 'Padwork with coach'} />
        </Field>
        <Field label={t('stats.plannedMinutes')}>
          <Stepper value={minutes} onChange={setMinutes} min={5} max={300} step={5} suffix="min" />
        </Field>
        <Button variant="primary" onClick={save}>
          {t('stats.addToWeek')}
        </Button>
      </div>
    </Modal>
  );
}
