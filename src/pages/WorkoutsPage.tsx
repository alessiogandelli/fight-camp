import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/AppStore';
import { useI18n } from '../lib/i18n';
import type { Workout } from '../types';
import { workoutTypeMeta } from '../types';
import { configFromWorkout, summarizeWorkout, workoutTotals } from '../lib/session';
import { fmtClock } from '../lib/format';
import { clearActive } from '../data/storage';
import { Button, Card, ConfirmDialog, EmptyState, cx } from '../components/ui';
import { IconCopy, IconEdit, IconList, IconPlay, IconPlus, IconTrash } from '../components/Icons';
import { useToast } from '../components/Toast';

export default function WorkoutsPage() {
  const { data, deleteWorkout, duplicateWorkout } = useStore();
  const toast = useToast();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const [toDelete, setToDelete] = useState<Workout | null>(null);

  const workouts = data.workouts.slice().sort((a, b) => b.createdAt - a.createdAt);

  const startWorkout = (w: Workout) => {
    if (w.rounds.length === 0) {
      toast.show(t('workouts.noRounds'));
      return;
    }
    clearActive();
    nav('/live', { state: { config: configFromWorkout(w, data.settings.prepSeconds) } });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black uppercase tracking-[0.14em]">{t('workouts.title')}</h1>
        <Button size="sm" variant="ghost" onClick={() => nav('/workouts/new')}>
          <IconPlus size={16} /> {t('common.new')}
        </Button>
      </div>

      {workouts.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<IconList size={34} />}
            title={t('workouts.empty')}
            message={t('workouts.emptyMsg')}
            action={
              <Button variant="primary" onClick={() => nav('/workouts/new')}>
                <IconPlus size={16} /> {t('workouts.create')}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {workouts.map((w) => {
            const meta = workoutTypeMeta(w.type);
            const totals = workoutTotals(w);
            return (
              <Card key={w.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span aria-hidden>{meta.icon}</span>
                      <span className="truncate text-base font-black uppercase tracking-wider">{w.name}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold uppercase tracking-wider text-mut">
                      <span className={cx('rounded px-1.5 py-0.5', 'bg-panel2')}>
                        {lang === 'en' ? meta.labelEn : meta.label}
                      </span>
                      <span>{summarizeWorkout(w, lang)}</span>
                      <span>{t('common.total')} {fmtClock(totals.total)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                  <Button size="sm" variant="primary" onClick={() => startWorkout(w)}>
                    <IconPlay size={14} /> {t('common.start')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => nav(`/workouts/${w.id}`)}>
                    <IconEdit size={14} /> {t('common.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (duplicateWorkout(w.id)) toast.show(t('workouts.duplicated'));
                    }}
                  >
                    <IconCopy size={14} />
                  </Button>
                  <Button size="sm" variant="outline" className="ml-auto text-accent" onClick={() => setToDelete(w)}>
                    <IconTrash size={14} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={toDelete != null}
        title={t('workouts.deleteTitle')}
        message={t('workouts.deleteMsg', { name: toDelete?.name ?? '' })}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            deleteWorkout(toDelete.id);
            toast.show(t('workouts.deleted'));
          }
          setToDelete(null);
        }}
      />
    </div>
  );
}
