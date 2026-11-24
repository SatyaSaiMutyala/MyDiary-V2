// Department Master helpers — the prototype's template builders, re-aimed at POST /api/departments.

export const rid = () => Date.now() + Math.random().toString(36).slice(2, 5);

/**
 * Debounces by key, so typing in an inline row input sends one PATCH when the person stops typing
 * instead of one per keystroke. Toggles and chips stay immediate.
 */
export function makeDebouncer(delay = 450) {
  const timers = new Map();
  return (key, fn) => {
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => { timers.delete(key); fn(); }, delay));
  };
}
