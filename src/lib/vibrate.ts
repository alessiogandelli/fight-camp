export const vibrationSupported =
  typeof navigator !== 'undefined' && 'vibrate' in navigator;

export function vibrate(pattern: number | number[], enabled: boolean): void {
  if (!enabled) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
