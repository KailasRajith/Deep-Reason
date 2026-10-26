/* ============================================================
   DEEP REASON — Status Dot Component
   Status indicator with colors, sizes, pulse ripple effect,
   and optional label.
   ============================================================ */
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type StatusDotType =
  | 'online'
  | 'offline'
  | 'warning'
  | 'error'
  | 'idle'
  | 'busy';

export type StatusDotSize = 'xs' | 'sm' | 'md' | 'lg';

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: StatusDotType;
  size?: StatusDotSize;
  pulse?: boolean;
  label?: React.ReactNode;
  labelPlacement?: 'left' | 'right';
}

const statusColors: Record<StatusDotType, string> = {
  online: 'bg-[var(--color-success)]',
  offline: 'bg-[var(--color-text-quaternary)]',
  warning: 'bg-[var(--color-warning)]',
  error: 'bg-[var(--color-error)]',
  idle: 'bg-[var(--color-text-tertiary)]',
  busy: 'bg-[var(--color-accent)]',
};

const sizeStyles: Record<
  StatusDotSize,
  {
    dot: string;
    text: string;
    gap: string;
  }
> = {
  xs: {
    dot: 'w-1.5 h-1.5',
    text: 'text-[11px]',
    gap: 'gap-1.5',
  },
  sm: {
    dot: 'w-2 h-2',
    text: 'text-[var(--text-xs)]',
    gap: 'gap-1.5',
  },
  md: {
    dot: 'w-2.5 h-2.5',
    text: 'text-[var(--text-sm)]',
    gap: 'gap-2',
  },
  lg: {
    dot: 'w-3 h-3',
    text: 'text-[var(--text-base)]',
    gap: 'gap-2',
  },
};

export const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  (
    {
      status = 'online',
      size = 'sm',
      pulse = false,
      label,
      labelPlacement = 'right',
      className,
      ...props
    },
    ref,
  ) => {
    const currentSize = sizeStyles[size];
    const currentColor = statusColors[status];

    const dotElement = (
      <span className="relative flex shrink-0 items-center justify-center">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
              currentColor,
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full',
            currentColor,
            currentSize.dot,
          )}
        />
      </span>
    );

    if (!label) {
      return (
        <span
          ref={ref}
          role="status"
          aria-label={status}
          className={cn('inline-flex items-center justify-center', className)}
          {...props}
        >
          {dotElement}
        </span>
      );
    }

    return (
      <span
        ref={ref}
        role="status"
        aria-label={typeof label === 'string' ? label : status}
        className={cn(
          'inline-flex items-center font-medium text-[var(--color-text-secondary)] select-none',
          currentSize.gap,
          currentSize.text,
          className,
        )}
        {...props}
      >
        {labelPlacement === 'left' && <span>{label}</span>}
        {dotElement}
        {labelPlacement === 'right' && <span>{label}</span>}
      </span>
    );
  },
);

StatusDot.displayName = 'StatusDot';
