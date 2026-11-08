#!/usr/bin/env node
// Guards the installer layout. Tauri flattens glob resource sources ("../bin/**/*": "bin/")
// by putting every file directly under the target, which broke `bin/lib/*.mjs` and
// `skills/vellum-cli/SKILL.md` in 0.4.0/0.4.1. Directory sources keep their structure.
// Usage: node scripts/check-bundle-resources.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const confPath = path.join(root, 'src-tauri', 'tauri.conf.json');
const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'));
const resources = conf.bundle?.resources;
const errors = [];

if (!resources || Array.isArray(resources) || typeof resources !== 'object') {
  errors.push('bundle.resources must be a { "<source dir>": "<target dir>" } map.');
} else {
  for (const [source, target] of Object.entries(resources)) {
    if (/[*?[\]{}]/.test(source)) {
      errors.push(`"${source}" is a glob: Tauri flattens glob matches into "${target}". Use the directory itself.`);
      continue;
    }
    const abs = path.resolve(path.dirname(confPath), source);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
      errors.push(`"${source}" is not a directory (resolved to ${abs}).`);
    }
  }
  const expected = ['../bin', '../skills'];
  for (const e of expected) {
    if (!(e in resources)) errors.push(`Missing resource entry "${e}".`);
  }
}

const must = ['bin/vellum.mjs', 'bin/lib/args.mjs', 'bin/lib/defaultSeed.json', 'skills/vellum-cli/SKILL.md'];
for (const f of must) {
  if (!fs.existsSync(path.join(root, f))) errors.push(`Expected repo file ${f} is missing.`);
}

if (errors.length) {
  console.error('Bundle resource check failed:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('Bundle resources OK: directory sources keep bin/lib and skills/vellum-cli.');
