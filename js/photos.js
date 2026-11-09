// Photo piles: one stacked pile of polaroids per stop, standing on the story
// card (photos in js/stops.js, the files in assets/photos/web/ with their
// manifest). An HTML button in .pile-box, which has the card panel's own
// geometry (CSS), under the cards: the pile's lower part is tucked behind the
// story cards' top edge, clipped there, so it rises out of the card. That edge
// is the slot's (js/cards.js: every story card has the same top edge), not any
// one card's, so the pile never moves between cards or stops.
//
// One real button holds the pile and, to its left, a pill ("<n> PHOTOS" and an
// arrow pointing at the pile). Enter, Space or a click opens the photo viewer
// (js/photo-viewer.js). Not part of the map: the map's drawing is one image.
//
// When: from the stop's first card to its last, from scroll progress in
// render(p), so it reverses cleanly. It slides out from behind the card
// PACING.photos.delay after the first card starts to appear (CSS), and fades
// out with the last card, before a boarding pass takes the slot. Between a
// stop's cards the same pile stays, so the USA's three cards never re-animate
// it. The cover thumbnails load a little before the stop's first card.
//
// Where: on the slot's top edge (right half in the wide layout, right side of
// the sheet in portrait). Fit, once for all piles: the room between the limit
// above (--pile-limit: under the skip buttons, or in portrait below the map's
// focus area) and the slot's top edge decides: it shrinks (--pile-scale) down to
// PACING.photos.minScale; where even that does not fit (a short window), it
// is tucked behind the card's left edge, at the lower end of the shortest
// story card, so a card is always beside it (data-mode
// "side": the pill and the pile's visible part) or, if that room is taken
// as well, only the pill is shown there (data-mode "pill").
(function () {
  const P = window.PACING.photos;
  const STORY = window.STORY;
  const MANIFEST = window.PHOTO_MANIFEST || {};
  const root = document.documentElement;
  const stage = document.querySelector(".stage");

  root.style.setProperty("--pile-delay", `${P.delay}s`);
  root.style.setProperty("--pile-fade-in", `${P.fadeIn}s`);
  root.style.setProperty("--pile-fade-out", `${P.fadeOut}s`);
  root.style.setProperty("--pile-slide-time", `${P.slide}s`);
  root.style.setProperty("--pile-spread-time", `${P.spread}s`);
  root.style.setProperty("--pile-bob-time", `${P.bobPeriod}s`);
  root.style.setProperty("--pile-bob-count", String(P.bobCount));

  // Same geometry as the card panel (CSS), but under the cards and outside the
  // aria-hidden .cards: the pile is a real control.
  const box = document.createElement("div");
  box.className = "pile-box";
  stage.append(box);

  const ARROW = `<svg class="pile-arrow" viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 6h8.5M6.5 2.5L10 6l-3.5 3.5"/></svg>`;

  // ---- Build ---------------------------------------------------------------------------------
  // button.pile (position, fade, clip at the card's top edge)
  //   span.pile-pill               "<n> PHOTOS" + arrow
  //   span.pile-stack              slides out from behind the card
  //     span.pile-layer--2, --1, --0   back to front, each: img (the cover's thumbnail on top)
  const piles = [];
  for (const stop of STORY.stops) {
    const photos = (stop.photos || []).filter((ph) => {
      if (MANIFEST[ph.file]) return true;
      console.warn(`photos: ${ph.file} is not in assets/photos/web (npm run build:photos)`);
      return false;
    });
    if (!photos.length) continue;

    const n = photos.length;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pile";
    btn.dataset.stop = stop.id;
    btn.dataset.mode = "above";
    btn.setAttribute("aria-label", `Open photos: ${stop.title}, ${n} ${n === 1 ? "photo" : "photos"}`);
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-hidden", "true");
    btn.tabIndex = -1;

    const pill = document.createElement("span");
    pill.className = "pile-pill";
    pill.innerHTML = `<span class="pile-pill-text"></span>${ARROW}`;
    pill.firstChild.textContent = `${n} ${n === 1 ? "PHOTO" : "PHOTOS"}`;
    btn.append(pill);

    const stack = document.createElement("span");
    stack.className = "pile-stack";
    const imgs = [];
    for (let k = Math.min(3, n) - 1; k >= 0; k--) {
      const layer = document.createElement("span");
      layer.className = `pile-layer pile-layer--${k}`;
      const img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      layer.append(img);
      stack.append(layer);
      imgs.push({ img, file: photos[k].file });
    }
    btn.append(stack);
    box.append(btn);

    const pile = { stop, photos, btn, pill, stack, imgs, loaded: false, shown: false };
    piles.push(pile);

    btn.addEventListener("click", (e) => {
      if (!pile.shown) return;
      if (window.photoViewer && window.photoViewer.open(pile.stop, pile.photos, btn)) window.analytics.event("photos-open", e);
    });
    // Not the map's drag-to-pan or double-click reset (js/main.js listens on the stage).
    btn.addEventListener("pointerdown", (e) => e.stopPropagation());
    btn.addEventListener("dblclick", (e) => e.stopPropagation());
  }
  if (!piles.length) return;

  // ---- Sizes: CSS lengths as px ----------------------------------------------------------------
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:fixed;left:0;top:0;height:0;visibility:hidden;pointer-events:none";
  document.body.append(probe);
  function px(name) {
    probe.style.width = `var(${name})`;
    return probe.getBoundingClientRect().width;
  }

  // ---- Fit and place: from the slot, the same for every pile -----------------------------------
  // The slot (js/cards.js) gives the story cards' common top edge, in the
  // panel's coordinates, so the pile never moves between cards or stops; it is
  // recomputed on "slotchange" (resize, rotation, layout change, fonts).
  function fit() {
    const portrait = window.layout.mode() === "portrait";
    const geo = window.cardSlot.geometry();
    const boxTop = box.getBoundingClientRect().top;
    const limit = px("--pile-limit") - boxTop;                     // nothing of the pile above this, in panel coordinates
    const need = px("--pile-top-room") + px("--pile-rise");        // the pile's height above the card edge at scale 1
    const ratio = (geo.top - limit) / need;
    let mode = "above", scale = Math.max(P.minScale, Math.min(1, ratio));
    if (ratio < P.minScale && !portrait) { mode = sideFits() ? "side" : "pill"; scale = 1; }
    // "above": the slot's top edge. "side" and "pill": a little above the lower edge of the
    // shortest card, so a card is always beside it.
    const top = mode === "above" ? geo.top : geo.top + geo.minHeight - px("--pile-side-bottom");
    for (const pile of piles) {
      pile.btn.dataset.mode = mode;
      pile.btn.style.setProperty("--pile-scale", String(+scale.toFixed(3)));
      pile.btn.style.setProperty("--pile-card-top", `${top}px`);
    }
  }

  // Beside the card's left edge, at its lower end (the stops are framed in the
  // upper left, so the city, its label and the plane are above): the pill and
  // the visible part of the pile need the room between the card and the chapter
  // rail.
  function sideFits() {
    const rail = document.querySelector(".rail").getBoundingClientRect();
    const need = px("--pile-side-w") + px("--pile-gap") + px("--pile-pill-w");
    return box.getBoundingClientRect().left - need >= rail.right + px("--pile-gap");
  }

  // ---- Shown from scroll progress -------------------------------------------------------------------
  function load(pile) {
    if (pile.loaded) return;
    pile.loaded = true;
    for (const L of pile.imgs) L.img.src = MANIFEST[L.file].thumb;
  }

  function show(pile, on) {
    pile.shown = on;
    pile.btn.classList.toggle("is-visible", on);
    pile.btn.setAttribute("aria-hidden", on ? "false" : "true");
    if (on) pile.btn.removeAttribute("tabindex");
    else {
      pile.btn.tabIndex = -1;
      if (document.activeElement === pile.btn) pile.btn.blur();
    }
  }

  window.story.onRender((p) => {
    const pct = p * 100;
    const slot = window.cardSlot.active();
    const stopId = slot && !slot.pass ? slot.stopId : null;
    for (const pile of piles) {
      const range = window.PACING.cards[pile.stop.id];
      if (range && pct >= range.from - P.preloadAhead && pct < range.to) load(pile);
      const on = pile.stop.id === stopId;
      if (on !== pile.shown) show(pile, on);
    }
  });

  window.addEventListener("slotchange", fit);
  window.addEventListener("timelinechange", fit);
  fit();

  // The scroll hint (js/hint.js) keeps clear of the shown pile and pill: the
  // painted parts (the pill and the photos), not the button's whole box.
  window.photoPiles = { shown: () => piles.filter((p) => p.shown).flatMap((p) => [p.pill, ...p.stack.children]) };
})();
