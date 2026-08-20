import { useEffect } from 'react';

interface WakeLockSentinel {
  release: () => Promise<void>;
}

interface WakeLockNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
}

let sentinel: WakeLockSentinel | null = null;

async function acquire(): Promise<void> {
  try {
    const nav = navigator as Navigator & WakeLockNavigator;
    if (!nav.wakeLock) return;
    sentinel = await nav.wakeLock.request('screen');
  } catch {
    sentinel = null;
  }
}

function release(): void {
  try {
    void sentinel?.release();
  } catch {
    /* ignore */
  }
  sentinel = null;
}

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    void acquire();
    const onVis = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      release();
    };
  }, [active]);
}
