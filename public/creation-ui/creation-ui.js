/* Avalia Creation UI v0.1: frame a shot over the viewer, take the HandoffPacket, choose Enhance or Reimagine, call the Worker, reveal, download the Worker's marked file. UNTESTED. */
// Contract: ADL-SPEC-UXD-001 (HandoffPacket v1, architecture C). Marking: ADL-SPEC-UXD-006. Copy: Tone Sheet v3 DRAFT
// (2026-10-05); lines tagged DRAFT below are NOT in any sheet and need Marielle's wording and Liam's tick.
// Classic script (not an ES module) so the demo opens from file:// with no server. Exposes window.AvaliaCreationUI.
(function (global) {
  'use strict';

  var MAX_BYTES = 8000000;               // mirrors the Worker's MAX_CANVAS_BYTES; the Worker re-checks and is the authority
  var MIN_BYTES = 1536;                  // below this a PNG is the blank-frame signature (viewer already checks)
  var SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
  // Rules 4 and 5: no session, token, class or price may ride in the packet. Presence is a refusal, not a warning.
  var FORBIDDEN = ['session', 'sessionjwt', 'token', 'access_token', 'jwt', 'class', 'spaceclass', 'price', 'tier', 'credits'];

  var COPY = {
    label: 'AI generated or altered image',                                            // W3, Tone v3 S6
    explain: "This image began as a real capture of this space and was finished with Avalia's AI. We mark every AI-made image, for everyone, so you always know exactly what you are looking at: a real place you can trust, imagined into something new.", // S6 [G]
    explainEnhance: 'Enhance improves the real image of the real room. It never adds or invents. The mark is there so every AI-touched image says so, plainly.', // S6 [G]
    enhance: 'Enhance', reimagine: 'Reimagine',
    enhanceIntro: 'The real room, made its best. Nothing added, nothing invented.',     // S3b [G]
    paneBefore: 'As it is', paneEnhance: 'Enhanced', paneReimagine: 'Reimagined',       // S3
    arrivedEnhance: 'Here it is. The real room, at its best.',                           // S3 [G]
    arrivedReimagine: 'Here it is. Your idea of what this space could be.',              // S3 [G]
    tryAgain: 'Try again', makeChanges: 'Make changes',                                  // S3 action row [G]
    other: 'Other', otherPlaceholder: 'Tell us in your own words',                       // S3a
    reimagineNow: 'Reimagine now',                                                       // S3a ("Happy with this? Reimagine now.")
    failed: 'That one did not come out, and we are sorry about that. Your Credits are already back in your account, nothing spent. Give it another go whenever you are ready.', // 5.1 [G]
    failedFree: function (m) { return 'That one did not come out, and it did not use your free ' + m + '. It is still yours, waiting. Try again whenever you like.'; }, // 5.1 free variant; noun OPEN (F2)
    expired: 'You were away a little while, so we signed you out to keep your account safe. Nothing is lost; everything you made is saved. Sign in and it is all where you left it.', // 5.5 [G]
    offline: 'You seem to be offline just now. The space is not going anywhere; the moment you are back, so are we.', // 5.6 [G]
    topupHead: 'Top up and keep creating', addCredits: 'Add Credits', notNow: 'Not now',  // S4 [G]
    notNowLine: 'No rush at all. Your space, your gallery and everything you made are right here whenever you want them.', // S4 [G]
    backToView: 'Back to view',                                                          // AE-UI1 (built copy)
    captureMiss: 'Capture did not catch a frame. Try once more.',                        // R03 built copy
    // ---- DRAFT lines (no sheet covers them yet) ----
    frameHint: 'Frame your shot, then tap Capture.',
    capture: 'Capture', landscape: 'Landscape', portrait: 'Portrait', close: 'Close',
    chooseHead: 'What would you like to make?',
    reimagineSub: 'Try a new look for this space.',
    saveShare: 'Save or share this view', frameAgain: 'Frame again',
    presetHead: 'Choose a look',
    enhanceNow: 'Enhance now',
    emptyHead: 'Nothing to choose just yet',
    emptyBody: 'Looks for this space are still being prepared, so there is nothing to pick yet. Nothing has been spent.',
    presetsFail: 'Looks for this space did not load just now. Nothing has been spent. Try again.',
    working: 'Working on it. This can take a moment.',
    markHead: 'Nearly there',
    markBody: 'Your image is made and is being finished with its label. Nothing more will be charged. Tap Finish to try again.',
    finish: 'Finish',
    lost: 'We lost the connection before your image came back. Try again; you will not be charged twice.',
    signinHead: 'Sign in to create', signinBody: 'Your view is kept safe while you sign in.', signin: 'Sign in', cont: 'Continue',
    packetBad: 'That view did not come through cleanly. Frame it once more.',
    conflict: 'That idea could not be used. Try putting it another way.',
    download: 'Download',
    notReady: 'This image is not ready to save yet.',
    dlFailed: 'That download did not complete. Tap Download to try again.',
    testBanner: 'TEST MODE: this image is not marked. It cannot be downloaded or shared.',
    freeLeft: function (m) { return '1 free ' + m + ' remaining'; },                    // built copy (R03 wallet line)
    uses: function (n) { return 'Uses ' + n + ' Credits'; }
  };

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
  function uuid() { return (global.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'k' + Date.now() + Math.random().toString(16).slice(2); }
  function stamp() { return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); }

  function hasForbidden(o, depth) {
    if (!o || typeof o !== 'object' || o instanceof Blob || depth > 3) return false;
    return Object.keys(o).some(function (k) { return FORBIDDEN.indexOf(k.toLowerCase()) >= 0 || hasForbidden(o[k], depth + 1); });
  }

  // Intake: every contract rule the UI can check is checked here; a packet that fails is never used.
  function validatePacket(p) {
    if (!p || p.v !== 1) throw err('E_PACKET_VERSION');
    if (hasForbidden(p, 0)) throw err('E_PACKET_FORBIDDEN');
    if (['save', 'enhance', 'reimagine'].indexOf(p.intent) < 0) throw err('E_PACKET_SHAPE', 'intent');
    var c = p.capture || {}, r = c.cropRect || {};
    if (!(c.blob instanceof Blob) || c.mime !== 'image/png' || c.blob.type !== 'image/png') throw err('E_PACKET_SHAPE', 'capture');
    if (c.blob.size < MIN_BYTES) throw err('E_CAPTURE_BLANK');
    if (c.blob.size > MAX_BYTES) throw err('E_CAPTURE_TOO_LARGE');
    // Rule 2, crop at capture: the bytes must be exactly the composed frame, at the composed shape.
    if (!(c.width > 0 && c.height > 0) || c.width !== Math.round(r.w) || c.height !== Math.round(r.h)) throw err('E_CROP_MISMATCH', 'size');
    var a = p.aspect || {}, want = a.ratio === '9:16' ? 9 / 16 : 16 / 9;
    if (['16:9', '9:16'].indexOf(a.ratio) < 0 || Math.abs(c.width / c.height - want) / want > 0.02) throw err('E_CROP_MISMATCH', 'aspect');
    if (!p.space || !SLUG.test(p.space.venue || '') || !SLUG.test(p.space.space || '')) throw err('E_PACKET_SHAPE', 'space');
    return p;
  }

  // SPEC-UXD-006 s1.6: download only when the Worker says strip, C2PA and TrustMark are all on the file.
  // "test" exists only if the Worker (server side, test deployment) sets it; the client cannot grant it.
  function markState(d) {
    var x = d && d.disclosure;
    if (x && typeof x === 'object' && x.strip === true && x.c2pa === true && x.trustmark === true) return 'marked';
    if (d && d.provenance && d.provenance.testOverride === true) return 'test';
    return 'unmarked';
  }

  // Real transport for the live viewer. The demo passes a mock with the same four methods.
  // /presets, /retry-mark and the disclosure fields are NOT built on the Worker yet (see ADL-NOTE-UXD-008).
  function createWorkerClient(cfg) {
    function auth() {
      return cfg.getSession().then(function (s) { if (!s || !s.access_token) throw err('E_NO_SESSION'); return s.access_token; });
    }
    function call(path, init) {
      return fetch(cfg.base + path, init).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
      }, function () { throw err(navigator.onLine === false ? 'E_OFFLINE' : 'E_NETWORK'); });
    }
    function b64(blob) {
      return new Promise(function (ok, no) { var f = new FileReader(); f.onload = function () { ok(f.result); }; f.onerror = no; f.readAsDataURL(blob); });
    }
    function post(path, jwt, body) {
      return call(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt }, body: JSON.stringify(body) });
    }
    return {
      presets: function (space, mode) {
        return call('/presets?venue=' + encodeURIComponent(space.venue) + '&space=' + encodeURIComponent(space.space) + '&mode=' + mode, { method: 'GET' });
      },
      enhance: function (q) {
        return auth().then(function (jwt) {
          // Base64 happens once, here at the network edge, because today's Worker reads JSON (contract rule 1).
          return b64(q.blob).then(function (data) {
            return post('/enhance', jwt, { sessionJwt: jwt, idempotencyKey: q.idempotencyKey, mode: q.mode, presetId: q.presetId,
              userText: q.userText, isFreePath: q.isFreePath, freeFlagKind: q.mode, canvasBase64: data, aspectRatio: q.aspectRatio, spaceId: q.spaceId });
          });
        });
      },
      retryMark: function (genId) { return auth().then(function (jwt) { return post('/retry-mark', jwt, { sessionJwt: jwt, genId: genId }); }); },
      output: function (genId) { return auth().then(function (jwt) { return post('/output', jwt, { sessionJwt: jwt, genId: genId }); }); }
    };
  }

  // opts: { host, worker, isAllowedDownloadUrl(url), returnFocus }
  // host: handoff(intent, frame), pause(), resume(), getSession(), requestSignin(done), openPaywall(info), onSave(packet)
  function mount(opts) {
    var host = opts.host, worker = opts.worker;
    var root = h('div', { class: 'acu-root' });
    document.body.appendChild(root);
    var vf = null, scrim = null, dialog = null, titleEl = null, bodyEl = null, statusEl = null, closeBtn = null;
    var S = null;                                   // per-packet state, dropped on close
    var reduce = global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- Viewfinder (non-modal; the viewer stays navigable) ----------
    function openViewfinder() {
      if (vf) return;
      var orient = 'landscape';
      var masks = [0, 1, 2, 3].map(function () { return h('div', { class: 'acu-mask' }); });
      var frame = h('div', { class: 'acu-frame', 'aria-hidden': 'true' });
      var hint = h('p', { class: 'acu-vf-hint', role: 'status', 'aria-live': 'polite', text: COPY.frameHint });
      var bL = h('button', { class: 'acu-btn', type: 'button', 'aria-pressed': 'true', text: COPY.landscape });
      var bP = h('button', { class: 'acu-btn', type: 'button', 'aria-pressed': 'false', text: COPY.portrait });
      var bC = h('button', { class: 'acu-btn primary', type: 'button', text: COPY.capture });
      var bX = h('button', { class: 'acu-btn', type: 'button', text: COPY.close });
      vf = h('div', { class: 'acu-vf', role: 'region', 'aria-label': COPY.frameHint }, masks.concat([frame, hint, h('div', { class: 'acu-vf-bar' }, [bL, bP, bC, bX])]));
      root.appendChild(vf);
      var rect = null;
      function layout() {
        var vw = innerWidth, vh = innerHeight, ar = orient === 'portrait' ? 9 / 16 : 16 / 9;
        var aw = vw * 0.84, ah = vh * 0.62, fw = aw, fh = fw / ar;
        if (fh > ah) { fh = ah; fw = fh * ar; }
        var x = Math.round((vw - fw) / 2), y = Math.round((vh - fh) / 2.4);
        rect = { x: x, y: y, w: Math.round(fw), h: Math.round(fh) };
        frame.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + rect.w + 'px;height:' + rect.h + 'px';
        masks[0].style.cssText = 'left:0;top:0;width:100%;height:' + y + 'px';
        masks[1].style.cssText = 'left:0;top:' + (y + rect.h) + 'px;width:100%;bottom:0';
        masks[2].style.cssText = 'left:0;top:' + y + 'px;width:' + x + 'px;height:' + rect.h + 'px';
        masks[3].style.cssText = 'left:' + (x + rect.w) + 'px;top:' + y + 'px;right:0;height:' + rect.h + 'px';
      }
      function setOrient(o) { orient = o; bL.setAttribute('aria-pressed', String(o === 'landscape')); bP.setAttribute('aria-pressed', String(o === 'portrait')); layout(); }
      bL.addEventListener('click', function () { setOrient('landscape'); });
      bP.addEventListener('click', function () { setOrient('portrait'); });
      bX.addEventListener('click', closeAll);
      bC.addEventListener('click', function () {
        bC.disabled = true;
        var f = { cssRect: rect, viewport: { w: innerWidth, h: innerHeight }, orientation: orient, ratio: orient === 'portrait' ? '9:16' : '16:9' };
        Promise.resolve(host.handoff('enhance', f)).then(validatePacket).then(function (p) {
          removeViewfinder();
          host.pause();                                  // architecture C: rendering stops while the UI is open
          S = { packet: p, mode: 'enhance', urls: [], beforeUrl: null, key: p.packetId, run: 0, ent: null };
          S.beforeUrl = keepUrl(URL.createObjectURL(p.capture.blob));
          openDialog(); renderChoose();
        }).catch(function (e) {
          console.warn('[Avalia CUI] capture refused:', e && e.code, e);
          hint.textContent = COPY.captureMiss; bC.disabled = false;
        });
      });
      vf.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
      vf._layout = layout; addEventListener('resize', layout);
      layout(); bC.focus();
    }
    function removeViewfinder() { if (!vf) return; removeEventListener('resize', vf._layout); vf.remove(); vf = null; }

    // ---------- Dialog shell: modal, focus-trapped, Esc = back to view ----------
    function openDialog() {
      titleEl = h('h2', { id: 'acu-title', tabindex: '-1' });
      closeBtn = h('button', { class: 'acu-btn', type: 'button', text: COPY.backToView, on: { click: closeAll } });
      bodyEl = h('div', { class: 'acu-body' });
      statusEl = h('p', { class: 'acu-status', role: 'status', 'aria-live': 'polite' });
      dialog = h('div', { class: 'acu-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'acu-title' },
        [h('div', { class: 'acu-head' }, [titleEl, closeBtn]), bodyEl, statusEl]);
      scrim = h('div', { class: 'acu-scrim' }, [dialog]);
      scrim.addEventListener('keydown', trapKeys);
      root.appendChild(scrim);
    }
    function trapKeys(e) {
      if (e.key === 'Escape' && !closeBtn.disabled) { e.preventDefault(); closeAll(); return; }
      if (e.key !== 'Tab') return;
      var f = dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea,[href],[tabindex="0"]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (Array.prototype.indexOf.call(f, document.activeElement) < 0) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function step(title, nodes, busy) {
      titleEl.textContent = title; bodyEl.textContent = ''; statusEl.textContent = ''; statusEl.className = 'acu-status';
      nodes.forEach(function (n) { if (n) bodyEl.appendChild(n); });
      closeBtn.disabled = !!busy;                        // never abandon a paid call half-way
      titleEl.focus();                                   // screen readers hear the new step
    }
    function say(text, isErr) { statusEl.textContent = text; statusEl.className = 'acu-status' + (isErr ? ' err' : ''); }
    function btn(text, fn, primary) { return h('button', { class: 'acu-btn' + (primary ? ' primary' : ''), type: 'button', text: text, on: { click: fn } }); }
    function keepUrl(u) { S.urls.push(u); return u; }
    function modeName(m) { return m === 'reimagine' ? COPY.reimagine : COPY.enhance; }

    function closeAll() {
      removeViewfinder();
      if (S) S.urls.forEach(function (u) { if (u.indexOf('blob:') === 0) URL.revokeObjectURL(u); });
      var wasOpen = !!scrim;
      if (scrim) { scrim.remove(); scrim = null; }
      S = null;
      if (wasOpen) host.resume();
      if (opts.returnFocus) opts.returnFocus.focus();
    }

    // ---------- Steps ----------
    function renderChoose() {
      var thumb = h('img', { class: 'acu-thumb', src: S.beforeUrl, alt: COPY.paneBefore });
      var e = h('button', { class: 'acu-btn', type: 'button', on: { click: function () { pickMode('enhance'); } } }, [COPY.enhance, h('small', { text: COPY.enhanceIntro })]);
      var r = h('button', { class: 'acu-btn', type: 'button', on: { click: function () { pickMode('reimagine'); } } }, [COPY.reimagine, h('small', { text: COPY.reimagineSub })]);
      var row = h('div', { class: 'acu-row' }, [
        host.onSave ? btn(COPY.saveShare, function () { var p = S.packet; closeAll(); host.onSave(p); }) : null,
        btn(COPY.frameAgain, function () { closeAll(); openViewfinder(); })]);
      step(COPY.chooseHead, [thumb, h('div', { class: 'acu-choice' }, [e, r]), row]);
    }
    function pickMode(m) { S.mode = m; renderPresets(); }

    function renderPresets(note) {
      step(COPY.presetHead, []); say(COPY.working);
      Promise.resolve(worker.presets(S.packet.space, S.mode)).then(function (res) {
        if (!S) return;
        if (!res.ok) throw err(res.status === 0 ? 'E_NETWORK' : 'E_PRESETS');
        var d = res.data || {};
        S.ent = d.entitlements || null; S.price = d.prices ? d.prices[S.mode] : null;
        var list = (d.presets || []).filter(function (p) { return p && p.active === true && String(p.mode).toLowerCase() === S.mode; });
        if (!list.length) return renderEmpty();
        var fs = h('fieldset', { class: 'acu-fs' }, [h('legend', { text: modeName(S.mode) })]);
        var other = null;
        list.forEach(function (p, i) {
          fs.appendChild(h('label', { class: 'acu-opt' }, [h('input', { type: 'radio', name: 'acu-preset', value: p.id, checked: i === 0 }), p.label]));
        });
        if (S.mode === 'reimagine') {
          fs.appendChild(h('label', { class: 'acu-opt' }, [h('input', { type: 'radio', name: 'acu-preset', value: '' }), COPY.other]));
          other = h('textarea', { class: 'acu-text', 'aria-label': COPY.other, placeholder: COPY.otherPlaceholder, maxlength: '300' });
          fs.appendChild(other);
        }
        var free = S.ent && S.ent[S.mode] === true;
        var price = h('p', { class: 'acu-price', text: free ? COPY.freeLeft(modeName(S.mode)) : (S.price != null ? COPY.uses(S.price) : '') });   // the figure comes from the Worker, never this file
        var go = btn(S.mode === 'reimagine' ? COPY.reimagineNow : COPY.enhanceNow, function () {
          var sel = fs.querySelector('input[name="acu-preset"]:checked');
          S.sel = { presetId: sel ? sel.value : '', userText: other ? other.value.trim() : '' };
          generate(false);
        }, true);
        step(COPY.presetHead, [S.mode === 'enhance' ? h('p', { text: COPY.enhanceIntro }) : null, fs, price,
          h('div', { class: 'acu-row' }, [go, btn('Back', renderChoose)])]);
        if (typeof note === 'string') say(note, true);
      }).catch(function (e) { failState(e.code === 'E_OFFLINE' ? e : err('E_PRESETS')); });
    }
    function renderEmpty() {
      step(COPY.emptyHead, [h('p', { text: COPY.emptyBody }), h('div', { class: 'acu-row' }, [btn('Back', renderChoose), btn(COPY.backToView, closeAll, true)])]);
    }

    // sameKey=true only after a lost connection, so the Worker dedupes instead of charging twice.
    function generate(sameKey) {
      if (!sameKey) S.key = S.run++ === 0 ? S.packet.packetId : uuid();
      step(modeName(S.mode), [h('img', { class: 'acu-thumb', src: S.beforeUrl, alt: COPY.paneBefore })], true);
      say(COPY.working);
      var free = !!(S.ent && S.ent[S.mode] === true);
      Promise.resolve(host.getSession()).then(function (s) {
        if (!s) throw err('E_NO_SESSION');
        return worker.enhance({ blob: S.packet.capture.blob, idempotencyKey: S.key, mode: S.mode, presetId: S.sel.presetId,
          userText: S.sel.userText, isFreePath: free, aspectRatio: S.packet.aspect.ratio, spaceId: S.packet.space.spaceId });
      }).then(function (res) { handleReply(res, free); }).catch(function (e) { failState(e, free); });
    }
    function handleReply(res, free) {
      if (!S) return;
      var d = res.data || {};
      if (res.status === 401) return failState(err('E_AUTH_EXPIRED'), free);
      if (d.error === 'E_NO_ACTIVE_PRESETS') return renderEmpty();                  // T4: Worker refuses, nothing spent
      if (d.paused || d.error === 'insufficient_credits') return renderPaywall(d.reason || d.error);
      if (d.error === 'MARK_FAILED' && d.genId) return renderMarkRetry(d.genId);
      if (d.conflict) return renderPresets(COPY.conflict);
      if (res.ok && d.after) {
        var m = markState(d);
        if (m === 'unmarked') { console.warn('[Avalia CUI] E_PROVENANCE_MISSING: result withheld', d.genId); return failState(err('E_PROVENANCE_MISSING'), free); }
        if (free && S.ent) S.ent[S.mode] = false;          // display only; the Worker holds the real flag
        return renderReveal(d, m);
      }
      console.warn('[Avalia CUI] generation failed', res.status, d);
      failState(err(d.error || 'E_GENERATION'), free);
    }

    function renderMarkRetry(genId) {
      step(COPY.markHead, [h('p', { text: COPY.markBody }), h('div', { class: 'acu-row' }, [btn(COPY.finish, function () {
        step(COPY.markHead, [], true); say(COPY.working);
        Promise.resolve(worker.retryMark(genId)).then(function (res) { handleReply(res, false); }).catch(function (e) { failState(e); });
      }, true)])]);
    }

    function renderPaywall(reason) {
      step(COPY.topupHead, [h('div', { class: 'acu-row' }, [
        btn(COPY.addCredits, function () { host.openPaywall({ reason: reason, mode: S.mode, spaceId: S.packet.space.spaceId }); }, true),
        btn(COPY.notNow, function () { renderChoose(); say(COPY.notNowLine); })])]);
    }

    function renderSignin() {
      step(COPY.signinHead, [h('p', { text: COPY.signinBody }), h('div', { class: 'acu-row' }, [btn(COPY.signin, function () {
        scrim.hidden = true;                             // the viewer's own sign-in sheet takes the screen
        host.requestSignin(function () { if (!scrim) return; scrim.hidden = false; titleEl.focus(); });
      }, true), btn(COPY.cont, function () { generate(false); })])]);
    }

    function failState(e, free) {
      if (!S) return;
      var code = e && e.code;
      if (code === 'E_NO_SESSION') return renderSignin();
      var map = { E_OFFLINE: COPY.offline, E_NETWORK: COPY.lost, E_AUTH_EXPIRED: COPY.expired, E_PRESETS: COPY.presetsFail };
      var text = map[code] || (free ? COPY.failedFree(modeName(S.mode)) : COPY.failed);
      var lost = code === 'E_NETWORK' || code === 'E_OFFLINE';
      var again = btn(COPY.tryAgain, function () { !S.sel || code === 'E_PRESETS' ? renderPresets() : generate(lost); }, true);
      step(modeName(S.mode), [h('p', { class: 'acu-err', text: text }), h('div', { class: 'acu-row' }, [
        code === 'E_AUTH_EXPIRED' ? btn(COPY.signin, renderSignin, true) : again, btn(COPY.backToView, closeAll)])]);
    }

    function renderReveal(d, mark) {
      var after = COPY[S.mode === 'reimagine' ? 'paneReimagine' : 'paneEnhance'];
      var clip = h('div', { class: 'acu-before', style: 'clip-path:inset(0 50% 0 0)' }, [h('img', { src: S.beforeUrl, alt: '' })]);
      var exp = h('p', { id: 'acu-exp', hidden: true, text: S.mode === 'enhance' ? COPY.explainEnhance : COPY.explain });
      var label = h('button', { class: 'acu-label', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'acu-exp', text: COPY.label });
      label.addEventListener('click', function () { var o = exp.hidden; exp.hidden = !o; label.setAttribute('aria-expanded', String(o)); });
      var cmp = h('div', { class: 'acu-compare' }, [
        h('img', { src: d.after, alt: COPY.label + '. ' + after + ' result.' }), clip,
        h('span', { class: 'acu-pane l', 'aria-hidden': 'true', text: COPY.paneBefore }),
        h('span', { class: 'acu-pane r', 'aria-hidden': 'true', text: after }), label]);
      var range = h('input', { class: 'acu-range', type: 'range', min: '0', max: '100', value: '50', 'aria-label': 'Compare ' + COPY.paneBefore + ' and ' + after });
      range.addEventListener('input', function () {
        clip.style.clipPath = 'inset(0 ' + (100 - range.value) + '% 0 0)';
        range.setAttribute('aria-valuetext', range.value + ' percent ' + COPY.paneBefore);
      });
      var dl = btn(COPY.download, function () { download(d, mark, dl); }, true);
      if (mark !== 'marked') dl.disabled = true;
      var wrap = h('div', { class: 'acu-reveal' + (reduce ? ' in' : '') }, [cmp, range,
        mark === 'test' ? h('p', { class: 'acu-test', role: 'note', text: COPY.testBanner }) : null, exp,
        h('div', { class: 'acu-row' }, [dl, btn(COPY.tryAgain, function () { generate(false); }), btn(COPY.makeChanges, renderPresets)])]);
      step(S.mode === 'reimagine' ? COPY.arrivedReimagine : COPY.arrivedEnhance, [wrap]);
      if (!reduce) requestAnimationFrame(function () { wrap.classList.add('in'); });   // arrives, never pops
    }

    // Saves the Worker's signed file byte for byte. Never a canvas, never a re-encode (a re-encode drops C2PA).
    function download(d, mark, b) {
      if (mark !== 'marked') return say(COPY.notReady, true);
      b.disabled = true;
      var mode = S.mode;
      fetchSigned(d.after).catch(function () {
        // The presigned link lives about 120 s; ask the Worker for a fresh one once, then give up honestly.
        return Promise.resolve(worker.output(d.genId)).then(function (res) {
          if (!res.ok || !res.data || !res.data.after || markState(res.data) !== 'marked') throw err('E_DOWNLOAD');
          d.after = res.data.after; return fetchSigned(d.after);
        });
      }).then(function (blob) {
        var ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
        var u = URL.createObjectURL(blob), a = h('a', { href: u, download: 'avalia-' + mode + '-' + stamp() + '.' + ext });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      }).catch(function (e) { console.warn('[Avalia CUI] download failed', e); say(COPY.dlFailed, true); })
        .then(function () { b.disabled = false; });
    }
    function fetchSigned(url) {
      if (!opts.isAllowedDownloadUrl(url)) return Promise.reject(err('E_DOWNLOAD_ORIGIN'));
      return fetch(url).then(function (r) {
        if (!r.ok) throw err('E_DOWNLOAD');
        return r.blob();
      }).then(function (blob) { if (!/^image\/(png|jpeg|webp)$/.test(blob.type)) throw err('E_DOWNLOAD_TYPE'); return blob; });
    }

    return { open: openViewfinder, close: closeAll, isOpen: function () { return !!(vf || scrim); } };
  }

  global.AvaliaCreationUI = { version: '0.1.0', mount: mount, validatePacket: validatePacket, markState: markState, createWorkerClient: createWorkerClient };
})(window);
