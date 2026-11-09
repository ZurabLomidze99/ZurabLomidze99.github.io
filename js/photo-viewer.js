// Photo viewer: a stop's photos, full size, over everything (opened from the
// stop's pile, js/photos.js). Works like the CV viewer (js/cv-viewer.js): a
// dialog appended to <body>, everything behind it inert, all keys kept from
// the page's own handlers, the page behind never scrolls or moves (no
// scrollbar hiding), and focus goes back to the pile on close.
//
// - Each photo at its natural proportions, up to --photo-max-w and
//   --photo-max-h of the screen, its caption under it, a "4 / 10" counter.
// - Previous and next buttons, Left / Right (Home / End) keys; a thumbnail
//   strip on wide layouts that jumps to the clicked photo; in portrait the
//   counter only.
// - The photos are a horizontal scroll-snap carousel: a swipe on touch (or a
//   trackpad's sideways move) is the browser's own scrolling with its
//   momentum, one photo per snap.
// - Esc, the Close button and a click on the backdrop close it.
// - Loads the current photo's full version first, then its neighbours, as
//   the visitor moves: never all of them at once.
// - Analytics: "photos-open" (js/photos.js) and "photos-next", the first
//   move to another photo in one opening (never per swipe).
(function () {
  const P = window.PACING.photos;
  const MANIFEST = window.PHOTO_MANIFEST || {};
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  root.style.setProperty("--photo-open", `${P.open}s`);
  root.style.setProperty("--photo-close", `${P.close}s`);

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const icon = (cls, d) => `<svg class="${cls}" viewBox="0 0 20 20" aria-hidden="true">${d}</svg>`;
  const CLOSE_ICON = icon("photo-icon", `<path d="M5 5l10 10M15 5L5 15"/>`);
  const PREV_ICON = icon("photo-icon", `<path d="M12.5 4l-6 6 6 6"/>`);
  const NEXT_ICON = icon("photo-icon", `<path d="M7.5 4l6 6-6 6"/>`);

  const modal = document.createElement("div");
  modal.className = "photo-modal";
  modal.innerHTML = `
    <div class="photo-viewer" role="dialog" aria-modal="true" aria-labelledby="photo-title">
      <div class="photo-bar">
        <h2 class="photo-title" id="photo-title"></h2>
        <span class="photo-count" aria-hidden="true"></span>
        <button type="button" class="ui-button photo-close" aria-label="Close">${CLOSE_ICON}</button>
      </div>
      <div class="photo-stage">
        <div class="photo-track" tabindex="-1"></div>
        <button type="button" class="ui-button photo-nav photo-prev" aria-label="Previous photo">${PREV_ICON}</button>
        <button type="button" class="ui-button photo-nav photo-next" aria-label="Next photo">${NEXT_ICON}</button>
      </div>
      <div class="photo-strip" role="group" aria-label="All photos"></div>
      <p class="visually-hidden photo-live" aria-live="polite" aria-atomic="true"></p>
    </div>`;
  document.body.append(modal);   // a direct child of body, like the CV viewer

  const viewer = modal.querySelector(".photo-viewer");
  const title = modal.querySelector(".photo-title");
  const counter = modal.querySelector(".photo-count");
  const live = modal.querySelector(".photo-live");
  const track = modal.querySelector(".photo-track");
  const strip = modal.querySelector(".photo-strip");
  const closeBtn = modal.querySelector(".photo-close");
  const prevBtn = modal.querySelector(".photo-prev");
  const nextBtn = modal.querySelector(".photo-next");

  let isOpen = false;
  let opener = null;
  let inerted = [];
  let photos = [];
  let slides = [];
  let thumbs = [];
  let index = 0;
  let countedNext = false;   // "photos-next": once per opening

  // ---- Which photo ------------------------------------------------------------------------------
  // Full versions: the current one first, its neighbours once it has loaded.
  function loadFull(i) {
    const s = slides[i];
    if (!s || s.img.getAttribute("src")) return;
    s.img.setAttribute("src", MANIFEST[photos[i].file].full);
  }
  function loadAround(i) {
    loadFull(i);
    const img = slides[i].img;
    const neighbours = () => { if (isOpen && index === i) { loadFull(i - 1); loadFull(i + 1); } };
    if (img.complete) neighbours();
    else {
      img.addEventListener("load", neighbours, { once: true });
      img.addEventListener("error", neighbours, { once: true });
    }
  }

  // Show photo i as current (the track is already there, or on its way).
  // e: the visitor's own input that moved it, for analytics; none for ours.
  function setIndex(i, e) {
    const moved = i !== index;
    index = i;
    const n = photos.length;
    counter.textContent = `${i + 1} / ${n}`;
    const ph = photos[i];
    live.textContent = `Photo ${i + 1} of ${n}${ph.alt ? `: ${ph.alt}` : ""}${ph.caption ? ` ${ph.caption}` : ""}`;
    slides.forEach((s, k) => s.el.setAttribute("aria-hidden", k === i ? "false" : "true"));
    thumbs.forEach((t, k) => { if (k === i) t.setAttribute("aria-current", "true"); else t.removeAttribute("aria-current"); });
    const t = thumbs[i];
    if (t && strip.offsetParent) {
      const left = t.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2;
      strip.scrollTo({ left, behavior: reducedMotion.matches ? "instant" : "smooth" });
    }
    // Disabled at the ends; a focused button that becomes disabled hands focus to the other one.
    const atStart = i === 0, atEnd = i === n - 1;
    if (atStart && document.activeElement === prevBtn) nextBtn.focus({ preventScroll: true });
    if (atEnd && document.activeElement === nextBtn) prevBtn.focus({ preventScroll: true });
    prevBtn.disabled = atStart;
    nextBtn.disabled = atEnd;
    loadAround(i);
    if (moved && e && !countedNext) {
      countedNext = true;
      window.analytics.event("photos-next", e);
    }
  }

  // Move to photo i: one step glides (reduced motion: at once), a jump from
  // the strip or Home / End is instant, so the photos in between never load.
  let ours = 0;   // until this time, scroll events are the page's own move
  function go(i, e, glide) {
    i = Math.max(0, Math.min(photos.length - 1, i));
    if (i === index) return;
    const smooth = glide && !reducedMotion.matches;
    ours = performance.now() + (smooth ? 1000 : 100);
    track.scrollTo({ left: i * track.clientWidth, behavior: smooth ? "smooth" : "instant" });
    setIndex(i, e);
  }

  // The visitor's own swipe or sideways scroll: once the track has settled
  // on a photo, that one is current.
  let lastInput = null;   // { e, at }: the latest touch or wheel on the track
  let settleTimer = 0;
  track.addEventListener("scroll", () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (i === index || i < 0 || i >= photos.length) return;
      const own = lastInput && performance.now() - lastInput.at < P.swipeWindow * 1000 && performance.now() > ours;
      setIndex(i, own ? lastInput.e : null);
    }, 120);
  }, { passive: true });
  for (const type of ["touchstart", "wheel"]) {
    track.addEventListener(type, (e) => { if (e.isTrusted) lastInput = { e, at: performance.now() }; }, { passive: true });
  }

  prevBtn.addEventListener("click", (e) => go(index - 1, e, true));
  nextBtn.addEventListener("click", (e) => go(index + 1, e, true));
  strip.addEventListener("click", (e) => {
    const t = e.target.closest(".photo-thumb");
    if (t) go(thumbs.indexOf(t), e, false);
  });

  // ---- Open and close -----------------------------------------------------------------------------
  function build(stop, list) {
    photos = list;
    title.textContent = `Photos · ${stop.title}`;
    track.innerHTML = list.map((ph) => {
      const m = MANIFEST[ph.file];
      return `
        <figure class="photo-slide${ph.caption ? " has-caption" : ""}">
          <img class="photo-img" alt="${esc(ph.alt || "")}" width="${m.w}" height="${m.h}" style="--ar: ${m.w} / ${m.h}" decoding="async" draggable="false">
          ${ph.caption ? `<figcaption class="photo-caption">${esc(ph.caption)}</figcaption>` : ""}
        </figure>`;
    }).join("");
    slides = [...track.children].map((el) => ({ el, img: el.querySelector("img") }));
    // The strip's thumbnails load lazily: not at all where the strip isn't shown (portrait).
    strip.innerHTML = list.map((ph, k) => `
      <button type="button" class="photo-thumb" aria-label="Photo ${k + 1} of ${list.length}">
        <img src="${esc(MANIFEST[ph.file].thumb)}" alt="" loading="lazy" decoding="async" draggable="false">
      </button>`).join("");
    thumbs = [...strip.children];
  }

  function open(stop, list, from) {
    if (isOpen || !list || !list.length) return false;
    isOpen = true;
    opener = from || null;
    countedNext = false;
    build(stop, list);
    inerted = [...document.body.children].filter((el) => el !== modal && el.tagName !== "SCRIPT" && !el.inert);
    inerted.forEach((el) => { el.inert = true; });
    track.scrollLeft = 0;
    index = -1;
    setIndex(0, null);
    modal.classList.add("is-open");
    root.classList.add("is-photos-open");
    if (opener) opener.setAttribute("aria-expanded", "true");
    closeBtn.focus({ preventScroll: true });
    return true;   // opened now; the pile's click handler counts it (js/analytics.js)
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    modal.classList.remove("is-open");
    root.classList.remove("is-photos-open");
    inerted.forEach((el) => { el.inert = false; });
    inerted = [];
    if (opener) {
      opener.removeAttribute("aria-expanded");
      opener.focus({ preventScroll: true });
    }
  }
  closeBtn.addEventListener("click", close);

  // Backdrop click closes: anywhere that isn't a photo, its caption, a button
  // or the bars, when the press also started there.
  const CONTENT = ".photo-img, .photo-caption, button, .photo-bar, .photo-strip";
  let pressedBackdrop = false;
  modal.addEventListener("pointerdown", (e) => { pressedBackdrop = !e.target.closest(CONTENT); });
  modal.addEventListener("click", (e) => {
    if (pressedBackdrop && !e.target.closest(CONTENT)) close();
    pressedBackdrop = false;
  });

  // A new screen size: the track stays on the current photo.
  window.addEventListener("resize", () => {
    if (!isOpen) return;
    ours = performance.now() + 200;
    track.scrollLeft = index * track.clientWidth;
  });

  // ---- Keys -------------------------------------------------------------------------------------
  // Window, capture phase: runs before the page's own key handlers, which
  // never see the keys while the viewer is open.
  window.addEventListener("keydown", (e) => {
    if (!isOpen) return;
    e.stopPropagation();
    const active = document.activeElement;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "Tab") {   // focus trap: wrap around at either end
      const items = [...modal.querySelectorAll("button:not([disabled])")].filter((b) => b.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (active === first || !modal.contains(active))) { e.preventDefault(); last.focus({ preventScroll: true }); }
      else if (!e.shiftKey && (active === last || !modal.contains(active))) { e.preventDefault(); first.focus({ preventScroll: true }); }
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1, e, true); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1, e, true); return; }
    if (e.key === "Home") { e.preventDefault(); go(0, e, false); return; }
    if (e.key === "End") { e.preventDefault(); go(photos.length - 1, e, false); return; }
    // Keys that would scroll the page do nothing (Space and Enter still press a button).
    if ((e.key === " " || e.key === "Enter") && active && active.tagName === "BUTTON") return;
    if ([" ", "ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(e.key)) e.preventDefault();
  }, true);

  // ---- Wheel and touch ------------------------------------------------------------------------------
  // The page behind must not scroll. A sideways wheel or trackpad move on the
  // photos scrolls them (natively, snapping); on the strip an up/down wheel
  // scrolls it sideways; everything else is cancelled. Ctrl+wheel (browser
  // zoom) is left alone.
  modal.addEventListener("wheel", (e) => {
    if (e.ctrlKey) return;
    const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    if (sideways && (track.contains(e.target) || strip.contains(e.target))) return;
    e.preventDefault();
    if (strip.contains(e.target)) strip.scrollLeft += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  }, { passive: false });

  // Touch: the direction is decided on the first move. Up or down: cancelled
  // (it would scroll the page behind). Sideways: allowed on the photos and
  // the strip (their own scrolling), cancelled elsewhere. Two fingers (pinch
  // zoom) are left alone.
  let start = null, lock = null;
  modal.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    start = { x: t.clientX, y: t.clientY };
    lock = null;
  }, { passive: true });
  modal.addEventListener("touchmove", (e) => {
    if (e.touches.length > 1 || !start) return;
    const t = e.touches[0];
    if (!lock) lock = Math.abs(t.clientX - start.x) > Math.abs(t.clientY - start.y) ? "x" : "y";
    const ownScroller = track.contains(e.target) || strip.contains(e.target);
    if ((lock === "y" || !ownScroller) && e.cancelable) e.preventDefault();
  }, { passive: false });

  window.photoViewer = { open, close, isOpen: () => isOpen };   // isOpen: the scroll hint (js/hint.js) stays away while open
})();
