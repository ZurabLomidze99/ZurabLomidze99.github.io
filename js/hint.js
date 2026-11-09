// Scroll hint: one small "keep scrolling" cue for the whole story (it also
// replaces the title's old scroll cue). It appears only once the visitor has
// stopped scrolling for PACING.hint.idle (at the title: at once on page load,
// later after PACING.hint.titleIdle), and any scrolling hides it at once and
// starts the wait again. What it says comes from the story's state in
// render(p) and the table below.
//
// It sits by the card/pass slot: under the panel in the wide layout, just
// above the bottom sheet in portrait, at the bottom centre when no panel is
// up (above the chapter bar on phones). It is placed once, as it appears,
// and never over the panel, a city label, the plane, the HUD, the rail or
// bar, the skip buttons, the title or a photo pile: if no spot is free,
// it stays hidden.
// Never in the ending, and not while the visitor has "arrived" there: they
// scrolled into it themselves (not by a rail or bar jump or a fade jump)
// and stayed PACING.hint.arrivedFor. That flag (memory only) clears
// as soon as the page position is back before the ending, or on Back to
// start. Never during the fade jump, a card or pass switch, with the CV or
// the photo viewer open, a form field focused, or in a hidden tab.
// Opacity and transform only; timers, no frame loop; never clickable.
(function () {
  const H = window.PACING.hint;
  const P = window.PACING;
  const story = window.story;
  const root = document.documentElement;

  // ---- Wording (edit here) ----------------------------------------------------------------
  const WORDING = {
    title: "Scroll",                     // the title screen
    stop: "Scroll for more",             // at a stop, before its last card
    lastCard: {                          // a stop's last card, by stop id (js/stops.js)
      georgia: "Scroll to take off",
      southDakota: "Scroll to fly to Prague",
      czechia: "Scroll for contact",
    },
    boarding: "Scroll to take off",      // a boarding pass, before the flight starts
    flight: "Keep scrolling",            // in flight
  };

  // Story sections (PACING.sections) -> what the hint is about.
  const STOP_OF = { georgia: "georgia", usa: "southDakota", prague: "czechia" };
  const legs = Object.values(P.passes.legs);
  const BOARDING = legs.map((l) => l.boarding);
  const FLYING = legs.map((l) => l.flight);

  function wordingFor(section) {
    const id = section.id;
    if (id === "title") return WORDING.title;
    if (STOP_OF[id]) {
      const card = window.cardSlot.active();
      return card && card.last ? WORDING.lastCard[card.stopId] : WORDING.stop;
    }
    if (BOARDING.includes(id)) return WORDING.boarding;
    if (FLYING.includes(id)) return WORDING.flight;
    return null;   // the ending
  }

  // ---- Element ------------------------------------------------------------------------------
  root.style.setProperty("--hint-fade-in", `${H.fadeIn}s`);
  root.style.setProperty("--hint-fade-out", `${H.fadeOut}s`);
  root.style.setProperty("--hint-bob-period", `${H.bobPeriod}s`);

  const el = document.createElement("div");
  el.className = "hint";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<span class="hint-inner"><span class="hint-text"></span><svg class="hint-chevron" viewBox="0 0 16 10"><path d="M2 2l6 6 6-6"/></svg></span>`;
  document.body.append(el);
  const inner = el.querySelector(".hint-inner");
  const textEl = el.querySelector(".hint-text");

  // CSS lengths in px (sizes, safe areas, the visible height), read as they appear.
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:fixed;left:0;top:0;height:0;visibility:hidden;pointer-events:none";
  document.body.append(probe);
  function px(name) {
    probe.style.width = `var(${name})`;
    return probe.getBoundingClientRect().width;
  }

  // ---- Where: by the slot, else bottom centre; never over anything listed ---------------------
  const overlaps = (a, b, m) => a.left < b.right + m && b.left - m < a.right && a.top < b.bottom + m && b.top - m < a.bottom;

  function obstacles() {
    const out = [];
    const add = (node) => {
      if (!node) return;
      const r = node.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) out.push(r);
    };
    const slot = window.cardSlot.active();
    if (slot) add(slot.el);
    const hud = document.querySelector(".hud");
    if (hud.textContent) add(hud);
    add(document.querySelector(".city-label.is-visible"));
    add(document.querySelector(".plane-appear.is-visible .plane"));
    add(document.querySelector(".rail"));
    add(document.querySelector(".skip:not(.is-away)"));   // the CONTACT and CV buttons (js/skip.js)
    add(document.querySelector(".title:not(.is-hidden) .title-name"));
    if (window.photoPiles) window.photoPiles.shown().forEach(add);   // the stop's photo pile and its pill (js/photos.js)
    return out;
  }

  function place() {
    const w = inner.offsetWidth, h = inner.offsetHeight;
    const W = root.clientWidth;
    const screenH = px("--ui-h");   // the visible height (a phone's toolbar shown)
    const gap = px("--hint-offset");
    const clear = px("--hint-clearance");
    const safe = { l: px("--safe-left"), r: px("--safe-right"), t: px("--safe-top"), b: px("--safe-bottom") };
    const portrait = window.layout.mode() === "portrait";

    const spots = [];
    const slot = window.cardSlot.active();
    if (slot) {
      const p = window.cardSlot.rect();   // a story card: the slot (the same for every card); a pass: its own rect
      const cx = p.left + p.width / 2;
      if (portrait) spots.push({ cx, top: p.top - gap - h });                 // just above the sheet
      else spots.push({ cx, top: p.bottom + gap }, { cx, top: p.top - gap - h });   // under the panel; above it if there's no room
    }
    // A stop's photo pile and its pill stand on the panel's top edge, where the
    // portrait hint would sit: then in the row above each of them, centred on
    // it, on the panel, or at either screen edge (each checked below).
    // A row higher each round where the city label or a long line is in the way.
    if (window.photoPiles) {
      const rects = window.photoPiles.shown().map((n) => n.getBoundingClientRect()).filter((r) => r.width && r.height);
      const p = slot && window.cardSlot.rect();
      const mid = rects.length ? rects.reduce((a, r) => a + r.left + r.width / 2, 0) / rects.length : W / 2;
      const xs = [];
      for (let x = safe.l + clear + w / 2; x <= W - safe.r - clear - w / 2; x += 16) xs.push(x);   // along the row, nearest the pile first
      xs.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
      for (let k = 0; k < 4 && rects.length; k++) {
        for (const r of rects) {
          const top = r.top - gap - h - k * (h + clear);
          spots.push({ cx: r.left + r.width / 2, top });
          if (p) spots.push({ cx: p.left + p.width / 2, top });
          for (const cx of xs) spots.push({ cx, top });
        }
      }
    }
    // Bottom centre: above the chapter bar, or where the old title cue sat.
    const floor = portrait
      ? document.querySelector(".rail").getBoundingClientRect().top - px("--hint-bar-gap")
      : screenH - safe.b - px("--hint-bottom");
    spots.push({ cx: W / 2, top: floor - h });

    const avoid = obstacles();
    for (const s of spots) {
      const r = { left: s.cx - w / 2, right: s.cx + w / 2, top: s.top, bottom: s.top + h };
      const onScreen = r.left >= safe.l + clear && r.right <= W - safe.r - clear
        && r.top >= safe.t + clear && r.bottom <= screenH - safe.b - clear;
      if (onScreen && !avoid.some((o) => overlaps(r, o, clear))) return { x: r.left, y: r.top };
    }
    return null;
  }


  // ---- When ------------------------------------------------------------------------------------
  let section = null;     // latest from render(p)
  let progress = 0;       // latest p from render(p)
  let shown = false;
  let shownAt = 0;        // the story progress it appeared at
  let timer = 0;
  let lastMove = performance.now();

  const idleMs = () => (section && section.id === "title" ? H.titleIdle : H.idle) * 1000;
  const typing = () => {
    const a = document.activeElement;
    return !!a && !!a.closest(".vcard-back") && a.matches("input, textarea, select");
  };

  function arm(ms) {
    clearTimeout(timer);
    timer = setTimeout(check, ms);
  }

  // ---- Arrival in the ending -----------------------------------------------------------------
  // Judged on the real page position (not the smoothed story), and only for a
  // visitor's own scrolling: a trusted wheel, touch, scroll key or scrollbar
  // press marks their input; a rail or bar scroll step, a fade jump or a dev
  // jump (js/navigation.js noteMove) marks ours. A scroll into the ending
  // counts as theirs when their input is the later of the two and recent.
  // A page that opens inside the ending (scroll restored) is no arrival.
  const ending = P.sections.find((s) => s.id === "ending");   // read live: js/timeline.js rewrites its numbers on a touch screen
  const SCROLL_KEYS = new Set([" ", "ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"]);
  let lastOwn = -Infinity;
  let inEnding = story.pagePos() >= ending.from;
  let arrived = false;
  let arriveTimer = 0;

  function ownInput(e) {
    if (!e.isTrusted) return;   // scripts
    if (e.type === "keydown" && !SCROLL_KEYS.has(e.key)) return;
    if (e.type === "mousedown" && e.target !== root) return;   // the scrollbar belongs to the page itself
    lastOwn = performance.now();
  }
  for (const type of ["wheel", "touchstart", "touchmove", "keydown", "mousedown"]) {
    window.addEventListener(type, ownInput, { capture: true, passive: true });
  }

  function trackEnding() {
    const inside = story.pagePos() >= ending.from;
    if (inside === inEnding) return;
    inEnding = inside;
    clearTimeout(arriveTimer);
    if (!inside) { arrived = false; return; }   // back before the ending: the hint works again
    const own = lastOwn > window.navigation.movedAt() && performance.now() - lastOwn < H.ownWindow * 1000;
    if (!own) return;
    arriveTimer = setTimeout(() => {
      if (!inEnding) return;
      arrived = true;
      hide();
      clearTimeout(timer);
      timer = 0;
    }, H.arrivedFor * 1000);
  }

  function hide() {
    if (!shown) return;
    shown = false;
    el.classList.remove("is-shown");
  }

  function show() {
    const words = section && wordingFor(section);
    if (!words) return;
    textEl.textContent = words;
    const spot = place();
    if (!spot) return;   // nowhere free: stays hidden until the next pause
    el.style.setProperty("--hint-x", `${spot.x}px`);
    el.style.setProperty("--hint-y", `${spot.y}px`);
    shown = true;
    shownAt = progress;
    el.classList.add("is-shown");
  }

  // The wait is one timer. Scrolling only notes the time (and hides); when the
  // timer fires early, it waits out the rest.
  function check() {
    timer = 0;
    if (arrived || !section || section.id === "ending" || document.visibilityState !== "visible") return;
    const wait = lastMove + idleMs() - performance.now();
    if (wait > 1) return arm(wait);
    const switching = window.cardSlot.switchingFor();
    if (switching > 0) return arm(switching + 50);
    if (window.navigation.isFading() || (window.cvViewer && window.cvViewer.isOpen())
      || (window.photoViewer && window.photoViewer.isOpen()) || typing()) return arm(idleMs());
    show();
  }

  // Any scrolling (wheel, touch, keys, scrollbar, rail or bar, scrolls the
  // page makes itself), and input that may lead to it: hide, wait again.
  function moved() {
    trackEnding();   // first: leaving the ending clears `arrived`, so the wait below starts
    lastMove = performance.now();
    hide();
    if (!timer && !arrived) arm(idleMs());
  }
  window.addEventListener("scroll", moved, { passive: true });
  for (const type of ["wheel", "touchstart", "keydown", "pointerdown"]) {
    window.addEventListener(type, moved, { capture: true, passive: true });
  }
  window.addEventListener("resize", moved);
  window.addEventListener("fadejump", moved);   // js/navigation.js, as a fade jump starts
  document.addEventListener("focusin", () => {
    if (!typing()) return;
    hide();
    if (!timer && !arrived) arm(idleMs());   // hiding alone would leave no timer to bring it back after the field loses focus
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") moved();
    else hide();
  });

  story.onRender((p, s) => {
    section = s;
    progress = p;
    // The story moved without a scroll event reaching us yet (a jump, the
    // fade jump): the same as scrolling.
    if (shown && p !== shownAt) moved();
  });

  // Page load at the title: shown at once, like the old title cue.
  if (section && section.id === "title" && document.visibilityState === "visible") show();
  else arm(idleMs());
})();
