import { cn } from '@/shared/lib/cn';

interface IllustrationProps {
  className?: string;
}

/** "Doodle", the app mascot: a crayon blob with a face, drawn with a single line. */
export function Mascot({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className={className}>
      <path
        d="M24 70c-6-26 12-50 38-50s42 18 36 44c-4 22-20 36-40 36S28 90 24 70z"
        fill="var(--coral)"
        stroke="var(--line)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M40 36c6-6 14-8 20-8"
        fill="none"
        stroke="#fff"
        strokeOpacity=".55"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <ellipse cx="48" cy="60" rx="6" ry="8" fill="#fff" stroke="var(--line)" strokeWidth="3" />
      <ellipse cx="74" cy="60" rx="6" ry="8" fill="#fff" stroke="var(--line)" strokeWidth="3" />
      <circle cx="49" cy="62" r="3" fill="#2b2140" />
      <circle cx="75" cy="62" r="3" fill="#2b2140" />
      <path
        d="M50 78c6 6 16 6 22 0"
        fill="none"
        stroke="var(--line)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="38" cy="74" r="4" fill="#ff9fb0" opacity=".8" />
      <circle cx="84" cy="74" r="4" fill="#ff9fb0" opacity=".8" />
    </svg>
  );
}

export function Sparkle({
  className,
  color = 'var(--sun)',
}: IllustrationProps & { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6z"
        fill={color}
        stroke="var(--line)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A pencil squiggle that keeps drawing itself, used while the job runs. */
export function Squiggle({ className }: IllustrationProps) {
  return (
    <svg viewBox="0 0 220 40" aria-hidden="true" className={cn('overflow-visible', className)}>
      <path
        d="M6 26c18-22 34-22 46 0s30 22 44 0 30-22 44 0 30 22 44 0 22-14 30-10"
        fill="none"
        stroke="var(--grape)"
        strokeWidth="6"
        strokeLinecap="round"
        className="animate-draw-line"
        style={{ ['--dash' as string]: 300 }}
      />
    </svg>
  );
}
