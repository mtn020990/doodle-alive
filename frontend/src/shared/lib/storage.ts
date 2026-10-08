// Web storage that never throws: it can be missing, full, or blocked (private mode, previews).
// Callers keep working without persistence.

type Area = 'local' | 'session';

function area(kind: Area): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readText(key: string, kind: Area = 'local'): string | null {
  try {
    return area(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Returns false when the value could not be stored (quota, private mode). */
export function writeText(key: string, value: string | null, kind: Area = 'local'): boolean {
  try {
    const store = area(kind);
    if (!store) return false;
    if (value === null) store.removeItem(key);
    else store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Parsed JSON, or `fallback` when missing or unreadable. `valid` rejects stale shapes. */
export function readJson<T>(
  key: string,
  fallback: T,
  valid: (v: unknown) => boolean = () => true,
): T {
  try {
    const value: unknown = JSON.parse(readText(key) ?? 'null');
    return value !== null && valid(value) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  return writeText(key, JSON.stringify(value));
}
