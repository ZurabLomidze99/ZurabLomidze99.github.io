// Layout mode and viewport (mobile). The layout variables in css/style.css
// are the one source of truth: --layout ("wide" | "portrait") and the
// modifiers --layout-short and --layout-touch (0 or 1). This file reads them
// and fires "layoutchange" on window when any of them changes. Used by the
// chapter bar's fill axis (js/navigation.js) and the visiting card's flip
// mode (js/visiting-card.js).
//
// For the scroll story it also sorts each resize (on a phone, the browser
// toolbar moving is not a real resize) and gives the screen height from
// unit probes, which don't move with the toolbar the way innerHeight does.
// Mouse devices: every resize counts and innerHeight is used, as before.
//
// Android: code-reviewed only (no test device), written defensively, unverified.
(function () {
  const L = window.PACING.layout;
  const root = document.documentElement;

  // ---- Layout mode ----------------------------------------------------------------
  function readMode() {
    const cs = getComputedStyle(root);
    return {
      layout: cs.getPropertyValue("--layout").trim() || "wide",
      short: cs.getPropertyValue("--layout-short").trim() === "1",
      touch: cs.getPropertyValue("--layout-touch").trim() === "1",
    };
  }
  let mode = readMode();

  function checkMode() {
    const next = readMode();
    if (next.layout === mode.layout && next.short === mode.short && next.touch === mode.touch) return;
    const previous = mode;
    mode = next;
    window.dispatchEvent(new CustomEvent("layoutchange", { detail: { ...mode, previous } }));
  }

  // ---- Unit probes ----------------------------------------------------------------
  // Heights of --stage-h and --ui-h (100lvh and 100svh, or 100vh where those
  // units don't exist): the large and small viewport. Unlike innerHeight they
  // stay put while a phone's toolbar collapses or returns.
  function probe(height) {
    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = `position:fixed;left:0;top:0;width:0;height:${height};visibility:hidden;pointer-events:none`;
    document.body.append(el);
    return el;
  }
  const largeProbe = probe("var(--stage-h)");
  const smallProbe = probe("var(--ui-h)");

  // Width: the layout viewport's (clientWidth), which pinch zoom doesn't change.
  const viewport = () => ({
    w: root.clientWidth,
    large: largeProbe.getBoundingClientRect().height,
    small: smallProbe.getBoundingClientRect().height,
  });

  // A field that brings up the on-screen keyboard.
  const NO_KEYBOARD = /^(checkbox|radio|button|submit|reset|range|color|file|image)$/;
  function typing() {
    const el = document.activeElement;
    if (!el || !el.matches("input, textarea, select, [contenteditable]")) return false;
    return !(el.matches("input") && NO_KEYBOARD.test(el.type));
  }

  // ---- What kind of resize --------------------------------------------------------
  //   "mouse":  not a touch device: handled as always.
  //   "touch":  touch device, and the width changed (rotation), or the probe
  //             heights moved by more than a toolbar: handled, settling for
  //             PACING.layout.touchSettle.
  //   "ignore": touch device, same width, and the probe heights moved by no
  //             more than PACING.layout.toolbarTolerance (a toolbar; where
  //             lvh/svh exist they don't move at all), or a text field has
  //             focus (the keyboard), or the page is pinch-zoomed.
  // Compared with the last handled size, so small moves can't add up unseen.
  let handled = viewport();
  let kind = "mouse";

  function classify() {
    if (!mode.touch) return "mouse";
    const now = viewport();
    if (Math.abs(now.w - handled.w) >= 1) {
      handled = now;
      return "touch";
    }
    if (window.visualViewport && window.visualViewport.scale > 1.01) return "ignore";
    if (typing()) return "ignore";
    const moved = Math.max(Math.abs(now.large - handled.large), Math.abs(now.small - handled.small));
    if (moved <= L.toolbarTolerance) return "ignore";
    handled = now;
    return "touch";
  }

  // Registered before every other resize listener (this file loads first), so
  // they all see this resize's kind.
  window.addEventListener("resize", () => {
    checkMode();
    kind = classify();
  });

  window.layout = {
    mode: () => mode.layout,     // "wide" | "portrait"
    short: () => mode.short,
    touch: () => mode.touch,
    resizeKind: () => kind,      // of the latest resize: "mouse" | "touch" | "ignore"
    // Screen height for scroll maths: innerHeight with a mouse (as before); on
    // touch the large viewport, which doesn't move with the toolbar.
    screenHeight: () => (mode.touch ? largeProbe.getBoundingClientRect().height : window.innerHeight),
  };
})();
