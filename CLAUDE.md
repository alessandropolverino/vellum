# Claude & Agent Instructions

See [AGENTS.md](./AGENTS.md) for project architecture, build commands, localization rules, and mandatory **Branches and releases** / git worktree rules.

## CLI & AI Agent Operations
- Use `npm run cli -- <command>` (or `node bin/vellum.mjs <command>`) for programmatic entity management.
- See [`skills/vellum-cli/SKILL.md`](./skills/vellum-cli/SKILL.md) and [`agent-guide`](#) for command syntax and entity models.
- Always append `--json` for predictable, machine-readable JSON outputs.

## Language & Localization (i18n)
- **English is the primary language** across the entire project: all code comments, identifiers, documentation (`README.md`, `CHANGELOG.md`, agent instructions), commits, PRs, and default seed data must be written in English.
- **Multi-language UI support**: Every user-facing string in the UI must support all available languages (`en` default, `it` Italian) via `useLanguage()` / `tr(en, it)` in `src/i18n/LanguageContext.tsx`. Always adapt new or modified UI components to all supported languages.

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
- Every PR that changes behaviour adds a line to `## Unreleased` in `CHANGELOG.md`, prefixed `Windows:` / `macOS:` like the existing entries, saying what changed for the user. Do not leave it for the release.
- When preparing a release (the `dev` → `main` PR): rename `## Unreleased` to `## <Platform> X.Y.Z — YYYY-MM-DD` and open a fresh empty `## Unreleased` above it; bump the app version (`package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`); add the release to the **Releases** table in `README.md` (version, date, platform, notes link); and update the README's Install section if prebuilt downloads now exist.
