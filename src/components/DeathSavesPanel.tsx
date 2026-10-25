import React, { useState } from 'react';
import { Dices, HeartPulse, Skull } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import type { DeathSaves } from '../types/dnd';
import { EMPTY_DEATH_SAVES, type DeathState } from '../services/deathSaves';

interface DeathSavesPanelProps {
  state: Exclude<DeathState, 'conscious'>;
  saves: DeathSaves | undefined;
  /** It is this character's turn: a save is due. */
  isTurn: boolean;
  /** A d20 result (typed or rolled); the rules decide what it does. */
  onRoll: (roll: number) => void;
  /** Direct edits: pips and the stabilize button. */
  onChange: (saves: DeathSaves) => void;
}

const MAX = 3;

const Pips: React.FC<{
  label: string;
  count: number;
  tone: 'ok' | 'bad';
  onSet: (n: number) => void;
}> = ({ label, count, tone, onSet }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-[11px] text-stone-400 w-16">{label}</span>
    {Array.from({ length: MAX }, (_, i) => {
      const filled = i < count;
      return (
        <button
          key={i}
          onClick={() => onSet(filled && i === count - 1 ? i : i + 1)}
          aria-label={`${label} ${i + 1}`}
          aria-pressed={filled}
          className={`w-5 h-5 rounded-full border transition ${
            filled
              ? tone === 'ok'
                ? 'bg-emerald-500 border-emerald-400'
                : 'bg-red-600 border-red-400'
              : 'bg-stone-900 border-stone-600 hover:border-stone-400'
          }`}
        />
      );
    })}
  </div>
);

export const DeathSavesPanel: React.FC<DeathSavesPanelProps> = ({
  state,
  saves,
  isTurn,
  onRoll,
  onChange,
}) => {
  const { tr } = useLanguage();
  const [typed, setTyped] = useState('');
  const [last, setLast] = useState<number | null>(null);
  const s = saves ?? EMPTY_DEATH_SAVES;

  const submit = (roll: number) => {
    setLast(roll);
    setTyped('');
    onRoll(roll);
  };

  const submitTyped = () => {
    const n = parseInt(typed, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 20) submit(n);
  };

  const tone =
    state === 'dead'
      ? 'bg-red-950/60 border-red-800 text-red-200'
      : state === 'stable'
        ? 'bg-sky-950/50 border-sky-800 text-sky-200'
        : 'bg-amber-950/40 border-amber-700/60 text-amber-200';

  return (
    <div className={`mt-2 rounded-lg border p-2.5 space-y-2 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold">
          {state === 'dead' ? <Skull className="w-4 h-4" /> : <HeartPulse className="w-4 h-4" />}
          {state === 'dead'
            ? tr('Dead', 'Morto')
            : state === 'stable'
              ? tr('Stable at 0 HP', 'Stabile a 0 PF')
              : tr('Dying — death saves', 'Morente — tiri salvezza contro morte')}
        </span>
        {state === 'dying' && isTurn && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 text-[10px] font-extrabold uppercase">
            {tr('Save due now', 'Tiro dovuto ora')}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
        <Pips
          label={tr('Successes', 'Successi')}
          count={s.successes}
          tone="ok"
          onSet={(n) => onChange({ ...s, successes: n, stable: n >= MAX ? true : undefined })}
        />
        <Pips
          label={tr('Failures', 'Fallimenti')}
          count={s.failures}
          tone="bad"
          onSet={(n) => onChange({ ...s, failures: n })}
        />
      </div>

      {state === 'dying' && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={typed}
            onChange={(e) => /^\d{0,2}$/.test(e.target.value) && setTyped(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
            placeholder="d20"
            aria-label={tr('Death save result', 'Risultato del tiro contro morte')}
            className="w-14 text-center bg-stone-900 border border-stone-700 rounded-md px-2 py-1 text-xs text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={submitTyped}
            disabled={!typed}
            className="px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs disabled:opacity-40"
          >
            {tr('Apply', 'Applica')}
          </button>
          <button
            onClick={() => submit(Math.floor(Math.random() * 20) + 1)}
            title={tr('Roll a d20 for them', 'Tira un d20 per loro')}
            className="px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs flex items-center gap-1"
          >
            <Dices className="w-4 h-4" />
            {tr('Roll', 'Tira')}
          </button>
          <button
            onClick={() => onChange({ ...s, stable: true })}
            className="px-2 py-1 rounded-md bg-sky-900/70 hover:bg-sky-800 text-sky-100 text-xs"
          >
            {tr('Stabilize', 'Stabilizza')}
          </button>
          {last !== null && (
            <span className="text-[11px] text-stone-400">
              {tr('Last roll', 'Ultimo tiro')}: <b className="text-stone-200">{last}</b>
            </span>
          )}
        </div>
      )}

      {state === 'dead' && (
        <p className="text-[11px] text-red-300/80">
          {tr(
            'Healing brings them back to consciousness and clears the tally.',
            'Una cura li riporta coscienti e azzera il conteggio.'
          )}
        </p>
      )}
    </div>
  );
};
