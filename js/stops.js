// The story's content, in one place.
// Read by the page AND by tools/build-map.mjs (city coordinates, countries, state),
// so after changing a city or outline run `npm run build:map`.
// Adding a card = adding one line to a stop's `cards` array.
// The cards are real content (my own story, published by my decision); a card
// is { title, year, text }. The boarding passes in `flights` stay fake, except
// the passenger name, which comes from js/profile.js (load that file first).
//
// city.labelOffset (optional): moves that city's map label away from its
// default spot under the dot, in u (1u = 1px on a 1920-wide window): { x, y },
// plus anchor: "start" to start the text at that point instead of centring it.

const PASSENGER = `${window.PROFILE.familyName} / ${window.PROFILE.givenName}`.toUpperCase();   // LOMIDZE / ZURAB

window.STORY = {
  stops: [
    {
      id: "georgia",
      title: "Georgia",
      subtitle: "Tbilisi · where it started",
      city: { name: "Tbilisi", lat: 41.72, lon: 44.83, labelOffset: { x: -24, y: -44 } },  // above the dot (Georgia's southern border is just below), clear of the plane's nose while boarding
      country: "GEO",                     // ISO 3166-1 alpha-3: outlined + brighter land
      cards: [
        { title: "Georgia", year: "Until 2018", text: "I grew up in Georgia carefree, with no professional responsibility and never a job. Together with my family, I decided it was time for a bigger step: I took the SAT, earned a scholarship worth $100,000 over four years at Augustana University, and decided to risk it all and go." },
      ],
    },
    {
      id: "southDakota",
      title: "South Dakota",
      subtitle: "Sioux Falls, USA",
      city: { name: "Sioux Falls", lat: 43.54, lon: -96.73, labelOffset: { x: 16, y: -10, anchor: "start" } },  // lower right, past SD's eastern border glow and clear of the plane's wing while boarding
      country: "USA",
      state: "SD",                        // US postal code: strongest highlight
      cards: [
        { title: "Arrival", year: "2018", text: "I arrived in Sioux Falls, South Dakota, all alone, under a vast sky with a long horizon on every side. I was socially awkward and not yet confident in English, but I adapted quickly. Everyone else was just as awkward, and we all smiled, knowing how few people end up in such a quiet state. We had no idea yet what a South Dakota winter would bring." },
        { title: "University", year: "2018 – 2022", text: "This is where my discipline and character were really developed and tested. I met lifelong friends I still speak to today, and I had to integrate fully into the academic and rural life of South Dakota. I enjoyed studying with American professors across business, biology, philosophy, psychology and sport classes; each gave me something I remember fondly. I also discovered project management here, through an introductory class taught by Dan Steinwand, a satellite systems engineer." },
        { title: "Work", year: "2020 – 2023", text: "I began by setting up events at the university sports center, my first earnings abroad. An internship at SDN Communications, the largest business internet provider in the Midwest, was my first step into a career, almost entirely during COVID. Next came a project management internship in the enterprise PMO at Sanford Health, fast-paced work that mattered to patients, clinics and first responders. After graduating, I joined Persona Signs full time as Project Assistant, supporting sales and manufacturing teams on signage for brands such as McDonald's, Tesla and Marriott." },
      ],
    },
    {
      id: "czechia",
      title: "Czech Republic",
      subtitle: "Prague",
      city: { name: "Prague", lat: 50.08, lon: 14.44 },
      country: "CZE",
      cards: [
        { title: "Prague", year: "2024", text: "I moved to Prague for a Master's degree and a change of scene. Leaving rural, flat, vast South Dakota for narrow streets and crowds was a bigger shock than moving from Georgia to the United States, and it showed me how much I loved South Dakota. But people get used to anything, and Prague's beauty made it easy: historic streets once walked by kings, and the castle across the river. I made good friends here and rented my first apartment." },
        { title: "Now", year: "2025 – today", text: "In Prague I found a project management internship in EMEA logistics at HP. It is the most challenging work I have done and the most rewarding, improving my project management, stress management, discipline and character. I like logistics because it never stops, it deals with physical goods, and it has contributed to globalization: real-world events affect shipments." },
        { title: "Next", year: "Available now", text: "I am currently writing my master's thesis on the complexity of information system implementation projects, and I am looking for a full-time role in project management, operations or consultancy in the Prague area. My CV and contact details are one click away. Feel free to get in touch." },
      ],
    },
  ],

  // One leg per flight; each gets a boarding pass (js/passes.js).
  // The passenger is the real name from js/profile.js, "FAMILY / GIVEN" in
  // capitals. Every other ticket detail is a fake placeholder (fake airline,
  // fake flight numbers, seats and gates, XX in dates). Keep the other values
  // short: the pass's field columns fit about 9 characters (Passenger spans
  // two columns in the wide pass and the whole row in the compact one).
  flights: [
    {
      id: "leg1",
      from: "georgia",
      to: "southDakota",
      fromCode: "TBS", fromCity: "Tbilisi", fromCountry: "Georgia",
      toCode: "FSD", toCity: "Sioux Falls", toCountry: "South Dakota, USA",
      airline: "ZZ AIR",
      passenger: PASSENGER,
      flight: "ZZ 101",
      date: "01 SEP XX",
      boarding: "06:40",
      group: "B",
      cabin: "ECONOMY",
      terminal: "1",
      seat: "12A",
      gate: "B4",
    },
    {
      id: "leg2",
      from: "southDakota",
      to: "czechia",
      fromCode: "FSD", fromCity: "Sioux Falls", fromCountry: "South Dakota, USA",
      toCode: "PRG", toCity: "Prague", toCountry: "Czech Republic",
      airline: "ZZ AIR",
      passenger: PASSENGER,
      flight: "ZZ 202",
      date: "15 JUN XX",
      boarding: "17:25",
      group: "C",
      cabin: "ECONOMY",
      terminal: "2",
      seat: "21F",
      gate: "A2",
    },
  ],
};
