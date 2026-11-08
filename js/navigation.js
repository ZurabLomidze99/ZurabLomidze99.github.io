// Navigation: chapter rail (left edge; a bottom bar in the portrait layout)
// and a "Back to start" button at the bottom of the ending. Everything
// updates from the story's render(p), and only touches transform, opacity
// and classes. (The scroll cue is the scroll hint, js/hint.js.)
//
// Two ways to get somewhere: an animated scroll through the story, or a fade
// jump (cover the screen, jump, uncover). "Back to start" always fades, so
// the story never rewinds; rail clicks follow PACING.navigation.railJump.
(function () {
  const N = window.PACING.navigation;
  const story = window.story;
  const camera = window.camera;
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---- Animated scroll (core GSAP tween on a proxy; no ScrollToPlugin) ---------
  let scrollTween = null;
  let scrollGoal = 0;   // where the running scroll is heading (re-aimed if the timeline changes, js/timeline.js)
  let proxy = null;   // { pos } of the last animation; null once the user takes over

  // When the page last moved by itself (a rail or bar scroll step, a fade
  // jump). The scroll hint (js/hint.js)
  // uses it to tell a visitor's own scrolling from ours.
  let movedAt = -Infinity;
  const noteMove = () => { movedAt = performance.now(); };

  // Touch snap stops (js/snap.js) are off while a scroll animation runs.
  let snapHeld = false;
  function snapHold() {
    if (snapHeld || !window.snap) return;
    snapHeld = true;
    window.snap.hold();
  }
  function snapRelease() {
    if (!snapHeld) return;
    snapHeld = false;
    window.snap.release();
  }

  function cancelScroll() {
    if (scrollTween) {
      scrollTween.kill();
      scrollTween = null;
    }
    proxy = null;
    snapRelease();
  }

  // Tweens the page position (story %, or past 100 into the ending; see
  // js/scroll-story.js), not pixels, so a resize or browser zoom during the
  // animation still lands on the right spot.
  function scrollToPos(pos) {
    cancelFade();
    cancelScroll();
    camera.resetUserZoom();
    const screens = Math.abs(story.yForPos(pos) - window.scrollY) / window.layout.screenHeight();
    const duration = Math.min(N.maxDuration, Math.max(N.minDuration, screens * N.secondsPerScreen));
    runScroll(story.pagePos(), pos, duration, N.ease);
  }

  function runScroll(from, goal, duration, ease) {
    scrollGoal = goal;
    proxy = { pos: from };
    snapHold();
    scrollTween = gsap.to(proxy, {
      pos: goal,
      duration,
      ease,
      onUpdate: () => { noteMove(); window.scrollTo(0, story.yForPos(proxy.pos)); },
      onComplete: () => { scrollTween = null; snapRelease(); },
    });
  }

  // ---- Fade jump ------------------------------------------------------------------
  // A full-screen overlay fades in over the current view (opacity only; it
  // takes pointer events only while fading out, so nothing underneath gets
  // clicked). While it's opaque the page jumps: scroll, user zoom, scroll
  // smoothing and one render all land on the target at once, and CSS
  // transitions are off for that moment, so cards, passes, labels, the
  // plane and the title are already in their new state. Then the overlay
  // fades away, revealing a still view: nothing glides.
  const overlay = document.createElement("div");
  overlay.className = "jump-fade";
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.background = `var(${N.fadeColor})`;
  document.body.append(overlay);

  let fade = null;   // { phase: "out" | "in", tween } while a fade runs

  // onJump: runs right after the jump, still with transitions off (the
  // CONTACT button uses it to show the visiting card complete and in view).
  // focusEl: an element, or a function that picks one after the jump.
  function jumpNow(pos, focusEl, onJump) {
    if (window.snap) window.snap.hold();   // touch snap stops: off for the jump and onJump's own scrolling (the card reveal)
    root.classList.add("is-jumping");      // no CSS transitions for this one moment
    camera.resetUserZoom(true);
    noteMove();
    story.jumpTo(pos);
    if (onJump) onJump();
    void root.offsetHeight;                // apply the new state with transitions off
    root.classList.remove("is-jumping");
    const el = typeof focusEl === "function" ? focusEl() : focusEl;
    if (el) el.focus({ preventScroll: true });
    if (window.snap) window.snap.release();
  }

  function fadeTo(pos, focusEl, onJump) {
    cancelScroll();
    window.dispatchEvent(new Event("fadejump"));   // the scroll hint (js/hint.js) leaves at once
    if (fade) fade.tween.kill();
    if (reducedMotion.matches) {
      endFade();
      jumpNow(pos, focusEl, onJump);
      return;
    }
    overlay.classList.add("is-active", "is-blocking");
    fade = { phase: "out", pos };   // pos is re-aimed if the timeline changes meanwhile (js/timeline.js)
    fade.tween = gsap.to(overlay, {
      opacity: 1,
      duration: N.fadeOut,
      ease: N.fadeOutEase,
      onComplete: () => {
        jumpNow(fade.pos, focusEl, onJump);
        overlay.classList.remove("is-blocking");   // input is normal from here
        fade.phase = "in";
        fade.tween = gsap.to(overlay, { opacity: 0, duration: N.fadeIn, ease: N.fadeInEase, onComplete: endFade });
      },
    });
  }

  function endFade() {
    if (fade) fade.tween.kill();
    fade = null;
    gsap.set(overlay, { opacity: 0 });
    overlay.classList.remove("is-active", "is-blocking");
  }

  // Wheel, key or touch while fading out: no jump; the overlay fades back
  // away from wherever it got to. (After the jump, input is normal.)
  function cancelFade() {
    if (!fade || fade.phase !== "out") return;
    fade.tween.kill();
    overlay.classList.remove("is-blocking");
    fade.phase = "in";
    const left = Number(gsap.getProperty(overlay, "opacity"));
    fade.tween = gsap.to(overlay, { opacity: 0, duration: N.fadeIn * left, ease: N.fadeInEase, onComplete: endFade });
  }

  // Rail clicks: scroll or fade, by PACING.navigation.railJump; "auto" fades
  // when the jump is longer than fadeAbove of the story's scroll length.
  function goTo(pos) {
    if (window.snap) pos = window.snap.near(pos);   // touch snap stops: land on the chapter's stop (unchanged with a mouse)
    let fadeIt = N.railJump === "fade" || reducedMotion.matches;   // reduced motion: never an animated scroll (the fade jump is instant then)
    if (N.railJump === "auto" && !fadeIt) {
      const storyLength = story.yForPos(100) - story.yForPos(0);
      fadeIt = Math.abs(story.yForPos(pos) - window.scrollY) / storyLength > N.fadeAbove;
    }
    if (fadeIt) fadeTo(pos);
    else scrollToPos(pos);
  }

  // Any input of the user's own stops a scroll animation immediately: wheel,
  // touch, keys, and mouse down (which includes grabbing the scrollbar).
  // Wheel, touch and keys also call off a fade that hasn't jumped yet.
  // Capture phase, so it runs before anything else; a click then starts fresh.
  for (const type of ["wheel", "touchstart", "keydown", "mousedown"]) {
    window.addEventListener(type, () => {
      cancelScroll();
      if (type !== "mousedown") cancelFade();
    }, { capture: true, passive: true });
  }

  // ---- Chapter rail -----------------------------------------------------------------
  // Down the left edge; in the portrait layout the same nav lies along the
  // bottom edge as a bar (css/style.css), so only the fill's axis changes here.
  const rail = document.createElement("nav");
  rail.className = "rail";
  rail.setAttribute("aria-label", "Chapters");
  rail.innerHTML = `
    <div class="rail-track" aria-hidden="true"><div class="rail-fill"></div></div>
    <ol class="rail-nodes"></ol>`;
  const fill = rail.querySelector(".rail-fill");
  const list = rail.querySelector(".rail-nodes");

  // Node positions along the rail (%), and each node's distance to its
  // neighbours, so a hit area can give way where two dots are closer than its
  // size (200: no neighbour on that side).
  // Read from the targets now and again when the timeline changes (js/timeline.js).
  const ats = N.chapters.map(() => 0);
  const nodes = N.chapters.map((ch, i) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rail-node";
    button.setAttribute("aria-label", `Go to ${ch.label}`);
    button.innerHTML = `<span class="rail-dot" aria-hidden="true"></span><span class="rail-label" aria-hidden="true">${ch.label}</span>`;
    button.addEventListener("click", () => goTo(ch.target));
    li.append(button);
    list.append(li);
    return { ch, button, li };
  });
  function placeNodes() {
    N.chapters.forEach((ch, i) => { ats[i] = Math.min(100, ch.target); });   // past the story (the ending): rail bottom
    nodes.forEach(({ li }, i) => {
      li.style.setProperty("--at", ats[i]);
      li.style.setProperty("--gap-before", i > 0 ? ats[i] - ats[i - 1] : 200);
      li.style.setProperty("--gap-after", i < ats.length - 1 ? ats[i + 1] - ats[i] : 200);
    });
  }
  placeNodes();

  // The timeline changed (a touch screen's story lengths, js/timeline.js): the
  // nodes move with the targets, and anything under way that holds a position
  // in the old numbers is re-aimed to the same place in the new ones.
  window.addEventListener("timelinechange", (e) => {
    const convert = e.detail.convert;
    placeNodes();
    if (fade && fade.phase === "out") fade.pos = convert(fade.pos);
    if (scrollTween) {   // restarts from where it is, toward the same target, for the time it had left
      const left = Math.max(0.1, scrollTween.duration() - scrollTween.time());
      const from = convert(proxy.pos), goal = convert(scrollGoal);
      scrollTween.kill();
      runScroll(from, goal, left, N.ease);
    } else if (proxy) {
      proxy.pos = convert(proxy.pos);
    }
  });
  // Outside the stage, so its drag/zoom handlers never see these clicks. Before
  // <main> in the DOM (it is position: fixed, so nothing moves), so the Tab
  // order is: skip buttons, chapters, then the page's own content.
  document.body.insertBefore(rail, document.querySelector("main"));
  const startButton = nodes[0].button;   // first focusable element at the top

  // ---- Back to start (ending) --------------------------------------------------------------
  // In the ending's flow, as its last element: out of view (and only reached
  // by Tab, which scrolls to it) until the ending. Always a fade jump to the
  // top, never a scroll back through the story; focus goes to the rail's Start.
  const back = document.createElement("button");
  back.type = "button";
  back.className = "back-to-start";
  back.textContent = "Back to start";
  back.addEventListener("click", () => fadeTo(0, startButton));
  document.querySelector(".ending-inner").append(back);

  // ---- Update from the story's render(p) ------------------------------------------------
  let activeId = null;
  let fillP = 0;
  let axis = window.layout.mode() === "portrait" ? "X" : "Y";   // the bar fills along X

  window.addEventListener("layoutchange", () => {
    axis = window.layout.mode() === "portrait" ? "X" : "Y";
    fill.style.transform = `scale${axis}(${fillP})`;
  });

  story.onRender((p, section) => {
    fillP = p;
    fill.style.transform = `scale${axis}(${p})`;

    // In the ending p stays 1 (section "ending"), so End stays lit there.
    const active = N.chapters.find((ch) => ch.sections.includes(section.id)) || N.chapters[0];
    if (active.id !== activeId) {
      for (const { ch, button } of nodes) {
        const on = ch.id === active.id;
        button.classList.toggle("is-active", on);
        if (on) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      }
      activeId = active.id;
    }
  });

  window.navigation = {
    scrollToPos,
    fadeTo,
    goTo,
    cancelScroll,
    isScrolling: () => !!scrollTween,
    isFading: () => !!fade,
    noteMove,
    movedAt: () => movedAt,
    // Page position the last animation is at (or ended at); null if the user
    // has scrolled or pressed a key since.
    animatedPos: () => (proxy ? proxy.pos : null),
  };
})();
