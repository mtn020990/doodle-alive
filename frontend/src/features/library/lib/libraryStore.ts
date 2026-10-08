import { readJson, writeJson } from '@/shared/lib/storage';
import type { LibraryItem } from '../types';

const KEY = 'doodle-alive:library';
const MAX_ITEMS = 30;

type Listener = () => void;
const listeners = new Set<Listener>();
const load = () => readJson<LibraryItem[]>(KEY, [], Array.isArray);
let items = load();

function notify() {
  listeners.forEach((fn) => fn());
}

function commit(next: LibraryItem[]) {
  items = next;
  // If the quota is full, keep dropping the oldest entries until it fits.
  for (let keep = next.length; keep >= 0; keep -= 3) {
    if (writeJson(KEY, next.slice(0, keep))) break;
  }
  notify();
}

export const libraryStore = {
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
  getSnapshot: () => items,
  add(item: LibraryItem) {
    commit([item, ...items.filter((i) => i.id !== item.id)].slice(0, MAX_ITEMS));
  },
  remove(id: string) {
    commit(items.filter((i) => i.id !== id));
  },
};

// Keep several open tabs in sync.
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  items = load();
  notify();
});
