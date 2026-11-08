// Ending: after the story's final pull-back, normal HTML content scrolls over
// the stuck map stage, which dims as it comes in. The story's progress stays
// at 1 meanwhile, so render(p) (camera, trails, plane, HUD) isn't called:
// the map is frozen. Once the dim is (nearly) full, the stage goes into
// backdrop mode and pauses its CSS animations, so the map doesn't repaint.
(function () {
  const E = window.PACING.ending;
  const stage = document.querySelector(".stage");
  const dim = stage.querySelector(".stage-dim");
  const ending = document.querySelector(".ending");

  // Dim share 0-1, smoothed like the story (same scrub). Opacity only.
  const state = { e: 0 };
  let lastE = null;
  let backdrop = null;

  function apply() {
    const e = state.e;
    if (e === lastE) return;
    dim.style.opacity = e.toFixed(4);
    lastE = e;
    const on = e >= E.backdropAt;
    if (on !== backdrop) {
      stage.classList.toggle("is-backdrop", on);
      backdrop = on;
    }
  }

  const tween = gsap.to(state, {
    e: 1,
    ease: "none",
    onUpdate: apply,
    scrollTrigger: {
      trigger: ending,
      start: E.dimFrom,
      end: E.dimTo,
      scrub: window.PACING.scrub,
    },
  });
  state.e = tween.scrollTrigger.progress;   // the page may open in the ending (scroll restored on reload)
  apply();
})();
