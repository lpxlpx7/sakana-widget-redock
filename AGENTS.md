# AGENTS.md

## Setup

- **Runtime & package manager**: Bun 1.4.2 (lockfile is `bun.lock`). Use `bun install --frozen-lockfile` for reproducible installs.

## Commands

| Task                | Command             |
| ------------------- | ------------------- |
| Format              | `bun run fmt`       |
| Lint                | `bun run lint`      |
| Typecheck           | `bun run typecheck` |
| Test                | `bun run test`      |
| Build (all)         | `bun run build`     |
| Build lib only      | `bun run build:lib` |
| Dev (watch + serve) | `bun run dev`       |

## Build order

`build` runs sequentially: `build:lib` → `build:umd` → `build:docs`. Do not skip steps.

- `build:lib` (tsdown) outputs ESM + UMD + CSS to `lib/`
- `build:umd` reads `lib/index.min.css` + `lib/index.umd.js` and produces `lib/index.umd.min.js` (all-in-one JS with inline CSS)
- `build:docs` copies the UMD bundle into `docs/` and minifies the demo HTML

## Architecture

- **Single package**, no monorepo. Source in `src/`, output in `lib/` (gitignored).
- **Entry**: `src/index.ts` exports the `SakanaReDock` class, which wraps a `SakanaWidget` from the `sakana-widget` npm package.
- **Dependency**: ESM output keeps `sakana-widget` external; the UMD build bundles it (`deps.alwaysBundle` in `tsdown.config.ts`).
- **Styles**: `src/index.scss` (SCSS, compiled by tsdown). All CSS uses `.sakana-redock-*` prefix; inner widget overrides are scoped under `.sakana-redock`.
- **Static assets**: `.svg` → inline text string (configured in `tsdown.config.ts`).
- **Demo**: `src/index.html`, built into `docs/` (gitignored except `.gitkeep`).

## Key conventions

- **ESM only** (`"type": "module"`, `verbatimModuleSyntax: true`). No CJS.
- **Lint**: oxlint with plugins: oxc, node, eslint, import, promise, unicorn, typescript.
- **Format**: oxfmt (single quotes, sort imports, ignore `*.svg`).
- **EditorConfig**: 2-space indent, LF line endings.
- **Language**: English only for docs, comments, and UI labels.

## CI

- GitHub Actions `.github/workflows/gh-pages.yml` runs lint, typecheck, build, and tests, then deploys `docs/` to GitHub Pages on push to `main`.

## Testing

`bun run typecheck` and `bun run test` rebuild the library first. Tests run with Bun and happy-dom.
