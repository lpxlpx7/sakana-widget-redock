## v0.2.0

- refactor: rewrite in TypeScript and adopt the Sakana! Widget repository layout (Bun, tsdown, oxlint, oxfmt)
- feat: export a `SakanaReDock` class with `mount()`, `unmount()`, `minimize()` and `restore()`; `SakanaReDock.mount(options)` still works
- feat: add `widget` and `minimized` getters
- feat: publish ESM with type declarations, plus an all-in-one UMD bundle that includes Sakana! Widget and styles
- build: depend on `sakana-widget@^4.0.0` from npm instead of vendored files
- style: rename CSS classes and custom properties to the `sakana-redock-*` prefix
- feat: replace the original control bar with a stand; click it to switch characters (`sakana: { controls: true }` brings the bar back)
- feat: add `character` getter, `setCharacter()` and `nextCharacter()`
- feat: minimize into an avatar chip with spring transitions, respecting `prefers-reduced-motion`
- feat: merge move and minimize into one toolbar, revealed on hover for mouse users
- feat: nudge the dock with arrow keys on the move handle
- feat: remember the minimized state together with the position
- fix: let clicks pass through the empty area around the character
- fix: move keyboard focus between the minimize button and the restore chip
- fix: hide the inner widget's close button by its label, so custom controls stay visible
- test: add happy-dom regression tests and run them in CI
- ci: deploy the demo to GitHub Pages

## v0.1.0

- feat: movable dock with persistent position
- feat: repeatable minimize and restore
- feat: responsive size for smaller screens
