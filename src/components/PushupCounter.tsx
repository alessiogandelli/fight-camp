import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/AppStore';
import { useI18n } from '../lib/i18n';
import { usePushupCounter } from '../lib/pushups';
import { useWakeLock } from '../lib/wakelock';
import { computeLoad } from '../lib/stats';
import { uid } from '../lib/id';
import type { SessionRecord } from '../types';
import { Button, cx } from './ui';
import { IconPlay, IconX } from './Icons';
import { useToast } from './Toast';
import { fmtClock } from '../lib/format';

export default function PushupCounter() {
  const { t } = useI18n();
  const { data, addSession } = useStore();
  const toast = useToast();
  const counter = usePushupCounter({ soundOn: data.settings.sound, vibrationOn: data.settings.vibration });
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  useWakeLock(counter.running);

  useEffect(() => {
    if (!counter.running) return;
    startRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [counter.running]);

  const save = () => {
    if (counter.count === 0) {
      toast.show(t('pushups.nothingToSave'));
      return;
    }
    const record: SessionRecord = {
      id: uid(),
      date: Date.now(),
      type: 'strength',
      source: 'manual',
      name: t('pushups.name').toUpperCase(),
      duration: Math.max(60, elapsed),
      load: computeLoad(Math.max(60, elapsed)),
      strength: [{ exercise: t('pushups.exercise'), sets: 1, reps: counter.count }],
    };
    addSession(record);
    counter.stop();
    counter.reset();
    setElapsed(0);
    toast.show(t('pushups.saved'));
  };

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mut">{t('pushups.hint')}</p>

      {!counter.running ? (
        <div className="mt-4 flex flex-col gap-3">
          {counter.error === 'permission' ? (
            <p className="text-sm text-warn">{t('pushups.errorPermission')}</p>
          ) : null}
          {counter.error === 'no-camera' ? (
            <p className="text-sm text-warn">{t('pushups.errorNoCamera')}</p>
          ) : null}
          {counter.error === 'generic' ? (
            <p className="text-sm text-warn">{t('pushups.errorGeneric')}</p>
          ) : null}
          <Button variant="primary" size="xl" className="w-full" onClick={() => void counter.start()}>
            <IconPlay size={22} /> {t('common.start')}
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-4">
          <div className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-line bg-black/60">
            <video
              ref={counter.videoRef}
              muted
              playsInline
              autoPlay
              className="h-40 w-full -scale-x-100 object-cover"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span
                className={cx(
                  'text-[11px] font-black uppercase tracking-[0.2em] transition',
                  counter.calibrated ? 'text-go' : 'text-warn',
                )}
              >
                {counter.calibrated ? t('pushups.detecting') : t('pushups.moveCloser')}
              </span>
            </div>
          </div>

          <div className="text-center">
            <div className="count-pop tabular text-7xl font-black leading-none" key={counter.count}>
              {counter.count}
            </div>
            <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-mut">
              {t('pushups.count')} · {fmtClock(elapsed)}
            </div>
          </div>

          <div className="w-full">
            <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.16em] text-mut">
              <span>{t('pushups.sensitivity')}</span>
              <span className="tabular">{counter.sensitivity}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={counter.sensitivity}
              onChange={(e) => counter.setSensitivity(parseInt(e.target.value, 10))}
              className="w-full accent-[#ff4d4d]"
            />
          </div>

          <div className="grid w-full grid-cols-2 gap-3">
            <Button variant="ghost" onClick={counter.reset}>
              {t('common.clear')}
            </Button>
            <Button variant="primary" onClick={save}>
              {t('pushups.save')}
            </Button>
          </div>
          <Button variant="outline" className="w-full" onClick={counter.stop}>
            <IconX size={16} /> {t('pushups.stop')}
          </Button>
        </div>
      )}
    </div>
  );
}
