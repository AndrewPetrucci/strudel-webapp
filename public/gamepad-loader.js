/**
 * Loads @strudel/gamepad and exposes it on globalThis so the REPL's eval scope
 * can use gamepad() without the REPL bundle having to include it.
 */
import('https://unpkg.com/@strudel/gamepad@1.2.6/dist/index.mjs')
  .then((m) => {
    const gamepad = m.gamepad ?? m.default?.gamepad ?? m.default;
    if (typeof gamepad === 'function') {
      globalThis.gamepad = gamepad;
    }
  })
  .catch((err) => console.warn('[strudel-webapp] Gamepad module failed to load:', err));
