import React, { useMemo, useRef, useState } from 'react';
import { Tag, X, ChevronDown, Search } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { normalizeLabels } from '../services/labels';

export interface LabelOption {
  label: string;
  count: number;
}

/** Read-only chips shown on list rows. Clicking a chip (when `onPick` is given) filters by it. */
export const LabelChips: React.FC<{
  labels: readonly string[];
  onPick?: (label: string) => void;
  max?: number;
}> = ({ labels, onPick, max = 6 }) => {
  if (labels.length === 0) return null;
  const shown = labels.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((label) => {
        const cls =
          'px-1.5 py-0.5 rounded bg-stone-800 text-[10px] text-stone-400 inline-flex items-center gap-1';
        return onPick ? (
          <button
            key={label}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPick(label);
            }}
            className={`${cls} hover:bg-stone-700 hover:text-amber-300 cursor-pointer`}
          >
            {label}
          </button>
        ) : (
          <span key={label} className={cls}>
            {label}
          </span>
        );
      })}
      {labels.length > max && (
        <span className="px-1 py-0.5 text-[10px] text-stone-500">+{labels.length - max}</span>
      )}
    </div>
  );
};

/** Chip input with autocomplete from labels already used by any entity. */
export const LabelEditor: React.FC<{
  value: readonly string[];
  onChange: (labels: string[]) => void;
  suggestions: readonly LabelOption[];
}> = ({ value, onChange, suggestions }) => {
  const { tr } = useLanguage();
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const next = normalizeLabels([...value, ...raw.split(',')]);
    if (next.length !== value.length) onChange(next);
    setDraft('');
  };
  const remove = (label: string) => onChange(value.filter((v) => v !== label));

  const matches = useMemo(() => {
    const q = draft.trim().toLowerCase();
    const own = new Set(value.map((v) => v.toLowerCase()));
    return suggestions
      .filter((s) => !own.has(s.label.toLowerCase()) && (!q || s.label.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [draft, suggestions, value]);

  return (
    <div className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex flex-wrap items-center gap-1 px-2 py-1.5 rounded bg-stone-950 border border-stone-700 focus-within:border-amber-500/60"
      >
        {value.map((label) => (
          <span
            key={label}
            className="pl-2 pr-1 py-0.5 rounded bg-stone-800 text-xs text-stone-200 inline-flex items-center gap-1"
          >
            {label}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(label);
              }}
              title={tr('Remove label', 'Rimuovi etichetta')}
              className="p-0.5 rounded hover:bg-stone-700 text-stone-400 hover:text-red-300 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(',')) add(v);
            else setDraft(v);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            if (draft.trim()) add(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (draft.trim()) add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length > 0) {
              remove(value[value.length - 1]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder={
            value.length === 0
              ? tr('Add a label and press Enter…', 'Aggiungi un’etichetta e premi Invio…')
              : ''
          }
          className="flex-1 min-w-[8rem] bg-transparent text-sm text-stone-100 focus:outline-none"
        />
      </div>
      {open && matches.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 shadow-xl py-1 text-xs">
          {matches.map((m) => (
            <li key={m.label}>
              <button
                type="button"
                // mouseDown fires before the input blur, so the pick is not lost.
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(m.label);
                  inputRef.current?.focus();
                }}
                className="w-full px-3 py-1.5 flex items-center justify-between text-stone-200 hover:bg-stone-800 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-stone-500" /> {m.label}
                </span>
                <span className="text-stone-500">{m.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * Multi-select label filter for list toolbars: a searchable dropdown plus removable chips for the
 * active selection. An entity must carry every selected label to be shown.
 */
export const LabelFilter: React.FC<{
  options: readonly LabelOption[];
  selected: readonly string[];
  onChange: (selected: string[]) => void;
}> = ({ options, selected, onChange }) => {
  const { tr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const isOn = (label: string) => selected.some((s) => s.toLowerCase() === label.toLowerCase());
  const toggle = (label: string) =>
    onChange(
      isOn(label)
        ? selected.filter((s) => s.toLowerCase() !== label.toLowerCase())
        : [...selected, label]
    );

  const q = query.trim().toLowerCase();
  const visible = options.filter((o) => !q || o.label.toLowerCase().includes(q));

  if (options.length === 0 && selected.length === 0) return null;

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 cursor-pointer transition ${
          selected.length > 0
            ? 'bg-amber-600/15 border-amber-500/40 text-amber-300'
            : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-600'
        }`}
      >
        <Tag className="w-3.5 h-3.5" />
        {tr('Labels', 'Etichette')}
        {selected.length > 0 && <span>({selected.length})</span>}
        <ChevronDown className="w-3 h-3" />
      </button>

      {selected.map((label) => (
        <span
          key={label}
          className="pl-2 pr-1 py-0.5 rounded bg-amber-600/20 text-xs text-amber-200 inline-flex items-center gap-1"
        >
          {label}
          <button
            type="button"
            onClick={() => toggle(label)}
            title={tr('Remove filter', 'Rimuovi filtro')}
            className="p-0.5 rounded hover:bg-amber-600/30 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {selected.length > 1 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-stone-500 hover:text-stone-300 cursor-pointer"
        >
          {tr('Clear', 'Pulisci')}
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-40 w-64 rounded-xl border border-stone-700 bg-stone-900 shadow-xl p-2 text-xs">
            <div className="relative mb-1.5">
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr('Search labels…', 'Cerca etichette…')}
                className="w-full pl-7 pr-2 py-1.5 rounded bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none focus:border-stone-600"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto">
              {visible.length === 0 && (
                <li className="px-2 py-2 text-stone-500">
                  {tr('No labels found.', 'Nessuna etichetta trovata.')}
                </li>
              )}
              {visible.map((o) => (
                <li key={o.label}>
                  <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-stone-800 cursor-pointer text-stone-200">
                    <input
                      type="checkbox"
                      checked={isOn(o.label)}
                      onChange={() => toggle(o.label)}
                      className="accent-amber-500"
                    />
                    <span className="flex-1 truncate">{o.label}</span>
                    <span className="text-stone-500">{o.count}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};
