import { useSyncExternalStore } from 'react';
import { libraryStore } from '../lib/libraryStore';

export function useLibrary() {
  return useSyncExternalStore(libraryStore.subscribe, libraryStore.getSnapshot);
}
