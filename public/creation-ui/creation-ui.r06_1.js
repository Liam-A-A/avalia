/* Avalia Creation UI R06_1 (2026-10-11-2221): the July create rail over the paused viewer. Frame a shot, pick Enhance (three treatments) or Reimagine (three steps), choose an Image Shape, see the server's price on the button, ask the Worker first whether a result can reach you, then send the image and show the reveal. UNTESTED. */
// R06_1 (Steve, 2026-10-11-2221, ADL-NOTE-UXD-034): fix round on NOTE-UXD-032. SF1/SF2: a key that may already be
// charged (S.open) is NEVER replaced; sign-in after a send and the unknown-state retry poll /status on the SAME key,
// and a new key is minted only after the Worker answers none/refunded or another definitive reply. SF3: every NEW
// charge needs a tap on the priced go button (reveal "Try again" and settled-failure "Try again" return to the rail).
// Wording re-keyed X1-X22 to W18-W39 (Marielle NOTE-UXD-033, DRAFT) with free-path variants (W19f, W28f, W29f).
// Versioned from creation-ui.r06.js (2026-10-11-2151), itself from creation-ui.r06b1_2.js. B1.2 money semantics: raw image
// bytes POST, a lost reply or a 202 polls /status on the SAME key, a new key only after the Worker says the old one is
// settled or for a deliberate new run.
// Contract: ADL-SPEC-UXD-001 (HandoffPacket v1, architecture C) + R06 Image Shape. Marking: ADL-SPEC-UXD-006 (NOT built:
// Download stays disabled until the Worker reports strip + C2PA + TrustMark).
// Copy: Tone Sheet v2 (SIGNED, LOG-UXD-002 E10) = "TS", Prototype v0.9 (July canon) = "v0.9". Every NEW line lives in
// the ONE table below (WORDING), keyed to Decision Sheet v0.8 s3 and Marielle's DRAFTs NOTE-UXD-030/031/033.
// Build notes: ADL-NOTE-UXD-029, ADL-NOTE-UXD-034.
// Worker API: B1.4 (NOTE-UXD-025). Against B1.1 it degrades to "nothing spent": B1.1's CORS refuses the X-Avalia-Request
// header (the POST never leaves the browser) and B1.1 has no /status (404 -> W1).
// Classic script (not a module), exposes window.AvaliaCreationUI.
(function (global) {
  'use strict';

  // ============================== WORDING TABLE (the ONE place for new wording) ===============================
  // text  = the line Liam has ticked (null until then). draft = Marielle's DRAFT (NOTE-UXD-030 / 031 / 033) or the built
  // copy it replaces. Until `text` is set the screen shows "[KEY] draft", so every placeholder is visible on the test page.
  // To land a ticked line: put it in `text`. Nothing else changes. No em dashes in any guest line.
  // {m} = the mode noun (Enhance / Reimagine), filled by w(key, m). Keys ending "f" are the free-path variants: a guest
  // on the complimentary path never sees Credits wording (NOTE-UXD-033 notes 2 and 8).
  var WORDING = {
    W1:  { text: null, draft: 'We cannot make this one for you just yet, so nothing has been spent. Your view and your Credits are just as you left them.', where: 'Refused before any charge (E_UNDELIVERABLE or spent:false). Never after a charge. FLAG: says "Credits" on the free path too; no free variant drafted yet' },
    W2:  { text: null, draft: 'That sign-in did not finish, so you are not signed in yet. Your view is safe here. Try once more whenever you are ready.', where: 'Sign-in card closed with no session' },
    W3:  { text: null, draft: 'Getting around', where: 'Page Help panel heading (replaces "Avalia - Controls"); the panel covers moving, looking, floors and Performance mode' },
    W4:  { text: null, draft: 'Image making did not open just now. You can still look around the space, and a refresh will bring it back.', where: 'PAGE ONLY (shown when this bundle is missing); mirrored as W4_FALLBACK in the page' },
    W5:  { text: null, draft: 'Copy link', where: 'Save/Share sheet button when the device cannot share the image file' },
    W6:  { text: 'Reimagine transforms the space into what it could be, and is always labelled. One to three steps; stop anywhere.', draft: null, where: 'v0.9 l.975 APPROVED (NOTE-UXD-030 note 1, Liam to tick to confirm)' },
    W7:  { text: 'A moment. Your view is being made.', draft: null, where: 'v0.9 l.444 [G] APPROVED (NOTE-UXD-030 note 1, Liam to tick to confirm)' },
    'W8a':          { text: null, draft: 'Frame the view you want, then tap Capture.', where: 'Viewfinder hint' },
    'W8b':          { text: null, draft: 'Capture', where: 'Viewfinder button' },
    'W8c.close':    { text: null, draft: 'Close', where: 'Close controls' },
    'W8c.back':     { text: null, draft: 'Back', where: 'Back controls' },
    'W8d':          { text: null, draft: 'What would you like to make?', where: 'Create rail heading' },
    'W8e':          { text: null, draft: 'Frame again', where: 'Re-frame action' },
    'W8f.head':     { text: null, draft: 'Nothing to choose just yet', where: 'No options for this space' },
    'W8f.body':     { text: null, draft: 'The options for this space are still being prepared, so there is nothing to pick. Nothing has been spent.', where: 'No options for this space' },
    'W8g':          { text: null, draft: 'The options for this space did not load just now. Nothing has been spent. Try again.', where: 'Options failed to load' },
    'W8h.head':     { text: null, draft: 'Nearly there', where: 'Mark still finishing' },
    'W8h.body':     { text: null, draft: 'Your image is made and is getting its AI mark. You will not be charged again. Tap Finish to complete it.', where: 'Mark still finishing' },
    'W8h.btn':      { text: null, draft: 'Finish', where: 'Mark still finishing' },
    'W8i':          { text: null, draft: 'We lost the connection before your image came back. Try again, and you will not be charged twice.', where: 'Connection lost mid-make. Shown only after /status answers "none" (the run never started)' },
    'W8j':          { text: null, draft: 'That view did not come through cleanly. Frame it once more; nothing has been spent.', where: 'View refused before sending' },
    'W8k':          { text: null, draft: 'We could not make that one from your words. Try putting it another way; nothing has been spent.', where: 'Typed idea could not be used (409 conflict)' },
    'W8l.notReady': { text: null, draft: 'Your image is still being finished. It will be ready to save in a moment.', where: 'Download tapped before the mark is on' },
    'W8l.failed':   { text: null, draft: 'That download did not finish. Tap Download to try again.', where: 'Download failed' },
    W9:  { text: null, draft: 'Image Size', where: 'HD size picker label (placeholder slot; sizes wait on Liam fal tests, Decision Sheet v0.8 Q1)' },
    W10: { text: null, draft: null, where: 'Size names: NOT RENDERED until Q1 sets the ladder' },
    W11: { text: null, draft: null, where: 'Price re-checked: NOT RENDERED (no Worker code emits it yet)' },
    W12: { text: null, draft: null, where: 'No larger size: NOT RENDERED (size picker not built)' },
    W13: { text: null, draft: null, where: 'Both together: OUT OF SCOPE (Combo UI)' },
    W14: { text: null, draft: null, where: 'Both-result slider labels: OUT OF SCOPE' },
    W15: { text: null, draft: null, where: 'Reimagine this one (gallery): OUT OF SCOPE' },
    W16: { text: null, draft: null, where: 'Step 2 failed: only on refunded:true for a two-step job; no two-step job in R06' },
    // W17: the wide-angle warning (Liam 2026-10-11). Keys and drafts per Marielle's ADL-NOTE-UXD-031 (DRAFT, 2026-10-11-2203).
    W17a: { text: null, draft: 'Wider view', where: 'Wide-angle toggle (TEST app only)' },
    W17b: { text: null, draft: 'This makes the room look bigger', where: 'Wide-angle confirm popup heading' },
    W17c: { text: null, draft: 'A wider angle lets you see more of the room at once, but it also makes the room look bigger than it really is. The proportions will not be true to life. Are you happy with that?', where: 'Wide-angle confirm popup body' },
    W17d: { text: null, draft: 'Yes, widen the view', where: 'Wide-angle confirm: accept' },
    W17e: { text: null, draft: 'Keep the true view', where: 'Wide-angle confirm: decline (angle stays at 60)' },
    // W18-W39: Marielle's ADL-NOTE-UXD-033 (DRAFT, 2026-10-11-2216), re-keyed from X1-X22. Every draft is her PROPOSAL.
    W18:  { text: null, draft: 'Still making your image. You will not be charged twice.', where: 'Was X1. Polling /status on the SAME key (true only while polling never changes key)' },
    W19:  { text: null, draft: 'This one is taking longer than usual. If it does not come through, your Credits come back to you automatically.', where: 'Was X2. Polling timed out (paid path). True only with the sweep armed (NOTE-025 step 1)' },
    W19f: { text: null, draft: 'This one is taking longer than usual. If it does not come through, your complimentary {m} comes back to you automatically.', where: 'Free-path variant of W19 (NOTE-UXD-033 note 2 pattern; full sentence assembled by Steve, Marielle to confirm)' },
    W20:  { text: null, draft: 'Check again', where: 'Was X3. Button on W19 (polls the same key; never a new charge)' },
    W21:  { text: null, draft: 'Just a moment before the next one. Nothing has been spent on this one. Try again shortly.', where: 'Was X4. 429 busy_account / rate_limited, 409 superseded. Refused before any charge (WK l.165-171, spend starts l.212)' },
    W22:  { text: null, draft: 'We cannot start this one just now. Nothing has been spent. Try again in a moment.', where: 'Was X5. 503 busy_try_shortly / gate_unavailable' },
    W23:  { text: null, draft: 'Please give it a minute before trying again. Nothing has been spent on this one.', where: 'Was X6. 429 refund_cooldown with spent:false (N2) only' },
    W24:  { text: null, draft: 'Not available on this space yet', where: 'Was X7. Treatment pill not live on this space (signed in)' },
    W25:  { text: null, draft: 'We could not open the payment page just now. You have not been charged. Try again whenever it suits.', where: 'Was X8. Checkout did not start (before any Stripe redirect)' },
    W26:  { text: null, draft: 'Taking you to payment now.', where: 'Was X9. Checkout starting' },
    W27:  { text: null, draft: 'Your image was made, but it did not receive its AI mark, so we are holding it back. Every image we show carries its mark. We are sorry about this; please get in touch and we will put it right.', where: 'Was X10. Made and charged, withheld unmarked (E_PROVENANCE_MISSING; gated off by B1.4). BLOCKED: needs a real contact route and a Liam/Louis ruling on refund. Placeholder only' },
    W28:  { text: null, draft: 'That one did not come out, and we are sorry about that. Your Credits are on their way back to your account, so there is nothing you need to do.', where: 'Was X11. Failed, refund pending (refunded:false); the sweep restores it' },
    W28f: { text: null, draft: 'That one did not come out, and we are sorry about that. Your complimentary {m} comes back to you automatically, so there is nothing you need to do.', where: 'Free-path variant of W28 (note 2 pattern; assembled by Steve, Marielle to confirm)' },
    W29:  { text: null, draft: 'Something went wrong, and we cannot tell yet whether this one went through. Any Credits a failed image used come back to you automatically.', where: 'Was X12. Unknown state. Its button polls /status on the SAME key; never a new charge' },
    W29f: { text: null, draft: 'Something went wrong, and we cannot tell yet whether this one went through. If it did not, your complimentary {m} comes back to you automatically.', where: 'Free-path variant of W29 (note 2 pattern; assembled by Steve, Marielle to confirm)' },
    W30:  { text: null, draft: 'Save or share', where: 'Was X13. Free watermarked Save from the rail (MEMO-UXD-006)' },
    W31:  { text: null, draft: 'Link to this space copied. To keep the picture itself, tap Save image.', where: 'Was X14. PAGE share sheet after Copy link (the link is the space page, not the image)' },
    W32:  { text: null, draft: 'Walk', where: 'Was X15. Shot tools: walk camera (aria name; icon button)' },
    W33:  { text: null, draft: 'Circle a spot', where: 'Was X16. Shot tools: orbit the looked-at spot (aria name; icon button)' },
    W34:  { text: null, draft: 'Grid', where: 'Was X17. Shot tools: rule-of-thirds grid on/off' },
    W35:  { text: null, draft: 'Level the view', where: 'Was X18. Shot tools: tilt to 0. Never "Straighten"' },
    W36:  { text: null, draft: 'Tilt up', where: 'Was X19. Shot tools: tilt up 5 degrees (WCAG 2.5.7 drag alternative)' },
    W37:  { text: null, draft: 'Tilt down', where: 'Was X20. Shot tools: tilt down 5 degrees' },
    W38:  { text: null, draft: null, where: 'RESERVED (was X21). No X21 ever existed in code; Marielle may release the number' },
    W39:  { text: null, draft: 'View width', where: 'Was X22. Wide-angle slider label (TEST app only; page fallback mirrors it)' },
    // X = lines with NO W number yet. Marielle to number and word them.
    X23:  { text: null, draft: 'Thank you. Your payment is being confirmed, and your Credits will show on your balance once it is.', where: 'PAGE Stripe return when the wallet has NOT yet been seen to rise (SF4). Steve placeholder, Marielle to word' }
  };
  function w(key, m) {
    var e = WORDING[key];
    if (!e) return '[' + key + ']';
    var s = e.text ? e.text : '[' + key + '] ' + (e.draft || 'wording pending');
    return m ? s.replace('{m}', m) : s;
  }

  // ============================== APPROVED COPY (verbatim; source on each line) ===============================
  var COPY = {
    label: 'AI generated or altered image',                                             // LOG-UXD-004 W3 (Liam ruling)
    explain: "This image began as a real capture of this space and was finished with Avalia's AI. We mark every AI-made image, for everyone, so you always know exactly what you are looking at: a real place you can trust, imagined into something new.", // TS 6 l.267 [G]
    explainEnhance: 'Enhance improves the real image of the real room. It never adds or invents. The mark is there so every AI-touched image says so, plainly.', // TS 6 l.271 [G]
    enhance: 'Enhance', reimagine: 'Reimagine',                                           // TS fence vocabulary
    enhanceIntro: 'The real room, made its best. Nothing added, nothing invented.',      // TS 3b l.168 [G]
    paneBefore: 'As it is', paneEnhance: 'Enhanced', paneReimagine: 'Reimagined',        // TS 3 l.134-135
    arrivedEnhance: 'Here it is. The real room, at its best.',                            // TS 3 l.126 [G]
    arrivedReimagine: 'Here it is. Your idea of what this space could be.',               // TS 3 l.130 [G]
    tryAgain: 'Try again', makeChanges: 'Make changes',                                   // TS 3 l.139 [G]
    other: 'Other', otherPlaceholder: 'Tell us in your own words',                        // TS 3a l.152
    stopAnywhere: 'Happy with this? Reimagine now.', reimagineNow: 'Reimagine now',       // TS 3a l.153 [G]
    stepSpace: { venue: 'The space', home: 'The room' },                                  // TS 3a l.149
    stepOccasion: { venue: 'The occasion', home: 'Who lives here' },                      // TS 3a l.150
    stepStyle: 'The style',                                                               // TS 3a l.151
    groupSize: 'Group size',                                                              // venues.json (Section 10 item 5 signed)
    enhanceGo: 'Enhance this view',                                                       // v0.9 l.404
    tellMore: 'Tell us more, in your own words (optional)',                               // v0.9 l.374
    freeNote: function (m) { return 'Your complimentary ' + m + ' is waiting'; },         // v0.9 l.401 / l.980; BB l.128 (NOT open)
    freePrice: 'with our compliments',                                                    // v0.9 l.982; BB l.128
    credits: function (n) { return n + ' Credits'; },                                     // TS 4 l.192-193 format
    creditsMiss: '– Credits',                                                        // TS 5.4 l.232 (never "0")
    shapeHead: 'Image Shape', wide: 'Wide', tall: 'Tall', preview: 'Preview', applyToView: 'Apply to view', // TS 7 l.276-295
    failed: 'That one did not come out, and we are sorry about that. Your Credits are already back in your account, nothing spent. Give it another go whenever you are ready.', // TS 5.1 l.216 [G]
    failedFree: function (m) { return 'That one did not come out, and it did not use your complimentary ' + m + '. It is still yours, waiting. Try again whenever you like.'; }, // TS 5.1 l.218, noun per BB l.128
    expired: 'You were away a little while, so we signed you out to keep your account safe. Nothing is lost; everything you made is saved. Sign in and it is all where you left it.', // TS 5.5 l.238 [G]
    offline: 'You seem to be offline just now. The space is not going anywhere; the moment you are back, so are we.', // TS 5.6 l.243 [G]
    pwHead: 'You have made your free Enhance and your free Reimagine.',                    // TS 4 l.178 [G]
    pwBody: 'We hope you loved them. Every account comes with one of each, once ever, not monthly, so we are telling you that plainly rather than letting it surprise you later. From here, each creation costs a few small Credits.', // TS 4 l.179 [G]
    topupHead: 'Top up and keep creating',                                                // TS 4 l.183 [G]
    pack: function (c, eur) { return c + ' Credits, EUR ' + eur; },                       // TS 4 l.184 format; counts CF#7 (TS flag 2)
    packSupport: 'No plan needed. Credits you buy never expire while your account is active, and there are no hidden extras.', // TS 4 l.187 [G]
    addCredits: 'Add Credits', notNow: 'Not now',                                         // TS 4 l.188, l.205 [G]
    notNowLine: 'No rush at all. Your space, your gallery and everything you made are right here whenever you want them.', // TS 4 l.206 [G]
    signin: 'Sign in',                                                                    // v0.9 l.434
    download: 'Download',                                                                 // v0.9 l.479
    againLeft: 'Create again from the left pane',                                         // v0.9 l.468 (aria label)
    captureMiss: 'Capture did not catch a frame. Try once more.',                         // R03 built copy (blank frame only)
    testBanner: 'TEST MODE: this image is not marked. It cannot be downloaded or shared.', // INTERNAL test-only, never on a public account
    testTag: 'TEST: runs the golden-hour test prompt'                                     // INTERNAL test-only mapping tag (rule 2)
  };

  // Packs: ids are the Worker's stripe.js keys; counts and euros are CF#7 canon (50/210/660). Display only: the Worker
  // and Stripe set what is charged. NEVER "200/700".
  var PACKS = [{ id: 'pack-2-99', credits: 50, eur: '2.99' }, { id: 'pack-9-99', credits: 210, eur: '9.99' }, { id: 'pack-29-99', credits: 660, eur: '29.99' }];

  // Enhance: the locked three (TS 3b, BB l.53). Ids per venues.json l.90-92 (Leann may re-slug). The client sends the id only.
  var TREATMENTS = [{ id: 'enh-light-it-well', label: 'Light It Well' }, { id: 'enh-true-to-life-hd', label: 'True to Life HD', sizes: true },
    { id: 'enh-sharpen-and-clean', label: 'Sharpen and Clean' }];
  // TEST MAPPING (rule 2, R06 only): until Worker B3 serves the three ids, "Light It Well" runs the live TEST preset
  // style-golden-hour, and ONLY when (a) the page says it is the test path, (b) the Worker's authenticated /presets says
  // testOverride:true for this account, and (c) that id is in the Worker's active list. Shown with a visible TEST tag.
  var TEST_MAP = { 'enh-light-it-well': 'style-golden-hour' };

  // Image Shape (TS 7, v0.9 l.389-393). Social is Widescreen's tall pair (paired jumps, v0.9 setOrient).
  var SHAPES = [{ name: 'Square', l: 1, s: 1 }, { name: 'Standard', l: 4, s: 3 }, { name: 'Widescreen', l: 16, s: 9, natural: 'wide' },
    { name: 'Cinematic', l: 21, s: 9 }, { name: 'Social', l: 16, s: 9, natural: 'tall' }];
  var RATIOS = { '1:1': 1, '4:3': 4 / 3, '3:4': 3 / 4, '16:9': 16 / 9, '9:16': 9 / 16, '21:9': 21 / 9, '9:21': 9 / 21 };

  // Reimagine spine: labels verbatim from the signed packs (taxonomy venues.json / homes.json). Ids are the pack ids.
  // Sent as step ids; the Worker spine is B6 (not built), so Reimagine is offered only when the Worker lists an active id.
  var SPINE = {
    venue: [
      ['space-ceremony-room', 'Ceremony Room'], ['space-banquet-hall', 'Banquet Hall'], ['space-ballroom', 'Ballroom'], ['space-courtyard', 'Courtyard'],
      ['space-garden-grounds', 'Garden / Grounds'], ['space-bar-lounge', 'Bar / Lounge'], ['space-restaurant-dining-room', 'Restaurant / Dining Room'],
      ['space-suite-bedroom', 'Suite / Bedroom'], ['space-foyer-reception', 'Foyer / Reception'], ['space-terrace-rooftop', 'Terrace / Rooftop'],
      ['space-marquee-tent', 'Marquee / Tent'], ['space-great-hall', 'Great Hall']],
    venueOcc: [
      ['occ-wedding', 'Wedding'], ['occ-christening-baptism', 'Christening / Baptism'], ['occ-birthday-celebration', 'Birthday / Celebration'],
      ['occ-corporate-event', 'Corporate Event'], ['occ-private-dinner', 'Private Dinner'], ['occ-music-gig', 'Music / Gig'],
      ['occ-seasonal-event', 'Seasonal Event'], ['occ-family-gathering', 'Family Gathering'], ['occ-cultural-heritage-evening', 'Cultural / Heritage Evening']],
    venueStyle: [
      ['style-classic-elegance', 'Classic Elegance'], ['style-rustic-country', 'Rustic / Country'], ['style-modern-minimal', 'Modern Minimal'],
      ['style-romantic-candlelit', 'Romantic Candlelit'], ['style-festival-vibrant', 'Festival / Vibrant'], ['style-heritage-castle', 'Heritage / Castle'],
      ['style-seasonal-palette', 'Seasonal Palette']],
    group: [['size-intimate', 'Intimate'], ['size-family', 'Family'], ['size-full-room', 'Full Room'], ['size-grand', 'Grand']],
    home: [
      ['room-living-room', 'Living Room'], ['room-kitchen', 'Kitchen'], ['room-bedroom', 'Bedroom'], ['room-nursery', 'Nursery'],
      ['room-study-home-office', 'Study / Home Office'], ['room-bathroom', 'Bathroom'], ['room-dining-room', 'Dining Room'],
      ['room-hall-landing', 'Hall / Landing'], ['room-attic-spare-room', 'Attic / Spare Room'], ['room-garden-exterior', 'Garden / Exterior']],
    homeOcc: [
      ['purpose-couple', 'Couple'], ['purpose-young-family', 'Young Family'], ['purpose-growing-family', 'Growing Family'],
      ['purpose-multigenerational', 'Multigenerational'], ['purpose-living-alone', 'Living Alone'], ['purpose-working-from-home', 'Working From Home'],
      ['purpose-hosting-entertaining', 'Hosting / Entertaining'], ['purpose-ready-to-sell', 'Ready to Sell'], ['purpose-just-bought-off-plan', 'Just Bought / Off-Plan']],
    homeStyle: [
      ['hstyle-contemporary', 'Contemporary'], ['hstyle-classic-traditional', 'Classic / Traditional'], ['hstyle-scandi-light', 'Scandi / Light'],
      ['hstyle-industrial', 'Industrial'], ['hstyle-cottage-country', 'Cottage / Country'], ['hstyle-coastal', 'Coastal'],
      ['hstyle-bold-eclectic', 'Bold / Eclectic'], ['hstyle-show-home-neutral', 'Show-Home Neutral']]
  };

  var MAX_BYTES = 8000000;               // mirrors the Worker's MAX_CANVAS_BYTES; the Worker re-checks and is the authority
  var MIN_BYTES = 1536;                  // below this a PNG is the blank-frame signature
  var SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
  var POLL_MS = 3000, POLL_MAX_MS = 240000;
  var FORBIDDEN = ['session', 'sessionjwt', 'token', 'access_token', 'jwt', 'class', 'spaceclass', 'price', 'tier', 'credits'];

  function h(tag, props, kids) {
    var n = document.createElement(tag);
    for (var k in (props || {})) {
      var v = props[k];
      if (v == null || v === false) continue;
      if (k === 'text') n.textContent = v;
      else if (k === 'on') for (var e in v) n.addEventListener(e, v[e]);
      else if (k === 'class') n.className = v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function err(code, detail) { var e = new Error(detail || code); e.code = code; return e; }
  // B1.4 N1: keys MUST be lowercase UUIDs. The fallback builds a v4 UUID from getRandomValues (never the old "k..." key).
  function uuid() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var x = Array.prototype.map.call(b, function (n) { return (n + 256).toString(16).slice(1); }).join('');
    return x.slice(0, 8) + '-' + x.slice(8, 12) + '-' + x.slice(12, 16) + '-' + x.slice(16, 20) + '-' + x.slice(20);
  }
  function stamp() { return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); }
  function shapeRatio(shape, orient) {
    if (shape.l === shape.s) return { w: 1, h: 1, text: '1:1' };
    return orient === 'tall' ? { w: shape.s, h: shape.l, text: shape.s + ':' + shape.l } : { w: shape.l, h: shape.s, text: shape.l + ':' + shape.s };
  }
  function findShape(name) { for (var i = 0; i < SHAPES.length; i++) if (SHAPES[i].name === name) return SHAPES[i]; return SHAPES[2]; }

  function hasForbidden(o, depth) {
    if (!o || typeof o !== 'object' || o instanceof Blob || depth > 3) return false;
    return Object.keys(o).some(function (k) { return FORBIDDEN.indexOf(k.toLowerCase()) >= 0 || hasForbidden(o[k], depth + 1); });
  }

  // R06 (P22): any named shape's ratio; the 2% crop check is generalised from 16:9 / 9:16 to the whole set.
  function validatePacket(p) {
    if (!p || p.v !== 1) throw err('E_PACKET_VERSION');
    if (hasForbidden(p, 0)) throw err('E_PACKET_FORBIDDEN');
    if (['save', 'enhance', 'reimagine'].indexOf(p.intent) < 0) throw err('E_PACKET_SHAPE', 'intent');
    var c = p.capture || {}, r = c.cropRect || {};
    if (!(c.blob instanceof Blob) || c.mime !== 'image/png' || c.blob.type !== 'image/png') throw err('E_PACKET_SHAPE', 'capture');
    if (c.blob.size < MIN_BYTES) throw err('E_CAPTURE_BLANK');
    if (c.blob.size > MAX_BYTES) throw err('E_CAPTURE_TOO_LARGE');
    if (!(c.width > 0 && c.height > 0) || c.width !== Math.round(r.w) || c.height !== Math.round(r.h)) throw err('E_CROP_MISMATCH', 'size');
    var a = p.aspect || {}, want = RATIOS[a.ratio];
    if (!want || Math.abs(c.width / c.height - want) / want > 0.02) throw err('E_CROP_MISMATCH', 'aspect');
    if (!p.space || !SLUG.test(p.space.venue || '') || !SLUG.test(p.space.space || '')) throw err('E_PACKET_SHAPE', 'space');
    return p;
  }

  function markState(d) {
    var x = d && d.disclosure;
    if (x && typeof x === 'object' && x.strip === true && x.c2pa === true && x.trustmark === true) return 'marked';
    if (d && d.provenance && d.provenance.testOverride === true) return 'test';
    return 'unmarked';
  }

  function createWorkerClient(cfg) {
    function auth() {
      return cfg.getSession().then(function (s) { if (!s || !s.access_token) throw err('E_NO_SESSION'); return s.access_token; });
    }
    function call(path, init) {
      return fetch(cfg.base + path, init).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
      }, function () { throw err(navigator.onLine === false ? 'E_OFFLINE' : 'E_NETWORK'); });
    }
    function post(path, jwt, body) {
      return call(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt }, body: JSON.stringify(body) });
    }
    return {
      // One call, no mode: the active list for both modes, prices, and (signed in) deliverable / testOverride / outputHost.
      presets: function (space) {
        var path = '/presets?venue=' + encodeURIComponent(space.venue) + '&space=' + encodeURIComponent(space.space);
        return Promise.resolve().then(function () { return cfg.getSession(); }).then(function (s) { return s && s.access_token ? s.access_token : null; }, function () { return null; })
          .then(function (jwt) {
            return call(path, jwt ? { method: 'GET', headers: { 'Authorization': 'Bearer ' + jwt } } : { method: 'GET' })
              .then(function (r) { r.signedIn = !!jwt; return r; });
          });
      },
      enhance: function (q) {
        return auth().then(function (jwt) {
          var meta = { idempotencyKey: q.idempotencyKey, mode: q.mode, presetId: q.presetId, userText: q.userText, isFreePath: q.isFreePath };
          if (q.steps) meta.steps = q.steps;        // R06 P24: Reimagine step ids (Worker spine is B6; B1.4 ignores them)
          if (q.shape) meta.shape = q.shape;        // R06 P22: informational; the image itself is already cropped
          return call('/enhance', { method: 'POST', body: q.blob, headers: { 'Content-Type': q.blob.type || 'image/png',
            'Authorization': 'Bearer ' + jwt, 'X-Avalia-Request': encodeURIComponent(JSON.stringify(meta)) } });
        });
      },
      status: function (key) { return auth().then(function (jwt) { return post('/status', jwt, { idempotencyKey: key }); }); },
      retryMark: function (genId) { return auth().then(function (jwt) { return post('/retry-mark', jwt, { genId: genId }); }); },
      output: function (genId) { return auth().then(function (jwt) { return post('/output', jwt, { genId: genId }); }); }
    };
  }

  function mount(opts) {
    var host = opts.host, worker = opts.worker;
    var root = h('div', { class: 'acu-root' });
    document.body.appendChild(root);
    var vf = null, scrim = null, dialog = null, titleEl = null, bodyEl = null, statusEl = null, closeBtn = null, prevEl = null;
    var S = null;
    var reduce = global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var shapeState = { name: 'Widescreen', orient: 'wide' };     // default v0.9 l.391; kept across re-frames
    function spaceClass() { return (opts.spaceClass && opts.spaceClass() === 'home') ? 'home' : 'venue'; }

    // R06_1: S.open = a POST may have left on S.key and the Worker has not yet given a definitive answer for it.
    // While S.open is true the key is NEVER replaced (SF1, SF2): every path asks /status about S.key instead.
    function newState(p) {
      return { packet: p, mode: 'enhance', urls: [], beforeUrl: null, key: p.packetId, run: 0, keepKey: false, open: false, timer: null,
        treatment: null, rei: { space: '', occasion: '', style: '', group: '', other: { space: '', occasion: '', style: '' }, open: '' },
        more: '', srv: null, sel: null };
    }

    // ------------------------------- viewfinder (Image Shape aware) -------------------------------
    function openViewfinder(carry) {
      if (vf) return;
      var masks = [0, 1, 2, 3].map(function () { return h('div', { class: 'acu-mask' }); });
      var frame = h('div', { class: 'acu-frame', 'aria-hidden': 'true' });
      var hint = h('p', { class: 'acu-vf-hint', role: 'status', 'aria-live': 'polite', text: w('W8a') });
      var bW = h('button', { class: 'acu-btn', type: 'button', text: COPY.wide });
      var bT = h('button', { class: 'acu-btn', type: 'button', text: COPY.tall });
      var bC = h('button', { class: 'acu-btn primary', type: 'button', text: w('W8b') });
      var bX = h('button', { class: 'acu-btn', type: 'button', text: w('W8c.close') });
      var orientGroup = h('div', { class: 'acu-seg', role: 'group', 'aria-label': COPY.shapeHead }, [bW, bT]);
      vf = h('div', { class: 'acu-vf', role: 'region', 'aria-label': w('W8a') }, masks.concat([frame, hint, h('div', { class: 'acu-vf-bar' }, [orientGroup, bC, bX])]));
      root.appendChild(vf);
      var rect = null;
      function layout() {
        var r = shapeRatio(findShape(shapeState.name), shapeState.orient), ar = r.w / r.h;
        var vw = innerWidth, vh = innerHeight, aw = vw * 0.84, ah = vh * 0.62, fw = aw, fh = fw / ar;
        if (fh > ah) { fh = ah; fw = fh * ar; }
        var x = Math.round((vw - fw) / 2), y = Math.round((vh - fh) / 2.4);
        rect = { x: x, y: y, w: Math.round(fw), h: Math.round(fh) };
        frame.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + rect.w + 'px;height:' + rect.h + 'px';
        masks[0].style.cssText = 'left:0;top:0;width:100%;height:' + y + 'px';
        masks[1].style.cssText = 'left:0;top:' + (y + rect.h) + 'px;width:100%;bottom:0';
        masks[2].style.cssText = 'left:0;top:' + y + 'px;width:' + x + 'px;height:' + rect.h + 'px';
        masks[3].style.cssText = 'left:' + (x + rect.w) + 'px;top:' + y + 'px;right:0;height:' + rect.h + 'px';
        bW.setAttribute('aria-pressed', String(shapeState.orient === 'wide'));
        bT.setAttribute('aria-pressed', String(shapeState.orient === 'tall'));
      }
      bW.addEventListener('click', function () { setOrient('wide'); layout(); });
      bT.addEventListener('click', function () { setOrient('tall'); layout(); });
      bX.addEventListener('click', function () { if (carry) { removeViewfinder(); host.pause(); S = carry; openDialog(); openRail(); } else closeAll(); });
      bC.addEventListener('click', function () {
        bC.disabled = true;
        var r = shapeRatio(findShape(shapeState.name), shapeState.orient);
        var f = { cssRect: rect, viewport: { w: innerWidth, h: innerHeight }, orientation: shapeState.orient, ratio: r.text, shape: shapeState.name };
        Promise.resolve(host.handoff(carry ? carry.mode : 'enhance', f)).then(validatePacket).then(function (p) {
          removeViewfinder();
          host.pause();
          if (carry) { S = carry; swapPacket(p); } else { S = newState(p); S.beforeUrl = keepUrl(URL.createObjectURL(p.capture.blob)); }
          openDialog(); openRail();   // a carried state keeps its server picture (S.srv); a new one loads it
        }).catch(function (e) {
          console.warn('[Avalia CUI] capture refused:', e && e.code, e);
          hint.textContent = (e && e.code === 'E_CAPTURE_BLANK') ? COPY.captureMiss : w('W8j'); bC.disabled = false;
        });
      });
      vf.addEventListener('keydown', function (e) { if (e.key === 'Escape') bX.click(); });
      vf._layout = layout; addEventListener('resize', layout);
      layout(); bC.focus();
      if (host.onViewfinder) host.onViewfinder(true, rect);   // R06: the page shows its shot tools (orbit, level, grid, wide)
    }
    function removeViewfinder() {
      if (!vf) return; removeEventListener('resize', vf._layout); vf.remove(); vf = null;
      if (host.onViewfinder) host.onViewfinder(false);
    }
    // Paired jumps (v0.9 setOrient): Widescreen + Tall jumps to Social; Social + Wide jumps to Widescreen.
    function setOrient(o) {
      if (shapeState.name === 'Widescreen' && o === 'tall') { shapeState = { name: 'Social', orient: 'tall' }; return; }
      if (shapeState.name === 'Social' && o === 'wide') { shapeState = { name: 'Widescreen', orient: 'wide' }; return; }
      shapeState.orient = o;
    }
    function setShape(name) { var s = findShape(name); shapeState = { name: name, orient: s.natural || shapeState.orient }; }

    // ------------------------------- dialog shell -------------------------------
    function openDialog() {
      titleEl = h('h2', { id: 'acu-title', tabindex: '-1' });
      closeBtn = h('button', { class: 'acu-btn', type: 'button', text: w('W8c.close'), on: { click: closeAll } });
      bodyEl = h('div', { class: 'acu-body' });
      statusEl = h('p', { class: 'acu-status', role: 'status', 'aria-live': 'polite' });
      dialog = h('div', { class: 'acu-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'acu-title' },
        [h('div', { class: 'acu-head' }, [titleEl, closeBtn]), bodyEl, statusEl]);
      scrim = h('div', { class: 'acu-scrim' }, [dialog]);
      scrim.addEventListener('keydown', trapKeys);
      root.appendChild(scrim);
    }
    function trapKeys(e) {
      if (e.key === 'Escape' && prevEl) { e.preventDefault(); closePreview(); return; }
      if (e.key === 'Escape' && !closeBtn.disabled) { e.preventDefault(); closeAll(); return; }
      if (e.key !== 'Tab') return;
      var scope = prevEl || dialog;
      var f = scope.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea,[href],[tabindex="0"]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (Array.prototype.indexOf.call(f, document.activeElement) < 0) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function step(title, nodes, busy, keepFocus) {
      titleEl.textContent = title; bodyEl.textContent = ''; statusEl.textContent = ''; statusEl.className = 'acu-status';
      nodes.forEach(function (n) { if (n) bodyEl.appendChild(n); });
      closeBtn.disabled = !!busy;
      if (!keepFocus) titleEl.focus();
    }
    function say(text, isErr) { statusEl.textContent = text; statusEl.className = 'acu-status' + (isErr ? ' err' : ''); }
    function btn(text, fn, primary, extra) {
      var b = h('button', { class: 'acu-btn' + (primary ? ' primary' : ''), type: 'button', on: { click: fn } });
      b.textContent = text; for (var k in (extra || {})) b.setAttribute(k, extra[k]);
      return b;
    }
    function keepUrl(u) { S.urls.push(u); return u; }
    function modeName(m) { return m === 'reimagine' ? COPY.reimagine : COPY.enhance; }
    // R06_1: the free-path variant ("...f" key) when the run used the complimentary path; never Credits wording there.
    function wf(key, free) { return free && WORDING[key + 'f'] ? w(key + 'f', modeName(S.mode)) : w(key); }

    function closeAll() {
      removeViewfinder(); closePreview();
      if (S) { if (S.timer) clearTimeout(S.timer); S.urls.forEach(function (u) { if (u.indexOf('blob:') === 0) URL.revokeObjectURL(u); }); }
      var wasOpen = !!scrim;
      if (scrim) { scrim.remove(); scrim = null; }
      S = null;
      if (wasOpen) host.resume();
      if (host.onClosed) host.onClosed();   // R06: the page puts the camera back to walk, 60 degrees, no grid
      if (opts.returnFocus) opts.returnFocus.focus();
    }
    function swapPacket(p) {
      if (S.beforeUrl) { URL.revokeObjectURL(S.beforeUrl); S.urls = S.urls.filter(function (u) { return u !== S.beforeUrl; }); }
      S.packet = p; S.beforeUrl = keepUrl(URL.createObjectURL(p.capture.blob));
    }

    // ------------------------------- server picture (one /presets call) -------------------------------
    function loadServer() {
      return Promise.resolve(worker.presets(S.packet.space)).then(function (res) {
        if (!res.ok) throw err(res.status === 0 ? 'E_NETWORK' : 'E_PRESETS');
        var d = res.data || {}, act = { enhance: [], reimagine: [] };
        (d.presets || []).forEach(function (p) {
          var m = p && String(p.mode).toLowerCase();
          if (p && p.active === true && act[m]) act[m].push(p.id);
        });
        return { ok: true, signedIn: !!res.signedIn, active: act, prices: d.prices || {}, ent: d.entitlements || null,
          deliverable: d.deliverable, reason: d.reason, testOverride: d.testOverride === true, outputHost: d.outputHost || null };
      });
    }
    function resolveTreatment(id) {
      var srv = S.srv; if (!srv || !id) return null;
      if (srv.active.enhance.indexOf(id) >= 0) return { id: id, test: false };
      var t = TEST_MAP[id];
      if (t && opts.testPath === true && srv.testOverride && srv.active.enhance.indexOf(t) >= 0) return { id: t, test: true };
      return null;
    }
    function reiPresetId() {
      var srv = S.srv, r = S.rei, picks = [r.style, r.occasion, r.space].filter(Boolean);
      for (var i = 0; i < picks.length; i++) if (srv.active.reimagine.indexOf(picks[i]) >= 0) return picks[i];
      return null;
    }
    function reiAny() { var r = S.rei; return !!(r.space || r.occasion || r.style || r.other.space || r.other.occasion || r.other.style); }
    // What the go button may do. Never offers a call the Worker would refuse; never shows a price the server did not send.
    function avail() {
      var srv = S.srv;
      if (!srv) return { ok: false, reason: 'loading' };
      if (S.mode === 'reimagine' && !reiAny()) return { ok: false, reason: 'choose', price: srv.prices[S.mode] };   // pick a step first: no W1
      var free = !!(srv.ent && srv.ent[S.mode] === true);
      var price = srv.prices[S.mode];
      var priced = free || (typeof price === 'number' && price >= 0);
      if (!srv.signedIn) return { ok: priced, needsSignin: true, free: false, price: price, reason: priced ? '' : 'price' };
      if (srv.deliverable !== true) return { ok: false, reason: srv.reason || 'not_deliverable' };
      if (!srv.testOverride && srv.outputHost && !opts.isAllowedDownloadUrl('https://' + srv.outputHost + '/')) return { ok: false, reason: 'download_host' };
      var pid = null, test = false;
      if (S.mode === 'enhance') { var r = resolveTreatment(S.treatment); if (r) { pid = r.id; test = r.test; } }
      else if (reiAny()) pid = reiPresetId();
      if (!pid) return { ok: false, reason: 'treatment' };
      if (!priced) return { ok: false, reason: 'price' };
      return { ok: true, presetId: pid, test: test, free: free, price: price };
    }

    // ------------------------------- the create rail (P19) -------------------------------
    function openRail() {
      renderRail();
      if (S.srv) return;
      Promise.resolve(loadServer()).then(function (srv) {
        if (!S) return;
        S.srv = srv;
        if (!S.treatment) {   // default: the first pill the server can run (signed out: the first pill)
          var pick = TREATMENTS.filter(function (t) { return !srv.signedIn || resolveTreatment(t.id); })[0];
          S.treatment = pick ? pick.id : TREATMENTS[0].id;
        }
        if (!srv.active.enhance.length && !srv.active.reimagine.length) return renderEmpty();
        renderRail(null, false, true);
        refreshBalance();
      }).catch(function (e) {
        if (!S) return;
        if (e && e.code === 'E_OFFLINE') return renderFail(COPY.offline, { retry: function () { S.srv = null; openRail(); } });
        renderFail(w('W8g'), { retry: function () { S.srv = null; openRail(); } });
      });
    }
    function renderEmpty() {
      step(w('W8f.head'), [h('p', { text: w('W8f.body') }), h('div', { class: 'acu-row' }, [btn(w('W8c.back'), closeAll, true)])]);
    }

    function renderRail(note, noteErr, keepFocus) {
      if (!S) return;
      var enh = S.mode === 'enhance', cls = spaceClass();
      var tabs = h('div', { class: 'acu-tabs', role: 'group', 'aria-label': COPY.enhance + ' / ' + COPY.reimagine }, ['enhance', 'reimagine'].map(function (m) {
        return btn(modeName(m), function () { if (S.mode !== m) { S.mode = m; renderRail(null, false, true); } }, false, { 'aria-pressed': String(S.mode === m), class: 'acu-btn acu-tab' });
      }));
      var intro = h('p', { class: 'acu-intro', text: enh ? COPY.enhanceIntro : w('W6') });
      var body = [h('img', { class: 'acu-thumb', src: S.beforeUrl, alt: COPY.paneBefore }), tabs, intro];
      if (enh) body.push(enhanceBlock()); else body = body.concat(reimagineBlock(cls));
      body.push(shapeBlock());
      var a = avail();
      body.push(walletLine(a));
      var label = enh ? COPY.enhanceGo : COPY.reimagineNow;
      var go = h('button', { class: 'acu-btn primary acu-go', type: 'button', 'aria-describedby': 'acu-go-why' });
      go.appendChild(document.createTextNode(label));
      var priceText = a.free ? COPY.freePrice : (typeof a.price === 'number' ? COPY.credits(a.price) : (S.srv && S.srv.prices[S.mode] != null ? COPY.credits(S.srv.prices[S.mode]) : ''));
      if (priceText) go.appendChild(h('span', { class: 'acu-price', text: priceText }));
      var why = h('p', { class: 'acu-why', id: 'acu-go-why' });
      if (!S.srv) { go.disabled = true; go.setAttribute('aria-busy', 'true'); }
      else if (!a.ok) { go.disabled = true; if (a.reason !== 'loading' && a.reason !== 'choose') why.textContent = w('W1'); console.warn('[Avalia CUI] not offered, nothing spent. reason =', a.reason); }
      go.addEventListener('click', onGo);
      if (!enh && reiAny()) body.push(h('p', { class: 'acu-hint', text: COPY.stopAnywhere }));
      body.push(go, why);
      body.push(h('div', { class: 'acu-row' }, [
        host.onSave ? btn(w('W30'), function () { var p = S.packet; closeAll(); host.onSave(p); }) : null,
        btn(w('W8e'), function () { var keep = S; detachForReframe(); openViewfinder(keep); })]));
      step(w('W8d'), body, false, keepFocus);
      if (note) say(note, noteErr);
    }
    function detachForReframe() { if (scrim) { scrim.remove(); scrim = null; } host.resume(); }

    function enhanceBlock() {
      var srv = S.srv, signed = srv && srv.signedIn;
      var fs = h('fieldset', { class: 'acu-fs' }, [h('legend', { class: 'acu-sr', text: COPY.enhance })]);
      var row = h('div', { class: 'acu-pills' });
      TREATMENTS.forEach(function (t) {
        var r = signed ? resolveTreatment(t.id) : null, off = signed && !r;
        var inp = h('input', { type: 'radio', name: 'acu-treat', value: t.id, checked: S.treatment === t.id, disabled: off,
          'aria-describedby': off ? 'acu-w24-' + t.id : null });
        inp.addEventListener('change', function () { S.treatment = t.id; renderRail(null, false, true); var n = bodyEl.querySelector('input[value="' + t.id + '"]'); if (n) n.focus(); });
        var lab = h('label', { class: 'acu-pill' + (off ? ' off' : '') }, [inp, h('span', { text: t.label })]);
        if (r && r.test) lab.appendChild(h('span', { class: 'acu-testtag', text: COPY.testTag }));
        if (off) lab.appendChild(h('span', { class: 'acu-sub', id: 'acu-w24-' + t.id, text: w('W24') }));
        row.appendChild(lab);
      });
      fs.appendChild(row);
      // HD size picker: PLACEHOLDER SLOT ONLY (rule 3). Sizes and prices wait on Liam's fal tests (Decision Sheet v0.8 Q1).
      if (S.treatment === 'enh-true-to-life-hd') {
        fs.appendChild(h('div', { class: 'acu-slot', role: 'group', 'aria-label': w('W9') }, [h('p', { class: 'acu-slot-h', text: w('W9') }),
          h('p', { class: 'acu-sub', text: '[W10] sizes pending Decision Sheet v0.8 Q1' })]));
      }
      return fs;
    }

    function reimagineBlock(cls) {
      var r = S.rei, out = [];
      var steps = [
        { key: 'space', head: COPY.stepSpace[cls], list: cls === 'home' ? SPINE.home : SPINE.venue },
        { key: 'occasion', head: COPY.stepOccasion[cls], list: cls === 'home' ? SPINE.homeOcc : SPINE.venueOcc },
        { key: 'style', head: COPY.stepStyle, list: cls === 'home' ? SPINE.homeStyle : SPINE.venueStyle }];
      steps.forEach(function (st, i) {
        var open = r.open === st.key, panelId = 'acu-acc-' + st.key;
        var chosen = r[st.key] ? labelOf(st.list, r[st.key]) : (r.other[st.key] ? COPY.other : '');
        var head = btn('', function () { r.open = open ? '' : st.key; renderRail(null, false, true); var b = bodyEl.querySelector('[aria-controls="' + panelId + '"]'); if (b) b.focus(); },
          false, { 'aria-expanded': String(open), 'aria-controls': panelId, class: 'acu-btn acu-acc-h' });
        head.appendChild(h('span', { text: (i + 1) + '. ' + st.head }));
        if (chosen) head.appendChild(h('span', { class: 'acu-sel', text: chosen }));
        head.appendChild(h('span', { class: 'acu-pm', 'aria-hidden': 'true', text: open ? '−' : '+' }));
        var panel = h('div', { class: 'acu-acc-p', id: panelId, hidden: !open });
        if (open) {
          var fs = h('fieldset', { class: 'acu-fs' }, [h('legend', { class: 'acu-sr', text: st.head })]);
          var row = h('div', { class: 'acu-pills' });
          st.list.concat([[st.key + '-other', COPY.other]]).forEach(function (o) {
            var isOther = o[0] === st.key + '-other';
            var checked = isOther ? r['_o_' + st.key] === true : r[st.key] === o[0];
            var inp = h('input', { type: 'radio', name: 'acu-rei-' + st.key, value: o[0], checked: checked });
            inp.addEventListener('change', function () {
              if (isOther) { r[st.key] = ''; r['_o_' + st.key] = true; } else { r[st.key] = o[0]; r['_o_' + st.key] = false; r.other[st.key] = ''; }
              renderRail(null, false, true); var n = bodyEl.querySelector('input[value="' + o[0] + '"]'); if (n) n.focus();
            });
            row.appendChild(h('label', { class: 'acu-pill' }, [inp, h('span', { text: o[1] })]));
          });
          fs.appendChild(row);
          if (r['_o_' + st.key]) {
            var ta = h('input', { type: 'text', class: 'acu-text', maxlength: '200', 'aria-label': st.head + ': ' + COPY.other, placeholder: COPY.otherPlaceholder });
            ta.value = r.other[st.key];
            ta.addEventListener('input', function () { r.other[st.key] = ta.value; });
            ta.addEventListener('change', function () { renderRail(null, false, true); });
            fs.appendChild(ta);
          }
          panel.appendChild(fs);
        }
        out.push(h('div', { class: 'acu-acc' }, [head, panel]));
        if (st.key === 'occasion' && cls === 'venue') out.push(groupChips());
      });
      var more = h('input', { type: 'text', class: 'acu-text', maxlength: '300', 'aria-label': COPY.tellMore, placeholder: COPY.tellMore });
      more.value = S.more; more.addEventListener('input', function () { S.more = more.value; });
      out.push(more);   // Reimagine only (Decision Sheet v0.8 Q10 REC; Enhance never invents, BB l.60). Pending Liam.
      return out;
    }
    function labelOf(list, id) { for (var i = 0; i < list.length; i++) if (list[i][0] === id) return list[i][1]; return ''; }
    function groupChips() {
      var fs = h('fieldset', { class: 'acu-fs' }, [h('legend', { class: 'acu-legend', text: COPY.groupSize })]);
      var row = h('div', { class: 'acu-pills' });
      SPINE.group.forEach(function (o) {
        var b = btn(o[1], function () { S.rei.group = S.rei.group === o[0] ? '' : o[0]; renderRail(null, false, true); var n = bodyEl.querySelector('[data-g="' + o[0] + '"]'); if (n) n.focus(); },
          false, { 'aria-pressed': String(S.rei.group === o[0]), class: 'acu-btn acu-chip', 'data-g': o[0] });
        row.appendChild(b);
      });
      fs.appendChild(row);
      return fs;
    }

    // ------------------------------- Image Shape (P22) -------------------------------
    function shapeBlock() {
      var fs = h('fieldset', { class: 'acu-fs acu-shape' }, [h('legend', { class: 'acu-legend', text: COPY.shapeHead })]);
      var seg = h('div', { class: 'acu-seg', role: 'group', 'aria-label': COPY.wide + ' / ' + COPY.tall }, ['wide', 'tall'].map(function (o) {
        return btn(o === 'wide' ? COPY.wide : COPY.tall, function () { setOrient(o); recrop(); }, false, { 'aria-pressed': String(shapeState.orient === o), class: 'acu-btn acu-chip' });
      }));
      var row = h('div', { class: 'acu-pills' });
      SHAPES.forEach(function (s) {
        var r = shapeRatio(s, s.natural || shapeState.orient);
        var inp = h('input', { type: 'radio', name: 'acu-shape', value: s.name, checked: shapeState.name === s.name });
        inp.addEventListener('change', function () { setShape(s.name); recrop(); });
        row.appendChild(h('label', { class: 'acu-pill' }, [inp, h('span', { text: s.name }), h('span', { class: 'acu-dim', text: s.name === 'Social' ? '9:16' : (s.l === s.s ? '1:1' : s.l + ':' + s.s) })]));
      });
      var cur = shapeRatio(findShape(shapeState.name), shapeState.orient);
      var readout = h('p', { class: 'acu-readout', text: shapeState.name + ' · ' + cur.text + ' · ' + (shapeState.orient === 'tall' ? COPY.tall : COPY.wide) }); // TS 7 l.291
      var acts = h('div', { class: 'acu-row' }, [btn(COPY.preview, openPreview), btn(COPY.applyToView, function () { var keep = S; detachForReframe(); openViewfinder(keep); })]);
      fs.appendChild(seg); fs.appendChild(row); fs.appendChild(readout); fs.appendChild(acts);
      return fs;
    }
    // A new shape re-crops the SAME paused frame inside the viewer (rule 2: the crop never happens outside the viewer).
    function recrop() {
      var r = shapeRatio(findShape(shapeState.name), shapeState.orient), ar = r.w / r.h;
      var vw = innerWidth, vh = innerHeight, fw = vw * 0.96, fh = fw / ar;
      if (fh > vh * 0.96) { fh = vh * 0.96; fw = fh * ar; }
      var rect = { x: Math.round((vw - fw) / 2), y: Math.round((vh - fh) / 2), w: Math.round(fw), h: Math.round(fh) };
      var mine = S;
      Promise.resolve(host.handoff(S.mode, { cssRect: rect, viewport: { w: vw, h: vh }, orientation: shapeState.orient, ratio: r.text, shape: shapeState.name }))
        .then(validatePacket).then(function (p) { if (S !== mine) return; swapPacket(p); renderRail(null, false, true); })
        .catch(function (e) { console.warn('[Avalia CUI] re-crop refused:', e && e.code, e); if (S === mine) renderRail(w('W8j'), true, true); });
    }
    function openPreview() {
      closePreview();
      var close = btn(w('W8c.close'), closePreview, true);
      prevEl = h('div', { class: 'acu-preview', role: 'dialog', 'aria-modal': 'true', 'aria-label': COPY.preview }, [
        h('img', { src: S.beforeUrl, alt: COPY.paneBefore + ', ' + shapeState.name }), h('div', { class: 'acu-row' }, [close])]);
      scrim.appendChild(prevEl); close.focus();
    }
    function closePreview() { if (!prevEl) return; prevEl.remove(); prevEl = null; if (dialog) { var b = dialog.querySelector('.acu-shape .acu-row button'); if (b) b.focus(); } }

    // ------------------------------- wallet line (P20, P21) -------------------------------
    function walletLine(a) {
      var left = h('span', { class: 'acu-free', text: a.free ? COPY.freeNote(modeName(S.mode)) : '' });
      var right = h('span', { class: 'acu-wallet' });
      if (S.srv && S.srv.signedIn) {
        right.appendChild(h('span', { class: 'acu-bal', id: 'acu-bal', text: S.balance == null ? COPY.creditsMiss : COPY.credits(S.balance) }));
        right.appendChild(btn(COPY.addCredits, function () { renderPaywall(''); }, false, { class: 'acu-link' }));
      }
      return h('div', { class: 'acu-walletrow' }, [left, right]);
    }
    function refreshBalance() {
      if (!host.getBalance || !S || !S.srv || !S.srv.signedIn) return;
      var mine = S;
      Promise.resolve(host.getBalance()).then(function (n) {
        if (S !== mine) return;
        S.balance = (typeof n === 'number' && isFinite(n)) ? n : null;
        var el = document.getElementById('acu-bal'); if (el) el.textContent = S.balance == null ? COPY.creditsMiss : COPY.credits(S.balance);
      }, function () {});
    }

    // ------------------------------- go, sign-in (P08, one card) -------------------------------
    // onGo is the ONLY place a new run starts, and it is reached only from the priced go button (or from the sign-in
    // that the same priced tap opened, before anything was sent).
    function onGo() {
      var a = avail();
      if (a.needsSignin) return askSignin();
      if (!a.ok) return;
      var r = S.rei, steps = null, text = '';
      if (S.mode === 'reimagine') {
        steps = { space: r.space || null, occasion: r.occasion || null, style: r.style || null, groupSize: r.group || null };
        text = [r.other.space, r.other.occasion, r.other.style, S.more].map(function (x) { return (x || '').trim(); }).filter(Boolean).join('. ');
      }
      var label = S.mode === 'enhance' ? (TREATMENTS.filter(function (t) { return t.id === S.treatment; })[0] || {}).label : '';
      S.sel = { presetId: a.presetId, test: a.test, free: a.free, userText: text, steps: steps, label: label };
      generate(false);
    }
    // The page's ONE sign-in card (TS 1 heading). No second card, no dead "Continue".
    function askSignin() {
      scrim.hidden = true;
      host.requestSignin(function () {
        if (!scrim) return;
        scrim.hidden = false;
        Promise.resolve(host.getSession()).then(function (s) {
          if (!S) return;
          if (!s) return renderRail(w('W2'), true);
          // SF1 (R06_1): a sign-in AFTER a send RESUMES that run on the SAME key: ask /status, never send a new key.
          // B1.2 did the same (r06b1_2.js l.399). The server picture is refreshed quietly for the rail afterwards.
          if (S.open) {
            var mine = S;
            loadServer().then(function (srv) { if (S === mine) { S.srv = srv; refreshBalance(); } }, function () {});
            return poll(!!(S.sel && S.sel.free), Date.now() + POLL_MAX_MS);
          }
          S.srv = null; renderRail();
          return loadServer().then(function (srv) {
            if (!S) return;
            S.srv = srv; refreshBalance();
            var a = avail();
            if (a.ok && !a.needsSignin) return onGo();   // first send of the run the guest tapped (priced) before sign-in
            renderRail();
          });
        }).catch(function () { if (S) renderFail(w('W8g'), { retry: function () { S.srv = null; openRail(); } }); });
      });
    }

    // ------------------------------- generate, wait (P26), poll -------------------------------
    function waitState() {
      var bar = h('div', { class: 'acu-bar', 'aria-hidden': 'true' }, [h('div', { class: 'acu-bar-fill' })]);
      var tid = h('div', { class: 'acu-tidbit', 'aria-hidden': 'true' });   // fixed height; content slot empty until Flynn Part A
      step(w('W7'), [h('img', { class: 'acu-thumb', src: S.beforeUrl, alt: COPY.paneBefore }), bar, tid], true);
    }
    function pollRetry(free) { return function () { poll(free, Date.now() + POLL_MAX_MS); }; }
    function generate(sameKey) {
      var free0 = !!(S.sel && S.sel.free);
      // SF1/SF2 guard (R06_1): a key that may already be charged is never replaced. Ask the Worker about it instead.
      if (S.open) return poll(free0, Date.now() + POLL_MAX_MS);
      if (!sameKey) S.key = S.run++ === 0 ? S.packet.packetId : uuid();
      S.keepKey = false;
      waitState();
      var free = !!S.sel.free, mine = S;
      var r = shapeRatio(findShape(shapeState.name), shapeState.orient);
      Promise.resolve(host.getSession()).then(function (s) {
        if (!s) throw err('E_NO_SESSION');
        S.open = true;   // from here the POST may leave; only a definitive Worker answer clears it
        return worker.enhance({ blob: S.packet.capture.blob, idempotencyKey: S.key, mode: S.mode, presetId: S.sel.presetId,
          userText: S.mode === 'enhance' ? '' : S.sel.userText, isFreePath: free, steps: S.sel.steps, shape: { name: shapeState.name, ratio: r.text } });
      }).then(function (res) { if (S === mine) handleReply(res, free); }).catch(function (e) {
        if (S !== mine) return;
        // E_NO_SESSION only comes from before the fetch (getSession or auth()), so nothing left the browser.
        if (e && e.code === 'E_NO_SESSION') { S.open = false; return askSignin(); }
        if (e && (e.code === 'E_NETWORK' || e.code === 'E_OFFLINE')) return poll(free, Date.now() + POLL_MAX_MS);   // same key, never a new one
        // SF2 (R06_1): unknown state. The key stays open; "Try again" asks /status on the SAME key.
        console.warn('[Avalia CUI] unknown state after send; polling the same key on retry', e);
        S.open = true;
        renderFail(wf('W29', free), { retry: pollRetry(free) });
      });
    }
    function poll(free, deadline) {
      var mine = S;
      waitState(); say(w('W18'));
      function again(ms) {
        if (S !== mine) return;
        if (Date.now() > deadline) return renderSlow(free);
        S.timer = setTimeout(tick, ms || POLL_MS);
      }
      function tick() {
        if (S !== mine) return;
        Promise.resolve(worker.status(S.key)).then(function (res) {
          if (S !== mine) return;
          var d = res.data || {};
          if (res.status === 401) return renderFail(COPY.expired, { signin: true });   // S.open stays: sign-in resumes this key
          // No /status (the B1.1 Worker): its CORS never let the POST leave the browser, so nothing was sent or spent.
          if (res.status === 404 && !d.state) { console.warn('[Avalia CUI] Worker has no /status (B1.1?): nothing sent'); S.open = false; if (S.srv) S.srv.deliverable = false; return renderRail(); }
          if (d.state === 'done') return handleReply({ ok: true, status: 200, data: d }, free);
          if (d.state === 'pending') return again(d.pollAfterMs);
          if (d.state === 'refunded') { S.open = false; return renderFail(free ? COPY.failedFree(modeName(S.mode)) : COPY.failed); }
          if (d.state === 'none') { S.open = false; return renderFail(w('W8i')); }   // never ran: nothing spent; a new run needs the priced tap
          again();
        }, function (e) {
          if (S !== mine) return;
          if (e && e.code === 'E_NO_SESSION') return renderFail(COPY.expired, { signin: true });   // S.open stays
          say(e && e.code === 'E_OFFLINE' ? COPY.offline : w('W18'), e && e.code === 'E_OFFLINE');
          again();
        });
      }
      again(POLL_MS);
    }
    function renderSlow(free) {
      step(modeName(S.mode), [h('p', { class: 'acu-err', text: wf('W19', free) }), h('div', { class: 'acu-row' }, [
        btn(w('W20'), function () { poll(free, Date.now() + POLL_MAX_MS); }, true), btn(w('W8c.close'), closeAll)])]);
    }

    // Reply routing (P07). W1 ONLY when nothing was charged; TS 5.1 ONLY when the reply says refunded:true.
    // R06_1: every branch below the first three is a DEFINITIVE answer for S.key, so S.open is cleared; the unknown
    // fall-through re-opens it and its retry polls the same key.
    function handleReply(res, free) {
      if (!S) return;
      var d = res.data || {};
      if (res.status === 401) { S.open = false; return renderFail(COPY.expired, { signin: true }); }   // WK l.111: refused before any read or spend
      if (res.status === 202 || d.pending === true) return poll(free, Date.now() + POLL_MAX_MS);
      if (d.error === 'MARK_FAILED' && d.genId) return renderMarkRetry(d.genId);   // made and charged: S.open stays set
      S.open = false;
      if (d.error === 'E_UNDELIVERABLE') { console.warn('[Avalia CUI] E_UNDELIVERABLE, nothing spent:', d.reason); if (S.srv) S.srv.deliverable = false; return renderRail(); }
      if (d.paused || d.error === 'insufficient_credits') { if (d.paused && S.srv && S.srv.ent) S.srv.ent[S.mode] = false; return renderPaywall(d.reason || d.error); }
      if (d.error === 'busy_account' || d.error === 'rate_limited') { S.keepKey = true; return renderFail(w('W21')); }
      if (d.error === 'superseded') return renderFail(w('W21'));                       // settled (state none): a new run needs the priced tap
      if (d.error === 'busy_try_shortly' || d.error === 'gate_unavailable') { S.keepKey = true; return renderFail(w('W22')); }
      if (d.error === 'refund_cooldown') { S.keepKey = true; return renderFail(w('W23')); }
      if (d.conflict) return renderRail(w('W8k'), true);
      if (res.ok && d.after) {
        var m = markState(d);
        if (m === 'unmarked') { console.warn('[Avalia CUI] E_PROVENANCE_MISSING: result withheld', d.genId); return renderFail(w('W27'), { noRetry: true }); }
        if (free && S.srv && S.srv.ent) S.srv.ent[S.mode] = false;
        return renderReveal(d, m);
      }
      console.warn('[Avalia CUI] generation failed', res.status, d);
      if (d.refunded === true) return renderFail(free ? COPY.failedFree(modeName(S.mode)) : COPY.failed);
      if (d.refunded === false) return renderFail(wf('W28', free), { noRetry: true });
      if (d.spent === false) { S.keepKey = d.error !== 'idempotency_key_invalid'; return renderFail(w('W1')); }
      S.open = true;   // unknown: never mint a new key over it
      renderFail(wf('W29', free), { retry: pollRetry(free) });
    }
    function renderMarkRetry(genId) {
      step(w('W8h.head'), [h('p', { text: w('W8h.body') }), h('div', { class: 'acu-row' }, [btn(w('W8h.btn'), function () {
        waitState();
        Promise.resolve(worker.retryMark(genId)).then(function (res) {
          if (res.status === 401) return renderFail(COPY.expired, { signin: true });   // charged run: S.open stays, sign-in resumes it
          handleReply(res, false);
        }).catch(function () { renderFail(w('W29'), { retry: pollRetry(false) }); });
      }, true)])]);
    }
    // SF3 (R06_1): "Try again" only RESUMES the same tapped run on the same key when nothing was spent on it (keepKey:
    // busy, cooldown, spent:false). Every other "Try again" returns to the rail, so a NEW charge needs a priced tap.
    function renderFail(text, o) {
      if (!S) return;
      o = o || {};
      var keep = S.keepKey;
      var row = [];
      if (o.signin) row.push(btn(COPY.signin, askSignin, true));
      else if (o.retry) row.push(btn(COPY.tryAgain, o.retry, true));
      else if (!o.noRetry) row.push(btn(COPY.tryAgain, function () {
        if (!S.sel) return openRail();
        if (S.open) return poll(!!S.sel.free, Date.now() + POLL_MAX_MS);
        if (keep) return generate(true);
        renderRail(); refreshBalance();
      }, true));
      row.push(btn(w('W8c.back'), function () { renderRail(); }));
      step(modeName(S.mode), [h('p', { class: 'acu-err', text: text }), h('div', { class: 'acu-row' }, row)]);
    }

    // ------------------------------- paywall (P27) -------------------------------
    function renderPaywall(reason) {
      var ent = S.srv && S.srv.ent;
      var bothSpent = !!(ent && ent.enhance === false && ent.reimagine === false);
      var nodes = [];
      if (bothSpent) nodes.push(h('p', { text: COPY.pwBody }));
      var fs = h('fieldset', { class: 'acu-fs' }, [h('legend', { class: bothSpent ? 'acu-legend' : 'acu-sr', text: COPY.topupHead })]);
      PACKS.forEach(function (p, i) {
        fs.appendChild(h('label', { class: 'acu-pack' }, [h('input', { type: 'radio', name: 'acu-pack', value: p.id, checked: i === 0 }),
          h('span', { class: 'acu-pack-t', text: COPY.pack(p.credits, p.eur) })]));
      });
      nodes.push(fs, h('p', { class: 'acu-sub', text: COPY.packSupport }));
      var add = btn(COPY.addCredits, function () {
        var sel = fs.querySelector('input[name="acu-pack"]:checked'); if (!sel) return;
        add.disabled = true; say(w('W26'));
        Promise.resolve(host.startCheckout(sel.value)).then(function (r) {
          if (!S) return;
          add.disabled = false;
          if (r && r.state === 'failed') say(w('W25'), true);
          else if (!r || r.state !== 'redirecting') say('');   // cancelled or re-verify closed: nothing charged, quiet
        }, function () { if (S) { add.disabled = false; say(w('W25'), true); } });
      }, true);
      nodes.push(h('div', { class: 'acu-row' }, [add, btn(COPY.notNow, function () { renderRail(COPY.notNowLine, false); })]));
      // Plan rail hidden until per-plan Credits are set (BB l.137). Re-verify at payment: the page (TS 1 l.91-93).
      step(bothSpent ? COPY.pwHead : COPY.topupHead, nodes);
      console.info('[Avalia CUI] paywall:', reason || 'opened');
    }

    // ------------------------------- reveal (P25) -------------------------------
    function renderReveal(d, mark) {
      if (S.sel) S.sel.free = false;   // R06_1: the free flag never outlives the reveal (a later run re-reads avail())
      var rei = S.mode === 'reimagine', after = rei ? COPY.paneReimagine : COPY.paneEnhance;
      var c = S.packet.capture;
      var clip = h('div', { class: 'acu-before', style: 'clip-path:inset(0 50% 0 0)' }, [h('img', { src: S.beforeUrl, alt: '' })]);
      var exp = h('p', { id: 'acu-exp', class: 'acu-exp', hidden: true, text: rei ? COPY.explain : COPY.explainEnhance });
      var label = h('button', { class: 'acu-label', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'acu-exp', text: COPY.label });
      label.addEventListener('click', function () { var o = exp.hidden; exp.hidden = !o; label.setAttribute('aria-expanded', String(o)); });
      // Per-side pair (BB l.55, TS F8). Left (the real capture): sparkle = create again from it. Swap: hidden until the
      // gallery. Right (the AI image): its pair waits on marking (P31), so it is not shown.
      var spark = h('button', { class: 'acu-spark', type: 'button', 'aria-label': COPY.againLeft, title: COPY.againLeft, on: { click: function () { renderRail(); } } });
      spark.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.4c.35 2.55 1.03 4.3 2.06 5.34C15.1 8.77 16.85 9.45 19.4 9.8c-2.55.35-4.3 1.03-5.34 2.06C13.03 12.9 12.35 14.65 12 17.2c-.35-2.55-1.03-4.3-2.06-5.34C8.9 10.83 7.15 10.15 4.6 9.8c2.55-.35 4.3-1.03 5.34-2.06C10.97 6.7 11.65 4.95 12 2.4z"/></svg>';
      var cmp = h('div', { class: 'acu-compare', style: 'aspect-ratio:' + c.width + ' / ' + c.height }, [
        h('img', { src: d.after, alt: COPY.label + '. ' + after + ' result.' }), clip,
        h('span', { class: 'acu-pane l', 'aria-hidden': 'true', text: COPY.paneBefore }),
        h('span', { class: 'acu-pane r', 'aria-hidden': 'true', text: after }), h('div', { class: 'acu-side l' }, [spark]), label]);
      var range = h('input', { class: 'acu-range', type: 'range', min: '0', max: '100', value: '50', 'aria-label': COPY.paneBefore + ' / ' + after });
      range.addEventListener('input', function () {
        clip.style.clipPath = 'inset(0 ' + (100 - range.value) + '% 0 0)';
        range.setAttribute('aria-valuetext', range.value + '% ' + COPY.paneBefore);
      });
      var chip = S.sel && S.sel.label ? h('p', { class: 'acu-chiplabel', text: S.sel.label + (S.sel.test ? ' (' + COPY.testTag + ')' : '') }) : null;
      var dl = btn(COPY.download, function () { download(d, mark, dl); }, false, { 'aria-disabled': String(mark !== 'marked') });
      // SF3 (R06_1): "Try again" returns to the rail, where the server price is on the go button. A new charge always
      // needs a tap on a priced button; this screen never charges.
      var wrap = h('div', { class: 'acu-reveal' + (reduce ? ' in' : '') }, [cmp, range, chip,
        mark === 'test' ? h('p', { class: 'acu-test', role: 'note', text: COPY.testBanner }) : null, exp,
        h('div', { class: 'acu-row' }, [dl]),
        h('div', { class: 'acu-row' }, [btn(COPY.tryAgain, function () { renderRail(); refreshBalance(); }, true), btn(COPY.makeChanges, function () { renderRail(); })])]);
      // "Keep it" and its micro-line wait for the gallery (BB l.77): not shown.
      step(rei ? COPY.arrivedReimagine : COPY.arrivedEnhance, [wrap]);
      if (!reduce) requestAnimationFrame(function () { wrap.classList.add('in'); });
    }
    function download(d, mark, b) {
      if (mark !== 'marked') return say(w('W8l.notReady'), true);
      b.disabled = true;
      var mode = S.mode;
      fetchSigned(d.after).catch(function () {
        return Promise.resolve(worker.output(d.genId)).then(function (res) {
          if (!res.ok || !res.data || !res.data.after || markState(res.data) !== 'marked') throw err('E_DOWNLOAD');
          d.after = res.data.after; return fetchSigned(d.after);
        });
      }).then(function (blob) {
        var ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
        var u = URL.createObjectURL(blob), a = h('a', { href: u, download: 'avalia-' + mode + '-' + stamp() + '.' + ext });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      }).catch(function (e) { console.warn('[Avalia CUI] download failed', e); say(w('W8l.failed'), true); })
        .then(function () { b.disabled = false; });
    }
    function fetchSigned(url) {
      if (!opts.isAllowedDownloadUrl(url)) return Promise.reject(err('E_DOWNLOAD_ORIGIN'));
      return fetch(url).then(function (r) { if (!r.ok) throw err('E_DOWNLOAD'); return r.blob(); })
        .then(function (blob) { if (!/^image\/(png|jpeg|webp)$/.test(blob.type)) throw err('E_DOWNLOAD_TYPE'); return blob; });
    }

    // resume(packet): the page's Save/Share "Back" returns to the rail with the same capture.
    function resume(p) {
      if (scrim || vf) return;
      try { validatePacket(p); } catch (e) { return openViewfinder(); }
      host.pause(); S = newState(p); S.beforeUrl = keepUrl(URL.createObjectURL(p.capture.blob));
      openDialog(); openRail();
    }

    return { open: function () { openViewfinder(); }, close: closeAll, isOpen: function () { return !!(vf || scrim); }, resume: resume };
  }

  global.AvaliaCreationUI = { version: '0.1.1-r06_1', mount: mount, validatePacket: validatePacket, markState: markState,
    createWorkerClient: createWorkerClient, w: w, wording: WORDING };
})(window);
