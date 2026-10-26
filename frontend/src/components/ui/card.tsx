/* ============================================================
   DEEP REASON — Card Component
   Polished container with header, description, content, and footer.
   ============================================================ */
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'sunken' | 'ghost';
  hoverable?: boolean;
}

const variantStyles: Record<string, string> = {
  default:
    'bg-[var(--color-bg-secondary)] border-[var(--color-border-primary)] shadow-[var(--shadow-xs)]',
  elevated:
    'bg-[var(--color-bg-elevated)] border-[var(--color-border-primary)] shadow-[var(--shadow-md)]',
  sunken:
    'bg-[var(--color-bg-tertiary)] border-[var(--color-border-secondary)]',
  ghost:
    'bg-transparent border-transparent shadow-none',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', hoverable = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[var(--radius-xl)] border transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]',
          variantStyles[variant],
          hoverable &&
            'hover:shadow-[var(--shadow-md)] hover:border-[var(--color-border-focus)]/30 hover:-translate-y-0.5 cursor-pointer',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { action?: React.ReactNode }
>(({ className, action, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-start justify-between gap-4 p-5 sm:p-6 pb-3',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-1 flex-1 min-w-0">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
});
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' }
>(({ as = 'h3', className, children, ...props }, ref) => {
  const Component = as;
  return (
    <Component
      ref={ref}
      className={cn(
        'text-[var(--text-base)] sm:text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)] tracking-tight leading-snug',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
});
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn(
        'text-[var(--text-sm)] text-[var(--color-text-secondary)] leading-relaxed',
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
});
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('p-5 sm:p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
});
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { bordered?: boolean }
>(({ bordered = false, className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between gap-3 p-5 sm:p-6 pt-3',
        bordered && 'border-t border-[var(--color-border-secondary)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
CardFooter.displayName = 'CardFooter';
