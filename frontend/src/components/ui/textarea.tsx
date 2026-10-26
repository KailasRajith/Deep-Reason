/* ============================================================
   DEEP REASON — Textarea Component
   Multi-line text input with label, helper text, error state, and counter.
   ============================================================ */
'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export type TextareaVariant = 'default' | 'filled';
export type TextareaSize = 'sm' | 'md' | 'lg';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: TextareaVariant;
  size?: TextareaSize;
  label?: string;
  helperText?: string;
  error?: string | boolean;
  showCount?: boolean;
  maxCharacters?: number;
  containerClassName?: string;
}

const variantStyles: Record<TextareaVariant, string> = {
  default:
    'bg-[var(--color-bg-secondary)] border-[var(--color-border-primary)] hover:border-[var(--color-text-quaternary)] focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-accent-subtle)]',
  filled:
    'bg-[var(--color-bg-tertiary)] border-transparent hover:bg-[var(--color-bg-hover)] focus:bg-[var(--color-bg-secondary)] focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-accent-subtle)]',
};

const sizeStyles: Record<TextareaSize, string> = {
  sm: 'text-[var(--text-xs)] p-2 min-h-[64px] rounded-[var(--radius-md)]',
  md: 'text-[var(--text-sm)] p-2.5 min-h-[88px] rounded-[var(--radius-md)]',
  lg: 'text-[var(--text-base)] p-3.5 min-h-[120px] rounded-[var(--radius-lg)]',
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      variant = 'default',
      size = 'md',
      label,
      helperText,
      error,
      showCount = false,
      maxCharacters,
      className,
      containerClassName,
      id,
      disabled,
      required,
      value,
      defaultValue,
      onChange,
      maxLength,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;

    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;
    const effectiveMaxLength = maxCharacters ?? maxLength;

    const [currentLength, setCurrentLength] = React.useState<number>(() => {
      if (typeof value === 'string') return value.length;
      if (typeof defaultValue === 'string') return defaultValue.length;
      return 0;
    });

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCurrentLength(e.target.value.length);
      onChange?.(e);
    };

    return (
      <div className={cn('w-full flex flex-col gap-1.5', containerClassName)}>
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={textareaId}
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

          {showCount && (
            <span
              className={cn(
                'text-[var(--text-xs)] text-[var(--color-text-quaternary)] ml-auto font-mono',
                effectiveMaxLength &&
                  currentLength >= effectiveMaxLength &&
                  'text-[var(--color-error)] font-medium',
              )}
            >
              {currentLength}
              {effectiveMaxLength ? ` / ${effectiveMaxLength}` : ''}
            </span>
          )}
        </div>

        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            disabled={disabled}
            required={required}
            maxLength={effectiveMaxLength}
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              'w-full border font-normal text-[var(--color-text-primary)] placeholder:text-[var(--color-text-quaternary)]',
              'transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]',
              'focus:outline-none resize-y',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[var(--color-border-primary)]',
              variantStyles[variant],
              sizeStyles[size],
              hasError &&
                'border-[var(--color-border-error)] focus:border-[var(--color-border-error)] focus:ring-[var(--color-error-subtle)]',
              className,
            )}
            {...props}
          />
        </div>

        {errorMessage ? (
          <p
            id={errorId}
            className="text-[var(--text-xs)] font-medium text-[var(--color-error)] animate-slide-down flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
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

Textarea.displayName = 'Textarea';
