import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/AppStore';
import { useI18n } from '../lib/i18n';
import type { LiveConfig } from '../types';
import { techniqueShort } from '../types';
import { buildPlan, type Segment, type Slot } from '../engine/plan';
import { nextSlotPreview } from '../engine/resolve';
import { useSessionEngine } from '../engine/useSessionEngine';
import { buildSummary } from '../lib/session';
import { fmtClock } from '../lib/format';
import { clearActive, saveActive, loadActive } from '../data/storage';
import { useWakeLock } from '../lib/wakelock';
import { Button, ConfirmDialog, cx } from '../components/ui';
import {
  IconPause,
  IconPlay,
  IconRestart,
  IconSkipBack,
  IconSkipFwd,
  IconX,
} from '../components/Icons';

interface LiveNavState {
  config?: LiveConfig;
  resume?: { elapsedMs: number };
}

type ShortOf = (id: string) => string;
type TFn = (key: string, vars?: Record<string, string | number>) => string;

function slotTitle(slot: Slot, t: TFn): string {
  if (slot.kind === 'random') return t('live.randomSlot', { n: slot.name });
  if (slot.name) return slot.name;
  switch (slot.kind) {
    case 'defense':
      return t('live.defenseSlot');
    case 'conditioning':
      return t('live.conditioningSlot');
    case 'custom':
      return t('live.customSlot');
    default:
      return t('live.free');
  }
}

function workLabel(seg: Segment, t: TFn): string {
  switch (seg.roundType) {
    case 'free':
      return t('live.free');
    case 'defense':
      return t('live.defenseSlot');
    case 'conditioning':
      return t('live.conditioningSlot');
    case 'custom':
      return seg.label || t('live.customSlot');
    default:
      return t('common.work');
  }
}

export default function LivePage() {
  const location = useLocation();
  const nav = useNavigate();
  const { data } = useStore();
  const { t, lang } = useI18n();

  const navState = (location.state ?? null) as LiveNavState | null;
  const snapshot = useMemo(() => loadActive(), []);
  const config = navState?.config ?? snapshot?.config ?? null;
  const initialElapsedMs = navState?.resume?.elapsedMs ?? snapshot?.totalElapsedMs ?? 0;

  const plan = useMemo(
    () => (config ? buildPlan(config, data.techniques, data.combinations) : null),
    [config, data.techniques, data.combinations],
  );

  const shortMap = useMemo(
    () => new Map(data.techniques.map((t) => [t.id, techniqueShort(t, lang)])),
    [data.techniques, lang],
  );
  const shortOf = useCallback<ShortOf>((id) => shortMap.get(id) ?? '?', [shortMap]);

  const seenRef = useRef<Set<string>>(new Set());
  const lastSaveRef = useRef(0);
  const [exitConfirm, setExitConfirm] = useState(false);

  const handleDone = useCallback(() => {
    clearActive();
    if (!config || !plan) return;
    const summary = buildSummary(plan, seenRef.current, data.combinations, data.techniques, lang);
    nav('/complete', { state: { config, summary } });
  }, [config, plan, data.combinations, data.techniques, nav, lang]);

  const onSnapshot = useCallback(
    (ms: number, status: string) => {
      if (!config || status === 'done') return;
      const now = Date.now();
      if (status === 'running' && now - lastSaveRef.current < 1000) return;
      lastSaveRef.current = now;
      saveActive({ config, totalElapsedMs: ms, status: status === 'running' ? 'running' : 'paused', savedAt: now });
    },
    [config],
  );

  const engine = useSessionEngine(
    plan ?? { segments: [], totalSeconds: 0, workSeconds: 0, restSeconds: 0, rounds: 0 },
    {
      soundOn: data.settings.sound,
      vibrationOn: data.settings.vibration,
      initialElapsedMs,
      onDone: handleDone,
      onSnapshot,
    },
  );

  useWakeLock(engine.status === 'running');

  useEffect(() => {
    if (engine.status === 'idle' || engine.status === 'done') return;
    const seg = engine.view.segment;
    if (seg?.kind === 'work') {
      const slot = seg.slots[engine.view.slotIndex];
      if (slot?.comboId) seenRef.current.add(slot.comboId);
    }
  }, [engine.view.segIndex, engine.view.slotIndex, engine.status, engine.view.segment]);

  if (!config || !plan || plan.segments.length === 0) return <Navigate to="/" replace />;
  if (initialElapsedMs >= plan.totalSeconds * 1000) {
    clearActive();
    return <Navigate to="/" replace />;
  }

  const { status, view } = engine;
  const seg = view.segment;

  const exit = () => {
    clearActive();
    nav('/');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex select-none flex-col overflow-hidden bg-bg"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-mut">{config.name}</div>
          {seg && seg.totalRounds > 0 && status !== 'idle' ? (
            <div className="tabular text-[11px] font-bold uppercase tracking-widest text-mut/70">
              {seg.kind === 'prep' ? t('live.preparing') : t('live.roundOf', { x: Math.max(1, seg.round), y: seg.totalRounds })}
            </div>
          ) : null}
        </div>
        <button
          onClick={() => setExitConfirm(true)}
          className="-m-2 p-2 text-mut transition hover:text-ink"
          aria-label={t('live.exitWorkout')}
        >
          <IconX size={22} />
        </button>
      </div>

      {status === 'idle' ? (
        <IdleScreen config={config} totalSeconds={plan.totalSeconds} rounds={plan.rounds} onStart={engine.start} />
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-4 md:flex-row md:gap-14">
            <TimerBlock status={status} seg={seg} segRemaining={view.segRemaining} />
            <PhaseBlock
              plan={plan}
              seg={seg}
              segIndex={view.segIndex}
              slotIndex={view.slotIndex}
              status={status}
              shortOf={shortOf}
            />
          </div>

          <div className="px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
            <div className="mx-auto flex max-w-md items-center justify-center gap-7">
              <ControlBtn onClick={engine.prev} label={t('live.previous')}>
                <IconSkipBack size={26} />
              </ControlBtn>
              <button
                onClick={engine.toggle}
                aria-label={status === 'running' ? t('common.pause') : t('common.resume')}
                className={cx(
                  'flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg shadow-black/50 transition active:scale-95',
                  status === 'running' ? 'bg-accent' : 'bg-go text-black',
                )}
              >
                {status === 'running' ? <IconPause size={40} /> : <IconPlay size={40} />}
              </button>
              <ControlBtn onClick={engine.skip} label={t('live.skip')}>
                <IconSkipFwd size={26} />
              </ControlBtn>
            </div>
            <div className="mx-auto mt-3 flex max-w-md flex-wrap items-center justify-center gap-1.5">
              <SmallBtn onClick={engine.restart}>
                <IconRestart size={15} /> {t('live.restart')}
              </SmallBtn>
              <SmallBtn onClick={() => setExitConfirm(true)}>
                <IconX size={15} /> {t('live.exit')}
              </SmallBtn>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={exitConfirm}
        title={t('live.exitWorkout')}
        message={t('live.exitMsg')}
        confirmLabel={t('live.exit')}
        onCancel={() => setExitConfirm(false)}
        onConfirm={exit}
      />
    </div>
  );
}

function IdleScreen({
  config,
  totalSeconds,
  rounds,
  onStart,
}: {
  config: LiveConfig;
  totalSeconds: number;
  rounds: number;
  onStart: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <div className="text-[11px] font-black uppercase tracking-[0.3em] text-mut">{t('live.ready')}</div>
        <div className="mt-2 text-4xl font-black uppercase tracking-tight">{config.name}</div>
        <div className="tabular mt-3 text-sm font-bold uppercase tracking-[0.2em] text-mut">
          {t('live.total', { rounds, time: fmtClock(totalSeconds) })}
        </div>
      </div>
      <Button variant="primary" size="xl" className="h-20 w-full max-w-sm text-2xl" onClick={onStart}>
        <IconPlay size={28} /> {t('common.start')}
      </Button>
      <p className="max-w-xs text-center text-[11px] uppercase tracking-wider text-mut/70">
        {t('live.soundHint')}
      </p>
    </div>
  );
}

function TimerBlock({ status, seg, segRemaining }: { status: string; seg: Segment | null; segRemaining: number }) {
  const { t } = useI18n();
  if (!seg) return null;
  const remaining = Math.max(0, Math.ceil(segRemaining));
  const counting = status === 'running' && remaining <= 3;
  const warning = status === 'running' && remaining <= 10 && remaining > 3;
  const color =
    seg.kind === 'rest' ? 'text-rest' : seg.kind === 'prep' ? 'text-warn' : warning ? 'text-warn' : 'text-ink';
  const progress = seg.duration > 0 ? (seg.duration - segRemaining) / seg.duration : 0;
  const barColor = seg.kind === 'rest' ? 'bg-rest' : seg.kind === 'prep' ? 'bg-warn' : 'bg-accent';

  const label =
    seg.kind === 'prep' ? t('live.getReady') : seg.kind === 'rest' ? t('common.rest') : workLabel(seg, t);

  return (
    <div className="flex shrink-0 flex-col items-center md:w-[46%]">
      <div
        className={cx(
          'text-[10px] font-black uppercase tracking-[0.34em]',
          seg.kind === 'rest' ? 'text-rest' : seg.kind === 'prep' ? 'text-warn' : 'text-accent',
        )}
      >
        {label}
      </div>
      {counting ? (
        <div
          key={remaining}
          className={cx('count-pop tabular leading-none', color)}
          style={{ fontSize: 'clamp(7rem, min(34vw, 42vh), 17rem)', fontWeight: 900 }}
        >
          {remaining}
        </div>
      ) : (
        <div
          className={cx(
            'tabular leading-none',
            color,
            warning ? 'soft-pulse' : '',
            status === 'paused' ? 'opacity-60' : '',
          )}
          style={{ fontSize: 'clamp(4.5rem, min(23vw, 30vh), 12rem)', fontWeight: 900 }}
        >
          {fmtClock(segRemaining)}
        </div>
      )}
      <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-panel2 md:max-w-sm">
        <div className={cx('h-full transition-[width] duration-200', barColor)} style={{ width: `${progress * 100}%` }} />
      </div>
      {status === 'paused' ? (
        <div className="soft-pulse mt-3 text-sm font-black uppercase tracking-[0.3em] text-warn">{t('live.paused')}</div>
      ) : null}
    </div>
  );
}

function PhaseBlock({
  plan,
  seg,
  segIndex,
  slotIndex,
  status,
  shortOf,
}: {
  plan: ReturnType<typeof buildPlan>;
  seg: Segment | null;
  segIndex: number;
  slotIndex: number;
  status: string;
  shortOf: ShortOf;
}) {
  const { t } = useI18n();
  if (!seg) return null;

  if (seg.kind === 'prep') {
    const firstWork = plan.segments.find((s) => s.kind === 'work');
    return (
      <div className="flex min-h-0 flex-col items-center gap-2 text-center md:w-[46%]">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-mut">{t('live.firstUp')}</div>
        {firstWork?.slots[0] ? <SlotName slot={firstWork.slots[0]} className="text-mut" /> : null}
        {firstWork?.slots[0] ? <TechList ids={firstWork.slots[0].techniqueIds} size="md" dim shortOf={shortOf} /> : null}
      </div>
    );
  }

  if (seg.kind === 'rest') {
    const next = nextSlotPreview(plan, segIndex, slotIndex);
    return (
      <div className="flex min-h-0 flex-col items-center gap-2 text-center md:w-[46%]">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-mut">
          {next.kind === 'round' ? t('live.nextRound', { n: next.round ?? 0 }) : t('live.next')}
        </div>
        {next.slot ? <SlotName slot={next.slot} className="text-mut" /> : null}
        {next.slot ? <TechList ids={next.slot.techniqueIds} size="md" dim shortOf={shortOf} /> : null}
      </div>
    );
  }

  const slot = seg.slots[slotIndex];
  const preview = nextSlotPreview(plan, segIndex, slotIndex);

  return (
    <div className="flex min-h-0 w-full flex-col items-center gap-3 md:w-[46%]">
      {seg.slots.length > 1 ? (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-mut">
            {slot ? slotTitle(slot, t) : ''}
          </span>
          <span className="flex gap-1">
            {seg.slots.map((_, i) => (
              <span key={i} className={cx('h-1.5 w-1.5 rounded-full', i === slotIndex ? 'bg-accent' : 'bg-line')} />
            ))}
          </span>
        </div>
      ) : (
        <SlotName slot={slot} className="text-mut" />
      )}

      {slot ? (
        slot.free ? (
          <div className="flex flex-col items-center gap-1">
            <div className="text-center text-5xl font-black uppercase tracking-tight md:text-7xl">
              {slotTitle(slot, t)}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-mut">
              {slot.kind === 'free' ? t('live.throwEverything') : t('live.staySharp')}
            </div>
          </div>
        ) : (
          <TechList
            key={`${segIndex}-${slotIndex}`}
            ids={slot.techniqueIds}
            size="lg"
            pop={status !== 'paused'}
            shortOf={shortOf}
          />
        )
      ) : null}

      {preview.kind !== 'none' && preview.slot ? (
        <div className="flex w-full flex-col items-center gap-0.5 border-t border-line pt-2">
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-mut/70">
            {preview.kind === 'round' ? t('live.nextRoundShort', { n: preview.round ?? 0 }) : t('live.next')}
          </div>
          <div className="max-w-full truncate text-sm font-bold uppercase tracking-wider text-mut">
            {preview.slot.free ? t('live.freeSlot') : preview.slot.techniqueIds.map(shortOf).join(' → ')}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SlotName({ slot, className }: { slot?: Slot; className?: string }) {
  const { t } = useI18n();
  if (!slot) return null;
  return <div className={cx('text-[10px] font-black uppercase tracking-[0.24em]', className)}>{slotTitle(slot, t)}</div>;
}

function TechList({
  ids,
  size,
  dim,
  pop,
  shortOf,
}: {
  ids: string[];
  size: 'md' | 'lg';
  dim?: boolean;
  pop?: boolean;
  shortOf: ShortOf;
}) {
  const longest = ids.reduce((m, id) => Math.max(m, shortOf(id).length), 0);
  const fitVw = 90 / (0.65 * Math.max(1, longest));
  const base =
    size === 'lg'
      ? ids.length > 4
        ? 'clamp(1.6rem,min(7.5vw,9vh),3.4rem)'
        : 'clamp(2rem,min(10vw,12vh),5rem)'
      : 'clamp(1rem,min(4.5vw,6vh),1.8rem)';
  const fontSize = `min(${base}, ${fitVw}vw)`;
  return (
    <div className={cx('flex min-h-0 w-full flex-col items-center justify-center leading-tight', pop ? 'combo-pop' : '')}>
      {ids.map((id, i) => (
        <span
          key={`${id}-${i}`}
          className={cx(
            'max-w-full whitespace-nowrap font-black uppercase tracking-tight',
            dim ? 'text-mut' : 'text-ink',
          )}
          style={{ fontSize }}
        >
          {shortOf(id)}
        </span>
      ))}
    </div>
  );
}

function ControlBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-panel text-ink transition active:scale-90 active:border-mut"
    >
      {children}
    </button>
  );
}

function SmallBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[10px] font-black uppercase tracking-wider text-mut transition hover:text-ink"
    >
      {children}
    </button>
  );
}
