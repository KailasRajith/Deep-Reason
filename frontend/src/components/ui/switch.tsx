/* ============================================================
   DEEP REASON — Switch Component
   Smooth Apple-style toggle switch with label, description,
   and keyboard navigation.
   ============================================================ */
'use client';

import React, { useState, useId } from 'react';
import { cn } from '@/lib/utils';

export type SwitchSize = 'sm' | 'md' | 'lg';

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  size?: SwitchSize;
}

const sizeConfig: Record<
  SwitchSize,
  {
    track: string;
    thumb: string;
    translate: string;
  }
> = {
  sm: {
    track: 'w-7 h-4 p-0.5',
    thumb: 'w-3 h-3',
    translate: 'translate-x-3',
  },
  md: {
    track: 'w-9 h-5 p-0.5',
    thumb: 'w-4 h-4',
    translate: 'translate-x-4',
  },
  lg: {
    track: 'w-11 h-6 p-0.5',
    thumb: 'w-5 h-5',
    translate: 'translate-x-5',
  },
};

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      label,
      description,
      size = 'md',
      disabled = false,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const switchId = id || generatedId;
    const labelId = `${switchId}-label`;
    const descId = `${switchId}-desc`;

    const isControlled = controlledChecked !== undefined;
    const [internalChecked, setInternalChecked] = useState(defaultChecked);
    const checked = isControlled ? controlledChecked : internalChecked;

    const handleToggle = () => {
      if (disabled) return;
      const nextChecked = !checked;
      if (!isControlled) {
        setInternalChecked(nextChecked);
      }
      onCheckedChange?.(nextChecked);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleToggle();
      }
    };

    const currentConfig = sizeConfig[size];

    return (
      <div
        className={cn(
          'flex items-start justify-between gap-3 select-none',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {(label || description) && (
          <div
            className="flex flex-col gap-0.5 cursor-pointer flex-1 min-w-0"
            onClick={handleToggle}
          >
            {label && (
              <span
                id={labelId}
                className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] leading-tight"
              >
                {label}
              </span>
            )}
            {description && (
              <span
                id={descId}
                className="text-[var(--text-xs)] text-[var(--color-text-secondary)] leading-normal"
              >
                {description}
              </span>
            )}
          </div>
        )}

        <button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={description ? descId : undefined}
          disabled={disabled}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className={cn(
            'relative inline-flex shrink-0 items-center rounded-full transition-colors cursor-pointer',
            'duration-[var(--duration-normal)] ease-[var(--ease-out)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2',
            checked
              ? 'bg-[var(--color-accent)] border border-transparent'
              : 'bg-[var(--color-bg-sunken)] border border-[var(--color-border-primary)]',
            currentConfig.track,
            className,
          )}
          {...props}
        >
          <span
            className={cn(
              'pointer-events-none block rounded-full bg-[var(--color-bg-elevated)] shadow-[var(--shadow-sm)]',
              'transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)] transform',
              checked ? currentConfig.translate : 'translate-x-0',
              currentConfig.thumb,
            )}
          />
        </button>
      </div>
    );
  },
);

Switch.displayName = 'Switch';
