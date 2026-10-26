/* ============================================================
   DEEP REASON — Select Component
   Custom select dropdown with keyboard navigation, search/filter,
   and grouped options support.
   ============================================================ */
'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useId,
  useMemo,
  useCallback,
} from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check, Search, X, AlertCircle } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectProps {
  options?: SelectOption[];
  groups?: SelectGroup[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: string | boolean;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  clearable?: boolean;
  size?: SelectSize;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  id?: string;
}

const sizeStyles: Record<
  SelectSize,
  {
    trigger: string;
    text: string;
    item: string;
    search: string;
    icon: string;
  }
> = {
  sm: {
    trigger: 'h-8 px-2.5 rounded-[var(--radius-md)] text-[var(--text-xs)] gap-1.5',
    text: 'text-[var(--text-xs)]',
    item: 'py-1 px-2 text-[var(--text-xs)]',
    search: 'h-7 text-[var(--text-xs)] px-2',
    icon: 'w-3.5 h-3.5',
  },
  md: {
    trigger: 'h-9 px-3 rounded-[var(--radius-md)] text-[var(--text-sm)] gap-2',
    text: 'text-[var(--text-sm)]',
    item: 'py-1.5 px-2.5 text-[var(--text-sm)]',
    search: 'h-8 text-[var(--text-sm)] px-2.5',
    icon: 'w-4 h-4',
  },
  lg: {
    trigger: 'h-11 px-3.5 rounded-[var(--radius-lg)] text-[var(--text-base)] gap-2.5',
    text: 'text-[var(--text-base)]',
    item: 'py-2 px-3 text-[var(--text-base)]',
    search: 'h-9 text-[var(--text-sm)] px-3',
    icon: 'w-4.5 h-4.5',
  },
};

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      options,
      groups,
      value: controlledValue,
      defaultValue = '',
      onChange,
      placeholder = 'Select an option...',
      label,
      helperText,
      error,
      disabled = false,
      required = false,
      searchable = false,
      searchPlaceholder = 'Search options...',
      clearable = false,
      size = 'md',
      className,
      triggerClassName,
      dropdownClassName,
      id,
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const listboxId = `${selectId}-listbox`;
    const labelId = `${selectId}-label`;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState<string>(defaultValue);
    const currentValue = isControlled ? controlledValue : internalValue;

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const listboxRef = useRef<HTMLDivElement>(null);

    // Normalize options and groups
    const flatOptions = useMemo<SelectOption[]>(() => {
      if (groups && groups.length > 0) {
        return groups.flatMap((g) => g.options);
      }
      return options || [];
    }, [options, groups]);

    const filteredFlatOptions = useMemo(() => {
      if (!searchQuery.trim()) return flatOptions;
      const q = searchQuery.toLowerCase();
      return flatOptions.filter(
        (opt) =>
          opt.label.toLowerCase().includes(q) ||
          (opt.description && opt.description.toLowerCase().includes(q)),
      );
    }, [flatOptions, searchQuery]);

    const filteredGroups = useMemo<SelectGroup[] | null>(() => {
      if (!groups || groups.length === 0) return null;
      if (!searchQuery.trim()) return groups;
      const q = searchQuery.toLowerCase();
      return groups
        .map((g) => ({
          ...g,
          options: g.options.filter(
            (opt) =>
              opt.label.toLowerCase().includes(q) ||
              (opt.description && opt.description.toLowerCase().includes(q)),
          ),
        }))
        .filter((g) => g.options.length > 0);
    }, [groups, searchQuery]);

    const selectedOption = useMemo(
      () => flatOptions.find((opt) => opt.value === currentValue),
      [flatOptions, currentValue],
    );

    // Close on outside click
    useEffect(() => {
      if (!isOpen) return;
      const handleClickOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
          setSearchQuery('');
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Focus search on open
    useEffect(() => {
      if (isOpen && searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (isOpen) {
        const initialIdx = filteredFlatOptions.findIndex(
          (o) => o.value === currentValue && !o.disabled,
        );
        setFocusedIndex(initialIdx >= 0 ? initialIdx : 0);
      } else {
        setFocusedIndex(-1);
      }
    }, [isOpen, searchable, currentValue, filteredFlatOptions]);

    // Scroll active item into view
    useEffect(() => {
      if (!isOpen || focusedIndex < 0) return;
      const targetOption = listboxRef.current?.querySelector(
        `[data-index="${focusedIndex}"]`,
      );
      if (targetOption) {
        (targetOption as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }, [focusedIndex, isOpen]);

    const handleSelect = useCallback(
      (val: string) => {
        if (!isControlled) {
          setInternalValue(val);
        }
        onChange?.(val);
        setIsOpen(false);
        setSearchQuery('');
        triggerRef.current?.focus();
      },
      [isControlled, onChange],
    );

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleSelect('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (!isOpen) {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      const enabledOptions = filteredFlatOptions.filter((o) => !o.disabled);
      if (enabledOptions.length === 0) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          setFocusedIndex((prev) => {
            let next = prev + 1;
            while (
              next < filteredFlatOptions.length &&
              filteredFlatOptions[next]?.disabled
            ) {
              next++;
            }
            return next < filteredFlatOptions.length ? next : prev;
          });
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setFocusedIndex((prev) => {
            let next = prev - 1;
            while (next >= 0 && filteredFlatOptions[next]?.disabled) {
              next--;
            }
            return next >= 0 ? next : prev;
          });
          break;
        }
        case 'Home': {
          e.preventDefault();
          const first = filteredFlatOptions.findIndex((o) => !o.disabled);
          if (first >= 0) setFocusedIndex(first);
          break;
        }
        case 'End': {
          e.preventDefault();
          for (let i = filteredFlatOptions.length - 1; i >= 0; i--) {
            if (!filteredFlatOptions[i].disabled) {
              setFocusedIndex(i);
              break;
            }
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (
            focusedIndex >= 0 &&
            focusedIndex < filteredFlatOptions.length &&
            !filteredFlatOptions[focusedIndex]?.disabled
          ) {
            handleSelect(filteredFlatOptions[focusedIndex].value);
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          triggerRef.current?.focus();
          break;
        }
        case 'Tab': {
          setIsOpen(false);
          setSearchQuery('');
          break;
        }
      }
    };

    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;
    const currentSize = sizeStyles[size];

    return (
      <div
        ref={containerRef}
        className={cn('relative w-full flex flex-col gap-1.5', className)}
        onKeyDown={handleKeyDown}
      >
        {label && (
          <label
            id={labelId}
            htmlFor={selectId}
            className="flex items-center gap-1 text-[var(--text-xs)] font-medium text-[var(--color-text-secondary)] select-none"
          >
            {label}
            {required && (
              <span className="text-[var(--color-error)]" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <button
          ref={(node) => {
            triggerRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          id={selectId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={label ? `${labelId} ${selectId}` : undefined}
          aria-controls={isOpen ? listboxId : undefined}
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={
            hasError ? errorId : helperText ? helperId : undefined
          }
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            'w-full flex items-center justify-between text-left font-normal select-none cursor-pointer',
            'bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]',
            'hover:border-[var(--color-text-quaternary)]',
            'focus:outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--color-accent-subtle)]',
            'transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[var(--color-border-primary)]',
            hasError &&
              'border-[var(--color-border-error)] focus:border-[var(--color-border-error)] focus:ring-[var(--color-error-subtle)]',
            currentSize.trigger,
            triggerClassName,
          )}
        >
          <span className="flex items-center gap-2 truncate flex-1 min-w-0">
            {selectedOption?.icon && (
              <span className="shrink-0 text-[var(--color-text-tertiary)]">
                {selectedOption.icon}
              </span>
            )}
            <span
              className={cn(
                'truncate',
                selectedOption
                  ? 'text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-quaternary)]',
              )}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </span>

          <span className="flex items-center gap-1 shrink-0 ml-1.5 text-[var(--color-text-tertiary)]">
            {clearable && selectedOption && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Clear selection"
                onClick={handleClear}
                className="p-0.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X className={currentSize.icon} />
              </span>
            )}
            <ChevronDown
              className={cn(
                'transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                isOpen && 'rotate-180',
                currentSize.icon,
              )}
            />
          </span>
        </button>

        {isOpen && (
          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={label ? labelId : undefined}
            className={cn(
              'absolute top-[calc(100%+4px)] left-0 right-0 z-[var(--z-dropdown)]',
              'bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)]',
              'rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]',
              'p-1 max-h-60 overflow-y-auto animate-slide-down',
              dropdownClassName,
            )}
          >
            {searchable && (
              <div className="p-1 mb-1 border-b border-[var(--color-border-primary)]">
                <div className="relative flex items-center">
                  <Search
                    className={cn(
                      'absolute left-2 text-[var(--color-text-quaternary)] pointer-events-none',
                      currentSize.icon,
                    )}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setFocusedIndex(0);
                    }}
                    placeholder={searchPlaceholder}
                    className={cn(
                      'w-full bg-[var(--color-bg-tertiary)] rounded-[var(--radius-sm)] pl-7 pr-2 font-normal',
                      'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-quaternary)]',
                      'focus:outline-none focus:ring-1 focus:ring-[var(--color-border-focus)]',
                      currentSize.search,
                    )}
                  />
                </div>
              </div>
            )}

            {filteredFlatOptions.length === 0 ? (
              <div className="py-4 px-3 text-center text-[var(--text-xs)] text-[var(--color-text-tertiary)]">
                No results found
              </div>
            ) : filteredGroups ? (
              filteredGroups.map((group) => (
                <div key={group.label} className="py-1">
                  <div className="px-2 py-1 text-[var(--text-xs)] font-semibold text-[var(--color-text-quaternary)] uppercase tracking-wider">
                    {group.label}
                  </div>
                  {group.options.map((opt) => {
                    const globalIdx = filteredFlatOptions.findIndex(
                      (o) => o.value === opt.value,
                    );
                    const isSelected = opt.value === currentValue;
                    const isFocused = globalIdx === focusedIndex;
                    return (
                      <div
                        key={opt.value}
                        data-index={globalIdx}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={opt.disabled}
                        onClick={() => {
                          if (!opt.disabled) handleSelect(opt.value);
                        }}
                        onMouseEnter={() => {
                          if (!opt.disabled) setFocusedIndex(globalIdx);
                        }}
                        className={cn(
                          'flex items-center justify-between rounded-[var(--radius-md)] cursor-pointer select-none transition-colors',
                          currentSize.item,
                          isSelected &&
                            'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-medium',
                          isFocused &&
                            !isSelected &&
                            'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]',
                          !isSelected &&
                            !isFocused &&
                            'text-[var(--color-text-primary)]',
                          opt.disabled &&
                            'opacity-40 cursor-not-allowed pointer-events-none',
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {opt.icon && (
                            <span className="shrink-0">{opt.icon}</span>
                          )}
                          <div className="flex flex-col truncate">
                            <span className="truncate">{opt.label}</span>
                            {opt.description && (
                              <span className="text-[var(--text-xs)] text-[var(--color-text-tertiary)] truncate">
                                {opt.description}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <Check
                            className={cn(
                              'text-[var(--color-accent)] shrink-0 ml-2',
                              currentSize.icon,
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            ) : (
              filteredFlatOptions.map((opt, idx) => {
                const isSelected = opt.value === currentValue;
                const isFocused = idx === focusedIndex;
                return (
                  <div
                    key={opt.value}
                    data-index={idx}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) handleSelect(opt.value);
                    }}
                    onMouseEnter={() => {
                      if (!opt.disabled) setFocusedIndex(idx);
                    }}
                    className={cn(
                      'flex items-center justify-between rounded-[var(--radius-md)] cursor-pointer select-none transition-colors',
                      currentSize.item,
                      isSelected &&
                        'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-medium',
                      isFocused &&
                        !isSelected &&
                        'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]',
                      !isSelected &&
                        !isFocused &&
                        'text-[var(--color-text-primary)]',
                      opt.disabled &&
                        'opacity-40 cursor-not-allowed pointer-events-none',
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="flex flex-col truncate">
                        <span className="truncate">{opt.label}</span>
                        {opt.description && (
                          <span className="text-[var(--text-xs)] text-[var(--color-text-tertiary)] truncate">
                            {opt.description}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check
                        className={cn(
                          'text-[var(--color-accent)] shrink-0 ml-2',
                          currentSize.icon,
                        )}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {errorMessage ? (
          <p
            id={errorId}
            className="text-[var(--text-xs)] font-medium text-[var(--color-error)] animate-slide-down flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {errorMessage}
          </p>
        ) : helperText ? (
          <p
            id={helperId}
            className="text-[var(--text-xs)] text-[var(--color-text-tertiary)]"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Select.displayName = 'Select';
