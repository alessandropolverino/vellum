#!/usr/bin/env node
// Downloads the cloudflared binary into bin/ so the installer bundles it (live session tunnel).
// Usage: node scripts/fetch-cloudflared.mjs [--force]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Pinned on purpose: bump deliberately and re-test. Set CLOUDFLARED_SHA256 to enforce a checksum.
const VERSION = process.env.CLOUDFLARED_VERSION || '2025.9.1';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const binDir = path.join(root, 'bin');

const assets = {
  win32: { asset: 'cloudflared-windows-amd64.exe', out: 'cloudflared.exe' },
  linux: { asset: 'cloudflared-linux-amd64', out: 'cloudflared' },
};
const target = assets[process.platform];
if (!target) {
  console.error(`No cloudflared download is wired for ${process.platform}; install it on PATH instead.`);
  process.exit(1);
}

const dest = path.join(binDir, target.out);
if (fs.existsSync(dest) && !process.argv.includes('--force')) {
  console.log(`cloudflared already present at ${dest}`);
  process.exit(0);
}

const url = `https://github.com/cloudflare/cloudflared/releases/download/${VERSION}/${target.asset}`;
console.log(`Downloading ${url}`);
const res = await fetch(url, { redirect: 'follow' });
if (!res.ok) {
  console.error(`Download failed: HTTP ${res.status}`);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
const sha = crypto.createHash('sha256').update(buf).digest('hex');
console.log(`sha256 ${sha}`);
if (process.env.CLOUDFLARED_SHA256 && process.env.CLOUDFLARED_SHA256.toLowerCase() !== sha) {
  console.error('Checksum mismatch, refusing to install.');
  process.exit(1);
}
fs.mkdirSync(binDir, { recursive: true });
fs.writeFileSync(dest, buf, { mode: 0o755 });
console.log(`Saved ${dest}`);
