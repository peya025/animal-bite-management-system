import React, { useState, useRef, useEffect, useLayoutEffect, useId, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import '../../../../components/forms/SearchableSelect/SearchableSelect.css';

export interface MultiSelectOption {
  key: string;
  label: string;
}

interface SearchableMultiSelectProps {
  label?: string;
  options: readonly MultiSelectOption[] | MultiSelectOption[];
  selectedKeys: Record<string, boolean>;
  onToggle: (key: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  disabled?: boolean;
  error?: string;
  ariaLabel?: string;
}

interface MenuPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxListHeight: number;
  openAbove: boolean;
}

export function SearchableMultiSelect({
  label,
  options,
  selectedKeys,
  onToggle,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search...',
  noResultsText = 'No results found',
  disabled = false,
  error,
  ariaLabel,
}: SearchableMultiSelectProps) {
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOptions = useMemo(
    () => options.filter((opt) => Boolean(selectedKeys[opt.key])),
    [options, selectedKeys]
  );

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const updateMenuPosition = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const gap = 4;
    const margin = 8;

    const width = Math.min(Math.max(rect.width, 220), viewportW - margin * 2);
    const left = Math.max(margin, Math.min(rect.left, viewportW - width - margin));

    const spaceBelow = viewportH - rect.bottom - gap - margin;
    const spaceAbove = rect.top - gap - margin;
    const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableSpace = openAbove ? spaceAbove : spaceBelow;
    const maxListHeight = Math.max(120, Math.min(240, availableSpace - 58));

    setMenuPos({
      top: openAbove ? undefined : rect.bottom + gap,
      bottom: openAbove ? viewportH - rect.top + gap : undefined,
      left,
      width,
      maxListHeight,
      openAbove,
    });
  }, []);

  const openMenu = useCallback(() => {
    if (disabled) return;
    const muiModalRoot = rootRef.current?.closest<HTMLElement>('.MuiModal-root') ?? null;
    setPortalContainer(muiModalRoot || document.body);
    setSearchQuery('');
    setHighlightedIndex(0);
    updateMenuPosition();
    setIsOpen(true);
  }, [disabled, updateMenuPosition]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
  }, [isOpen, updateMenuPosition, filteredOptions.length, selectedOptions.length]);

  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

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

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    };
    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
    };
  }, [isOpen, closeMenu]);

  useEffect(() => {
    if (!isOpen) return;
    setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [searchQuery, filteredOptions.length, isOpen]);

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    const optionEl = listRef.current?.querySelector<HTMLElement>(
      `#${CSS.escape(`${uid}-opt-${highlightedIndex}`)}`
    );
    optionEl?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen, uid]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      triggerRef.current?.focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev <= 0 ? filteredOptions.length - 1 : prev - 1));
      }
    } else if (event.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        event.preventDefault();
        onToggle(filteredOptions[highlightedIndex].key);
      } else if (!isOpen) {
        event.preventDefault();
        openMenu();
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      {label && (
        <span style={{ fontSize: 13, fontWeight: 600, color: error ? '#dc2626' : 'var(--text-h, #374151)' }}>
          {label}
        </span>
      )}

      <div ref={rootRef} className="ss-root">
        <div
          ref={triggerRef}
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-label={ariaLabel || label}
          aria-invalid={Boolean(error)}
          aria-disabled={disabled}
          className={`ss-trigger ss-trigger--sm${isOpen ? ' ss-trigger--open' : ''}${error ? ' ss-trigger--error' : ''}`}
          style={{
            height: 'auto',
            minHeight: 40,
            padding: '6px 10px',
            background: disabled ? 'var(--bg-secondary, #f1f5f9)' : 'var(--input-bg, #ffffff)',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          onClick={() => {
            if (disabled) return;
            if (isOpen) closeMenu();
            else openMenu();
          }}
          onKeyDown={handleKeyDown}
        >
          <div
            style={{
              flex: '1 1 auto',
              minWidth: 0,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 5,
              alignItems: 'center',
            }}
          >
            {selectedOptions.length === 0 ? (
              <span className="ss-trigger-value ss-trigger-value--placeholder" style={{ fontSize: 13 }}>
                {placeholder}
              </span>
            ) : (
              selectedOptions.map((opt) => (
                <span
                  key={opt.key}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'var(--chip-selected-bg, #ecfdf5)',
                    color: '#065f46',
                    border: '1px solid #a7f3d0',
                    lineHeight: 1.4,
                  }}
                >
                  <span>{opt.label}</span>
                  {!disabled && (
                    <button
                      type="button"
                      aria-label={`Remove ${opt.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggle(opt.key);
                      }}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#047857',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        lineHeight: 1,
                        marginLeft: 1,
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))
            )}
          </div>

          <span className="ss-trigger-actions">
            <svg
              className="ss-trigger-chevron"
              width="16"
              height="16"
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
        </div>

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
            >
              <div className="ss-search-wrap">
                <div className="ss-search-field">
                  <svg
                    className="ss-search-icon"
                    width="15"
                    height="15"
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
                    ref={searchRef}
                    type="text"
                    className="ss-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                  />
                </div>
              </div>

              <div
                ref={listRef}
                id={listboxId}
                role="listbox"
                aria-multiselectable="true"
                aria-label={ariaLabel || label}
                className="ss-list"
                style={{ maxHeight: menuPos.maxListHeight }}
              >
                {filteredOptions.length === 0 ? (
                  <div className="ss-empty" role="status" aria-live="polite">
                    {noResultsText}
                  </div>
                ) : (
                  filteredOptions.map((opt, idx) => {
                    const isSelected = Boolean(selectedKeys[opt.key]);
                    const isHighlighted = idx === highlightedIndex;
                    return (
                      <div
                        key={opt.key}
                        id={`${uid}-opt-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        className={`ss-option${isSelected ? ' ss-option--selected' : ''}${isHighlighted ? ' ss-option--highlighted' : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onClick={() => onToggle(opt.key)}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span
                            aria-hidden="true"
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 4,
                              flexShrink: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: isSelected ? '1.5px solid #10b981' : '1.5px solid #cbd5e1',
                              background: isSelected ? '#10b981' : 'transparent',
                              color: '#ffffff',
                              transition: 'all 0.12s ease',
                            }}
                          >
                            {isSelected && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                          <span className="ss-option-label">{opt.label}</span>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>,
            portalContainer
          )}
      </div>

      {error && (
        <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 500, marginTop: 2, display: 'block' }}>
          {error}
        </span>
      )}
    </div>
  );
}
