import React from 'react';
import { Minus, Moon, Plus, Sun } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import type { CharacterEntity, PcRuntimeStatus } from '../types/dnd';
import {
  changeResource,
  changeSlots,
  hasMagic,
  resourceStates,
  rest,
  slotStates,
} from '../services/spellResources';

interface PcResourcesPanelProps {
  pc: CharacterEntity;
  status: PcRuntimeStatus | undefined;
  onChange: (patch: Partial<PcRuntimeStatus>) => void;
}

/** Spell slots and class resources of one player character in a play instance. */
export const PcResourcesPanel: React.FC<PcResourcesPanelProps> = ({ pc, status, onChange }) => {
  const { tr } = useLanguage();
  if (!hasMagic(pc)) return null;

  const slots = slotStates(pc, status);
  const resources = resourceStates(pc, status);

  // One slot per tap: a filled pip is spent, a hollow one is recovered.
  const toggleSlot = (level: number, available: number, index: number) => {
    onChange({ slotsUsed: changeSlots(pc, status, level, index < available ? 1 : -1) });
  };

  const doRest = (kind: 'short' | 'long') => onChange(rest(pc, status, kind));

  return (
    <div className="space-y-1.5 pt-1.5 border-t border-stone-900">
      {slots.map((s) => (
        <div key={s.level} className="flex items-center gap-2">
          <span className="w-7 text-[10px] font-bold text-stone-500">L{s.level}</span>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: s.max }, (_, i) => (
              <button
                key={i}
                onClick={() => toggleSlot(s.level, s.max - s.used, i)}
                aria-label={tr(`Level ${s.level} slot ${i + 1}`, `Slot di livello ${s.level} n. ${i + 1}`)}
                aria-pressed={i < s.max - s.used}
                className={`w-4 h-4 rounded-full border transition ${
                  i < s.max - s.used
                    ? 'bg-sky-500 border-sky-300'
                    : 'bg-stone-900 border-stone-600 hover:border-stone-400'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] text-stone-500 tabular-nums">
            {s.max - s.used}/{s.max}
          </span>
        </div>
      ))}

      {resources.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-stone-300 truncate">
            {r.name}
            <span className="ml-1 text-[9px] text-stone-500 uppercase">
              {r.recharge === 'short' ? tr('short', 'breve') : r.recharge === 'long' ? tr('long', 'lungo') : ''}
            </span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onChange({ resourcesUsed: changeResource(pc, status, r.id, 1) })}
              aria-label={tr(`Spend ${r.name}`, `Usa ${r.name}`)}
              className="p-0.5 rounded bg-stone-900 hover:bg-stone-800 text-stone-300"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-10 text-center text-[11px] font-bold text-violet-300 tabular-nums">
              {r.max - r.used}/{r.max}
            </span>
            <button
              onClick={() => onChange({ resourcesUsed: changeResource(pc, status, r.id, -1) })}
              aria-label={tr(`Recover ${r.name}`, `Recupera ${r.name}`)}
              className="p-0.5 rounded bg-stone-900 hover:bg-stone-800 text-stone-300"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-1.5 pt-0.5">
        <button
          onClick={() => doRest('short')}
          title={tr('Restores short-rest resources', 'Ripristina le risorse a riposo breve')}
          className="px-2 py-0.5 rounded bg-stone-900 hover:bg-stone-800 text-[10px] text-stone-300 flex items-center gap-1"
        >
          <Sun className="w-3 h-3" /> {tr('Short rest', 'Riposo breve')}
        </button>
        <button
          onClick={() => doRest('long')}
          title={tr(
            'Restores all slots and resources (hit points are not changed)',
            'Ripristina tutti gli slot e le risorse (i punti ferita non cambiano)'
          )}
          className="px-2 py-0.5 rounded bg-stone-900 hover:bg-stone-800 text-[10px] text-stone-300 flex items-center gap-1"
        >
          <Moon className="w-3 h-3" /> {tr('Long rest', 'Riposo lungo')}
        </button>
      </div>
    </div>
  );
};
