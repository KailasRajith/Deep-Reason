/* ============================================================
   DEEP REASON — Stat Card Component
   Metric overview card showing label, value, trend indicator,
   and optional icon.
   ============================================================ */
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatTrend {
  value: number | string;
  isPositive?: boolean | null; // true = up/good, false = down/bad, null = neutral
  label?: string; // e.g. "vs last month"
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  trend?: StatTrend;
  icon?: React.ReactNode;
  description?: string;
  hoverable?: boolean;
  loading?: boolean;
  variant?: 'default' | 'elevated' | 'subtle';
}

const variantStyles = {
  default:
    'bg-[var(--color-bg-secondary)] border-[var(--color-border-primary)] shadow-[var(--shadow-xs)]',
  elevated:
    'bg-[var(--color-bg-elevated)] border-[var(--color-border-primary)] shadow-[var(--shadow-md)]',
  subtle:
    'bg-[var(--color-bg-tertiary)] border-[var(--color-border-secondary)]',
};

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      label,
      value,
      trend,
      icon,
      description,
      hoverable = false,
      loading = false,
      variant = 'default',
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col justify-between p-5 rounded-[var(--radius-xl)] border transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]',
          variantStyles[variant],
          hoverable &&
            'hover:shadow-[var(--shadow-md)] hover:border-[var(--color-border-focus)]/30 hover:-translate-y-0.5 cursor-pointer',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)] tracking-wide">
            {label}
          </span>
          {icon && (
            <div
              className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] shrink-0 [&_svg]:w-4 [&_svg]:h-4"
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-2 my-1">
            <div className="h-7 w-24 skeleton rounded-[var(--radius-sm)]" />
            <div className="h-4 w-32 skeleton rounded-[var(--radius-sm)]" />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-primary)] tracking-tight leading-none">
              {value}
            </div>

            {(trend || description) && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {trend && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--radius-full)] text-[11px] font-medium leading-none shrink-0',
                      trend.isPositive === true &&
                        'bg-[var(--color-success-subtle)] text-[var(--color-success-text)]',
                      trend.isPositive === false &&
                        'bg-[var(--color-error-subtle)] text-[var(--color-error-text)]',
                      (trend.isPositive === null || trend.isPositive === undefined) &&
                        'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
                    )}
                  >
                    {trend.isPositive === true && (
                      <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                    )}
                    {trend.isPositive === false && (
                      <TrendingDown className="w-3 h-3 stroke-[2.5]" />
                    )}
                    {trend.isPositive === null && (
                      <Minus className="w-3 h-3 stroke-[2.5]" />
                    )}
                    <span>{trend.value}</span>
                  </span>
                )}

                {(trend?.label || description) && (
                  <span className="text-[var(--text-xs)] text-[var(--color-text-tertiary)] truncate">
                    {trend?.label || description}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

StatCard.displayName = 'StatCard';
