/* ============================================================
   DEEP REASON — Badge Component
   Refined status badge with variants, sizes, and optional indicators.
   ============================================================ */
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'outline';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
  onRemove?: () => void;
  removeAriaLabel?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border-[var(--color-border-primary)]',
  success:
    'bg-[var(--color-success-subtle)] text-[var(--color-success-text)] border-[var(--color-success)]/20',
  warning:
    'bg-[var(--color-warning-subtle)] text-[var(--color-warning-text)] border-[var(--color-warning)]/20',
  error:
    'bg-[var(--color-error-subtle)] text-[var(--color-error-text)] border-[var(--color-error)]/20',
  info:
    'bg-[var(--color-info-subtle)] text-[var(--color-info-text)] border-[var(--color-info)]/20',
  outline:
    'bg-transparent text-[var(--color-text-primary)] border-[var(--color-border-primary)]',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-text-tertiary)]',
  success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]',
  error: 'bg-[var(--color-error)]',
  info: 'bg-[var(--color-info)]',
  outline: 'bg-[var(--color-text-primary)]',
};

const sizeStyles: Record<
  BadgeSize,
  {
    badge: string;
    dot: string;
    icon: string;
    remove: string;
  }
> = {
  sm: {
    badge: 'h-5 px-1.5 text-[10px] gap-1',
    dot: 'w-1.5 h-1.5',
    icon: '[&_svg]:w-2.5 [&_svg]:h-2.5',
    remove: 'w-2.5 h-2.5',
  },
  md: {
    badge: 'h-6 px-2 text-[var(--text-xs)] gap-1.5',
    dot: 'w-2 h-2',
    icon: '[&_svg]:w-3 [&_svg]:h-3',
    remove: 'w-3 h-3',
  },
  lg: {
    badge: 'h-7 px-2.5 text-[var(--text-sm)] gap-2',
    dot: 'w-2 h-2',
    icon: '[&_svg]:w-3.5 [&_svg]:h-3.5',
    remove: 'w-3.5 h-3.5',
  },
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      dot = false,
      icon,
      onRemove,
      removeAriaLabel = 'Remove badge',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const currentSize = sizeStyles[size];

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium border select-none transition-colors rounded-[var(--radius-full)] shrink-0',
          variantStyles[variant],
          currentSize.badge,
          className,
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn('rounded-full shrink-0', dotColors[variant], currentSize.dot)}
            aria-hidden="true"
          />
        )}

        {icon && (
          <span
            className={cn('shrink-0 flex items-center', currentSize.icon)}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        <span>{children}</span>

        {onRemove && (
          <button
            type="button"
            aria-label={removeAriaLabel}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--color-border-focus)] -mr-0.5 ml-0.5"
          >
            <X className={currentSize.remove} />
          </button>
        )}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
