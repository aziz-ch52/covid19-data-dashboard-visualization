/* ==================================================================
   COVID-19 DASHBOARD - EVENTS & INITIALIZATION (events.js)
   Handles DOM events, scrolling, and application bootstrap.
   MUST BE LOADED LAST IN YOUR HTML.
   ================================================================== */

(function (App) {
  'use strict';

  // Destructure utilities and state from the global App object
  const { $, $$, state } = App;

  function onScroll() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const rail = $('scrollRail');
    if (rail) rail.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + '%';
  }

  function observeSections() {
    const links = $$('[data-nav]');
    const sections = $$('main section[id]');
    if (!sections.length) return;

    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach(function (el) {
        el.classList.add('in');
      });
      return;
    }

    const navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute('id');
          links.forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + id);
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );
    sections.forEach(function (s) {
      navObserver.observe(s);
    });

    const revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.04 },
    );
    $$('.reveal').forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  function bindEvents() {
    const zone = $('dropZone');
    const input = $('fileInput');

    if (zone && input) {
      zone.addEventListener('click', function () {
        input.click();
      });
      zone.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          input.click();
        }
      });
      ['dragenter', 'dragover'].forEach(function (evt) {
        zone.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          zone.classList.add('dragging');
        });
      });
      ['dragleave', 'dragend'].forEach(function (evt) {
        zone.addEventListener(evt, function (e) {
          e.preventDefault();
          e.stopPropagation();
          zone.classList.remove('dragging');
        });
      });
      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('dragging');
        const files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length) App.handleFile(files[0]);
      });
      input.addEventListener('change', function (e) {
        const f = e.target.files && e.target.files[0];
        App.handleFile(f);
        e.target.value = ''; // allow re-selecting the same file
      });
    }

    ['dragover', 'drop'].forEach(function (evt) {
      window.addEventListener(evt, function (e) {
        e.preventDefault();
      });
    });

    const browseBtn = $('browseBtn');
    if (browseBtn && input) {
      browseBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        input.click();
      });
    }

    const demoBtn = $('loadDemoBtn');
    if (demoBtn) {
      demoBtn.addEventListener('click', function () {
        const rep = App.loadDefaultDataset(
          false,
          'Embedded demo dataset (36 States & UTs · 2020–2022)',
        );
        App.toast(
          'Demo dataset loaded',
          'success',
          App.fmtInt(rep.counts.accepted) + ' records · filters kept where still valid.',
        );
      });
    }

    const resetBtn = $('resetDefaultBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        state.vaxView = 'year';
        state.compare.logScale = true;
        state.table.perPage = 10;
        App.loadDefaultDataset(true, 'Embedded baseline dataset (36 States & UTs · 2020–2022)');
        App.toast(
          'Reset to the default dataset',
          'info',
          'Filters, sorting, paging and charts are back to their initial state.',
        );
      });
    }

    ['downloadTemplateBtn', 'downloadTemplateBtn2'].forEach(function (id) {
      const el = $(id);
      if (el) el.addEventListener('click', App.downloadTemplate);
    });

    const vToggle = $('validationToggle');
    if (vToggle) {
      vToggle.addEventListener('click', function () {
        const wrap = $('validationWrap');
        if (wrap) wrap.classList.toggle('open');
      });
    }

    const yearSel = $('filterYear');
    if (yearSel)
      yearSel.addEventListener('change', function (e) {
        App.setFilter('year', e.target.value);
      });

    const stateSel = $('filterState');
    if (stateSel)
      stateSel.addEventListener('change', function (e) {
        App.setFilter('state', e.target.value);
      });

    const metricSel = $('filterMetric');
    if (metricSel)
      metricSel.addEventListener('change', function (e) {
        App.setFilter('metric', e.target.value);
      });

    const resetF = $('resetFiltersBtn');
    if (resetF) resetF.addEventListener('click', App.resetFilters);

    const emptyReset = $('tableEmptyReset');
    if (emptyReset) emptyReset.addEventListener('click', App.resetFilters);

    const vaxBtn = $('vaxViewBtn');
    if (vaxBtn) {
      vaxBtn.addEventListener('click', function () {
        state.vaxView = state.vaxView === 'year' ? 'state' : 'year';
        App.renderVaccination();
      });
    }

    $$('.chart-dl').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const key = btn.getAttribute('data-chart');
        App.ChartManager.downloadPNG(key, 'covid-' + key + '.png');
      });
    });

    const ddClear = $('ddClearBtn');
    if (ddClear) {
      ddClear.addEventListener('click', function () {
        App.setFilter('state', 'all');
      });
    }

    const cmpA = $('compareA');
    if (cmpA)
      cmpA.addEventListener('change', function (e) {
        state.compare.a = e.target.value;
        App.renderComparison();
      });

    const cmpB = $('compareB');
    if (cmpB)
      cmpB.addEventListener('change', function (e) {
        state.compare.b = e.target.value;
        App.renderComparison();
      });

    const swap = $('swapCompareBtn');
    if (swap) {
      swap.addEventListener('click', function () {
        const a = state.compare.a;
        state.compare.a = state.compare.b;
        state.compare.b = a;
        App.renderComparison();
      });
    }

    const scaleBtn = $('compareScaleBtn');
    if (scaleBtn) {
      scaleBtn.addEventListener('click', function () {
        state.compare.logScale = !state.compare.logScale;
        App.renderComparison();
      });
    }

    const search = $('tableSearch');
    if (search) {
      search.addEventListener(
        'input',
        App.debounce(function (e) {
          state.table.search = e.target.value;
          state.table.page = 1;
          App.TableManager.render();
        }, 180),
      );
    }

    const rowsSel = $('rowsPerPage');
    if (rowsSel) {
      rowsSel.addEventListener('change', function (e) {
        state.table.perPage = parseInt(e.target.value, 10) || 10;
        state.table.page = 1;
        App.TableManager.render();
      });
    }

    const prev = $('prevPage');
    if (prev) {
      prev.addEventListener('click', function () {
        if (state.table.page > 1) {
          state.table.page--;
          App.TableManager.render();
        }
      });
    }

    const next = $('nextPage');
    if (next) {
      next.addEventListener('click', function () {
        state.table.page++;
        App.TableManager.render();
      });
    }

    $$('#dataTable thead th').forEach(function (th) {
      const key = th.getAttribute('data-sort');
      if (!key) return;
      th.setAttribute('tabindex', '0');
      const activate = function () {
        if (state.table.sortKey === key) {
          state.table.sortDir = state.table.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.table.sortKey = key;
          state.table.sortDir = key === 'state' ? 'asc' : 'desc';
        }
        state.table.page = 1;
        App.TableManager.render();
      };
      th.addEventListener('click', activate);
      th.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      });
    });

    const exportBtn = $('exportCsvBtn');
    if (exportBtn) exportBtn.addEventListener('click', App.TableManager.exportCSV);

    const copyBtn = $('copyInsightsBtn');
    if (copyBtn) copyBtn.addEventListener('click', App.copyInsights);

    const flip = function () {
      App.setTheme(state.theme === 'dark' ? 'light' : 'dark');
    };
    ['themeToggle', 'themeToggleMobile'].forEach(function (id) {
      const el = $(id);
      if (el) el.addEventListener('click', flip);
    });

    const menuBtn = $('mobileMenuBtn');
    const menu = $('mobileMenu');
    if (menuBtn && menu) {
      menuBtn.addEventListener('click', function () {
        const open = menu.classList.toggle('hidden') === false;
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        menuBtn.innerHTML = '<i class="fa-solid ' + (open ? 'fa-xmark' : 'fa-bars') + '"></i>';
      });
      $$('[data-mobile-nav]').forEach(function (a) {
        a.addEventListener('click', function () {
          menu.classList.add('hidden');
          menuBtn.setAttribute('aria-expanded', 'false');
          menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        });
      });
    }

    [
      ['schemaToggle', 'schemaPanel', 'schemaChevron'],
      ['formulaToggle', 'formulaPanel', 'formulaChevron'],
    ].forEach(function (trio) {
      const btn = $(trio[0]),
        panel = $(trio[1]),
        chev = $(trio[2]);
      if (!btn || !panel) return;
      btn.addEventListener('click', function () {
        const open = panel.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (chev) chev.style.transform = open ? 'rotate(180deg)' : 'none';
      });
    });

    let ticking = false;
    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          onScroll();
          ticking = false;
        });
      },
      { passive: true },
    );
    window.addEventListener('resize', App.debounce(onScroll, 120));
  }

  function init() {
    App.setTheme(App.store.get('covid-dashboard-theme') === 'light' ? 'light' : 'dark', {
      silent: true,
    });
    App.setText('yearNow', String(new Date().getFullYear()));

    bindEvents();
    observeSections();

    if (!App.ChartManager.available()) {
      App.toast(
        'Chart.js did not load',
        'error',
        'The charts need their CDN. Reconnect to the internet and reload.',
      );
    }
    if (typeof XLSX === 'undefined') {
      App.toast(
        'SheetJS did not load',
        'warn',
        'File upload needs its CDN. The embedded dataset still works.',
      );
    }

    App.loadDefaultDataset(true, 'Embedded baseline dataset (36 States & UTs · 2020–2022)');
    state.booted = true;
    onScroll();
  }

  // --- BOOTSTRAP THE APPLICATION ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.App);
