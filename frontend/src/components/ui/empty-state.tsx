/* ============================================================
   DEEP REASON — Empty State Component
   Graceful empty state with icon, title, description, and action buttons.
   ============================================================ */
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from '@/components/ui/button';
import { Inbox } from 'lucide-react';

export type EmptyStateSize = 'sm' | 'md' | 'lg';

export interface EmptyStateActionConfig {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: ButtonProps['variant'];
}

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: EmptyStateActionConfig | React.ReactNode;
  secondaryAction?: EmptyStateActionConfig | React.ReactNode;
  bordered?: boolean;
  size?: EmptyStateSize;
}

const sizeConfig: Record<
  EmptyStateSize,
  {
    container: string;
    iconBox: string;
    iconSize: string;
    title: string;
    desc: string;
  }
> = {
  sm: {
    container: 'p-6 gap-3',
    iconBox: 'w-10 h-10 rounded-[var(--radius-xl)]',
    iconSize: '[&_svg]:w-5 [&_svg]:h-5',
    title: 'text-[var(--text-sm)]',
    desc: 'text-[var(--text-xs)] max-w-xs',
  },
  md: {
    container: 'p-8 sm:p-10 gap-4',
    iconBox: 'w-12 h-12 rounded-[var(--radius-2xl)]',
    iconSize: '[&_svg]:w-6 [&_svg]:h-6',
    title: 'text-[var(--text-base)] sm:text-[var(--text-lg)]',
    desc: 'text-[var(--text-sm)] max-w-sm',
  },
  lg: {
    container: 'p-12 sm:p-16 gap-5',
    iconBox: 'w-16 h-16 rounded-[var(--radius-2xl)]',
    iconSize: '[&_svg]:w-8 [&_svg]:h-8',
    title: 'text-[var(--text-lg)] sm:text-[var(--text-xl)]',
    desc: 'text-[var(--text-base)] max-w-md',
  },
};

function renderAction(action: EmptyStateActionConfig | React.ReactNode) {
  if (!action) return null;
  if (React.isValidElement(action)) return action;

  const cfg = action as EmptyStateActionConfig;
  return (
    <Button
      variant={cfg.variant || 'primary'}
      size="sm"
      icon={cfg.icon}
      onClick={cfg.onClick}
    >
      {cfg.label}
    </Button>
  );
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon = <Inbox />,
      title,
      description,
      action,
      secondaryAction,
      bordered = false,
      size = 'md',
      className,
      ...props
    },
    ref,
  ) => {
    const currentSize = sizeConfig[size];

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center',
          bordered &&
            'border border-dashed border-[var(--color-border-primary)] rounded-[var(--radius-2xl)] bg-[var(--color-bg-tertiary)]/30',
          currentSize.container,
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            'flex items-center justify-center',
            'bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--color-text-secondary)]',
            'shadow-[var(--shadow-xs)]',
            currentSize.iconBox,
            currentSize.iconSize,
          )}
          aria-hidden="true"
        >
          {icon}
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <h3
            className={cn(
              'font-semibold text-[var(--color-text-primary)] tracking-tight leading-snug',
              currentSize.title,
            )}
          >
            {title}
          </h3>
          {description && (
            <p
              className={cn(
                'text-[var(--color-text-secondary)] leading-relaxed',
                currentSize.desc,
              )}
            >
              {description}
            </p>
          )}
        </div>

        {(action || secondaryAction) && (
          <div className="flex items-center gap-2.5 mt-2 flex-wrap justify-center">
            {renderAction(action)}
            {secondaryAction &&
              renderAction(
                React.isValidElement(secondaryAction)
                  ? secondaryAction
                  : {
                      ...(secondaryAction as EmptyStateActionConfig),
                      variant: (secondaryAction as EmptyStateActionConfig)
                        .variant || 'secondary',
                    },
              )}
          </div>
        )}
      </div>
    );
  },
);

EmptyState.displayName = 'EmptyState';
