// Usage: npm run release:bump -- 0.2.0
// Keeps package.json, src-tauri/Cargo.toml and src-tauri/tauri.conf.json on the same version.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: npm run release:bump -- X.Y.Z');
  process.exit(1);
}

const editJson = (path) => {
  const raw = readFileSync(path, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const data = JSON.parse(raw);
  data.version = version;
  writeFileSync(path, JSON.stringify(data, null, 2).replace(/\n/g, eol) + eol);
};

editJson('package.json');
editJson('src-tauri/tauri.conf.json');

const cargoPath = 'src-tauri/Cargo.toml';
const cargo = readFileSync(cargoPath, 'utf8');
const next = cargo.replace(/^version = ".*"$/m, `version = "${version}"`);
if (next === cargo && !cargo.includes(`version = "${version}"`)) {
  console.error('Could not find the package version in Cargo.toml');
  process.exit(1);
}
writeFileSync(cargoPath, next);

// Refresh package-lock.json and Cargo.lock so they match.
execSync('npm install --package-lock-only --ignore-scripts', { stdio: 'inherit' });
execSync('cargo update -p vellum --offline', { cwd: 'src-tauri', stdio: 'inherit' });

console.log(`Bumped to ${version}`);
