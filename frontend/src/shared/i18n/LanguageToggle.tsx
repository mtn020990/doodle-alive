import { Segmented } from '@/shared/ui';
import { useI18n } from './context';
import { LANGS } from './messages';

const NAMES = { vi: 'Tiếng Việt', en: 'English' } as const;

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <Segmented
      label={t('lang.label')}
      value={lang}
      onChange={setLang}
      options={LANGS.map((code) => ({
        value: code,
        label: code.toUpperCase(),
        ariaLabel: NAMES[code],
        lang: code,
      }))}
      className="shrink-0"
    />
  );
}
