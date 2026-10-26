/* ============================================================
   DEEP REASON — Tabs Component
   Tab navigation with underline and pill variants,
   controlled state, and full keyboard accessibility.
   ============================================================ */
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useId,
  useRef,
} from 'react';
import { cn } from '@/lib/utils';

export type TabsVariant = 'underline' | 'pill';
export type TabsSize = 'sm' | 'md' | 'lg';

interface TabsContextType {
  value: string;
  onValueChange: (val: string) => void;
  variant: TabsVariant;
  size: TabsSize;
  baseId: string;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return ctx;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
  size?: TabsSize;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      value: controlledValue,
      defaultValue = '',
      onValueChange,
      variant = 'pill',
      size = 'md',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState(defaultValue);
    const value = isControlled ? controlledValue : internalValue;
    const baseId = useId();

    const handleValueChange = useCallback(
      (newVal: string) => {
        if (!isControlled) {
          setInternalValue(newVal);
        }
        onValueChange?.(newVal);
      },
      [isControlled, onValueChange],
    );

    return (
      <TabsContext.Provider
        value={{
          value,
          onValueChange: handleValueChange,
          variant,
          size,
 baseId,
        }}
      >
        <div ref={ref} className={cn('flex flex-col', className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = 'Tabs';

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  fullWidth?: boolean;
}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ fullWidth = false, className, children, ...props }, ref) => {
    const { variant } = useTabsContext();
    const listRef = useRef<HTMLDivElement | null>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const tabs = Array.from(
        (listRef.current || e.currentTarget).querySelectorAll<HTMLButtonElement>(
          '[role="tab"]:not([disabled])',
        ),
      );
      if (tabs.length === 0) return;

      const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = tabs.length - 1;
      } else {
        return;
      }

      tabs[nextIndex]?.focus();
      tabs[nextIndex]?.click();
    };

    return (
      <div
        ref={(node) => {
          listRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        role="tablist"
        onKeyDown={handleKeyDown}
        className={cn(
          'inline-flex items-center',
          variant === 'pill' &&
            'bg-[var(--color-bg-tertiary)] p-1 rounded-[var(--radius-lg)] border border-[var(--color-border-primary)]',
          variant === 'underline' &&
            'border-b border-[var(--color-border-primary)] gap-4',
          fullWidth && 'w-full justify-stretch',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TabsList.displayName = 'TabsList';

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  icon?: React.ReactNode;
}

const sizeStyles: Record<
  TabsSize,
  {
    pill: string;
    underline: string;
  }
> = {
  sm: {
    pill: 'px-2.5 py-1 text-[var(--text-xs)] rounded-[var(--radius-md)] gap-1.5',
    underline: 'pb-2 text-[var(--text-xs)] gap-1.5',
  },
  md: {
    pill: 'px-3 py-1.5 text-[var(--text-sm)] rounded-[var(--radius-md)] gap-2',
    underline: 'pb-2.5 text-[var(--text-sm)] gap-2',
  },
  lg: {
    pill: 'px-4 py-2 text-[var(--text-base)] rounded-[var(--radius-lg)] gap-2.5',
    underline: 'pb-3 text-[var(--text-base)] gap-2.5',
  },
};

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  TabsTriggerProps
>(({ value: tabValue, icon, className, children, disabled, ...props }, ref) => {
  const { value, onValueChange, variant, size, baseId } = useTabsContext();
  const isSelected = value === tabValue;
  const triggerId = `${baseId}-trigger-${tabValue}`;
  const panelId = `${baseId}-panel-${tabValue}`;

  return (
    <button
      ref={ref}
      id={triggerId}
      role="tab"
      type="button"
      disabled={disabled}
      aria-selected={isSelected}
      aria-controls={panelId}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => onValueChange(tabValue)}
      className={cn(
        'inline-flex items-center justify-center font-medium select-none cursor-pointer',
        'transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'pill' && [
          sizeStyles[size].pill,
          isSelected
            ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]',
        ],
        variant === 'underline' && [
          sizeStyles[size].underline,
          'relative -mb-[1px] border-b-2 font-medium',
          isSelected
            ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
            : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-primary)]',
        ],
        className,
      )}
      {...props}
    >
      {icon && (
        <span className="shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5" aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </button>
  );
});
TabsTrigger.displayName = 'TabsTrigger';

export interface TabsContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = React.forwardRef<
  HTMLDivElement,
  TabsContentProps
>(({ value: tabValue, className, children, ...props }, ref) => {
  const { value, baseId } = useTabsContext();
  const isSelected = value === tabValue;
  const triggerId = `${baseId}-trigger-${tabValue}`;
  const panelId = `${baseId}-panel-${tabValue}`;

  if (!isSelected) return null;

  return (
    <div
      ref={ref}
      id={panelId}
      role="tabpanel"
      aria-labelledby={triggerId}
      tabIndex={0}
      className={cn(
        'mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] animate-fade-in',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
TabsContent.displayName = 'TabsContent';
