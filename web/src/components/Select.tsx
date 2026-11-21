import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { findOption, stepOption, type SearchOption } from './selectOptions.ts';

export interface SelectOption extends SearchOption {
  value: string;
  secondary?: string;
  lang?: string;
}

interface SelectProps {
  id?: string;
  name?: string;
  form?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  renderValue?: ReactNode;
  menuAlign?: 'start' | 'end';
  menuWidth?: 'trigger' | 'content';
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export function Select({ id, name, form, value, onChange, options, disabled = false, className = '', triggerClassName, renderValue, menuAlign = 'start', menuWidth = 'trigger', 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby }: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listId = `${triggerId}-options`;
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const search = useRef({ text: '', at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState<CSSProperties>({ visibility: 'hidden' });
  const selected = options.findIndex((option) => option.value === value);
  const unavailable = disabled || !options.some((option) => !option.disabled);

  function close() {
    setOpen(false);
    search.current.text = '';
  }

  function show(direction: 1 | -1 = 1) {
    if (unavailable) return;
    setActive(selected >= 0 && !options[selected].disabled ? selected : stepOption(options, direction === 1 ? -1 : options.length, direction));
    setPosition({ visibility: 'hidden' });
    setOpen(true);
  }

  function choose(index: number) {
    if (!options[index] || options[index].disabled) return;
    onChange(options[index].value);
    close();
    trigger.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (unavailable) close();
  }, [unavailable]);

  useEffect(() => {
    if (open && (!options[active] || options[active].disabled)) {
      setActive(selected >= 0 && !options[selected].disabled ? selected : stepOption(options, -1, 1));
    }
  }, [open, active, options, selected]);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !menu.current?.contains(target)) close();
    }
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      if (!trigger.current || !menu.current) return;
      const rect = trigger.current.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 8;
      const above = rect.top - 8;
      const desired = Math.min(menu.current.scrollHeight + 2, 320);
      const upward = below < desired && above > below;
      const height = Math.max(0, Math.min(desired, upward ? above : below));
      const width = Math.min(menuWidth === 'trigger' ? rect.width : Math.max(rect.width, menu.current.getBoundingClientRect().width), window.innerWidth - 16);
      const left = Math.max(8, Math.min(menuAlign === 'end' ? rect.right - width : rect.left, window.innerWidth - width - 8));
      setPosition({ left, top: upward ? rect.top - height - 8 : rect.bottom + 8, width, maxHeight: height });
    }
    place();
    const observer = new ResizeObserver(place);
    if (menu.current) observer.observe(menu.current);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, options, menuAlign, menuWidth]);

  useLayoutEffect(() => {
    if (!open || active < 0) return;
    const list = menu.current;
    const option = list?.children[active] as HTMLElement | undefined;
    if (!list || !option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [open, active, position.maxHeight]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (unavailable) return;
    if (event.key === 'Tab') {
      if (open && options[active] && !options[active].disabled) onChange(options[active].value);
      close();
      return;
    }
    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        close();
        trigger.current?.focus({ preventScroll: true });
      }
      return;
    }
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Enter' || event.key === ' ') {
        if (open) choose(active);
        else show();
      } else if (event.key === 'Home' || event.key === 'End') {
        if (!open) show();
        setActive(stepOption(options, event.key === 'Home' ? -1 : options.length, event.key === 'Home' ? 1 : -1));
      } else if (!open) show(event.key === 'ArrowDown' ? 1 : -1);
      else setActive((index) => stepOption(options, index, event.key === 'ArrowDown' ? 1 : -1));
      search.current.text = '';
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      const now = Date.now();
      const text = (now - search.current.at < 700 ? search.current.text : '') + event.key;
      search.current = { text, at: now };
      const repeated = [...text].every((char) => char === event.key);
      const current = open ? active : selected;
      const match = findOption(options, repeated ? event.key : text, repeated ? current + 1 : Math.max(0, current));
      if (!open) show();
      if (match >= 0) setActive(match);
    }
  }

  return (
    <div className={`${menuWidth === 'content' ? 'inline-grid' : 'grid'} min-w-0 ${className}`}>
      {menuWidth === 'trigger' && (
        <span aria-hidden="true" className="invisible pointer-events-none col-start-1 row-start-1 h-0 overflow-hidden whitespace-nowrap px-9 font-sans text-body font-semibold">
          {options.map((option) => <span key={option.value} lang={option.lang} className="block">{option.label}</span>)}
        </span>
      )}
      <button
        ref={trigger}
        id={triggerId}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-describedby={renderValue ? `${triggerId}-value` : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        disabled={unavailable}
        onClick={() => open ? close() : show()}
        onKeyDown={onKeyDown}
        onBlur={() => close()}
        className={`col-start-1 row-start-1 flex min-h-11 w-full min-w-0 items-center gap-2 text-start font-sans disabled:cursor-not-allowed disabled:opacity-60 ${triggerClassName ?? 'rounded-control border border-field-border bg-kasavu px-3 text-ink'}`}
      >
        {renderValue ?? <span lang={options[selected]?.lang} className="min-w-0 flex-1 break-words">{options[selected]?.label}</span>}
        {renderValue && <span id={`${triggerId}-value`} lang={options[selected]?.lang} className="sr-only">{options[selected]?.label}</span>}
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true" className="ms-auto size-4 shrink-0 opacity-70"><path d="m4 6 4 4 4-4" /></svg>
      </button>
      {name && <input type="hidden" name={name} form={form} value={value} disabled={unavailable} />}
      {open && createPortal(
        <ul
          ref={menu}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby ?? (ariaLabel ? undefined : triggerId)}
          onMouseDown={(event) => event.preventDefault()}
          className="surface-light fixed z-[100] max-h-80 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-card border border-line bg-kasavu p-1.5 font-sans text-body font-normal text-ink shadow-raised"
          style={{ width: menuWidth === 'content' ? 'max-content' : undefined, ...position }}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === selected}
              aria-disabled={option.disabled || undefined}
              lang={option.lang}
              onPointerMove={() => !option.disabled && setActive(index)}
              onClick={() => choose(index)}
              className={`flex min-h-11 items-center gap-3 rounded-control px-3 py-2 ${menuWidth === 'content' ? 'whitespace-nowrap' : ''} ${option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${index === active ? 'bg-line/50 ring-2 ring-inset ring-focus' : index === selected ? 'bg-gold/15 text-gold-ink' : ''}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block break-words font-semibold">{option.label}</span>
                {option.secondary && <span className="mt-0.5 block break-words text-caption font-normal text-ink-muted">{option.secondary}</span>}
              </span>
              <span className="size-4 shrink-0" aria-hidden="true">{index === selected && <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="m3 8 3 3 7-7" /></svg>}</span>
            </li>
          ))}
        </ul>, document.body,
      )}
    </div>
  );
}
