import { useCallback, useSyncExternalStore } from 'react';

const subscribe = (fn: () => void) => {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
};

/** The URL hash (e.g. "#admin"), kept in sync with the address bar. */
export function useHash() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const setHash = useCallback((next: string) => {
    if (next) window.location.hash = next;
    else history.pushState(null, '', window.location.pathname + window.location.search);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, []);
  return [hash, setHash] as const;
}
