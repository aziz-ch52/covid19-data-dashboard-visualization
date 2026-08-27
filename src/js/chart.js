/* ==================================================================
   COVID-19 DASHBOARD - VISUALIZATION & UI LAYER (chart.js)
   Handles Chart.js, Highmaps, DOM updates, tables, and insights.
   MUST BE LOADED AFTER engine.js.
   ================================================================== */

(function (App) {
  'use strict';

  // Extract exactly what we need from the core engine to avoid repetitive typing
  const {
    state,
    Calc,
    METRICS,
    cssVar,
    withAlpha,
    metricColor,
    fmtInt,
    fmtCompact,
    fmtPct,
    safeDiv,
    escapeHtml,
    toast,
    reduceMotion,
    $,
    $$,
    animateValue,
    setText,
    setWidth,
    HC_STATE_MAP,
    Parser,
    Validator,
    DEFAULT_DATASET,
    store,
    titleCase,
  } = App;

  /* ==================================================================
     MODULE: CHART MANAGER
     ================================================================== */
  const ChartManager = {
    registry: {},
    CANVAS: {
      yearTrend: 'chartYearTrend',
      stateImpact: 'chartStateImpact',
      vaccination: 'chartVaccination',
      outcome: 'chartOutcome',
      miniTrend: 'chartMiniTrend',
      miniVax: 'chartMiniVax',
      compare: 'chartCompare',
    },

    available: function () {
      return typeof Chart !== 'undefined';
    },

    applyTheme: function () {
      if (!ChartManager.available()) return;
      Chart.defaults.color = cssVar('--text-muted');
      Chart.defaults.borderColor = cssVar('--grid');
      Chart.defaults.font.family = "'Inter', ui-sans-serif, system-ui, sans-serif";
      Chart.defaults.font.size = 11;
      Chart.defaults.animation = reduceMotion ? false : { duration: 700, easing: 'easeOutQuart' };
      Chart.defaults.plugins.legend.labels.usePointStyle = true;
      Chart.defaults.plugins.legend.labels.pointStyle = 'rectRounded';
      Chart.defaults.plugins.legend.labels.boxWidth = 9;
      Chart.defaults.plugins.legend.labels.boxHeight = 9;
      Chart.defaults.plugins.legend.labels.padding = 14;
      Chart.defaults.maintainAspectRatio = false;
      Chart.defaults.responsive = true;
    },

    destroy: function (key) {
      const inst = ChartManager.registry[key];
      if (inst) {
        try {
          inst.destroy();
        } catch (e) {}
        delete ChartManager.registry[key];
      }
    },

    destroyAll: function () {
      Object.keys(ChartManager.registry).forEach(ChartManager.destroy);
    },

    render: function (key, config) {
      if (!ChartManager.available()) return null;
      ChartManager.destroy(key);
      const canvas = $(ChartManager.CANVAS[key]);
      if (!canvas) return null;
      config.plugins = (config.plugins || []).concat([ChartManager.bgPlugin]);
      ChartManager.registry[key] = new Chart(canvas.getContext('2d'), config);
      return ChartManager.registry[key];
    },

    bgPlugin: {
      id: 'panelBackground',
      beforeDraw: function (chart) {
        const ctx = chart.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = cssVar('--surface');
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
      },
    },

    centerPlugin: {
      id: 'doughnutCenter',
      afterDatasetsDraw: function (chart, args, opts) {
        if (!opts || !opts.value) return;
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || !meta.data.length) return;
        const el = meta.data[0];
        if (!el || typeof el.x !== 'number') return;
        const ctx = chart.ctx;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = cssVar('--text-muted');
        ctx.font = '500 9.5px "JetBrains Mono", monospace';
        ctx.fillText(String(opts.label || '').toUpperCase(), el.x, el.y - 16);
        ctx.fillStyle = cssVar('--text');
        ctx.font = '700 21px "JetBrains Mono", monospace';
        ctx.fillText(String(opts.value), el.x, el.y + 5);
        if (opts.note) {
          ctx.fillStyle = cssVar('--text-muted');
          ctx.font = '400 9.5px "Inter", sans-serif';
          ctx.fillText(String(opts.note), el.x, el.y + 24);
        }
        ctx.restore();
      },
    },

    tooltip: function (extra) {
      return Object.assign(
        {
          backgroundColor: cssVar('--surface'),
          titleColor: cssVar('--text'),
          bodyColor: cssVar('--text-mid'),
          borderColor: cssVar('--line'),
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          boxPadding: 4,
          usePointStyle: true,
          titleFont: { family: "'Space Grotesk', sans-serif", weight: '600', size: 12 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
        },
        extra || {},
      );
    },

    axis: function (opts) {
      const o = opts || {};
      return {
        grid: {
          color: cssVar('--grid'),
          drawTicks: false,
          drawBorder: false,
          display: o.grid !== false,
        },
        border: { display: false },
        ticks: Object.assign(
          {
            color: cssVar('--text-muted'),
            padding: 8,
            font: { family: "'JetBrains Mono', monospace", size: 10 },
          },
          o.ticks || {},
        ),
        title: o.title
          ? {
              display: true,
              text: o.title,
              color: cssVar('--text-muted'),
              font: { family: "'JetBrains Mono', monospace", size: 9.5 },
            }
          : { display: false },
      };
    },

    downloadPNG: function (key, filename) {
      const inst = ChartManager.registry[key];
      if (!inst) {
        toast('That chart is not on screen yet', 'warn');
        return;
      }
      const url = inst.toBase64Image('image/png', 1);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('Chart saved as PNG', 'success', filename);
    },
  };

  /* ==================================================================
     HIGHCHARTS MAP INTEGRATION (With Race-Condition Fix)
     ================================================================== */
  let hcMapInstance = null;
  let mapRetryCount = 0;

  function renderMap() {
    // Retry mechanism for CDN network delays to avoid blank maps
    if (
      typeof Highcharts === 'undefined' ||
      !Highcharts.maps['countries/in/custom/in-all-disputed']
    ) {
      if (mapRetryCount < 10) {
        mapRetryCount++;
        setTimeout(renderMap, 200); // Wait 200ms and try again
      } else {
        App.toast('Map Error', 'error', 'Highcharts map data failed to load from the network.');
      }
      return;
    }
    mapRetryCount = 0; // Reset on success

    const container = $('chartMap');
    if (!container) return;

    // Calculate cumulative totals across ALL YEARS in the dataset
    const cumulativeByState = {};
    state.dataset.forEach((r) => {
      if (!cumulativeByState[r.state]) {
        cumulativeByState[r.state] = { cases: 0, deaths: 0, recovered: 0, vaccinated: 0 };
      }
      cumulativeByState[r.state].cases += r.cases;
      cumulativeByState[r.state].deaths += r.deaths;
      cumulativeByState[r.state].recovered += r.recovered;
      cumulativeByState[r.state].vaccinated += r.vaccinated;
    });

    const metric = state.filters.metric;
    const def = METRICS[metric];
    const baseColor = cssVar(def.varName);

    // Build the data array formatted for Highcharts
    const mapData = Highcharts.maps['countries/in/custom/in-all-disputed'].features
      .map((f) => {
        const geoName = f.properties.name;
        const hcKey = f.properties['hc-key'];
        const stateName =
          Object.keys(HC_STATE_MAP).find((k) => HC_STATE_MAP[k] === hcKey) || geoName;
        const stats = cumulativeByState[stateName] || {
          cases: 0,
          deaths: 0,
          recovered: 0,
          vaccinated: 0,
        };

        return {
          'hc-key': hcKey,
          name: stateName,
          value: stats[metric] || 0,
          cases: stats.cases,
          deaths: stats.deaths,
          recovered: stats.recovered,
          vaccinated: stats.vaccinated,
        };
      })
      .filter((d) => d['hc-key']);

    // Safely destroy previous instances to avoid memory leaks
    if (hcMapInstance) {
      try {
        hcMapInstance.destroy();
      } catch (e) {}
      hcMapInstance = null;
    }

    hcMapInstance = Highcharts.mapChart('chartMap', {
      chart: {
        map: 'countries/in/custom/in-all-disputed',
        backgroundColor: 'transparent',
        spacingBottom: 0,
        spacingTop: 0,
        spacingLeft: 0,
        spacingRight: 0,
        style: { fontFamily: "'Inter', sans-serif" },
      },
      title: { text: null },
      credits: { enabled: false },
      exporting: { enabled: false },
      legend: {
        align: 'right',
        verticalAlign: 'bottom',
        layout: 'horizontal',
        floating: true,
        backgroundColor: cssVar('--surface'),
        itemStyle: { color: cssVar('--text') },
      },
      mapNavigation: {
        enabled: false,
        enableMouseWheelZoom: false,
        enableTouchZoom: false,
        enableDoubleClickZoom: false,
      },
      colorAxis: {
        min: 0,
        minColor: cssVar('--surface-2'),
        maxColor: baseColor,
        labels: {
          style: { color: cssVar('--text-muted') },
          formatter: function () {
            return this.value >= 1e5 ? (this.value / 1e5).toFixed(0) + 'L' : this.value;
          },
        },
      },
      tooltip: {
        useHTML: true,
        backgroundColor: 'transparent',
        borderWidth: 0,
        shadow: false,
        formatter: function () {
          if (!this.point.cases) {
            return `<div style="background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 10px; color: var(--text);">
                      <strong style="font-family: 'Space Grotesk', sans-serif; font-size: 14px;">${this.point.name}</strong><br/>
                      <span style="font-family: 'Inter', sans-serif; font-size: 12px; color: var(--text-muted);">No data records</span>
                    </div>`;
          }
          return `
            <div style="background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 10px; color: var(--text); box-shadow: var(--shadow-md);">
              <strong style="font-family: 'Space Grotesk', sans-serif; font-size: 14px; border-bottom: 1px solid var(--line); padding-bottom: 4px; display: block; margin-bottom: 6px;">${this.point.name}</strong>
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.6;">
                <div style="display:flex; justify-content: space-between;"><span style="color: var(--c-cases); font-weight: 600; padding-right: 12px;">Cases</span> <span>${fmtInt(this.point.cases)}</span></div>
                <div style="display:flex; justify-content: space-between;"><span style="color: var(--c-deaths); font-weight: 600; padding-right: 12px;">Deaths</span> <span>${fmtInt(this.point.deaths)}</span></div>
                <div style="display:flex; justify-content: space-between;"><span style="color: var(--c-recov); font-weight: 600; padding-right: 12px;">Recovered</span> <span>${fmtInt(this.point.recovered)}</span></div>
                <div style="display:flex; justify-content: space-between;"><span style="color: var(--c-vax); font-weight: 600; padding-right: 12px;">Vaccinated</span> <span>${fmtInt(this.point.vaccinated)}</span></div>
              </div>
              <div style="font-size: 9px; margin-top: 6px; color: var(--text-muted); text-align: center; font-weight: 500;">Total (2020–2022)</div>
            </div>`;
        },
      },
      plotOptions: {
        series: {
          point: {
            events: {
              click: function () {
                const currentState = state.filters.state;
                setFilter('state', currentState === this.name ? 'all' : this.name);
              },
            },
          },
        },
      },
      series: [
        {
          data: mapData,
          name: def.label,
          joinBy: 'hc-key',
          borderColor: cssVar('--line'),
          borderWidth: 1,
          states: {
            hover: { color: cssVar('--accent') },
            select: { color: cssVar('--accent'), borderColor: cssVar('--text'), borderWidth: 2 },
          },
        },
      ],
    });

    if (state.filters.state !== 'all') {
      const selectedHcKey = HC_STATE_MAP[state.filters.state];
      if (selectedHcKey && hcMapInstance.series[0]) {
        const points = hcMapInstance.series[0].points;
        for (let i = 0; i < points.length; i++) {
          if (points[i]['hc-key'] === selectedHcKey) {
            points[i].select(true, true);
            break;
          }
        }
      }
    }
  }

  /* ==================================================================
     RENDERER: KPI SUMMARY GRID
     ================================================================== */
  function renderKPIs() {
    const rows = Calc.filtered();
    const t = Calc.total(rows);
    const scope = Calc.yearScope();
    const statesInView = Calc.uniqueStates(rows).length;
    const yearsInView = Calc.uniqueYears(rows);

    animateValue($('kpiCases'), t.cases);
    setText(
      'kpiCasesSub',
      fmtInt(t.records) +
        ' record' +
        (t.records === 1 ? '' : 's') +
        ' · ' +
        statesInView +
        ' state' +
        (statesInView === 1 ? '' : 's') +
        ' · ' +
        (yearsInView.length ? yearsInView.join(', ') : 'no year'),
    );

    animateValue($('kpiActive'), t.active);
    const activeShare = safeDiv(t.active, t.cases) * 100;
    setWidth('kpiActiveBar', activeShare * 10);
    setText(
      'kpiActiveSub',
      fmtPct(activeShare) + ' of confirmed cases still unresolved · Cases − Deaths − Recovered',
    );

    animateValue($('kpiDeaths'), t.deaths);
    setText('kpiDeathRate', fmtPct(t.deathRate));
    const worst = Calc.extremeBy(scope, 'deathRate', 'max');
    setWidth('kpiDeathBar', safeDiv(t.deathRate, worst ? worst.deathRate : t.deathRate) * 100);

    animateValue($('kpiRecovered'), t.recovered);
    setText('kpiRecoveryRate', fmtPct(t.recoveryRate));
    setWidth('kpiRecovBar', t.recoveryRate);

    animateValue($('kpiVaccinated'), t.vaccinated);
    const vaxYears = Calc.byYear(rows)
      .slice()
      .sort(function (a, b) {
        return b.vaccinated - a.vaccinated;
      });
    const peakVaxYear = vaxYears.length && vaxYears[0].vaccinated > 0 ? vaxYears[0].year : null;
    setText(
      'kpiVaccinatedSub',
      t.dosesPerCase.toFixed(1) +
        ' doses per confirmed case' +
        (peakVaxYear ? ' · heaviest roll-out ' + peakVaxYear : ' · no doses in this view'),
    );

    const byYear = Calc.byYear(rows);
    const peak = byYear.slice().sort(function (a, b) {
      return b.cases - a.cases;
    })[0];
    if (peak) {
      setText('kpiPeakYear', String(peak.year));
      setText('kpiPeakYearCases', fmtCompact(peak.cases) + ' cases');
      const others = byYear
        .filter(function (y) {
          return y.year !== peak.year;
        })
        .sort(function (a, b) {
          return b.cases - a.cases;
        });
      const share = safeDiv(peak.cases, t.cases) * 100;
      setText(
        'kpiPeakYearSub',
        byYear.length < 2
          ? fmtPct(share) + ' of cases in view · only ' + peak.year + ' is selected'
          : fmtPct(share) +
              ' of cases in view · ' +
              safeDiv(peak.cases, others[0].cases).toFixed(1) +
              '× the next year (' +
              others[0].year +
              ')',
      );
    } else {
      setText('kpiPeakYear', '—');
      setText('kpiPeakYearCases', '—');
      setText('kpiPeakYearSub', 'No records in this view');
    }

    const topState = Calc.rankStates(rows, 'cases')[0];
    if (topState) {
      setText('kpiTopState', topState.state);
      setText('kpiTopStateCases', fmtCompact(topState.cases) + ' cases');
      const nationalRank = Calc.rankOf(scope, topState.state, 'cases');
      const totalStates = Calc.uniqueStates(scope).length;
      setText(
        'kpiTopStateSub',
        fmtPct(safeDiv(topState.cases, t.cases) * 100) +
          ' of cases in view · rank ' +
          nationalRank +
          ' of ' +
          totalStates +
          ' overall · CFR ' +
          fmtPct(topState.deathRate),
      );
    } else {
      setText('kpiTopState', '—');
      setText('kpiTopStateCases', '—');
      setText('kpiTopStateSub', 'No records in this view');
    }

    const f = state.filters;
    setText(
      'filterSummary',
      fmtInt(t.records) +
        ' of ' +
        fmtInt(state.dataset.length) +
        ' records · ' +
        (f.year === 'all' ? 'all years' : f.year) +
        ' · ' +
        (f.state === 'all' ? 'all states' : f.state) +
        ' · ranking by ' +
        METRICS[f.metric].label.toLowerCase(),
    );
  }

  /* ==================================================================
     RENDERER: CHART 1 — YEAR-WISE TRAJECTORY
     ================================================================== */
  function renderYearTrend() {
    const rows = Calc.filtered();
    const years = Calc.byYear(rows);
    const labels = years.map(function (y) {
      return String(y.year);
    });
    const cCases = metricColor('cases'),
      cRecov = metricColor('recovered'),
      cDeaths = metricColor('deaths');

    setText(
      'yearTrendSub',
      years.length
        ? 'Cases and recoveries on the left axis, deaths on the right · ' +
            (state.filters.state === 'all' ? 'all states' : state.filters.state)
        : 'No records in this view',
    );

    ChartManager.render('yearTrend', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Cases',
            yAxisID: 'y',
            order: 3,
            data: years.map(function (y) {
              return y.cases;
            }),
            backgroundColor: withAlpha(cCases, 0.85),
            hoverBackgroundColor: cCases,
            borderRadius: 5,
            borderSkipped: false,
            maxBarThickness: 54,
          },
          {
            label: 'Recoveries',
            yAxisID: 'y',
            order: 2,
            data: years.map(function (y) {
              return y.recovered;
            }),
            backgroundColor: withAlpha(cRecov, 0.85),
            hoverBackgroundColor: cRecov,
            borderRadius: 5,
            borderSkipped: false,
            maxBarThickness: 54,
          },
          {
            label: 'Deaths (right axis)',
            yAxisID: 'y1',
            order: 1,
            data: years.map(function (y) {
              return y.deaths;
            }),
            backgroundColor: withAlpha(cDeaths, 0.9),
            hoverBackgroundColor: cDeaths,
            borderRadius: 5,
            borderSkipped: false,
            maxBarThickness: 54,
          },
        ],
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', align: 'end' },
          tooltip: ChartManager.tooltip({
            callbacks: {
              label: function (ctx) {
                return (
                  '  ' +
                  ctx.dataset.label.replace(' (right axis)', '') +
                  ': ' +
                  fmtInt(ctx.parsed.y)
                );
              },
              afterBody: function (items) {
                const y = years[items[0].dataIndex];
                return [
                  '',
                  'Active: ' + fmtInt(y.active),
                  'CFR: ' + fmtPct(y.deathRate),
                  'Doses: ' + fmtInt(y.vaccinated),
                ];
              },
            },
          }),
        },
        scales: {
          x: ChartManager.axis({
            grid: false,
            ticks: { font: { family: "'JetBrains Mono', monospace", size: 11, weight: '500' } },
          }),
          y: Object.assign(
            ChartManager.axis({
              title: 'Cases / recoveries',
              ticks: {
                callback: function (v) {
                  return fmtCompact(v);
                },
              },
            }),
            { position: 'left', beginAtZero: true },
          ),
          y1: Object.assign(
            ChartManager.axis({
              grid: false,
              title: 'Deaths',
              ticks: {
                callback: function (v) {
                  return fmtCompact(v);
                },
              },
            }),
            { position: 'right', beginAtZero: true },
          ),
        },
      },
    });
  }

  /* ==================================================================
     RENDERER: CHART 2 — STATE-WISE IMPACT
     ================================================================== */
  function renderStateImpact() {
    const scope = Calc.yearScope();
    const metric = state.filters.metric;
    const def = METRICS[metric];
    const ranked = Calc.rankStates(scope, metric).slice(0, 10);
    const base = metricColor(metric);
    const accent = cssVar('--accent');
    const selected = state.filters.state;
    const totalStates = Calc.uniqueStates(scope).length;

    setText(
      'stateImpactTitle',
      'Top ' + Math.min(10, ranked.length) + ' states by ' + def.label.toLowerCase(),
    );
    setText(
      'stateImpactSub',
      ranked.length
        ? 'Ranked across ' +
            totalStates +
            ' states · ' +
            (state.filters.year === 'all' ? '2020–2022 combined' : 'year ' + state.filters.year) +
            (selected !== 'all' ? ' · ' + selected + ' highlighted' : '')
        : 'No records in this view',
    );

    ChartManager.render('stateImpact', {
      type: 'bar',
      data: {
        labels: ranked.map(function (s) {
          return s.state;
        }),
        datasets: [
          {
            label: def.label,
            data: ranked.map(function (s) {
              return s[metric];
            }),
            backgroundColor: ranked.map(function (s, i) {
              return s.state === selected ? accent : withAlpha(base, 0.85 - i * 0.045);
            }),
            hoverBackgroundColor: ranked.map(function (s) {
              return s.state === selected ? accent : base;
            }),
            borderColor: ranked.map(function (s) {
              return s.state === selected ? accent : 'transparent';
            }),
            borderWidth: ranked.map(function (s) {
              return s.state === selected ? 2 : 0;
            }),
            borderRadius: 5,
            borderSkipped: false,
            maxBarThickness: 26,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: ChartManager.tooltip({
            callbacks: {
              label: function (ctx) {
                return '  ' + def.label + ': ' + fmtInt(ctx.parsed.x);
              },
              afterBody: function (items) {
                const s = ranked[items[0].dataIndex];
                return [
                  '',
                  'Cases: ' + fmtInt(s.cases),
                  'Deaths: ' + fmtInt(s.deaths),
                  'Recovery: ' + fmtPct(s.recoveryRate),
                  'CFR: ' + fmtPct(s.deathRate),
                ];
              },
            },
          }),
        },
        scales: {
          x: Object.assign(
            ChartManager.axis({
              ticks: {
                callback: function (v) {
                  return fmtCompact(v);
                },
              },
            }),
            { beginAtZero: true },
          ),
          y: ChartManager.axis({
            grid: false,
            ticks: {
              font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
              color: cssVar('--text-mid'),
            },
          }),
        },
      },
    });
  }

  /* ==================================================================
     RENDERER: CHART 3 — VACCINATION DISTRIBUTION
     ================================================================== */
  function renderVaccination() {
    const cVax = metricColor('vaccinated');
    const accent = cssVar('--accent');
    setText('vaxViewLabel', state.vaxView === 'year' ? 'By year' : 'By state');

    if (state.vaxView === 'state') {
      const scope = Calc.yearScope();
      const ranked = Calc.rankStates(scope, 'vaccinated').slice(0, 10);
      setText(
        'vaxSub',
        ranked.length
          ? 'Top ' +
              ranked.length +
              ' states by doses administered · ' +
              (state.filters.year === 'all' ? '2020–2022' : state.filters.year)
          : 'No records in this view',
      );

      ChartManager.render('vaccination', {
        type: 'bar',
        data: {
          labels: ranked.map(function (s) {
            return s.state;
          }),
          datasets: [
            {
              label: 'Doses',
              data: ranked.map(function (s) {
                return s.vaccinated;
              }),
              backgroundColor: ranked.map(function (s, i) {
                return s.state === state.filters.state ? accent : withAlpha(cVax, 0.85 - i * 0.045);
              }),
              borderRadius: 5,
              borderSkipped: false,
              maxBarThickness: 24,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: ChartManager.tooltip({
              callbacks: {
                label: function (ctx) {
                  return '  Doses: ' + fmtInt(ctx.parsed.x);
                },
                afterBody: function (items) {
                  const s = ranked[items[0].dataIndex];
                  return ['', s.dosesPerCase.toFixed(1) + ' doses per confirmed case'];
                },
              },
            }),
          },
          scales: {
            x: Object.assign(
              ChartManager.axis({
                ticks: {
                  callback: function (v) {
                    return fmtCompact(v);
                  },
                },
              }),
              { beginAtZero: true },
            ),
            y: ChartManager.axis({
              grid: false,
              ticks: {
                font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
                color: cssVar('--text-mid'),
              },
            }),
          },
        },
      });
      return;
    }

    const rows = Calc.filtered();
    const years = Calc.byYear(rows);
    let running = 0;
    const cumulative = years.map(function (y) {
      running += y.vaccinated;
      return running;
    });
    setText(
      'vaxSub',
      years.length
        ? 'Doses per year with cumulative total · ' +
            (state.filters.state === 'all' ? 'all states' : state.filters.state)
        : 'No records in this view',
    );

    ChartManager.render('vaccination', {
      type: 'bar',
      data: {
        labels: years.map(function (y) {
          return String(y.year);
        }),
        datasets: [
          {
            type: 'bar',
            label: 'Doses in year',
            yAxisID: 'y',
            order: 2,
            data: years.map(function (y) {
              return y.vaccinated;
            }),
            backgroundColor: withAlpha(cVax, 0.85),
            hoverBackgroundColor: cVax,
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 64,
          },
          {
            type: 'line',
            label: 'Cumulative',
            yAxisID: 'y1',
            order: 1,
            data: cumulative,
            borderColor: accent,
            backgroundColor: withAlpha(accent, 0.12),
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: cssVar('--surface'),
            pointBorderColor: accent,
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', align: 'end' },
          tooltip: ChartManager.tooltip({
            callbacks: {
              label: function (ctx) {
                return '  ' + ctx.dataset.label + ': ' + fmtInt(ctx.parsed.y);
              },
            },
          }),
        },
        scales: {
          x: ChartManager.axis({
            grid: false,
            ticks: { font: { family: "'JetBrains Mono', monospace", size: 11, weight: '500' } },
          }),
          y: Object.assign(
            ChartManager.axis({
              title: 'Doses in year',
              ticks: {
                callback: function (v) {
                  return fmtCompact(v);
                },
              },
            }),
            { beginAtZero: true },
          ),
          y1: Object.assign(
            ChartManager.axis({
              grid: false,
              title: 'Cumulative',
              ticks: {
                callback: function (v) {
                  return fmtCompact(v);
                },
              },
            }),
            { position: 'right', beginAtZero: true },
          ),
        },
      },
    });
  }

  /* ==================================================================
     RENDERER: CHART 4 — CASE OUTCOME DISTRIBUTION
     ================================================================== */
  function renderOutcome() {
    const t = Calc.total(Calc.filtered());
    const colors = [metricColor('recovered'), metricColor('deaths'), metricColor('active')];
    const values = [t.recovered, t.deaths, t.active];
    const hasData = t.cases > 0;

    setText(
      'outcomeSub',
      hasData
        ? 'Share of ' +
            fmtCompact(t.cases) +
            ' confirmed cases · ' +
            (state.filters.year === 'all' ? '2020–2022' : state.filters.year)
        : 'No records in this view',
    );

    ChartManager.render('outcome', {
      type: 'doughnut',
      plugins: [ChartManager.centerPlugin],
      data: {
        labels: ['Recovered', 'Deaths', 'Active'],
        datasets: [
          {
            data: hasData ? values : [0, 0, 0],
            backgroundColor: colors.map(function (c) {
              return withAlpha(c, 0.9);
            }),
            hoverBackgroundColor: colors,
            borderColor: cssVar('--surface'),
            borderWidth: 3,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        cutout: '64%',
        plugins: {
          legend: { position: 'bottom', align: 'center' },
          doughnutCenter: {
            label: 'Confirmed',
            value: hasData ? fmtCompact(t.cases) : '—',
            note: hasData ? fmtPct(t.recoveryRate) + ' recovered' : '',
          },
          tooltip: ChartManager.tooltip({
            callbacks: {
              label: function (ctx) {
                return (
                  '  ' +
                  ctx.label +
                  ': ' +
                  fmtInt(ctx.parsed) +
                  '  (' +
                  fmtPct(safeDiv(ctx.parsed, t.cases) * 100) +
                  ')'
                );
              },
            },
          }),
        },
      },
    });
  }

  /* ==================================================================
     RENDERER: STATE DEEP-DIVE
     ================================================================== */
  function renderDeepDive() {
    const sel = state.filters.state;
    const emptyEl = $('deepDiveEmpty');
    const contentEl = $('deepDiveContent');
    const scope = Calc.yearScope();

    if (sel === 'all') {
      if (emptyEl) emptyEl.classList.remove('hidden');
      if (contentEl) contentEl.classList.add('hidden');
      ChartManager.destroy('miniTrend');
      ChartManager.destroy('miniVax');
      const host = $('ddQuickPick');
      if (host) {
        host.innerHTML = '';
        Calc.rankStates(scope, 'cases').forEach(function (s) {
          const btn = document.createElement('button');
          btn.className = 'btn btn-xs';
          btn.innerHTML =
            '<i class="fa-solid fa-location-dot" style="color:var(--accent)"></i>' +
            escapeHtml(s.state) +
            '<span class="font-mono t-muted">' +
            fmtCompact(s.cases) +
            '</span>';
          btn.addEventListener('click', function () {
            App.setFilter('state', s.state);
          });
          host.appendChild(btn);
        });
      }
      return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');

    const scopeLabel =
      state.filters.year === 'all' ? 'All years (2020–2022)' : 'Year ' + state.filters.year;
    const rowsAll = state.dataset.filter(function (r) {
      return r.state === sel;
    });
    const t = Calc.total(Calc.filtered());
    const nat = Calc.total(scope);
    const rank = Calc.rankOf(scope, sel, 'cases');
    const totalStates = Calc.uniqueStates(scope).length;
    const worst = Calc.extremeBy(scope, 'deathRate', 'max');
    const bestRecovery = Calc.extremeBy(scope, 'recoveryRate', 'max');

    setText('ddStateName', sel);
    setText('ddScope', scopeLabel);
    setText(
      'ddRank',
      'Rank ' +
        (rank || '—') +
        ' of ' +
        totalStates +
        ' by cases · ' +
        fmtPct(safeDiv(t.cases, nat.cases) * 100) +
        ' of all cases in scope',
    );

    animateValue($('ddCases'), t.cases, fmtCompact, 600);
    animateValue($('ddActive'), t.active, fmtCompact, 600);
    animateValue($('ddDeaths'), t.deaths, fmtCompact, 600);
    animateValue($('ddRecovered'), t.recovered, fmtCompact, 600);
    animateValue($('ddVax'), t.vaccinated, fmtCompact, 600);
    setText('ddShare', fmtPct(safeDiv(t.cases, nat.cases) * 100));

    setText('ddDeathRate', fmtPct(t.deathRate));
    setWidth('ddDeathBar', safeDiv(t.deathRate, worst ? worst.deathRate : t.deathRate) * 100);
    const cfrGap = t.deathRate - nat.deathRate;
    setText(
      'ddDeathNote',
      'Scope average ' +
        fmtPct(nat.deathRate) +
        ' · ' +
        sel +
        ' is ' +
        Math.abs(cfrGap).toFixed(2) +
        ' pp ' +
        (cfrGap >= 0 ? 'above' : 'below') +
        ' it' +
        (worst ? ' · highest is ' + worst.state + ' at ' + fmtPct(worst.deathRate) : ''),
    );

    setText('ddRecoveryRate', fmtPct(t.recoveryRate));
    setWidth('ddRecovBar', t.recoveryRate);
    const recGap = t.recoveryRate - nat.recoveryRate;
    setText(
      'ddRecovNote',
      'Scope average ' +
        fmtPct(nat.recoveryRate) +
        ' · ' +
        Math.abs(recGap).toFixed(2) +
        ' pp ' +
        (recGap >= 0 ? 'above' : 'below') +
        ' it' +
        (bestRecovery
          ? ' · best is ' + bestRecovery.state + ' at ' + fmtPct(bestRecovery.recoveryRate)
          : ''),
    );

    const tbody = $('ddYearTable');
    if (tbody) {
      const byYear = Calc.byYear(rowsAll);
      tbody.innerHTML =
        byYear
          .map(function (y) {
            const highlight = String(y.year) === String(state.filters.year);
            return (
              '<tr style="border-top:1px solid var(--line-soft)' +
              (highlight ? ';background:var(--surface-3)' : '') +
              '">' +
              '<td class="text-left py-1.5' +
              (highlight ? ' font-bold' : '') +
              '" style="color:var(--text)">' +
              y.year +
              '</td>' +
              '<td class="text-right py-1.5" style="color:var(--c-cases)">' +
              fmtCompact(y.cases) +
              '</td>' +
              '<td class="text-right py-1.5" style="color:var(--c-deaths)">' +
              fmtCompact(y.deaths) +
              '</td>' +
              '<td class="text-right py-1.5" style="color:var(--c-vax)">' +
              fmtCompact(y.vaccinated) +
              '</td>' +
              '</tr>'
            );
          })
          .join('') || '<tr><td colspan="4" class="py-2 t-muted">No rows for this state</td></tr>';
    }

    const yearsOfState = Calc.byYear(rowsAll);
    const peakYear = yearsOfState.slice().sort(function (a, b) {
      return b.cases - a.cases;
    })[0];
    const vaxYears = yearsOfState.filter(function (y) {
      return y.vaccinated > 0;
    });
    const totalAll = Calc.total(rowsAll);
    setText(
      'ddNarrative',
      sel +
        ' reported ' +
        fmtInt(totalAll.cases) +
        ' cases and ' +
        fmtInt(totalAll.deaths) +
        ' deaths across ' +
        yearsOfState.length +
        ' year' +
        (yearsOfState.length === 1 ? '' : 's') +
        '. ' +
        (peakYear
          ? 'Its heaviest year was ' +
            peakYear.year +
            ' with ' +
            fmtInt(peakYear.cases) +
            ' cases (' +
            fmtPct(safeDiv(peakYear.cases, totalAll.cases) * 100) +
            ' of its total). '
          : '') +
        (vaxYears.length
          ? 'Vaccination ran from ' +
            vaxYears[0].year +
            ' onward, reaching ' +
            fmtInt(totalAll.vaccinated) +
            ' doses — ' +
            totalAll.dosesPerCase.toFixed(1) +
            ' per confirmed case. '
          : 'No vaccination doses are recorded for this state. ') +
        'Overall it recovered ' +
        fmtPct(totalAll.recoveryRate) +
        ' of its caseload at a ' +
        fmtPct(totalAll.deathRate) +
        ' case fatality rate.',
    );

    const cCases = metricColor('cases'),
      cVax = metricColor('vaccinated');
    const labels = yearsOfState.map(function (y) {
      return String(y.year);
    });

    ChartManager.render('miniTrend', {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Cases',
            data: yearsOfState.map(function (y) {
              return y.cases;
            }),
            borderColor: cCases,
            backgroundColor: withAlpha(cCases, 0.16),
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: cssVar('--surface'),
            pointBorderColor: cCases,
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: ChartManager.tooltip({
            callbacks: {
              label: function (ctx) {
                return '  Cases: ' + fmtInt(ctx.parsed.y);
              },
            },
          }),
        },
        scales: {
          x: ChartManager.axis({ grid: false }),
          y: Object.assign(
            ChartManager.axis({
              ticks: {
                callback: function (v) {
                  return fmtCompact(v);
                },
                maxTicksLimit: 4,
              },
            }),
            { beginAtZero: true },
          ),
        },
      },
    });

    ChartManager.render('miniVax', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Doses',
            data: yearsOfState.map(function (y) {
              return y.vaccinated;
            }),
            backgroundColor: withAlpha(cVax, 0.85),
            hoverBackgroundColor: cVax,
            borderRadius: 5,
            borderSkipped: false,
            maxBarThickness: 40,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: ChartManager.tooltip({
            callbacks: {
              label: function (ctx) {
                return '  Doses: ' + fmtInt(ctx.parsed.y);
              },
            },
          }),
        },
        scales: {
          x: ChartManager.axis({ grid: false }),
          y: Object.assign(
            ChartManager.axis({
              ticks: {
                callback: function (v) {
                  return fmtCompact(v);
                },
                maxTicksLimit: 4,
              },
            }),
            { beginAtZero: true },
          ),
        },
      },
    });
  }

  /* ==================================================================
     RENDERER: SIDE-BY-SIDE COMPARISON
     ================================================================== */
  const COMPARE_ROWS = [
    { label: 'Confirmed cases', key: 'cases', kind: 'int', varName: '--c-cases' },
    { label: 'Active cases', key: 'active', kind: 'int', varName: '--c-active' },
    { label: 'Deaths', key: 'deaths', kind: 'int', varName: '--c-deaths' },
    { label: 'Recovered', key: 'recovered', kind: 'int', varName: '--c-recov' },
    { label: 'Doses administered', key: 'vaccinated', kind: 'int', varName: '--c-vax' },
    { label: 'Death rate', key: 'deathRate', kind: 'pct', varName: '--c-deaths' },
    { label: 'Recovery rate', key: 'recoveryRate', kind: 'pct', varName: '--c-recov' },
    { label: 'Doses per case', key: 'dosesPerCase', kind: 'ratio', varName: '--c-vax' },
  ];

  function fmtByKind(v, kind) {
    if (kind === 'pct') return fmtPct(v);
    if (kind === 'ratio') return (Number(v) || 0).toFixed(2);
    return fmtInt(v);
  }
  function fmtDiff(v, kind) {
    const sign = v > 0 ? '+' : v < 0 ? '−' : '';
    const abs = Math.abs(v);
    if (kind === 'pct') return sign + abs.toFixed(2) + ' pp';
    if (kind === 'ratio') return sign + abs.toFixed(2);
    return sign + fmtInt(abs);
  }

  function renderComparison() {
    const scope = Calc.yearScope();
    const states = Calc.uniqueStates(scope);
    const matrix = $('compareMatrix');

    if (!states.length) {
      if (matrix)
        matrix.innerHTML =
          '<tr><td colspan="5" class="py-4 t-muted text-[.8rem]">No states in the current year filter.</td></tr>';
      setText('compareVerdict', 'Widen the year filter to compare states.');
      ChartManager.destroy('compare');
      return;
    }

    if (states.indexOf(state.compare.a) === -1) state.compare.a = states[0];
    if (states.indexOf(state.compare.b) === -1) state.compare.b = states[1] || states[0];
    const selA = $('compareA'),
      selB = $('compareB');
    if (selA) selA.value = state.compare.a;
    if (selB) selB.value = state.compare.b;

    const A = Calc.stateTotal(scope, state.compare.a);
    const B = Calc.stateTotal(scope, state.compare.b);
    setText('matrixHeadA', state.compare.a);
    setText('matrixHeadB', state.compare.b);

    if (matrix) {
      matrix.innerHTML = COMPARE_ROWS.map(function (row) {
        const a = A[row.key] || 0,
          b = B[row.key] || 0;
        const diff = a - b;
        const leader = diff === 0 ? '—' : diff > 0 ? state.compare.a : state.compare.b;
        const leaderColor = diff === 0 ? 'var(--text-muted)' : cssVar('--accent');
        return (
          '<tr style="border-top:1px solid var(--line-soft)">' +
          '<td class="py-2 text-left text-[.78rem]" style="color:var(--text)"><span class="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style="background:' +
          cssVar(row.varName) +
          '"></span>' +
          escapeHtml(row.label) +
          '</td>' +
          '<td class="py-2 text-right figure" style="color:var(--text)">' +
          fmtByKind(a, row.kind) +
          '</td>' +
          '<td class="py-2 text-right figure" style="color:var(--text)">' +
          fmtByKind(b, row.kind) +
          '</td>' +
          '<td class="py-2 text-right figure t-muted">' +
          fmtDiff(diff, row.kind) +
          '</td>' +
          '<td class="py-2 text-right text-[.74rem] font-semibold" style="color:' +
          leaderColor +
          '">' +
          escapeHtml(leader) +
          '</td></tr>'
        );
      }).join('');
    }

    const caseLead = A.cases >= B.cases ? state.compare.a : state.compare.b;
    const caseRatio = safeDiv(Math.max(A.cases, B.cases), Math.min(A.cases, B.cases) || 1);
    const saferCFR = A.deathRate <= B.deathRate ? state.compare.a : state.compare.b;
    const cfrGap = Math.abs(A.deathRate - B.deathRate);
    const doseLead = A.dosesPerCase >= B.dosesPerCase ? state.compare.a : state.compare.b;
    setText(
      'compareVerdict',
      caseLead +
        ' carried the larger caseload — ' +
        caseRatio.toFixed(2) +
        '× the other state. ' +
        saferCFR +
        ' recorded the lower case fatality rate, by ' +
        cfrGap.toFixed(2) +
        ' percentage points (' +
        fmtPct(Math.min(A.deathRate, B.deathRate)) +
        ' vs ' +
        fmtPct(Math.max(A.deathRate, B.deathRate)) +
        '). ' +
        doseLead +
        ' vaccinated more intensively relative to its caseload, at ' +
        Math.max(A.dosesPerCase, B.dosesPerCase).toFixed(2) +
        ' doses per confirmed case against ' +
        Math.min(A.dosesPerCase, B.dosesPerCase).toFixed(2) +
        '. Recovery rates stand at ' +
        fmtPct(A.recoveryRate) +
        ' for ' +
        state.compare.a +
        ' and ' +
        fmtPct(B.recoveryRate) +
        ' for ' +
        state.compare.b +
        '.',
    );

    const useLog = state.compare.logScale;
    setText('compareScaleLabel', useLog ? 'Log scale' : 'Linear scale');
    setText(
      'compareScaleNote',
      useLog
        ? 'Logarithmic axis — vaccination doses exceed death counts by several orders of magnitude. Zero values omitted.'
        : 'Linear axis — true proportions, but small metrics such as deaths may be hard to read next to dose counts.',
    );

    const keys = ['cases', 'active', 'deaths', 'recovered', 'vaccinated'];
    const labels = ['Cases', 'Active', 'Deaths', 'Recovered', 'Doses'];
    const prep = function (src) {
      return keys.map(function (k) {
        const v = src[k] || 0;
        return useLog && v <= 0 ? null : v;
      });
    };
    const cA = cssVar('--accent'),
      cB = metricColor('deaths');

    ChartManager.render('compare', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: state.compare.a,
            data: prep(A),
            backgroundColor: withAlpha(cA, 0.85),
            hoverBackgroundColor: cA,
            borderRadius: 5,
            borderSkipped: false,
            maxBarThickness: 30,
          },
          {
            label: state.compare.b,
            data: prep(B),
            backgroundColor: withAlpha(cB, 0.8),
            hoverBackgroundColor: cB,
            borderRadius: 5,
            borderSkipped: false,
            maxBarThickness: 30,
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: 'top', align: 'end' },
          tooltip: ChartManager.tooltip({
            callbacks: {
              label: function (ctx) {
                return (
                  '  ' +
                  ctx.dataset.label +
                  ': ' +
                  (ctx.parsed.y === null ? '0' : fmtInt(ctx.parsed.y))
                );
              },
            },
          }),
        },
        scales: {
          x: ChartManager.axis({
            grid: false,
            ticks: { font: { family: "'Inter', sans-serif", size: 11, weight: '500' } },
          }),
          y: Object.assign(
            ChartManager.axis({
              ticks: {
                callback: function (v) {
                  return fmtCompact(v);
                },
              },
            }),
            useLog ? { type: 'logarithmic' } : { beginAtZero: true },
          ),
        },
      },
    });
  }

  /* ==================================================================
     MODULE: TABLE MANAGER
     ================================================================== */
  const TableManager = {
    COLUMNS: [
      { key: 'state', label: 'State', kind: 'text' },
      { key: 'year', label: 'Year', kind: 'year' },
      { key: 'cases', label: 'Total Cases', kind: 'int' },
      { key: 'deaths', label: 'Deaths', kind: 'int' },
      { key: 'recovered', label: 'Recovered', kind: 'int' },
      { key: 'active', label: 'Active Cases', kind: 'int' },
      { key: 'vaccinated', label: 'Vaccinations', kind: 'int' },
      { key: 'recoveryRate', label: 'Recovery Rate', kind: 'pct' },
      { key: 'deathRate', label: 'Death Rate', kind: 'pct' },
    ],

    matching: function () {
      const q = state.table.search.trim().toLowerCase();
      const rows = Calc.filtered();
      if (!q) return rows;
      return rows.filter(function (r) {
        return r.state.toLowerCase().indexOf(q) !== -1 || String(r.year).indexOf(q) !== -1;
      });
    },

    sorted: function (rows) {
      const key = state.table.sortKey;
      const dir = state.table.sortDir === 'asc' ? 1 : -1;
      return rows.slice().sort(function (a, b) {
        if (key === 'state') return a.state.localeCompare(b.state) * dir;
        const diff = (a[key] - b[key]) * dir;
        return diff !== 0 ? diff : a.state.localeCompare(b.state) || a.year - b.year;
      });
    },

    render: function () {
      const body = $('tableBody'),
        emptyEl = $('tableEmpty'),
        table = $('dataTable');
      if (!body) return;

      const rows = TableManager.sorted(TableManager.matching());
      const perPage = state.table.perPage;
      const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
      if (state.table.page > totalPages) state.table.page = totalPages;
      if (state.table.page < 1) state.table.page = 1;
      const start = (state.table.page - 1) * perPage;
      const pageRows = rows.slice(start, start + perPage);

      $$('#dataTable thead th').forEach(function (th) {
        const key = th.getAttribute('data-sort');
        const icon = th.querySelector('.arrow');
        const isActive = key === state.table.sortKey;
        th.classList.toggle('sorted', isActive);
        th.setAttribute(
          'aria-sort',
          isActive ? (state.table.sortDir === 'asc' ? 'ascending' : 'descending') : 'none',
        );
        if (icon) {
          icon.className =
            'fa-solid arrow ' +
            (isActive
              ? state.table.sortDir === 'asc'
                ? 'fa-arrow-up-short-wide'
                : 'fa-arrow-down-wide-short'
              : 'fa-sort');
        }
      });

      if (!pageRows.length) {
        body.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        if (table) table.style.display = 'none';
      } else {
        if (emptyEl) emptyEl.classList.add('hidden');
        if (table) table.style.display = '';
        body.innerHTML = pageRows
          .map(function (r) {
            const recovBg =
              'background:' +
              withAlpha(metricColor('recovered'), 0.14) +
              ';color:' +
              metricColor('recovered');
            const deathBg =
              'background:' +
              withAlpha(metricColor('deaths'), 0.14) +
              ';color:' +
              metricColor('deaths');
            return (
              '<tr><td>' +
              (r.flagged
                ? '<i class="fa-solid fa-triangle-exclamation mr-1.5" style="color:var(--c-active)" title="This row raised a validation warning"></i>'
                : '') +
              escapeHtml(r.state) +
              '</td><td>' +
              r.year +
              '</td><td style="color:var(--c-cases)">' +
              fmtInt(r.cases) +
              '</td><td style="color:var(--c-deaths)">' +
              fmtInt(r.deaths) +
              '</td><td style="color:var(--c-recov)">' +
              fmtInt(r.recovered) +
              '</td><td style="color:var(--c-active)">' +
              fmtInt(r.active) +
              '</td><td style="color:var(--c-vax)">' +
              fmtInt(r.vaccinated) +
              '</td><td><span class="pill figure" style="' +
              recovBg +
              '">' +
              fmtPct(r.recoveryRate) +
              '</span></td><td><span class="pill figure" style="' +
              deathBg +
              '">' +
              fmtPct(r.deathRate) +
              '</span></td></tr>'
            );
          })
          .join('');
      }

      const from = rows.length ? start + 1 : 0;
      const to = Math.min(start + perPage, rows.length);
      setText(
        'pageInfo',
        rows.length
          ? 'Showing ' +
              from +
              '–' +
              to +
              ' of ' +
              fmtInt(rows.length) +
              ' records · page ' +
              state.table.page +
              ' of ' +
              totalPages
          : 'No records to show',
      );
      setText(
        'tableSummary',
        fmtInt(rows.length) +
          ' record' +
          (rows.length === 1 ? '' : 's') +
          ' in view' +
          (state.table.search ? ' · search "' + state.table.search + '"' : '') +
          ' · sorted by ' +
          TableManager.labelFor(state.table.sortKey) +
          ' ' +
          state.table.sortDir,
      );

      const prev = $('prevPage'),
        next = $('nextPage');
      if (prev) {
        prev.disabled = state.table.page <= 1;
        prev.style.opacity = prev.disabled ? '.45' : '1';
      }
      if (next) {
        next.disabled = state.table.page >= totalPages;
        next.style.opacity = next.disabled ? '.45' : '1';
      }

      TableManager.renderPageNumbers(totalPages);
    },

    labelFor: function (key) {
      for (let i = 0; i < TableManager.COLUMNS.length; i++) {
        if (TableManager.COLUMNS[i].key === key) return TableManager.COLUMNS[i].label.toLowerCase();
      }
      return key;
    },

    renderPageNumbers: function (totalPages) {
      const host = $('pageNumbers');
      if (!host) return;
      host.innerHTML = '';
      const cur = state.table.page;
      let pages = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages = [1];
        if (cur > 3) pages.push('…');
        for (let i = Math.max(2, cur - 1); i <= Math.min(totalPages - 1, cur + 1); i++)
          pages.push(i);
        if (cur < totalPages - 2) pages.push('…');
        pages.push(totalPages);
      }
      pages.forEach(function (p) {
        if (p === '…') {
          const span = document.createElement('span');
          span.className = 'text-[.7rem] t-muted px-1';
          span.textContent = '…';
          host.appendChild(span);
          return;
        }
        const btn = document.createElement('button');
        btn.className = 'btn btn-xs';
        btn.textContent = String(p);
        btn.style.minWidth = '1.9rem';
        if (p === cur) {
          btn.style.background = cssVar('--accent');
          btn.style.borderColor = cssVar('--accent');
          btn.style.color = cssVar('--accent-ink');
        }
        btn.addEventListener('click', function () {
          state.table.page = p;
          TableManager.render();
        });
        host.appendChild(btn);
      });
    },

    exportCSV: function () {
      const rows = TableManager.sorted(TableManager.matching());
      if (!rows.length) {
        toast('Nothing to export', 'warn', 'The current view has no records.');
        return;
      }
      const header = [
        'State',
        'Year',
        'Total Cases',
        'Deaths',
        'Recovered',
        'Active Cases',
        'Vaccinations',
        'Recovery Rate (%)',
        'Death Rate (%)',
      ];
      const lines = [header.join(',')];
      rows.forEach(function (r) {
        lines.push(
          [
            csvCell(r.state),
            r.year,
            r.cases,
            r.deaths,
            r.recovered,
            r.active,
            r.vaccinated,
            r.recoveryRate.toFixed(2),
            r.deathRate.toFixed(2),
          ].join(','),
        );
      });
      const f = state.filters;
      const name =
        'covid-dashboard-view_' +
        (f.year === 'all' ? 'all-years' : f.year) +
        '_' +
        (f.state === 'all' ? 'all-states' : f.state.toLowerCase().replace(/\s+/g, '-')) +
        '.csv';
      downloadFile(name, lines.join('\n'), 'text/csv;charset=utf-8;');
      toast('Exported ' + fmtInt(rows.length) + ' records', 'success', name);
    },
  };

  function csvCell(v) {
    const s = String(v === null || v === undefined ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function downloadFile(filename, text, mime) {
    const blob = new Blob(['\uFEFF' + text], { type: mime || 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1200);
  }

  function downloadTemplate() {
    const sample = state.dataset.length ? state.dataset : DEFAULT_DATASET.map(Calc.derive);
    const lines = ['State,Year,Cases,Deaths,Recovered,Vaccinated'];
    sample.slice(0, 9).forEach(function (r) {
      lines.push(
        [csvCell(r.state), r.year, r.cases, r.deaths, r.recovered, r.vaccinated].join(','),
      );
    });
    downloadFile('covid-dashboard-template.csv', lines.join('\n'), 'text/csv;charset=utf-8;');
    toast(
      'Template downloaded',
      'success',
      'covid-dashboard-template.csv — replace the sample rows with your data.',
    );
  }

  /* ==================================================================
     MODULE: INSIGHTS
     ================================================================== */
  const Insights = {
    build: function () {
      const rows = Calc.filtered();
      const out = [];
      if (!rows.length) {
        return [
          {
            icon: 'fa-circle-info',
            varName: '--accent',
            title: 'Nothing to summarise yet',
            text: 'The current filter combination returns no records. Reset the filters to bring the dataset back into view.',
          },
        ];
      }

      const t = Calc.total(rows);
      const scope = Calc.yearScope();
      const byYear = Calc.byYear(rows);
      const byState = Calc.byState(rows);
      const sortedYears = byYear.slice().sort(function (a, b) {
        return b.cases - a.cases;
      });
      const peak = sortedYears[0];

      if (peak) {
        let text =
          peak.year +
          ' carried the heaviest infection wave in this view: ' +
          fmtInt(peak.cases) +
          ' cases, or ' +
          fmtPct(safeDiv(peak.cases, t.cases) * 100) +
          ' of everything selected';
        if (sortedYears.length > 1) {
          const second = sortedYears[1];
          text +=
            ', which is ' +
            safeDiv(peak.cases, second.cases).toFixed(2) +
            '× the ' +
            second.year +
            ' total (' +
            fmtInt(second.cases) +
            ')';
        }
        text +=
          '. It also accounted for ' +
          fmtPct(safeDiv(peak.deaths, t.deaths) * 100) +
          ' of all deaths, at a ' +
          fmtPct(peak.deathRate) +
          ' case fatality rate.';
        out.push({
          icon: 'fa-arrow-trend-up',
          varName: '--c-cases',
          title: 'Peak wave: ' + peak.year,
          text: text,
        });
      }

      const bestRec = Calc.extremeBy(rows, 'recoveryRate', 'max');
      if (bestRec && byState.length > 1) {
        out.push({
          icon: 'fa-shield-heart',
          varName: '--c-recov',
          title: 'Best recovery rate: ' + bestRec.state,
          text:
            bestRec.state +
            ' closed ' +
            fmtPct(bestRec.recoveryRate) +
            ' of its ' +
            fmtInt(bestRec.cases) +
            ' cases — ' +
            Math.abs(bestRec.recoveryRate - t.recoveryRate).toFixed(2) +
            ' pp ' +
            (bestRec.recoveryRate >= t.recoveryRate ? 'above' : 'below') +
            ' the ' +
            fmtPct(t.recoveryRate) +
            ' average across this view. Its residual active caseload is ' +
            fmtInt(bestRec.active) +
            '.',
        });
      }

      const worstCFR = Calc.extremeBy(rows, 'deathRate', 'max');
      if (worstCFR && byState.length > 1) {
        out.push({
          icon: 'fa-heart-crack',
          varName: '--c-deaths',
          title: 'Highest mortality: ' + worstCFR.state,
          text:
            worstCFR.state +
            ' records the steepest case fatality rate at ' +
            fmtPct(worstCFR.deathRate) +
            ' — ' +
            Math.abs(worstCFR.deathRate - t.deathRate).toFixed(2) +
            ' pp above the ' +
            fmtPct(t.deathRate) +
            ' view average — with ' +
            fmtInt(worstCFR.deaths) +
            ' deaths from ' +
            fmtInt(worstCFR.cases) +
            ' cases. Only states with 1,000+ cases are eligible, so small samples cannot distort the ranking.',
        });
      }

      const vaxYears = byYear.filter(function (y) {
        return y.vaccinated > 0;
      });
      if (vaxYears.length >= 2) {
        const last = vaxYears[vaxYears.length - 1],
          prev = vaxYears[vaxYears.length - 2];
        const change = safeDiv(last.vaccinated - prev.vaccinated, prev.vaccinated) * 100,
          rising = change >= 0;
        out.push({
          icon: 'fa-syringe',
          varName: '--c-vax',
          title: 'Roll-out velocity ' + prev.year + ' → ' + last.year,
          text:
            'Doses ' +
            (rising ? 'rose' : 'fell') +
            ' ' +
            Math.abs(change).toFixed(1) +
            '% from ' +
            fmtInt(prev.vaccinated) +
            ' in ' +
            prev.year +
            ' to ' +
            fmtInt(last.vaccinated) +
            ' in ' +
            last.year +
            '. Cumulatively the view holds ' +
            fmtInt(t.vaccinated) +
            ' doses, ' +
            t.dosesPerCase.toFixed(1) +
            ' for every confirmed case' +
            (rising
              ? '.'
              : ' — consistent with a front-loaded primary-dose campaign followed by a lighter booster year.'),
        });
      } else if (vaxYears.length === 1) {
        out.push({
          icon: 'fa-syringe',
          varName: '--c-vax',
          title: 'Vaccination recorded in ' + vaxYears[0].year + ' only',
          text:
            'This view contains a single year with doses: ' +
            fmtInt(vaxYears[0].vaccinated) +
            ' administered in ' +
            vaxYears[0].year +
            '. Widen the year filter to measure roll-out velocity between years.',
        });
      } else {
        out.push({
          icon: 'fa-syringe',
          varName: '--c-vax',
          title: 'No doses in this view',
          text: "Every record selected reports zero vaccinations. India's programme began on 16 January 2021, so any 2020-only view is expected to be empty on this metric.",
        });
      }

      if (byState.length >= 3) {
        const top3 = Calc.rankStates(rows, 'cases').slice(0, 3);
        const top3Cases = top3.reduce(function (s, x) {
          return s + x.cases;
        }, 0);
        out.push({
          icon: 'fa-map-location-dot',
          varName: '--accent',
          title: 'Caseload is concentrated',
          text:
            top3
              .map(function (s) {
                return s.state;
              })
              .join(', ') +
            ' together hold ' +
            fmtPct(safeDiv(top3Cases, t.cases) * 100) +
            ' of all cases in this view (' +
            fmtInt(top3Cases) +
            ' of ' +
            fmtInt(t.cases) +
            ') while making up just ' +
            top3.length +
            ' of ' +
            byState.length +
            ' states — pandemic impact tracked urban density far more closely than it tracked geography.',
        });
      }

      if (byYear.length >= 2) {
        const deadliest = byYear.slice().sort(function (a, b) {
            return b.deaths - a.deaths;
          })[0],
          latest = byYear[byYear.length - 1];
        if (deadliest.year !== latest.year) {
          out.push({
            icon: 'fa-arrow-trend-down',
            varName: '--c-active',
            title: 'Cases and deaths decoupled by ' + latest.year,
            text:
              'Deaths peaked in ' +
              deadliest.year +
              ' at ' +
              fmtInt(deadliest.deaths) +
              ' (' +
              fmtPct(deadliest.deathRate) +
              ' CFR) and fell ' +
              Math.abs(safeDiv(latest.deaths - deadliest.deaths, deadliest.deaths) * 100).toFixed(
                1,
              ) +
              '% by ' +
              latest.year +
              ', to ' +
              fmtInt(latest.deaths) +
              ' (' +
              fmtPct(latest.deathRate) +
              ' CFR) — even though ' +
              latest.year +
              ' still reported ' +
              fmtInt(latest.cases) +
              ' cases.',
          });
        } else {
          out.push({
            icon: 'fa-chart-column',
            varName: '--c-active',
            title: 'Deaths tracked cases in ' + deadliest.year,
            text:
              deadliest.year +
              ' holds both the highest caseload and the highest death count in this view: ' +
              fmtInt(deadliest.cases) +
              ' cases and ' +
              fmtInt(deadliest.deaths) +
              ' deaths at a ' +
              fmtPct(deadliest.deathRate) +
              ' fatality rate.',
          });
        }
      }

      out.push({
        icon: 'fa-heart-pulse',
        varName: '--c-active',
        title: 'Unresolved caseload',
        text:
          fmtInt(t.active) +
          ' cases (' +
          fmtPct(safeDiv(t.active, t.cases) * 100) +
          ' of the total) were neither recovered nor fatal at the close of the reporting periods in view, computed as Cases − Deaths − Recovered across ' +
          fmtInt(t.records) +
          ' records.',
      });

      if (state.filters.state !== 'all') {
        const sel = state.filters.state,
          natScope = Calc.total(scope),
          rank = Calc.rankOf(scope, sel, 'cases');
        out.push({
          icon: 'fa-location-crosshairs',
          varName: '--accent',
          title: sel + ' in national context',
          text:
            sel +
            ' ranks ' +
            rank +
            ' of ' +
            Calc.uniqueStates(scope).length +
            ' states by cases, holding ' +
            fmtPct(safeDiv(t.cases, natScope.cases) * 100) +
            ' of the caseload and ' +
            fmtPct(safeDiv(t.deaths, natScope.deaths) * 100) +
            ' of the deaths in scope. Its ' +
            fmtPct(t.deathRate) +
            ' fatality rate compares with ' +
            fmtPct(natScope.deathRate) +
            ' across all states.',
        });
      }

      const rep = state.report;
      out.push({
        icon: 'fa-database',
        varName: '--accent',
        title: 'Dataset provenance',
        text:
          'Active dataset: ' +
          state.source +
          ' — ' +
          fmtInt(state.dataset.length) +
          ' validated records, ' +
          Calc.uniqueStates(state.dataset).length +
          ' states, ' +
          Calc.uniqueYears(state.dataset).join('–') +
          '. ' +
          (rep
            ? 'Last ingestion accepted ' +
              fmtInt(rep.counts.accepted) +
              ' of ' +
              fmtInt(rep.counts.input) +
              ' rows with ' +
              rep.errors.length +
              ' error' +
              (rep.errors.length === 1 ? '' : 's') +
              ' and ' +
              rep.warnings.length +
              ' warning' +
              (rep.warnings.length === 1 ? '' : 's') +
              '.'
            : ''),
      });
      return out;
    },

    render: function () {
      const host = $('insightsGrid');
      if (!host) return;
      const items = Insights.build();
      host.innerHTML = items
        .map(function (i) {
          return (
            '<article class="insight" style="--ins-accent:' +
            cssVar(i.varName) +
            '"><div class="flex items-start gap-2.5"><i class="fa-solid ' +
            i.icon +
            ' mt-0.5" style="color:' +
            cssVar(i.varName) +
            '"></i><div class="min-w-0"><h3 class="font-display font-semibold text-[.86rem] leading-snug">' +
            escapeHtml(i.title) +
            '</h3><p class="text-[.79rem] t-mid leading-relaxed mt-1.5">' +
            escapeHtml(i.text) +
            '</p></div></div></article>'
          );
        })
        .join('');
    },

    asText: function () {
      const f = state.filters,
        head =
          'COVID-19 Dashboard — automated insights\nScope: ' +
          (f.year === 'all' ? 'all years' : f.year) +
          ', ' +
          (f.state === 'all' ? 'all states' : f.state) +
          '\nSource: ' +
          state.source +
          '\n\n';
      return (
        head +
        Insights.build()
          .map(function (i, n) {
            return n + 1 + '. ' + i.title + '\n    ' + i.text;
          })
          .join('\n\n')
      );
    },
  };

  /* ==================================================================
     RENDERER: DATA STATUS BANNER & CONTROLLERS
     ================================================================== */
  const STATUS_LOOK = {
    pass: { icon: 'fa-circle-check', varName: '--c-recov', word: 'Pass' },
    partial: { icon: 'fa-triangle-exclamation', varName: '--c-active', word: 'Partial' },
    fail: { icon: 'fa-circle-exclamation', varName: '--c-deaths', word: 'Fail' },
    loading: { icon: 'fa-spinner fa-spin', varName: '--accent', word: '…' },
  };

  function paintStatusIcon(look) {
    const el = $('statusIcon');
    if (!el) return;
    el.innerHTML = '<i class="fa-solid ' + look.icon + '"></i>';
    el.style.color = cssVar(look.varName);
    el.style.background = withAlpha(cssVar(look.varName), 0.12);
  }

  function setStatusPending(title, message) {
    paintStatusIcon(STATUS_LOOK.loading);
    setText('statusTitle', title);
    setText('statusMessage', message);
    setText('statValidation', '…');
  }

  function renderStatus() {
    const ds = state.dataset,
      years = Calc.uniqueYears(ds);
    setText('statRecords', fmtInt(ds.length));
    setText('statStates', String(Calc.uniqueStates(ds).length));
    setText(
      'statYears',
      years.length
        ? years.length === 1
          ? String(years[0])
          : years[0] + '–' + years[years.length - 1]
        : '—',
    );
    setText('statSource', state.source);

    const rep = state.report;
    if (!rep) return;
    const look = STATUS_LOOK[rep.status] || STATUS_LOOK.fail;
    paintStatusIcon(look);
    const valEl = $('statValidation');
    if (valEl) {
      valEl.textContent = look.word;
      valEl.style.color = cssVar(look.varName);
    }

    if (rep.status === 'pass') {
      setText('statusTitle', 'Validation passed');
      setText(
        'statusMessage',
        'All ' +
          fmtInt(rep.counts.accepted) +
          ' rows match the required schema. ' +
          Calc.uniqueStates(ds).length +
          ' states across ' +
          years.length +
          ' year' +
          (years.length === 1 ? '' : 's') +
          ' are live in every module below.',
      );
    } else if (rep.status === 'partial') {
      setText('statusTitle', 'Loaded with notes');
      setText(
        'statusMessage',
        fmtInt(rep.counts.accepted) +
          ' of ' +
          fmtInt(rep.counts.input) +
          ' rows loaded · ' +
          fmtInt(rep.counts.rejected) +
          ' rejected · ' +
          fmtInt(rep.counts.flagged) +
          ' flagged. Open the issue list for the row numbers.',
      );
    } else {
      setText('statusTitle', 'Validation failed');
      setText(
        'statusMessage',
        (rep.errors[0] || 'The file did not match the schema.') +
          (ds.length ? ' The previous dataset is still on screen.' : ''),
      );
    }

    const issues = rep.errors
      .map(function (e) {
        return { type: 'error', text: e };
      })
      .concat(
        rep.warnings.map(function (w) {
          return { type: 'warn', text: w };
        }),
      );
    const btn = $('validationToggle'),
      list = $('validationList'),
      wrap = $('validationWrap');
    if (!btn || !list || !wrap) return;

    if (!issues.length) {
      btn.classList.add('hidden');
      wrap.classList.remove('open');
      list.innerHTML = '';
      return;
    }
    btn.classList.remove('hidden');
    setText('validationCount', String(issues.length));
    list.innerHTML = issues
      .map(function (i) {
        const c = cssVar(i.type === 'error' ? '--c-deaths' : '--c-active');
        return (
          '<li class="flex gap-2"><i class="fa-solid ' +
          (i.type === 'error' ? 'fa-circle-xmark' : 'fa-triangle-exclamation') +
          ' mt-0.5 flex-none" style="color:' +
          c +
          '"></i><span class="t-mid">' +
          escapeHtml(i.text) +
          '</span></li>'
        );
      })
      .join('');
  }

  function populateFilterOptions() {
    const years = Calc.uniqueYears(state.dataset).map(String),
      states = Calc.uniqueStates(state.dataset);
    const ySel = $('filterYear');
    if (ySel) {
      const cur = String(state.filters.year);
      ySel.innerHTML =
        '<option value="all">All years</option>' +
        years
          .map(function (y) {
            return '<option value="' + y + '">' + y + '</option>';
          })
          .join('');
      state.filters.year = cur !== 'all' && years.indexOf(cur) !== -1 ? cur : 'all';
      ySel.value = state.filters.year;
    }
    const sSel = $('filterState');
    if (sSel) {
      const cur = state.filters.state;
      sSel.innerHTML =
        '<option value="all">All states</option>' +
        states
          .map(function (s) {
            return '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>';
          })
          .join('');
      state.filters.state = cur !== 'all' && states.indexOf(cur) !== -1 ? cur : 'all';
      sSel.value = state.filters.state;
    }
    const mSel = $('filterMetric');
    if (mSel) mSel.value = state.filters.metric;
    const optionHtml = states
      .map(function (s) {
        return '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>';
      })
      .join('');
    ['compareA', 'compareB'].forEach(function (id) {
      const el = $(id);
      if (el) el.innerHTML = optionHtml;
    });
    const rowSel = $('rowsPerPage');
    if (rowSel) rowSel.value = String(state.table.perPage);
  }

  function applyDataset(report, opts) {
    const o = opts || {};
    state.dataset = report.rows;
    state.source = report.source;
    state.report = report;
    if (o.resetFilters) {
      state.filters = { year: 'all', state: 'all', metric: 'cases' };
      state.table.search = '';
      state.table.sortKey = 'cases';
      state.table.sortDir = 'desc';
      const searchEl = $('tableSearch');
      if (searchEl) searchEl.value = '';
    }
    state.table.page = 1;
    populateFilterOptions();
    const ranked = Calc.rankStates(state.dataset, 'cases');
    if (ranked.length) {
      state.compare.a = ranked[0].state;
      state.compare.b = (ranked[1] || ranked[0]).state;
    }
    renderAll();
  }

  function loadDefaultDataset(resetFilters, label) {
    const report = Validator.validate(
      DEFAULT_DATASET,
      label || 'Embedded baseline dataset (36 States & UTs · 2020–2022)',
    );
    applyDataset(report, { resetFilters: !!resetFilters });
    return report;
  }

  function handleFile(file) {
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
      paintStatusIcon(STATUS_LOOK.fail);
      setText('statusTitle', 'Unsupported file type');
      setText(
        'statusMessage',
        '"' + file.name + '" is not a spreadsheet. Use a .csv, .xlsx or .xls file.',
      );
      toast('That file type is not supported', 'error', 'Choose a .csv, .xlsx or .xls file.');
      return;
    }
    setStatusPending('Reading ' + file.name, 'Parsing the first sheet with SheetJS…');
    Parser.read(file)
      .then(function (res) {
        const label = file.name + (res.sheetCount > 1 ? ' · sheet "' + res.sheet + '"' : '');
        const report = Validator.validate(res.rows, label);
        if (!report.ok) {
          state.report = report;
          renderStatus();
          const wrap = $('validationWrap');
          if (wrap) wrap.classList.add('open');
          toast('Upload rejected', 'error', report.errors[0] || 'No row passed validation.');
          return;
        }
        applyDataset(report, { resetFilters: true });
        if (report.status === 'partial') {
          toast(
            'Loaded ' +
              fmtInt(report.counts.accepted) +
              ' of ' +
              fmtInt(report.counts.input) +
              ' rows',
            'warn',
            fmtInt(report.counts.rejected) +
              ' rejected, ' +
              report.warnings.length +
              ' flagged — see the issue list.',
          );
        } else {
          toast(
            'Loaded ' + fmtInt(report.counts.accepted) + ' records',
            'success',
            Calc.uniqueStates(report.rows).length +
              ' states · ' +
              Calc.uniqueYears(report.rows).join(', '),
          );
        }
      })
      .catch(function (err) {
        paintStatusIcon(STATUS_LOOK.fail);
        setText('statusTitle', 'Could not read the file');
        setText(
          'statusMessage',
          (err && err.message ? err.message : 'Unknown parsing error') +
            ' The previous dataset is still on screen.',
        );
        toast(
          'Could not read the file',
          'error',
          err && err.message ? err.message : 'Try re-saving it as CSV.',
        );
      });
  }

  /* ==================================================================
     RENDER ORCHESTRATION 
     ================================================================== */
  function renderCharts() {
    renderMap();
    renderYearTrend();
    renderStateImpact();
    renderVaccination();
    renderOutcome();
    renderDeepDive();
    renderComparison();
  }
  function renderAll() {
    renderStatus();
    renderKPIs();
    renderCharts();
    TableManager.render();
    Insights.render();
  }

  function setFilter(key, value) {
    if (!(key in state.filters)) return;
    state.filters[key] = value;
    state.table.page = 1;
    const map = { year: 'filterYear', state: 'filterState', metric: 'filterMetric' };
    const el = $(map[key]);
    if (el) el.value = value;
    renderAll();
    if (key === 'state' && value !== 'all') {
      const target = $('deep-dive');
      if (target && target.getBoundingClientRect().top < -200) {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    }
  }

  function resetFilters() {
    state.filters = { year: 'all', state: 'all', metric: 'cases' };
    state.table.search = '';
    state.table.page = 1;
    state.table.sortKey = 'cases';
    state.table.sortDir = 'desc';
    state.vaxView = 'year';
    const s = $('tableSearch');
    if (s) s.value = '';
    populateFilterOptions();
    renderAll();
    toast('Filters reset', 'info', 'Showing all ' + fmtInt(state.dataset.length) + ' records.');
  }

  function copyInsights() {
    const text = Insights.asText();
    const done = function () {
      toast('Insights copied', 'success', 'Paste them straight into your report.');
    };
    const fallback = function () {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }
      document.body.removeChild(ta);
      if (ok) done();
      else
        toast(
          'The browser blocked copying',
          'warn',
          'Select the insight cards and copy them manually.',
        );
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else {
      fallback();
    }
  }

  function setTheme(theme, opts) {
    state.theme = theme === 'light' ? 'light' : 'dark';
    const isDark = state.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    const icon = $('themeIcon');
    if (icon) icon.className = 'fa-solid ' + (isDark ? 'fa-moon' : 'fa-sun');
    setText('themeLabel', isDark ? 'Dark' : 'Light');
    const tg = $('themeToggle');
    if (tg) tg.setAttribute('aria-checked', isDark ? 'true' : 'false');
    store.set('covid-dashboard-theme', state.theme);
    ChartManager.applyTheme();
    if (state.booted && !(opts && opts.silent)) renderAll();
  }

  // ATTACH TO GLOBAL APP OBJECT SO EVENTS.JS CAN REACH THEM
  Object.assign(App, {
    ChartManager,
    renderMap,
    renderKPIs,
    renderYearTrend,
    renderStateImpact,
    renderVaccination,
    renderOutcome,
    renderDeepDive,
    renderComparison,
    TableManager,
    downloadFile,
    downloadTemplate,
    Insights,
    paintStatusIcon,
    setStatusPending,
    renderStatus,
    populateFilterOptions,
    applyDataset,
    loadDefaultDataset,
    handleFile,
    renderCharts,
    renderAll,
    setFilter,
    resetFilters,
    copyInsights,
    setTheme,
    STATUS_LOOK,
  });
})(window.App);
