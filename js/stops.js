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
//
// photos (optional): the stop's pile of photos (js/photos.js, on the story card), cover first.
// A photo is { file, alt, caption }: file is the name of its web versions in
// assets/photos/web/ (npm run build:photos makes them from the originals,
// which never go into git); alt is one sentence of what is visible; caption
// is shown under the photo, empty for none. Adding a photo = one line.
// Optional focusX / focusY (0 to 1, from the photo's left / top): the point
// the pile's 3:2 thumbnail crop is centred on (tools/build-photos.mjs; the
// viewer's full photo is never cropped). Without them the crop is smart.

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
        { title: "Georgia", year: "Until 2018", text: "I grew up in Georgia and had never held a job. Until then I was simply enjoying being young. My family and I decided I should study in the United States, so I took the SAT and earned a scholarship worth $100,000 over four years at Augustana University." },
      ],
      photos: [
        { file: "georgia-1", alt: "A narrow street of old brick buildings and trees, with a tall TV tower rising behind the rooftops under a blue sky with big clouds.", caption: "" },
        { file: "georgia-2", alt: "A sandstone bell tower on the right and a blue glass skyscraper in the distance, with a statue and trees below and a cloudy sky.", caption: "" },
        { file: "georgia-3", alt: "Forested mountains with snow-capped peaks above a green valley, with low clouds drifting across under a clear blue sky.", caption: "" },
        { file: "georgia-4", alt: "Dusk over a city seen from a balcony, with apartment blocks, lit windows and a darkening sky streaked with cloud.", caption: "" },
        { file: "georgia-5", alt: "A quiet cobbled street between brick apartment buildings with balconies, with parked cars on both sides and a pedestrian walking away.", caption: "" },
        { file: "georgia-6", alt: "Silhouetted figures and white flags with red crosses on a grassy hillside at sunset, with a tall dark monument and many upright poles on the ridge.", caption: "" },
        { file: "georgia-7", alt: "A crooked clock tower of brick, wood and gold with a round clock face, against a deep blue sky.", caption: "" },
        { file: "georgia-8", alt: "A small stone building with a rusty red roof in a meadow of tall grass, below a forested slope and a rocky mountain under heavy clouds.", caption: "" },
        { file: "georgia-9", alt: "Two people walking along a wide paved promenade lined with tall evergreens, with two glass towers in the distance under an overcast sky.", caption: "" },
        { file: "georgia-10", alt: "A street at night with glowing stars and string lights hung overhead, a crowd of people walking beneath and trees wrapped in lights.", caption: "" },
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
        { title: "Arrival", year: "2018", text: "I arrived in Sioux Falls, South Dakota, on my own and still building confidence in my English. The other new students were just as awkward, and we all smiled about how few people end up in such a quiet state. None of us knew yet what a South Dakota winter would bring." },
        { title: "University", year: "2018 – 2022", text: "I studied business at Augustana University and graduated in 2022, with classes ranging from biology to philosophy. I discovered project management in an introductory class taught by Dan Steinwand. Who better to teach it than a satellite systems engineer? The friends I made there are still close today." },
        { title: "Work", year: "2020 – 2023", text: "I started by setting up events at the university sports center, my first earnings abroad, though the pay was almost nothing. Internships followed at SDN Communications, a business internet provider, and in the enterprise PMO at Sanford Health, where COVID-era work mattered to patients, clinics and first responders. After graduating I joined Persona Signs as Project Assistant." },
      ],
      photos: [
        { file: "usa-1", alt: "A downtown street in falling snow, with brick buildings, parked cars, string lights on the trees and a red car at the curb.", caption: "" },
        { file: "usa-2", alt: "A row of flagpoles with an American flag and other flags beside a green golf course with trees in autumn colours.", caption: "" },
        { file: "usa-3", alt: "A bare tree in silhouette against a sunset sky fading from purple to orange, with a thin crescent moon above snowy ground.", caption: "" },
        { file: "usa-4", alt: "A snow-covered residential street at dusk, with bare trees, a glowing orange street lamp and a parked car in the distance.", caption: "" },
        { file: "usa-5", alt: "A snow-packed road between tall piles of snow, with a row of houses and a water tower faint in the haze beyond.", caption: "" },
        { file: "usa-6", alt: "A wall of cowboy hats in tan, brown, grey and black, displayed in rows on slatted wood.", caption: "" },
        { file: "usa-7", alt: "A green cornfield in the foreground, with a red barn and silos on the horizon, a line of trees and a blue sky with scattered clouds.", caption: "" },
        { file: "usa-8", alt: "A fountain spraying in a pond at dusk, with trees, street lights and a building with lit windows across the lawn.", caption: "" },
        { file: "usa-9", alt: "A cream vintage car parked at night beside a brick wall with a red neon sign, its glow reflected on the car's hood.", caption: "", focusX: 0.38, focusY: 0.26 },
        { file: "usa-10", alt: "An aerial view of a long straight road between green farm fields toward the horizon, with farm buildings and a pink-tinged sky.", caption: "" },
      ],
    },
    {
      id: "czechia",
      title: "Czech Republic",
      subtitle: "Prague",
      city: { name: "Prague", lat: 50.08, lon: 14.44 },
      country: "CZE",
      cards: [
        { title: "Prague", year: "2024", text: "I moved to Prague to complete a Master's degree in Innovation Project Management. After rural South Dakota, a dense European city was a bigger adjustment than moving from Georgia to the United States, and it made me realise how much I had loved South Dakota. I settled in, made good friends and rented my first apartment." },
        { title: "Now", year: "2025 – today", text: "In Prague I found an internship in EMEA logistics project management at HP. It is the most demanding work I have done, and it has sharpened my project management, stress management and discipline. I like logistics because it never stops: it deals with physical goods, and real-world events change shipments every day." },
        { title: "Next", year: "Available now", text: "I am writing my master's thesis on the complexity of information system implementation projects, and I am looking for a full-time role in project management, operations or consultancy in the Prague area. If it sounds like a fit, I would be glad to hear from you. My CV and contact details are one click away." },
      ],
      photos: [
        { file: "czech-1", alt: "A garden pond in front of a long arcaded building with red-tiled roofs, with a hilltop castle on the skyline under a blue sky.", caption: "" },
        { file: "czech-2", alt: "A vintage open-top car in copper and cream beside a red van on a cobbled street, with a domed church and bell tower behind.", caption: "" },
        { file: "czech-3", alt: "An ornate gateway with a gold wrought-iron arch and tall stone pillars topped with statues of fighting figures, with striped guard boxes and a cream palace façade behind.", caption: "" },
        { file: "czech-4", alt: "A wide river with small pedal boats in the foreground and a hillside skyline of a large cathedral and castle buildings across the water.", caption: "" },
        { file: "czech-5", alt: "An aviation museum hangar with historic aircraft, including a green military jet and planes hanging from the roof, with information boards and rope barriers.", caption: "" },
        { file: "czech-6", alt: "A foggy night over a city, with lit apartment buildings, a park with a tree-shaped string of lights and a glowing haze above.", caption: "" },
        { file: "czech-7", alt: "The view from inside a large aircraft cockpit at night, with lit screens and control panels and airfield lights outside the windows.", caption: "" },
        { file: "czech-8", alt: "A view from the cab of a large red container-handling vehicle, with a steering wheel, screens and a keyboard, and stacked shipping containers and a freight train beyond.", caption: "" },
        { file: "czech-9", alt: "Looking up between two glass-and-wood office buildings joined by walkways and stairs, with a cloudy sky above.", caption: "" },
        { file: "czech-10", alt: "A tall café window with hanging bulbs and artwork, people working on laptops at a table, and a red tram and a grand domed building outside.", caption: "" },
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
