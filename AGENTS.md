# AGENTS.md — Instructions for any AI agent (Codex, Copilot, Gemini, Cursor, etc.)

## What this repo is

ModelForge 3D: a browser-based Three.js 3D editor (voxel tools, rocket-part
authoring, PWA) that is being reorganized into a **modular web game engine with
an editor on top**. Live site: GitHub Pages under `/tanvir/`, served straight
from `main` — so `main` must always work.

## Read before you change anything

1. `PROGRESS.md` — what is done, what is next, and the session log.
2. `docs/engine/ARCHITECTURE.md` — current layout, target layout, layer rules.
3. `docs/engine/ROADMAP.md` — phases and how to move code safely.

## How to commit

- Commit **logical units**: one feature, one fix or one module move per commit,
  with a clear message (`engine/core: add EventBus`).
- (Claude sessions use a stricter per-file rule, described in `CLAUDE.md`. That
  rule is for Claude only. Other agents should not split work into per-file commits.)
- Run `npm test` before every push. CI (`.github/workflows/tests.yml`) runs it too.
- A file move and all of its import rewrites belong in **the same commit**.

## Always do this when you finish

- Tick the finished items in `PROGRESS.md`.
- Add one dated line to the session log there: what you did, what is half-done,
  and the exact next step. The next agent (often Claude, after a usage-limit
  reset) resumes from that line.

## Layer rules (short version)

```
editor/ ──► engine/  ──► three
apps/   ──► editor/, engine/
engine/ never imports editor/, ui/ or apps/
engine/ (except engine/platform/) never touches window/document
```

## Code style

- Native ES modules, no bundler, no TypeScript (for now).
- `three` is imported as `"three"` / `"three/addons/..."` through the import map.
- Small modules with named exports. Each new engine module gets a test in
  `test/engine/` using `node:test`.
