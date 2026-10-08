import { Images, Palette } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useLibrary } from '@/features/library';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import type { Tab } from './AppShell';

interface BottomNavProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

/** Floating pill tab bar, anchored above the home indicator on phones. */
export function BottomNav({ tab, onTabChange }: BottomNavProps) {
  const { t } = useI18n();
  const count = useLibrary().length;

  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-safe"
    >
      <div className="flex w-full max-w-xs gap-1 rounded-full bg-card p-1.5 shadow-sticker-lg sticker">
        <NavButton
          active={tab === 'create'}
          onClick={() => onTabChange('create')}
          icon={<Palette />}
        >
          {t('nav.create')}
        </NavButton>
        <NavButton
          active={tab === 'library'}
          onClick={() => onTabChange('library')}
          icon={<Images />}
        >
          {t('nav.library')}
          {count > 0 && (
            <span className="ml-0.5 rounded-full bg-coral px-1.5 text-xs leading-5 text-coral-ink">
              {count}
            </span>
          )}
        </NavButton>
      </div>
    </nav>
  );
}

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}

function NavButton({ active, onClick, icon, children }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex min-h-13 flex-1 items-center justify-center gap-2 rounded-full font-display text-base font-bold transition-colors [&_svg]:size-5',
        active ? 'text-paper' : 'text-muted hover:text-ink',
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-pill"
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-ink"
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      )}
      <span className="relative flex items-center gap-2">
        {icon}
        {children}
      </span>
    </button>
  );
}
