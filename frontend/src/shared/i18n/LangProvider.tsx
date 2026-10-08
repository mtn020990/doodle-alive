import { useEffect, useMemo, type ReactNode } from 'react';
import { useLocalStorage } from '@/shared/hooks/useLocalStorage';
import { LangContext } from './context';
import { detectLang, LANGS, translate, type Lang } from './messages';

export function LangProvider({ children }: { children: ReactNode }) {
  const [stored, setLang] = useLocalStorage<Lang>('doodle-alive:lang', detectLang);
  const lang: Lang = LANGS.includes(stored) ? stored : 'en';

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t: translate(lang) }), [lang, setLang]);
  return <LangContext value={value}>{children}</LangContext>;
}
