import React, { useEffect, useState } from 'react';
import {
  CharacterEntity,
  EncounterPreset,
  SfxItem,
} from '../types/dnd';
import { soundboardEngine } from '../services/audioEngine';
import { useLanguage } from '../i18n/LanguageContext';
import { StatblockCard } from './StatblockCard';
import {
  Volume2,
  Swords,
  UserCheck,
  Skull,
  BookOpen,
  EyeOff,
  Square,
} from 'lucide-react';

interface HomebreweryRendererProps {
  markdown: string;
  characters: CharacterEntity[];
  sfxCatalog: SfxItem[];
  encounters: EncounterPreset[];
  twoColumns?: boolean;
  hideDmNotes?: boolean;
  onSelectCharacter?: (char: CharacterEntity) => void;
  onStartEncounter?: (encounter: EncounterPreset) => void;
  onLogReadAloud?: (excerpt: string) => void;
}

export const HomebreweryRenderer: React.FC<HomebreweryRendererProps> = ({
  markdown,
  characters,
  sfxCatalog,
  encounters,
  twoColumns = false,
  hideDmNotes = false,
  onSelectCharacter,
  onStartEncounter,
  onLogReadAloud,
}) => {
  const { tr } = useLanguage();
  const [, setAudioTick] = useState(0);

  useEffect(() => {
    return soundboardEngine.subscribe(() => setAudioTick((t) => t + 1));
  }, []);

  const charMap = new Map(characters.map((c) => [c.id, c]));
  const sfxMap = new Map(sfxCatalog.map((s) => [s.id, s]));
  const encMap = new Map(encounters.map((e) => [e.id, e]));

  // Render inline formatting: **bold**, *italic*, `code`, @sfx[id], @npc[id]
  const renderInline = (text: string, keyPrefix: string): React.ReactNode[] => {
    const tokenRegex = /(@sfx\[[^\]]+\]|@npc\[[^\]]+\]|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, idx) => {
      const key = `${keyPrefix}-${idx}`;
      if (!part) return null;

      if (part.startsWith('@sfx[') && part.endsWith(']')) {
        const sfxId = part.slice(5, -1).trim();
        const sfx = sfxMap.get(sfxId);
        if (!sfx) {
          return (
            <span key={key} className="inline-flex items-center px-2 py-0.5 text-xs bg-red-200 text-red-900 rounded">
              [{tr('SFX not found', 'SFX non trovato')}: {sfxId}]
            </span>
          );
        }
        const playing = soundboardEngine.isPlaying(sfx.id);
        return (
          <button
            key={key}
            type="button"
            onClick={() => soundboardEngine.toggle(sfx)}
            className={`inline-flex items-center gap-1.5 mx-1 px-2.5 py-0.5 rounded-full text-xs font-sans font-bold border transition shadow-sm align-middle ${
              playing
                ? 'bg-amber-700 text-white border-amber-900 ring-2 ring-amber-400 animate-pulse'
                : 'bg-[#58180D]/10 text-[#58180D] border-[#58180D]/40 hover:bg-[#58180D] hover:text-amber-100'
            }`}
            title={`${sfx.description} (${sfx.loop ? 'Loop' : 'One-shot'})`}
          >
            {playing ? <Square className="w-3 h-3 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{sfx.name}</span>
            {sfx.loop && <span className="text-[10px] opacity-75 uppercase">[Loop]</span>}
          </button>
        );
      }

      if (part.startsWith('@npc[') && part.endsWith(']')) {
        const charId = part.slice(5, -1).trim();
        const ch = charMap.get(charId);
        if (!ch) {
          return (
            <span key={key} className="inline-flex items-center px-2 py-0.5 text-xs bg-red-200 text-red-900 rounded">
              [{tr('Character not found', 'Personaggio non trovato')}: {charId}]
            </span>
          );
        }
        const isMonster = ch.kind === 'monster';
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectCharacter?.(ch)}
            className={`inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded text-xs font-sans font-bold border transition align-baseline ${
              isMonster
                ? 'bg-red-900/15 text-red-900 border-red-800/40 hover:bg-red-900 hover:text-amber-100'
                : 'bg-amber-900/15 text-[#58180D] border-amber-800/40 hover:bg-[#58180D] hover:text-amber-100'
            }`}
            title={tr(
              `Click to open ${ch.name}'s sheet (${ch.levelOrCr} • AC ${ch.ac} • HP ${ch.hpMax})`,
              `Clicca per aprire la scheda di ${ch.name} (${ch.levelOrCr} • CA ${ch.ac} • PF ${ch.hpMax})`
            )}
          >
            {isMonster ? <Skull className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
            <span className="underline decoration-dotted underline-offset-2">{ch.name}</span>
          </button>
        );
      }

      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={key} className="font-bold text-[#3b0f08]">
            {part.slice(2, -2)}
          </strong>
        );
      }

      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={key} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }

      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={key} className="px-1.5 py-0.5 rounded bg-[#e8d6af] font-mono text-xs text-[#58180D]">
            {part.slice(1, -1)}
          </code>
        );
      }

      return <React.Fragment key={key}>{part}</React.Fragment>;
    });
  };

  // Parse block-level structures
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  let firstParagraphRendered = false;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Custom container blocks: :::read-aloud or :::dm-note
    if (trimmed.startsWith(':::read-aloud') || trimmed.startsWith(':::dm-note')) {
      const isReadAloud = trimmed.startsWith(':::read-aloud');
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(':::')) {
        blockLines.push(lines[i]);
        i++;
      }
      i++; // skip closing :::

      if (!isReadAloud && hideDmNotes) {
        continue;
      }

      const rawText = blockLines.join('\n').trim();

      if (isReadAloud) {
        elements.push(
          <div
            key={`block-${i}`}
            className="my-4 relative bg-[#f6ebd1] border-y-2 border-x border-[#58180D] px-5 py-4 shadow-md rounded-sm"
          >
            {/* Corner ornaments */}
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#58180D] rotate-45" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#58180D] rotate-45" />
            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#58180D] rotate-45" />
            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#58180D] rotate-45" />

            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-[#58180D]/20 font-sans">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#58180D] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                {tr('Read-Aloud Text for Players', 'Testo da Leggere ai Giocatori')}
              </span>
              {onLogReadAloud && (
                <button
                  type="button"
                  onClick={() => onLogReadAloud(rawText.slice(0, 140) + (rawText.length > 140 ? '...' : ''))}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#58180D]/10 text-[#58180D] hover:bg-[#58180D] hover:text-amber-100 transition"
                >
                  {tr('+ Log to Timeline', '+ Segna nel Diario')}
                </button>
              )}
            </div>
            <div className="italic text-[#2b170e] text-[16px] leading-relaxed space-y-2">
              {rawText.split('\n\n').map((p, pIdx) => (
                <p key={pIdx}>{renderInline(p, `ra-${i}-${pIdx}`)}</p>
              ))}
            </div>
          </div>
        );
      } else {
        elements.push(
          <div
            key={`block-${i}`}
            className="my-4 bg-[#efe0bb]/90 border-l-4 border-[#58180D] px-4 py-3 rounded-r shadow-sm text-sm text-[#2b170e]"
          >
            <div className="flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#58180D] mb-1">
              <EyeOff className="w-3.5 h-3.5" />
              {tr('Dungeon Master Secret Note', 'Nota Segreta del Dungeon Master')}
            </div>
            <div className="space-y-1.5 leading-relaxed">
              {blockLines.map((bLine, bIdx) => {
                const bt = bLine.trim();
                if (!bt) return null;
                if (bt.startsWith('- ')) {
                  return (
                    <div key={bIdx} className="flex items-start gap-2 pl-1">
                      <span className="text-[#58180D] font-bold">•</span>
                      <span>{renderInline(bt.slice(2), `dmn-${i}-${bIdx}`)}</span>
                    </div>
                  );
                }
                return <p key={bIdx}>{renderInline(bt, `dmn-${i}-${bIdx}`)}</p>;
              })}
            </div>
          </div>
        );
      }
      continue;
    }

    // 2. Standalone @encounter[id] block
    if (trimmed.startsWith('@encounter[') && trimmed.endsWith(']')) {
      const encId = trimmed.slice(11, -1).trim();
      const enc = encMap.get(encId);
      i++;
      if (!enc) {
        elements.push(
          <div key={`enc-${i}`} className="my-3 p-3 bg-red-100 border border-red-400 text-red-900 text-xs rounded">
            {tr('Encounter not found:', 'Incontro non trovato:')} <code>{encId}</code>
          </div>
        );
        continue;
      }

      const linkedSfx = enc.autoSfxId ? sfxMap.get(enc.autoSfxId) : undefined;
      const isHardOrDeadly =
        enc.difficulty === 'Hard' ||
        enc.difficulty === 'Deadly' ||
        enc.difficulty === 'Difficile' ||
        enc.difficulty === 'Mortale';

      elements.push(
        <div
          key={`enc-${i}`}
          className="my-5 rounded border-2 border-[#58180D] bg-gradient-to-br from-[#f8ecd1] to-[#edd8ab] p-4 shadow-lg font-sans text-[#2b170e]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#58180D]/30 pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#58180D] text-amber-100 text-[11px] font-bold uppercase tracking-wider">
                  <Swords className="w-3.5 h-3.5" /> {tr('Planned Encounter', 'Incontro Previsto')}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded border ${
                    isHardOrDeadly
                      ? 'bg-red-900/15 text-red-900 border-red-800/40'
                      : 'bg-amber-900/15 text-amber-900 border-amber-800/40'
                  }`}
                >
                  {tr('Difficulty:', 'Difficoltà:')} {enc.difficulty}
                </span>
              </div>
              <h4 className="font-header text-lg font-extrabold text-[#58180D] mt-1">{enc.name}</h4>
              <p className="text-xs text-[#5a3422]">{enc.environment}</p>
            </div>

            <div className="flex items-center gap-2">
              {linkedSfx && (
                <button
                  type="button"
                  onClick={() => soundboardEngine.toggle(linkedSfx)}
                  className="px-2.5 py-1.5 rounded text-xs font-bold border border-[#58180D]/50 text-[#58180D] hover:bg-[#58180D]/10 flex items-center gap-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  {linkedSfx.name}
                </button>
              )}
              {onStartEncounter && (
                <button
                  type="button"
                  onClick={() => onStartEncounter(enc)}
                  className="px-3.5 py-2 rounded bg-[#58180D] hover:bg-[#7a2213] text-amber-100 text-xs font-bold uppercase tracking-wider shadow flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Swords className="w-4 h-4" />
                  {tr('Start Combat', 'Avvia Combattimento')}
                </button>
              )}
            </div>
          </div>

          <p className="text-sm font-serif italic text-[#3b1c0e] mt-2">{enc.description}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {enc.slots.map((slot, sIdx) => {
              const monster = charMap.get(slot.characterId);
              return (
                <div
                  key={sIdx}
                  onClick={() => monster && onSelectCharacter?.(monster)}
                  className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#fdf7e7] border border-[#58180D]/30 hover:border-[#58180D] text-xs transition shadow-sm"
                >
                  <span className="font-extrabold text-[#58180D] text-sm">{slot.count}×</span>
                  <div>
                    <div className="font-bold text-[#2b170e]">{slot.customLabel || monster?.name || slot.characterId}</div>
                    {monster && (
                      <div className="text-[10px] text-[#58180D]/80">
                        {tr('AC', 'CA')} {monster.ac} • {tr('HP', 'PF')} {monster.hpMax} • {monster.levelOrCr}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
      continue;
    }

    // 3. Standalone @statblock[id] block
    if (trimmed.startsWith('@statblock[') && trimmed.endsWith(']')) {
      const charId = trimmed.slice(11, -1).trim();
      const ch = charMap.get(charId);
      i++;
      if (ch) {
        elements.push(
          <div key={`sb-${i}`} className="my-4">
            <StatblockCard character={ch} compact />
          </div>
        );
      }
      continue;
    }

    // 4. Markdown Table (| ... |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const headers = tableLines[0]
          .slice(1, -1)
          .split('|')
          .map((h) => h.trim());
        const rows = tableLines.slice(2).map((r) =>
          r
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim())
        );

        elements.push(
          <div key={`tbl-${i}`} className="my-4 overflow-x-auto rounded border border-[#58180D]/30 shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#58180D] text-amber-100 font-header text-xs uppercase tracking-wider">
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="py-2 px-3 border-b border-[#58180D]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={rIdx % 2 === 0 ? 'bg-[#e5efd9]/75 text-[#2b170e]' : 'bg-[#fdf7e7] text-[#2b170e]'}
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-1.5 px-3 border-b border-[#58180D]/10">
                        {renderInline(cell, `tbl-${i}-${rIdx}-${cIdx}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 5. Headings (#, ##, ###)
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="font-header text-2xl md:text-3xl font-extrabold text-[#58180D] uppercase tracking-wide border-b-2 border-[#c9ad6a] pb-1.5 mt-2 mb-4"
        >
          {trimmed.slice(2)}
        </h1>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="font-header text-xl md:text-2xl font-bold text-[#58180D] uppercase tracking-wide border-b border-[#58180D] pb-1 mt-5 mb-2.5"
        >
          {trimmed.slice(3)}
        </h2>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="font-header text-lg font-bold text-[#58180D] border-b border-[#c9ad6a]/80 pb-0.5 mt-4 mb-2"
        >
          {trimmed.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    // 6. Unordered List (- item)
    if (trimmed.startsWith('- ')) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-2.5 space-y-1.5 pl-4 list-disc marker:text-[#58180D] text-[16px] leading-relaxed">
          {listItems.map((li, lIdx) => (
            <li key={lIdx}>{renderInline(li, `li-${i}-${lIdx}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // 7. Standard Paragraph (with D&D drop-cap on the first narrative paragraph)
    const isPureTokenLine =
      (trimmed.startsWith('@sfx[') || trimmed.startsWith('@npc[')) && trimmed.length < 60;
    const useDropCap = !firstParagraphRendered && !isPureTokenLine && trimmed.length > 50;
    if (useDropCap) {
      firstParagraphRendered = true;
    }

    elements.push(
      <p
        key={`p-${i}`}
        className={`my-2.5 text-[16.5px] leading-relaxed text-[#2b170e] ${
          useDropCap
            ? 'first-letter:float-left first-letter:font-header first-letter:text-5xl first-letter:leading-none first-letter:pr-2.5 first-letter:font-extrabold first-letter:text-[#58180D]'
            : ''
        }`}
      >
        {renderInline(trimmed, `p-${i}`)}
      </p>
    );
    i++;
  }

  return (
    <div className="homebrewery-page relative rounded-sm bg-[#fdf7e7] text-[#2b170e] shadow-2xl border border-[#d6c299] overflow-hidden font-serif">
      {/* Top & bottom page gold-crimson trim */}
      <div className="h-2.5 bg-gradient-to-r from-[#58180D] via-[#c9ad6a] to-[#58180D]" />
      <div
        className={`p-6 md:p-9 ${
          twoColumns ? 'lg:columns-2 lg:gap-8 [column-rule:1px_solid_rgba(88,24,13,0.2)]' : ''
        }`}
      >
        {elements}
      </div>
      <div className="px-8 py-2 bg-[#f3e5c2] border-t border-[#c9ad6a]/60 flex items-center justify-between text-[11px] font-header text-[#58180D]/80 uppercase tracking-widest">
        <span>{tr('Vellum • Dungeon Master Edition', 'Vellum • Edizione Dungeon Master')}</span>
        <span>{tr('Interactive Parchment', 'Pergamena Interattiva')}</span>
      </div>
    </div>
  );
};
