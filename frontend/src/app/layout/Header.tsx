import { Mascot } from '@/shared/assets/illustrations';
import { LanguageToggle, useI18n } from '@/shared/i18n';

export function Header() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 bg-paper/85 pt-safe backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 pb-3 sm:max-w-2xl">
        <div className="flex min-w-0 items-center gap-2">
          <Mascot className="size-11 shrink-0 -rotate-6" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl leading-none font-extrabold tracking-tight">
              Doodle<span className="text-coral"> Alive</span>
            </h1>
            <p className="hidden truncate text-xs text-muted min-[400px]:block">
              {t('app.tagline')}
            </p>
          </div>
        </div>
        <LanguageToggle />
      </div>
    </header>
  );
}
