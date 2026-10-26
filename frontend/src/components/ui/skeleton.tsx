/* ============================================================
   DEEP REASON — Skeleton Component
   Loading placeholder with shimmer animation and shape variants.
   ============================================================ */
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type SkeletonVariant = 'text' | 'circle' | 'rect' | 'rounded';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  lines?: number;
  animate?: boolean;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'text',
      width,
      height,
      lines = 1,
      animate = true,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const isMultiLine = variant === 'text' && lines > 1;

    const baseShimmer = animate
      ? 'skeleton'
      : 'bg-[var(--color-bg-tertiary)]';

    const getVariantClass = (v: SkeletonVariant) => {
      switch (v) {
        case 'circle':
          return 'rounded-full aspect-square shrink-0';
        case 'rect':
          return 'rounded-none';
        case 'rounded':
          return 'rounded-[var(--radius-xl)]';
        case 'text':
        default:
          return 'h-4 w-full rounded-[var(--radius-sm)]';
      }
    };

    const inlineStyle: React.CSSProperties = {
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
      ...style,
    };

    if (isMultiLine) {
      return (
        <div
          ref={ref}
          role="status"
          aria-busy="true"
          aria-live="polite"
          aria-label="Loading content..."
          className={cn('flex flex-col gap-2.5 w-full', className)}
          {...props}
        >
          {Array.from({ length: lines }).map((_, index) => {
            const isLast = index === lines - 1;
            const lineWidth = isLast ? '75%' : '100%';
            return (
              <div
                key={index}
                className={cn('h-3.5', baseShimmer, getVariantClass('text'))}
                style={{ width: lineWidth }}
              />
            );
          })}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label="Loading..."
        style={inlineStyle}
        className={cn(baseShimmer, getVariantClass(variant), className)}
        {...props}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';
