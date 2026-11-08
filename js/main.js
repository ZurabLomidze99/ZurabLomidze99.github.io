// Puts the generated map (js/world-map.js) into the page, runs the map
// camera.
(function () {
  const map = window.WORLD_MAP;
  const stage = document.querySelector(".stage");
  document.getElementById("map").innerHTML = map.svg;
  const svg = document.getElementById("world");

  // Keys typed into form controls are not shortcuts.
  function isTyping(e) {
    const el = e.target;
    return el instanceof Element && (el.closest("input, textarea, select, [contenteditable]") !== null);
  }
  // Live list: groups added later (the plane, js/plane.js) are included.
  const screenSizeGroups = svg.getElementsByClassName("screen-size");

  // ===========================================================================
  // Camera
  //   final view = story camera (driven by scroll, js/scroll-story.js) + user offset
  //   (Ctrl+wheel / pinch zoom, drag pan). Everything moves by changing the
  //   SVG viewBox, so all layers share one coordinate system.
  // ===========================================================================
  const MAP_W = map.width;
  const MAP_H = map.height;
  const MIN_ZOOM = 1;              // 1 = whole map fits the screen
  const MAX_ZOOM = 12;             // combined limit: story camera x user zoom (wide layout)
  let maxZoom = MAX_ZOOM;          // the current layout's limit (portrait: PACING.camera.portrait.maxZoom)
  const WHEEL_ZOOM_SPEED = 0.0025; // per wheel delta pixel; bigger = faster zoom
  const SMOOTHING = 0.09;          // seconds; bigger = floatier zoom

  // Story camera: where the scroll timeline wants to look (set via camera.setStory).
  const story = { cx: MAP_W / 2, cy: MAP_H / 2, zoom: 1 };

  // User offset on top of the story camera. `size` is 1 / user zoom (it
  // interpolates linearly, which keeps the point under the cursor fixed
  // while the zoom animates). `panX/panY` are in map units.
  const user = {
    target: { size: 1, panX: 0, panY: 0 },
    current: { size: 1, panX: 0, panY: 0 },
  };

  let viewPx = { w: 1, h: 1 };     // svg size in screen pixels
  let base = { w: MAP_W, h: MAP_H }; // view size at zoom 1 (screen aspect)

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const totalZoom = (s) => clamp(story.zoom / s.size, MIN_ZOOM, maxZoom);
  const userZoomedIn = () => user.target.size < 0.999;   // the user's own zoom, not the story's

  // Keep the view inside the map; if the view is wider than the map, centre it.
  function clampCenter(c, size, mapSize) {
    return size >= mapSize ? mapSize / 2 : clamp(c, size / 2, mapSize - size / 2);
  }

  // The user's pan is measured from where the story camera alone sits, with
  // its centre already kept inside the map (a view can be wider or taller than
  // the map allows, e.g. the ending). Measured from the raw story centre,
  // that clamp would turn into a pan offset, which a later resize (measure)
  // baked in, shifting every following view.
  function rectFor(s) {
    const z = totalZoom(s);
    const w = base.w / z, h = base.h / z;
    const cx = clampCenter(clampCenter(story.cx, w, MAP_W) + s.panX, w, MAP_W);
    const cy = clampCenter(clampCenter(story.cy, h, MAP_H) + s.panY, h, MAP_H);
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }

  // Pull the target back inside the map so the pan never drifts off-screen.
  function clampTarget() {
    const t = user.target;
    const r = rectFor(t);
    t.panX = r.x + r.w / 2 - clampCenter(story.cx, r.w, MAP_W);
    t.panY = r.y + r.h / 2 - clampCenter(story.cy, r.h, MAP_H);
  }

  function apply() {
    const r = rectFor(user.current);
    svg.setAttribute("viewBox", `${r.x} ${r.y} ${r.w} ${r.h}`);
    // Counter-scale dots and the plane so they keep their pixel size.
    const unitsPerPx = r.w / viewPx.w;
    for (const g of screenSizeGroups) g.setAttribute("transform", `scale(${unitsPerPx})`);
    stage.classList.toggle("is-zoomed", userZoomedIn());
  }

  // ---- Smoothing loop: current eases toward target, then stops ---------------
  let running = false;
  let last = 0;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const k = 1 - Math.exp(-dt / SMOOTHING);
    const c = user.current, t = user.target;
    c.size += (t.size - c.size) * k;
    c.panX += (t.panX - c.panX) * k;
    c.panY += (t.panY - c.panY) * k;
    const settled =
      Math.abs(t.size - c.size) < 1e-4 &&
      Math.abs(t.panX - c.panX) < 0.01 &&
      Math.abs(t.panY - c.panY) < 0.01;
    if (settled) Object.assign(c, t);
    apply();
    if (settled) { running = false; return; }
    requestAnimationFrame(tick);
  }
  function animate() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }

  // ---- Ctrl+wheel / trackpad pinch: zoom around the cursor -------------------
  // Non-passive so preventDefault stops the browser's own page zoom.
  stage.addEventListener("wheel", (e) => {
    if (!e.ctrlKey) return;        // plain wheel keeps scrolling the page
    e.preventDefault();
    userMoved();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? viewPx.h : 1);
    const t = user.target;
    // Use the view as it is on screen right now (it may still be easing).
    const before = rectFor(user.current);
    const box = svg.getBoundingClientRect();
    const fx = (e.clientX - box.left) / box.width;
    const fy = (e.clientY - box.top) / box.height;
    // Map point under the cursor; keep it under the cursor after zooming.
    // Current and target both have it at (fx, fy), and the easing is linear
    // in view size and centre, so it stays put during the animation too.
    const px = before.x + fx * before.w;
    const py = before.y + fy * before.h;
    const z = clamp(totalZoom(t) * Math.exp(-dy * WHEEL_ZOOM_SPEED), MIN_ZOOM, maxZoom);
    t.size = story.zoom / z;
    const w = base.w / z, h = base.h / z;
    t.panX = px + (0.5 - fx) * w - clampCenter(story.cx, w, MAP_W);
    t.panY = py + (0.5 - fy) * h - clampCenter(story.cy, h, MAP_H);
    clampTarget();
    animate();
  }, { passive: false });

  // ---- Drag to pan (when zoomed in) ------------------------------------------
  let drag = null;
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.pointerType === "touch") return;  // touch: later (mobile)
    if (!userZoomedIn()) return;
    userMoved();
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer: no capture */ }
    stage.classList.add("is-dragging");
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const r = rectFor(user.current);
    const unitsPerPx = r.w / viewPx.w;
    const t = user.target;
    t.panX -= (e.clientX - drag.x) * unitsPerPx;
    t.panY -= (e.clientY - drag.y) * unitsPerPx;
    drag.x = e.clientX;
    drag.y = e.clientY;
    clampTarget();
    // Panning follows the pointer directly, no easing.
    user.current.panX = t.panX;
    user.current.panY = t.panY;
    apply();
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    stage.classList.remove("is-dragging");
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  // ---- Reset: double-click or Esc --------------------------------------------
  // Eases back; with instant = true it's at zero right away (the fade jump,
  // which resets while the screen is covered).
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");   // no easing back: the offset is gone at once
  function resetUserZoom(instant) {
    stopEaseBack();
    hasOffset = false;
    Object.assign(user.target, { size: 1, panX: 0, panY: 0 });
    if (instant === true || reducedMotion.matches) {
      Object.assign(user.current, user.target);
      apply();
    } else {
      animate();
    }
  }
  stage.addEventListener("dblclick", () => resetUserZoom());
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !isTyping(e)) resetUserZoom();
  });

  // ---- Scrolling on eases the user's offset back to the story camera ----------
  // Real page scroll beyond a small threshold (either direction, accumulated)
  // starts a smooth ease back to exactly zero offset. Ctrl+wheel and drag
  // don't scroll the page, so they never trigger it; starting either stops it.
  const Z = window.PACING.userZoom;
  let hasOffset = false;      // the user has zoomed or panned since the last reset
  let scrolled = 0;           // px scrolled since then
  let lastScrollY = window.scrollY;
  let easeBack = null;        // running ease-back tween

  // The user zoomed or started a drag: they're steering, so stop easing back.
  function userMoved() {
    stopEaseBack();
    hasOffset = true;
    scrolled = 0;
  }

  function stopEaseBack() {
    if (!easeBack) return;
    easeBack.kill();          // current and target stay where the ease left them
    easeBack = null;
  }

  // Zoom eases in log space (feels steady), pan linearly; current and target
  // move together, so the smoothing loop stays idle.
  function startEaseBack() {
    if (reducedMotion.matches) {   // reduced motion: back to zero offset at once
      Object.assign(user.current, { size: 1, panX: 0, panY: 0 });
      Object.assign(user.target, user.current);
      apply();
      hasOffset = false;
      return;
    }
    const from = { ...user.current };
    const logSize = Math.log(from.size);
    const p = { t: 0 };
    const set = (k) => {
      const s = { size: Math.exp(logSize * k), panX: from.panX * k, panY: from.panY * k };
      Object.assign(user.current, s);
      Object.assign(user.target, s);
      apply();
    };
    easeBack = gsap.to(p, {
      t: 1,
      duration: Z.easeBackDuration,
      ease: Z.easeBackEase,
      onUpdate: () => set(1 - p.t),
      onComplete: () => {
        set(0);               // exactly zero offset
        easeBack = null;
        hasOffset = false;
      },
    });
  }

  // Scrolls the page makes itself (keeping the story's progress through a
  // resize) are not the user scrolling.
  let scrollIgnored = false;
  function ignoreScroll(on) {
    scrollIgnored = on;
    lastScrollY = window.scrollY;
  }

  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (scrollIgnored) { lastScrollY = y; return; }
    scrolled = drag ? 0 : scrolled + Math.abs(y - lastScrollY);   // the user is steering while dragging
    lastScrollY = y;
    if (hasOffset && !easeBack && scrolled >= Z.scrollThreshold) startEaseBack();
  }, { passive: true });

  // ---- Fit to window ------------------------------------------------------------
  // The viewBox always has the screen's aspect ratio, so the visible area is
  // exactly the viewBox (no letterboxing to account for).
  function measure() {
    viewPx = { w: svg.clientWidth || 1, h: svg.clientHeight || 1 };
    const aspect = viewPx.w / viewPx.h;
    base = aspect > MAP_W / MAP_H
      ? { w: MAP_H * aspect, h: MAP_H }
      : { w: MAP_W, h: MAP_W / aspect };
    clampTarget();
    Object.assign(user.current, user.target);
    apply();
  }
  measure();
  window.addEventListener("resize", () => {
    measure();
    lastScrollY = window.scrollY;   // a resize can shift the scroll position; that's not the user scrolling
  });

  // Used by the scroll story.
  window.camera = {
    setStory(next) { Object.assign(story, next); clampTarget(); apply(); },
    setZoomLimit(z) { maxZoom = z || MAX_ZOOM; },   // per layout (js/scroll-story.js); no value: the wide limit
    refresh: apply,            // re-apply the view (e.g. after adding a .screen-size group)
    ignoreScroll,              // (true/false) page scrolls meanwhile don't count toward the ease-back
    resetUserZoom,             // (instant) back to zero offset: eased, or right away
    baseSize: () => base,      // view size (map units) at zoom 1 for this screen shape
    // Read by the desktop snapshot harness (tools/desktop-snapshot.js), a dev tool.
    view: () => rectFor(user.current),
    userOffset: () => ({ ...user.current, easingBack: !!easeBack }),
  };
})();
