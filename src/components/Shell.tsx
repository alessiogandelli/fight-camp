import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { IconChart, IconClock, IconList, IconSequence, IconTarget } from './Icons';
import { cx } from './ui';

const NAV = [
  { to: '/', key: 'nav.train', icon: IconTarget, end: true },
  { to: '/workouts', key: 'nav.workouts', icon: IconList },
  { to: '/combos', key: 'nav.combos', icon: IconSequence },
  { to: '/history', key: 'nav.history', icon: IconClock },
  { to: '/stats', key: 'nav.stats', icon: IconChart },
];

function Brand() {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-lg font-black italic tracking-tight">COMBAT</span>
      <span className="text-lg font-black italic tracking-tight text-accent">TRAINING</span>
    </div>
  );
}

function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center gap-1 rounded-lg border border-line bg-panel2 p-0.5">
      {(['it', 'en'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={cx(
            'rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider transition',
            lang === l ? 'bg-accent text-white' : 'text-mut hover:text-ink',
          )}
          aria-pressed={lang === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export default function Shell() {
  const location = useLocation();
  const { t } = useI18n();
  const isBuilder = location.pathname.includes('/new') || /\/(workouts|combos)\/[^/]+$/.test(location.pathname);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <Brand />
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    cx(
                      'rounded-lg px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition',
                      isActive ? 'bg-accent/15 text-accent' : 'text-mut hover:text-ink',
                    )
                  }
                >
                  {t(n.key)}
                </NavLink>
              ))}
            </nav>
            <LangToggle />
          </div>
        </div>
      </header>
      <main
        className={cx(
          'mx-auto w-full flex-1 px-4 pt-4 md:pt-6',
          isBuilder ? 'max-w-2xl pb-28 md:pb-12' : 'max-w-3xl pb-28 md:pb-12',
        )}
      >
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cx(
                    'flex flex-col items-center gap-0.5 py-1 text-[9px] font-black uppercase tracking-wider transition',
                    isActive ? 'text-accent' : 'text-mut',
                  )
                }
              >
                <Icon size={22} />
                {t(n.key)}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
