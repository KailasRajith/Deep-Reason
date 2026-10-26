/* ============================================================
   DEEP REASON — Button Component
   Refined, accessible button with multiple variants.
   ============================================================ */
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-[var(--color-accent)] text-[var(--color-accent-text)] hover:bg-[var(--color-accent-hover)] active:brightness-90 shadow-[var(--shadow-xs)]',
  secondary:
    'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border-primary)]',
  ghost:
    'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]',
  danger:
    'bg-[var(--color-error)] text-white hover:brightness-110 active:brightness-90',
  outline:
    'border border-[var(--color-border-primary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]',
};

const sizeStyles: Record<string, string> = {
  sm: 'h-7 px-2.5 text-[var(--text-xs)] gap-1.5 rounded-[var(--radius-md)]',
  md: 'h-8 px-3 text-[var(--text-sm)] gap-2 rounded-[var(--radius-md)]',
  lg: 'h-10 px-4 text-[var(--text-base)] gap-2.5 rounded-[var(--radius-lg)]',
  icon: 'h-8 w-8 rounded-[var(--radius-md)] justify-center',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconRight,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all whitespace-nowrap',
          'duration-[var(--duration-fast)] ease-[var(--ease-out)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)]',
          'disabled:opacity-40 disabled:pointer-events-none',
          'select-none cursor-pointer',
          variantStyles[variant],
          sizeStyles[size],
          loading && 'pointer-events-none opacity-70',
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : icon ? (
          <span className="shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">{icon}</span>
        ) : null}
        {children}
        {iconRight && (
          <span className="shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">{iconRight}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
