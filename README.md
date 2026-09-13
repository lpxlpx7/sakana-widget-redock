# Sakana Widget ReDock

An unofficial dock-style rework of [Sakana Widget](https://github.com/dsrkafuu/sakana-widget).

ReDock keeps the original character interaction and adds a movable desktop-style wrapper with persistent positioning, responsive sizing, and repeatable minimize and restore controls.

> This is an unofficial modification and is not maintained or endorsed by the original Sakana Widget project.

## Features

- Move the entire widget with a dedicated drag handle
- Keep the dock inside the visible browser area
- Save the dock position with `localStorage`
- Minimize and restore the widget without destroying its state
- Repeat minimize and restore any number of times
- Use a compact monochrome control interface
- Resize automatically for smaller screens
- Configure the original Sakana Widget through pass-through options
- Run without a framework or build step

## Demo

Serve the repository with a static HTTP server and open `index.html`.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Quick Start

Load the original widget files first, followed by ReDock:

```html
<link rel="stylesheet" href="vendor/sakana.min.css">
<link rel="stylesheet" href="sakana-redock.css">

<script src="vendor/sakana.min.js"></script>
<script src="sakana-redock.js"></script>
```

Mount the widget after the scripts are loaded:

```html
<script>
  SakanaReDock.mount();
</script>
```

ReDock creates its own HTML and mounts to `document.body` by default.

## Configuration

`SakanaReDock.mount()` accepts an options object:

```js
const redock = SakanaReDock.mount({
  target: document.body,
  character: "takina",
  size: 200,
  mobileSize: 145,
  position: {
    left: 18,
    bottom: 10
  },
  storageKey: "sakana-redock-position",
  labels: {
    move: "Move",
    minimize: "Minimize widget",
    restore: "Restore widget"
  },
  sakana: {
    rod: true,
    draggable: true,
    stroke: {
      color: "#a8a8a8",
      width: 8
    }
  }
});
```

Values passed through `sakana` are forwarded to the original `SakanaWidget` constructor.

## Instance Methods

```js
redock.minimize();
redock.restore();
redock.destroy();
```

Minimizing only hides the mounted widget. It does not destroy or recreate the Sakana Widget instance, so character state remains intact and repeated restoration stays reliable.

## Styling

The default interface colors can be changed with CSS custom properties:

```css
:root {
  --sakana-dock-bg: #151515;
  --sakana-dock-fg: #f5f5f5;
  --sakana-dock-shadow: rgba(0, 0, 0, 0.2);
}
```

## Project Structure

```text
sakana-widget-redock/
|-- vendor/
|   |-- sakana.min.css
|   |-- sakana.min.js
|   `-- LICENSE
|-- index.html
|-- sakana-redock.css
|-- sakana-redock.js
|-- package.json
|-- LICENSE
`-- THIRD_PARTY_NOTICES.md
```

## Credits

ReDock is a wrapper and interface modification for [Sakana Widget](https://github.com/dsrkafuu/sakana-widget) by [DSRKafuU](https://github.com/dsrkafuu), based on the original Sakana project by itorr.

The upstream software copyright notice is:

```text
Copyright (c) 2022 itorr, DSRKafuU
```

The upstream project credits the built-in character artwork to Obushi Ao:

- X: [@blue00f4](https://twitter.com/blue00f4)
- Pixiv: [aoiroblue1340](https://pixiv.me/aoiroblue1340)

## License

Sakana Widget ReDock is released under the MIT License. See `LICENSE`.

The redistributed upstream Sakana Widget files in `vendor/` remain under the original MIT License. See `vendor/LICENSE` and `THIRD_PARTY_NOTICES.md`.

### Artwork Notice

The MIT License covers the software code. The upstream project separately states that its two built-in character images should not be used for commercial activities.

For commercial distribution, replace the built-in character images with artwork that you own or are licensed to use.
