import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Tag } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { collectLabels } from '../services/labels';
import { MentionItem, MentionKind, filterMentionItems } from '../services/mentions';
import { LabelFilter, LabelOption } from './Labels';

export const MENTION_KIND_NAME: Record<MentionKind, [string, string]> = {
  npc: ['NPC / monster badge', 'Badge PNG / mostro'],
  statblock: ['Full statblock', 'Statblock completo'],
  sfx: ['Sound button', 'Pulsante suono'],
  asset: ['Asset image', 'Immagine asset'],
  encounter: ['Encounter', 'Incontro'],
};

const Row: React.FC<{
  item: MentionItem;
  active?: boolean;
  onPick: (item: MentionItem) => void;
  extra?: React.ReactNode;
  /** Keep focus in the text editor when picking from the caret popup. */
  keepFocus?: boolean;
}> = ({ item, active, onPick, extra, keepFocus }) => (
  <div
    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer ${
      active ? 'bg-stone-700/80' : 'hover:bg-stone-800'
    }`}
    onMouseDown={keepFocus ? (e) => e.preventDefault() : undefined}
    onClick={() => onPick(item)}
    ref={(el) => {
      if (active && el) el.scrollIntoView({ block: 'nearest' });
    }}
  >
    <div className="min-w-0 flex-1">
      <div className="truncate text-stone-100">{item.name}</div>
      <div className="truncate text-[10px] text-stone-500">
        {item.detail}
        {item.tags.length > 0 && ` · ${item.tags.slice(0, 3).join(', ')}`}
      </div>
    </div>
    {extra && (
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {extra}
      </div>
    )}
  </div>
);

/** Floating list shown while the caret is inside `@type[...]`; the typed text is the search. */
export const MentionPopup: React.FC<{
  kind: MentionKind;
  items: readonly MentionItem[];
  query: string;
  activeIndex: number;
  labels: string[];
  onToggleLabel: (label: string) => void;
  onPick: (item: MentionItem) => void;
}> = ({ kind, items, query, activeIndex, labels, onToggleLabel, onPick }) => {
  const { tr } = useLanguage();
  const labelOptions = useMemo(() => collectLabels(items).slice(0, 12), [items]);
  const shown = useMemo(() => filterMentionItems(items, query, labels), [items, query, labels]);
  return (
    <div
      className="absolute left-3 right-3 bottom-3 z-20 rounded-xl border border-amber-500/40 bg-stone-900 shadow-2xl text-xs"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-stone-800 text-stone-400">
        <Search className="w-3.5 h-3.5" />
        <span className="text-amber-300 font-semibold">{tr(...MENTION_KIND_NAME[kind])}</span>
        <span className="text-stone-500">
          {query ? `“${query}”` : tr('type to search', 'scrivi per cercare')} · {shown.length}
        </span>
        <span className="ml-auto text-stone-600">↑↓ Enter · Esc</span>
      </div>
      {labelOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 border-b border-stone-800">
          <Tag className="w-3 h-3 text-stone-500" />
          {labelOptions.map((o) => {
            const on = labels.some((l) => l.toLowerCase() === o.label.toLowerCase());
            return (
              <button
                key={o.label}
                type="button"
                onClick={() => onToggleLabel(o.label)}
                className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer ${
                  on ? 'bg-amber-600 text-stone-950 font-semibold' : 'bg-stone-800 text-stone-400 hover:text-amber-300'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
      <div className="max-h-56 overflow-y-auto p-1">
        {shown.length === 0 ? (
          <div className="px-2 py-3 text-stone-500">{tr('Nothing matches.', 'Nessun risultato.')}</div>
        ) : (
          shown.slice(0, 100).map((it, i) => (
            <Row key={it.id} item={it} active={i === activeIndex} onPick={onPick} keepFocus />
          ))
        )}
      </div>
    </div>
  );
};

/** Searchable list (text + labels) used in the expanded resource dock. */
export const MentionBrowser: React.FC<{
  items: readonly MentionItem[];
  labelOptions: LabelOption[];
  onPick: (item: MentionItem) => void;
  rowExtra?: (item: MentionItem) => React.ReactNode;
  toolbarExtra?: React.ReactNode;
  emptyText?: string;
}> = ({ items, labelOptions, onPick, rowExtra, toolbarExtra, emptyText }) => {
  const { tr } = useLanguage();
  const [query, setQuery] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const shown = useMemo(() => filterMentionItems(items, query, labels), [items, query, labels]);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => setLabels((l) => l.filter((x) => labelOptions.some((o) => o.label.toLowerCase() === x.toLowerCase()))), [labelOptions]);
  return (
    <div className="flex flex-col min-h-0 h-full gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[10rem]">
          <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr('Search by name…', 'Cerca per nome…')}
            className="w-full pl-7 pr-2 py-1.5 rounded bg-stone-950 border border-stone-800 text-stone-200 focus:outline-none focus:border-stone-600"
          />
        </div>
        <LabelFilter options={labelOptions} selected={labels} onChange={setLabels} />
        {toolbarExtra}
        <span className="text-[11px] text-stone-500 ml-auto">
          {shown.length}/{items.length}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-2 content-start">
        {shown.length === 0 ? (
          <div className="px-2 py-3 text-stone-500 col-span-full">
            {emptyText ?? tr('Nothing matches.', 'Nessun risultato.')}
          </div>
        ) : (
          shown.map((it) => <Row key={it.id} item={it} onPick={onPick} extra={rowExtra?.(it)} />)
        )}
      </div>
    </div>
  );
};
