// Snap stops (touch only): on a phone or tablet a flick stops at the next
// stop, and the next flick goes on to the one after. CSS scroll snapping does
// the work: html gets scroll-snap-type: y mandatory (class .is-snapping, only
// under pointer: coarse in css/style.css) and tiny marker elements with
// scroll-snap-align and scroll-snap-stop: always sit at these scroll
// positions (PACING.snap):
//   the title (the page top); the middle of each story card; the middle of
//   each boarding pass (its boarding stretch); a third and two thirds into
//   each flight; the ending at rest; stops through the ending at most
//   PACING.snap.endingStep of the visible height apart; the page bottom.
// Positions come from the same numbers as everything else (PACING, rewritten
// for this screen by js/timeline.js) and are rebuilt after each ScrollTrigger
// refresh (load, the resize settle) and when the ending's height changes.
//
// Scrolls the page makes itself (rail and bar scrolls, the fade jump, the
// resize and rotation restore) must not be snapped: they call
// hold() before and release() after, and snapping is off in between. On
// release, if the page is on a stop, snapping is back on at once (no visible
// re-snap: the page is already where it would snap to). If not (a restore
// mid-flight, the CONTACT button's card reveal), snapping stays off until the
// visitor's next touch: at that touchstart the spot where the page rests
// becomes a temporary stop and snapping goes on, so turning it on moves
// nothing; the flick then goes to the next real stop, and the temporary one is
// dropped once the page has come to rest somewhere else.
// Off while the page is pinch-zoomed (it waits for the next touch again).
//
// Mouse devices (PACING.snap.desktop "stops"): no markers and no CSS snapping.
// Measured in the preview (Chromium): with scroll-snap-type mandatory or
// proximity a wheel burst still passed stops (scroll-snap-stop: always was not
// honoured for it; a burst snapped to the stop nearest where it ended), and a
// single notch under half a stop's distance snapped back, so slow wheels
// could not leave a stop. So the stops are kept by a small limiter instead,
// from the same stop list (desktopStops below): a gesture is a run of wheel
// events (or key presses) less than PACING.snap.wheelGap apart in one
// direction; it scrolls the page itself, a notch at a time, and is pinned at
// the next stop in its direction; the next gesture, after a pause, goes on
// from there. Between stops it scrolls freely. The story is scrubbed, so
// jumping a notch at a time is smoothed like any scroll. It leaves alone: a
// scroll container under the pointer that can scroll itself (a long card's
// text), Ctrl+wheel (zoom), the CV and photo viewers (page locked), the page
// while it scrolls itself (hold), pinch zoom, form fields, and the ending
// below its rest stop going down (the page's own scrolling). Keys: arrows (one
// line), Space / PageDown / PageUp (a share of the screen), Space only when
// nothing else has focus; Home and End are explicit jumps and stay native.
(function () {
  const P = window.PACING;
  const S = P.snap;
  const STORY = window.STORY;
  const story = window.story;
  const root = document.documentElement;
  const ending = document.querySelector(".ending");

  const STOP_OF = { georgia: "georgia", usa: "southDakota", prague: "czechia" };   // section -> stop id (the key in PACING.cards)
  const legs = Object.values(P.passes.legs);
  const BOARDING = legs.map((l) => l.boarding);
  const FLYING = legs.map((l) => l.flight);

  const layer = document.createElement("div");
  layer.className = "snap-stops";
  layer.setAttribute("aria-hidden", "true");

  // CSS lengths in px (the visible height, the chapter bar's clearance).
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none";
  document.body.append(probe);
  function px(value) {
    probe.style.height = value;
    return probe.getBoundingClientRect().height;
  }

  let stops = [];        // { kind, y (px), pos (page position, or null past the ending at rest), end (aligned to the page bottom) }
  let here = null;       // the temporary stop: { y, el }
  let holds = 0;         // programmatic scrolls under way
  let pending = false;   // snapping waits for the visitor's next touch
  let on = false;
  let zoomed = false;    // pinch-zoomed
  let touches = 0;

  const active = () => S.enabled && window.layout.touch();
  const desktopOn = () => S.enabled && !window.layout.touch() && S.desktop === "stops";
  const maxScroll = () => root.scrollHeight - window.innerHeight;   // the real one, toolbar and all
  const stopY = (s) => (s.end ? maxScroll() : s.y);

  function setOn(v) {
    if (v === on) return;
    on = v;
    root.classList.toggle("is-snapping", v);
  }

  // ---- Where the stops are ------------------------------------------------------------
  function stopList() {
    const sec = Object.fromEntries(P.sections.map((s) => [s.id, s]));
    const out = [];
    const add = (kind, pos) => out.push({ kind, pos, y: story.yForPos(pos) });
    out.push({ kind: "title", pos: 0, y: 0 });   // the page top (the story starts there)
    for (const s of P.sections) {
      const len = s.to - s.from;
      if (STOP_OF[s.id]) {
        const range = P.cards[STOP_OF[s.id]];
        const n = STORY.stops.find((x) => x.id === STOP_OF[s.id]).cards.length;
        const step = (range.to - range.from) / n;
        for (let i = 0; i < n; i++) add(`${s.id} card ${i + 1}`, range.from + (i + 0.5) * step);
      } else if (BOARDING.includes(s.id)) {
        add(`${s.id} (pass)`, s.from + len / 2);
      } else if (FLYING.includes(s.id) && desktopOn()) {
        // Interior stops about flightStep screens apart, so the plane still advances in steps.
        const px = story.yForPos(s.to) - story.yForPos(s.from);
        const n = Math.max(1, Math.round(px / (S.flightStep * window.layout.screenHeight())));
        for (let k = 1; k < n; k++) add(`${s.id} ${k}/${n}`, s.from + (len * k) / n);
      } else if (FLYING.includes(s.id)) {
        add(`${s.id} 1/3`, s.from + len / 3);
        add(`${s.id} 2/3`, s.from + (2 * len) / 3);
      }
    }
    add("ending at rest", 200);
    if (desktopOn()) return out;   // no stops through the ending: the page scrolls on its own there
    const restY = story.yForPos(200);
    const bottom = root.scrollHeight - window.layout.screenHeight();
    for (const y of endingStops(restY, bottom)) out.push({ kind: "ending", pos: null, y });
    out.push({ kind: "page bottom", pos: null, y: bottom, end: true });
    return out;
  }

  // Through the ending, between the ending at rest and the page bottom: every
  // piece of its content that fits on the screen is fully visible at some
  // stop (the heading, the visiting card with its buttons, the CV folder,
  // Back to start; a piece taller than the screen is split into its parts),
  // and no two stops are more than endingStep of the visible height apart.
  // Visible: the small viewport (a phone's toolbar shown) less the chapter bar.
  function endingStops(restY, bottom) {
    if (bottom - restY <= S.tolerance) return [];
    const visible = px("var(--ui-h)") - px("var(--bottom-clear)");
    const ys = [restY, bottom];
    const fits = (p) => ys.some((y) => p.top >= y - 0.5 && p.bottom <= y + visible + 0.5);
    // Layout positions (offsets ignore transforms: the card's rise-in).
    const docTop = (el) => {
      let y = 0;
      for (let e = el; e; e = e.offsetParent) y += e.offsetTop;
      return y;
    };
    const pieces = [];
    (function collect(el) {
      for (const c of el.children) {
        if (!(c instanceof HTMLElement) || c.offsetHeight < 2 || c.offsetWidth < 2) continue;   // hidden helpers (the live region)
        const top = docTop(c);
        if (c.offsetHeight <= visible) pieces.push({ top, bottom: top + c.offsetHeight });
        else collect(c);
      }
    })(ending.querySelector(".ending-inner"));
    for (const p of pieces) {
      if (fits(p)) continue;
      // Where the piece is fully on screen: y from lo to hi. Of that range,
      // the spot farthest from the stops already there (no tiny hops).
      const lo = Math.max(restY, p.bottom - visible), hi = Math.min(bottom, p.top);
      if (hi < lo) continue;
      const m = Math.min(8, (hi - lo) / 2);   // not flush with the screen's edge
      const a = lo + m, b = hi - m;
      const clampTo = (y) => Math.min(b, Math.max(a, y));
      const sorted = [...ys].sort((x, y) => x - y);
      const candidates = [a, b, ...sorted.slice(1).map((y, i) => clampTo((y + sorted[i]) / 2))];
      const gap = (y) => Math.min(...ys.map((s) => Math.abs(s - y)));
      ys.push(candidates.reduce((best, y) => (gap(y) > gap(best) ? y : best)));
    }
    // Spacing: split any gap wider than endingStep of the visible height.
    const sorted = [...ys].sort((x, y) => x - y);
    const out = [];
    sorted.forEach((y, i) => {
      if (i > 0) {
        const span = y - sorted[i - 1];
        const n = Math.ceil(span / (S.endingStep * visible) - 1e-9);
        for (let k = 1; k < n; k++) out.push(sorted[i - 1] + (span * k) / n);
      }
      if (i > 0 && i < sorted.length - 1) out.push(y);
    });
    return out.sort((x, y) => x - y);
  }

  function marker(s) {
    const el = document.createElement("div");
    el.className = s.end ? "snap-stop is-end" : "snap-stop";
    if (!s.end) el.style.top = `${s.y}px`;
    return el;
  }

  function build() {
    if (desktopOn()) {   // no markers: the stop list is all the limiter needs
      stops = stopList();
      return;
    }
    if (!active()) {
      clear();
      return;
    }
    const next = stopList();
    const same = next.length === stops.length && next.every((s, i) => Math.abs(s.y - stops[i].y) < 0.5);
    if (same && layer.isConnected) return;
    // Moving a stop the page rests on would make the browser re-snap: off
    // meanwhile, and back on only if the page is still on a stop.
    const wasOn = on;
    if (wasOn) hold();
    stops = next;
    layer.replaceChildren(...stops.map(marker));
    if (here) layer.append(here.el);
    if (!layer.isConnected) document.querySelector(".story").append(layer);
    if (wasOn) release();
  }

  function clear() {
    setOn(false);
    pending = false;
    dropHere();
    stops = [];
    layer.replaceChildren();
    layer.remove();
  }

  const atStop = (y) => stops.some((s) => Math.abs(stopY(s) - y) <= S.tolerance) || (here && Math.abs(here.y - y) <= S.tolerance);

  // ---- The temporary stop -----------------------------------------------------------------
  function placeHere(y) {
    dropHere();
    here = { y, el: marker({ y }) };
    here.el.classList.add("is-here");
    layer.append(here.el);
  }
  function dropHere() {
    if (!here) return;
    here.el.remove();
    here = null;
  }

  // ---- On, off, waiting for a touch ---------------------------------------------------------
  // Snapping on from where the page is now, without moving it.
  function arm() {
    pending = false;
    if (!active() || holds || zoomed) return;
    const y = window.scrollY;
    if (!atStop(y)) placeHere(y);
    setOn(true);
  }

  function hold() {
    holds++;
    setOn(false);
    pending = false;
    dropHere();   // the page is about to leave it
  }
  function release() {
    holds = Math.max(0, holds - 1);
    if (holds || !active()) return;
    if (!zoomed && atStop(window.scrollY)) setOn(true);
    else pending = true;
  }

  // The visitor's next touch: a single finger, the page not pinch-zoomed.
  // Capture phase, after js/navigation.js (which stops a rail scroll first).
  window.addEventListener("touchstart", (e) => {
    touches = e.touches.length;
    if (pending && touches === 1) arm();
  }, { capture: true, passive: true });
  for (const type of ["touchend", "touchcancel"]) {
    window.addEventListener(type, (e) => { touches = e.touches.length; }, { capture: true, passive: true });
  }

  // The temporary stop goes once the page has come to rest somewhere else
  // (with snapping on, that is a real stop, so dropping it moves nothing).
  let restTimer = 0;
  function rested() {
    restTimer = 0;
    if (touches) return;
    if (here && on && Math.abs(window.scrollY - here.y) > S.tolerance) dropHere();
  }
  window.addEventListener("scroll", () => {
    if (!here) return;
    clearTimeout(restTimer);
    restTimer = setTimeout(rested, S.settle * 1000);
  }, { passive: true });
  window.addEventListener("touchend", () => {
    if (here && !restTimer) restTimer = setTimeout(rested, S.settle * 1000);
  }, { passive: true });

  // Pinch zoom: no snapping while zoomed in; back to waiting for a touch after.
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      const z = window.visualViewport.scale > 1.01;
      if (z === zoomed) return;
      zoomed = z;
      if (!active()) return;
      if (z) { setOn(false); dropHere(); }
      if (!holds) pending = true;
    });
  }

  // ---- When to rebuild ----------------------------------------------------------------------
  ScrollTrigger.addEventListener("refresh", build);   // after the page's own measuring (js/scroll-story.js)
  let endingTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(endingTimer);
    endingTimer = setTimeout(build, 100);
  }).observe(ending);
  window.addEventListener("layoutchange", (e) => {
    if (e.detail.touch === e.detail.previous.touch) return;
    if (!window.layout.touch()) { clear(); build(); }
    // Turning touch on: the resize settle that follows refreshes and rebuilds.
  });

  // ---- Desktop: a wheel or key gesture never passes the next stop ----------------------------
  let gesture = null;   // { dir, y0, y, stop, last }
  const locked = () => root.classList.contains("is-cv-open") || root.classList.contains("is-photos-open");

  // The first stop past y in a direction (the one the gesture will be pinned at).
  function nextStop(y, dir) {
    if (dir > 0) return stops.find((s) => s.y > y + S.tolerance) || null;
    for (let i = stops.length - 1; i >= 0; i--) if (stops[i].y < y - S.tolerance) return stops[i];
    return null;
  }

  // A scroll container that can scroll itself (a long card's text) keeps the wheel.
  function scrollsInside(el) {
    for (; el && el !== root && el !== document.body; el = el.parentElement) {
      const o = getComputedStyle(el).overflowY;
      if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight + 1) return true;
    }
    return false;
  }

  // dy: px, signed. Returns true when the gesture was ours.
  function step(dy, e) {
    const dir = Math.sign(dy);
    const now = performance.now();
    if (!gesture || gesture.dir !== dir || now - gesture.last > S.wheelGap * 1000) {
      gesture = { dir, y: window.scrollY, stop: nextStop(window.scrollY, dir) };
    }
    gesture.last = now;
    if (!gesture.stop) return false;   // nothing ahead: the page's own scrolling
    gesture.y += dy;
    const hit = dir > 0 ? gesture.y >= gesture.stop.y : gesture.y <= gesture.stop.y;
    e.preventDefault();
    window.scrollTo({ top: hit ? gesture.stop.y : Math.max(0, Math.min(maxScroll(), gesture.y)), behavior: "instant" });
    return true;
  }

  const idle = () => !desktopOn() || holds || zoomed || locked();

  window.addEventListener("wheel", (e) => {
    if (e.defaultPrevented || e.ctrlKey || idle()) return;
    if (!e.deltaY || Math.abs(e.deltaX) > Math.abs(e.deltaY) || scrollsInside(e.target)) return;
    const unit = e.deltaMode === 1 ? S.lineHeight : e.deltaMode === 2 ? window.innerHeight : 1;
    step(e.deltaY * unit, e);
  }, { capture: true, passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || idle()) return;
    const t = e.target;
    if (t.closest && t.closest("input, textarea, select, [contenteditable]")) return;
    const page = S.pageStep * window.innerHeight;
    let dy = 0;
    if (e.key === "ArrowDown") dy = S.lineHeight;
    else if (e.key === "ArrowUp") dy = -S.lineHeight;
    else if (e.key === "PageDown") dy = page;
    else if (e.key === "PageUp") dy = -page;
    else if (e.key === " " && (t === document.body || t === root)) dy = e.shiftKey ? -page : page;   // on a focused button, Space is its click
    if (dy) step(dy, e);
  }, { capture: true });
  window.addEventListener("keyup", () => { gesture = null; }, { capture: true });

  // ---- Start: after the browser has restored the scroll position (a reload) ------------------
  hold();
  build();
  function start() {
    setTimeout(() => {   // a timer, not a frame: a background tab gets no frames
      build();
      release();
    }, 50);
  }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });

  window.snap = {
    hold,
    release,
    isOn: () => on,
    // A chapter's target, moved onto the nearest stop while snapping is in use
    // (a rail or bar jump then lands where a flick would come to rest).
    near(pos) {
      if (!active()) return pos;
      const y = story.yForPos(pos);
      let best = null;
      for (const s of stops) {
        if (s.pos === null) continue;
        if (!best || Math.abs(s.y - y) < Math.abs(best.y - y)) best = s;
      }
      return best ? best.pos : pos;
    },
  };
})();
