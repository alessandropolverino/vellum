import React, { useMemo, useState } from 'react';
import { Dices, Swords, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import type { EntityKind } from '../types/dnd';

export interface InitiativeRow {
  id: string;
  name: string;
  kind: EntityKind;
  /** Initiative modifier added to the d20 by the roll button. */
  bonus: number;
}

interface InitiativeModalProps {
  title: string;
  /** Label of the confirm button (defaults to starting the combat). */
  confirmLabel?: string;
  rows: InitiativeRow[];
  /** Resolves every row to a number; rows left empty are rolled automatically. */
  onConfirm: (initiatives: Record<string, number>) => void;
  onCancel: () => void;
}

const rollD20 = (bonus: number) => Math.floor(Math.random() * 20) + 1 + bonus;

const formatBonus = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** Accepts "", "-", "12", "-3"; anything else is ignored while typing. */
const isPartialInt = (s: string) => /^-?\d{0,3}$/.test(s);

export const InitiativeModal: React.FC<InitiativeModalProps> = ({
  title,
  confirmLabel,
  rows,
  onConfirm,
  onCancel,
}) => {
  const { tr } = useLanguage();
  const [values, setValues] = useState<Record<string, string>>({});

  const setValue = (id: string, v: string) => {
    if (isPartialInt(v)) setValues((prev) => ({ ...prev, [id]: v }));
  };

  const emptyCount = useMemo(
    () => rows.filter((r) => !/^-?\d+$/.test(values[r.id] ?? '')).length,
    [rows, values]
  );

  const rollEmpty = () => {
    setValues((prev) => {
      const next = { ...prev };
      for (const r of rows) {
        if (!/^-?\d+$/.test(next[r.id] ?? '')) next[r.id] = String(rollD20(r.bonus));
      }
      return next;
    });
  };

  const confirm = () => {
    const out: Record<string, number> = {};
    for (const r of rows) {
      const raw = values[r.id] ?? '';
      out[r.id] = /^-?\d+$/.test(raw) ? parseInt(raw, 10) : rollD20(r.bonus);
    }
    onConfirm(out);
  };

  const groups: { label: string; items: InitiativeRow[] }[] = [
    { label: tr('Party', 'Gruppo'), items: rows.filter((r) => r.kind === 'pc') },
    { label: tr('Enemies and NPCs', 'Nemici e PNG'), items: rows.filter((r) => r.kind !== 'pc') },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-stone-900 border border-stone-800">
        <div className="flex items-start justify-between gap-3 p-5 pb-3">
          <div className="min-w-0">
            <h2 className="font-bold text-amber-300 text-lg flex items-center gap-2">
              <Swords className="w-5 h-5 shrink-0" />
              {tr('Roll initiative', 'Tira iniziativa')}
            </h2>
            <p className="text-xs text-stone-400 truncate">{title}</p>
          </div>
          <button
            onClick={onCancel}
            aria-label={tr('Cancel', 'Annulla')}
            className="p-1 rounded hover:bg-stone-800 text-stone-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 overflow-y-auto space-y-4 pb-3">
          <p className="text-xs text-stone-400">
            {tr(
              'Type the result of each roll, or tap the dice to roll a d20 plus the modifier. Empty fields are rolled for you.',
              'Scrivi il risultato di ogni tiro, oppure tocca i dadi per tirare un d20 più il modificatore. I campi vuoti vengono tirati in automatico.'
            )}
          </p>
          {groups.map((g) => (
            <div key={g.label} className="space-y-1.5">
              <div className="text-xs font-semibold text-stone-400">{g.label}</div>
              {g.items.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 rounded-lg bg-stone-950 border border-stone-800 px-2.5 py-1.5"
                >
                  <span className="flex-1 min-w-0 truncate text-sm text-stone-100">{r.name}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={values[r.id] ?? ''}
                    onChange={(e) => setValue(r.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirm();
                    }}
                    placeholder={tr('auto', 'auto')}
                    aria-label={tr(`Initiative for ${r.name}`, `Iniziativa di ${r.name}`)}
                    className="w-16 text-center bg-stone-900 border border-stone-700 rounded-md px-2 py-1 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => setValue(r.id, String(rollD20(r.bonus)))}
                    title={tr(`Roll d20 ${formatBonus(r.bonus)}`, `Tira d20 ${formatBonus(r.bonus)}`)}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs"
                  >
                    <Dices className="w-4 h-4" />
                    <span className="tabular-nums">{formatBonus(r.bonus)}</span>
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 p-5 pt-3 border-t border-stone-800">
          <button
            onClick={rollEmpty}
            disabled={emptyCount === 0}
            className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 disabled:opacity-40"
          >
            <Dices className="w-4 h-4" />
            {tr('Roll the empty ones', 'Tira i vuoti')}
          </button>
          <button
            onClick={confirm}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-sm font-bold"
          >
            {confirmLabel ?? tr('Start combat', 'Inizia combattimento')}
          </button>
        </div>
      </div>
    </div>
  );
};
