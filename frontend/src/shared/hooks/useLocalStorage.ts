import { useCallback, useState } from 'react';
import { readText, writeText } from '@/shared/lib/storage';

/** String state mirrored to localStorage when available. */
export function useLocalStorage<T extends string>(key: string, initial: () => T) {
  const [value, setValue] = useState<T>(() => (readText(key) as T | null) ?? initial());
  const update = useCallback(
    (next: T) => {
      setValue(next);
      writeText(key, next);
    },
    [key],
  );
  return [value, update] as const;
}
