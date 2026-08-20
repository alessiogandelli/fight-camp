import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/AppStore';
import { useI18n } from '../lib/i18n';
import type { LiveConfig, RandomConfig, TimerPreset } from '../types';
import { DEFAULT_RANDOM } from '../types';
import { loadActive, clearActive } from '../data/storage';
import { uid } from '../lib/id';
import { fmtClock } from '../lib/format';
import { configFromWorkout, summarizeWorkout } from '../lib/session';
import { Button, Card, Field, Segmented, Select, Stepper, TimeField, Toggle, cx } from '../components/ui';
import ComboPicker from '../components/ComboPicker';
import { IconChevronDown, IconPlay, IconX } from '../components/Icons';
import { useToast } from '../components/Toast';
import { vibrationSupported } from '../lib/vibrate';

type ModeId = 'heavy-bag' | 'combo-workout' | 'tabata' | 'intervals' | 'free';

const MODES: { id: ModeId; titleKey: string; subKey: string }[] = [
  { id: 'heavy-bag', titleKey: 'train.heavyBag', subKey: 'train.heavyBagSub' },
  { id: 'combo-workout', titleKey: 'train.comboWorkout', subKey: 'train.comboWorkoutSub' },
  { id: 'tabata', titleKey: 'train.tabata', subKey: 'train.tabataSub' },
  { id: 'intervals', titleKey: 'train.intervals', subKey: 'train.intervalsSub' },
  { id: 'free', titleKey: 'train.free', subKey: 'train.freeSub' },
];

export default function TrainPage() {
  const nav = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  const [open, setOpen] = useState<ModeId | null>(null);
  const [resume, setResume] = useState(() => loadActive());

  useEffect(() => {
    setResume(loadActive());
  }, []);

  const go = (config: LiveConfig) => {
    if (config.rounds.length === 0) {
      toast.show(t('train.nothingToRun'));
      return;
    }
    clearActive();
    nav('/live', { state: { config } });
  };

  return (
    <div>
      <h1 className="sr-only">{t('nav.train')}</h1>
      {resume ? (
        <Card className="mb-4 border-warn/40 bg-warn/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-warn">{t('train.inProgress')}</div>
              <div className="mt-0.5 truncate text-base font-black uppercase tracking-wider">{resume.config.name}</div>
              <div className="tabular text-xs text-mut">{t('train.at', { time: fmtClock(resume.totalElapsedMs / 1000) })}</div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  clearActive();
                  setResume(null);
                }}
              >
                <IconX size={14} />
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => nav('/live', { state: { config: resume.config, resume: { elapsedMs: resume.totalElapsedMs } } })}
              >
                <IconPlay size={14} /> {t('common.resume')}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3">
        {MODES.map((m) => (
          <ModeCard
            key={m.id}
            title={t(m.titleKey)}
            sub={t(m.subKey)}
            open={open === m.id}
            onToggle={() => setOpen(open === m.id ? null : m.id)}
          >
            {m.id === 'heavy-bag' ? <HeavyBagConfig onStart={go} /> : null}
            {m.id === 'combo-workout' ? <ComboWorkoutConfig onStart={go} /> : null}
            {m.id === 'tabata' ? <TabataConfig onStart={go} /> : null}
            {m.id === 'intervals' ? <IntervalsConfig onStart={go} /> : null}
            {m.id === 'free' ? <FreeConfig onStart={go} /> : null}
          </ModeCard>
        ))}
      </div>

      <TimerSettingsCard />
    </div>
  );
}

function ModeCard({
  title,
  sub,
  open,
  onToggle,
  children,
}: {
  title: string;
  sub: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={cx('overflow-hidden rounded-2xl border transition', open ? 'border-accent/50 bg-panel' : 'border-line bg-panel')}>
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-5 py-5 text-left">
        <span>
          <span className="block text-2xl font-black uppercase tracking-[0.08em]">{title}</span>
          <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-mut">{sub}</span>
        </span>
        <IconChevronDown size={22} className={cx('shrink-0 text-mut transition-transform', open ? 'rotate-180' : '')} />
      </button>
      {open ? <div className="border-t border-line px-5 py-5">{children}</div> : null}
    </div>
  );
}

function StartButton({ onStart, label }: { onStart: () => void; label?: string }) {
  const { t } = useI18n();
  return (
    <Button variant="primary" size="xl" className="mt-5 w-full" onClick={onStart}>
      <IconPlay size={22} /> {label ?? t('common.start')}
    </Button>
  );
}

function HeavyBagConfig({ onStart }: { onStart: (c: LiveConfig) => void }) {
  const { data } = useStore();
  const { t } = useI18n();
  const [rounds, setRounds] = useState(5);
  const [duration, setDuration] = useState(180);
  const [rest, setRest] = useState(60);
  const [comboIds, setComboIds] = useState<string[]>(() => data.combinations.slice(0, 3).map((c) => c.id));
  const [interval, setInterval_] = useState(30);
  const [order, setOrder] = useState<'sequential' | 'random'>('sequential');
  const [picker, setPicker] = useState(false);

  const summary =
    comboIds.length > 0
      ? `${rounds} × ${fmtClock(duration)} · ${fmtClock(rest)} ${t('train.restSuffix')}`
      : `${rounds} × ${fmtClock(duration)} ${t('train.freeRounds')}`;

  const start = () => {
    onStart({
      name: t('train.heavyBagName'),
      type: 'heavy-bag',
      prepSeconds: data.settings.prepSeconds,
      rounds: Array.from({ length: rounds }, (_, i) => ({
        duration,
        restDuration: i < rounds - 1 ? rest : 0,
        type: comboIds.length > 1 ? ('sequence' as const) : ('combination' as const),
        combinationIds: comboIds.slice(),
        rotationInterval: Math.max(5, Math.min(interval, duration)),
        rotationOrder: order,
      })),
    });
  };

  return (
    <div>
      <div className="tabular text-center text-sm font-black uppercase tracking-[0.18em] text-mut">{summary}</div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Field label={t('train.rounds')}>
          <Stepper value={rounds} onChange={setRounds} min={1} max={20} />
        </Field>
        <Field label={t('common.round')}>
          <TimeField value={duration} onChange={setDuration} min={5} step={15} />
        </Field>
        <Field label={t('common.rest')}>
          <TimeField value={rest} onChange={setRest} min={0} step={15} />
        </Field>
      </div>
      <div className="mt-4">
        <Field label={t('train.combinations')}>
          <button
            onClick={() => setPicker(true)}
            className="flex min-h-12 w-full items-center justify-between rounded-xl border border-line bg-panel2 px-3 py-2 text-left"
          >
            <ComboSummary ids={comboIds} />
          </button>
        </Field>
      </div>
      {comboIds.length > 1 ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label={t('train.rotateEvery')}>
            <TimeField value={interval} onChange={(v) => setInterval_(Math.max(5, v))} min={5} step={5} />
          </Field>
          <Field label={t('train.order')}>
            <Select value={order} onChange={(e) => setOrder(e.target.value as 'sequential' | 'random')}>
              <option value="sequential">{t('common.sequential')}</option>
              <option value="random">{t('common.random')}</option>
            </Select>
          </Field>
        </div>
      ) : null}
      <StartButton onStart={start} />
      <ComboPicker open={picker} onClose={() => setPicker(false)} selected={comboIds} onChange={setComboIds} />
    </div>
  );
}

function ComboSummary({ ids }: { ids: string[] }) {
  const { data } = useStore();
  const { t } = useI18n();
  if (ids.length === 0)
    return <span className="text-sm font-semibold uppercase tracking-wider text-mut">{t('train.noneFree')}</span>;
  const names = ids
    .map((id) => data.combinations.find((c) => c.id === id)?.name ?? t('common.deleted'))
    .join(' · ');
  return (
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold uppercase tracking-wider">{names}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-mut">{t('train.selected', { n: ids.length })}</span>
    </span>
  );
}

function ComboWorkoutConfig({ onStart }: { onStart: (c: LiveConfig) => void }) {
  const { data } = useStore();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const [selected, setSelected] = useState<string | null>(data.workouts[0]?.id ?? null);
  const workouts = data.workouts.slice().sort((a, b) => b.createdAt - a.createdAt);

  if (workouts.length === 0) {
    return (
      <div className="text-center">
        <p className="text-sm text-mut">{t('train.noWorkouts')}</p>
        <Button variant="primary" className="mt-4" onClick={() => nav('/workouts/new')}>
          {t('train.createWorkout')}
        </Button>
      </div>
    );
  }

  const workout = workouts.find((w) => w.id === selected) ?? workouts[0];

  return (
    <div>
      <div className="flex flex-col gap-2">
        {workouts.map((w) => (
          <button
            key={w.id}
            onClick={() => setSelected(w.id)}
            className={cx(
              'flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition',
              workout.id === w.id ? 'border-accent bg-accent/10' : 'border-line bg-panel2',
            )}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-black uppercase tracking-wider">{w.name}</span>
              <span className="text-[11px] text-mut">{summarizeWorkout(w, lang)}</span>
            </span>
          </button>
        ))}
      </div>
      <StartButton onStart={() => onStart(configFromWorkout(workout, data.settings.prepSeconds))} />
    </div>
  );
}

function TabataConfig({ onStart }: { onStart: (c: LiveConfig) => void }) {
  const { data } = useStore();
  const { t } = useI18n();
  const [work, setWork] = useState(20);
  const [rest, setRest] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [mode, setMode] = useState<'none' | 'fixed' | 'sequential' | 'random'>('sequential');
  const [comboIds, setComboIds] = useState<string[]>(() => data.combinations.slice(0, 3).map((c) => c.id));
  const [picker, setPicker] = useState(false);

  const start = () => {
    const rc: RandomConfig = { ...DEFAULT_RANDOM, count: rounds };
    onStart({
      name: t('train.tabata').toUpperCase(),
      type: 'tabata',
      prepSeconds: data.settings.prepSeconds,
      rounds: Array.from({ length: rounds }, (_, i) => ({
        duration: work,
        restDuration: i < rounds - 1 ? rest : 0,
        type:
          mode === 'none'
            ? ('free' as const)
            : mode === 'random'
              ? ('random' as const)
              : comboIds.length > 1
                ? ('sequence' as const)
                : ('combination' as const),
        combinationIds: mode === 'none' || mode === 'random' ? [] : comboIds.slice(),
        rotationInterval: work,
        rotationOrder: 'sequential' as const,
        randomConfig: mode === 'random' ? rc : undefined,
      })),
    });
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <Field label={t('common.work')}>
          <TimeField value={work} onChange={(v) => setWork(Math.max(5, v))} min={5} step={5} />
        </Field>
        <Field label={t('common.rest')}>
          <TimeField value={rest} onChange={setRest} min={0} step={5} />
        </Field>
        <Field label={t('train.rounds')}>
          <Stepper value={rounds} onChange={setRounds} min={1} max={30} />
        </Field>
      </div>
      <div className="mt-4">
        <Field label={t('train.combinations')}>
          <Segmented
            options={[
              { id: 'none', label: t('common.none') },
              { id: 'fixed', label: t('train.fixed') },
              { id: 'sequential', label: t('train.cycle') },
              { id: 'random', label: t('common.random') },
            ]}
            value={mode}
            onChange={setMode}
          />
        </Field>
      </div>
      {mode === 'fixed' || mode === 'sequential' ? (
        <div className="mt-3">
          <button
            onClick={() => setPicker(true)}
            className="flex min-h-12 w-full items-center justify-between rounded-xl border border-line bg-panel2 px-3 py-2 text-left"
          >
            <ComboSummary ids={comboIds} />
          </button>
          {mode === 'sequential' ? (
            <p className="mt-2 text-[11px] uppercase tracking-wider text-mut">
              {t('train.changesEvery')}
            </p>
          ) : null}
        </div>
      ) : null}
      <StartButton onStart={start} />
      <ComboPicker
        open={picker}
        onClose={() => setPicker(false)}
        selected={comboIds}
        onChange={setComboIds}
        multi={mode === 'sequential'}
      />
    </div>
  );
}

function IntervalsConfig({ onStart }: { onStart: (c: LiveConfig) => void }) {
  const { data, savePreset, deletePreset } = useStore();
  const toast = useToast();
  const { t } = useI18n();
  const [work, setWork] = useState(30);
  const [rest, setRest] = useState(30);
  const [rounds, setRounds] = useState(10);
  const [random, setRandom] = useState(false);
  const [presetId, setPresetId] = useState<string | null>(null);

  const applyPreset = (p: TimerPreset) => {
    setPresetId(p.id);
    setWork(p.workDuration);
    setRest(p.restDuration);
    setRounds(p.rounds);
  };

  const start = () => {
    onStart({
      name: t('train.intervalsName'),
      type: 'intervals',
      prepSeconds: data.settings.prepSeconds,
      rounds: Array.from({ length: rounds }, (_, i) => ({
        duration: work,
        restDuration: i < rounds - 1 ? rest : 0,
        type: random ? ('random' as const) : ('free' as const),
        combinationIds: [],
        rotationInterval: work,
        rotationOrder: 'sequential' as const,
        randomConfig: random ? { ...DEFAULT_RANDOM, count: rounds } : undefined,
      })),
    });
  };

  return (
    <div>
      {data.presets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {data.presets.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              onDoubleClick={() => {
                deletePreset(p.id);
                toast.show(t('train.presetDeleted'));
              }}
              className={cx(
                'h-10 rounded-full border px-4 text-[11px] font-bold uppercase tracking-wider transition',
                presetId === p.id ? 'border-accent bg-accent/15 text-accent' : 'border-line bg-panel2 text-mut',
              )}
              title={t('train.presetHint')}
            >
              {p.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Field label={t('common.work')}>
          <TimeField
            value={work}
            onChange={(v) => {
              setWork(Math.max(5, v));
              setPresetId(null);
            }}
            min={5}
            step={5}
          />
        </Field>
        <Field label={t('common.rest')}>
          <TimeField
            value={rest}
            onChange={(v) => {
              setRest(v);
              setPresetId(null);
            }}
            min={0}
            step={5}
          />
        </Field>
        <Field label={t('train.rounds')}>
          <Stepper
            value={rounds}
            onChange={(v) => {
              setRounds(v);
              setPresetId(null);
            }}
            min={1}
            max={40}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Toggle checked={random} onChange={setRandom} label={t('train.showRandom')} />
      </div>
      <div className="mt-3 flex gap-3">
        <Button
          variant="ghost"
          className="flex-1"
          onClick={() => {
            const p: TimerPreset = {
              id: uid(),
              name: `${fmtClock(work)}/${fmtClock(rest)} × ${rounds}`,
              rounds,
              workDuration: work,
              restDuration: rest,
            };
            savePreset(p);
            setPresetId(p.id);
            toast.show(t('train.presetSaved'));
          }}
        >
          {t('train.savePreset')}
        </Button>
      </div>
      <StartButton onStart={start} />
    </div>
  );
}

function FreeConfig({ onStart }: { onStart: (c: LiveConfig) => void }) {
  const { data } = useStore();
  const { t } = useI18n();
  const [rounds, setRounds] = useState(3);
  const [duration, setDuration] = useState(180);
  const [rest, setRest] = useState(60);

  const start = () => {
    onStart({
      name: t('train.freeRounds'),
      type: 'other',
      prepSeconds: data.settings.prepSeconds,
      rounds: Array.from({ length: rounds }, (_, i) => ({
        duration,
        restDuration: i < rounds - 1 ? rest : 0,
        type: 'free' as const,
        combinationIds: [],
        rotationInterval: duration,
        rotationOrder: 'sequential' as const,
      })),
    });
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        <Field label={t('train.rounds')}>
          <Stepper value={rounds} onChange={setRounds} min={1} max={20} />
        </Field>
        <Field label={t('common.round')}>
          <TimeField value={duration} onChange={setDuration} min={5} step={15} />
        </Field>
        <Field label={t('common.rest')}>
          <TimeField value={rest} onChange={setRest} min={0} step={15} />
        </Field>
      </div>
      <StartButton onStart={start} />
    </div>
  );
}

function TimerSettingsCard() {
  const { data, setSettings } = useStore();
  const { t } = useI18n();
  return (
    <Card className="mt-8 p-4">
      <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-mut">{t('train.timerSettings')}</h2>
      <div className="mt-2 grid grid-cols-1 gap-1">
        <Toggle checked={data.settings.sound} onChange={(v) => setSettings({ sound: v })} label={t('train.soundCues')} />
        {vibrationSupported ? (
          <Toggle
            checked={data.settings.vibration}
            onChange={(v) => setSettings({ vibration: v })}
            label={t('train.vibration')}
          />
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-2 items-end gap-3">
        <Field label={t('train.prepCountdown')} hint={t('train.prepHint')}>
          <Stepper
            value={data.settings.prepSeconds}
            onChange={(v) => setSettings({ prepSeconds: v })}
            min={0}
            max={30}
            step={5}
            suffix="s"
          />
        </Field>
      </div>
    </Card>
  );
}
