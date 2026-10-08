import { en } from './locales/en';
import { vi, type MessageKey } from './locales/vi';

export type Lang = 'vi' | 'en';
export type { MessageKey };

export const LANGS: Lang[] = ['vi', 'en'];
const messages: Record<Lang, Record<MessageKey, string>> = { vi, en };

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function translate(lang: Lang): Translate {
  return (key, vars) => {
    const text = messages[lang][key] ?? key;
    return vars ? text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? '')) : text;
  };
}

export function detectLang(): Lang {
  return navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}
