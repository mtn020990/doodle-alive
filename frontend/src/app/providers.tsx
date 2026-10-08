import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { LangProvider } from '@/shared/i18n';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LangProvider>
  );
}
