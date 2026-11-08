// Timeline: how long each stretch of the story is on THIS screen.
//
// js/pacing.js holds the authored story: every length in screens (one screen =
// the screen's own height) written as a percent of PACING.screens. On a touch
// screen (a coarse pointer) a short screen makes those stretches very short in
// pixels (a card gets 0.25 screens, about 165 px on a 650 px phone), so one
// flick skips a card. PACING.touchMin gives the stretches a minimum in CSS px:
//
//   length = max(its length in screens x the screen height, its minimum)
//
// This file works the new lengths out and writes every derived percent back
// into the PACING tables IN PLACE (sections, cards, the camera's arrive /
// takeoff / landing, passes.leaveBeforeTouchdown, the chapters' targets) and
// the story track's length (--story-screens). Everything else keeps reading
// PACING as before. With a mouse (or where no minimum binds) the authored
// numbers are written back verbatim, so nothing changes there.
//
// Runs once at load (before js/scroll-story.js) and again from the resize
// settle in js/scroll-story.js, which is never called for a phone's browser
// toolbar moving (js/layout.js ignores that). When the numbers changed it fires
// "timelinechange" on window with detail.convert(oldPct): the same place in the
// story, in the new numbers (modules that cached a number re-read it; a held
// page position is converted so the visitor keeps their place).
//
// Percent here is the story percent (0-100). Page positions past 100 (the
// ending) are not part of the story and are never converted.
(function () {
  const P = window.PACING;
  const STORY = window.STORY;
  const root = document.documentElement;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const flightIds = Object.values(P.passes.legs).map((l) => l.flight);
  const boardingIds = Object.values(P.passes.legs).map((l) => l.boarding);
  const STOP_OF = { georgia: "georgia", usa: "southDakota", prague: "czechia" };   // section -> stop (the key in PACING.cards)

  // ---- The authored numbers, kept before anything changes them --------------------
  const BASE = {
    sections: clone(P.sections),
    cards: clone(P.cards),
    georgiaArrive: P.camera.georgia.arrive,
    endingArrive: P.camera.ending.arrive,
    flights: Object.fromEntries(flightIds.map((id) => [id, { takeoff: P.camera[id].takeoff, landing: P.camera[id].landing }])),
    leave: P.passes.leaveBeforeTouchdown,
    targets: P.navigation.chapters.map((c) => c.target),
  };
  const bs = (id) => BASE.sections.find((s) => s.id === id);

  // ---- Stretches: the story cut into pieces that can have a minimum ---------------
  // Contiguous, from 0 to 100, in authored percent. A stretch grows or not as a
  // whole; every number inside it keeps its share of it.
  function buildStretches() {
    const M = P.touchMin;
    const out = [];
    const add = (kind, from, to, min) => out.push({ kind, from, to, min });
    for (const s of BASE.sections) {
      const stop = STOP_OF[s.id];
      if (s.id === "title") add("title", s.from, s.to, M.title);
      else if (s.id === "ending") add("pullBack", s.from, s.to, M.pullBack);
      else if (boardingIds.includes(s.id)) add("pass", s.from, s.to, M.pass);
      else if (flightIds.includes(s.id)) add("flight", s.from, s.to, 0);
      else if (stop) {
        const cards = BASE.cards[stop];
        const n = STORY.stops.find((x) => x.id === stop).cards.length;
        let at = s.from;
        if (s.id === "georgia") {   // the fly-in; the other stops start with the landing, which belongs to the flight
          at = s.from + BASE.georgiaArrive;
          add("flyIn", s.from, at, M.flyIn);
        }
        add("settle", at, cards.from, 0);                 // the camera settling before the first card
        add("cards", cards.from, cards.to, M.card * n);   // n cards of the same length
      } else return null;
    }
    const ok = out.every((s, i) => s.to > s.from && s.from === (i ? out[i - 1].to : 0)) && out[out.length - 1].to === 100;
    return ok ? out : null;
  }
  const STRETCHES = buildStretches();
  if (!STRETCHES) console.warn("timeline: the stretches don't line up with the sections; touch minimums are off.");

  // ---- The state for a screen: map from authored % to this screen's % -----------------
  const same = (x) => x;
  function stateFor(touch, H) {
    const full = P.screens * H;   // px, as authored
    if (!STRETCHES) return { stretched: false, fp: "base", lens: [], total: full, screens: P.screens, f: same, inv: same };
    const base = STRETCHES.map((s) => ((s.to - s.from) * full) / 100);
    const lens = touch ? base.map((l, i) => Math.max(l, STRETCHES[i].min)) : base;
    if (lens.every((l, i) => l === base[i])) {
      return { stretched: false, fp: "base", lens, total: full, screens: P.screens, f: same, inv: same };
    }
    const cum = [];
    let total = 0;
    for (const l of lens) { cum.push(total); total += l; }
    return {
      stretched: true,
      fp: lens.map((l) => l.toFixed(3)).join(","),
      lens, total, screens: total / H,
      // authored % -> this screen's %
      f(x) {
        if (x <= 0) return 0;
        if (x >= 100) return 100;
        const i = STRETCHES.findIndex((s) => x < s.to);   // a boundary belongs to the stretch that starts there
        const s = STRETCHES[i];
        return ((cum[i] + ((x - s.from) / (s.to - s.from)) * lens[i]) / total) * 100;
      },
      // this screen's % -> authored %
      inv(y) {
        if (y <= 0) return 0;
        if (y >= 100) return 100;
        const px = (y / 100) * total;
        let i = cum.length - 1;
        while (i > 0 && cum[i] > px) i--;
        const s = STRETCHES[i];
        return s.from + ((px - cum[i]) / lens[i]) * (s.to - s.from);
      },
    };
  }

  // Write the derived numbers into PACING (the authored ones, verbatim, when
  // nothing is stretched, so a mouse gets exactly the old numbers).
  function apply(st) {
    const S = st.stretched, f = st.f;
    P.sections.forEach((s, i) => {
      s.from = S ? f(BASE.sections[i].from) : BASE.sections[i].from;
      s.to = S ? f(BASE.sections[i].to) : BASE.sections[i].to;
    });
    for (const k of Object.keys(BASE.cards)) {
      P.cards[k].from = S ? f(BASE.cards[k].from) : BASE.cards[k].from;
      P.cards[k].to = S ? f(BASE.cards[k].to) : BASE.cards[k].to;
    }
    // Lengths inside a stretch: the distance between its two ends in the new numbers.
    const georgia = bs("georgia"), ending = bs("ending");
    P.camera.georgia.arrive = S ? f(georgia.from + BASE.georgiaArrive) - f(georgia.from) : BASE.georgiaArrive;
    P.camera.ending.arrive = S ? f(ending.from + BASE.endingArrive) - f(ending.from) : BASE.endingArrive;
    for (const id of flightIds) {   // flights keep their length, so these only shrink as a share of a longer story
      const fl = bs(id), b = BASE.flights[id];
      P.camera[id].takeoff = S ? f(fl.from + b.takeoff) - f(fl.from) : b.takeoff;
      P.camera[id].landing = S ? f(fl.to) - f(fl.to - b.landing) : b.landing;
    }
    const first = bs(flightIds[0]);   // the same length in px for every flight
    P.passes.leaveBeforeTouchdown = S ? f(first.to) - f(first.to - BASE.leave) : BASE.leave;
    P.navigation.chapters.forEach((c, i) => {
      const t = BASE.targets[i];
      c.target = S && t < 100 ? f(t) : t;   // past 100 (the ending) is not story
    });
    root.style.setProperty("--story-screens", st.screens);   // the story track's length (css/style.css)
  }

  let state = null;

  // Work the numbers out for the current screen. Returns null when nothing
  // changed, else convert(oldPct) -> newPct; fires "timelinechange" then.
  function update() {
    const next = stateFor(window.layout.touch(), window.layout.screenHeight());
    const prev = state;
    state = next;
    if (prev && prev.fp === next.fp) return null;
    apply(next);
    if (!prev) return null;
    const convert = (y) => (y <= 0 || y >= 100 ? y : next.f(prev.inv(y)));
    window.dispatchEvent(new CustomEvent("timelinechange", { detail: { convert } }));
    return convert;
  }
  update();

  window.timeline = {
    update,
  };
})();
