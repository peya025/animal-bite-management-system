import React, { useState, useRef, useEffect, useLayoutEffect, useId, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './SearchableSelect.css';

export interface SearchableSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  id?: string;
  name?: string;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  size?: 'default' | 'sm' | 'compact';
  fullWidth?: boolean;
  menuMinWidth?: number;
  'aria-invalid'?: boolean | 'true' | 'false';
  'aria-required'?: boolean | 'true' | 'false';
  'aria-describedby'?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

/**
 * Helper to adapt SearchableSelect's `onChange(value)` to legacy handlers
 * expecting a native `React.ChangeEvent<HTMLSelectElement>`.
 */
export function createSelectChangeEvent(
  name: string,
  value: string
): React.ChangeEvent<HTMLSelectElement> {
  return {
    target: { name, value },
    currentTarget: { name, value },
  } as React.ChangeEvent<HTMLSelectElement>;
}

interface MenuPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxListHeight: number;
  openAbove: boolean;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const raw = Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    (el) =>
      el.tabIndex >= 0 &&
      !el.closest('[data-combobox-menu]') &&
      el.getClientRects().length > 0
  );

  // Match native Tab behavior for radio groups: only the checked radio (or first if none checked) is a Tab stop.
  return raw.filter((el) => {
    if (!(el instanceof HTMLInputElement) || el.type !== 'radio' || !el.name) return true;
    const group = raw.filter(
      (item): item is HTMLInputElement =>
        item instanceof HTMLInputElement && item.type === 'radio' && item.name === el.name
    );
    const active = group.find((r) => r.checked) || group[0];
    return el === active;
  });
}

function findNextEnabledIndex(
  list: SearchableSelectOption[],
  startIndex: number,
  step: 1 | -1
): number {
  const len = list.length;
  if (len === 0) return -1;
  for (let i = 1; i <= len; i++) {
    const next = (startIndex + step * i + len) % len;
    if (!list[next].disabled) return next;
  }
  return -1;
}

export function SearchableSelect({
  id,
  name,
  value,
  options,
  onChange,
  placeholder = '— Select —',
  searchPlaceholder = 'Search...',
  noResultsText = 'No results found',
  disabled = false,
  clearable = false,
  className = '',
  style,
  size = 'default',
  fullWidth,
  menuMinWidth,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  'aria-describedby': ariaDescribedBy,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: SearchableSelectProps) {
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isFullWidth = fullWidth ?? size !== 'compact';

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const isInvalid = ariaInvalid === true || ariaInvalid === 'true';

  const getInitialHighlightIndex = useCallback(
    (list: SearchableSelectOption[], preferSelected: boolean) => {
      if (list.length === 0) return -1;
      if (preferSelected) {
        const selectedIdx = list.findIndex((o) => o.value === value && !o.disabled);
        if (selectedIdx >= 0) return selectedIdx;
      }
      return list.findIndex((o) => !o.disabled);
    },
    [value]
  );

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const gap = 4;
    const margin = 8;

    const defaultMinWidth = size === 'compact' ? 210 : size === 'sm' ? 220 : rect.width;
    const targetMinWidth = Math.max(rect.width, menuMinWidth ?? defaultMinWidth);
    const width = Math.min(targetMinWidth, viewportW - margin * 2);
    const left = Math.max(margin, Math.min(rect.left, viewportW - width - margin));

    const spaceBelow = viewportH - rect.bottom - gap - margin;
    const spaceAbove = rect.top - gap - margin;
    const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableSpace = openAbove ? spaceAbove : spaceBelow;
    const maxListHeight = Math.max(100, Math.min(224, availableSpace - 58));

    setMenuPos({
      top: openAbove ? undefined : rect.bottom + gap,
      bottom: openAbove ? viewportH - rect.top + gap : undefined,
      left,
      width,
      maxListHeight,
      openAbove,
    });
  }, [size, menuMinWidth]);

  const openMenu = useCallback(
    (initialDirection?: 'first' | 'last') => {
      if (disabled) return;
      setSearchQuery('');
      let initialIdx = getInitialHighlightIndex(options, true);
      if (initialDirection === 'last' && options.length > 0) {
        for (let i = options.length - 1; i >= 0; i--) {
          if (!options[i].disabled) {
            initialIdx = i;
            break;
          }
        }
      } else if (initialDirection === 'first' && initialIdx < 0) {
        initialIdx = options.findIndex((o) => !o.disabled);
      }
      setHighlightedIndex(initialIdx);
      // Portal inside MUI Modal/Dialog root when nested in one so MUI TrapFocus allows typing in the search bar
      const muiModalRoot = triggerRef.current?.closest<HTMLElement>('.MuiModal-root') ?? null;
      setPortalContainer(muiModalRoot || document.body);
      updateMenuPosition();
      setIsOpen(true);
    },
    [disabled, getInitialHighlightIndex, options, updateMenuPosition]
  );

  const closeMenu = useCallback((returnFocus = false) => {
    setIsOpen(false);
    setSearchQuery('');
    if (returnFocus) {
      requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    }
  }, []);

  const selectOption = useCallback(
    (opt: SearchableSelectOption) => {
      if (opt.disabled) return;
      onChange(opt.value);
      setIsOpen(false);
      setSearchQuery('');
      requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    },
    [onChange]
  );

  const moveFocusFromTrigger = useCallback((direction: 1 | -1) => {
    const trigger = triggerRef.current;
    setIsOpen(false);
    setSearchQuery('');
    if (!trigger) return;

    const dialogScope = trigger.closest<HTMLElement>('[role="dialog"]');
    const scope = dialogScope || trigger.closest<HTMLElement>('form') || document.body;
    const focusables = getFocusableElements(scope);
    const currentIndex = focusables.indexOf(trigger);
    if (currentIndex < 0 || focusables.length === 0) return;

    let targetIndex = currentIndex + direction;
    if (dialogScope) {
      targetIndex = (targetIndex + focusables.length) % focusables.length;
    } else {
      targetIndex = Math.max(0, Math.min(focusables.length - 1, targetIndex));
    }
    focusables[targetIndex]?.focus();
  }, []);

  // Close if disabled changes to true while open
  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false);
      setSearchQuery('');
    }
  }, [disabled, isOpen]);

  // Automatically focus the search input whenever the dropdown opens
  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    const input = searchInputRef.current;
    if (input) {
      input.focus({ preventScroll: true });
    }
  }, [isOpen, updateMenuPosition]);

  // Keep menu anchored on viewport resize or ancestor scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = (event: Event) => {
      if (menuRef.current && event.target instanceof Node && menuRef.current.contains(event.target)) {
        return;
      }
      updateMenuPosition();
    };
    const handleResize = () => updateMenuPosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updateMenuPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
      setSearchQuery('');
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
    };
  }, [isOpen]);

  // Update highlighted option when filtered results change
  useEffect(() => {
    if (!isOpen) return;
    const isFiltering = searchQuery.trim().length > 0;
    setHighlightedIndex(getInitialHighlightIndex(filteredOptions, !isFiltering));
  }, [filteredOptions, isOpen, searchQuery, getInitialHighlightIndex]);

  // Keep highlighted option visible within the scrollable list
  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    const listEl = listRef.current;
    if (!listEl) return;
    const optionEl = listEl.querySelector<HTMLElement>(`#${CSS.escape(`${uid}-opt-${highlightedIndex}`)}`);
    optionEl?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen, uid]);

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) openMenu('first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) openMenu('last');
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isOpen) {
        closeMenu(true);
      } else {
        openMenu();
      }
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      setHighlightedIndex((prev) => findNextEnabledIndex(filteredOptions, prev, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      setHighlightedIndex((prev) =>
        findNextEnabledIndex(filteredOptions, prev < 0 ? 0 : prev, -1)
      );
    } else if (event.key === 'Enter') {
      // Always prevent default so Enter never submits the enclosing form
      event.preventDefault();
      event.stopPropagation();
      // IME-safe check (standard isComposing + Safari keyCode 229 fallback)
      if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
        return;
      }
      const active = highlightedIndex >= 0 ? filteredOptions[highlightedIndex] : undefined;
      if (active && !active.disabled) {
        selectOption(active);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      moveFocusFromTrigger(event.shiftKey ? -1 : 1);
    }
  };

  const activeOptionId =
    isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]
      ? `${uid}-opt-${highlightedIndex}`
      : undefined;

  const displayLabel = selectedOption ? selectedOption.label : placeholder;
  const isPlaceholder = !selectedOption;

  const showClear = clearable && !disabled && value !== '';

  return (
    <div
      className={`ss-root${size === 'compact' ? ' ss-root--compact' : ''}${!isFullWidth ? ' ss-root--inline' : ''}`}
    >
      <button
        ref={triggerRef}
        id={id}
        name={name}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-invalid={isInvalid || undefined}
        aria-required={ariaRequired}
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled}
        data-value={value}
        className={`ss-trigger${size === 'sm' ? ' ss-trigger--sm' : ''}${size === 'compact' ? ' ss-trigger--compact' : ''}${isOpen ? ' ss-trigger--open' : ''}${isInvalid ? ' ss-trigger--error' : ''}${className ? ` ${className}` : ''}`}
        style={style}
        onClick={() => {
          if (disabled) return;
          if (isOpen) {
            closeMenu(true);
          } else {
            openMenu();
          }
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={`ss-trigger-value${isPlaceholder ? ' ss-trigger-value--placeholder' : ''}`}>
          {displayLabel}
        </span>
        <span className="ss-trigger-actions">
          {showClear && (
            <span
              role="button"
              tabIndex={-1}
              className="ss-trigger-clear"
              aria-label="Clear selection"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange('');
                closeMenu(true);
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </span>
          )}
          <svg
            className="ss-trigger-chevron"
            width={size === 'compact' ? 14 : 16}
            height={size === 'compact' ? 14 : 16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {isOpen &&
        menuPos &&
        portalContainer &&
        createPortal(
          <div
            ref={menuRef}
            data-combobox-menu="true"
            className={`ss-menu${menuPos.openAbove ? ' ss-menu--above' : ''}`}
            style={{
              top: menuPos.top,
              bottom: menuPos.bottom,
              left: menuPos.left,
              width: menuPos.width,
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                closeMenu(true);
              }
            }}
          >
            <div className="ss-search-wrap">
              <div className="ss-search-field">
                <svg
                  className="ss-search-icon"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="ss-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={searchPlaceholder}
                  aria-label="Filter options"
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-activedescendant={activeOptionId}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="done"
                />
                {searchQuery && (
                  <button
                    type="button"
                    tabIndex={-1}
                    className="ss-search-clear"
                    aria-label="Clear search"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel || 'Options'}
              className="ss-list"
              style={{ maxHeight: menuPos.maxListHeight }}
            >
              {filteredOptions.length === 0 ? (
                <div className="ss-empty" role="status" aria-live="polite">
                  {noResultsText}
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <div
                      key={`${opt.value}-${idx}`}
                      id={`${uid}-opt-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={opt.disabled || undefined}
                      data-value={opt.value}
                      className={`ss-option${isSelected ? ' ss-option--selected' : ''}${isHighlighted ? ' ss-option--highlighted' : ''}${opt.disabled ? ' ss-option--disabled' : ''}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => {
                        if (!opt.disabled) setHighlightedIndex(idx);
                      }}
                      onClick={() => {
                        if (!opt.disabled) selectOption(opt);
                      }}
                    >
                      <span className="ss-option-label">{opt.label}</span>
                      {isSelected && (
                        <svg
                          className="ss-option-check"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          portalContainer
        )}
    </div>
  );
}

// Marker so FormField can detect SearchableSelect as a single labeled form control
(SearchableSelect as unknown as { isFormControl?: boolean }).isFormControl = true;

export default SearchableSelect;
