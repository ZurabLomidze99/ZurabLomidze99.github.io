// City labels: the city's name in small tracked capitals under its dot,
// shown only while the camera is settled on that stop (arrival to takeoff).
// SVG text inside the city's counter-scaled .screen-size group, so it keeps
// its on-screen size at any zoom; sizes are CSS variables in u.
(function () {
  const P = window.PACING;
  const C = P.camera;
  const STORY = window.STORY;
  const svg = document.getElementById("world");
  const root = document.documentElement;
  const sec = Object.fromEntries(P.sections.map((s) => [s.id, s]));

  root.style.setProperty("--label-fade", `${P.fade.label}s`);
  root.style.setProperty("--label-delay", `${P.fade.labelDelay}s`);
  root.style.setProperty("--label-out", `${P.fade.labelOut}s`);

  // Settled on a stop: from the end of the camera's arrival (or landing) to
  // the start of the takeoff (or, at Prague, the ending). Read from PACING
  // now and again when the timeline changes (js/timeline.js).
  const settled = () => ({
    georgia: { from: sec.georgia.from + C.georgia.arrive, to: sec.flight1.from },
    southDakota: { from: sec.flight1.to, to: sec.flight2.from },
    czechia: { from: sec.flight2.to, to: sec.prague.to },
  });

  const NS = "http://www.w3.org/2000/svg";
  const labels = STORY.stops.map((stop) => {
    const text = document.createElementNS(NS, "text");
    text.setAttribute("class", "city-label");
    text.setAttribute("aria-hidden", "true");   // names are read from the cards
    text.textContent = stop.city.name.toUpperCase();
    const off = stop.city.labelOffset || {};
    text.style.setProperty("--label-dx", `calc(var(--u) * ${off.x || 0})`);
    text.style.setProperty("--label-dy", `calc(var(--u) * ${off.y || 0})`);
    if (off.anchor === "start") {               // text starts at the offset instead of centring on it
      text.style.setProperty("text-anchor", "start");
      text.style.setProperty("--label-centre", "0");
    }
    svg.querySelector(`.city[data-stop="${stop.id}"] .screen-size`).append(text);
    return { id: stop.id, text };
  });
  function place() {
    const s = settled();
    for (const l of labels) Object.assign(l, s[l.id]);
  }
  place();
  window.addEventListener("timelinechange", place);

  let shown = null;
  window.story.onRender((p) => {
    const pct = p * 100;
    const next = labels.find((l) => pct >= l.from && pct < l.to) || null;
    if (next === shown) return;
    if (shown) shown.text.classList.remove("is-visible");
    if (next) next.text.classList.add("is-visible");
    shown = next;
  });
})();
