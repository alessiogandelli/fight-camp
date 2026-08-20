import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/AppStore';
import { useI18n } from '../lib/i18n';
import type { Combination, LiveConfig, TechniqueCategory } from '../types';
import { TECHNIQUE_CATEGORIES, categoryLabel, techniqueShort } from '../types';
import { clearActive } from '../data/storage';
import { Button, Card, Chip, ConfirmDialog, EmptyState, Field, Modal, Stepper, TextInput, TimeField, cx } from '../components/ui';
import { IconCopy, IconEdit, IconPlay, IconPlus, IconSequence, IconStar, IconTrash } from '../components/Icons';
import { useToast } from '../components/Toast';

type Filter = 'all' | 'favorites' | TechniqueCategory;

export default function CombinationsPage() {
  const { data, toggleFavorite, deleteCombination, duplicateCombination } = useStore();
  const toast = useToast();
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState<Combination | null>(null);
  const [toStart, setToStart] = useState<Combination | null>(null);

  const techById = useMemo(() => new Map(data.techniques.map((t) => [t.id, t])), [data.techniques]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.combinations
      .filter((c) => {
        if (filter === 'favorites' && !c.favorite) return false;
        if (filter !== 'all' && filter !== 'favorites') {
          const hasCat = c.techniqueIds.some((id) => techById.get(id)?.category === filter);
          if (!hasCat) return false;
        }
        if (q && !c.name.toLowerCase().includes(q)) return false;
        return true;
      })
      .slice()
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.createdAt - a.createdAt);
  }, [data.combinations, filter, query, techById]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-black uppercase tracking-[0.14em]">{t('combos.title')}</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => nav('/combos/new')}>
            <IconPlus size={16} /> {t('common.new')}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
          {t('common.all')}
        </Chip>
        <Chip active={filter === 'favorites'} onClick={() => setFilter('favorites')}>
          {t('combos.favorites')}
        </Chip>
        {TECHNIQUE_CATEGORIES.map((c) => (
          <Chip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
            {categoryLabel(c.id, lang)}
          </Chip>
        ))}
      </div>

      <div className="mt-3">
        <TextInput placeholder={t('combos.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {list.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<IconSequence size={34} />}
            title={t('combos.empty')}
            message={t('combos.emptyMsg')}
            action={
              <Button variant="primary" onClick={() => nav('/combos/new')}>
                <IconPlus size={16} /> {t('combos.create')}
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.map((c) => (
            <Card key={c.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-base font-black uppercase tracking-wider">{c.name}</span>
                <button
                  onClick={() => toggleFavorite(c.id)}
                  className={cx('-m-2 p-2 transition', c.favorite ? 'text-warn' : 'text-mut/50 hover:text-mut')}
                  aria-label={t('combo.toggleFavorite')}
                >
                  <IconStar size={20} filled={c.favorite} />
                </button>
              </div>
              <div className="flex flex-col items-start gap-0.5">
                {c.techniqueIds.map((tid, i) => {
                  const tech = techById.get(tid);
                  return (
                    <div key={`${tid}-${i}`} className="flex items-center gap-2">
                      {i > 0 ? <span className="text-[10px] text-mut/60">↓</span> : null}
                      <span className="text-sm font-bold uppercase tracking-wider text-ink/90">
                        {tech ? techniqueShort(tech, lang) : t('common.deleted')}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-auto flex items-center gap-2 border-t border-line pt-3">
                <Button size="sm" variant="primary" onClick={() => setToStart(c)}>
                  <IconPlay size={14} /> {t('common.start')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => nav(`/combos/${c.id}`)}>
                  <IconEdit size={14} /> {t('common.edit')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const copy = duplicateCombination(c.id);
                    if (copy) toast.show(t('combos.duplicated'));
                  }}
                >
                  <IconCopy size={14} />
                </Button>
                <Button size="sm" variant="outline" className="ml-auto text-accent" onClick={() => setToDelete(c)}>
                  <IconTrash size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={toDelete != null}
        title={t('combos.deleteTitle')}
        message={t('combos.deleteMsg', { name: toDelete?.name ?? '' })}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            deleteCombination(toDelete.id);
            toast.show(t('combos.deleted'));
          }
          setToDelete(null);
        }}
      />

      <QuickStartModal combo={toStart} onClose={() => setToStart(null)} />
    </div>
  );
}

function QuickStartModal({ combo, onClose }: { combo: Combination | null; onClose: () => void }) {
  const { data } = useStore();
  const nav = useNavigate();
  const { t } = useI18n();
  const [rounds, setRounds] = useState(3);
  const [duration, setDuration] = useState(180);
  const [rest, setRest] = useState(60);

  const start = () => {
    if (!combo) return;
    const config: LiveConfig = {
      name: combo.name,
      type: 'heavy-bag',
      prepSeconds: data.settings.prepSeconds,
      rounds: Array.from({ length: rounds }, (_, i) => ({
        duration,
        restDuration: i < rounds - 1 ? rest : 0,
        type: 'combination' as const,
        combinationIds: [combo.id],
        rotationInterval: duration,
        rotationOrder: 'sequential' as const,
      })),
    };
    onClose();
    clearActive();
    nav('/live', { state: { config } });
  };

  return (
    <Modal open={combo != null} onClose={onClose} title={t('combos.train', { name: combo?.name ?? '' })}>
      <div className="flex flex-col gap-4">
        <Field label={t('common.rounds')}>
          <Stepper value={rounds} onChange={setRounds} min={1} max={20} />
        </Field>
        <Field label={t('combos.roundLength')}>
          <TimeField value={duration} onChange={setDuration} min={5} step={15} />
        </Field>
        <Field label={t('combos.restBetween')}>
          <TimeField value={rest} onChange={setRest} min={0} step={15} />
        </Field>
        <Button variant="primary" size="lg" onClick={start}>
          <IconPlay size={18} /> {t('combos.startSession')}
        </Button>
      </div>
    </Modal>
  );
}
