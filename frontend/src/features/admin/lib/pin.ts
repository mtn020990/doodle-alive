import { readText, writeText } from '@/shared/lib/storage';

const PIN_KEY = 'doodleAdminPin'; // same key as the original page

// Kept for this browser tab only.
export const readPin = () => readText(PIN_KEY, 'session') ?? '';
export const savePin = (pin: string) => writeText(PIN_KEY, pin, 'session');
