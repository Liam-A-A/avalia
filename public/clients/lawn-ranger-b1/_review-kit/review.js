// Collects the client's design comments per page and per section, keeps them on the device, and sends them to Anderson Digital either live to an endpoint or as one assembled block.
(function () {
  'use strict';

  var CFG = {
    siteId: 'lawn-ranger-b1',
    siteName: 'The LawnRanger, Variant B',
    // Set ENDPOINT to the Anderson Digital intake Worker URL to make comments arrive live.
    // While it is null the review still works fully and sends as one assembled block.
    endpoint: null,
    emailTo: 'liam@andersondigital.ie',
    pages: [
      'index.html', 'about.html', 'contact.html', 'projects.html', 'reviews.html',
      'services/artificial-grass.html', 'services/paving-patios.html',
      'services/garden-makeovers.html', 'services/lawn-care.html', 'services/fencing-gates.html',
      'areas/limerick.html', 'areas/tipperary.html', 'areas/clare.html'
    ]
  };

  var KEY = 'adl-review::' + CFG.siteId;
  var PAGE = window.ADL_REVIEW_PAGE || { file: 'index.html', label: 'Page', prefix: '' };
  var syncTimer = null;

  // ------------------------------------------------------------ storage
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (!d.pages) d.pages = {};
      return d;
    } catch (e) { return { pages: {} }; }
  }
  function save(d) {
    d.updated = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    queueSync();
  }
  function pageRec(d, file) {
    if (!d.pages[file]) d.pages[file] = { label: '', status: null, comments: {} };
    if (!d.pages[file].comments) d.pages[file].comments = {};
    return d.pages[file];
  }
  function countAll(d) {
    var n = 0;
    for (var f in d.pages) n += Object.keys(d.pages[f].comments || {}).length;
    return n;
  }
  function countPage(d) { return Object.keys(pageRec(d, PAGE.file).comments).length; }
  function pagesTouched(d) {
    var n = 0;
    for (var f in d.pages) {
      var p = d.pages[f];
      if (p.status || Object.keys(p.comments || {}).length) n++;
    }
    return n;
  }

  // ------------------------------------------------------------ live sync
  function payload(d) {
    return {
      siteId: CFG.siteId, siteName: CFG.siteName,
      reviewer: d.reviewer || '', submittedAt: new Date().toISOString(),
      userAgent: navigator.userAgent, data: d
    };
  }
  function queueSync() {
    if (!CFG.endpoint) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { pushNow(function () {}); }, 1500);
  }
  function pushNow(cb) {
    if (!CFG.endpoint) { cb(false, 'no endpoint'); return; }
    try {
      fetch(CFG.endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload(load()))
      }).then(function (r) { cb(r.ok, r.ok ? '' : 'HTTP ' + r.status); })
        .catch(function (e) { cb(false, String(e.message || e)); });
    } catch (e) { cb(false, String(e)); }
  }

  // ------------------------------------------------------------ assembling the report
  function assemble(d) {
    var L = [];
    L.push('DESIGN COMMENTS, ' + CFG.siteName);
    L.push('Reviewer: ' + (d.reviewer || 'not given'));
    L.push('Sent: ' + new Date().toLocaleString('en-IE'));
    L.push('Pages with feedback: ' + pagesTouched(d) + ' of ' + CFG.pages.length);
    L.push('Total comments: ' + countAll(d));
    L.push('');
    CFG.pages.forEach(function (f) {
      var p = d.pages[f];
      if (!p || (!p.status && !Object.keys(p.comments || {}).length)) return;
      L.push('----------------------------------------');
      L.push((p.label || f) + '  [' + f + ']');
      if (p.status === 'ok') L.push('Status: happy with this page');
      if (p.status === 'changes') L.push('Status: changes requested');
      var keys = Object.keys(p.comments);
      if (!keys.length) L.push('(no written comments)');
      keys.forEach(function (k) {
        var c = p.comments[k];
        L.push('');
        L.push('  ' + (c.label || k) + ':');
        L.push('  ' + String(c.text || '').replace(/\n/g, '\n  '));
      });
      L.push('');
    });
    L.push('----------------------------------------');
    L.push('Collected on the review site. Anderson Digital.');
    return L.join('\n');
  }

  // ------------------------------------------------------------ small DOM helper
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function modal(title, bodyNode, footerBtns) {
    var sheet = el('div', { class: 'adl-sheet' }, [
      el('header', {}, [el('h3', { text: title }), el('button', { class: 'x', 'aria-label': 'Close', onclick: close }, [])]),
      el('div', { class: 'adl-body' }, [bodyNode]),
      el('footer', {}, footerBtns)
    ]);
    var wrap = el('div', { class: 'adl-modal adl-rv', onclick: function (e) { if (e.target === wrap) close(); } }, [sheet]);
    function close() { wrap.remove(); document.querySelectorAll('section.adl-active').forEach(function (s) { s.classList.remove('adl-active'); }); }
    wrap.close = close;
    document.body.appendChild(wrap);
    return wrap;
  }

  // ------------------------------------------------------------ reviewer name
  function askName(then) {
    var d = load();
    if (d.reviewer) { then(); return; }
    var input = el('input', { type: 'text', class: 'adl-ta', style: 'min-height:0;height:44px', placeholder: 'Your name' });
    var m = modal('Welcome to your website review', el('div', {}, [
      el('p', { text: 'This is your draft site. On every page you can leave comments on any part you want changed, then send them all to Anderson Digital in one go.' }),
      el('p', { class: 'adl-where', text: 'Your comments are saved on this device as you go, so you can stop and come back.' }),
      input
    ]), [
      el('button', {
        class: 'adl-b-go', text: 'Start reviewing', onclick: function () {
          var d2 = load(); d2.reviewer = input.value.trim() || 'Client'; d2.started = new Date().toISOString(); save(d2);
          m.close(); then();
        }
      })
    ]);
    setTimeout(function () { input.focus(); }, 100);
  }

  // ------------------------------------------------------------ comment editor
  function openComment(secKey, secLabel, secNode) {
    var d = load();
    var rec = pageRec(d, PAGE.file);
    rec.label = PAGE.label;
    var existing = rec.comments[secKey];
    if (secNode) secNode.classList.add('adl-active');

    var ta = el('textarea', { class: 'adl-ta', placeholder: 'What would you like changed here? For example the wording, a photo, a colour, an order of things.' });
    ta.value = existing ? existing.text : '';

    var btns = [
      el('button', {
        class: 'adl-b-go', text: 'Save comment', onclick: function () {
          var d2 = load(), r2 = pageRec(d2, PAGE.file);
          r2.label = PAGE.label;
          var t = ta.value.trim();
          if (t) { r2.comments[secKey] = { label: secLabel, text: t, updated: new Date().toISOString() }; if (r2.status === 'ok') r2.status = 'changes'; }
          else delete r2.comments[secKey];
          save(d2); m.close(); paint();
        }
      })
    ];
    if (existing) btns.push(el('button', {
      class: 'adl-b-ghost', style: 'border:1.5px solid #d7dee6;color:#a03030;background:#fff', text: 'Delete', onclick: function () {
        var d2 = load(); delete pageRec(d2, PAGE.file).comments[secKey]; save(d2); m.close(); paint();
      }
    }));

    var m = modal('Comment on this section', el('div', {}, [
      el('p', { class: 'adl-where', text: PAGE.label + '  /  ' + secLabel }),
      ta
    ]), btns);
    setTimeout(function () { ta.focus(); }, 100);
  }

  // ------------------------------------------------------------ summary
  function openSummary() {
    var d = load();
    var body = el('div', {});

    var total = countAll(d);
    body.appendChild(el('div', {
      class: 'adl-prog',
      html: 'You have given feedback on <b>' + pagesTouched(d) + ' of ' + CFG.pages.length + '</b> pages, with <b>'
        + total + '</b> comment' + (total === 1 ? '' : 's') + ' in total.'
    }));

    var any = false;
    CFG.pages.forEach(function (f) {
      var p = d.pages[f];
      if (!p || (!p.status && !Object.keys(p.comments || {}).length)) return;
      any = true;
      var hd = el('div', { class: 'hd' }, [el('span', { text: p.label || f })]);
      if (p.status === 'ok') hd.appendChild(el('span', { class: 'adl-tag ok', text: 'Happy' }));
      if (p.status === 'changes') hd.appendChild(el('span', { class: 'adl-tag ch', text: 'Changes' }));
      hd.appendChild(el('a', { href: PAGE.prefix + f, text: 'open page' }));
      var grp = el('div', { class: 'adl-pagegrp' }, [hd]);
      Object.keys(p.comments).forEach(function (k) {
        var c = p.comments[k];
        grp.appendChild(el('div', { class: 'adl-cm' }, [
          el('div', { class: 'w', text: c.label || k }),
          el('p', { text: c.text }),
          el('button', {
            class: 'del', text: 'remove', onclick: function () {
              var d2 = load(); delete pageRec(d2, f).comments[k]; save(d2);
              m.close(); openSummary(); paint();
            }
          })
        ]));
      });
      body.appendChild(grp);
    });
    if (!any) body.appendChild(el('div', { class: 'adl-empty', text: 'No comments yet. Use the Comment buttons on each section as you go through the pages.' }));

    body.appendChild(el('p', {
      class: 'adl-note',
      text: CFG.endpoint
        ? 'Your comments are also being sent to Anderson Digital automatically as you save them.'
        : 'When you are ready, send everything in one go with the button below.'
    }));

    var m = modal('Your review so far', body, [
      el('button', { class: 'adl-b-go', text: 'Send to Anderson Digital', onclick: function () { m.close(); openSend(); } }),
      el('button', {
        class: 'adl-b-ghost', style: 'border:1.5px solid #d7dee6;color:#1F2933;background:#fff', text: 'Start again', onclick: function () {
          if (!confirm('This clears every comment you have made. Are you sure?')) return;
          var r = load().reviewer;
          localStorage.setItem(KEY, JSON.stringify({ reviewer: r, pages: {} }));
          m.close(); paint();
        }
      })
    ]);
  }

  // ------------------------------------------------------------ send
  function openSend() {
    var d = load();
    var text = assemble(d);
    var status = el('div', {});
    var ta = el('textarea', { class: 'adl-ta', style: 'min-height:200px;font-size:13px', readonly: 'readonly' });
    ta.value = text;

    var body = el('div', {}, [
      el('p', { text: 'This is everything you have told us. Send it whichever way suits you.' }),
      status, ta
    ]);

    var btns = [];

    if (CFG.endpoint) {
      btns.push(el('button', {
        class: 'adl-b-go', text: 'Send now', onclick: function (e) {
          e.target.textContent = 'Sending...';
          pushNow(function (ok, err) {
            status.innerHTML = '';
            status.appendChild(el('div', {
              class: 'adl-sent',
              text: ok ? 'Sent to Anderson Digital. Thank you.' : 'Could not send automatically (' + err + '). Please use Share or Copy below.'
            }));
            e.target.textContent = ok ? 'Sent' : 'Try again';
          });
        }
      }));
    }

    if (navigator.share) {
      btns.push(el('button', {
        class: CFG.endpoint ? 'adl-b-ghost' : 'adl-b-go',
        style: CFG.endpoint ? 'border:1.5px solid #d7dee6;color:#1F2933;background:#fff' : '',
        text: 'Share', onclick: function () {
          navigator.share({ title: 'Design comments, ' + CFG.siteName, text: text }).catch(function () {});
        }
      }));
    }

    btns.push(el('button', {
      class: 'adl-b-ghost', style: 'border:1.5px solid #d7dee6;color:#1F2933;background:#fff',
      text: 'Copy', onclick: function (e) {
        var done = function () { e.target.textContent = 'Copied'; setTimeout(function () { e.target.textContent = 'Copy'; }, 1800); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { ta.select(); document.execCommand('copy'); done(); });
        else { ta.select(); document.execCommand('copy'); done(); }
      }
    }));

    btns.push(el('button', {
      class: 'adl-b-ghost', style: 'border:1.5px solid #d7dee6;color:#1F2933;background:#fff',
      text: 'Email', onclick: function () {
        var subj = 'Design comments, ' + CFG.siteName;
        var short = text.length > 1400 ? text.slice(0, 1400) + '\n\n[continues, full copy in the review site]' : text;
        window.location.href = 'mailto:' + CFG.emailTo + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(short);
      }
    }));

    btns.push(el('button', {
      class: 'adl-b-ghost', style: 'border:1.5px solid #d7dee6;color:#1F2933;background:#fff',
      text: 'Download', onclick: function () {
        var blob = new Blob([text], { type: 'text/plain' });
        var a = el('a', { href: URL.createObjectURL(blob), download: CFG.siteId + '-design-comments.txt' });
        document.body.appendChild(a); a.click(); a.remove();
      }
    }));

    modal('Send your comments', body, btns);
  }

  // ------------------------------------------------------------ pins
  function labelFor(sec, i) {
    var h = sec.querySelector('h1, h2');
    if (h) return h.textContent.replace(/\s+/g, ' ').trim().slice(0, 70);
    if (sec.classList.contains('hero')) return 'Top banner';
    if (sec.querySelector('form')) return 'Enquiry form';
    return 'Section ' + (i + 1);
  }

  function paint() {
    var d = load();
    var rec = pageRec(d, PAGE.file);
    document.querySelectorAll('.adl-pin').forEach(function (b) {
      var k = b.getAttribute('data-key');
      var c = rec.comments[k];
      b.classList.toggle('has', !!c);
      b.innerHTML = '';
      b.appendChild(el('span', { text: c ? 'Comment' : 'Comment' }));
      if (c) b.appendChild(el('span', { class: 'n', text: '1' }));
    });
    var bar = document.querySelector('.adl-bar');
    if (bar) {
      bar.querySelector('.sub').textContent =
        countPage(d) + ' comment' + (countPage(d) === 1 ? '' : 's') + ' on this page, '
        + countAll(d) + ' in total across ' + pagesTouched(d) + ' of ' + CFG.pages.length + ' pages';
      var ok = bar.querySelector('.adl-b-ok');
      if (ok) {
        ok.classList.toggle('done', rec.status === 'ok');
        ok.textContent = rec.status === 'ok' ? 'Marked as happy' : 'I am happy with this page';
      }
    }
  }

  function build() {
    var secs = Array.prototype.slice.call(document.querySelectorAll('section'));
    secs.forEach(function (sec, i) {
      var key = 's' + i;
      var lab = labelFor(sec, i);
      var btn = el('button', { class: 'adl-pin', 'data-key': key, type: 'button' });
      btn.addEventListener('click', function () { askName(function () { openComment(key, lab, sec); }); });
      sec.appendChild(btn);
    });

    var bar = el('div', { class: 'adl-bar adl-rv' }, [
      el('span', { class: 'lbl', text: 'Design comments' }),
      el('span', { class: 'sub', text: '' }),
      el('span', { class: 'spacer' }),
      el('button', {
        class: 'adl-b-ok adl-b-ghost', text: 'I am happy with this page', onclick: function () {
          askName(function () {
            var d = load(), r = pageRec(d, PAGE.file);
            r.label = PAGE.label;
            r.status = r.status === 'ok' ? null : 'ok';
            save(d); paint();
          });
        }
      }),
      el('button', { class: 'adl-b-primary', text: 'My review', onclick: function () { askName(openSummary); } }),
      el('button', {
        class: 'adl-b-ghost', text: 'Hide', onclick: function () {
          document.body.classList.add('adl-hidden');
          try { sessionStorage.setItem(KEY + '::hidden', '1'); } catch (e) {}
        }
      }),
      el('button', {
        class: 'adl-show adl-b-primary', text: 'Show design comments', onclick: function () {
          document.body.classList.remove('adl-hidden');
          try { sessionStorage.removeItem(KEY + '::hidden'); } catch (e) {}
        }
      })
    ]);
    document.body.appendChild(bar);
    document.body.style.paddingBottom = '64px';

    try { if (sessionStorage.getItem(KEY + '::hidden')) document.body.classList.add('adl-hidden'); } catch (e) {}

    paint();
    askName(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
