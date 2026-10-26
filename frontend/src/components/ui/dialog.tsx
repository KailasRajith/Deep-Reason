/* ============================================================
   DEEP REASON — Dialog Component
   Accessible modal dialog with overlay, focus trap, animation,
   and keyboard navigation.
   ============================================================ */
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useId,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog provider');
  }
  return context;
}

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const titleId = useId();
  const descriptionId = useId();

  const setOpen = useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange],
  );

  return (
    <DialogContext.Provider value={{ open, setOpen, titleId, descriptionId }}>
      {children}
    </DialogContext.Provider>
  );
}

export interface DialogTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  DialogTriggerProps
>(({ className, onClick, children, ...props }, ref) => {
  const { setOpen } = useDialogContext();

  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="dialog"
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) {
          setOpen(true);
        }
      }}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
});
DialogTrigger.displayName = 'DialogTrigger';

export interface DialogContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-[calc(100vw-2rem)] md:max-w-4xl',
};

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  DialogContentProps
>(
  (
    {
      closeOnOverlayClick = true,
      showCloseButton = true,
      size = 'md',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const { open, setOpen, titleId, descriptionId } = useDialogContext();
    const [mounted, setMounted] = useState(false);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const lastActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
      setMounted(true);
    }, []);

    // Focus trap & restore focus
    useEffect(() => {
      if (!open) return;

      lastActiveElement.current = document.activeElement as HTMLElement;

      const focusableSelector =
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setOpen(false);
          return;
        }

        if (e.key === 'Tab' && contentRef.current) {
          const focusables = Array.from(
            contentRef.current.querySelectorAll<HTMLElement>(focusableSelector),
          ).filter((el) => !el.hasAttribute('disabled'));

          if (focusables.length === 0) return;

          const first = focusables[0];
          const last = focusables[focusables.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      // Lock body scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Initial focus
      requestAnimationFrame(() => {
        if (contentRef.current) {
          const firstFocusable = contentRef.current.querySelector<HTMLElement>(
            focusableSelector,
          );
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            contentRef.current.focus();
          }
        }
      });

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
        lastActiveElement.current?.focus?.();
      };
    }, [open, setOpen]);

    if (!mounted || !open) return null;

    return createPortal(
      <div
        className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 sm:p-6"
        role="presentation"
      >
        {/* Backdrop overlay */}
        <div
          aria-hidden="true"
          onClick={() => {
            if (closeOnOverlayClick) setOpen(false);
          }}
          className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        />

        {/* Modal content */}
        <div
          ref={(node) => {
            contentRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          className={cn(
            'relative z-10 w-full overflow-hidden',
            'bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)]',
            'rounded-[var(--radius-2xl)] shadow-[var(--shadow-xl)]',
            'p-6 animate-scale-in focus:outline-none',
            sizeStyles[size],
            className,
          )}
          {...props}
        >
          {showCloseButton && (
            <button
              type="button"
              aria-label="Close dialog"
              onClick={() => setOpen(false)}
              className={cn(
                'absolute right-4 top-4 p-1.5 rounded-[var(--radius-md)]',
                'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]',
                'hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-active)]',
                'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
              )}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {children}
        </div>
      </div>,
      document.body,
    );
  },
);
DialogContent.displayName = 'DialogContent';

export const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1.5 mb-4 pr-6', className)}
      {...props}
    >
      {children}
    </div>
  );
});
DialogHeader.displayName = 'DialogHeader';

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => {
  const { titleId } = useDialogContext();
  return (
    <h2
      ref={ref}
      id={titleId}
      className={cn(
        'text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)] tracking-tight leading-snug',
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
});
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { descriptionId } = useDialogContext();
  return (
    <p
      ref={ref}
      id={descriptionId}
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
DialogDescription.displayName = 'DialogDescription';

export const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-[var(--color-border-secondary)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
DialogFooter.displayName = 'DialogFooter';

export const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, children, ...props }, ref) => {
  const { setOpen } = useDialogContext();
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) {
          setOpen(false);
        }
      }}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
});
DialogClose.displayName = 'DialogClose';
