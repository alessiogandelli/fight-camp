import { useEffect, useState, type ReactNode } from 'react';
import { useI18n } from '../lib/i18n';
import { parseTimeInput, fmtClock } from '../lib/format';
import { IconMinus, IconPlus, IconX } from './Icons';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

type BtnVariant = 'primary' | 'ghost' | 'danger' | 'outline' | 'dark';
type BtnSize = 'sm' | 'md' | 'lg' | 'xl';

const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent/85',
  ghost: 'bg-panel2 text-ink border border-line hover:border-mut/60',
  danger: 'border border-accent/40 text-accent hover:bg-accent/10',
  outline: 'border border-line text-mut hover:text-ink hover:border-mut/60',
  dark: 'bg-black/40 text-ink border border-line hover:border-mut/60',
};

const btnSizes: Record<BtnSize, string> = {
  sm: 'h-9 px-3 text-[11px] gap-1.5 rounded-lg',
  md: 'h-12 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-14 px-6 text-base gap-2 rounded-xl',
  xl: 'h-16 px-8 text-lg gap-2.5 rounded-2xl',
};

export function Button({
  variant = 'ghost',
  size = 'md',
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return (
    <button
      className={cx(
        'inline-flex select-none items-center justify-center font-bold uppercase tracking-wider transition active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40',
        btnVariants[variant],
        btnSizes[size],
        className,
      )}
      {...rest}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-2xl border border-line bg-panel p-4', className)}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-end justify-between first:mt-0">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-mut">{children}</h2>
      {right}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div
        className={cx(
          'relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-line bg-panel sm:rounded-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="text-sm font-black uppercase tracking-[0.18em]">{title}</h3>
          <button onClick={onClose} className="-m-2 p-2 text-mut hover:text-ink" aria-label={t('common.close')}>
            <IconX size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-mut">{message}</p>
      <div className="mt-5 flex gap-3">
        <Button variant="ghost" size="md" className="flex-1" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" size="md" className="flex-1" onClick={onConfirm}>
          {confirmLabel ?? t('common.delete')}
        </Button>
      </div>
    </Modal>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-mut">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-mut/70">{hint}</span> : null}
    </label>
  );
}

export const inputCls =
  'h-12 w-full rounded-xl border border-line bg-panel2 px-3 text-base text-ink outline-none transition focus:border-accent placeholder:text-mut/50';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        'w-full rounded-xl border border-line bg-panel2 px-3 py-2.5 text-base text-ink outline-none transition focus:border-accent placeholder:text-mut/50',
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(inputCls, 'appearance-none uppercase tracking-wider', props.className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239a9aa5' stroke-width='2' fill='none'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      }}
    />
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-1.5 text-left"
    >
      <span className="text-sm font-semibold uppercase tracking-wider">{label}</span>
      <span
        className={cx(
          'relative h-7 w-12 shrink-0 rounded-full border transition',
          checked ? 'border-accent bg-accent/30' : 'border-line bg-panel2',
        )}
      >
        <span
          className={cx('absolute top-0.5 rounded-full transition-all', checked ? 'left-6 bg-accent' : 'left-0.5 bg-mut')}
          style={{ height: 22, width: 22 }}
        />
      </span>
    </button>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'h-9 shrink-0 rounded-full border px-3.5 text-[11px] font-bold uppercase tracking-wider transition active:scale-95',
        active ? 'border-accent bg-accent/15 text-accent' : 'border-line bg-panel2 text-mut hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-xl border border-line bg-panel2 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cx(
            'h-9 flex-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition',
            value === o.id ? 'bg-accent text-white' : 'text-mut hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const { t } = useI18n();
  return (
    <div className="flex h-12 items-stretch overflow-hidden rounded-xl border border-line bg-panel2">
      <button
        type="button"
        className="flex w-8 items-center justify-center text-mut transition active:bg-line disabled:opacity-30 sm:w-12"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        aria-label={t('common.decrease')}
      >
        <IconMinus size={18} />
      </button>
      <div className="tabular flex flex-1 items-center justify-center text-sm font-black sm:text-base">
        {value}
        {suffix ? <span className="ml-1 text-xs font-semibold text-mut">{suffix}</span> : null}
      </div>
      <button
        type="button"
        className="flex w-8 items-center justify-center text-mut transition active:bg-line disabled:opacity-30 sm:w-12"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        aria-label={t('common.increase')}
      >
        <IconPlus size={18} />
      </button>
    </div>
  );
}

export function TimeField({
  value,
  onChange,
  step = 15,
  min = 0,
  max = 3599,
}: {
  value: number;
  onChange: (sec: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const [text, setText] = useState(fmtClock(value));
  const [focused, setFocused] = useState(false);
  const [bad, setBad] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (!focused) {
      setText(fmtClock(value));
      setBad(false);
    }
  }, [value, focused]);

  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const commit = () => {
    setFocused(false);
    const parsed = parseTimeInput(text);
    if (parsed == null) {
      setText(fmtClock(value));
      setBad(false);
      return;
    }
    const v = clamp(parsed);
    setBad(false);
    setText(fmtClock(v));
    if (v !== value) onChange(v);
  };

  return (
    <div className={cx('flex h-12 items-stretch overflow-hidden rounded-xl border bg-panel2', bad ? 'border-accent' : 'border-line')}>
      <button
        type="button"
        className="flex w-7 items-center justify-center text-mut transition active:bg-line disabled:opacity-30 sm:w-11"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        aria-label={t('common.decrease')}
      >
        <IconMinus size={16} />
      </button>
      <input
        className="tabular w-full min-w-0 flex-1 bg-transparent text-center text-sm font-black outline-none sm:text-base"
        value={text}
        inputMode="numeric"
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
        }}
        onChange={(e) => {
          setText(e.target.value);
          setBad(parseTimeInput(e.target.value) == null);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
      <button
        type="button"
        className="flex w-7 items-center justify-center text-mut transition active:bg-line disabled:opacity-30 sm:w-11"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        aria-label={t('common.increase')}
      >
        <IconPlus size={16} />
      </button>
    </div>
  );
}

export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      {icon ? <div className="text-mut">{icon}</div> : null}
      <div className="text-sm font-black uppercase tracking-[0.18em]">{title}</div>
      <p className="max-w-xs text-sm text-mut">{message}</p>
      {action}
    </div>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-mut">{label}</div>
      <div className="tabular mt-1 text-2xl font-black">{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-mut">{sub}</div> : null}
    </div>
  );
}
