/* ============================================================
   DEEP REASON — Tooltip Component
   Accessible tooltip supporting top/bottom/left/right placement,
   delay timings, and keyboard accessibility.
   ============================================================ */
'use client';

import React, { useState, useRef, useId, useEffect } from 'react';
import { cn } from '@/lib/utils';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<{
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
    'aria-describedby'?: string;
  }>;
  placement?: TooltipPlacement;
  delay?: number;
  disabled?: boolean;
  className?: string;
}

const placementStyles: Record<TooltipPlacement, string> = {
  top: 'bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 origin-bottom',
  bottom: 'top-[calc(100%+6px)] left-1/2 -translate-x-1/2 origin-top',
  left: 'right-[calc(100%+6px)] top-1/2 -translate-y-1/2 origin-right',
  right: 'left-[calc(100%+6px)] top-1/2 -translate-y-1/2 origin-left',
};

export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 200,
  disabled = false,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipId = useId();

  const show = () => {
    if (disabled || !content) return;
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        hide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const child = React.Children.only(children);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {React.cloneElement(child, {
        'aria-describedby': isVisible ? tooltipId : undefined,
      })}

      {isVisible && !disabled && (
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            'absolute z-[var(--z-popover)] pointer-events-none select-none',
            'px-2.5 py-1 text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]',
            'bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)]',
            'rounded-[var(--radius-md)] shadow-[var(--shadow-md)] whitespace-nowrap',
            'animate-scale-in',
            placementStyles[placement],
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
