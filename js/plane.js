// The plane: a white top-down glyph (same shape as the boarding pass's
// little plane, nose pointing right) with a soft route-yellow glow, i.e. a
// wider faint stroke of the same path underneath. No blur filters.
//
// It sits on the flight position from js/scroll-story.js, turns to follow
// the route, and lives in a counter-scaled .screen-size group, so it keeps
// its on-screen size (--plane-size) at any zoom. Everything is derived from
// scroll progress in the story's render, so it reverses cleanly.
(function () {
  const P = window.PACING;
  const PL = P.plane;
  const svg = document.getElementById("world");
  const root = document.documentElement;
  const sec = Object.fromEntries(P.sections.map((s) => [s.id, s]));

  root.style.setProperty("--plane-appear-scale", PL.appearScale);
  root.style.setProperty("--plane-fade", `${PL.fade}s`);

  // Glyph in a 24-unit box, centred on (12, 12).
  const GLYPH = "M22 12c0-.8-.7-1.3-1.5-1.3h-5.9L9.9 3.5H8.1l2.3 7.2H5.3L3.6 8.4H2.3l1 3.6-1 3.6h1.3l1.7-2.3h5.1l-2.3 7.2h1.8l4.7-7.2h5.9c.8 0 1.5-.5 1.5-1.3z";
  const GLYPH_BOX = 24;

  // layer: translate to the flight position (map units)
  //   .screen-size: counter-scaled by main.js, so 1 unit = 1 screen px
  //     appear: CSS fade + scale in/out (class is-visible)
  //       body: heading and size (+ takeoff/landing pulse)
  const NS = "http://www.w3.org/2000/svg";
  const make = (tag, cls) => {
    const el = document.createElementNS(NS, tag);
    el.setAttribute("class", cls);
    return el;
  };
  const layer = make("g", "plane-layer");
  layer.setAttribute("aria-hidden", "true");
  const screen = make("g", "screen-size");
  const appear = make("g", "plane-appear");
  const body = make("g", "plane");
  for (const cls of ["plane-glow", "plane-body"]) {
    const path = make("path", cls);
    path.setAttribute("d", GLYPH);
    body.append(path);
  }
  appear.append(body);
  screen.append(appear);
  layer.append(screen);
  svg.append(layer);         // on top of routes, cities and labels
  window.camera.refresh();   // give the new .screen-size group its scale

  // ---- Size: --plane-size (in u) as screen px ---------------------------------
  // Measured from a hidden probe, only when it can have changed (resize,
  // a change to :root).
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:0;top:0;height:0;width:var(--plane-size);visibility:hidden;pointer-events:none";
  document.body.append(probe);
  let sizePx = 0;
  const remeasure = () => { sizePx = 0; };
  window.addEventListener("resize", remeasure);
  new MutationObserver(remeasure).observe(root, { attributes: true, attributeFilter: ["style"] });

  // ---- Takeoff and landing pulse --------------------------------------------------
  // 1 -> pulse -> 1 over the camera's takeoff and landing segments.
  // Read from PACING now and again when the timeline changes (js/timeline.js).
  let legs = {};
  function readLegs() {
    legs = Object.fromEntries(Object.entries(P.passes.legs).map(([routeId, leg]) => {
      const s = sec[leg.flight];
      const cfg = P.camera[leg.flight];
      return [routeId, { from: s.from, to: s.to, takeoff: cfg.takeoff, landing: cfg.landing }];
    }));
  }
  readLegs();
  window.addEventListener("timelinechange", readLegs);
  function pulseAt(routeId, pct) {
    const L = legs[routeId];
    let t = -1;
    if (pct >= L.from && pct < L.from + L.takeoff) t = (pct - L.from) / L.takeoff;
    else if (pct > L.to - L.landing && pct <= L.to) t = (pct - (L.to - L.landing)) / L.landing;
    return t < 0 ? 1 : 1 + (PL.pulse - 1) * Math.sin(Math.PI * t);
  }

  // ---- Heading ----------------------------------------------------------------------
  // Route direction between two points headingKm either side of the plane
  // (clamped to the route's ends, so it stays calm at the start and end).
  // Map and screen share orientation, so this is the on-screen direction.
  function routeHeading(routeId, km) {
    const total = window.story.pointAt(routeId, 1).km;
    const a = window.story.pointAt(routeId, Math.max(0, km - PL.headingKm) / total);
    const b = window.story.pointAt(routeId, Math.min(total, km + PL.headingKm) / total);
    return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  }

  // The drawn heading eases toward the route's, the short way round (no 360°
  // spins where the angle wraps), and keeps easing for a few frames after
  // the scroll has settled.
  const shortest = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
  let angle = null, target = 0, lastTurn = 0, turning = false;

  function turn(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastTurn) / 1000));
    lastTurn = now;
    const d = shortest(target - angle);
    angle = Math.abs(d) < 0.05 ? target : angle + d * (1 - Math.exp(-dt / PL.turnSmoothing));
  }

  // ---- Drawing ----------------------------------------------------------------------
  let pos = { x: 0, y: 0 }, scale = 1, shown = null, lastLayer = "", lastBody = "";

  function draw() {
    const tl = `translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)})`;
    if (tl !== lastLayer) { layer.setAttribute("transform", tl); lastLayer = tl; }
    const k = (sizePx / GLYPH_BOX) * scale;
    const tb = `rotate(${angle.toFixed(2)}) scale(${k.toFixed(4)}) translate(${-GLYPH_BOX / 2} ${-GLYPH_BOX / 2})`;
    if (tb !== lastBody) { body.setAttribute("transform", tb); lastBody = tb; }
  }

  function settle(now) {
    turn(now);
    draw();
    if (angle !== target) requestAnimationFrame(settle);
    else turning = false;
  }

  window.story.onRender((p) => {
    const pct = p * 100;
    const leg = window.story.plane();
    if (!sizePx) sizePx = probe.getBoundingClientRect().width;

    pos = leg.pos;
    scale = pulseAt(leg.routeId, pct);

    // Only follow the route while visible; while hidden (fading out) the
    // heading stays put. Showing again starts from the route's heading.
    if (leg.visible) {
      target = routeHeading(leg.routeId, leg.pos.km);
      target = angle === null ? target : angle + shortest(target - angle);
      if (!shown || angle === null) angle = target;
    }
    if (angle === null) angle = target;
    const now = performance.now();
    turn(now);
    draw();
    if (angle !== target && !turning) {
      turning = true;
      requestAnimationFrame(settle);
    }

    // Position first, then the class, so it fades in at the right spot.
    if (leg.visible !== shown) {
      appear.classList.toggle("is-visible", leg.visible);
      shown = leg.visible;
    }
  });
})();
