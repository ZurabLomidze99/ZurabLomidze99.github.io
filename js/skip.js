// Skip buttons: CONTACT and CV, two pills in the top-right corner, outside
// the map, from page load and in every story section, so a visitor can get
// to contact or the CV without scrolling through the story.
// - CONTACT: the fade jump (js/navigation.js) to the ending at rest, the
//   rail's Contact target. While the overlay is opaque the visiting card is
//   shown complete and scrolled into view (js/visiting-card.js reveal), and
//   keyboard focus goes to the card's shown face. Reduced motion: an instant
//   jump, as every fade jump.
// - CV: opens the CV viewer (js/cv-viewer.js) right where the visitor is.
//   The page doesn't move and the card's flip state isn't touched; closing
//   gives focus back to this button.
// Hidden in the ending (story section "ending" and past it: the card and the
// CV folder are there) and while the viewer is open (CSS: root.is-cv-open).
// Opacity only. --skip-w (the pair's width, px) lets the portrait HUD wrap
// clear of it.
(function () {
  const P = window.PACING;
  const story = window.story;
  const root = document.documentElement;

  root.style.setProperty("--skip-fade", `${P.skip.fade}s`);

  const contactTarget = P.navigation.chapters.find((ch) => ch.id === "end").target;   // the ending at rest
  const ARROW = `<svg class="skip-icon" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5v8.5M2.5 6.5L6 10l3.5-3.5"/></svg>`;

  const group = document.createElement("div");
  group.className = "skip";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Shortcuts");
  group.innerHTML = `
    <button type="button" class="skip-button skip-contact" aria-label="Skip to contact"><span class="skip-text">Contact</span>${ARROW}</button>
    <button type="button" class="skip-button skip-cv" aria-label="Open CV" aria-haspopup="dialog"><span class="skip-text">CV</span></button>`;
  document.body.prepend(group);   // first in the Tab order; outside the stage, so its drag/zoom handlers never see these clicks

  const contactBtn = group.querySelector(".skip-contact");
  const cvBtn = group.querySelector(".skip-cv");

  contactBtn.addEventListener("click", () => {
    const card = window.visitingCard;
    window.navigation.fadeTo(contactTarget, () => card.focusCard(), () => card.reveal());
  });
  cvBtn.addEventListener("click", () => window.cvViewer.open(cvBtn));

  // Hidden in the ending. render(p) gives the section; in the ending p stays
  // at 1 (section "ending"), so the state holds there.
  let away = null;
  story.onRender((p, section) => {
    const on = section.id === "ending";
    if (on === away) return;
    away = on;
    group.classList.toggle("is-away", on);
  });

  // The pair's width, for the portrait HUD (css/style.css).
  new ResizeObserver(() => {
    root.style.setProperty("--skip-w", `${group.offsetWidth}px`);
  }).observe(group);

  window.skipButtons = { el: group };
})();
