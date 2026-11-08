// CV folder and viewer, in the ending. A neon folder (a real button) sits
// beside the visiting card; clicking it opens the CV in a large modal sheet
// over everything. Content: js/cv.js (header, contact, CV, the PDF and the
// name it is saved under).
// The PDF (CV.pdf) is the one formal CV: the sheet's top bar links to it
// twice: View PDF (opens it in a new tab) and Download PDF (saved as
// CV.pdfName).
//
// The page behind never moves: no scrollbar hiding, no scroll position change.
// Wheel and touch on the backdrop are cancelled (non-passive listeners), keys
// scroll the sheet instead of the page, and everything behind is inert while
// the viewer is open. All keys are kept from the page's own handlers meanwhile
// (Esc would otherwise also flip the card back and reset the map zoom).
(function () {
  const C = window.PACING.cv;
  const CV = window.CV;
  const ICONS = window.visitingCard.icons;
  const root = document.documentElement;

  root.style.setProperty("--cv-open", `${C.open}s`);
  root.style.setProperty("--cv-close", `${C.close}s`);

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // Where a long address may break in a narrow column: after @ and / (the text itself is unchanged)
  const breakable = (s) => esc(s).replace(/([@/])/g, "$1<wbr>");
  const icon = (d) => `<svg class="vcard-icon" viewBox="0 0 20 20" aria-hidden="true">${d}</svg>`;
  const USER_ICON = icon(`<circle cx="10" cy="7" r="3.2"/><path d="M3.5 17c.7-3.4 3.2-5 6.5-5s5.8 1.6 6.5 5"/>`);
  const CLOSE_ICON = `<svg class="cv-close-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>`;
  const barIcon = (d) => `<svg class="cv-bar-icon" viewBox="0 0 20 20" aria-hidden="true">${d}</svg>`;
  const VIEW_ICON = barIcon(`<path d="M11.5 3.5h5v5M16.5 3.5L9.5 10.5"/><path d="M14.5 11.5v4a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h4"/>`);   // external link: a box, an arrow out of its corner
  const DOWNLOAD_ICON = barIcon(`<path d="M10 3.5v9M6 8.5l4 4 4-4"/><path d="M3.5 13.5v2a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2"/>`);   // an arrow down into a tray

  // ---- The folder (a button beside the card) ---------------------------------------------
  // Drawn in a 300 x 230 box: back panel with its tab, a paper sheet with a
  // few route-yellow lines sticking out, the front panel with "CV" on it.
  const FOLDER = `
    <svg class="cv-folder-art" viewBox="0 0 300 230" aria-hidden="true">
      <path class="cv-folder-panel" d="M14 196V40q0-12 12-12h74q8 0 13 7l8 12h153q12 0 12 12v137q0 12-12 12H26q-12 0-12-12z"/>
      <g class="cv-folder-paper">
        <rect class="cv-folder-sheet" x="118" y="12" width="156" height="170" rx="6"/>
        <path class="cv-folder-line" d="M138 34h60M138 52h116M138 68h92M138 84h116"/>
      </g>
      <path class="cv-folder-panel" d="M14 110q0-12 12-12h248q12 0 12 12v86q0 12-12 12H26q-12 0-12-12z"/>
      <text class="cv-folder-text" x="150" y="172">CV</text>
    </svg>`;

  const row = document.querySelector(".ending-row");
  const wrap = document.createElement("div");
  wrap.className = "cv-wrap";
  wrap.innerHTML = `
    <button type="button" class="cv-folder" aria-haspopup="dialog">
      ${FOLDER}
      <span class="cv-folder-caption">CV FILE</span>
    </button>`;
  row.append(wrap);   // after the card, so the card's "appear" class can reveal it too (CSS sibling selector)
  const folderBtn = wrap.querySelector(".cv-folder");

  // ---- The sheet ---------------------------------------------------------------------------
  const photo = CV.photo
    ? `<img class="cv-photo cv-photo--img" src="${esc(CV.photo)}" alt="">`
    : `<div class="cv-photo cv-photo--empty" aria-hidden="true">${USER_ICON}<span>PHOTO</span></div>`;

  const section = (label, body) => `<section class="cv-section"><h3 class="cv-label">${label}</h3>${body}</section>`;
  const entry = (title, years, text) => `
    <li class="cv-entry">
      <div class="cv-entry-head"><span class="cv-entry-title">${title}</span><span class="cv-entry-years">${esc(years)}</span></div>
      ${text ? `<p class="cv-entry-text">${esc(text)}</p>` : ""}
    </li>`;
  const dot = " · ";   // no-break space before the dot, so a wrapped line never starts with it

  // A top-bar link: icon, full label, and a short label that CSS shows on
  // phones instead. The aria-label begins with the short label, so the
  // accessible name always holds the visible text.
  const barLink = (cls, attrs, iconSvg, label, short, name) => `
    <a class="ui-button cv-bar-link ${cls}" ${attrs} aria-label="${esc(name)}">${iconSvg}<span class="cv-bar-text cv-bar-text--full">${esc(label)}</span><span class="cv-bar-text cv-bar-text--short">${esc(short)}</span></a>`;

  const modal = document.createElement("div");
  modal.className = "cv-modal";
  modal.innerHTML = `
    <div class="cv-sheet" role="dialog" aria-modal="true" aria-labelledby="cv-bar-label cv-title">
      <div class="cv-bar">
        <span class="cv-bar-label" id="cv-bar-label">CV FILE</span>
        <div class="cv-bar-actions">
          ${barLink("cv-view", `href="${esc(CV.pdf)}" target="_blank" rel="noopener"`, VIEW_ICON, "View PDF", "View", "View PDF (opens in a new tab)")}
          ${barLink("cv-download", `href="${esc(CV.pdf)}" download="${esc(CV.pdfName)}"`, DOWNLOAD_ICON, "Download PDF", "Download", "Download PDF")}
          <button type="button" class="ui-button cv-close" aria-label="Close">${CLOSE_ICON}</button>
        </div>
      </div>
      <div class="cv-scroll" tabindex="-1">
        <header class="cv-head">
          ${photo}
          <div class="cv-id">
            <h2 class="cv-name" id="cv-title">${esc(CV.name)}</h2>
            <p class="cv-role">${esc(CV.role)}${dot}${esc(CV.city)}</p>
            <p class="cv-summary">${esc(CV.summary)}</p>
          </div>
        </header>
        <div class="cv-cols">
          <div class="cv-col">
            ${section("Contact", `
              <ul class="cv-contact">
                <li>${ICONS.email}<span class="visually-hidden">Email: </span><a href="mailto:${esc(CV.email)}">${breakable(CV.email)}</a></li>
                <li>${ICONS.link}<span class="visually-hidden">Link: </span><a href="${esc(CV.link.url)}" target="_blank" rel="noopener">${breakable(CV.link.label)}<span class="visually-hidden"> (opens in a new tab)</span></a></li>
                <li>${ICONS.location}<span class="visually-hidden">Location: </span><span>${esc(CV.location)}</span></li>
              </ul>`)}
            ${section("Skills", `<div class="cv-skill-groups">${CV.skills.map((g) => `
              <div class="cv-skill-group">
                <h4 class="cv-skill-label">${esc(g.group)}</h4>
                <ul class="cv-chips">${g.items.map((s) => `<li class="cv-chip">${esc(s)}</li>`).join("")}</ul>
              </div>`).join("")}</div>`)}
            ${section("Languages", `<ul class="cv-langs">${CV.languages.map((l) => `<li><span>${esc(l.name)}</span><span class="cv-muted">${esc(l.level)}</span></li>`).join("")}</ul>`)}
          </div>
          <div class="cv-col">
            ${section("Experience", `<ul class="cv-entries">${CV.experience.map((e) => entry(esc(e.title) + dot + esc(e.company), e.years, e.text)).join("")}</ul>`)}
            ${section("Projects", `<ul class="cv-entries">${CV.projects.map((p) => entry(esc(p.name) + dot + esc(p.company), p.year, p.text)).join("")}</ul>`)}
            ${section("Education", `<ul class="cv-entries">${CV.education.map((e) => entry(esc(e.degree) + dot + esc(e.school), e.years, e.text)).join("")}</ul>`)}
          </div>
        </div>
      </div>
    </div>`;
  document.body.append(modal);   // a direct child of body: not inside the transformed, clipped ending

  const sheet = modal.querySelector(".cv-sheet");
  const scroller = modal.querySelector(".cv-scroll");
  const closeBtn = modal.querySelector(".cv-close");
  const leftCol = modal.querySelector(".cv-col");

  // The short left column stays in view beside the long right one (CSS
  // sticky, two columns only). Where it is taller than the sheet's room, its
  // sticky top goes negative by the difference: it scrolls until its end is
  // in view and holds there, so none of it is ever hidden. Set whenever the
  // sheet's room or the column's height changes (the sheet is laid out while
  // closed too, so it is right on open).
  function fitSticky() {
    const cs = getComputedStyle(scroller);
    const room = scroller.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    leftCol.style.setProperty("--cv-left-top", `${Math.min(0, room - leftCol.offsetHeight)}px`);
  }
  const stickyObserver = new ResizeObserver(fitSticky);
  stickyObserver.observe(scroller);
  stickyObserver.observe(leftCol);

  // ---- Open and close -----------------------------------------------------------------------
  // Everything else on the page is made inert while the viewer is open (and
  // exactly what was changed is put back), so Tab and screen readers stay in.
  // It opens from anywhere: the folder in the ending, or the CV button
  // (js/skip.js) during the story. opener is the button that opened it; it
  // gets focus back on close. Opening never scrolls the page and doesn't
  // touch the story or the card. root.is-cv-open hides the skip buttons.
  let isOpen = false;
  let inerted = [];
  let opener = folderBtn;

  function open(from) {
    if (isOpen) return false;
    isOpen = true;
    opener = from instanceof HTMLElement ? from : folderBtn;
    inerted = [...document.body.children].filter((el) => el !== modal && el.tagName !== "SCRIPT" && !el.inert);
    inerted.forEach((el) => { el.inert = true; });
    scroller.scrollTop = 0;
    modal.classList.add("is-open");
    root.classList.add("is-cv-open");
    opener.setAttribute("aria-expanded", "true");
    closeBtn.focus({ preventScroll: true });
    return true;   // opened now (false: it already was); the callers' click handlers count it (js/analytics.js)
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    modal.classList.remove("is-open");
    root.classList.remove("is-cv-open");
    opener.removeAttribute("aria-expanded");
    inerted.forEach((el) => { el.inert = false; });
    inerted = [];
    opener.focus({ preventScroll: true });
  }
  folderBtn.addEventListener("click", (e) => { if (open(folderBtn)) window.analytics.event("cv-open", e); });
  closeBtn.addEventListener("click", close);
  modal.querySelector(".cv-view").addEventListener("click", (e) => window.analytics.event("cv-view-pdf", e));
  modal.querySelector(".cv-download").addEventListener("click", (e) => window.analytics.event("cv-download-pdf", e));

  // Backdrop click closes, but only when the press also started there (selecting
  // text in the sheet and letting go outside it must not close).
  let pressedBackdrop = false;
  modal.addEventListener("pointerdown", (e) => { pressedBackdrop = e.target === modal; });
  modal.addEventListener("click", (e) => {
    if (e.target === modal && pressedBackdrop) close();
    pressedBackdrop = false;
  });

  // ---- Keys -------------------------------------------------------------------------------
  // Registered on window in the capture phase, so it runs before the page's own
  // key handlers, which then never see the keys while the viewer is open.
  const KEY_STEP = 48;
  window.addEventListener("keydown", (e) => {
    if (!isOpen) return;
    e.stopPropagation();
    const active = document.activeElement;

    if (e.key === "Escape") { e.preventDefault(); close(); return; }

    if (e.key === "Tab") {   // focus trap: wrap around at either end
      const items = [...modal.querySelectorAll("a[href], button:not([disabled])")];
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (active === first || !modal.contains(active))) { e.preventDefault(); last.focus({ preventScroll: true }); }
      else if (!e.shiftKey && (active === last || !modal.contains(active))) { e.preventDefault(); first.focus({ preventScroll: true }); }
      return;
    }

    // Keys that would scroll the page scroll the sheet instead. Space on a
    // button still presses it.
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === " " && active && active.tagName === "BUTTON") return;
    const page = scroller.clientHeight * 0.9;
    const dy = {
      ArrowDown: KEY_STEP, ArrowUp: -KEY_STEP, PageDown: page, PageUp: -page,
      " ": e.shiftKey ? -page : page,
    }[e.key];
    if (dy !== undefined) { e.preventDefault(); scroller.scrollBy({ top: dy, behavior: "instant" }); }
    else if (e.key === "Home") { e.preventDefault(); scroller.scrollTop = 0; }
    else if (e.key === "End") { e.preventDefault(); scroller.scrollTop = scroller.scrollHeight; }
  }, true);

  // ---- Wheel and touch ----------------------------------------------------------------------
  // The page behind must not scroll. Over the backdrop: cancelled. Over the
  // bar: the sheet's content scrolls. Inside the content: native scrolling,
  // cancelled where it would run out (so it can't hand over to the page).
  // Ctrl+wheel (browser zoom) is left alone.
  modal.addEventListener("wheel", (e) => {
    if (e.ctrlKey) return;
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * scroller.clientHeight : e.deltaY;
    if (!scroller.contains(e.target)) {
      e.preventDefault();
      if (sheet.contains(e.target)) scroller.scrollTop += dy;
      return;
    }
    const atTop = scroller.scrollTop <= 0;
    const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
    if (Math.abs(e.deltaX) > Math.abs(dy) || (dy < 0 && atTop) || (dy > 0 && atEnd)) e.preventDefault();
  }, { passive: false });

  // Touch: the same. Off the content (or when it doesn't scroll at all) the
  // gesture is cancelled; inside it, a pull past the top or the end is
  // cancelled too, so it neither rubber-bands the sheet nor hands the scroll
  // over to the page behind (overscroll-behavior: contain does this only
  // where the browser has it: iOS from 16). Two fingers (pinch zoom) are left
  // alone.
  let touchY = 0;
  modal.addEventListener("touchstart", (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  modal.addEventListener("touchmove", (e) => {
    const y = e.touches[0].clientY;
    const dy = y - touchY;
    touchY = y;
    if (e.touches.length > 1) return;
    if (!scroller.contains(e.target) || scroller.scrollHeight <= scroller.clientHeight) { e.preventDefault(); return; }
    const atTop = scroller.scrollTop <= 0;
    const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
    if ((dy > 0 && atTop) || (dy < 0 && atEnd)) e.preventDefault();
  }, { passive: false });

  window.cvViewer = { open, close, isOpen: () => isOpen };   // isOpen: the scroll hint (js/hint.js) stays away while open
})();
