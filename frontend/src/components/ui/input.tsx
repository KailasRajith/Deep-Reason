/* ============================================================
   DEEP REASON — Input Component
   Refined text input with label, helper text, error states, and icon support.
   ============================================================ */
'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export type InputVariant = 'default' | 'filled';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  helperText?: string;
  error?: string | boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  containerClassName?: string;
}

const variantStyles: Record<InputVariant, string> = {
  default:
    'bg-[var(--color-bg-secondary)] border-[var(--color-border-primary)] hover:border-[var(--color-text-quaternary)] focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-accent-subtle)]',
  filled:
    'bg-[var(--color-bg-tertiary)] border-transparent hover:bg-[var(--color-bg-hover)] focus:bg-[var(--color-bg-secondary)] focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-accent-subtle)]',
};

const sizeStyles: Record<
  InputSize,
  {
    input: string;
    icon: string;
    iconSpacingLeft: string;
    iconSpacingRight: string;
  }
> = {
  sm: {
    input: 'h-8 text-[var(--text-xs)] px-2.5 rounded-[var(--radius-md)]',
    icon: 'w-3.5 h-3.5',
    iconSpacingLeft: 'pl-8',
    iconSpacingRight: 'pr-8',
  },
  md: {
    input: 'h-9 text-[var(--text-sm)] px-3 rounded-[var(--radius-md)]',
    icon: 'w-4 h-4',
    iconSpacingLeft: 'pl-9',
    iconSpacingRight: 'pr-9',
  },
  lg: {
    input: 'h-11 text-[var(--text-base)] px-3.5 rounded-[var(--radius-lg)]',
    icon: 'w-4.5 h-4.5',
    iconSpacingLeft: 'pl-10',
    iconSpacingRight: 'pr-10',
  },
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      size = 'md',
      label,
      helperText,
      error,
      icon,
      iconRight,
      className,
      containerClassName,
      id,
      disabled,
      required,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;
    const sizeConfig = sizeStyles[size];

    return (
      <div className={cn('w-full flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="flex items-center gap-1 text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)] select-none"
          >
            {label}
            {required && (
              <span
                className="text-[var(--color-error)] text-[var(--text-xs)]"
                aria-hidden="true"
              >
                *
              </span>
            )}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && (
            <div
              className={cn(
                'absolute left-2.5 flex items-center justify-center pointer-events-none text-[var(--color-text-tertiary)] shrink-0',
                sizeConfig.icon,
              )}
            >
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              'w-full border font-normal text-[var(--color-text-primary)] placeholder:text-[var(--color-text-quaternary)]',
              'transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]',
              'focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[var(--color-border-primary)]',
              variantStyles[variant],
              sizeConfig.input,
              icon && sizeConfig.iconSpacingLeft,
              (iconRight || hasError) && sizeConfig.iconSpacingRight,
              hasError &&
                'border-[var(--color-border-error)] focus:border-[var(--color-border-error)] focus:ring-[var(--color-error-subtle)] text-[var(--color-error-text)]',
              className,
            )}
            {...props}
          />

          {hasError ? (
            <div
              className={cn(
                'absolute right-2.5 flex items-center justify-center pointer-events-none text-[var(--color-error)] shrink-0',
                sizeConfig.icon,
              )}
            >
              <AlertCircle className="w-full h-full" />
            </div>
          ) : iconRight ? (
            <div
              className={cn(
                'absolute right-2.5 flex items-center justify-center pointer-events-none text-[var(--color-text-tertiary)] shrink-0',
                sizeConfig.icon,
              )}
            >
              {iconRight}
            </div>
          ) : null}
        </div>

        {errorMessage ? (
          <p
            id={errorId}
            className="text-[var(--text-xs)] font-medium text-[var(--color-error)] animate-slide-down flex items-center gap-1"
          >
            {errorMessage}
          </p>
        ) : helperText ? (
          <p
            id={helperId}
            className="text-[var(--text-xs)] text-[var(--color-text-tertiary)]"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
