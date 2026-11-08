// Boarding passes: markup built from a flight in js/stops.js (fake data only),
// a decorative barcode, and the live state the card panel (js/cards.js)
// sets every render: status chip, plus the plane and progress line on the
// route track (transform only, no layout work).
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Top-down plane, nose pointing right.
  const PLANE = `<svg class="pass-plane" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12c0-.8-.7-1.3-1.5-1.3h-5.9L9.9 3.5H8.1l2.3 7.2H5.3L3.6 8.4H2.3l1 3.6-1 3.6h1.3l1.7-2.3h5.1l-2.3 7.2h1.8l4.7-7.2h5.9c.8 0 1.5-.5 1.5-1.3z"/></svg>`;

  // Decorative barcode: bar widths from a small seeded generator, so the same
  // flight number always gives the same bars. Not a real symbology.
  const BARCODE_W = 120;
  function barcode(seed) {
    let h = 2166136261;                       // FNV-1a hash of the seed
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    h = h >>> 0 || 1;
    const rand = () => {                      // xorshift32
      h ^= h << 13; h >>>= 0;
      h ^= h >>> 17;
      h ^= h << 5; h >>>= 0;
      return h / 4294967296;
    };
    const bars = [];
    let x = 0;
    while (true) {
      const w = 1 + Math.floor(rand() * 3);   // bar 1-3 units
      if (x + w > BARCODE_W) break;
      bars.push(`<rect x="${x}" width="${w}" height="1"/>`);
      x += w + 1 + Math.floor(rand() * 2);    // gap 1-2 units
    }
    return `<svg class="pass-barcode" viewBox="0 0 ${BARCODE_W} 1" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true">${bars.join("")}</svg>`;
  }

  // data-field: the label in lower case (the compact portrait pass hides one).
  const field = (label, value, wide) =>
    `<div class="pass-field${wide ? " pass-field--wide" : ""}" data-field="${esc(label.toLowerCase())}"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;

  function create(f) {
    const el = document.createElement("article");
    el.className = "pass";
    el.setAttribute("aria-label", `Boarding pass, flight ${f.flight}, ${f.fromCity} to ${f.toCity}`);
    el.innerHTML = `
      <div class="pass-body">
        <header class="pass-head">
          <p class="pass-brand"><span>${esc(f.airline)}</span><span>Boarding pass</span></p>
          <p class="pass-chip"><span class="pass-chip-dot" aria-hidden="true"></span><span class="pass-chip-text">Boarding</span></p>
        </header>
        <div class="pass-route">
          <span class="pass-code">${esc(f.fromCode)}</span>
          <span class="pass-track" aria-hidden="true">
            <span class="pass-track-line"></span>
            <span class="pass-track-fill"></span>
            ${PLANE}
          </span>
          <span class="pass-code">${esc(f.toCode)}</span>
        </div>
        <div class="pass-places">
          <p class="pass-place"><span class="pass-city">${esc(f.fromCity)}</span><span class="pass-country">${esc(f.fromCountry)}</span></p>
          <p class="pass-place pass-place--to"><span class="pass-city">${esc(f.toCity)}</span><span class="pass-country">${esc(f.toCountry)}</span></p>
        </div>
        <dl class="pass-fields">
          ${field("Passenger", f.passenger, true)}
          ${field("Flight", f.flight)}
          ${field("Date", f.date)}
          ${field("Boarding", f.boarding)}
          ${field("Group", f.group)}
          ${field("Class", f.cabin)}
          ${field("Terminal", f.terminal)}
        </dl>
      </div>
      <div class="pass-stub">
        <p class="pass-stub-top"><span class="pass-stub-route">${esc(f.fromCode)} → ${esc(f.toCode)}</span><span>${esc(f.flight)}</span></p>
        <dl class="pass-stub-big">
          <div><dt>Seat</dt><dd>${esc(f.seat)}</dd></div>
          <div><dt>Gate</dt><dd>${esc(f.gate)}</dd></div>
        </dl>
        ${barcode(f.flight)}
      </div>`;

    const track = el.querySelector(".pass-track");
    const fill = el.querySelector(".pass-track-fill");
    const plane = el.querySelector(".pass-plane");
    const chip = el.querySelector(".pass-chip");
    const chipText = el.querySelector(".pass-chip-text");

    let trackW = 0, planeW = 0;
    let lastF = null, lastFlying = null;

    // Track and plane size in px; call once the pass is in the page, and on resize.
    function measure() {
      trackW = track.clientWidth;
      planeW = plane.getBoundingClientRect().width;
      lastF = null;
    }

    // f: share of the flight's real distance flown (0-1). flying: trail has started.
    function update(f, flying) {
      if (flying !== lastFlying) {
        chip.classList.toggle("is-flying", flying);
        chipText.textContent = flying ? "In flight" : "Boarding";
        lastFlying = flying;
      }
      if (f !== lastF) {
        const x = f * (trackW - planeW);      // plane runs from the origin code to the destination code
        plane.style.transform = `translateX(${x.toFixed(2)}px)`;
        fill.style.transform = `scaleX(${trackW ? ((x + planeW / 2) / trackW).toFixed(4) : 0})`;
        lastF = f;
      }
    }

    return { el, measure, update };
  }

  window.boardingPass = { create };
})();
