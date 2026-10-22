import fs from 'node:fs';

/**
 * Lightweight CLI argument parser.
 * Supports:
 * - positional arguments
 * - flags: --flag, -f
 * - key-values: --key=value, --key value, -k value
 * - array values: --tag a --tag b or comma-separated if handled by command
 * - @file syntax for reading values from files (e.g. --data @file.json, --markdown @text.md)
 * - reading from STDIN if value is '-'
 */
export function parseArgs(rawArgs) {
  const positionals = [];
  const options = {};

  let i = 0;
  while (i < rawArgs.length) {
    const arg = rawArgs[i];

    if (arg === '--') {
      positionals.push(...rawArgs.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      const equalIndex = arg.indexOf('=');
      let key;
      let val;

      if (equalIndex !== -1) {
        key = arg.slice(2, equalIndex);
        val = arg.slice(equalIndex + 1);
      } else {
        key = arg.slice(2);
        const next = rawArgs[i + 1];
        if (next !== undefined && !next.startsWith('-')) {
          val = next;
          i++;
        } else {
          val = true;
        }
      }

      setOption(options, key, resolveFileValue(val));
    } else if (arg.startsWith('-') && arg.length > 1) {
      const flag = arg.slice(1);
      if (flag.length === 1) {
        const next = rawArgs[i + 1];
        if (next !== undefined && !next.startsWith('-')) {
          setOption(options, flag, resolveFileValue(next));
          i++;
        } else {
          setOption(options, flag, true);
        }
      } else {
        // e.g. -j or bundled flags -fq
        for (const char of flag) {
          setOption(options, char, true);
        }
      }
    } else {
      positionals.push(arg);
    }

    i++;
  }

  // Normalize common aliases
  if (options.h) options.help = true;
  if (options.j) options.json = true;
  if (options.q) options.silent = true;
  if (options.f) options.force = true;
  if (options.d && !options.db) options.db = options.d;

  return { positionals, options };
}

function setOption(options, key, value) {
  if (options[key] === undefined) {
    options[key] = value;
  } else if (Array.isArray(options[key])) {
    options[key].push(value);
  } else {
    options[key] = [options[key], value];
  }
}

function resolveFileValue(val) {
  if (typeof val !== 'string') return val;
  if (val === '-') {
    try {
      return fs.readFileSync(0, 'utf-8');
    } catch {
      return val;
    }
  }
  if (val.startsWith('@')) {
    const filePath = val.slice(1);
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      throw new Error(`Failed to read file specified by '${val}': ${err.message}`);
    }
  }
  return val;
}
