import { BookOpen } from 'lucide-react';
import { Mascot } from '@/shared/assets/illustrations';
import { LanguageToggle, useI18n } from '@/shared/i18n';
import { IconButton } from '@/shared/ui';

interface HeaderProps {
  onGuideClick: () => void;
  guideActive: boolean;
  showGuide: boolean;
}

export function Header({ onGuideClick, guideActive, showGuide }: HeaderProps) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 bg-paper/85 pt-safe backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 px-4 pb-3 sm:max-w-2xl">
        <div className="flex min-w-0 items-center gap-1">
          <Mascot className="size-8 shrink-0 -rotate-6 min-[400px]:size-11" />
          <div className="min-w-0">
            <h1 className="font-display text-lg leading-none font-extrabold tracking-tight min-[400px]:text-2xl">
              Doodle<span className="text-coral"> Alive</span>
            </h1>
            <p className="hidden truncate text-xs text-muted min-[400px]:block">
              {t('app.tagline')}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showGuide && (
            <IconButton
              label={t('nav.guide')}
              icon={<BookOpen />}
              active={guideActive}
              onClick={onGuideClick}
              className="size-11 rounded-xl"
            />
          )}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
