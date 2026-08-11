// Walks the client through every page of the draft site in order, collects comments per section, and assembles them into one report that names the page and its address against every comment.
(function () {
  'use strict';

  var CFG = {
    siteId: 'lawn-ranger-b1',
    siteName: 'The LawnRanger, Variant B',
    // Set endpoint to the Anderson Digital intake Worker URL to make comments arrive live.
    // While it is null the review still works fully and sends as one assembled block.
    endpoint: null,
    emailTo: 'liam@andersondigital.ie',
    // The review journey, in the order the client is walked through it.
    pages: [
      { file: 'index.html', label: 'Home' },
      { file: 'services/artificial-grass.html', label: 'Artificial grass' },
      { file: 'services/paving-patios.html', label: 'Paving, patios and driveways' },
      { file: 'services/garden-makeovers.html', label: 'Garden design and makeovers' },
      { file: 'services/lawn-care.html', label: 'Lawn care and grounds' },
      { file: 'services/fencing-gates.html', label: 'Fencing and gates' },
      { file: 'areas/limerick.html', label: 'Limerick' },
      { file: 'areas/tipperary.html', label: 'Tipperary' },
      { file: 'areas/clare.html', label: 'Clare' },
      { file: 'our-work.html', label: 'Our work, projects and reviews' },
      { file: 'about.html', label: 'About' },
      { file: 'contact.html', label: 'Contact' }
    ]
  };

  var KEY = 'adl-review::' + CFG.siteId;
  var PAGE = window.ADL_REVIEW_PAGE || { file: 'index.html', label: 'Page', prefix: '' };
  var TOTAL = CFG.pages.length;
  var syncTimer = null;

  // ------------------------------------------------------------ page journey helpers
  function idxOf(file) {
    for (var i = 0; i < TOTAL; i++) if (CFG.pages[i].file === file) return i;
    return -1;
  }
  var HERE = idxOf(PAGE.file);
  function labelOf(file) {
    var i = idxOf(file);
    return i > -1 ? CFG.pages[i].label : file;
  }
  // CFG.pages is the single source of truth for page names, so the bar,
  // the page list and the sent report can never disagree.
  if (HERE > -1) PAGE.label = CFG.pages[HERE].label;
  function siteRoot() {
    try { return new URL(PAGE.prefix || './', location.href).href; }
    catch (e) { return location.href; }
  }
  function urlOf(file) { return siteRoot() + file; }

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
    if (!d.pages[file]) d.pages[file] = { label: labelOf(file), status: null, visited: false, comments: {} };
    if (!d.pages[file].comments) d.pages[file].comments = {};
    d.pages[file].label = labelOf(file);
    return d.pages[file];
  }
  function nComments(d, file) { return Object.keys((d.pages[file] || {}).comments || {}).length; }
  function countAll(d) {
    var n = 0;
    CFG.pages.forEach(function (p) { n += nComments(d, p.file); });
    return n;
  }
  function isDone(d, file) {
    var p = d.pages[file];
    return !!(p && (p.status || Object.keys(p.comments || {}).length));
  }
  function pagesDone(d) {
    var n = 0;
    CFG.pages.forEach(function (p) { if (isDone(d, p.file)) n++; });
    return n;
  }

  // ------------------------------------------------------------ live sync
  function payload(d) {
    return {
      siteId: CFG.siteId, siteName: CFG.siteName, siteUrl: siteRoot(),
      reviewer: d.reviewer || '', submittedAt: new Date().toISOString(),
      pagesDone: pagesDone(d), pagesTotal: TOTAL, totalComments: countAll(d),
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

  // ------------------------------------------------------------ the assembled report
  function assemble(d) {
    var L = [];
    L.push('DESIGN COMMENTS, ' + CFG.siteName);
    L.push('Reviewer: ' + (d.reviewer || 'not given'));
    L.push('Sent: ' + new Date().toLocaleString('en-IE'));
    L.push('Site: ' + siteRoot());
    L.push('Pages reviewed: ' + pagesDone(d) + ' of ' + TOTAL);
    L.push('Total comments: ' + countAll(d));

    var missed = CFG.pages.filter(function (p) { return !isDone(d, p.file); });
    if (missed.length) {
      L.push('');
      L.push('Not yet reviewed: ' + missed.map(function (p) { return String(idxOf(p.file) + 1) + '. ' + p.label; }).join(', '));
    }
    L.push('');

    CFG.pages.forEach(function (p, i) {
      var rec = d.pages[p.file];
      if (!rec || !isDone(d, p.file)) return;
      L.push('========================================');
      L.push('PAGE ' + (i + 1) + ' OF ' + TOTAL + ': ' + p.label);
      L.push('Address: ' + urlOf(p.file));
      if (rec.status === 'ok') L.push('Status: happy with this page');
      if (rec.status === 'changes') L.push('Status: changes requested');
      var keys = Object.keys(rec.comments);
      if (!keys.length) L.push('No written comments on this page.');
      keys.forEach(function (k) {
        var c = rec.comments[k];
        L.push('');
        L.push('  Section "' + (c.label || k) + '" on page ' + (i + 1) + ', ' + p.label + ':');
        L.push('  ' + String(c.text || '').replace(/\n/g, '\n  '));
      });
      L.push('');
    });

    L.push('========================================');
    L.push('Collected on the review site. Anderson Digital.');
    return L.join('\n');
  }

  // ------------------------------------------------------------ DOM helper
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
    function close() {
      wrap.remove();
      document.querySelectorAll('section.adl-active').forEach(function (s) { s.classList.remove('adl-active'); });
    }
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
      el('p', { text: 'This is your draft site. There are ' + TOTAL + ' pages. Work through them in order using the Next button at the bottom, and leave a comment on anything you want changed.' }),
      el('p', { class: 'adl-where', text: 'Everything is saved as you go, so you can stop and come back. When you are finished you send the whole lot to Anderson Digital in one go.' }),
      input
    ]), [
      el('button', {
        class: 'adl-b-go', text: 'Start at page 1', onclick: function () {
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
    var existing = rec.comments[secKey];
    if (secNode) secNode.classList.add('adl-active');

    var ta = el('textarea', { class: 'adl-ta', placeholder: 'What would you like changed here? For example the wording, a photo, a colour, the order of things.' });
    ta.value = existing ? existing.text : '';

    var btns = [
      el('button', {
        class: 'adl-b-go', text: 'Save comment', onclick: function () {
          var d2 = load(), r2 = pageRec(d2, PAGE.file);
          var t = ta.value.trim();
          if (t) {
            r2.comments[secKey] = { label: secLabel, text: t, updated: new Date().toISOString() };
            if (r2.status === 'ok') r2.status = 'changes';
          } else delete r2.comments[secKey];
          save(d2); m.close(); paint();
        }
      })
    ];
    if (existing) btns.push(el('button', {
      class: 'adl-b-ghost adl-b-danger', text: 'Delete', onclick: function () {
        var d2 = load(); delete pageRec(d2, PAGE.file).comments[secKey]; save(d2); m.close(); paint();
      }
    }));

    var m = modal('Comment on this section', el('div', {}, [
      el('p', { class: 'adl-where', text: 'Page ' + (HERE + 1) + ' of ' + TOTAL + ', ' + PAGE.label + '  /  ' + secLabel }),
      ta
    ]), btns);
    setTimeout(function () { ta.focus(); }, 100);
  }

  // ------------------------------------------------------------ the page list, the run-down
  function openPageList() {
    var d = load();
    var body = el('div', {});
    body.appendChild(el('div', {
      class: 'adl-prog',
      html: 'Reviewed <b>' + pagesDone(d) + ' of ' + TOTAL + '</b> pages. Tap any page to go to it.'
    }));

    var list = el('div', { class: 'adl-plist' });
    CFG.pages.forEach(function (p, i) {
      var rec = d.pages[p.file] || {};
      var n = nComments(d, p.file);
      var row = el('a', { class: 'adl-prow' + (i === HERE ? ' now' : ''), href: PAGE.prefix + p.file });
      row.appendChild(el('span', { class: 'num', text: String(i + 1) }));
      row.appendChild(el('span', { class: 'nm', text: p.label }));
      if (rec.status === 'ok') row.appendChild(el('span', { class: 'adl-tag ok', text: 'Happy' }));
      else if (n) row.appendChild(el('span', { class: 'adl-tag ch', text: n + (n === 1 ? ' comment' : ' comments') }));
      else if (rec.visited) row.appendChild(el('span', { class: 'adl-tag sn', text: 'Seen' }));
      else row.appendChild(el('span', { class: 'adl-tag no', text: 'Not seen' }));
      if (i === HERE) row.appendChild(el('span', { class: 'adl-tag now', text: 'You are here' }));
      list.appendChild(row);
    });
    body.appendChild(list);

    var m = modal('The ' + TOTAL + ' pages', body, [
      el('button', { class: 'adl-b-go', text: 'Review summary', onclick: function () { m.close(); openSummary(); } })
    ]);
  }

  // ------------------------------------------------------------ summary
  function openSummary() {
    var d = load();
    var body = el('div', {});
    var total = countAll(d);

    body.appendChild(el('div', {
      class: 'adl-prog',
      html: 'You have reviewed <b>' + pagesDone(d) + ' of ' + TOTAL + '</b> pages, with <b>'
        + total + '</b> comment' + (total === 1 ? '' : 's') + ' in total.'
    }));

    var any = false;
    CFG.pages.forEach(function (p, i) {
      var rec = d.pages[p.file];
      if (!rec || !isDone(d, p.file)) return;
      any = true;
      var hd = el('div', { class: 'hd' }, [
        el('span', { class: 'num', text: String(i + 1) }),
        el('span', { text: p.label })
      ]);
      if (rec.status === 'ok') hd.appendChild(el('span', { class: 'adl-tag ok', text: 'Happy' }));
      if (rec.status === 'changes') hd.appendChild(el('span', { class: 'adl-tag ch', text: 'Changes' }));
      hd.appendChild(el('a', { href: PAGE.prefix + p.file, text: 'open page' }));
      var grp = el('div', { class: 'adl-pagegrp' }, [hd]);
      Object.keys(rec.comments).forEach(function (k) {
        var c = rec.comments[k];
        grp.appendChild(el('div', { class: 'adl-cm' }, [
          el('div', { class: 'w', text: 'Page ' + (i + 1) + ', ' + p.label + '  /  ' + (c.label || k) }),
          el('p', { text: c.text }),
          el('button', {
            class: 'del', text: 'remove', onclick: function () {
              var d2 = load(); delete pageRec(d2, p.file).comments[k]; save(d2);
              m.close(); openSummary(); paint();
            }
          })
        ]));
      });
      body.appendChild(grp);
    });
    if (!any) body.appendChild(el('div', { class: 'adl-empty', text: 'No comments yet. Use the Comment buttons on each section as you work through the pages.' }));

    var missed = CFG.pages.filter(function (p) { return !isDone(d, p.file); });
    if (missed.length) {
      body.appendChild(el('p', {
        class: 'adl-note',
        text: 'Still to look at: ' + missed.map(function (p) { return (idxOf(p.file) + 1) + '. ' + p.label; }).join(', ') + '.'
      }));
    }
    body.appendChild(el('p', {
      class: 'adl-note',
      text: CFG.endpoint
        ? 'Your comments are also being sent to Anderson Digital automatically as you save them.'
        : 'When you are ready, send everything in one go with the button below.'
    }));

    var m = modal('Your review so far', body, [
      el('button', { class: 'adl-b-go', text: 'Send to Anderson Digital', onclick: function () { m.close(); openSend(); } }),
      el('button', {
        class: 'adl-b-ghost adl-b-danger', text: 'Start again', onclick: function () {
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
      el('p', { text: 'This is everything you have told us, page by page. Send it whichever way suits you.' }),
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
        text: 'Share', onclick: function () {
          navigator.share({ title: 'Design comments, ' + CFG.siteName, text: text }).catch(function () {});
        }
      }));
    }
    btns.push(el('button', {
      class: 'adl-b-ghost', text: 'Copy', onclick: function (e) {
        var done = function () { e.target.textContent = 'Copied'; setTimeout(function () { e.target.textContent = 'Copy'; }, 1800); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { ta.select(); document.execCommand('copy'); done(); });
        else { ta.select(); document.execCommand('copy'); done(); }
      }
    }));
    btns.push(el('button', {
      class: 'adl-b-ghost', text: 'Email', onclick: function () {
        var subj = 'Design comments, ' + CFG.siteName;
        var short = text.length > 1400 ? text.slice(0, 1400) + '\n\n[continues, full copy in the review site]' : text;
        window.location.href = 'mailto:' + CFG.emailTo + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(short);
      }
    }));
    btns.push(el('button', {
      class: 'adl-b-ghost', text: 'Download', onclick: function () {
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
      var c = rec.comments[b.getAttribute('data-key')];
      b.classList.toggle('has', !!c);
      b.innerHTML = '';
      b.appendChild(el('span', { text: 'Comment' }));
      if (c) b.appendChild(el('span', { class: 'n', text: '1' }));
    });
    var bar = document.querySelector('.adl-bar');
    if (!bar) return;
    var mine = nComments(d, PAGE.file);
    bar.querySelector('.sub').textContent =
      (mine ? mine + ' comment' + (mine === 1 ? '' : 's') + ' here. ' : '')
      + pagesDone(d) + ' of ' + TOTAL + ' pages reviewed';
    var ok = bar.querySelector('.adl-b-ok');
    if (ok) {
      ok.classList.toggle('done', rec.status === 'ok');
      ok.textContent = rec.status === 'ok' ? 'Marked as happy' : 'Happy with this page';
    }
  }

  function build() {
    // mark this page as seen
    var d0 = load();
    pageRec(d0, PAGE.file).visited = true;
    save(d0);

    document.querySelectorAll('section').forEach(function (sec, i) {
      var key = 's' + i, lab = labelFor(sec, i);
      var btn = el('button', { class: 'adl-pin', 'data-key': key, type: 'button' });
      btn.addEventListener('click', function () { askName(function () { openComment(key, lab, sec); }); });
      sec.appendChild(btn);
    });

    var next = HERE > -1 && HERE < TOTAL - 1 ? CFG.pages[HERE + 1] : null;

    var bar = el('div', { class: 'adl-bar adl-rv' }, [
      el('button', {
        class: 'adl-pos', title: 'See all pages',
        onclick: function () { askName(openPageList); },
        html: '<b>Page ' + (HERE + 1) + ' of ' + TOTAL + '</b><span>' + PAGE.label + '</span>'
      }),
      el('span', { class: 'sub', text: '' }),
      el('span', { class: 'spacer' }),
      el('button', {
        class: 'adl-b-ok adl-b-ghost', text: 'Happy with this page', onclick: function () {
          askName(function () {
            var d = load(), r = pageRec(d, PAGE.file);
            r.status = r.status === 'ok' ? null : 'ok';
            save(d); paint();
          });
        }
      }),
      el('button', { class: 'adl-b-primary', text: 'My review', onclick: function () { askName(openSummary); } }),
      next
        ? el('button', {
            class: 'adl-b-go', text: 'Next: ' + next.label,
            onclick: function () { location.href = PAGE.prefix + next.file; }
          })
        : el('button', { class: 'adl-b-go', text: 'Finish and send', onclick: function () { askName(openSend); } }),
      el('button', {
        class: 'adl-b-ghost adl-hide-btn', text: 'Hide', onclick: function () {
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
    document.body.style.paddingBottom = '72px';

    try { if (sessionStorage.getItem(KEY + '::hidden')) document.body.classList.add('adl-hidden'); } catch (e) {}

    paint();
    askName(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
