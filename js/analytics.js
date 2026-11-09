// Analytics: custom events for GoatCounter (cookie-free visit statistics).
// The count script itself is added by the loader in index.html's head, on a
// real public host only. Here:
// - window.analytics.event(name, e?): sends one GoatCounter event
//   (goatcounter.count({ event: true, path: name, ... }), the documented
//   events method). It does nothing, silently, when the script isn't there
//   (localhost, blocked by an ad blocker, not loaded yet, offline) and
//   never throws. Pass the click event so a script-made click (isTrusted
//   false) can never count. Callers are real user actions only: a click
//   handler. Nothing here runs on a timer or on load.
// - "ending-reached": the story reaching the ending, once per page visit,
//   counted when the visitor gets there after their first real input (a
//   page that opens inside the ending because the browser restored the
//   scroll position is not a visit to it). Memory only: no storage, no cookies.
// Event names (the paths in GoatCounter's list): cv-open, cv-view-pdf,
// cv-download-pdf, email-copy, email-me, contact-save, skip-contact, skip-cv,
// ending-reached, back-to-start, photos-open (a pile opened the photo
// viewer), photos-next (the first move to another photo in one opening:
// a button, a key, the strip or a swipe; once per opening).
(function () {
  const TITLES = {
    "cv-open": "CV viewer opened",
    "cv-view-pdf": "View PDF clicked",
    "cv-download-pdf": "Download PDF clicked",
    "email-copy": "Copy email",
    "email-me": "Email me",
    "contact-save": "Save contact",
    "skip-contact": "CONTACT skip button",
    "skip-cv": "CV skip button",
    "ending-reached": "Story reached the ending",
    "back-to-start": "Back to start",
    "photos-open": "Photo viewer opened",
    "photos-next": "Photo viewer: moved to another photo",
  };

  function event(name, e) {
    try {
      if (e && e.isTrusted === false) return;
      const gc = window.goatcounter;
      if (!gc || typeof gc.count !== "function") return;   // not loaded, or blocked
      gc.count({ event: true, path: name, title: TITLES[name] || name });
    } catch (err) { /* analytics must never change what the page does */ }
  }

  // ---- The story reaching the ending ----------------------------------------------------------
  let interacted = false;
  let counted = false;
  const markInput = (e) => { if (e.isTrusted) interacted = true; };
  for (const type of ["wheel", "touchstart", "keydown", "pointerdown", "mousedown"]) {
    window.addEventListener(type, markInput, { capture: true, passive: true });
  }

  try {
    window.story.onRender((p, section) => {
      if (counted || !interacted || section.id !== "ending") return;
      counted = true;
      event("ending-reached");
    });
  } catch (err) { /* no story: nothing to count */ }

  window.analytics = { event };
})();
