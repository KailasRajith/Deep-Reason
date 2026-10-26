/* ============================================================
   DEEP REASON — Slider Component
   Accessible range slider for numeric values with label,
   min/max limits, step ticks, and live value display.
   ============================================================ */
'use client';

import React, { useState, useId, useMemo } from 'react';
import { cn } from '@/lib/utils';

export type SliderSize = 'sm' | 'md' | 'lg';

export interface SliderMark {
  value: number;
  label?: string;
}

export interface SliderProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'size' | 'onChange' | 'value' | 'defaultValue'
  > {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  label?: string;
  showValue?: boolean;
  valueFormat?: (value: number) => string;
  marks?: SliderMark[];
  size?: SliderSize;
  containerClassName?: string;
}

const trackHeights: Record<SliderSize, string> = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2.5',
};

const thumbSizes: Record<SliderSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      value: controlledValue,
      defaultValue = 0,
      min = 0,
      max = 100,
      step = 1,
      onChange,
      label,
      showValue = true,
      valueFormat = (v) => `${v}`,
      marks,
      size = 'md',
      disabled = false,
      className,
      containerClassName,
      id,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const sliderId = id || generatedId;
    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState<number>(defaultValue);
    const currentValue = isControlled ? controlledValue : internalValue;

    const percentage = useMemo(() => {
      const safeVal = Math.min(Math.max(currentValue, min), max);
      return ((safeVal - min) / (max - min)) * 100;
    }, [currentValue, min, max]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const numericVal = Number(e.target.value);
      if (!isControlled) {
        setInternalValue(numericVal);
      }
      onChange?.(numericVal);
    };

    return (
      <div className={cn('w-full flex flex-col gap-2', containerClassName)}>
        {(label || showValue) && (
          <div className="flex items-center justify-between">
            {label && (
              <label
                htmlFor={sliderId}
                className="text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)] select-none"
              >
                {label}
              </label>
            )}

            {showValue && (
              <span className="text-[var(--text-xs)] font-mono font-medium text-[var(--color-text-primary)]">
                {valueFormat(currentValue)}
              </span>
            )}
          </div>
        )}

        <div className="relative flex items-center w-full py-1">
          {/* Custom Track Background */}
          <div
            className={cn(
              'w-full bg-[var(--color-bg-tertiary)] rounded-[var(--radius-full)] overflow-hidden border border-[var(--color-border-primary)]',
              trackHeights[size],
            )}
          >
            {/* Active filled track */}
            <div
              className="h-full bg-[var(--color-accent)] transition-all duration-[var(--duration-fast)]"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Native range input overlayed transparently for full touch/keyboard support */}
          <input
            ref={ref}
            id={sliderId}
            type="range"
            min={min}
            max={max}
            step={step}
            value={currentValue}
            onChange={handleChange}
            disabled={disabled}
            className={cn(
              'absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed h-full z-10',
              className,
            )}
            {...props}
          />

          {/* Visible thumb styled Apple-like */}
          <div
            className={cn(
              'absolute pointer-events-none rounded-full bg-[var(--color-bg-elevated)] border-2 border-[var(--color-accent)] shadow-[var(--shadow-sm)]',
              'transition-transform duration-[var(--duration-fast)] -translate-x-1/2',
              thumbSizes[size],
              disabled && 'opacity-50 border-[var(--color-text-quaternary)]',
            )}
            style={{ left: `${percentage}%` }}
          />
        </div>

        {marks && marks.length > 0 && (
          <div className="relative w-full flex justify-between text-[10px] text-[var(--color-text-tertiary)] px-0.5 select-none">
            {marks.map((m) => {
              const markPercent = ((m.value - min) / (max - min)) * 100;
              return (
                <div
                  key={m.value}
                  className="flex flex-col items-center -translate-x-1/2"
                  style={{ position: 'absolute', left: `${markPercent}%` }}
                >
                  <div className="w-0.5 h-1 bg-[var(--color-border-primary)] mb-0.5" />
                  {m.label && <span>{m.label}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);

Slider.displayName = 'Slider';
