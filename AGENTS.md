# Agent Instructions — Vellum (`dnd5e`)

## Project Overview
- **Stack**: React 19 + TypeScript + Vite + Tailwind CSS + Tauri v2 (`src-tauri/`).
- **Commands**:
  - `npm run dev` — Start Vite dev server (`http://localhost:1420`) with local disk DB API (`./data/vellum-db.json`).
  - `npm run build` — Run `tsc -b && vite build` to verify TypeScript and bundle frontend.
  - `npm run tauri dev` / `npm run tauri build` — Run or package the native Tauri v2 desktop application.
  - `npm run cli -- <cmd>` — Execute Vellum CLI commands for CRUD operations on stories, characters/PGs, campaigns, parties, encounters, instances, and DB maintenance.

## CLI & AI Agent Skill
- **Vellum CLI** (`bin/vellum.mjs`, executable via `vellum`, `npm run cli -- ...` or `node bin/vellum.mjs ...`): Allows developers, users, and autonomous AI agents (Claude, Gemini, Codex, Antigravity) to perform full CRUD operations on all entities.
- **Skill reference**: See [`skills/vellum-cli/SKILL.md`](./skills/vellum-cli/SKILL.md) and run `npm run cli -- agent-guide` for comprehensive schemas, patterns, and examples.
- **Agent Rules**: Always use `--json` for tool invocations; use `@filepath` syntax for long markdown or JSON payloads; run `npm run cli -- db validate --json` to verify integrity after mutations.

## Language & Localization (i18n)
- **English is the primary language** across the entire project: all source code identifiers, comments, commit messages, PR descriptions, `README.md`, `CHANGELOG.md`, agent instructions, and default seed data (`SEED_DATABASE_EN`) must be written in English.
- **Multi-language UI support**: The application supports multiple UI languages via `src/i18n/LanguageContext.tsx` (`useLanguage()`, `tr(en, it)`), currently **English (`en`, default)** and **Italian (`it`)**.
- Whenever you add or modify any user-facing UI text, labels, tooltips, placeholders, alerts, or default content, you **must** provide translations for all supported languages (`en` and `it`) using `tr('English text', 'Testo italiano')` (or localized dictionaries/helpers) so the UI adapts seamlessly to the active language.

## Branches and releases
- `main` holds released code only; `dev` is the integration branch. Never commit or push directly to either.
- Work on `feat/*`, `fix/*` or `chore/*` branches cut from `dev`, and open the PR against `dev` (squash merge). Don't start from `main`.
- Every new fix, feature or chore starts on its own new branch cut from an up-to-date `dev` (`git fetch`, then branch from `origin/dev`) — even if the current branch looks related. Never keep working on a branch whose PR is already merged (a squash merge leaves the old branch looking unmerged; check `gh pr list --state all`). If you notice you are on such a branch, or on `dev`/`main`, move the changes to a new branch before committing.
- Parallel sessions: several agent sessions often run at the same time on different features, so **each session works in its own git worktree**, never in the shared main checkout (two sessions switching branches in one folder clobber each other's files and builds). Create it from an up-to-date `dev`: `git fetch && git worktree add -b feat/<name> .claude/worktrees/<name> origin/dev` (`.claude/` is git-ignored), or use the `EnterWorktree` tool / the app's worktree option, which does the same. One worktree = one branch = one PR.
  - Before editing, check `git worktree list` and `git branch --show-current`: if you are in the main checkout (or on `dev`/`main`), create a worktree first. Uncommitted changes already sitting in the main checkout belong to someone else — don't stash, reset or move them without asking.
  - A branch can be checked out in only one worktree at a time; never `git checkout` a branch that another worktree holds.
  - Each worktree has its own `node_modules/` and Rust `target/`: run `npm install` (and the first `cargo build`) there. Don't copy build output between worktrees.
  - When the PR is merged, remove the worktree (`git worktree remove .claude/worktrees/<name>`, then `git branch -d` the local branch) and run `git worktree prune`. Never `rm -rf` a worktree folder by hand.
- A release is a PR `dev` → `main`, merged with a **merge commit** (not squash, or the branches diverge). Then tag `main`: `windows-vX.Y.Z` for the Windows app (triggers `windows.yml`), `vX.Y.Z` for the macOS app. A hotfix branches from `main`, goes back to `main` by PR, then `main` is merged back into `dev`. For a trial build, tag a pre-release from `dev` (`windows-vX.Y.Z-rc.1`) and publish it as a GitHub pre-release.
- Every PR that changes behaviour adds a line to `## Unreleased` in `CHANGELOG.md`, prefixed `Windows:` / `macOS:` (or `App:` for cross-platform UI changes) like the existing entries, saying what changed for the user. Do not leave it for the release.
- When preparing a release (the `dev` → `main` PR): rename `## Unreleased` to `## <Platform> X.Y.Z — YYYY-MM-DD` and open a fresh empty `## Unreleased` above it; bump the app version (`package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`); add the release to the **Releases** table in `README.md` (version, date, platform, notes link); and update the README's Install section if prebuilt downloads now exist.

## Release automation and in-app updater
- The desktop app updates itself (`tauri-plugin-updater`, UI in `src/components/UpdateModal.tsx`). It reads `https://github.com/alessandropolverino/vellum/releases/latest/download/latest.json` and verifies each package against the public key in `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`). The repository is public precisely so this works without credentials.
- Releases are fully automated by `.github/workflows/windows.yml`: pushing a tag `windows-vX.Y.Z` on `main` builds the installer, **signs it** with the repo secrets `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, and publishes the GitHub Release with the installers and `latest.json` (release notes are taken from the matching `CHANGELOG.md` section). Tags containing `-rc` become pre-releases, which the updater never offers.
- Release steps: on the release PR run `npm run release:bump -- X.Y.Z` (keeps `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` and both lock files aligned), do the changelog/README steps above, merge `dev` → `main` with a merge commit, then `git tag windows-vX.Y.Z && git push origin windows-vX.Y.Z`. The workflow fails if the tag and the version files disagree.
- Never commit the updater private key or its password, never print them, and never change `pubkey` or the endpoint without a plan for existing installs: apps already installed only trust the key they shipped with, so a lost or replaced key means they can no longer be updated. The key lives outside the repo (maintainer's `~/.tauri/`) and in the GitHub secrets.
- The updater signature is not Windows code signing: the installer is unsigned for SmartScreen. macOS is not wired up yet (it needs Apple signing/notarization, and separate `v*` releases would compete for `releases/latest`).
- An update can only be tested end to end with two real releases (install the older one, publish the newer). Before an update installs, the app takes a `pre-update` backup via `storageRepository.createBackup`; keep schema changes covered by `migrateDatabase` so a new version can open older data.
