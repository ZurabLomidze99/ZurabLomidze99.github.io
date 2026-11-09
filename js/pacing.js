// Scroll-story pacing: every timing and camera number in one place.
// Percentages are of the total scroll (0 = top, 100 = end).

window.PACING = {
  screens: 6.148,       // scroll distance, in screen heights
  scrub: 0.6,           // seconds the story lags behind the scrollbar (smoothing)
  resizeSettle: 0.1,    // seconds after the last resize (or browser zoom) before the scroll is put back at the same progress

  // Phones and tablets (a coarse pointer; js/layout.js). Mouse devices don't
  // use these: every resize is handled with resizeSettle, as before.
  layout: {
    toolbarTolerance: 160,  // px: a height-only change up to this (the browser toolbar collapsing or returning) is ignored
    touchSettle: 0.4,       // seconds after the last width change (rotation) before the page position is put back
  },

  // Touch devices only (a coarse pointer; js/layout.js): a stretch of the story
  // is never shorter than this many CSS px, however short the screen makes it
  // (length = max(its length in screens x the screen height, its minimum), so
  // a flick can't skip a card on a short phone). Mouse devices never use these.
  // The percentages below, and in cards, camera, passes and navigation, are the
  // AUTHORED ones (lengths in screens). On a touch screen js/timeline.js
  // re-derives them in place from these minimums, at load and after each
  // settled resize, and writes the authored values back for a mouse.
  // Flights, the settling gaps and everything else keep their length in screens.
  touchMin: {
    title: 200,      // the title, before the fly-in
    flyIn: 260,      // the camera flying in to Georgia
    card: 440,       // one story card (a stop's card range gets this times its card count)
    pass: 320,       // one boarding pass, before takeoff
    pullBack: 420,   // the final pull-back into the ending
  },

  // Desktop (a mouse): the same minimums for the stretches that are shorter
  // than one wheel notch (a card is about 270 px and a boarding pass about
  // 85 px at 1080 px of height), applied by the same function in
  // js/timeline.js, but only while snap.desktop is "stops". Same names as
  // touchMin; a stretch that is not named here has no minimum.
  desktopMin: {
    flyIn: 220,      // the camera flying in to Georgia
    card: 340,       // one story card (a stop's card range gets this times its card count)
    pass: 220,       // one boarding pass, before takeoff
    pullBack: 380,   // the final pull-back into the ending
  },

  // Snap stops (js/snap.js). Touch: a flick stops at the next stop (CSS scroll
  // snapping, mandatory, scroll-snap-stop: always): the title, the middle of
  // each card and boarding pass, a third and two thirds into each flight, the
  // ending at rest, and stops through the ending down to the page's bottom.
  // Mouse: desktop "stops" keeps one wheel or key gesture from passing the
  // next stop (the same stops, but interior stops every flightStep screens in a
  // flight, none through the ending), done in JS because CSS snapping does not
  // limit a wheel burst (see js/snap.js); "off": native scrolling, as before.
  snap: {
    enabled: true,     // false: no snap stops at all
    desktop: "stops",  // mouse devices: "stops" or "off" (?snap=stops / ?snap=off overrides it for one page load, see the end of this file)
    flightStep: 0.45,  // desktop: interior stops in a flight about this many screens apart
    wheelGap: 0.18,    // desktop: seconds without a wheel event or a key press before the next one starts a new gesture
    lineHeight: 40,    // desktop: px a wheel notch in lines (Firefox) or an arrow key press scrolls
    pageStep: 0.875,   // desktop: share of the screen height that Space, PageDown and PageUp scroll
    endingStep: 0.8,   // the ending's stops are at most this share of the visible height (less the chapter bar) apart
    settle: 0.15,      // seconds without scrolling, finger up, before the page counts as at rest
    tolerance: 2,      // px: a scroll position this close to a stop counts as on it
  },

  sections: [
    { id: "title",   from: 0,     to: 3.25 },    // 0.2 screens before the fly-in
    { id: "georgia", from: 3.25,  to: 12.44 },
    { id: "pass1",   from: 12.44, to: 13.74 },   // boarding: 0.08 screens before takeoff
    { id: "flight1", from: 13.74, to: 43.32 },
    { id: "usa",     from: 43.32, to: 56.59 },
    { id: "pass2",   from: 56.59, to: 57.9 },
    { id: "flight2", from: 57.9,  to: 78.62 },
    { id: "prague",  from: 78.62, to: 91.87 },   // three cards of 0.25 screens, like the USA
    { id: "ending",  from: 91.87, to: 100 },     // the final pull-back: 0.5 screens
  ],

  camera: {
    maxStoryZoom: 10,   // the story camera never goes closer than this
    // Where a stop sits on screen (fraction of width / height). Left of
    // centre, because cards and boarding passes take the right side.
    stopFocusX: 0.33,
    stopFocusY: 0.5,

    world:   { zoom: 1 },
    // A stop's view holds through its cards and its boarding pass (no pass
    // view of its own): the camera only moves in the fly-in, takeoff,
    // flight, landing and the final pull-back.
    georgia: { zoom: 8, arrive: 4.07 },  // arrive: % of scroll for the fly-in
    usa:     { zoom: 2.4 },
    prague:  { zoom: 8 },
    ending:  { zoom: 1.2, arrive: 5.42 },

    // Flights. takeoff / landing: % of scroll for the slow zoom out of the
    // departure stop and the slow zoom in to the arrival city.
    flight1: { cruiseZoom: 2.5, takeoff: 7.4, landing: 7.4 },
    flight2: { cruiseZoom: 2.5, takeoff: 5.92, landing: 5.92 },

    // While flying, the camera follows the flight position.
    follow: {
      strength: 0.92,   // 1 = flight position pinned to the focus point; 0 = camera stays on the route's middle
      focusX: 0.33,     // where the flight position sits on screen: centre of the left part (cards use the right)
      focusY: 0.5,
      edgeMargin: 0.06, // the flight position never gets closer than this to a screen edge (fraction)
    },

    // Camera feel (feel pass step 2). Pure
    // functions of scroll, so they reverse exactly. 0 = off; the same values
    // serve wide and portrait (they are shares of the zoom and the view).
    // Reduced motion: overshoot and drift are off. Overshoot and drift were
    // cancelled (the camera holds still while cards and passes are on
    // screen): they stay 0 and have no sliders.
    feel: {
      takeoffEase: 0.3,     // 0-1: how far the takeoff zoom-out leans from ease.takeoff toward ease.takeoffStrong (0 = unchanged)
      overshoot: 0,         // how far past its target the fly-in and each landing run before settling back, as a share of that move (0.03 = 3%)
      overshootStart: 0.6,  // share of the move after which the push begins; it peaks halfway between there and the end
      driftZoom: 0,         // share of the zoom a stop slowly pushes in over its card range, then eases back (0.025 = 2.5%)
      driftPanX: 0,         // share of the view width the camera slides sideways over a stop's card range (+ = view moves right)
      driftPanY: 0,         // share of the view height it slides vertically (+ = view moves down)
    },

    // Portrait layout (phones held upright; --layout: portrait): these values
    // replace the ones above. A view's object is merged field by field, so
    // only what is listed here changes. Cards and passes are a bottom sheet
    // (up to 42% of the screen), so stops and the plane sit in the top part.
    // Zoom 1 shows the map's full width here; below about 4.4 (on a phone)
    // the whole map is shorter than the screen and is shown as a centred
    // strip, so vertical framing only works from there up. Arrival, takeoff
    // and landing timing stay shared (the city labels use them).
    portrait: {
      maxStoryZoom: 24,   // the story camera never goes closer than this
      maxZoom: 28,        // combined limit: story camera x the user's zoom (wide: 12, js/main.js)
      stopFocusX: 0.5,
      stopFocusY: 0.28,

      world:   { zoom: 1.7, centreOnPlaces: true },   // title: centred on the three countries, all in view; the map is a strip under the name
      georgia: { zoom: 16 },
      usa:     { zoom: 4.6 },
      prague:  { zoom: 16 },
      ending:  { zoom: 1.7 },

      flight1: { cruiseZoom: 4.6 },
      flight2: { cruiseZoom: 4.6 },

      follow: {
        focusX: 0.5,
        focusY: 0.28,
        edgeBottom: 0.5,  // the flight position never goes lower than this share of the screen (the sheet is below)
      },
    },
  },

  // How the flight position moves along the route over a flight's scroll
  // range (by real distance): gentle start at takeoff, gentle stop at landing.
  flightEase: "sine.inOut",

  // Navigation: chapter rail, back-to-start.
  navigation: {
    // target: page position a rail click goes to (0-100 = story %, 100-200 =
    // from the story's end to the ending at rest, its top at the top of the
    // screen; a target past 100 puts its node at the bottom of the rail).
    // sections: which story sections light this chapter's node.
    chapters: [
      { id: "start",   label: "Start",   target: 0,  sections: ["title"] },
      { id: "georgia", label: "Georgia", target: 9.42, sections: ["georgia", "pass1", "flight1"] },  // camera settled, card 1 visible
      { id: "usa",     label: "USA",     target: 46.02, sections: ["usa", "pass2", "flight2"] },
      { id: "czechia", label: "Czechia", target: 80.74, sections: ["prague"] },
      { id: "end",     label: "Contact", target: 200, sections: ["ending"] },   // the ending content, at rest
    ],

    // How a rail click gets there: "scroll" (animated scroll through the
    // story), "fade" (fade out, jump, fade in), or "auto": scroll for jumps
    // shorter than fadeAbove (share of the story's scroll length), fade for
    // longer ones. "Back to start" always fades (never rewinds the story).
    railJump: "auto",
    fadeAbove: 0.35,

    // Animated scroll: duration grows with the distance, clamped to
    // [minDuration, maxDuration] seconds.
    secondsPerScreen: 0.3,
    minDuration: 1.2,
    maxDuration: 2.8,
    ease: "power2.inOut",

    // Fade jump: a full-screen overlay in this colour (a CSS variable) fades
    // in, the page jumps while it's opaque, then it fades away. With
    // prefers-reduced-motion the jump is instant, no overlay.
    fadeColor: "--ocean",
    fadeOut: 0.45,             // seconds, over the current view
    fadeOutEase: "power2.in",
    fadeIn: 0.6,               // seconds, revealing the new view
    fadeInEase: "power2.out",
  },

  // Scroll hint (js/hint.js): one small "keep scrolling" cue for the whole
  // story, shown only once the visitor has stopped scrolling; any scrolling
  // hides it at once. Sizes are --hint-* variables (css/style.css); the
  // wording is the table in js/hint.js.
  hint: {
    idle: 4,           // seconds without any scrolling before it fades in
    titleIdle: 0.6,    // the same at the title (on page load it shows there at once)
    fadeIn: 0.4,       // seconds
    fadeOut: 0.2,      // seconds
    bobPeriod: 1.6,    // seconds for one bob of the chevron (down and back up)
    arrivedFor: 2,     // seconds the visitor must stay in the ending, having scrolled there themselves, to count as arrived (no hint until they leave it)
    ownWindow: 2.5,    // seconds after the visitor's own scroll input (wheel, touch, a scroll key, the scrollbar) that a scroll still counts as theirs (a touch fling keeps going)
  },

  // Title screen (js/title.js): the name types out once on page load (time
  // based, not scrubbed).
  title: {
    startDelay: 0.6,     // seconds the cursor blinks before the first letter
    charTime: 0.075,     // seconds per letter
    charJitter: 0.35,    // each letter's time varies by up to this share (feels typed)
    hide: 0.4,           // fade out when the title section is left (and back in)
  },

  // Ending (js/ending.js): after the story's final pull-back, HTML content
  // scrolls over the stuck map, which dims as it comes in. Dim strength is
  // a CSS variable (--ending-dim).
  ending: {
    dimFrom: "top bottom",  // ScrollTrigger positions on the ending section:
    dimTo: "top 35%",       // dimming starts as it enters, is full when its top passes 35% of the screen
    backdropAt: 0.95,       // dim share past which the map's animations pause (it no longer repaints)
  },

  // Visiting card (js/visiting-card.js), in the ending.
  vcard: {
    appear: 0.6,        // seconds: fades and rises in once, the first time it's in view
    appearInView: 0.3,  // share of the card visible before it appears
    copiedFor: 1.5,     // seconds the "Copy email" button says "Copied"
    flip: 0.6,          // seconds: the card turns around its vertical axis (transform only)
    flipFade: 0.2,      // seconds: crossfade used instead where 3D isn't supported (reduced motion swaps at once)
    flipHeight: 0.25,   // seconds: where each face keeps its own height (portrait, touch), the card eases between the two heights
    keyboardSettle: 0.35, // seconds after a form field gets focus before the page is scrolled to keep it, Send and the hint above the on-screen keyboard
    hintDelay: 0.35,    // seconds a typing pause before the form's "what is missing" hint updates
  },

  // Skip buttons (js/skip.js): CONTACT and CV, top right, until the ending.
  skip: {
    fade: 0.3,          // seconds: they fade out at the ending (and while the CV viewer is open) and back in (reduced motion: at once)
  },

  // CV folder and viewer (js/cv-viewer.js), in the ending. The folder appears
  // with the visiting card. Reduced motion: the viewer opens and closes at once.
  cv: {
    open: 0.28,         // seconds: backdrop fades in, the sheet fades and rises in
    close: 0.2,         // seconds: fade out
  },

  // Story cards: the scroll range (%) each stop's cards play in, split evenly
  // between that stop's cards (js/stops.js). Starts just after the camera has
  // settled; ends where the boarding pass (or, at Prague, the ending) begins.
  cards: {
    georgia:     { from: 8.37,  to: 12.44 },   // each card gets 0.25 screens of scroll
    southDakota: { from: 44.39, to: 56.59 },
    czechia:     { from: 79.67, to: 91.87 },
  },

  // Fade timing (seconds) for things that switch by CSS class. The city label
  // shows while the camera is settled on a stop (arrival to takeoff).
  fade: {
    card: 0.3,          // a card's fade + slide, in and out
    cardDelay: 0.3,     // the next card or pass waits this long (>= card and pass fade), so the old one is gone first
    label: 0.4,         // city label fade in (with a small rise and tightening tracking)
    labelDelay: 0.3,    // ... starting this long after the camera has settled
    labelOut: 0.3,      // city label fade out at takeoff
  },

  // Photo piles (js/photos.js): one per stop, standing on the story card's top
  // edge, shown from the stop's first card to its last. Sizes are --pile-*
  // variables (css/style.css).
  // Reduced motion: a plain fade, no slide, bob, glide or fan.
  photos: {
    delay: 0.3,         // seconds after the stop's first card starts to appear before the pile comes out from behind it
    fadeIn: 0.3,        // seconds: opacity when it appears
    slide: 0.4,         // seconds: slides out from behind the card (and back, with the fade, when it leaves)
    fadeOut: 0.3,       // seconds: out with the last card (before a boarding pass, which waits fade.cardDelay)
    spread: 0.25,       // seconds: the layers fan on hover (and back)
    bobPeriod: 0.7,     // seconds: one bob of the pill's arrow toward the pile
    bobCount: 3,        // bobs when the pile appears, then it rests
    minScale: 0.6,      // the pile shrinks to this share of its size when the room above the card is short; below it, it stands beside the card (short windows)
    preloadAhead: 3,    // % of scroll before a stop's first card: its top three thumbnails start loading (none pop in)
    // The viewer (js/photo-viewer.js): open and close fades. Reduced motion: at once.
    open: 0.25,
    close: 0.2,
    swipeWindow: 1.5,   // seconds after a touch, wheel or trackpad move on the photos that a change of photo counts as the visitor's (analytics)
  },

  // Boarding passes: one per flight, in the card panel. A pass slides in at
  // the start of its boarding segment and stays through the whole flight
  // (status BOARDING, then IN FLIGHT once the trail starts); it leaves during
  // the landing, before the arrival stop's first card.
  passes: {
    legs: {
      leg1: { boarding: "pass1", flight: "flight1" },   // segment ids from `sections`
      leg2: { boarding: "pass2", flight: "flight2" },
    },
    leaveBeforeTouchdown: 2.12,  // % of scroll before the flight segment ends
    fade: 0.3,                // fade + slide, in and out (<= fade.cardDelay)
    delay: 0.3,               // waits for the previous card to leave (>= fade.card)
    statusFade: 0.3,          // status chip colour change
  },

  // The plane (js/plane.js): shown from the start of a leg's boarding segment
  // to touchdown, sitting on the flight position. Size and glow are CSS
  // variables (--plane-*).
  plane: {
    appearScale: 0.6,    // scales in from this size with a fade at boarding; back down to it at touchdown
    fade: 0.3,           // seconds, appear and disappear
    pulse: 1.15,         // peak scale of the pulse over the takeoff and landing segments (camera.flightN.takeoff / landing)
    headingKm: 200,      // heading = route direction over this many km either side of the plane (bigger = calmer)
    turnSmoothing: 0.08, // seconds; the heading eases toward the route direction, the short way round
  },

  // The user's own zoom and pan (Ctrl+wheel, drag) is an offset on top of the
  // story camera. Scrolling on eases it back to exactly zero.
  userZoom: {
    scrollThreshold: 40,        // px of scroll (either direction, accumulated) before the ease starts
    easeBackDuration: 0.8,      // seconds
    easeBackEase: "power2.out", // smooth ease-out
  },

  // GSAP ease names for each kind of camera move.
  ease: {
    flyIn: "power2.inOut",
    hold: "sine.inOut",
    takeoff: "sine.inOut",   // slow zoom out from the stop into the follow view
    takeoffStrong: "power3.inOut",   // the heavier takeoff camera.feel.takeoffEase leans toward (slower start, faster middle)
    landing: "sine.inOut",   // slow zoom in from the follow view to the city
  },
};

// TEMPORARY A/B flag (remove when the desktop stops are decided): ?snap=off or
// ?snap=stops overrides PACING.snap.desktop for this page load only.
{
  const q = new URLSearchParams(location.search).get("snap");
  if (q === "off" || q === "stops") window.PACING.snap.desktop = q;
}
