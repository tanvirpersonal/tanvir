# CLAUDE.md — Instructions for Claude sessions

This repo is being reorganized from **ModelForge 3D** (a browser Three.js editor)
into a **professional, modular web game engine + editor**. Work is done across many
short sessions (free plan, 5-hour usage windows). Every session must be able to
resume cold from the files in this repo.

## Start of every session (do this first, in order)

1. Read `PROGRESS.md` — the checklist and the session log. The first unchecked
   item under "Next up" is your task.
2. Skim `docs/engine/ROADMAP.md` for the current phase, and
   `docs/engine/ARCHITECTURE.md` for where files belong.
3. Run `npm test` to confirm the baseline is green before changing anything.

## Claude-only commit rule

**Commit and push every file immediately after creating or changing it.**
One file → one commit → one push. Do not batch.

```bash
git add <file>
git commit -m "<area>: <what changed>"
git push origin main
```

(This per-file rule applies to Claude only. Other agents follow `AGENTS.md`.)

The one exception is a **move/rename** of existing modules: moving a file breaks
every import that points at it, and the live site is deployed from `main`. A move
plus the import rewrites it requires is committed as **one atomic commit**
(see "Moving existing code" in `docs/engine/ROADMAP.md`). Run `npm test` before
pushing it.

## Work in small steps

- Pick one checklist item, finish it, commit, push, then tick it in `PROGRESS.md`
  (and commit/push that too).
- Prefer adding new files under `engine/` over editing large existing ones.
- Never leave `main` broken: the site at `/tanvir/` on GitHub Pages serves it.

## End of every session (or when the limit is close)

1. Update `PROGRESS.md`: tick finished items, add a dated line to the
   session log ("what I did / what is half-done / exact next step").
2. Commit and push it.

## Conventions

- Plain ES modules, no build step. `three` comes from the import map in
  `index.html` (three@0.181.1 via unpkg).
- Engine code (`engine/`) must not touch the DOM except in `engine/platform/`,
  so it can be unit-tested with `node --test`.
- New engine modules get a test in `test/engine/`.
- Keep existing `?v=` cache-busting query strings working when editing imports.
