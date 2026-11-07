import { afterEach, beforeEach, expect, test } from 'bun:test';

import { Window } from 'happy-dom';

const browser = new Window({ url: 'http://localhost/', width: 1024, height: 768 });
globalThis.window = browser;
globalThis.document = browser.document;
globalThis.localStorage = browser.localStorage;
globalThis.Event = browser.Event;

const frames = new Map();
let nextFrameId = 1;
globalThis.requestAnimationFrame = (callback) => {
  const id = nextFrameId++;
  frames.set(id, callback);
  return id;
};
globalThis.cancelAnimationFrame = (id) => frames.delete(id);
browser.requestAnimationFrame = globalThis.requestAnimationFrame;
browser.cancelAnimationFrame = globalThis.cancelAnimationFrame;
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};

const { default: SakanaReDock } = await import('../lib/index.js');
const docks = [];

function mount(options = {}) {
  const dock = new SakanaReDock(options).mount();
  docks.push(dock);
  return dock;
}

beforeEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  frames.clear();
  docks.length = 0;
});

afterEach(() => {
  for (const dock of docks) dock.unmount();
  frames.clear();
});

test('mounts a dock with toolbar, stand and an inner widget', () => {
  const dock = mount();
  const root = document.querySelector('.sakana-redock');

  expect(root).not.toBeNull();
  expect(root.querySelector('.sakana-redock-toolbar .sakana-redock-move')).not.toBeNull();
  expect(root.querySelector('.sakana-redock-toolbar .sakana-redock-minimize')).not.toBeNull();
  expect(root.querySelector('.sakana-redock-stand .sakana-redock-socket')).not.toBeNull();
  expect(root.querySelector('.sakana-redock-name').textContent).toBe('takina');
  expect(root.querySelector('.sakana-redock-restore').getAttribute('aria-hidden')).toBe('true');
  expect(root.querySelector('.sakana-redock-restore').tabIndex).toBe(-1);
  expect(root.querySelector('.sakana-redock-widget .sakana-widget-app')).not.toBeNull();
  expect(dock.widget).not.toBeNull();
});

test('replaces the original control bar with the stand', () => {
  mount();
  expect(document.querySelector('.sakana-widget-ctrl')).toBeNull();
});

test('keeps the original control bar when explicitly enabled', () => {
  mount({ sakana: { controls: true } });
  expect(document.querySelector('.sakana-widget-ctrl')).not.toBeNull();
});

test('the stand switches characters and updates its label and avatar', () => {
  const dock = mount();
  const root = document.querySelector('.sakana-redock');
  const switcher = root.querySelector('.sakana-redock-switch');

  switcher.click();
  expect(dock.character).toBe('chisato');
  expect(root.querySelector('.sakana-redock-name').textContent).toBe('chisato');
  expect(root.querySelector('.sakana-redock-avatar').style.backgroundImage).toContain('data:image');
  expect(switcher.classList.contains('sakana-redock-switch--swap')).toBe(true);

  switcher.click();
  expect(dock.character).toBe('takina');
});

test('setCharacter rejects unknown characters', () => {
  const dock = mount();
  expect(() => dock.setCharacter('missing')).toThrow('invalid character missing');
  expect(dock.character).toBe('takina');
});

test('uses sakana.character when given', () => {
  const dock = mount({ sakana: { character: 'chisato' } });
  expect(dock.character).toBe('chisato');
});

test('static mount creates and mounts a dock', () => {
  const dock = SakanaReDock.mount();
  docks.push(dock);
  expect(document.querySelectorAll('.sakana-redock')).toHaveLength(1);
});

test('mounting twice does not create a second dock', () => {
  const dock = mount();
  dock.mount();
  expect(document.querySelectorAll('.sakana-redock')).toHaveLength(1);
});

test('minimize and restore can be repeated without recreating the widget', () => {
  const dock = mount();
  const widget = dock.widget;
  const root = document.querySelector('.sakana-redock');
  const restoreButton = root.querySelector('.sakana-redock-restore');

  for (let i = 0; i < 3; i++) {
    root.querySelector('.sakana-redock-minimize').click();
    expect(dock.minimized).toBe(true);
    expect(root.classList.contains('sakana-redock--minimized')).toBe(true);
    expect(restoreButton.getAttribute('aria-hidden')).toBe('false');
    expect(restoreButton.tabIndex).toBe(0);
    expect(root.querySelector('.sakana-redock-body').hasAttribute('inert')).toBe(true);

    restoreButton.click();
    expect(dock.minimized).toBe(false);
    expect(root.classList.contains('sakana-redock--minimized')).toBe(false);
    expect(restoreButton.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('.sakana-redock-body').hasAttribute('inert')).toBe(false);
  }

  expect(dock.widget).toBe(widget);
});

test('remembers the minimized state', () => {
  mount().minimize();
  docks.pop().unmount();

  const dock = mount();
  expect(dock.minimized).toBe(true);
  expect(document.querySelector('.sakana-redock').classList).toContain('sakana-redock--minimized');
});

test('arrow keys on the move handle nudge and save the dock', () => {
  mount();
  const root = document.querySelector('.sakana-redock');
  const move = root.querySelector('.sakana-redock-move');

  move.dispatchEvent(new browser.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  expect(root.style.bottom).toBe('auto');
  expect(JSON.parse(localStorage.getItem('sakana-redock-position')).x).toBeNumber();
});

test('applies size and initial position options', () => {
  mount({ size: 240, mobileSize: 160, position: { left: 40 } });
  const root = document.querySelector('.sakana-redock');

  expect(root.style.getPropertyValue('--sakana-redock-size')).toBe('240px');
  expect(root.style.getPropertyValue('--sakana-redock-mobile-size')).toBe('160px');
  expect(root.style.left).toBe('40px');
  expect(root.style.bottom).toBe('10px');
});

test('uses custom labels', () => {
  mount({ labels: { move: 'Drag', minimize: 'Hide', switch: 'Next' } });
  const root = document.querySelector('.sakana-redock');

  expect(root.querySelector('.sakana-redock-move').getAttribute('aria-label')).toBe('Drag');
  expect(root.querySelector('.sakana-redock-move span').textContent).toBe('Drag');
  expect(root.querySelector('.sakana-redock-minimize').getAttribute('aria-label')).toBe('Hide');
  expect(root.querySelector('.sakana-redock-switch').getAttribute('aria-label')).toBe('Next');
  expect(root.querySelector('.sakana-redock-restore').getAttribute('aria-label')).toBe(
    'Restore widget',
  );
});

test('restores a saved position from localStorage', () => {
  localStorage.setItem('sakana-redock-position', JSON.stringify({ x: 0.5, y: 0.5 }));
  mount();
  const root = document.querySelector('.sakana-redock');

  expect(root.style.top).not.toBe('');
  expect(root.style.bottom).toBe('auto');
});

test('ignores a broken saved position', () => {
  localStorage.setItem('sakana-redock-position', '{broken');
  mount();
  const root = document.querySelector('.sakana-redock');

  expect(root.style.bottom).toBe('10px');
});

test('unmount removes the dock and destroy is an alias', () => {
  const dock = mount();
  dock.unmount();
  expect(document.querySelector('.sakana-redock')).toBeNull();
  expect(dock.widget).toBeNull();

  dock.mount();
  expect(document.querySelector('.sakana-redock')).not.toBeNull();
  dock.destroy();
  expect(document.querySelector('.sakana-redock')).toBeNull();
});

test('throws on an invalid mounting element', () => {
  expect(() => new SakanaReDock().mount('#missing')).toThrow('Invalid mounting element');
});
