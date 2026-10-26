/* ============================================================
   DEEP REASON — Dropdown Menu Component
   Accessible dropdown menu with items, separators, shortcuts,
   submenus, and complete keyboard navigation.
   ============================================================ */
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, Check } from 'lucide-react';

interface DropdownMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  closeAll: () => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextType | undefined>(
  undefined,
);

function useDropdown() {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) {
    throw new Error('Dropdown components must be used within DropdownMenu');
  }
  return ctx;
}

export interface DropdownMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function DropdownMenu({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const setOpen = useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange],
  );

  const closeAll = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, [setOpen]);

  return (
    <DropdownMenuContext.Provider
      value={{ open, setOpen, triggerRef, contentRef, closeAll }}
    >
      <div className="relative inline-block text-left">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export interface DropdownMenuTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(({ className, onClick, onKeyDown, children, ...props }, ref) => {
  const { open, setOpen, triggerRef } = useDropdown();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (!e.defaultPrevented) {
      setOpen(!open);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <button
      ref={(node) => {
        triggerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

export interface DropdownMenuContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'end' | 'center';
  sideOffset?: number;
}

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(({ align = 'start', className, children, ...props }, ref) => {
  const { open, setOpen, contentRef, triggerRef } = useDropdown();

  // Outside click handler
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, setOpen, contentRef, triggerRef]);

  // Keyboard navigation inside menu
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!contentRef.current) return;

    const items = Array.from(
      contentRef.current.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      ),
    );

    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[nextIndex]?.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prevIndex]?.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        items[0]?.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      }
      case 'Tab': {
        setOpen(false);
        break;
      }
    }
  };

  useEffect(() => {
    if (open && contentRef.current) {
      const firstItem = contentRef.current.querySelector<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      );
      setTimeout(() => firstItem?.focus(), 50);
    }
  }, [open, contentRef]);

  if (!open) return null;

  const alignStyles = {
    start: 'left-0',
    end: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div
      ref={(node) => {
        contentRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      role="menu"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={cn(
        'absolute top-[calc(100%+4px)] z-[var(--z-dropdown)] min-w-[200px]',
        'bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)]',
        'rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-1.5',
        'animate-slide-down focus:outline-none',
        alignStyles[align],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuContent.displayName = 'DropdownMenuContent';

export interface DropdownMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
}

export const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuItemProps
>(
  (
    {
      icon,
      shortcut,
      danger = false,
      disabled = false,
      className,
      onClick,
      children,
      ...props
    },
    ref,
  ) => {
    const { closeAll } = useDropdown();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      onClick?.(e);
      closeAll();
    };

    return (
      <button
        ref={ref}
        role="menuitem"
        type="button"
        disabled={disabled}
        aria-disabled={disabled}
        onClick={handleClick}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-[var(--radius-md)]',
          'text-[var(--text-sm)] text-left font-normal select-none cursor-pointer',
          'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
          'hover:bg-[var(--color-bg-hover)] focus:bg-[var(--color-bg-hover)] focus:outline-none',
          danger
            ? 'text-[var(--color-error)] hover:bg-[var(--color-error-subtle)] focus:bg-[var(--color-error-subtle)]'
            : 'text-[var(--color-text-primary)]',
          disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
          className,
        )}
        {...props}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && (
            <span
              className={cn(
                'shrink-0 text-[var(--color-text-tertiary)]',
                danger && 'text-[var(--color-error)]',
              )}
            >
              {icon}
            </span>
          )}
          <span className="truncate">{children}</span>
        </div>

        {shortcut && (
          <span className="text-[var(--text-xs)] text-[var(--color-text-quaternary)] font-mono tracking-widest pl-2">
            {shortcut}
          </span>
        )}
      </button>
    );
  },
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

export interface DropdownMenuCheckboxItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuCheckboxItemProps
>(
  (
    {
      checked = false,
      onCheckedChange,
      disabled = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        role="menuitemcheckbox"
        type="button"
        disabled={disabled}
        aria-checked={checked}
        aria-disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          'w-full flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-[var(--radius-md)]',
          'text-[var(--text-sm)] text-[var(--color-text-primary)] text-left font-normal select-none cursor-pointer',
          'hover:bg-[var(--color-bg-hover)] focus:bg-[var(--color-bg-hover)] focus:outline-none transition-colors',
          disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
          className,
        )}
        {...props}
      >
        <span className="truncate">{children}</span>
        <span
          className={cn(
            'flex items-center justify-center w-4 h-4 rounded-[var(--radius-sm)] border',
            checked
              ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--color-accent-text)]'
              : 'border-[var(--color-border-primary)]',
          )}
        >
          {checked && <Check className="w-3 h-3 stroke-[2.5]" />}
        </span>
      </button>
    );
  },
);
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

export const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="separator"
      className={cn(
        'my-1 h-[1px] bg-[var(--color-border-primary)] -mx-1',
        className,
      )}
      {...props}
    />
  );
});
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

export const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'px-2.5 py-1 text-[var(--text-xs)] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-wider',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

// Submenu primitive
interface SubmenuContextType {
  subOpen: boolean;
  setSubOpen: (open: boolean) => void;
}

const SubmenuContext = createContext<SubmenuContextType | undefined>(undefined);

export function DropdownMenuSub({ children }: { children: React.ReactNode }) {
  const [subOpen, setSubOpen] = useState(false);
  return (
    <SubmenuContext.Provider value={{ subOpen, setSubOpen }}>
      <div
        className="relative"
        onMouseEnter={() => setSubOpen(true)}
        onMouseLeave={() => setSubOpen(false)}
      >
        {children}
      </div>
    </SubmenuContext.Provider>
  );
}

export const DropdownMenuSubTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }
>(({ icon, className, children, ...props }, ref) => {
  const { subOpen, setSubOpen } = useContext(SubmenuContext)!;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSubOpen(true);
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={subOpen}
      onKeyDown={handleKeyDown}
      className={cn(
        'w-full flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-[var(--radius-md)]',
        'text-[var(--text-sm)] text-[var(--color-text-primary)] text-left font-normal select-none cursor-pointer',
        'hover:bg-[var(--color-bg-hover)] focus:bg-[var(--color-bg-hover)] focus:outline-none transition-colors',
        subOpen && 'bg-[var(--color-bg-hover)]',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2 truncate">
        {icon && (
          <span className="shrink-0 text-[var(--color-text-tertiary)]">
            {icon}
          </span>
        )}
        <span className="truncate">{children}</span>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-quaternary)] shrink-0" />
    </button>
  );
});
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

export const DropdownMenuSubContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { subOpen, setSubOpen } = useContext(SubmenuContext)!;
  const subRef = useRef<HTMLDivElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSubOpen(false);
    }
  };

  if (!subOpen) return null;

  return (
    <div
      ref={(node) => {
        subRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      role="menu"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={cn(
        'absolute left-[calc(100%+4px)] top-0 z-[var(--z-dropdown)] min-w-[180px]',
        'bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)]',
        'rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-1.5',
        'animate-slide-down focus:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';
