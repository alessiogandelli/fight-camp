import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/AppStore';
import { useI18n } from '../lib/i18n';
import type { Feeling, LiveConfig, SessionRecord, SessionSummary } from '../types';
import { uid } from '../lib/id';
import { fmtClock } from '../lib/format';
import { computeLoad } from '../lib/stats';
import { clearActive } from '../data/storage';
import { Button, Card, ConfirmDialog, Field, TextArea, cx } from '../components/ui';
import { IconCheck } from '../components/Icons';
import { useToast } from '../components/Toast';

interface CompleteNavState {
  config?: LiveConfig;
  summary?: SessionSummary;
}

const FEELINGS: { id: Feeling; key: string }[] = [
  { id: 'great', key: 'feeling.great' },
  { id: 'good', key: 'feeling.good' },
  { id: 'ok', key: 'feeling.ok' },
  { id: 'drained', key: 'feeling.drained' },
];

export default function CompletePage() {
  const location = useLocation();
  const nav = useNavigate();
  const { addSession } = useStore();
  const toast = useToast();
  const { t } = useI18n();

  const state = (location.state ?? null) as CompleteNavState | null;
  const [rpe, setRpe] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [notes, setNotes] = useState('');
  const [discard, setDiscard] = useState(false);

  if (!state?.config || !state.summary) return <Navigate to="/" replace />;
  const { config, summary } = state;

  const save = () => {
    if (rpe == null) {
      toast.show(t('complete.selectRpe'));
      return;
    }
    const record: SessionRecord = {
      id: uid(),
      date: Date.now(),
      type: config.type,
      source: 'timer',
      workoutId: config.workoutId,
      name: config.name,
      roundsCompleted: summary.totalRounds,
      totalRounds: summary.totalRounds,
      duration: summary.totalSeconds,
      workDuration: summary.workSeconds,
      rpe,
      load: computeLoad(summary.totalSeconds, rpe),
      notes: notes.trim() || undefined,
      energyBefore: energy ?? undefined,
      feelingAfter: feeling ?? undefined,
      combosUsed: summary.combosUsed,
      techniqueUsage: summary.techniqueUsage,
    };
    addSession(record);
    clearActive();
    toast.show(t('complete.saved'));
    nav('/history');
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-10 pt-10">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-go/15 text-go">
          <IconCheck size={30} />
        </div>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-[0.1em]">{t('complete.title')}</h1>
        <div className="mt-1 text-sm font-bold uppercase tracking-[0.2em] text-mut">{config.name}</div>
      </div>

      <Card className="mt-6">
        <div className="grid grid-cols-2 gap-4">
          <SummaryItem label={t('complete.rounds')} value={String(summary.totalRounds)} />
          <SummaryItem label={t('complete.estSession')} value={fmtClock(summary.totalSeconds)} />
          <SummaryItem label={t('complete.work')} value={fmtClock(summary.workSeconds)} />
          <SummaryItem label={t('complete.rest')} value={fmtClock(summary.restSeconds)} />
        </div>
      </Card>

      <div className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-mut">{t('complete.howHard')}</span>
          <span className="tabular text-sm font-black text-accent">{rpe != null ? `RPE ${rpe}` : t('complete.rpe')}</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setRpe(n)}
              className={cx(
                'tabular h-12 rounded-xl border text-lg font-black transition active:scale-95',
                rpe === n
                  ? 'border-accent bg-accent text-white'
                  : n >= 8
                    ? 'border-line bg-panel text-accent/70'
                    : 'border-line bg-panel text-ink hover:border-mut/60',
              )}
            >
              {n}
            </button>
          ))}
        </div>
        {rpe != null ? (
          <p className="tabular mt-2 text-[11px] uppercase tracking-wider text-mut">
            {t('complete.loadApprox', { n: computeLoad(summary.totalSeconds, rpe) })}
          </p>
        ) : null}
      </div>

      <div className="mt-6">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-mut">{t('complete.energyBefore')}</span>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setEnergy(energy === n ? null : n)}
              className={cx(
                'tabular h-10 rounded-xl border text-base font-black transition active:scale-95',
                energy === n ? 'border-warn bg-warn/15 text-warn' : 'border-line bg-panel text-mut',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-mut">{t('complete.feelingAfter')}</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {FEELINGS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFeeling(feeling === f.id ? null : f.id)}
              className={cx(
                'h-10 rounded-full border px-4 text-[11px] font-bold uppercase tracking-wider transition',
                feeling === f.id ? 'border-go bg-go/15 text-go' : 'border-line bg-panel text-mut',
              )}
            >
              {t(f.key)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Field label={t('complete.notes')}>
          <TextArea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('complete.notesPlaceholder')}
          />
        </Field>
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" onClick={() => setDiscard(true)}>
          {t('complete.discard')}
        </Button>
        <Button variant="primary" size="lg" className="flex-1" onClick={save}>
          {t('complete.saveSession')}
        </Button>
      </div>

      <ConfirmDialog
        open={discard}
        title={t('complete.discardTitle')}
        message={t('complete.discardMsg')}
        confirmLabel={t('complete.discard')}
        onCancel={() => setDiscard(false)}
        onConfirm={() => {
          clearActive();
          nav('/');
        }}
      />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-mut">{label}</div>
      <div className="tabular mt-0.5 text-2xl font-black">{value}</div>
    </div>
  );
}
