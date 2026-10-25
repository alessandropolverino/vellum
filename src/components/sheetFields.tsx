import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { StatblockEntry } from '../types/dnd';
import { useLanguage } from '../i18n/LanguageContext';
import { listHas, toggleListItem } from '../data/sheetOptions';

/** Shared building blocks for the character sheet editor and the creation wizard. */

export const SHEET_TABS = [
  { id: 'identity', en: 'Identity', it: 'Identità' },
  { id: 'abilities', en: 'Abilities & Skills', it: 'Caratteristiche & Abilità' },
  { id: 'combat', en: 'Combat', it: 'Combattimento' },
  { id: 'senses', en: 'Senses & Proficiencies', it: 'Sensi & Competenze' },
  { id: 'features', en: 'Features & Spells', it: 'Capacità & Incantesimi' },
  { id: 'story', en: 'Gear & Story', it: 'Equip. & Storia' },
] as const;

export type SheetTabId = (typeof SHEET_TABS)[number]['id'];

export const cardCls = 'bg-stone-900/80 border border-stone-800 p-5 rounded-2xl space-y-4';
export const cardTitleCls = 'font-header text-sm font-bold text-amber-400';
export const inputCls =
  'w-full min-w-0 px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 outline-none focus:border-amber-500';
export const numCls =
  'w-full min-w-[4.5rem] px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-center outline-none focus:border-amber-500';
export const presetCls =
  'min-w-[8.5rem] px-2.5 py-2 rounded-xl bg-stone-900 border border-amber-500/40 text-amber-300 text-xs shrink-0 cursor-pointer hover:border-amber-400';

export const Field: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({
  label,
  className,
  children,
}) => (
  <div className={`min-w-0 ${className || ''}`}>
    <label className="block text-stone-400 mb-1 font-semibold">{label}</label>
    {children}
  </div>
);

export const ReadOnlyStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <div className="text-stone-400 mb-1 font-semibold">{label}</div>
    <div className="px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-amber-300 font-bold text-center">
      {value}
    </div>
  </div>
);

export const NextButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <div className="flex justify-end pt-2">
    <button
      type="button"
      onClick={onClick}
      className="min-w-[10rem] px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-amber-500/40 text-amber-300 text-xs font-bold transition cursor-pointer"
    >
      {label} →
    </button>
  </div>
);

/** Free text list (comma separated) with one-click preset chips. */
export const ChipField: React.FC<{
  label: string;
  value: string;
  placeholder?: string;
  presets: readonly string[];
  onChange: (value: string) => void;
}> = ({ label, value, placeholder, presets, onChange }) => (
  <Field label={label}>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
    <div className="flex flex-wrap gap-1.5 mt-2">
      {presets.map((p) => {
        const on = listHas(value, p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(toggleListItem(value, p))}
            className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold transition cursor-pointer ${
              on
                ? 'bg-amber-600/25 border-amber-500 text-amber-200'
                : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-600'
            }`}
          >
            {on ? '✓ ' : '+ '}
            {p}
          </button>
        );
      })}
    </div>
  </Field>
);

/** Editable list of name + description rows (traits, actions, legendary entries). */
export const ListEditor: React.FC<{
  title: string;
  addLabel: string;
  nameHint: string;
  descHint: string;
  items: StatblockEntry[];
  onChange: (index: number, patch: Partial<StatblockEntry>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}> = ({ title, addLabel, nameHint, descHint, items, onChange, onAdd, onRemove }) => {
  const { tr } = useLanguage();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={cardTitleCls}>{title}</span>
        <button
          type="button"
          onClick={onAdd}
          className="min-w-[8rem] px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition"
        >
          <Plus className="w-3.5 h-3.5" />
          {addLabel}
        </button>
      </div>
      {items.length === 0 && (
        <p className="text-[11px] text-stone-500 italic">{tr('Nothing here yet.', 'Ancora nessuna voce.')}</p>
      )}
      <div className="space-y-2.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-wrap gap-2 items-start bg-stone-950 p-3 rounded-xl border border-stone-800">
            <input
              type="text"
              value={item.name}
              onChange={(e) => onChange(idx, { name: e.target.value })}
              placeholder={nameHint}
              className="flex-1 min-w-[12rem] sm:max-w-[16rem] px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-amber-200 font-semibold text-xs outline-none focus:border-amber-500"
            />
            <textarea
              rows={2}
              value={item.description}
              onChange={(e) => onChange(idx, { description: e.target.value })}
              placeholder={descHint}
              className="flex-[3] min-w-[14rem] px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-200 text-xs outline-none focus:border-amber-500 resize-y"
            />
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="p-1.5 text-stone-500 hover:text-red-400 transition cursor-pointer shrink-0"
              title={tr('Delete', 'Elimina')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
