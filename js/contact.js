// Contact form config for the visiting card's back face ("Leave your card",
// js/visiting-card.js).
//
// mode "hidden" (the default, for launch): the form is not offered. The
// visiting card has no back face, no "Leave your card" button, no flip and no
// demo note; none of it is rendered or run, so nothing about the form is in
// the page. All the form and flip code stays in js/visiting-card.js and
// css/style.css: set the mode back to "demo" (or "live") to bring it back.
//
// mode "demo": Send makes no network request, uses no storage (no
// localStorage, sessionStorage or cookies) and keeps nothing. It only shows a
// success state in the form area, and the form shows a "Demo: nothing is
// sent." note. Switching to "live" is part of the release checklist in
// CLAUDE.md; the note goes away with it.
(function () {
  const CONTACT = {
    mode: "hidden", // "hidden" | "demo" | "live"
    endpoint: "",   // live mode only: where the form data goes (a service chosen before publishing)
  };

  // Called by the form with { first, last, email, company, message }.
  CONTACT.send = async function (data) {
    if (CONTACT.mode !== "live") return { ok: true };   // demo: the data stays on the page and is dropped

    // ---- LIVE MODE: STUB, NOT IMPLEMENTED AND NOT ENABLED ----
    // To be written once a form service is chosen: send `data` to
    // CONTACT.endpoint, resolve with { ok: true } on success and throw on
    // failure (the form then shows an error and keeps the fields).
    throw new Error("contact: live mode is not implemented yet");
  };

  window.CONTACT = CONTACT;
})();
