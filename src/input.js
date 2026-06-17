// Input → game.input.{left,right}; the sim reads it each fixed step.
// Two ways in: keyboard (←/→, A/D) and on-screen hold-buttons (touch/mobile).
// Both just set the same left/right intent; "hold to hold a side, release to recenter".

export function attachInput(canvas, getGame) {
  // --- keyboard ---
  const onKey = (down) => (e) => {
    const g = getGame();
    if (!g) return;
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        g.input.left = down;
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        g.input.right = down;
        e.preventDefault();
        break;
    }
  };
  window.addEventListener('keydown', onKey(true));
  window.addEventListener('keyup', onKey(false));

  // --- on-screen hold-buttons (mobile) ---
  // Press-and-hold sets the side; releasing (up/cancel/leave) clears it. Pointer capture
  // keeps the release reliable even if the thumb slides off the button.
  const bindHold = (el, side) => {
    if (!el) return;
    const set = (v) => {
      const g = getGame();
      if (g) g.input[side] = v;
    };
    // iOS commits double-tap-to-zoom on the *second touchstart*, not touchend — and
    // in-app browsers (e.g. a link opened from Slack) ignore the document touchend
    // guard below entirely. Cancelling the zone's touchstart default kills the zoom
    // at the source. Pointer events are a separate stream and still fire, so the
    // move logic (pointerdown/up) below is unaffected. Must be { passive: false }.
    el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      set(true);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    });
    const clear = (e) => {
      e.preventDefault();
      set(false);
    };
    el.addEventListener('pointerup', clear);
    el.addEventListener('pointercancel', clear);
    el.addEventListener('lostpointercapture', () => set(false));
    // contextmenu fires on long-press; suppress it so holding doesn't pop a menu.
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  bindHold(document.getElementById('btn-left'), 'left');
  bindHold(document.getElementById('btn-right'), 'right');

  // --- kill every iOS zoom path -------------------------------------------
  // iPhone Safari ignores maximum-scale / user-scalable=no, and touch-action
  // alone doesn't reliably stop these. This is a fixed, non-scrolling game, so
  // we swallow the browser's default touch gestures wholesale. Listeners must be
  // { passive: false } or preventDefault() is a no-op on touch events.

  // Pinch-zoom — the main culprit here, since play means holding one side while
  // pressing the other (two fingers). The gesture that actually starts the zoom
  // is a multi-touch touchmove; preventing it is what stops the pinch. The iOS
  // proprietary gesture* events are belt-and-suspenders for the same thing.
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false }
  );
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  }

  // Double-tap-to-zoom — two quick side-taps (move left, then right) get read as
  // a double-tap and zoom into the tap point. Suppress any tap within 300ms of
  // the previous one; buttons (menu/result overlay) are excluded so their taps
  // still register normally.
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300 && !e.target.closest('button')) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false }
  );

  // Safety: if the page loses focus mid-hold, drop both directions.
  window.addEventListener('blur', () => {
    const g = getGame();
    if (g) {
      g.input.left = false;
      g.input.right = false;
    }
  });
}
