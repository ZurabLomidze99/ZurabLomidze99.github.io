// Card panel on the right of the stage: story cards (js/stops.js) and the
// boarding passes (js/passes.js) share one slot, so at most one is ever
// active. Which one comes from scroll progress in the story's render(p);
// they switch by CSS class (short fade + slide, the next one waits for the
// previous one to leave), so text is never stuck half-faded.
(function () {
  const P = window.PACING;
  const STORY = window.STORY;
  const root = document.documentElement;
  const sec = Object.fromEntries(P.sections.map((s) => [s.id, s]));

  root.style.setProperty("--card-fade", `${P.fade.card}s`);
  root.style.setProperty("--card-delay", `${P.fade.cardDelay}s`);
  root.style.setProperty("--pass-fade", `${P.passes.fade}s`);
  root.style.setProperty("--pass-delay", `${P.passes.delay}s`);
  root.style.setProperty("--pass-status-fade", `${P.passes.statusFade}s`);

  // Inside the stage, so Ctrl+wheel and drag over the panel still reach the
  // map (it takes no pointer events).
  const box = document.createElement("div");
  box.className = "cards";
  box.setAttribute("aria-hidden", "true");   // screen readers get the whole story from js/story-text.js
  document.querySelector(".stage").append(box);

  // Everything the slot can show: { el, from, to, pass? } with a scroll range
  // in %; cards also carry their stop's id and whether they are its last.
  const items = [];

  // Story cards: each gets its own slice of the stop's card range. The ranges
  // (and the passes' below) are set in place() from PACING, which js/timeline.js
  // rewrites on a touch screen.
  for (const stop of STORY.stops) {
    const n = stop.cards.length;
    stop.cards.forEach((c, i) => {
      const el = document.createElement("article");
      el.className = "card";
      el.innerHTML = `
        <p class="card-kicker"></p>
        <h2 class="card-title"></h2>
        <p class="card-year"></p>
        <p class="card-text"></p>`;
      el.querySelector(".card-kicker").textContent = `${stop.title} · ${i + 1} / ${n}`;
      el.querySelector(".card-title").textContent = c.title;
      el.querySelector(".card-year").textContent = c.year || "";
      const text = el.querySelector(".card-text");
      text.textContent = c.text;
      box.append(el);
      text.addEventListener("scroll", () => fitCard(el, text), { passive: true });
      items.push({ el, text, index: i, count: n, stopId: stop.id, last: i === n - 1 });
    });
  }

  // A card taller than its room keeps its header and scrolls only its text
  // (CSS: .card-text), with a soft fade at the bottom while more is below.
  // .is-overflowing also lets a mouse scroll it where cards otherwise take no
  // pointer events.
  function fitCard(el, text) {
    const over = text.scrollHeight > text.clientHeight + 1;
    el.classList.toggle("is-overflowing", over);
    el.classList.toggle("is-at-end", !over || text.scrollTop + text.clientHeight >= text.scrollHeight - 1);
  }
  const cardItems = items.filter((c) => c.text);
  const fitCards = () => cardItems.forEach((c) => fitCard(c.el, c.text));
  const fitObserver = new ResizeObserver(fitCards);
  cardItems.forEach((c) => fitObserver.observe(c.text));
  window.addEventListener("resize", fitCards);

  // Boarding passes: from the start of the boarding segment to shortly
  // before touchdown, i.e. through the whole flight.
  const passes = [];
  for (const flight of STORY.flights) {
    const leg = P.passes.legs[flight.id];
    const pass = window.boardingPass.create(flight);
    box.append(pass.el);
    const item = { el: pass.el, pass, routeId: flight.id, leg };
    items.push(item);
    passes.push(item);
  }
  const measurePasses = () => passes.forEach((p) => p.pass.measure());
  measurePasses();
  window.addEventListener("resize", measurePasses);

  // Scroll ranges (%) from PACING now, and again whenever the timeline changes.
  function place() {
    for (const c of items) {
      if (c.pass) {
        c.flightFrom = sec[c.leg.flight].from;
        c.from = sec[c.leg.boarding].from;
        c.to = sec[c.leg.flight].to - P.passes.leaveBeforeTouchdown;
      } else {
        const range = P.cards[c.stopId];
        const step = (range.to - range.from) / c.count;
        c.from = range.from + c.index * step;
        c.to = range.from + (c.index + 1) * step;
      }
    }
  }
  place();
  window.addEventListener("timelinechange", place);

  let active = null;
  let switchedAt = -Infinity;   // performance.now() of the last switch
  window.story.onRender((p) => {
    const pct = p * 100;
    const next = items.find((c) => pct >= c.from && pct < c.to) || null;
    if (next !== active) {
      if (active) active.el.classList.remove("is-active");
      if (next) {
        next.el.classList.add("is-active");
        if (next.text) {   // a card always comes in from the top of its text
          next.text.scrollTop = 0;
          fitCard(next.el, next.text);
        }
      }
      active = next;
      switchedAt = performance.now();
    }
    // The active pass follows the real flight progress.
    if (active && active.pass) {
      const live = window.story.flight();
      const f = live && live.routeId === active.routeId ? live.f : 0;
      active.pass.update(f, pct >= active.flightFrom);
    }
  });

  // For the scroll hint (js/hint.js): what the slot shows, and whether it is
  // still switching (the old one fading out, the new one waiting and fading in).
  const switchTime = Math.max(P.fade.cardDelay + P.fade.card, P.passes.delay + P.passes.fade) * 1000;
  window.cardSlot = {
    // null, or { el, pass: bool, stopId, last } (stopId and last: cards only)
    active: () => active && { el: active.el, pass: !!active.pass, stopId: active.stopId, last: !!active.last },
    switchingFor: () => Math.max(0, switchedAt + switchTime - performance.now()),   // ms left, 0 when settled
  };
})();
