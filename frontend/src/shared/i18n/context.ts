import { createContext, useContext } from 'react';
import { translate, type Lang, type Translate } from './messages';

export interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translate;
}

export const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => {},
  t: translate('en'),
});

export function useI18n() {
  return useContext(LangContext);
}
