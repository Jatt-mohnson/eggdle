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

  // Safety: if the page loses focus mid-hold, drop both directions.
  window.addEventListener('blur', () => {
    const g = getGame();
    if (g) {
      g.input.left = false;
      g.input.right = false;
    }
  });
}
