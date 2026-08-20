import { useMemo, useState } from 'react';
import { useStore } from '../store/AppStore';
import { useI18n } from '../lib/i18n';
import { techniqueShort } from '../types';
import { Button, Chip, Modal, TextInput, cx } from './ui';
import { IconStar } from './Icons';

export default function ComboPicker({
  open,
  onClose,
  selected,
  onChange,
  multi = true,
}: {
  open: boolean;
  onClose: () => void;
  selected: string[];
  onChange: (ids: string[]) => void;
  multi?: boolean;
}) {
  const { data } = useStore();
  const { t, lang } = useI18n();
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.combinations
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
  }, [data.combinations, query]);

  const techName = (id: string) => {
    const tech = data.techniques.find((t) => t.id === id);
    return tech ? techniqueShort(tech, lang) : '?';
  };

  const toggle = (id: string) => {
    if (!multi) {
      onChange([id]);
      onClose();
      return;
    }
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };

  return (
    <Modal open={open} onClose={onClose} title={t('picker.title')} wide>
      <TextInput placeholder={t('picker.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      {list.length === 0 ? (
        <p className="mt-6 text-center text-sm text-mut">
          {t('picker.empty')}
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {list.map((c) => {
            const active = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={cx(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                  active ? 'border-accent bg-accent/10' : 'border-line bg-panel2 hover:border-mut/50',
                )}
              >
                <span
                  className={cx(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-black',
                    active ? 'border-accent bg-accent text-white' : 'border-line text-transparent',
                  )}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wider">
                    {c.favorite ? <IconStar size={12} filled className="text-warn" /> : null}
                    {c.name}
                  </span>
                  <span className="block truncate text-[11px] text-mut">
                    {c.techniqueIds.map(techName).join(' → ')}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {multi ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <Chip onClick={() => onChange([])}>{t('common.clear')}</Chip>
          <Button variant="primary" onClick={onClose}>
            {t('picker.done', { n: selected.length })}
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}
