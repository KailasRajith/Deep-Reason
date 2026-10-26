/* ============================================================
   DEEP REASON — Toast Notification System
   ToastProvider, useToast hook, multi-toast stacking,
   auto-dismiss timer, and Apple-grade animations.
   ============================================================ */
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: React.ReactNode;
  duration?: number;
  action?: ToastAction;
}

export interface ToastOptions {
  id?: string;
  description?: React.ReactNode;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextType {
  toasts: ToastItem[];
  toast: {
    (item: Omit<ToastItem, 'id'> & { id?: string }): string;
    success: (title: string, options?: ToastOptions) => string;
    error: (title: string, options?: ToastOptions) => string;
    warning: (title: string, options?: ToastOptions) => string;
    info: (title: string, options?: ToastOptions) => string;
  };
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Standalone global dispatcher for use outside React tree if needed
type ToastListener = (toasts: ToastItem[]) => void;
let globalToasts: ToastItem[] = [];
const listeners: Set<ToastListener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener([...globalToasts]));
}

export interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'bottom-right' | 'bottom-center' | 'top-right' | 'top-center';
  maxVisible?: number;
}

export function ToastProvider({
  children,
  position = 'bottom-right',
  maxVisible = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    globalToasts = globalToasts.filter((t) => t.id !== id);
    notifyListeners();
  }, []);

  const dismissAll = useCallback(() => {
    globalToasts = [];
    notifyListeners();
  }, []);

  const addToast = useCallback(
    (item: Omit<ToastItem, 'id'> & { id?: string }): string => {
      const id = item.id || Math.random().toString(36).slice(2, 9);
      const newToast: ToastItem = {
        ...item,
        id,
        duration: item.duration ?? 4500,
      };

      globalToasts = [newToast, ...globalToasts.filter((t) => t.id !== id)].slice(
        0,
        maxVisible,
      );
      notifyListeners();
      return id;
    },
    [maxVisible],
  );

  const toastMethods = Object.assign(
    (item: Omit<ToastItem, 'id'> & { id?: string }) => addToast(item),
    {
      success: (title: string, options?: ToastOptions) =>
        addToast({ ...options, title, type: 'success' }),
      error: (title: string, options?: ToastOptions) =>
        addToast({ ...options, title, type: 'error' }),
      warning: (title: string, options?: ToastOptions) =>
        addToast({ ...options, title, type: 'warning' }),
      info: (title: string, options?: ToastOptions) =>
        addToast({ ...options, title, type: 'info' }),
    },
  );

  const positionStyles = {
    'bottom-right': 'bottom-4 right-4 items-end',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
    'top-right': 'top-4 right-4 items-end',
    'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
  };

  return (
    <ToastContext.Provider
      value={{
        toasts,
        toast: toastMethods,
        dismiss,
        dismissAll,
      }}
    >
      {children}
      {mounted &&
        createPortal(
          <div
            role="region"
            aria-label="Notifications"
            className={cn(
              'fixed z-[var(--z-toast)] pointer-events-none flex flex-col gap-2.5 max-w-sm w-full p-2',
              positionStyles[position],
            )}
          >
            {toasts.map((item) => (
              <ToastCard
                key={item.id}
                item={item}
                onDismiss={() => dismiss(item.id)}
              />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

const typeStyles: Record<
  ToastType,
  {
    icon: React.ReactNode;
    color: string;
    border: string;
  }
> = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />,
    color: 'text-[var(--color-success)]',
    border: 'border-[var(--color-success)]/20',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4 text-[var(--color-error)]" />,
    color: 'text-[var(--color-error)]',
    border: 'border-[var(--color-error)]/20',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />,
    color: 'text-[var(--color-warning)]',
    border: 'border-[var(--color-warning)]/20',
  },
  info: {
    icon: <Info className="w-4 h-4 text-[var(--color-info)]" />,
    color: 'text-[var(--color-info)]',
    border: 'border-[var(--color-info)]/20',
  },
};

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const remainingTime = useRef(item.duration ?? 4500);
  const timerStart = useRef(Date.now());
  const timerId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!item.duration || item.duration <= 0) return;

    if (!isPaused) {
      timerStart.current = Date.now();
      timerId.current = setTimeout(() => {
        onDismiss();
      }, remainingTime.current);
    } else {
      if (timerId.current) {
        clearTimeout(timerId.current);
        const elapsed = Date.now() - timerStart.current;
        remainingTime.current = Math.max(0, remainingTime.current - elapsed);
      }
    }

    return () => {
      if (timerId.current) clearTimeout(timerId.current);
    };
  }, [isPaused, item.duration, onDismiss]);

  const typeConfig = typeStyles[item.type];

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={cn(
        'pointer-events-auto flex items-start gap-3 w-full p-4 rounded-[var(--radius-xl)]',
        'bg-[var(--color-bg-elevated)] border shadow-[var(--shadow-lg)]',
        'transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]',
        'animate-slide-up',
        typeConfig.border,
      )}
    >
      <div className="shrink-0 mt-0.5">{typeConfig.icon}</div>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <h4 className="text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] leading-tight">
          {item.title}
        </h4>
        {item.description && (
          <div className="text-[var(--text-xs)] text-[var(--color-text-secondary)] leading-normal">
            {item.description}
          </div>
        )}
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss();
            }}
            className="mt-1 self-start text-[var(--text-xs)] font-medium text-[var(--color-accent)] hover:underline focus:outline-none"
          >
            {item.action.label}
          </button>
        )}
      </div>

      <button
        type="button"
        aria-label="Dismiss toast"
        onClick={onDismiss}
        className="shrink-0 p-1 rounded-[var(--radius-sm)] text-[var(--color-text-quaternary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
