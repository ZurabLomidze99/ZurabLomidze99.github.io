// The story as plain text for screen readers, in reading order, from the same
// data as the cards and passes (js/stops.js, js/profile.js). The visual title,
// cards and boarding passes are aria-hidden, because only one of them is on
// screen at a time by scroll position; this is the complete version, so
// nothing is read twice and nothing is missed.
//
// Headings: h1 the name (the only one on the page), h2 a stop or a flight,
// h3 a card. The ending adds its own h2 ("Get in touch") and the visiting
// card's h3 after this. Hidden with the position: fixed technique (CSS
// .story-text), so reading it never scrolls the page.
(function () {
  const STORY = window.STORY;
  const PROFILE = window.PROFILE;

  const root = document.createElement("section");
  root.className = "story-text";
  root.setAttribute("aria-label", "My story");

  function el(tag, text, parent, id) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (id) node.id = id;
    (parent || root).append(node);
    return node;
  }

  el("h1", PROFILE.name);
  el("p", `${PROFILE.role} · ${PROFILE.city}`);
  el("p", "My path in the order the map tells it: Georgia, South Dakota, then the Czech Republic.");

  const flightFrom = Object.fromEntries(STORY.flights.map((f) => [f.from, f]));

  for (const stop of STORY.stops) {
    const section = el("section", "", root);
    section.setAttribute("aria-labelledby", `story-${stop.id}`);
    el("h2", stop.title, section, `story-${stop.id}`);
    el("p", stop.subtitle, section);
    for (const card of stop.cards) {
      const article = el("article", "", section);
      el("h3", card.title, article);
      if (card.year) el("p", card.year, article);
      el("p", card.text, article);
    }
    // The stop's photo pile (js/photos.js): every photo's alt text and caption, in pile order.
    const photos = (stop.photos || []).filter((ph) => ph.alt || ph.caption);
    if (photos.length) {
      el("h3", `Photos from ${stop.title}`, section);
      const list = el("ul", "", section);
      for (const ph of photos) el("li", [ph.alt, ph.caption].filter(Boolean).join(" "), list);
    }

    // The flight that leaves this stop: the boarding pass, in words. Its date
    // is a placeholder on the pass, so it is left out here.
    const f = flightFrom[stop.id];
    if (f) {
      const flight = el("section", "", root);
      flight.setAttribute("aria-labelledby", `story-${f.id}`);
      el("h2", `Flight from ${f.fromCity} to ${f.toCity}`, flight, `story-${f.id}`);
      el("p",
        `Boarding pass: ${f.airline} flight ${f.flight}, ${f.fromCode} to ${f.toCode}, `
        + `${f.fromCity}, ${f.fromCountry} to ${f.toCity}, ${f.toCountry}. `
        + `Boarding ${f.boarding}, class ${f.cabin.toLowerCase()}, seat ${f.seat}, gate ${f.gate}.`,
        flight);
    }
  }

  // Right after the map; the ending follows later in the page.
  document.querySelector(".stage").after(root);
})();
