import type { RandomConfig, TechniqueCategory } from '../types';
import { TECHNIQUE_CATEGORIES, categoryLabel } from '../types';
import { useI18n } from '../lib/i18n';
import { Chip, Field, Stepper, Toggle } from './ui';

export default function RandomConfigEditor({
  value,
  onChange,
}: {
  value: RandomConfig;
  onChange: (v: RandomConfig) => void;
}) {
  const { t, lang } = useI18n();
  const set = (patch: Partial<RandomConfig>) => onChange({ ...value, ...patch });

  const toggleCategory = (cat: TechniqueCategory) => {
    const has = value.categories.includes(cat);
    if (has && value.categories.length === 1) return;
    set({
      categories: has ? value.categories.filter((c) => c !== cat) : [...value.categories, cat],
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-bg/40 p-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('random.minTechniques')}>
          <Stepper
            value={value.minTechniques}
            onChange={(v) => set({ minTechniques: v, maxTechniques: Math.max(v, value.maxTechniques) })}
            min={1}
            max={10}
          />
        </Field>
        <Field label={t('random.maxTechniques')}>
          <Stepper
            value={value.maxTechniques}
            onChange={(v) => set({ maxTechniques: Math.max(v, value.minTechniques) })}
            min={1}
            max={10}
          />
        </Field>
      </div>
      <Field label={t('random.allowedCategories')}>
        <div className="flex flex-wrap gap-2">
          {TECHNIQUE_CATEGORIES.map((c) => (
            <Chip key={c.id} active={value.categories.includes(c.id)} onClick={() => toggleCategory(c.id)}>
              {categoryLabel(c.id, lang)}
            </Chip>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-1 gap-1">
        <Toggle
          checked={value.requirePunch}
          onChange={(v) => set({ requirePunch: v })}
          label={t('random.requirePunch')}
        />
        <Toggle
          checked={value.requireKick}
          onChange={(v) => set({ requireKick: v })}
          label={t('random.requireKick')}
        />
        <Toggle
          checked={value.includeDefense}
          onChange={(v) => set({ includeDefense: v })}
          label={t('random.includeDefense')}
        />
      </div>
      <Field label={t('random.generated')}>
        <Stepper value={value.count} onChange={(v) => set({ count: v })} min={1} max={20} />
      </Field>
    </div>
  );
}
