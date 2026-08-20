import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/AppStore';
import { useI18n } from '../lib/i18n';
import type { RoundBase, RoundType, Workout, WorkoutRound, WorkoutType } from '../types';
import { DEFAULT_RANDOM, ROUND_TYPES, WORKOUT_TYPES, roundTypeLabel } from '../types';
import { uid } from '../lib/id';
import { fmtClock } from '../lib/format';
import { configFromWorkout } from '../lib/session';
import { clearActive } from '../data/storage';
import { Button, Card, Field, Select, TextInput, TimeField } from '../components/ui';
import ComboPicker from '../components/ComboPicker';
import RandomConfigEditor from '../components/RandomConfigEditor';
import {
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconPlay,
  IconPlus,
  IconTrash,
} from '../components/Icons';
import { useToast } from '../components/Toast';

function newRound(duration = 180, rest = 60): WorkoutRound {
  return {
    id: uid(),
    duration,
    restDuration: rest,
    type: 'free',
    combinationIds: [],
    rotationInterval: 30,
    rotationOrder: 'sequential',
  };
}

export default function WorkoutBuilderPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { data, saveWorkout } = useStore();

  const existing = id ? data.workouts.find((w) => w.id === id) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<WorkoutType>(existing?.type ?? 'heavy-bag');
  const [rounds, setRounds] = useState<WorkoutRound[]>(
    existing ? existing.rounds.map((r) => ({ ...r, combinationIds: [...r.combinationIds] })) : [newRound()],
  );
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const comboById = useMemo(() => new Map(data.combinations.map((c) => [c.id, c])), [data.combinations]);

  const patchRound = (rid: string, patch: Partial<WorkoutRound>) =>
    setRounds((rs) => rs.map((r) => (r.id === rid ? { ...r, ...patch } : r)));

  const moveRound = (i: number, dir: -1 | 1) =>
    setRounds((rs) => {
      const j = i + dir;
      if (j < 0 || j >= rs.length) return rs;
      const copy = rs.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const duplicateRound = (i: number) =>
    setRounds((rs) => {
      const copy = rs.slice();
      copy.splice(i + 1, 0, { ...rs[i], id: uid() });
      return copy;
    });

  const removeRound = (rid: string) => setRounds((rs) => rs.filter((r) => r.id !== rid));

  const totals = useMemo(() => {
    const work = rounds.reduce((a, r) => a + r.duration, 0);
    const rest = rounds.reduce((a, r, i) => a + (i < rounds.length - 1 ? r.restDuration : 0), 0);
    return { work, rest, total: work + rest };
  }, [rounds]);

  const validate = (): string | null => {
    if (!name.trim()) return t('builder.giveName');
    if (rounds.length === 0) return t('builder.addRound');
    for (const r of rounds) {
      if (r.duration < 5) return t('builder.minSeconds');
    }
    return null;
  };

  const buildWorkout = (): Workout => ({
    id: existing?.id ?? uid(),
    name: name.trim().toUpperCase(),
    type,
    createdAt: existing?.createdAt ?? Date.now(),
    rounds: rounds.map((r, i) => ({
      ...r,
      restDuration: i < rounds.length - 1 ? r.restDuration : 0,
    })),
  });

  const save = (andStart: boolean) => {
    const err = validate();
    if (err) {
      toast.show(err);
      return;
    }
    const w = buildWorkout();
    saveWorkout(w);
    toast.show(t('builder.saved'));
    if (andStart) {
      clearActive();
      nav('/live', { state: { config: configFromWorkout(w, data.settings.prepSeconds) } });
    } else nav('/workouts');
  };

  return (
    <div>
      <h1 className="text-xl font-black uppercase tracking-[0.14em]">{existing ? t('builder.edit') : t('builder.new')}</h1>

      <Card className="mt-4 flex flex-col gap-4">
        <Field label={t('builder.workoutName')}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={lang === 'it' ? 'ALLENAMENTO SACCO PESANTE' : 'HEAVY BAG WORKOUT'} />
        </Field>
        <Field label={t('common.type')}>
          <Select value={type} onChange={(e) => setType(e.target.value as WorkoutType)}>
            {WORKOUT_TYPES.filter((t) => t.id !== 'running' && t.id !== 'strength').map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {lang === 'en' ? t.labelEn : t.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-center justify-between rounded-xl bg-panel2 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-mut">
          <span>
            {t('builder.workRest', { w: fmtClock(totals.work), r: fmtClock(totals.rest) })}
          </span>
          <span className="text-ink">{t('common.total')} {fmtClock(totals.total)}</span>
        </div>
      </Card>

      <div className="mt-6 flex flex-col gap-4">
        {rounds.map((r, i) => (
          <RoundEditor
            key={r.id}
            index={i}
            round={r}
            isLast={i === rounds.length - 1}
            comboName={(cid) => comboById.get(cid)?.name ?? t('builder.deletedCombo')}
            onPatch={(patch) => patchRound(r.id, patch)}
            onMove={(dir) => moveRound(i, dir)}
            onDuplicate={() => duplicateRound(i)}
            onRemove={() => removeRound(r.id)}
            onPickCombos={() => setPickerFor(r.id)}
            canMoveUp={i > 0}
            canMoveDown={i < rounds.length - 1}
          />
        ))}
      </div>

      <Button
        variant="ghost"
        className="mt-4 w-full border-dashed"
        onClick={() => {
          const last = rounds[rounds.length - 1];
          setRounds((rs) => [...rs, newRound(last?.duration ?? 180, last?.restDuration ?? 60)]);
        }}
      >
        <IconPlus size={16} /> {t('builder.addRoundBtn')}
      </Button>

      <div className="mt-6 flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={() => nav('/workouts')}>
          {t('common.cancel')}
        </Button>
        <Button variant="ghost" className="flex-1" onClick={() => save(true)}>
          <IconPlay size={16} /> {t('builder.saveStart')}
        </Button>
        <Button variant="primary" className="flex-1" onClick={() => save(false)}>
          {t('common.save')}
        </Button>
      </div>

      <ComboPicker
        open={pickerFor != null}
        onClose={() => setPickerFor(null)}
        selected={rounds.find((r) => r.id === pickerFor)?.combinationIds ?? []}
        onChange={(ids) => {
          if (!pickerFor) return;
          const round = rounds.find((r) => r.id === pickerFor);
          const wasComboType = round?.type === 'combination' || round?.type === 'sequence';
          const nextType =
            wasComboType && ids.length > 1 ? 'sequence' : wasComboType && ids.length === 1 ? 'combination' : round?.type;
          patchRound(pickerFor, {
            combinationIds: ids,
            ...(nextType ? { type: nextType } : {}),
          });
        }}
      />

      {id && !existing ? (
        <div className="mt-6 rounded-xl border border-line bg-panel p-4 text-sm text-mut">
          {t('builder.notFound')}
        </div>
      ) : null}
    </div>
  );
}

function RoundEditor({
  index,
  round,
  isLast,
  comboName,
  onPatch,
  onMove,
  onDuplicate,
  onRemove,
  onPickCombos,
  canMoveUp,
  canMoveDown,
}: {
  index: number;
  round: WorkoutRound;
  isLast: boolean;
  comboName: (id: string) => string;
  onPatch: (patch: Partial<WorkoutRound>) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onPickCombos: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const { t, lang } = useI18n();
  const needsCombos = round.type === 'combination' || round.type === 'sequence';
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black uppercase tracking-[0.18em]">{t('builder.roundN', { n: index + 1 })}</span>
        <div className="flex items-center">
          <button onClick={() => onMove(-1)} disabled={!canMoveUp} className="p-2 text-mut hover:text-ink disabled:opacity-20" aria-label={t('builder.moveUp')}>
            <IconChevronUp size={16} />
          </button>
          <button onClick={() => onMove(1)} disabled={!canMoveDown} className="p-2 text-mut hover:text-ink disabled:opacity-20" aria-label={t('builder.moveDown')}>
            <IconChevronDown size={16} />
          </button>
          <button onClick={onDuplicate} className="p-2 text-mut hover:text-ink" aria-label={t('builder.duplicate')}>
            <IconCopy size={16} />
          </button>
          <button onClick={onRemove} className="p-2 text-accent" aria-label={t('builder.deleteRound')}>
            <IconTrash size={16} />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label={t('common.duration')}>
          <TimeField value={round.duration} onChange={(v) => onPatch({ duration: v })} min={5} step={15} />
        </Field>
        <Field label={isLast ? t('builder.restLast') : t('builder.restAfter')}>
          <TimeField
            value={isLast ? 0 : round.restDuration}
            onChange={(v) => onPatch({ restDuration: v })}
            min={0}
            step={15}
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field label={t('builder.roundType')}>
          <Select value={round.type} onChange={(e) => onPatch({ type: e.target.value as RoundType })}>
            {ROUND_TYPES.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {roundTypeLabel(rt.id, lang)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {needsCombos ? (
        <div className="mt-3 flex flex-col gap-3">
          <button
            onClick={onPickCombos}
            className="flex min-h-12 items-center justify-between rounded-xl border border-line bg-panel2 px-3 py-2 text-left transition hover:border-mut/50"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-semibold uppercase tracking-wider">
              {round.combinationIds.length === 0
                ? t('builder.selectCombos')
                : round.combinationIds.map(comboName).join(' · ')}
            </span>
            <span className="ml-2 shrink-0 text-[10px] font-black text-mut">
              {t('builder.selected', { n: round.combinationIds.length })}
            </span>
          </button>
          {round.type === 'sequence' && round.combinationIds.length > 1 ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('train.rotateEvery')}>
                <TimeField
                  value={round.rotationInterval}
                  onChange={(v) => onPatch({ rotationInterval: Math.max(5, v) })}
                  min={5}
                  step={5}
                />
              </Field>
              <Field label={t('train.order')}>
                <Select
                  value={round.rotationOrder}
                  onChange={(e) => onPatch({ rotationOrder: e.target.value as RoundBase['rotationOrder'] })}
                >
                  <option value="sequential">{t('common.sequential')}</option>
                  <option value="random">{t('common.random')}</option>
                </Select>
              </Field>
            </div>
          ) : null}
        </div>
      ) : null}

      {round.type === 'random' ? (
        <div className="mt-3">
          <RandomConfigEditor
            value={round.randomConfig ?? DEFAULT_RANDOM}
            onChange={(rc) => onPatch({ randomConfig: rc })}
          />
        </div>
      ) : null}

      {round.type === 'custom' || round.type === 'conditioning' || round.type === 'defense' ? (
        <div className="mt-3">
          <Field label={t('builder.focusLabel')}>
            <TextInput
              value={round.label ?? ''}
              onChange={(e) => onPatch({ label: e.target.value })}
              placeholder={
                round.type === 'defense'
                  ? lang === 'it' ? 'SCHIVATE & PARATE' : 'SLIPS & CHECKS'
                  : round.type === 'conditioning'
                    ? lang === 'it' ? 'BURPEES TRA I COLPI' : 'BURPEES BETWEEN STRIKES'
                    : lang === 'it' ? 'FOCUS PERSONALIZZATO' : 'CUSTOM FOCUS'
              }
            />
          </Field>
        </div>
      ) : null}

      {round.type === 'free' ? (
        <p className="mt-3 text-[11px] uppercase tracking-wider text-mut">{t('builder.freeHint')}</p>
      ) : null}
    </Card>
  );
}
