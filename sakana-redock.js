(function (global) {
  "use strict";

  const defaults = {
    target: document.body,
    character: "takina",
    size: 200,
    mobileSize: 145,
    position: { left: 18, bottom: 10 },
    storageKey: "sakana-dock-position",
    labels: {
      move: "Move",
      minimize: "Minimize widget",
      restore: "Restore widget"
    },
    sakana: {}
  };

  function resolveTarget(target) {
    if (typeof target === "string") {
      return document.querySelector(target);
    }
    return target;
  }

  function mergeOptions(options) {
    return {
      ...defaults,
      ...options,
      position: { ...defaults.position, ...(options.position || {}) },
      labels: { ...defaults.labels, ...(options.labels || {}) },
      sakana: { ...defaults.sakana, ...(options.sakana || {}) }
    };
  }

  function readStoredPosition(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  }

  function writeStoredPosition(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage is optional.
    }
  }

  function createButton(className, label, icon) {
    const button = document.createElement("button");
    button.className = className;
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = icon;
    return button;
  }

  class SakanaReDockInstance {
    constructor(options) {
      this.options = mergeOptions(options || {});
      this.target = resolveTarget(this.options.target);
      this.widget = null;
      this.dock = null;
      this.mountPoint = null;
      this.handle = null;
      this.minimizeButton = null;
      this.restoreButton = null;
      this.resizeHandler = null;
    }

    mount() {
      if (!this.target) {
        throw new Error("SakanaReDock target was not found");
      }
      if (!global.SakanaWidget) {
        throw new Error("SakanaWidget must be loaded before SakanaReDock");
      }
      if (this.dock) {
        return this;
      }

      this.dock = document.createElement("div");
      this.dock.className = "sakana-dock";
      this.dock.style.setProperty("--sakana-dock-size", `${this.options.size}px`);
      this.dock.style.setProperty("--sakana-dock-mobile-size", `${this.options.mobileSize}px`);
      this.dock.style.left = `${this.options.position.left}px`;
      this.dock.style.bottom = `${this.options.position.bottom}px`;

      this.restoreButton = createButton(
        "sakana-dock__restore",
        this.options.labels.restore,
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5M3 8l6-6M21 8l-6-6M21 16l-6 6M3 16l6 6"></path></svg>'
      );
      this.restoreButton.hidden = true;

      this.handle = createButton(
        "sakana-dock__move",
        this.options.labels.move,
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"></path></svg><span></span>'
      );
      this.handle.querySelector("span").textContent = this.options.labels.move;

      this.minimizeButton = createButton(
        "sakana-dock__minimize",
        this.options.labels.minimize,
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path></svg>'
      );

      this.mountPoint = document.createElement("div");
      this.mountPoint.className = "sakana-dock__widget";

      this.dock.append(this.restoreButton, this.handle, this.minimizeButton, this.mountPoint);
      this.target.appendChild(this.dock);

      this.widget = new global.SakanaWidget({
        autoFit: true,
        character: this.options.character,
        controls: true,
        rod: true,
        draggable: true,
        stroke: { color: "#a8a8a8", width: 8 },
        ...this.options.sakana
      }).mount(this.mountPoint);

      this.bindControls();
      this.restorePosition();
      return this;
    }

    bindControls() {
      this.minimizeButton.addEventListener("click", () => this.minimize());
      this.restoreButton.addEventListener("click", () => this.restore());

      let offsetX = 0;
      let offsetY = 0;

      this.handle.addEventListener("pointerdown", (event) => {
        const rect = this.dock.getBoundingClientRect();
        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;
        this.dock.classList.add("is-moving");
        this.handle.setPointerCapture(event.pointerId);
        event.preventDefault();
      });

      this.handle.addEventListener("pointermove", (event) => {
        if (!this.handle.hasPointerCapture(event.pointerId)) {
          return;
        }
        this.setPosition(event.clientX - offsetX, event.clientY - offsetY);
      });

      const finishDrag = (event) => {
        if (!this.handle.hasPointerCapture(event.pointerId)) {
          return;
        }
        this.handle.releasePointerCapture(event.pointerId);
        this.dock.classList.remove("is-moving");
        const rect = this.dock.getBoundingClientRect();
        this.setPosition(rect.left, rect.top, true);
      };

      this.handle.addEventListener("pointerup", finishDrag);
      this.handle.addEventListener("pointercancel", finishDrag);

      this.resizeHandler = () => {
        const rect = this.dock.getBoundingClientRect();
        this.setPosition(rect.left, rect.top);
      };
      global.addEventListener("resize", this.resizeHandler);
    }

    setPosition(left, top, persist) {
      const gap = 6;
      const maxLeft = Math.max(gap, global.innerWidth - this.dock.offsetWidth - gap);
      const maxTop = Math.max(gap + 24, global.innerHeight - this.dock.offsetHeight - gap);
      const safeLeft = Math.min(Math.max(gap, left), maxLeft);
      const safeTop = Math.min(Math.max(gap + 24, top), maxTop);

      this.dock.style.left = `${safeLeft}px`;
      this.dock.style.top = `${safeTop}px`;
      this.dock.style.right = "auto";
      this.dock.style.bottom = "auto";

      if (persist) {
        writeStoredPosition(this.options.storageKey, {
          x: safeLeft / Math.max(1, global.innerWidth - this.dock.offsetWidth),
          y: safeTop / Math.max(1, global.innerHeight - this.dock.offsetHeight)
        });
      }
    }

    restorePosition() {
      const position = readStoredPosition(this.options.storageKey);
      if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
        return;
      }
      this.setPosition(
        position.x * Math.max(1, global.innerWidth - this.dock.offsetWidth),
        position.y * Math.max(1, global.innerHeight - this.dock.offsetHeight)
      );
    }

    minimize() {
      this.dock.classList.add("is-minimized");
      this.restoreButton.hidden = false;
      return this;
    }

    restore() {
      this.dock.classList.remove("is-minimized");
      this.restoreButton.hidden = true;
      global.requestAnimationFrame(() => global.dispatchEvent(new Event("resize")));
      return this;
    }

    destroy() {
      if (this.widget) {
        this.widget.unmount();
      }
      if (this.resizeHandler) {
        global.removeEventListener("resize", this.resizeHandler);
      }
      if (this.dock) {
        this.dock.remove();
      }
      this.widget = null;
      this.dock = null;
    }
  }

  global.SakanaReDock = {
    mount(options) {
      return new SakanaReDockInstance(options).mount();
    }
  };
})(window);
