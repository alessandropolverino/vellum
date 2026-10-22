const isColorSupported =
  !process.env.NO_COLOR &&
  (process.stdout.isTTY || process.env.FORCE_COLOR === '1');

export const c = {
  reset: (s) => (isColorSupported ? `\x1b[0m${s}\x1b[0m` : s),
  bold: (s) => (isColorSupported ? `\x1b[1m${s}\x1b[22m` : s),
  dim: (s) => (isColorSupported ? `\x1b[2m${s}\x1b[22m` : s),
  italic: (s) => (isColorSupported ? `\x1b[3m${s}\x1b[23m` : s),
  underline: (s) => (isColorSupported ? `\x1b[4m${s}\x1b[24m` : s),
  red: (s) => (isColorSupported ? `\x1b[31m${s}\x1b[39m` : s),
  green: (s) => (isColorSupported ? `\x1b[32m${s}\x1b[39m` : s),
  yellow: (s) => (isColorSupported ? `\x1b[33m${s}\x1b[39m` : s),
  blue: (s) => (isColorSupported ? `\x1b[34m${s}\x1b[39m` : s),
  magenta: (s) => (isColorSupported ? `\x1b[35m${s}\x1b[39m` : s),
  cyan: (s) => (isColorSupported ? `\x1b[36m${s}\x1b[39m` : s),
  gray: (s) => (isColorSupported ? `\x1b[90m${s}\x1b[39m` : s),
};

export function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

export function success(msg, options = {}) {
  if (options.silent) return;
  console.log(`${c.green('✔')} ${msg}`);
}

export function info(msg, options = {}) {
  if (options.silent) return;
  console.log(`${c.cyan('ℹ')} ${msg}`);
}

export function warn(msg, options = {}) {
  if (options.silent) return;
  console.warn(`${c.yellow('⚠')} ${msg}`);
}

export function error(msg, exitCode = 1) {
  console.error(`${c.red('✖ Error:')} ${msg}`);
  if (exitCode !== null) {
    process.exit(exitCode);
  }
}

/**
 * Format an array of objects as an ASCII terminal table
 */
export function printTable(columns, rows) {
  if (!rows || rows.length === 0) {
    console.log(c.dim('  (No entries found)'));
    return;
  }

  // Calculate column widths
  const widths = {};
  for (const col of columns) {
    let max = col.label.length;
    for (const row of rows) {
      const val = String(row[col.key] ?? '');
      if (val.length > max) {
        max = Math.min(val.length, col.maxWidth || 50);
      }
    }
    widths[col.key] = max;
  }

  // Header
  const header = columns
    .map((col) => col.label.padEnd(widths[col.key]))
    .join('  ');
  console.log(c.bold(header));

  const separator = columns
    .map((col) => '─'.repeat(widths[col.key]))
    .join('  ');
  console.log(c.dim(separator));

  // Rows
  for (const row of rows) {
    const line = columns
      .map((col) => {
        let val = String(row[col.key] ?? '');
        if (col.maxWidth && val.length > col.maxWidth) {
          val = val.slice(0, col.maxWidth - 3) + '...';
        }
        const padded = val.padEnd(widths[col.key]);
        if (col.color && typeof col.color === 'function') {
          return col.color(padded, row);
        }
        return padded;
      })
      .join('  ');
    console.log(line);
  }
}

export function formatModifier(score) {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/**
 * Renders a D&D 5e Monster Manual / Player Statblock card in ASCII
 */
export function printStatblockCard(char) {
  const line = '═'.repeat(60);
  const sep = '─'.repeat(60);

  console.log(c.yellow(line));
  console.log(c.bold(c.red(` ${char.name.toUpperCase()}`)));
  console.log(
    c.italic(
      ` ${char.size || 'Medium'} ${char.creatureType || 'Humanoid'}, ${char.alignment || 'Unaligned'}`
    )
  );
  if (char.classOrArchetype) {
    console.log(c.dim(` Class: ${char.classOrArchetype} (${char.levelOrCr || 'Level 1'})`));
  }
  console.log(c.yellow(sep));

  console.log(` ${c.bold('Armor Class')} ${char.ac || 10} ${char.acNote ? c.dim(char.acNote) : ''}`);
  console.log(
    ` ${c.bold('Hit Points')}  ${char.hpMax || 10} ${char.hitDiceFormula ? c.dim(`(${char.hitDiceFormula})`) : ''}`
  );
  console.log(` ${c.bold('Speed')}       ${char.speed || '30 ft.'}`);
  console.log(c.yellow(sep));

  const ab = char.abilities || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const str = `${ab.str} (${formatModifier(ab.str)})`.padEnd(8);
  const dex = `${ab.dex} (${formatModifier(ab.dex)})`.padEnd(8);
  const con = `${ab.con} (${formatModifier(ab.con)})`.padEnd(8);
  const int = `${ab.int} (${formatModifier(ab.int)})`.padEnd(8);
  const wis = `${ab.wis} (${formatModifier(ab.wis)})`.padEnd(8);
  const cha = `${ab.cha} (${formatModifier(ab.cha)})`.padEnd(8);

  console.log(c.bold('   STR        DEX        CON        INT        WIS        CHA'));
  console.log(`  ${str}   ${dex}   ${con}   ${int}   ${wis}   ${cha}`);
  console.log(c.yellow(sep));

  if (char.savingThrows) console.log(` ${c.bold('Saving Throws')}       ${char.savingThrows}`);
  if (char.skills) console.log(` ${c.bold('Skills')}              ${char.skills}`);
  if (char.damageResistances) console.log(` ${c.bold('Damage Resistances')}  ${char.damageResistances}`);
  if (char.senses) console.log(` ${c.bold('Senses')}              ${char.senses}`);
  if (char.languages) console.log(` ${c.bold('Languages')}           ${char.languages}`);
  console.log(` ${c.bold('Challenge/Level')}     ${char.levelOrCr || '0'}`);
  console.log(c.yellow(sep));

  if (char.traits && char.traits.length > 0) {
    console.log(c.bold(c.cyan(' TRAITS')));
    for (const trait of char.traits) {
      console.log(` ${c.bold(trait.name)}. ${trait.description}`);
    }
    console.log(c.yellow(sep));
  }

  if (char.actions && char.actions.length > 0) {
    console.log(c.bold(c.cyan(' ACTIONS')));
    for (const act of char.actions) {
      const extra = [];
      if (act.attackBonus !== undefined) extra.push(`Bonus: +${act.attackBonus}`);
      if (act.damageFormula) extra.push(`Damage: ${act.damageFormula}`);
      const extraStr = extra.length > 0 ? c.dim(` [${extra.join(', ')}]`) : '';
      console.log(` ${c.bold(act.name)}${extraStr}. ${act.description}`);
    }
    console.log(c.yellow(sep));
  }

  if (char.reactionsOrLegendary && char.reactionsOrLegendary.length > 0) {
    console.log(c.bold(c.cyan(' REACTIONS / LEGENDARY ACTIONS')));
    for (const r of char.reactionsOrLegendary) {
      console.log(` ${c.bold(r.name)}. ${r.description}`);
    }
    console.log(c.yellow(sep));
  }

  if (char.biographyOrLore) {
    console.log(c.bold(c.magenta(' BIOGRAPHY & LORE')));
    console.log(` ${char.biographyOrLore}`);
    console.log(c.yellow(sep));
  }

  console.log(c.yellow(line));
}
