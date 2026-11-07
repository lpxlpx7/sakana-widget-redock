/**
 * resolve a selector or element to an element
 */
export function resolveElement(el: HTMLElement | string) {
  if (typeof el === 'string') {
    return document.querySelector<HTMLElement>(el);
  }
  return el;
}

/**
 * clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(min, value), max);
}

/**
 * read a json value from localStorage, storage is optional
 */
export function readStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * write a json value to localStorage, storage is optional
 */
export function writeStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore restricted browsing contexts
  }
}
