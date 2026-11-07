<p align="center">
<img src="https://raw.githubusercontent.com/dsrkafuu/sakana-widget/main/src/characters/chisato.png" height="160px">
<img src="https://raw.githubusercontent.com/dsrkafuu/sakana-widget/main/src/characters/takina.png" height="160px">
</p>

# 🐟「Sakana! Widget ReDock」

[![NPM](https://img.shields.io/npm/v/sakana-widget-redock)](https://www.npmjs.com/package/sakana-widget-redock)
[![License](https://img.shields.io/github/license/lpxlpx7/sakana-widget-redock)](https://github.com/lpxlpx7/sakana-widget-redock/blob/main/LICENSE)
[![Upstream](https://img.shields.io/badge/sakana--widget-4.0.0-blue)](https://github.com/dsrkafuu/sakana-widget)

<https://lpxlpx7.github.io/sakana-widget-redock/>

A movable and minimizable dock for [Sakana! Widget](https://github.com/dsrkafuu/sakana-widget). Keeps the original character interaction and wraps it in a desktop-style dock.

> This is an unofficial modification and is not maintained or endorsed by the original Sakana! Widget project.

## Features

- Sizes: `~63 kB ALL-IN-ONE JS` (includes Sakana! Widget and its 2 built-in characters, gzip compressed)
- A monochrome stand replaces the original control bar; click it to switch characters
- Move the dock with a hover-revealed drag handle, or nudge it with arrow keys
- Keep the dock inside the visible viewport, even after resizing
- Minimize into a small avatar chip with a spring animation, restore any number of times without destroying the widget state
- Save the dock position and minimized state via localStorage
- Themable with CSS custom properties, respects `prefers-reduced-motion`
- Responsive size for smaller screens
- Forward any option to the inner Sakana! Widget

## Development

Use Bun 1.4.2 to install dependencies and run the project:

```sh
bun install --frozen-lockfile
bun run dev
bun run lint
bun run typecheck
bun run test
bun run build
```

`build` runs the library, UMD bundle, and documentation builds in order.

## Usage

First you need to import the module, either directly using a CDN or by installing it as an NPM package:

```html
<!-- https://cdn.jsdelivr.net/npm/sakana-widget-redock@0.2.0/lib/index.umd.min.js -->

<script>
  function initSakanaReDock() {
    new SakanaReDock().mount();
  }
</script>
<script
  async
  onload="initSakanaReDock()"
  src="https://cdn.jsdelivr.net/npm/sakana-widget-redock@0.2.0/lib/index.umd.min.js"
></script>
```

The UMD bundle is all-in-one: it already contains Sakana! Widget and all styles, so no other file is needed.

```ts
// npm install --save sakana-widget-redock
// css is imported in the js entry, sakana-widget is installed as a dependency
import SakanaReDock from 'sakana-widget-redock';
new SakanaReDock().mount();
```

This package exports a class `SakanaReDock` by default. The dock is `position: fixed` and mounts to `document.body` unless another element or selector is passed to `mount()`.

A static shortcut is also available:

```ts
const dock = SakanaReDock.mount({ character: 'chisato' });
```

Options passed through `sakana` are forwarded to the inner `SakanaWidget` constructor:

```ts
new SakanaReDock({
  character: 'chisato',
  size: 240,
  position: { left: 24, bottom: 24 },
  labels: { move: 'Drag' },
  sakana: {
    stroke: { color: '#888', width: 6 },
    title: true,
  },
}).mount();
```

The inner widget instance is available through the `widget` getter, so the full Sakana! Widget API can still be used:

```ts
const dock = new SakanaReDock().mount();
dock.widget?.setState({ i: 0.001, d: 1 });
```

To register a custom character, import `sakana-widget` directly and register it before mounting the dock:

```ts
import SakanaWidget from 'sakana-widget';
import SakanaReDock from 'sakana-widget-redock';

const github = SakanaWidget.getCharacter('chisato');
github.image = `https://raw.githubusercontent.com/dsrkafuu/sakana-widget/main/docs/github.png`;
SakanaWidget.registerCharacter('github', github);
new SakanaReDock({ character: 'github' }).mount();
```

## Stand & Characters

The original control bar is replaced by a stand: the rod plugs into a socket on top of a slab that shows the current character name. Click the slab to switch to the next registered character, or do it from code:

```ts
const dock = new SakanaReDock().mount();
dock.nextCharacter();
dock.setCharacter('takina');
console.log(dock.character); // 'takina'
```

To bring the original control bar back, pass `sakana: { controls: true }`. Its close button stays hidden, since the dock has its own minimize button.

## Minimize & Restore

Click the minus button in the toolbar or call `minimize()`: the dock shrinks into its stand and a small chip with the character avatar pops up in its place. Click the chip or call `restore()` to bring the dock back.

Minimizing only hides the dock. The inner widget is not unmounted or recreated, so its character and motion state stay intact. Keyboard focus moves between the minimize button and the chip.

```ts
const dock = new SakanaReDock().mount();
dock.minimize();
dock.restore();
```

## Persist State

After each drag or arrow key nudge, the dock position is saved to localStorage relative to the viewport, so it lands in the same place on screens of different sizes. The minimized state is saved under the same key and restored without animation on the next page load. Use a unique `storageKey` for each dock when using more than one on the same page:

```ts
new SakanaReDock({ character: 'chisato', storageKey: 'redock-chisato' }).mount();
new SakanaReDock({ character: 'takina', storageKey: 'redock-takina' }).mount();
```

## Styling

The default colors can be changed with CSS custom properties:

```css
:root {
  --sakana-redock-bg: #151515;
  --sakana-redock-fg: #f5f5f5;
  --sakana-redock-shadow: rgba(0, 0, 0, 0.2);
  --sakana-redock-divider: rgba(245, 245, 245, 0.22);
}
```

All classes use the `.sakana-redock-*` prefix. On devices with a mouse, the toolbar fades in when the character is hovered or the dock has focus; on touch screens it is always visible.

## API

### Constructor Params

```ts
export interface SakanaReDockOptions {
  /**
   * default character, default to `takina`
   */
  character?: string;
  /**
   * widget size, default to `200`
   */
  size?: number;
  /**
   * widget size on screens narrower than 780px, default to `145`
   */
  mobileSize?: number;
  /**
   * initial position when no saved position exists, default to `{ left: 18, bottom: 10 }`
   */
  position?: Partial<{ left: number; bottom: number }>;
  /**
   * localStorage key for the dock position and minimized state, default to `sakana-redock-position`
   */
  storageKey?: string;
  /**
   * button labels, default to `Move`, `Minimize widget`, `Restore widget` & `Switch character`
   */
  labels?: Partial<{ move: string; minimize: string; restore: string; switch: string }>;
  /**
   * options forwarded to the inner `SakanaWidget`
   */
  sakana?: SakanaWidgetOptions;
}
```

The inner widget is created with `autoFit: true`, `controls: false`, `rod: true`, `draggable: true` and a `#a8a8a8` / `8` stroke by default; any of these can be overridden through `sakana`.

### Dock Instance

```ts
class SakanaReDock {
  /**
   * create and mount a dock in one call
   */
  static mount(options?: SakanaReDockOptions, el?: HTMLElement | string): SakanaReDock;
  /**
   * the inner sakana widget instance, `null` when unmounted
   */
  get widget(): SakanaWidget | null;
  /**
   * whether the dock is currently minimized
   */
  get minimized(): boolean;
  /**
   * name of the current character
   */
  get character(): string;
  /**
   * set current character of the dock and its widget
   */
  setCharacter(name: string): this;
  /**
   * switch to the next registered character
   */
  nextCharacter(): this;
  /**
   * mount the dock, default to `document.body`
   */
  mount(el?: HTMLElement | string): this;
  /**
   * unmount the dock and its widget
   */
  unmount(): this;
  /**
   * alias of `unmount`
   */
  destroy(): this;
  /**
   * minimize the dock without destroying the widget
   */
  minimize(): this;
  /**
   * restore a minimized dock
   */
  restore(): this;
}
```

## License

Released under MIT License. This project is a secondary development based on https://github.com/dsrkafuu/sakana-widget (Copyright (c) 2022 itorr, DSRKafuU, MIT License). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Please note that the 2 default images **should not be used for any commercial activities**. For commercial distribution, register characters with artwork that you own or are licensed to use.

Image source: 大伏アオ [@blue00f4](https://twitter.com/blue00f4) [pixiv](https://pixiv.me/aoiroblue1340)
