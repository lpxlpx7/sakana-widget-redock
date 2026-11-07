import './index.scss';
import SakanaWidget from 'sakana-widget';
import type { SakanaWidgetOptions } from 'sakana-widget';

import { svgMinimize, svgMove, svgRestore, svgSwitch } from './icons';
import { clamp, readStorage, resolveElement, writeStorage } from './utils';

export interface SakanaReDockPosition {
  /**
   * distance from the left edge of the viewport in px
   */
  left: number;
  /**
   * distance from the bottom edge of the viewport in px
   */
  bottom: number;
}

export interface SakanaReDockLabels {
  move: string;
  minimize: string;
  restore: string;
  switch: string;
}

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
  position?: Partial<SakanaReDockPosition>;
  /**
   * localStorage key for the dock position and minimized state, default to `sakana-redock-position`
   */
  storageKey?: string;
  /**
   * button labels, default to `Move`, `Minimize widget`, `Restore widget` & `Switch character`
   */
  labels?: Partial<SakanaReDockLabels>;
  /**
   * options forwarded to the inner `SakanaWidget`
   */
  sakana?: SakanaWidgetOptions;
}

interface SakanaReDockStoredState {
  x?: number;
  y?: number;
  minimized?: boolean;
}

const defaultOptions = {
  character: 'takina',
  size: 200,
  mobileSize: 145,
  position: { left: 18, bottom: 10 },
  storageKey: 'sakana-redock-position',
  labels: {
    move: 'Move',
    minimize: 'Minimize widget',
    restore: 'Restore widget',
    switch: 'Switch character',
  },
  sakana: {},
};

const defaultSakanaOptions: SakanaWidgetOptions = {
  autoFit: true,
  controls: false,
  rod: true,
  draggable: true,
  stroke: { color: '#a8a8a8', width: 8 },
};

/**
 * gap between the dock and the viewport edges
 */
const EDGE_GAP = 6;
/**
 * extra top space reserved for the toolbar
 */
const TOOLBAR_SPACE = 24;
/**
 * keyboard nudge distance of the move handle, with and without shift
 */
const NUDGE = 10;
const NUDGE_LARGE = 40;

function createButton(className: string, label: string, icon: string) {
  const button = document.createElement('button');
  button.className = className;
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = icon;
  return button;
}

function createElement(className: string, tag = 'div') {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}

/**
 * restart a css animation by toggling its class
 */
function replayAnimation(el: HTMLElement, className: string) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

/**
 * dock instance class
 */
class SakanaReDock {
  private _options: Required<Omit<SakanaReDockOptions, 'position' | 'labels'>> & {
    position: SakanaReDockPosition;
    labels: SakanaReDockLabels;
  };
  private _widget: SakanaWidget | null = null;
  private _character: string;
  private _minimized = false;

  private _domDock: HTMLDivElement | null = null;
  private _domBody: HTMLDivElement | null = null;
  private _domMount: HTMLDivElement | null = null;
  private _domMove: HTMLButtonElement | null = null;
  private _domMinimize: HTMLButtonElement | null = null;
  private _domSwitch: HTMLButtonElement | null = null;
  private _domName: HTMLElement | null = null;
  private _domRestore: HTMLButtonElement | null = null;
  private _domAvatar: HTMLElement | null = null;

  private _dragOffset = { x: 0, y: 0 };

  /**
   * @public
   * @static
   * create and mount a dock in one call
   */
  static mount = (options?: SakanaReDockOptions, el: HTMLElement | string = document.body) =>
    new SakanaReDock(options).mount(el);

  constructor(options: SakanaReDockOptions = {}) {
    this._options = {
      ...defaultOptions,
      ...options,
      position: { ...defaultOptions.position, ...options.position },
      labels: { ...defaultOptions.labels, ...options.labels },
      sakana: { ...defaultOptions.sakana, ...options.sakana },
    };
    this._character = this._options.sakana.character ?? this._options.character;
  }

  /**
   * @public
   * get the inner sakana widget instance
   */
  get widget() {
    return this._widget;
  }

  /**
   * @public
   * whether the dock is currently minimized
   */
  get minimized() {
    return this._minimized;
  }

  /**
   * @public
   * name of the current character
   */
  get character() {
    return this._character;
  }

  /**
   * @private
   * create dock dom elements
   */
  private _createDom = () => {
    const { size, mobileSize, position, labels } = this._options;

    const dock = createElement('sakana-redock') as HTMLDivElement;
    dock.style.setProperty('--sakana-redock-size', `${size}px`);
    dock.style.setProperty('--sakana-redock-mobile-size', `${mobileSize}px`);
    dock.style.left = `${position.left}px`;
    dock.style.bottom = `${position.bottom}px`;

    // toolbar: move handle + minimize
    const toolbar = createElement('sakana-redock-toolbar');
    const move = createButton('sakana-redock-move', labels.move, svgMove);
    const moveText = createElement('sakana-redock-move-text', 'span');
    moveText.textContent = labels.move;
    move.appendChild(moveText);
    const minimize = createButton('sakana-redock-minimize', labels.minimize, svgMinimize);
    toolbar.append(move, minimize);

    // widget mount point
    const mount = createElement('sakana-redock-widget') as HTMLDivElement;

    // stand: socket for the rod + character switch slab
    const stand = createElement('sakana-redock-stand');
    const socket = createElement('sakana-redock-socket');
    const switcher = createButton('sakana-redock-switch', labels.switch, '');
    const name = createElement('sakana-redock-name', 'span');
    const switchIcon = createElement('sakana-redock-switch-icon', 'span');
    switchIcon.innerHTML = svgSwitch;
    switcher.append(name, switchIcon);
    stand.append(socket, switcher);

    const body = createElement('sakana-redock-body') as HTMLDivElement;
    body.append(toolbar, mount, stand);

    // restore chip shown while minimized
    const restore = createButton('sakana-redock-restore', labels.restore, '');
    const avatar = createElement('sakana-redock-avatar', 'span');
    const badge = createElement('sakana-redock-badge', 'span');
    badge.innerHTML = svgRestore;
    restore.append(avatar, badge);
    restore.tabIndex = -1;
    restore.setAttribute('aria-hidden', 'true');

    dock.append(body, restore);

    this._domDock = dock;
    this._domBody = body;
    this._domMount = mount;
    this._domMove = move;
    this._domMinimize = minimize;
    this._domSwitch = switcher;
    this._domName = name;
    this._domRestore = restore;
    this._domAvatar = avatar;
  };

  /**
   * @private
   * sync the stand label and restore avatar with the current character
   */
  private _updateCharacterDom = () => {
    if (this._domName) this._domName.textContent = this._character;
    if (this._domAvatar) {
      const image = SakanaWidget.getCharacter(this._character)?.image;
      this._domAvatar.style.backgroundImage = image ? `url('${image}')` : '';
    }
  };

  /**
   * @private
   * apply the minimized state to the dom
   */
  private _applyMinimized = () => {
    const dock = this._domDock;
    const body = this._domBody;
    const restore = this._domRestore;
    if (!dock || !body || !restore) return;

    const minimized = this._minimized;
    dock.classList.toggle('sakana-redock--minimized', minimized);
    body.toggleAttribute('inert', minimized);
    body.setAttribute('aria-hidden', String(minimized));
    restore.tabIndex = minimized ? 0 : -1;
    restore.setAttribute('aria-hidden', String(!minimized));
  };

  /**
   * @private
   * read and write the saved dock state
   */
  private _readState = () =>
    readStorage<SakanaReDockStoredState>(this._options.storageKey) ??
    ({} as SakanaReDockStoredState);

  private _writeState = (patch: SakanaReDockStoredState) => {
    writeStorage<SakanaReDockStoredState>(this._options.storageKey, {
      ...this._readState(),
      ...patch,
    });
  };

  /**
   * @private
   * move the dock inside the visible viewport
   */
  private _setPosition = (left: number, top: number, persist = false) => {
    const dock = this._domDock;
    if (!dock) return;

    const maxLeft = Math.max(EDGE_GAP, window.innerWidth - dock.offsetWidth - EDGE_GAP);
    const minTop = EDGE_GAP + TOOLBAR_SPACE;
    const maxTop = Math.max(minTop, window.innerHeight - dock.offsetHeight - EDGE_GAP);
    const safeLeft = clamp(left, EDGE_GAP, maxLeft);
    const safeTop = clamp(top, minTop, maxTop);

    dock.style.left = `${safeLeft}px`;
    dock.style.top = `${safeTop}px`;
    dock.style.right = 'auto';
    dock.style.bottom = 'auto';

    if (persist) {
      this._writeState({
        x: safeLeft / Math.max(1, window.innerWidth - dock.offsetWidth),
        y: safeTop / Math.max(1, window.innerHeight - dock.offsetHeight),
      });
    }
  };

  /**
   * @private
   * restore the saved relative position
   */
  private _restorePosition = (saved: SakanaReDockStoredState) => {
    const dock = this._domDock;
    if (!dock) return;
    if (!Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return;

    this._setPosition(
      saved.x! * Math.max(1, window.innerWidth - dock.offsetWidth),
      saved.y! * Math.max(1, window.innerHeight - dock.offsetHeight),
    );
  };

  /**
   * @private
   * handle pointer events on the move handle
   */
  private _onPointerDown = (e: PointerEvent) => {
    const dock = this._domDock;
    const move = this._domMove;
    if (!dock || !move || e.button !== 0) return;

    const rect = dock.getBoundingClientRect();
    this._dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dock.classList.add('sakana-redock--moving');
    move.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  private _onPointerMove = (e: PointerEvent) => {
    if (!this._domMove?.hasPointerCapture(e.pointerId)) return;
    this._setPosition(e.clientX - this._dragOffset.x, e.clientY - this._dragOffset.y);
  };

  private _onPointerUp = (e: PointerEvent) => {
    const dock = this._domDock;
    const move = this._domMove;
    if (!dock || !move?.hasPointerCapture(e.pointerId)) return;

    move.releasePointerCapture(e.pointerId);
    dock.classList.remove('sakana-redock--moving');
    const rect = dock.getBoundingClientRect();
    this._setPosition(rect.left, rect.top, true);
  };

  /**
   * @private
   * nudge the dock with arrow keys on the move handle
   */
  private _onMoveKeyDown = (e: KeyboardEvent) => {
    const dock = this._domDock;
    if (!dock) return;

    const step = e.shiftKey ? NUDGE_LARGE : NUDGE;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[e.key];
    if (!move) return;

    e.preventDefault();
    const rect = dock.getBoundingClientRect();
    this._setPosition(rect.left + move[0], rect.top + move[1], true);
  };

  /**
   * @private
   * keep the dock inside the viewport after resizing
   */
  private _onResize = () => {
    const dock = this._domDock;
    if (!dock) return;
    const rect = dock.getBoundingClientRect();
    this._setPosition(rect.left, rect.top);
  };

  private _onRestoreClick = () => {
    this.restore();
    this._domMove?.focus({ preventScroll: true });
  };

  private _onMinimizeClick = () => {
    this.minimize();
    this._domRestore?.focus({ preventScroll: true });
  };

  /**
   * @public
   * set current character of the dock and its widget
   */
  setCharacter = (name: string) => {
    if (!SakanaWidget.getCharacter(name)) throw new Error(`invalid character ${name}`);
    this._character = name;
    this._widget?.setCharacter(name);
    this._updateCharacterDom();
    if (this._domSwitch) replayAnimation(this._domSwitch, 'sakana-redock-switch--swap');
    return this;
  };

  /**
   * @public
   * switch to the next registered character
   */
  nextCharacter = () => {
    const names = Object.keys(SakanaWidget.getCharacters()).sort();
    const next = names[(names.indexOf(this._character) + 1) % names.length];
    if (next) this.setCharacter(next);
    return this;
  };

  /**
   * @public
   * minimize the dock without destroying the widget
   */
  minimize = () => {
    this._minimized = true;
    this._applyMinimized();
    if (this._domDock) this._writeState({ minimized: true });
    return this;
  };

  /**
   * @public
   * restore a minimized dock
   */
  restore = () => {
    this._minimized = false;
    this._applyMinimized();
    if (this._domDock) this._writeState({ minimized: false });
    return this;
  };

  /**
   * @public
   * mount the dock, default to `document.body`
   */
  mount = (el: HTMLElement | string = document.body) => {
    if (this._domDock) return this;

    const target = resolveElement(el);
    if (!target) {
      throw new Error('Invalid mounting element');
    }

    this._createDom();
    const dock = this._domDock!;
    const move = this._domMove!;
    target.appendChild(dock);

    this._widget = new SakanaWidget({
      ...defaultSakanaOptions,
      ...this._options.sakana,
      character: this._character,
    }).mount(this._domMount!);
    this._updateCharacterDom();

    this._domMinimize!.addEventListener('click', this._onMinimizeClick);
    this._domRestore!.addEventListener('click', this._onRestoreClick);
    this._domSwitch!.addEventListener('click', this.nextCharacter);
    move.addEventListener('pointerdown', this._onPointerDown);
    move.addEventListener('pointermove', this._onPointerMove);
    move.addEventListener('pointerup', this._onPointerUp);
    move.addEventListener('pointercancel', this._onPointerUp);
    move.addEventListener('keydown', this._onMoveKeyDown);
    window.addEventListener('resize', this._onResize);

    // restore saved state without playing transitions
    const saved = this._readState();
    if (typeof saved.minimized === 'boolean') this._minimized = saved.minimized;
    this._restorePosition(saved);
    this._applyMinimized();
    // a timer instead of animation frames, which never fire in background tabs
    window.setTimeout(() => dock.classList.add('sakana-redock--ready'), 50);
    return this;
  };

  /**
   * @public
   * unmount the dock and its widget
   */
  unmount = () => {
    window.removeEventListener('resize', this._onResize);
    this._widget?.unmount();
    this._domDock?.remove();

    this._widget = null;
    this._domDock = null;
    this._domBody = null;
    this._domMount = null;
    this._domMove = null;
    this._domMinimize = null;
    this._domSwitch = null;
    this._domName = null;
    this._domRestore = null;
    this._domAvatar = null;
    return this;
  };

  /**
   * @public
   * alias of `unmount`
   */
  destroy = () => this.unmount();
}

export default SakanaReDock;
export type { SakanaWidgetOptions } from 'sakana-widget';
