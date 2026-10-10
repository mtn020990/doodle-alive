import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

export type Tab = 'create' | 'library' | 'guide';

interface AppShellProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  showNav?: boolean;
  children: ReactNode;
}

export function AppShell({ tab, onTabChange, showNav = true, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col [--nav-space:calc(5.75rem+env(safe-area-inset-bottom))]">
      <Header
        onGuideClick={() => onTabChange('guide')}
        guideActive={tab === 'guide'}
        showGuide={showNav}
      />
      <main className="mx-auto w-full max-w-xl flex-1 overflow-x-clip px-4 pt-2 pb-[calc(var(--nav-space)+1rem)] sm:max-w-2xl">
        {children}
      </main>
      {showNav && <BottomNav tab={tab} onTabChange={onTabChange} />}
    </div>
  );
}
