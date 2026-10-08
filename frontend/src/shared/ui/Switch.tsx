import type { ReactNode } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
}

/** A labelled on/off switch (a real checkbox underneath, so it works with keyboards and screen readers). */
export function Switch({ checked, onChange, label, description, icon }: SwitchProps) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3">
      {icon && (
        <span aria-hidden="true" className="shrink-0 text-grape [&>svg]:size-5">
          {icon}
        </span>
      )}
      <span className="flex-1">
        <span className="block font-bold">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-8 w-14 shrink-0 rounded-full border-2 border-line bg-soft-line transition-colors peer-checked:bg-mint peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-grape after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:border-2 after:border-line after:bg-white after:transition-transform peer-checked:after:translate-x-6"
      />
    </label>
  );
}
