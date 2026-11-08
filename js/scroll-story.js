// Scroll story: turns scroll position into story progress p (0-1) and
// renders everything from p alone, so it's fully reversible and can't miss
// a step when scrolling fast or jumping.
//
// Steps (a) + (b): sticky stage, story camera between the stops, flights
// (flight position by real distance, trail, camera following it), HUD line.
(function () {
  const P = window.PACING;
  const C = P.camera;
  const map = window.WORLD_MAP;
  const STORY = window.STORY;
  const camera = window.camera;
  const svg = document.getElementById("world");
  const track = document.querySelector(".story-track");   // the story's scroll length
  const ending = document.querySelector(".ending");
  const hud = document.querySelector(".hud");
  const root = document.documentElement;

  // The story's length (--story-screens) and the derived percents in PACING
  // come from js/timeline.js, which has already run.
  gsap.registerPlugin(ScrollTrigger);

  const sec = Object.fromEntries(P.sections.map((s) => [s.id, s]));
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const lerpPt = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

  // ---- Which stop / flight each section belongs to ----------------------------
  const stopOf = { georgia: "georgia", usa: "southDakota", prague: "czechia" };
  const flightOf = { pass1: "leg1", flight1: "leg1", pass2: "leg2", flight2: "leg2" };
  const stopById = Object.fromEntries(STORY.stops.map((s) => [s.id, s]));
  const flightById = Object.fromEntries(STORY.flights.map((f) => [f.id, f]));

  // ---- Places to frame (bounding-box centres in map units, read once) ---------
  function boxCentre(selector) {
    const b = svg.querySelector(selector).getBBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }
  const spot = {
    world: { x: map.width / 2, y: map.height / 2 },
    georgia: boxCentre('.place[data-country="GEO"]'),
    usa: boxCentre('.place[data-part="contiguous"]'),
    prague: boxCentre('.place[data-country="CZE"]'),
  };

  // ---- Flights: sampled route data, trail paths ---------------------------------
  // route.points: [lat, lon, cumulative km, x, y], evenly spaced by distance.
  const flights = {
    flight1: makeFlight("leg1", "flight1"),
    flight2: makeFlight("leg2", "flight2"),
  };

  // id: the flight's section, which is also its key in the camera profile.
  function makeFlight(routeId, id) {
    const section = sec[id];
    const route = map.routes.find((r) => r.id === routeId);
    const pts = route.points;
    const xs = pts.map((p) => p[3]), ys = pts.map((p) => p[4]);
    const group = svg.querySelector(`.route[data-route="${routeId}"]`);
    return {
      routeId, id, section, pts, group,
      get boardingFrom() { return sec[P.passes.legs[routeId].boarding].from; },   // % where this leg's boarding starts (read live: js/timeline.js rewrites it)
      totalKm: pts[pts.length - 1][2],
      trail: [...group.querySelectorAll(".route-trail path")],
      coords: pts.map((p) => `${p[3].toFixed(1)} ${p[4].toFixed(1)}`),
      centre: { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 },
      lastD: null,
      done: null,
    };
  }
  const flightByRoute = { leg1: flights.flight1, leg2: flights.flight2 };
  spot.ending = lerpPt(flights.flight1.centre, flights.flight2.centre, 0.5);
  // Centre of the three highlighted countries together (bounding box): the
  // portrait title view, which shows them all across the width.
  spot.places = (() => {
    const boxes = ['.place[data-country="GEO"]', '.place[data-part="contiguous"]', '.place[data-country="CZE"]']
      .map((s) => svg.querySelector(s).getBBox());
    const x0 = Math.min(...boxes.map((b) => b.x)), x1 = Math.max(...boxes.map((b) => b.x + b.width));
    const y0 = Math.min(...boxes.map((b) => b.y)), y1 = Math.max(...boxes.map((b) => b.y + b.height));
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
  })();

  // ---- Camera profile: the numbers for the current layout ---------------------------
  // PACING.camera, with PACING.camera.portrait laid over it in the portrait
  // layout (a view's object is merged field by field). Re-applied on
  // layoutchange.
  function profileFor(mode) {
    if (mode !== "portrait" || !C.portrait) return C;
    const out = { ...C };
    for (const [k, v] of Object.entries(C.portrait)) {
      out[k] = v && typeof v === "object" ? { ...C[k], ...v } : v;
    }
    return out;
  }
  let cam = C;
  let KEYS = [];
  function applyProfile() {
    cam = profileFor(window.layout.mode());
    KEYS = buildKeys();
    camera.setZoomLimit(cam.maxZoom);   // undefined: the wide limit in js/main.js
    // The world view's zoom, for CSS that sits around the map strip (the
    // portrait title); the map's height / width is fixed.
    root.style.setProperty("--camera-world-zoom", cam.world.zoom);
  }
  root.style.setProperty("--map-aspect", (map.height / map.width).toFixed(5));

  const flightEase = gsap.parseEase(P.flightEase);

  // Share of the flight's distance covered at scroll % (0 before, 1 after).
  function flightFraction(fl, pct) {
    return flightEase(clamp01((pct - fl.section.from) / (fl.section.to - fl.section.from)));
  }

  // Flight position at a share of the route's real distance.
  function positionAt(fl, f) {
    const km = f * fl.totalKm;
    const pts = fl.pts;
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) {                     // binary search on cumulative km
      const mid = (lo + hi) >> 1;
      if (pts[mid][2] <= km) lo = mid; else hi = mid;
    }
    const a = pts[lo], b = pts[hi];
    const t = b[2] > a[2] ? clamp01((km - a[2]) / (b[2] - a[2])) : 0;
    const mix = (i) => a[i] + (b[i] - a[i]) * t;
    return { lat: mix(0), lon: mix(1), km, x: mix(3), y: mix(4), index: lo };
  }

  // Trail = the route from the start up to the flight position. Rebuilt from
  // the sample points (not a dash trick, which breaks with non-scaling strokes).
  function drawTrail(fl, f, pos) {
    let d = "";
    if (f >= 1) d = "M" + fl.coords.join("L");
    else if (f > 0) d = "M" + fl.coords.slice(0, pos.index + 1).join("L") + `L${pos.x.toFixed(1)} ${pos.y.toFixed(1)}`;
    if (d !== fl.lastD) {
      fl.trail.forEach((path) => path.setAttribute("d", d));
      fl.lastD = d;
    }
  }

  // ---- Camera views ----------------------------------------------------------------
  // A view: map point `pt` at screen fraction (fx, fy) with this zoom.
  const stop = (pt, zoom) => ({ pt, zoom, fx: cam.stopFocusX, fy: cam.stopFocusY });
  const centred = (pt, zoom) => ({ pt, zoom, fx: 0.5, fy: 0.5 });
  const zoomCap = (z) => Math.min(z, cam.maxStoryZoom);

  // As { cx, cy, size }: view centre and size (1 / zoom) for this screen shape.
  function viewOf(k) {
    const base = camera.baseSize();
    const zoom = zoomCap(k.zoom);
    const w = base.w / zoom, h = base.h / zoom;
    return { cx: k.pt.x + (0.5 - k.fx) * w, cy: k.pt.y + (0.5 - k.fy) * h, size: 1 / zoom };
  }

  // Between two views the zoom changes evenly in log space (feels steady),
  // and the centre moves in step with the view size, so the point being
  // zoomed into stays put on screen instead of sliding.
  function blend(va, vb, t) {
    const logSize = Math.log(va.size) + (Math.log(vb.size) - Math.log(va.size)) * t;
    const size = Math.exp(logSize);
    const w = Math.abs(vb.size - va.size) > 1e-6 ? (size - va.size) / (vb.size - va.size) : t;
    return { cx: va.cx + (vb.cx - va.cx) * w, cy: va.cy + (vb.cy - va.cy) * w, size };
  }

  // Keyframes for everything except the flights (flights are computed live),
  // from the current camera profile. `ease` shapes the move INTO a keyframe.
  function buildKeys() {
    const world = cam.world.centreOnPlaces ? spot.places : spot.world;
    return [
      { at: sec.title.from, view: centred(world, cam.world.zoom), ease: "none" },
      { at: sec.title.to, view: centred(world, cam.world.zoom), ease: P.ease.hold },
      { at: sec.georgia.from + cam.georgia.arrive, view: stop(spot.georgia, cam.georgia.zoom), ease: P.ease.flyIn, arrival: true },   // arrival: the move overshoots (camera.feel.overshoot)
      { at: sec.pass1.to, view: stop(spot.georgia, cam.georgia.zoom), ease: P.ease.hold },   // held through the cards and the boarding pass
      { at: sec.flight1.to, view: stop(spot.usa, cam.usa.zoom), ease: "none" },
      { at: sec.pass2.to, view: stop(spot.usa, cam.usa.zoom), ease: P.ease.hold },
      { at: sec.flight2.to, view: stop(spot.prague, cam.prague.zoom), ease: "none" },
      { at: sec.prague.to, view: stop(spot.prague, cam.prague.zoom), ease: P.ease.hold },
      { at: sec.ending.from + cam.ending.arrive, view: centred(spot.ending, cam.ending.zoom), ease: P.ease.flyIn },
      { at: sec.ending.to, view: centred(spot.ending, cam.ending.zoom), ease: "none" },
    ].map((k) => ({ ...k, easeFn: gsap.parseEase(k.ease) }));
  }
  const keyAt = (at) => KEYS.find((k) => k.at === at);
  applyProfile();

  // ---- Camera feel (PACING.camera.feel): overshoot, drift ----------------------------
  // Both are pure functions of the scroll position, so they reverse exactly.
  // The zoom never passes the layout's story cap (cam.maxStoryZoom), which
  // keeps story x user zoom inside the combined limit. Reduced motion: both off.
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const bell = (u) => Math.sin(Math.PI * clamp01(u)) ** 2;   // 0 at both ends, flat there, 1 in the middle
  const minSize = () => 1 / cam.maxStoryZoom;

  // Overshoot: an arriving move's progress (ease at x, 0-1 through the move)
  // runs past 1 by camera.feel.overshoot, then settles back to exactly 1 at
  // the move's end, so the camera goes a little past its target (zoom and
  // position alike, in the same blend) and returns. The push starts at
  // overshootStart of the move; the rest of the bump is derived so the peak
  // lands that far past the target whatever the ease. 0 = the plain ease.
  function arrive(ease, x) {
    const F = cam.feel, t = ease(x);
    if (!F || !F.overshoot || reducedMotion.matches) return t;
    const x0 = F.overshootStart, peak = (1 + x0) / 2;
    return t + (F.overshoot + 1 - ease(peak)) * bell((x - x0) / (1 - x0));
  }
  // A view past its target must not be closer than the story cap.
  const capped = (v) => (v.size < minSize() ? { ...v, size: minSize() } : v);

  // Drift: over a stop's card range the view slowly pushes in about the stop
  // (which stays where it is on screen) and slides a little, then comes back
  // to rest by the range's end, where the next move starts from the plain
  // stop view.
  const driftOf = [
    { cards: P.cards.georgia, anchor: spot.georgia },
    { cards: P.cards.southDakota, anchor: spot.usa },
    { cards: P.cards.czechia, anchor: spot.prague },
  ];
  function drift(v, pct) {
    const F = cam.feel;
    if (!F || reducedMotion.matches || !(F.driftZoom || F.driftPanX || F.driftPanY)) return v;
    const d = driftOf.find((d) => pct > d.cards.from && pct < d.cards.to);
    if (!d) return v;
    const k = bell((pct - d.cards.from) / (d.cards.to - d.cards.from));
    const base = camera.baseSize();
    const size = Math.max(minSize(), v.size / (1 + F.driftZoom * k));
    const gx = (d.anchor.x - v.cx) / (base.w * v.size) + 0.5;   // the stop's screen position, kept
    const gy = (d.anchor.y - v.cy) / (base.h * v.size) + 0.5;
    return {
      cx: d.anchor.x - (gx - 0.5) * base.w * size + F.driftPanX * k * base.w * size,
      cy: d.anchor.y - (gy - 0.5) * base.h * size + F.driftPanY * k * base.h * size,
      size,
    };
  }

  function keyframeCamera(pct) {
    const i = KEYS.findIndex((k) => k.at >= pct);
    if (i === -1) return viewOf(KEYS[KEYS.length - 1].view);
    if (i === 0) return viewOf(KEYS[0].view);
    const a = KEYS[i - 1], b = KEYS[i];
    const x = clamp01(b.at === a.at ? 1 : (pct - a.at) / (b.at - a.at));
    if (b.arrival) return capped(blend(viewOf(a.view), viewOf(b.view), arrive(b.easeFn, x)));
    return drift(blend(viewOf(a.view), viewOf(b.view), b.easeFn(x)), pct);
  }

  // Follow view: the flight position (pulled slightly toward the route's
  // middle by 1 - strength) at the follow focus point, at cruise zoom.
  const takeoffBase = gsap.parseEase(P.ease.takeoff);
  const takeoffStrong = gsap.parseEase(P.ease.takeoffStrong);
  const landingEase = gsap.parseEase(P.ease.landing);
  // The takeoff ease leans toward the stronger one by camera.feel.takeoffEase
  // (0 = the plain ease); both are flat at the ends, so the mix is too.
  function takeoffEase(x) {
    const s = cam.feel ? cam.feel.takeoffEase : 0;
    return s ? takeoffBase(x) + (takeoffStrong(x) - takeoffBase(x)) * s : takeoffBase(x);
  }

  function flightCamera(fl, pct, pos) {
    const F = cam.follow;
    const cfg = cam[fl.id];
    const target = lerpPt(fl.centre, pos, F.strength);
    const follow = viewOf({ pt: target, zoom: cfg.cruiseZoom, fx: F.focusX, fy: F.focusY });
    const s = fl.section;
    const takeoffEnd = s.from + cfg.takeoff;
    const landingStart = s.to - cfg.landing;
    let v = follow;
    if (pct < takeoffEnd) {
      v = blend(viewOf(keyAt(s.from).view), follow, takeoffEase(clamp01((pct - s.from) / cfg.takeoff)));
    } else if (pct > landingStart) {
      v = capped(blend(follow, viewOf(keyAt(s.to).view), arrive(landingEase, clamp01((pct - landingStart) / cfg.landing))));
    }
    return keepOnScreen(v, pos);
  }

  // Never let the flight position get closer than edgeMargin to a screen
  // edge, nor lower than edgeBottom where the profile sets it (portrait: the
  // sheet is below).
  function keepOnScreen(v, pos) {
    const base = camera.baseSize();
    const w = base.w * v.size, h = base.h * v.size;
    const m = cam.follow.edgeMargin;
    const bottom = cam.follow.edgeBottom ?? 1 - m;
    const fx = Math.min(1 - m, Math.max(m, (pos.x - (v.cx - w / 2)) / w));
    const fy = Math.min(bottom, Math.max(m, (pos.y - (v.cy - h / 2)) / h));
    return { cx: pos.x - (fx - 0.5) * w, cy: pos.y - (fy - 0.5) * h, size: v.size };
  }

  // ---- Sections ---------------------------------------------------------------------
  function sectionAt(pct) {
    return P.sections.find((s) => pct >= s.from && pct < s.to) || P.sections[P.sections.length - 1];
  }

  // ---- Placeholder HUD line --------------------------------------------------------
  const fmtLat = (v) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? "N" : "S"}`;
  const fmtLon = (v) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? "E" : "W"}`;
  const fmtKm = (v) => Math.round(v).toLocaleString("en-US");

  // Portrait: short lines (narrow screen). At a stop and while boarding one
  // line; in flight three: flight and route, progress and km, lat and lon.
  // The portrait HUD stops short of the skip buttons (css/style.css) and
  // wraps where a line doesn't fit: only at the gaps between its parts
  // (the spaces inside a part don't break).
  const NBSP = String.fromCharCode(160);   // no-break space
  function hudText(section, flightState) {
    const id = section.id;
    const narrow = window.layout.mode() === "portrait";
    const gap = narrow ? "  " : "   ";
    const part = narrow ? (s) => s.replace(/ /g, NBSP) : (s) => s;
    if (stopOf[id]) {
      const c = stopById[stopOf[id]].city;
      return `${part(c.name.toUpperCase())}${gap}${part(`${fmtLat(c.lat)} ${fmtLon(c.lon)}`)}`;
    }
    const legId = flightOf[id];
    if (!legId) return "";
    const leg = flightById[legId];
    const head = `${part(leg.flight)}${gap}${part(`${leg.fromCode} → ${leg.toCode}`)}`;
    if (id.startsWith("pass")) return `BOARDING${gap}${head}`;
    const { fl, f, pos } = flightState;
    const progress = `${Math.round(f * 100)}%${gap}${part(`${fmtKm(pos.km)} / ${fmtKm(fl.totalKm)} km`)}`;
    const where = part(`${fmtLat(pos.lat)} ${fmtLon(pos.lon)}`);
    if (narrow) return `${head}\n${progress}\n${where}`;
    return `IN FLIGHT${gap}${head}\n${progress}${gap}${where}`;
  }

  // ---- Render: everything is derived from p -------------------------------------------
  let current = 0;
  let lastHud = null;
  let activeFlight = null;
  let planeLeg = null;
  const listeners = [];   // other modules (navigation) render from p too

  function render(p) {
    current = p;
    const pct = p * 100;
    const section = sectionAt(pct);

    // Flights: trail and finished state for both; live state for the active one.
    let active = null;
    for (const key of Object.keys(flights)) {
      const fl = flights[key];
      const f = flightFraction(fl, pct);
      const pos = positionAt(fl, f);
      drawTrail(fl, f, pos);
      const done = pct >= fl.section.to;
      if (done !== fl.done) {
        fl.group.classList.toggle("is-done", done);
        fl.done = done;
      }
      if (section === fl.section) active = { fl, f, pos };
    }

    activeFlight = active;

    // The plane's leg: the one being boarded or flown. Between legs, the one
    // it last landed from (or boards next), so it rests on a city.
    const fl = pct < flights.flight2.boardingFrom ? flights.flight1 : flights.flight2;
    const f = flightFraction(fl, pct);
    planeLeg = { fl, f, pos: positionAt(fl, f), visible: pct >= fl.boardingFrom && pct < fl.section.to };

    // Camera: follow the flight while flying, keyframes otherwise.
    const v = active ? flightCamera(active.fl, pct, active.pos) : keyframeCamera(pct);
    camera.setStory({ cx: v.cx, cy: v.cy, zoom: 1 / v.size });

    const text = hudText(section, active);
    if (text !== lastHud) {
      hud.textContent = text;
      lastHud = text;
    }

    for (const fn of listeners) fn(p, section);
  }

  // ---- Scroll -> progress (smoothed by ScrollTrigger's scrub) -----------------------
  // ScrollTrigger's own refresh on resize is off; the resize handling below
  // refreshes it itself, then puts the scroll position back.
  ScrollTrigger.config({ autoRefreshEvents: "visibilitychange,DOMContentLoaded,load" });

  const state = { p: 0 };
  let held = null;   // { pos, shown, railScroll } while a resize settles; rendering is frozen meanwhile
  const tween = gsap.to(state, {
    p: 1,
    ease: "none",
    onUpdate: () => { if (!held || held.railScroll) render(state.p); },
    scrollTrigger: {
      trigger: track,
      start: "top bottom",   // the track starts one screen down, right under the stage: scroll 0
      end: "bottom bottom",
      scrub: P.scrub,
    },
  });
  const trigger = tween.scrollTrigger;
  state.p = trigger.progress;
  render(state.p);

  // ---- Page position: the story and the ending on one scale ---------------------------
  // 0-100 = story % (as above); 100-200 = from the story's end to the ending
  // at rest (its top at the top of the screen, or the page bottom if that
  // comes first). Rail targets, the resize restore and the fade jump use it.
  // Measured from the layout, again after every refresh.
  let endY = 0, restY = 0;
  function measurePage() {
    endY = trigger.end;
    const maxY = document.documentElement.scrollHeight - window.layout.screenHeight();
    restY = Math.max(endY, Math.min(maxY, ending.getBoundingClientRect().top + window.scrollY));
  }
  measurePage();
  ScrollTrigger.addEventListener("refresh", measurePage);

  function yForPos(pos) {
    if (pos <= 100) return trigger.start + (trigger.end - trigger.start) * (Math.max(0, pos) / 100);
    return endY + (restY - endY) * Math.min(1, (pos - 100) / 100);
  }
  function posAt(y) {
    if (y <= endY) return clamp01((y - trigger.start) / (trigger.end - trigger.start)) * 100;
    return 100 + (restY > endY ? clamp01((y - endY) / (restY - endY)) : 1) * 100;
  }

  // ---- Keep the page position through resizes and browser zoom -----------------------
  // The page height is in vh, so resizing the window or zooming the browser
  // changes it (and the browser may move the scroll position), which would
  // move the story. Remember the page position from before the resize, freeze
  // the story while the resizes keep coming, then (debounced) refresh
  // ScrollTrigger and scroll to the same position in the new layout: the same
  // story progress, or the same spot in the ending. These scrolls are ours,
  // not the user's: they don't count toward the user-zoom ease-back. A
  // running chapter-rail scroll is left alone (it scrolls by page position,
  // so it lands right in the new layout).
  // On touch devices js/layout.js sorts each resize first: a browser toolbar
  // moving, the on-screen keyboard or pinch zoom doesn't resize the page, so
  // the story is neither frozen nor scrolled back; a width change (rotation)
  // settles for longer. Mouse devices: every resize, as before.
  let lastPos = posAt(window.scrollY);   // not updated while a resize settles: the layout is changing
  window.addEventListener("scroll", () => { if (!held) lastPos = posAt(window.scrollY); }, { passive: true });

  // The story's lengths (js/timeline.js) depend on touch vs mouse as well as the
  // height, so a flip of the touch flag is handled like a real resize even
  // where js/layout.js called the resize itself an "ignore".
  let touchFlipped = false;

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    let kind = window.layout.resizeKind();
    if (kind === "ignore" && touchFlipped) kind = "touch";
    if (kind === "ignore") {
      if (!held) render(current);   // keeps the framing right should the map's box have changed
      return;
    }
    if (!held) {
      held = { pos: lastPos, shown: current, railScroll: window.navigation.isScrolling() };
      camera.ignoreScroll(true);
      if (window.snap) window.snap.hold();   // touch snap stops (js/snap.js): off until the position is back
    }
    render(current);   // the screen shape changes the framing
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(settleResize, (kind === "touch" ? P.layout.touchSettle : P.resizeSettle) * 1000);
  });

  function settleResize() {
    const h = held;
    held = null;
    touchFlipped = false;
    const rail = h.railScroll || window.navigation.isScrolling();
    // Where the scroll was, still measured in the old layout (trigger.start /
    // end are only renewed by the refresh below).
    const before = posAt(window.scrollY);
    // The story's lengths for the new screen (js/timeline.js): rewrites the
    // PACING tables and the track's length, and returns convert(oldPct) ->
    // newPct (null: nothing changed). The positions held from before are in
    // the old numbers, so they go through it: the visitor keeps their place in
    // the story (the same card, the same spot in a flight), not the same percent.
    const convert = window.timeline.update() || ((v) => v);
    // With a rail animation involved the story kept rendering, so its target
    // is where the animation is (or ended); if the user took over meanwhile,
    // where the scroll was. The rail animation re-aimed itself in the new
    // numbers when the timeline changed, so this one is already in them.
    const railPos = window.navigation.animatedPos();
    const heldPos = convert(h.pos);
    const heldShown = convert(h.shown * 100) / 100;
    ScrollTrigger.refresh();   // new start/end for the new layout (and measurePage)
    const target = !rail ? heldPos : railPos !== null ? railPos : convert(before);
    window.scrollTo(0, yForPos(target));
    lastPos = target;
    ScrollTrigger.update();
    if (!rail) {
      // Smooth on from what was on screen to the restored position (no
      // movement if the story was at rest).
      const scrub = trigger.getTween();
      if (scrub) scrub.resetTo("totalProgress", trigger.progress, heldShown);
      else tween.progress(trigger.progress);
    }
    camera.ignoreScroll(false);
    render(state.p);
    if (window.snap) window.snap.release();   // the stops were rebuilt by the refresh above
  }

  // ---- Instant jump (the fade jump in js/navigation.js) --------------------------------
  // Scrolls to a page position at once and snaps the scroll smoothing of
  // every scrubbed trigger (the story's and the ending's), so nothing glides
  // from the old spot: everything renders straight at the new position.
  // During a resize settle, the settle restores this position instead of
  // the one from before the resize.
  function jumpTo(pos) {
    if (window.snap) window.snap.hold();   // touch snap stops (js/snap.js): not snapped
    camera.ignoreScroll(true);
    window.scrollTo({ top: yForPos(pos), behavior: "instant" });   // never smooth, whatever CSS says
    lastPos = pos;
    if (held) {
      held.pos = pos;
      held.shown = Math.min(100, Math.max(0, pos)) / 100;
    }
    ScrollTrigger.update();
    for (const st of ScrollTrigger.getAll()) {
      const scrub = st.getTween();
      if (scrub) scrub.resetTo("totalProgress", st.progress, st.progress);
      if (st.animation) st.animation.totalProgress(st.progress);   // renders it now (onUpdate)
    }
    render(state.p);
    if (!held) camera.ignoreScroll(false);   // a settling resize turns it back on itself
    if (window.snap) window.snap.release();
  }

  // ---- Layout change (portrait <-> wide): the other camera profile and HUD --------------
  // Fired before this file's own resize handling (js/layout.js listens first),
  // which then renders and restores the page position as for any resize.
  window.addEventListener("layoutchange", (e) => {
    if (e.detail.touch !== e.detail.previous.touch) touchFlipped = true;
    applyProfile();
    render(current);
  });

  // The timeline's numbers changed (js/timeline.js, in the resize settle): the
  // camera keyframes and the merged portrait profile hold copies of them.
  // The settle renders afterwards.
  window.addEventListener("timelinechange", applyProfile);

  window.story = {
    progress: () => current,                 // smoothed (what's on screen)
    scrollProgress: () => trigger.progress,  // raw scroll position
    sectionAt,
    sections: P.sections,
    // Run fn(p, section) on every render (and once now).
    onRender(fn) {
      listeners.push(fn);
      fn(current, sectionAt(current * 100));
    },
    // Live flight state while flying, else null: { routeId, f, pos: { lat, lon, km, x, y } }.
    flight: () => activeFlight && { routeId: activeFlight.fl.routeId, f: activeFlight.f, pos: activeFlight.pos },
    // The plane's leg (js/plane.js): { routeId, f, pos, visible }; visible from
    // the start of boarding to touchdown, otherwise resting on a city.
    plane: () => ({ routeId: planeLeg.fl.routeId, f: planeLeg.f, pos: planeLeg.pos, visible: planeLeg.visible }),
    // Point on a route at a share of its real distance: { lat, lon, km, x, y }.
    pointAt: (routeId, f) => positionAt(flightByRoute[routeId], f),
    // Scroll position (px) of a given percentage of the story.
    scrollYFor: (pct) => yForPos(Math.min(100, pct)),
    // Page position (0-100 story %, 100-200 into the ending) <-> scroll position (px).
    yForPos,
    posAt,
    pagePos: () => posAt(window.scrollY),
    jumpTo,
  };
})();
