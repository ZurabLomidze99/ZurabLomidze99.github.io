// Visiting card in the ending: name, role and city, email / link / location
// lines with small icons, and a small route emblem drawn from the real route
// data. Same visual language as the boarding pass. Under it, an action bar:
// Email me (a mailto link), Copy email, Save contact (.vcf built in the
// browser). Everything comes from js/profile.js (real content).
// The right half of the row holds the CV folder (js/cv-viewer.js).
//
// The back face with the contact form ("Leave your card"), the flip and the
// keyboard handling run only when js/contact.js's mode isn't "hidden" (FORM
// below). In "hidden" mode none of it is rendered, so the card is just its
// front at its own height and nothing about the form is in the page.
(function () {
  const V = window.PACING.vcard;
  const PROFILE = window.PROFILE;
  const CONTACT = window.CONTACT;
  const FORM = CONTACT.mode !== "hidden";
  const map = window.WORLD_MAP;
  const root = document.documentElement;
  const NS = "http://www.w3.org/2000/svg";

  root.style.setProperty("--vcard-appear", `${V.appear}s`);
  root.style.setProperty("--vcard-flip", `${V.flip}s`);
  root.style.setProperty("--vcard-flip-fade", `${V.flipFade}s`);
  root.style.setProperty("--vcard-flip-height", `${V.flipHeight}s`);

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---- Route emblem ------------------------------------------------------------------
  // The two routes (every 10th sampled point) and the three cities, in map
  // coordinates, fitted into a box EMBLEM_W wide. 1 viewBox unit = 1u (the
  // svg is EMBLEM_W u wide in CSS), so strokes and dots are sized in u.
  const EMBLEM_W = 204, PAD = 8;
  function emblem() {
    const lines = map.routes.map((r) => r.points.filter((p, i) => i % 10 === 0 || i === r.points.length - 1).map((p) => [p[3], p[4]]));
    const cities = Object.values(map.cities).map((c) => [c.x, c.y]);
    const all = lines.flat().concat(cities);
    const minX = Math.min(...all.map((p) => p[0])), maxX = Math.max(...all.map((p) => p[0]));
    const minY = Math.min(...all.map((p) => p[1])), maxY = Math.max(...all.map((p) => p[1]));
    const s = (EMBLEM_W - 2 * PAD) / (maxX - minX);
    const h = Math.ceil((maxY - minY) * s + 2 * PAD);
    const pt = ([x, y]) => `${(PAD + (x - minX) * s).toFixed(1)} ${(PAD + (y - minY) * s).toFixed(1)}`;
    const arcs = lines.map((l) => "M" + l.map(pt).join("L")).join("");
    const dots = cities.map((c) => {
      const [x, y] = pt(c).split(" ");
      return `<circle class="vcard-emblem-ring" cx="${x}" cy="${y}" r="5.5"/><circle class="vcard-emblem-dot" cx="${x}" cy="${y}" r="2.6"/>`;
    }).join("");
    return `<svg class="vcard-emblem" viewBox="0 0 ${EMBLEM_W} ${h}" style="--emblem-w:${EMBLEM_W};--emblem-h:${h}" aria-hidden="true">
      <path class="vcard-emblem-glow" d="${arcs}"/><path class="vcard-emblem-arc" d="${arcs}"/>${dots}</svg>`;
  }

  // ---- Icons (20-unit box, stroked in the places blue) ---------------------------------
  const icon = (d) => `<svg class="vcard-icon" viewBox="0 0 20 20" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    email: icon(`<rect x="2.5" y="4.5" width="15" height="11" rx="1.5"/><path d="M3 5.5l7 5.5 7-5.5"/>`),
    link: icon(`<path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1"/><path d="M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1"/>`),
    location: icon(`<path d="M10 17.5s-5.5-5.2-5.5-9a5.5 5.5 0 0 1 11 0c0 3.8-5.5 9-5.5 9z"/><circle cx="10" cy="8.5" r="2"/>`),
  };
  const MAIL_SUBJECT = "Hello from your website";

  // A button whose label can swap without changing its width: both labels
  // share one grid cell; the hidden one is visibility: hidden (and so not
  // part of the button's name). `fail` is a third label for "it didn't work".
  const button = (cls, label, alt, attrs = 'type="button"', fail = "") => `
    <button ${attrs} class="ui-button ${cls}">
      <span class="ui-button-label">${esc(label)}</span>${alt ? `<span class="ui-button-label ui-button-label--alt">${esc(alt)}</span>` : ""}${fail ? `<span class="ui-button-label ui-button-label--fail">${esc(fail)}</span>` : ""}
    </button>`;

  // ---- Markup -------------------------------------------------------------------------
  const row = document.createElement("div");
  row.className = "ending-row";
  row.innerHTML = `
    <div class="vcard-wrap">
      <div class="vcard-scene">
        <article class="vcard">
          <div class="vcard-face vcard-front" role="group" aria-labelledby="vcard-name">
            <p class="vcard-kicker">Visiting card</p>
            ${emblem()}
            <h3 class="vcard-name" id="vcard-name">${esc(PROFILE.name)}</h3>
            <p class="vcard-role">${esc(PROFILE.role)} · ${esc(PROFILE.city)}</p>
            <ul class="vcard-lines">
              <li>${ICONS.email}<span class="visually-hidden">Email: </span><a class="vcard-email" href="mailto:${esc(PROFILE.email)}">${esc(PROFILE.email)}</a></li>
              <li>${ICONS.link}<span class="visually-hidden">Link: </span><a href="${esc(PROFILE.link.url)}" target="_blank" rel="noopener">${esc(PROFILE.link.label)}<span class="visually-hidden"> (opens in a new tab)</span></a></li>
              <li>${ICONS.location}<span class="visually-hidden">Location: </span><span>${esc(PROFILE.location)}</span></li>
            </ul>
          </div>
          ${FORM ? `<form class="vcard-face vcard-back" novalidate aria-labelledby="vcf-title" inert>
            <div class="vcard-form-body">
              <h3 class="vcard-form-title" id="vcf-title" tabindex="-1">Leave your card</h3>
              <p class="vcard-form-sub">All fields are optional</p>
              <div class="vcard-fields">
                <div class="vcard-field"><label for="vcf-first">First name</label><input id="vcf-first" name="first" type="text" autocomplete="given-name" autocapitalize="words"></div>
                <div class="vcard-field"><label for="vcf-last">Last name</label><input id="vcf-last" name="last" type="text" autocomplete="family-name" autocapitalize="words"></div>
                <div class="vcard-field vcard-field--wide"><label for="vcf-email">Email</label><input id="vcf-email" name="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false"></div>
                <div class="vcard-field vcard-field--wide"><label for="vcf-company">Company</label><input id="vcf-company" name="company" type="text" autocomplete="organization" autocapitalize="words"></div>
                <div class="vcard-field vcard-field--wide"><label for="vcf-message">Message</label><textarea id="vcf-message" name="message" rows="3" autocomplete="off"></textarea></div>
              </div>
              <label class="vcard-consent"><input type="checkbox" name="consent"><span>I agree my details are used only to reply to me.</span></label>
              <div class="vcard-hp" aria-hidden="true"><label for="vcf-website">Website</label><input id="vcf-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
              <div class="vcard-send-row">
                ${button("vcard-send", "Send", "", 'type="submit" disabled aria-describedby="vcf-hint"')}
                ${CONTACT.mode === "demo" ? '<p class="vcard-note">Demo: nothing is sent.</p>' : ""}
              </div>
              <p class="vcard-hint" id="vcf-hint" aria-live="polite"></p>
            </div>
            <div class="vcard-done">
              <p class="vcard-done-text"></p>
              ${button("vcard-done-back", "Back to card")}
            </div>
          </form>` : ""}
        </article>
      </div>
      <div class="vcard-actions">
        <a class="ui-button vcard-mail" href="mailto:${esc(PROFILE.email)}?subject=${encodeURIComponent(MAIL_SUBJECT)}">${ICONS.email}<span class="ui-button-label">Email me</span></a>
        ${button("vcard-copy", "Copy email", "Copied", 'type="button"', "Selected")}
        ${button("vcard-save", "Save contact")}
        ${FORM ? button("vcard-flip", "Leave your card", "Back to card", 'type="button" aria-pressed="false"') : ""}
      </div>
      <p class="visually-hidden" aria-live="polite"></p>
    </div>`;
  // Under the heading; the foot ("Back to start" and the statistics note) stays last.
  document.querySelector(".ending-inner .ending-foot").before(row);

  const wrap = row.querySelector(".vcard-wrap");
  const live = row.querySelector("[aria-live]");
  const say = (text) => {
    live.textContent = "";
    setTimeout(() => { live.textContent = text; }, 60);   // cleared first, so the same text is announced again
  };

  // ---- Copy email -------------------------------------------------------------------------
  // Clipboard API where it's available (secure contexts: https, localhost);
  // otherwise (plain http on a LAN address on a phone, file://) a hidden textarea and
  // execCommand("copy"), with the iOS details: the textarea is readonly (no
  // keyboard), 16px (no zoom on focus), on screen (not display: none), and
  // selected with setSelectionRange too, all within the tap's own task (no
  // await before it in this case). If both fail, the address on the card is
  // selected so it can be copied by hand, and the button says "Selected".
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) { /* blocked: try the fallback */ }
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    ta.style.cssText = "position:fixed;left:0;top:0;width:2em;height:2em;padding:0;border:0;outline:0;box-shadow:none;background:transparent;font-size:16px;opacity:0;pointer-events:none";
    document.body.append(ta);
    ta.focus({ preventScroll: true });
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  const copyBtn = row.querySelector(".vcard-copy");
  let copiedTimer = 0;
  copyBtn.addEventListener("click", async (e) => {
    window.analytics.event("email-copy", e);   // the action, whether or not the browser lets the copy through
    const ok = await copyText(PROFILE.email);
    copyBtn.focus({ preventScroll: true });   // the fallback moved focus to its textarea
    if (!ok) {
      const range = document.createRange();
      range.selectNodeContents(row.querySelector(".vcard-email"));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    copyBtn.classList.toggle("is-done", ok);
    copyBtn.classList.toggle("is-failed", !ok);
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => copyBtn.classList.remove("is-done", "is-failed"), V.copiedFor * 1000);
    say(ok ? "Email address copied." : "Couldn't copy. The email address is selected on the card: use Copy from the menu.");
  });

  // ---- Save contact (.vcf) --------------------------------------------------------------
  // vCard 3.0 built in the browser: name, email, link, city. Downloaded from
  // a Blob through a temporary link; no server, no network request.
  const vEsc = (s) => String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
  function vcard() {
    return [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${vEsc(PROFILE.familyName)};${vEsc(PROFILE.givenName)};;;`,
      `FN:${vEsc(`${PROFILE.givenName} ${PROFILE.familyName}`)}`,
      `EMAIL;TYPE=INTERNET:${vEsc(PROFILE.email)}`,
      `URL:${vEsc(PROFILE.link.url)}`,
      `ADR;TYPE=WORK:;;;${vEsc(PROFILE.city)};;;`,
      "END:VCARD",
    ].join("\r\n") + "\r\n";
  }
  const fileName = `${PROFILE.givenName}-${PROFILE.familyName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "contact";

  row.querySelector(".vcard-mail").addEventListener("click", (e) => window.analytics.event("email-me", e));

  row.querySelector(".vcard-save").addEventListener("click", (e) => {
    window.analytics.event("contact-save", e);
    const url = URL.createObjectURL(new Blob([vcard()], { type: "text/vcard;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.vcf`;
    a.hidden = true;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say("Contact file downloaded.");
  });

  // ---- Flip -------------------------------------------------------------------------------
  // The card turns around its vertical axis (transform only), on the desktop:
  // the wide layout with a mouse. In the portrait layout, on touch screens,
  // where the user prefers reduced motion, or where 3D transforms aren't
  // supported, the faces swap instead (instantly, or with a short crossfade):
  // .is-fade. In portrait the card then takes the shown face's own height
  // (css/style.css). The hidden face is inert, so it can't be focused or read.
  const card = row.querySelector(".vcard");
  const front = row.querySelector(".vcard-front");
  let focusFace = () => front;   // what the CONTACT button focuses; the form heading when the card is turned over

  // ---- Form, flip and keyboard: only when the contact form is offered (js/contact.js mode is not "hidden") ----
  if (FORM) {
    const back = row.querySelector(".vcard-back");
    const flipBtn = row.querySelector(".vcard-flip");
    const form = back;

    const has3d = window.CSS && CSS.supports("transform-style", "preserve-3d") && CSS.supports("backface-visibility", "hidden");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const layout = window.layout;
    const syncMode = () => card.classList.toggle("is-fade",
      !has3d || reduced.matches || layout.mode() === "portrait" || layout.touch());
    syncMode();
    reduced.addEventListener("change", syncMode);
    window.addEventListener("layoutchange", syncMode);

    // While turning, the faces' visibility (CSS) and inertness (here) both
    // switch at the halfway point, from the same duration, and the card ignores
    // new flips until it has landed. Swapping faces (.is-fade) is immediate.
    let flipped = false;
    let turning = false;
    let turnTimers = [];
    function settleFaces() {
      front.inert = flipped;
      back.inert = !flipped;
    }
    // A moment after the switch, so the face is surely visible (a hidden element
    // can't take focus). On touch the face's heading takes it, not the first
    // field: a field would bring up the on-screen keyboard over the form.
    const formTitle = form.querySelector(".vcard-form-title");
    function focusForm() {
      if (!flipped || form.contains(document.activeElement)) return;
      (layout.touch() ? formTitle : form.elements.first).focus({ preventScroll: true });
      refreshHint(true);
    }
    // The CSS visibility switch's own end is the reliable moment; the timer is a backup.
    back.addEventListener("transitionend", (e) => {
      if (e.target === back && e.propertyName === "visibility") { settleFaces(); focusForm(); }
    });
    // Where each face keeps its own height (portrait, touch; css/style.css) the
    // card is a different height after the swap, and everything under it would
    // jump. The card eases from the old height to the new one instead (height
    // only changes in that case, so this is a no-op elsewhere). `after` runs
    // once it has landed.
    let heightTimer = 0;
    function swapFaces(change, after) {
      const from = card.getBoundingClientRect().height;
      change();
      const to = card.getBoundingClientRect().height;
      clearTimeout(heightTimer);
      if (reduced.matches || Math.abs(from - to) < 1) { card.style.height = ""; after(); return; }
      card.style.height = `${from}px`;
      card.getBoundingClientRect();   // commit the start height
      card.style.height = `${to}px`;
      heightTimer = setTimeout(() => { card.style.height = ""; after(); }, V.flipHeight * 1000 + 30);
    }
    // On touch, once the card has its new height, scroll just enough that all
    // of it is on screen (as far as it fits); css: .vcard-scene's scroll margins
    // keep it clear of the chapter bar.
    function showCard() {
      if (!layout.touch()) return;
      card.scrollIntoView({ block: "nearest", behavior: reduced.matches ? "instant" : "smooth" });
    }

    function setFlipped(on) {
      if (on === flipped || turning) return;
      flipped = on;
      if (on) resetDone();   // coming back to the form after a send: show the empty form
      const toggle = () => card.classList.toggle("is-flipped", on);
      flipBtn.setAttribute("aria-pressed", String(on));
      if (!on) flipBtn.focus({ preventScroll: true });   // outside the faces: can take focus at once
      if (card.classList.contains("is-fade")) {
        swapFaces(toggle, showCard);
        settleFaces();
        focusForm();
        return;
      }
      toggle();
      turning = true;
      turnTimers.forEach(clearTimeout);
      turnTimers = [
        setTimeout(settleFaces, V.flip * 500),
        setTimeout(focusForm, V.flip * 500 + 60),
        setTimeout(() => { turning = false; }, V.flip * 1000),
      ];
    }
    flipBtn.addEventListener("click", () => setFlipped(!flipped));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && flipped) setFlipped(false);
    });

    // ---- The form (back face) ---------------------------------------------------------------
    // Send needs (email or message) AND the consent box. A short hint, in a
    // polite live region and linked to the button, says what is missing. The
    // honeypot is a hidden field real people never see: if it's filled, the
    // submission is treated as spam (same success state, nothing else done).
    const sendBtn = form.querySelector(".vcard-send");
    const hint = form.querySelector(".vcard-hint");
    const doneText = form.querySelector(".vcard-done-text");
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const el = form.elements;

    function missing() {
      const email = el.email.value.trim();
      const list = [];
      if (!email && !el.message.value.trim()) list.push("Add an email or a message");
      if (email && !EMAIL_RE.test(email)) list.push("Check the email address");
      if (!el.consent.checked) list.push("Please tick the box");
      return list;
    }
    // The button follows the fields at once; the hint text waits for a typing
    // pause (or `now`), so the live region doesn't chatter on every key.
    let hintTimer = 0;
    function refreshHint(now) {
      const list = missing();
      sendBtn.disabled = list.length > 0;
      const text = list.length ? list.join(". ") + "." : "";
      clearTimeout(hintTimer);
      const apply = () => { if (hint.textContent !== text) hint.textContent = text; };
      if (now) apply(); else hintTimer = setTimeout(apply, V.hintDelay * 1000);
    }
    form.addEventListener("input", () => refreshHint(false));
    form.addEventListener("change", () => refreshHint(true));

    function resetDone() {
      form.classList.remove("is-done");
      form.querySelector(".vcard-form-body").inert = false;
    }
    function showDone() {
      doneText.textContent = CONTACT.mode === "demo" ? "Card sent (demo). Nothing was sent or stored." : "Card sent. Thank you!";
      form.classList.add("is-done");
      form.querySelector(".vcard-form-body").inert = true;
      form.querySelector(".vcard-done-back").focus({ preventScroll: true });
      say(doneText.textContent);
      form.reset();
      refreshHint(true);
    }
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (el.website.value) { showDone(); return; }   // honeypot: spam gets the normal success state, and nothing else
      if (missing().length) return;
      const data = { first: el.first.value.trim(), last: el.last.value.trim(), email: el.email.value.trim(), company: el.company.value.trim(), message: el.message.value.trim() };
      sendBtn.disabled = true;
      try {
        await CONTACT.send(data);
      } catch (err) {
        hint.textContent = "Couldn't send. Please try again.";
        sendBtn.disabled = false;
        return;
      }
      showDone();
    });
    form.querySelector(".vcard-done-back").addEventListener("click", () => setFlipped(false));
    refreshHint(true);

    // ---- On-screen keyboard (touch) ----------------------------------------------------------
    // The keyboard covers the bottom of the page without resizing it (iOS, and
    // Android Chrome's default). The visual viewport tells how much, as
    // --kb-inset (css/style.css gives the ending that much more room at the
    // bottom, so the form can always scroll above the keyboard). A moment after
    // a text field takes focus (the keyboard is still sliding up), the page is
    // scrolled just enough that the field is visible and, where it all fits,
    // the field down to the hint under Send: so Send and what is missing stay
    // in view while typing. Without the visual viewport API the field is
    // centred instead.
    // Android: code-reviewed only (no test device), written defensively, unverified.
    const vv = window.visualViewport;
    const KEYBOARD_MIN = 120;   // px: a smaller gap between layout and visual viewport isn't a keyboard
    const EDGE = 12;            // px kept clear of the visible edges
    let keyboardFrame = 0;
    let keyboardTimer = 0;
    let lastInset = 0;

    function syncKeyboard() {
      keyboardFrame = 0;
      let inset = 0;
      if (vv && layout.touch() && vv.scale <= 1.01) {   // pinch zoom also shrinks the visual viewport: not a keyboard
        const gap = Math.round(window.innerHeight - vv.height);
        if (gap >= KEYBOARD_MIN) inset = gap;
      }
      if (inset === lastInset) return;
      lastInset = inset;
      root.style.setProperty("--kb-inset", `${inset}px`);
    }
    function queueKeyboard() {
      if (!keyboardFrame) keyboardFrame = requestAnimationFrame(syncKeyboard);
    }

    const isTextField = (n) => !!n && form.contains(n) && n.matches("input, textarea") && !(n.matches("input") && /^(checkbox|radio|button|submit|reset)$/.test(n.type));
    function revealField() {
      const f = document.activeElement;
      if (!layout.touch() || !isTextField(f)) return;
      if (!vv) { f.scrollIntoView({ block: "center", behavior: "instant" }); return; }
      const top = vv.offsetTop + EDGE;
      const bottom = vv.offsetTop + vv.height - EDGE;
      const fr = f.getBoundingClientRect();
      const hr = hint.getBoundingClientRect();
      let dy = 0;
      if (fr.top < top) dy = fr.top - top;
      else {
        const want = hr.bottom - fr.top <= bottom - top ? Math.max(fr.bottom, hr.bottom) : fr.bottom;   // down to the hint when it all fits
        if (want > bottom) dy = Math.min(want - bottom, fr.top - top);   // never push the field itself off the top
      }
      if (Math.abs(dy) >= 1) window.scrollBy({ top: dy, behavior: reduced.matches ? "instant" : "smooth" });
    }
    function settleKeyboard() {
      clearTimeout(keyboardTimer);
      keyboardTimer = setTimeout(revealField, V.keyboardSettle * 1000);
    }

    if (vv) {
      vv.addEventListener("resize", () => { queueKeyboard(); settleKeyboard(); });
    }
    window.addEventListener("layoutchange", queueKeyboard);
    form.addEventListener("focusin", (e) => { if (isTextField(e.target)) { queueKeyboard(); settleKeyboard(); } });
    form.addEventListener("focusout", queueKeyboard);

    focusFace = () => (flipped ? formTitle : front);
  }

  // ---- Appear once ------------------------------------------------------------------------
  // Fades and rises in the first time it's in view (opacity and transform
  // only); shown complete after that. Reduced motion: no transition (CSS).
  const seen = new IntersectionObserver((entries) => {
    if (!entries.some((en) => en.isIntersecting)) return;
    seen.disconnect();
    wrap.classList.add("is-in");
  }, { threshold: V.appearInView });
  seen.observe(wrap);

  // For the CONTACT button (js/skip.js), during its fade jump: reveal shows
  // the card complete at once (no appear animation behind the fading
  // overlay) and scrolls just enough that it is on screen as far as it fits
  // (.vcard's scroll margins clear the chapter bar); focusCard picks the
  // shown face for keyboard focus (the front itself, or the form's heading).
  // Neither changes which face is shown.
  front.tabIndex = -1;
  function reveal() {
    seen.disconnect();
    wrap.classList.add("is-in");
    card.scrollIntoView({ block: "nearest", behavior: "instant" });
  }
  const focusCard = () => focusFace();

  window.visitingCard = { icons: ICONS, reveal, focusCard };   // icons: reused by the CV sheet
})();
