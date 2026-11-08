// Title screen: the name types out like a terminal (blinking block cursor).
// Runs once on page load, by time, not
// scrubbed to scroll. Shown only in the title section (from the story's
// render(p)); coming back later shows it complete, never retyped.
(function () {
  const T = window.PACING.title;
  const PROFILE = window.PROFILE;
  const root = document.documentElement;

  root.style.setProperty("--title-hide", `${T.hide}s`);

  // Inside the stage, so Ctrl+wheel and drag over the text still reach the
  // map (it takes no pointer events). The full name sits invisibly in the
  // same grid cell as the typed text, so the centred block has its final
  // width from the start and the letters grow from a fixed left edge.
  // Purely visual (aria-hidden): the page's h1 is the hidden story text
  // (js/story-text.js). This block turns visibility: hidden after the title,
  // which would take a heading out of the accessibility tree for the rest of
  // the page.
  const box = document.createElement("div");
  box.className = "title";
  box.setAttribute("aria-hidden", "true");
  box.innerHTML = `
    <div class="title-name">
      <span class="title-ghost"></span>
      <span class="title-line"><span class="title-typed"></span><span class="title-cursor"></span></span>
    </div>`;
  box.querySelector(".title-ghost").textContent = PROFILE.name;
  const typed = box.querySelector(".title-typed");
  document.querySelector(".stage").append(box);

  // Fit to the width: the full name's width in em as drawn (letters and
  // tracking), plus the cursor's width on both sides (it hangs past the end
  // of the centred name), so CSS can shrink it to --title-max-width whatever
  // its length. The same at any size, so measured once.
  const CURSOR_EM = 0.6;   // the cursor's width (.title-cursor in css/style.css)
  const nameEl = box.querySelector(".title-name");
  const ghostW = box.querySelector(".title-ghost").getBoundingClientRect().width;
  box.style.setProperty("--title-ems", (ghostW / parseFloat(getComputedStyle(nameEl).fontSize) + 2 * CURSOR_EM).toFixed(3));

  const name = PROFILE.name;
  let typedCount = 0;
  let timer = 0;

  function finish() {
    clearTimeout(timer);
    typedCount = name.length;
    typed.textContent = name;
    box.classList.add("is-typed");   // done (the desktop snapshot harness waits for it)
  }

  // One letter at a time; each letter's time varies a little.
  function typeNext() {
    typedCount += 1;
    typed.textContent = name.slice(0, typedCount);
    if (typedCount >= name.length) {
      box.classList.add("is-typed");
      return;
    }
    const jitter = 1 + (Math.random() * 2 - 1) * T.charJitter;
    const space = name[typedCount] === " " ? 0.6 : 1;   // spaces go a bit quicker
    timer = setTimeout(typeNext, T.charTime * jitter * space * 1000);
  }

  // The browser may restore the scroll position on reload: if the page opens
  // past the title, skip the typing and keep the text complete for later.
  const story = window.story;
  // Reduced motion: no typing, the name is there complete from the start (and
  // switching the setting on while it types completes it).
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches || story.sectionAt(story.scrollProgress() * 100).id !== "title") finish();
  else timer = setTimeout(typeNext, T.startDelay * 1000);
  reducedMotion.addEventListener("change", () => { if (reducedMotion.matches) finish(); });

  let hidden = null;
  story.onRender((p, section) => {
    const hide = section.id !== "title";
    if (hide === hidden) return;
    box.classList.toggle("is-hidden", hide);
    if (hide && typedCount < name.length) finish();   // left mid-typing: complete it, no retyping
    hidden = hide;
  });
})();
