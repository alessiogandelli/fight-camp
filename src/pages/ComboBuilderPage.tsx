import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/AppStore';
import { useI18n } from '../lib/i18n';
import type { Combination, Technique, TechniqueCategory } from '../types';
import { TECHNIQUE_CATEGORIES, categoryLabel, techniqueShort } from '../types';
import { uid } from '../lib/id';
import { Button, Card, Field, Modal, Select, TextArea, TextInput, cx } from '../components/ui';
import { IconChevronDown, IconChevronUp, IconPlus, IconStar, IconTrash, IconX } from '../components/Icons';
import { useToast } from '../components/Toast';

export default function ComboBuilderPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { data, saveCombination, addTechnique, deleteTechnique } = useStore();

  const existing = id ? data.combinations.find((c) => c.id === id) : undefined;
  const [name, setName] = useState(existing?.name ?? nextComboName(data.combinations));
  const [steps, setSteps] = useState<string[]>(existing?.techniqueIds ?? []);
  const [favorite, setFavorite] = useState(existing?.favorite ?? false);
  const [techModal, setTechModal] = useState(false);

  const techById = useMemo(() => new Map(data.techniques.map((t) => [t.id, t])), [data.techniques]);

  const addStep = (tid: string) => setSteps((s) => [...s, tid]);
  const removeStep = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));
  const moveStep = (i: number, dir: -1 | 1) =>
    setSteps((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const copy = s.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const save = () => {
    if (steps.length === 0) {
      toast.show(t('combo.addTechnique'));
      return;
    }
    if (!name.trim()) {
      toast.show(t('combo.giveName'));
      return;
    }
    const combo: Combination = {
      id: existing?.id ?? uid(),
      name: name.trim().toUpperCase(),
      techniqueIds: steps,
      favorite,
      createdAt: existing?.createdAt ?? Date.now(),
    };
    saveCombination(combo);
    toast.show(t('combo.saved'));
    nav('/combos');
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black uppercase tracking-[0.14em]">{existing ? t('combo.edit') : t('combo.new')}</h1>
        <button
          onClick={() => setFavorite((f) => !f)}
          className={cx('-m-2 p-2', favorite ? 'text-warn' : 'text-mut/50')}
          aria-label={t('combo.toggleFavorite')}
        >
          <IconStar size={24} filled={favorite} />
        </button>
      </div>

      <div className="mt-4">
        <Field label={t('common.name')}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="COMBO 08" />
        </Field>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-mut">
            {t('combo.techniquesCount', { n: steps.length })}
          </h2>
          {steps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-mut">
              {t('combo.tapHint')}
            </div>
          ) : (
            <Card className="flex flex-col gap-1 p-2">
              {steps.map((tid, i) => {
                const tech = techById.get(tid);
                return (
                  <div key={`${tid}-${i}`} className="flex items-center gap-2 rounded-xl bg-panel2 px-3 py-2.5">
                    <span className="tabular w-6 text-center text-xs font-black text-mut">{i + 1}</span>
                    <span className="flex-1 text-base font-black uppercase tracking-wider">
                      {tech ? techniqueShort(tech, lang) : t('common.deleted')}
                    </span>
                    <button
                      onClick={() => moveStep(i, -1)}
                      disabled={i === 0}
                      className="p-1.5 text-mut transition hover:text-ink disabled:opacity-20"
                      aria-label={t('combo.moveUp')}
                    >
                      <IconChevronUp size={18} />
                    </button>
                    <button
                      onClick={() => moveStep(i, 1)}
                      disabled={i === steps.length - 1}
                      className="p-1.5 text-mut transition hover:text-ink disabled:opacity-20"
                      aria-label={t('combo.moveDown')}
                    >
                      <IconChevronDown size={18} />
                    </button>
                    <button onClick={() => removeStep(i)} className="p-1.5 text-accent" aria-label={t('combo.remove')}>
                      <IconX size={18} />
                    </button>
                  </div>
                );
              })}
            </Card>
          )}
          <div className="mt-4 flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => nav('/combos')}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" className="flex-1" onClick={save}>
              {t('common.save')}
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-mut">{t('combo.techniqueLibrary')}</h2>
            <Button size="sm" variant="outline" onClick={() => setTechModal(true)}>
              <IconPlus size={14} /> {t('combo.technique')}
            </Button>
          </div>
          <div className="flex flex-col gap-4">
            {TECHNIQUE_CATEGORIES.map((cat) => {
              const techs = data.techniques.filter((t) => t.category === cat.id);
              if (techs.length === 0) return null;
              return (
                <div key={cat.id}>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-mut/80">
                    {categoryLabel(cat.id, lang)}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {techs.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => addStep(t.id)}
                        className="group flex h-12 items-center justify-between rounded-xl border border-line bg-panel px-3 text-left text-[13px] font-black uppercase tracking-wider transition active:scale-[0.97] active:border-accent active:bg-accent/10"
                      >
                        <span className="truncate">{techniqueShort(t, lang)}</span>
                        <IconPlus size={14} className="shrink-0 text-mut group-active:text-accent" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <NewTechniqueModal
        open={techModal}
        onClose={() => setTechModal(false)}
        onCreate={(tech) => {
          const created = addTechnique({ ...tech, custom: true });
          addStep(created.id);
          toast.show(t('combo.techniqueAdded'));
        }}
      />

      {id && !existing ? (
        <Modal open onClose={() => nav('/combos')} title={t('combo.notFound')}>
          <p className="text-sm text-mut">{t('combo.notFoundMsg')}</p>
        </Modal>
      ) : null}

      <ManageCustomTechniques
        techniques={data.techniques.filter((t) => t.custom)}
        onDelete={(tid) => {
          deleteTechnique(tid);
          setSteps((s) => s.filter((x) => x !== tid));
        }}
      />
    </div>
  );
}

function ManageCustomTechniques({
  techniques,
  onDelete,
}: {
  techniques: Technique[];
  onDelete: (id: string) => void;
}) {
  const { t, lang } = useI18n();
  if (techniques.length === 0) return null;
  return (
    <div className="mt-8">
      <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-mut">{t('combo.customTechniques')}</h2>
      <div className="flex flex-wrap gap-2">
        {techniques.map((tech) => (
          <span key={tech.id} className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-bold uppercase">
            {techniqueShort(tech, lang)}
            <button onClick={() => onDelete(tech.id)} className="text-accent" aria-label={t('combo.deleteAria', { name: techniqueShort(tech, lang) })}>
              <IconTrash size={13} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export function nextComboName(combos: Combination[]): string {
  let max = 0;
  for (const c of combos) {
    const m = c.name.match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `COMBO ${String(max + 1).padStart(2, '0')}`;
}

function NewTechniqueModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (t: { name: string; shortName: string; category: TechniqueCategory; description?: string }) => void;
}) {
  const [tname, setTname] = useState('');
  const [short, setShort] = useState('');
  const [category, setCategory] = useState<TechniqueCategory>('boxing');
  const [desc, setDesc] = useState('');
  const toast = useToast();
  const { t, lang } = useI18n();

  const submit = () => {
    if (!tname.trim()) {
      toast.show(t('combo.techniqueNeedsName'));
      return;
    }
    onCreate({
      name: tname.trim(),
      shortName: (short.trim() || tname.trim()).toUpperCase(),
      category,
      description: desc.trim() || undefined,
    });
    setTname('');
    setShort('');
    setDesc('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t('combo.newTechnique')}>
      <div className="flex flex-col gap-4">
        <Field label={t('common.name')}>
          <TextInput value={tname} onChange={(e) => setTname(e.target.value)} placeholder={lang === 'it' ? 'Pugno girato' : 'Spinning Back Fist'} />
        </Field>
        <Field label={t('combo.shortName')}>
          <TextInput value={short} onChange={(e) => setShort(e.target.value)} placeholder={lang === 'it' ? 'PUGNO GIRATO' : 'SPIN BACKFIST'} />
        </Field>
        <Field label={t('common.category')}>
          <Select value={category} onChange={(e) => setCategory(e.target.value as TechniqueCategory)}>
            {TECHNIQUE_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryLabel(c.id, lang)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('combo.description')}>
          <TextArea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <Button variant="primary" onClick={submit}>
          {t('combo.addTechniqueBtn')}
        </Button>
      </div>
    </Modal>
  );
}
