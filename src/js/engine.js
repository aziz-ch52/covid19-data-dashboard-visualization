/* ==================================================================
   COVID-19 DASHBOARD - CORE ENGINE (engine.js)
   Handles state, dataset initialization, validation, and calculations.
   MUST BE LOADED FIRST IN YOUR HTML.
   ================================================================== */

window.App = window.App || {};

Object.assign(
  window.App,
  (function () {
    'use strict';

    /* ------------------------------------------------------------------
     EMBEDDED FALLBACK DATASET (All 36 States & UTs of India)
     ------------------------------------------------------------------ */
    const DEFAULT_DATASET = [
      {
        state: 'Andaman and Nicobar Islands',
        year: 2020,
        cases: 4941,
        deaths: 62,
        recovered: 4820,
        vaccinated: 0,
      },
      {
        state: 'Andaman and Nicobar Islands',
        year: 2021,
        cases: 7720,
        deaths: 129,
        recovered: 7582,
        vaccinated: 592837,
      },
      {
        state: 'Andaman and Nicobar Islands',
        year: 2022,
        cases: 10746,
        deaths: 129,
        recovered: 10612,
        vaccinated: 991263,
      },
      {
        state: 'Andhra Pradesh',
        year: 2020,
        cases: 881948,
        deaths: 7104,
        recovered: 871588,
        vaccinated: 0,
      },
      {
        state: 'Andhra Pradesh',
        year: 2021,
        cases: 2076979,
        deaths: 14493,
        recovered: 2061405,
        vaccinated: 68894212,
      },
      {
        state: 'Andhra Pradesh',
        year: 2022,
        cases: 2349069,
        deaths: 14733,
        recovered: 2324332,
        vaccinated: 110655938,
      },
      {
        state: 'Arunachal Pradesh',
        year: 2020,
        cases: 16711,
        deaths: 56,
        recovered: 16549,
        vaccinated: 0,
      },
      {
        state: 'Arunachal Pradesh',
        year: 2021,
        cases: 55339,
        deaths: 280,
        recovered: 55038,
        vaccinated: 1461358,
      },
      {
        state: 'Arunachal Pradesh',
        year: 2022,
        cases: 66890,
        deaths: 296,
        recovered: 66594,
        vaccinated: 1923512,
      },
      { state: 'Assam', year: 2020, cases: 216139, deaths: 1043, recovered: 211838, vaccinated: 0 },
      {
        state: 'Assam',
        year: 2021,
        cases: 620573,
        deaths: 6164,
        recovered: 612282,
        vaccinated: 37549618,
      },
      {
        state: 'Assam',
        year: 2022,
        cases: 746100,
        deaths: 8035,
        recovered: 738065,
        vaccinated: 50325492,
      },
      { state: 'Bihar', year: 2020, cases: 251348, deaths: 1393, recovered: 245156, vaccinated: 0 },
      {
        state: 'Bihar',
        year: 2021,
        cases: 726738,
        deaths: 12096,
        recovered: 714308,
        vaccinated: 99824631,
      },
      {
        state: 'Bihar',
        year: 2022,
        cases: 851388,
        deaths: 12302,
        recovered: 839062,
        vaccinated: 157252874,
      },
      {
        state: 'Chandigarh',
        year: 2020,
        cases: 19682,
        deaths: 316,
        recovered: 18967,
        vaccinated: 0,
      },
      {
        state: 'Chandigarh',
        year: 2021,
        cases: 65846,
        deaths: 1079,
        recovered: 64638,
        vaccinated: 1923051,
      },
      {
        state: 'Chandigarh',
        year: 2022,
        cases: 99349,
        deaths: 1181,
        recovered: 98162,
        vaccinated: 2289417,
      },
      {
        state: 'Chhattisgarh',
        year: 2020,
        cases: 278540,
        deaths: 3350,
        recovered: 263251,
        vaccinated: 0,
      },
      {
        state: 'Chhattisgarh',
        year: 2021,
        cases: 1007997,
        deaths: 13600,
        recovered: 993800,
        vaccinated: 31698374,
      },
      {
        state: 'Chhattisgarh',
        year: 2022,
        cases: 1177754,
        deaths: 14146,
        recovered: 1163602,
        vaccinated: 49157832,
      },
      {
        state: 'Dadra and Nagar Haveli and Daman and Diu',
        year: 2020,
        cases: 3375,
        deaths: 2,
        recovered: 3364,
        vaccinated: 0,
      },
      {
        state: 'Dadra and Nagar Haveli and Daman and Diu',
        year: 2021,
        cases: 10691,
        deaths: 4,
        recovered: 10687,
        vaccinated: 1294822,
      },
      {
        state: 'Dadra and Nagar Haveli and Daman and Diu',
        year: 2022,
        cases: 11591,
        deaths: 4,
        recovered: 11587,
        vaccinated: 1582914,
      },
      {
        state: 'Delhi',
        year: 2020,
        cases: 624795,
        deaths: 10523,
        recovered: 608434,
        vaccinated: 0,
      },
      {
        state: 'Delhi',
        year: 2021,
        cases: 1446415,
        deaths: 25107,
        recovered: 1418227,
        vaccinated: 26183944,
      },
      {
        state: 'Delhi',
        year: 2022,
        cases: 2007208,
        deaths: 26521,
        recovered: 1980657,
        vaccinated: 37402619,
      },
      { state: 'Goa', year: 2020, cases: 50981, deaths: 737, recovered: 49313, vaccinated: 0 },
      {
        state: 'Goa',
        year: 2021,
        cases: 180660,
        deaths: 3521,
        recovered: 176283,
        vaccinated: 2589341,
      },
      {
        state: 'Goa',
        year: 2022,
        cases: 263084,
        deaths: 4013,
        recovered: 255050,
        vaccinated: 2874312,
      },
      {
        state: 'Gujarat',
        year: 2020,
        cases: 244258,
        deaths: 4302,
        recovered: 229977,
        vaccinated: 0,
      },
      {
        state: 'Gujarat',
        year: 2021,
        cases: 831078,
        deaths: 10118,
        recovered: 818589,
        vaccinated: 89563214,
      },
      {
        state: 'Gujarat',
        year: 2022,
        cases: 1277569,
        deaths: 11043,
        recovered: 1266479,
        vaccinated: 128084122,
      },
      {
        state: 'Haryana',
        year: 2020,
        cases: 262054,
        deaths: 2899,
        recovered: 255356,
        vaccinated: 0,
      },
      {
        state: 'Haryana',
        year: 2021,
        cases: 773361,
        deaths: 10063,
        recovered: 762228,
        vaccinated: 34493121,
      },
      {
        state: 'Haryana',
        year: 2022,
        cases: 1056611,
        deaths: 10714,
        recovered: 1045854,
        vaccinated: 45542894,
      },
      {
        state: 'Himachal Pradesh',
        year: 2020,
        cases: 55114,
        deaths: 931,
        recovered: 51387,
        vaccinated: 0,
      },
      {
        state: 'Himachal Pradesh',
        year: 2021,
        cases: 228770,
        deaths: 3875,
        recovered: 224465,
        vaccinated: 11342911,
      },
      {
        state: 'Himachal Pradesh',
        year: 2022,
        cases: 312647,
        deaths: 4213,
        recovered: 308418,
        vaccinated: 15328491,
      },
      {
        state: 'Jammu and Kashmir',
        year: 2020,
        cases: 120744,
        deaths: 1880,
        recovered: 115830,
        vaccinated: 0,
      },
      {
        state: 'Jammu and Kashmir',
        year: 2021,
        cases: 341167,
        deaths: 4526,
        recovered: 335347,
        vaccinated: 18563122,
      },
      {
        state: 'Jammu and Kashmir',
        year: 2022,
        cases: 479417,
        deaths: 4785,
        recovered: 474610,
        vaccinated: 24784912,
      },
      {
        state: 'Jharkhand',
        year: 2020,
        cases: 114873,
        deaths: 1027,
        recovered: 112206,
        vaccinated: 0,
      },
      {
        state: 'Jharkhand',
        year: 2021,
        cases: 350986,
        deaths: 5143,
        recovered: 344472,
        vaccinated: 29894213,
      },
      {
        state: 'Jharkhand',
        year: 2022,
        cases: 443571,
        deaths: 5331,
        recovered: 437238,
        vaccinated: 43892014,
      },
      {
        state: 'Karnataka',
        year: 2020,
        cases: 918544,
        deaths: 12081,
        recovered: 894834,
        vaccinated: 0,
      },
      {
        state: 'Karnataka',
        year: 2021,
        cases: 3006505,
        deaths: 38327,
        recovered: 2959926,
        vaccinated: 81294155,
      },
      {
        state: 'Karnataka',
        year: 2022,
        cases: 4076670,
        deaths: 40307,
        recovered: 4030363,
        vaccinated: 122158913,
      },
      {
        state: 'Kerala',
        year: 2020,
        cases: 755718,
        deaths: 3042,
        recovered: 687104,
        vaccinated: 0,
      },
      {
        state: 'Kerala',
        year: 2021,
        cases: 5244501,
        deaths: 47441,
        recovered: 5176535,
        vaccinated: 46894231,
      },
      {
        state: 'Kerala',
        year: 2022,
        cases: 6828376,
        deaths: 71555,
        recovered: 6755401,
        vaccinated: 57523914,
      },
      { state: 'Ladakh', year: 2020, cases: 9447, deaths: 127, recovered: 9132, vaccinated: 0 },
      {
        state: 'Ladakh',
        year: 2021,
        cases: 22173,
        deaths: 219,
        recovered: 21750,
        vaccinated: 432912,
      },
      {
        state: 'Ladakh',
        year: 2022,
        cases: 29412,
        deaths: 231,
        recovered: 29178,
        vaccinated: 569314,
      },
      { state: 'Lakshadweep', year: 2020, cases: 0, deaths: 0, recovered: 0, vaccinated: 0 },
      {
        state: 'Lakshadweep',
        year: 2021,
        cases: 10416,
        deaths: 51,
        recovered: 10361,
        vaccinated: 102941,
      },
      {
        state: 'Lakshadweep',
        year: 2022,
        cases: 11415,
        deaths: 52,
        recovered: 11363,
        vaccinated: 142358,
      },
      {
        state: 'Madhya Pradesh',
        year: 2020,
        cases: 240947,
        deaths: 3595,
        recovered: 227965,
        vaccinated: 0,
      },
      {
        state: 'Madhya Pradesh',
        year: 2021,
        cases: 793888,
        deaths: 10533,
        recovered: 782995,
        vaccinated: 102894121,
      },
      {
        state: 'Madhya Pradesh',
        year: 2022,
        cases: 1054919,
        deaths: 10776,
        recovered: 1044138,
        vaccinated: 153928415,
      },
      {
        state: 'Maharashtra',
        year: 2020,
        cases: 1928603,
        deaths: 49463,
        recovered: 1824934,
        vaccinated: 0,
      },
      {
        state: 'Maharashtra',
        year: 2021,
        cases: 6670754,
        deaths: 141518,
        recovered: 6507330,
        vaccinated: 132941258,
      },
      {
        state: 'Maharashtra',
        year: 2022,
        cases: 8136633,
        deaths: 148417,
        recovered: 7988044,
        vaccinated: 177924155,
      },
      { state: 'Manipur', year: 2020, cases: 28137, deaths: 354, recovered: 26601, vaccinated: 0 },
      {
        state: 'Manipur',
        year: 2021,
        cases: 125778,
        deaths: 2002,
        recovered: 123586,
        vaccinated: 2314911,
      },
      {
        state: 'Manipur',
        year: 2022,
        cases: 139922,
        deaths: 2149,
        recovered: 137773,
        vaccinated: 3267914,
      },
      {
        state: 'Meghalaya',
        year: 2020,
        cases: 13408,
        deaths: 139,
        recovered: 13085,
        vaccinated: 0,
      },
      {
        state: 'Meghalaya',
        year: 2021,
        cases: 84817,
        deaths: 1484,
        recovered: 83272,
        vaccinated: 2194125,
      },
      {
        state: 'Meghalaya',
        year: 2022,
        cases: 96783,
        deaths: 1624,
        recovered: 95158,
        vaccinated: 2624911,
      },
      { state: 'Mizoram', year: 2020, cases: 4204, deaths: 8, recovered: 4091, vaccinated: 0 },
      {
        state: 'Mizoram',
        year: 2021,
        cases: 141400,
        deaths: 542,
        recovered: 139200,
        vaccinated: 1324911,
      },
      {
        state: 'Mizoram',
        year: 2022,
        cases: 238964,
        deaths: 726,
        recovered: 238238,
        vaccinated: 1793512,
      },
      { state: 'Nagaland', year: 2020, cases: 11921, deaths: 79, recovered: 11624, vaccinated: 0 },
      {
        state: 'Nagaland',
        year: 2021,
        cases: 32191,
        deaths: 702,
        recovered: 31420,
        vaccinated: 1342158,
      },
      {
        state: 'Nagaland',
        year: 2022,
        cases: 35986,
        deaths: 782,
        recovered: 35204,
        vaccinated: 1739241,
      },
      {
        state: 'Odisha',
        year: 2020,
        cases: 329306,
        deaths: 1871,
        recovered: 325103,
        vaccinated: 0,
      },
      {
        state: 'Odisha',
        year: 2021,
        cases: 1054606,
        deaths: 8458,
        recovered: 1044594,
        vaccinated: 50294155,
      },
      {
        state: 'Odisha',
        year: 2022,
        cases: 1336563,
        deaths: 9205,
        recovered: 1327264,
        vaccinated: 81523912,
      },
      {
        state: 'Puducherry',
        year: 2020,
        cases: 38096,
        deaths: 633,
        recovered: 37100,
        vaccinated: 0,
      },
      {
        state: 'Puducherry',
        year: 2021,
        cases: 129461,
        deaths: 1881,
        recovered: 127452,
        vaccinated: 1389412,
      },
      {
        state: 'Puducherry',
        year: 2022,
        cases: 175512,
        deaths: 1975,
        recovered: 173530,
        vaccinated: 2274911,
      },
      {
        state: 'Punjab',
        year: 2020,
        cases: 166239,
        deaths: 5331,
        recovered: 157043,
        vaccinated: 0,
      },
      {
        state: 'Punjab',
        year: 2021,
        cases: 604594,
        deaths: 16644,
        recovered: 587368,
        vaccinated: 26594213,
      },
      {
        state: 'Punjab',
        year: 2022,
        cases: 784210,
        deaths: 19289,
        recovered: 764878,
        vaccinated: 47023915,
      },
      {
        state: 'Rajasthan',
        year: 2020,
        cases: 307554,
        deaths: 2689,
        recovered: 295030,
        vaccinated: 0,
      },
      {
        state: 'Rajasthan',
        year: 2021,
        cases: 956019,
        deaths: 8963,
        recovered: 946283,
        vaccinated: 80941255,
      },
      {
        state: 'Rajasthan',
        year: 2022,
        cases: 1315466,
        deaths: 9653,
        recovered: 1305740,
        vaccinated: 115421392,
      },
      { state: 'Sikkim', year: 2020, cases: 5877, deaths: 127, recovered: 5218, vaccinated: 0 },
      {
        state: 'Sikkim',
        year: 2021,
        cases: 32502,
        deaths: 409,
        recovered: 32032,
        vaccinated: 1029314,
      },
      {
        state: 'Sikkim',
        year: 2022,
        cases: 44319,
        deaths: 499,
        recovered: 43819,
        vaccinated: 1362914,
      },
      {
        state: 'Tamil Nadu',
        year: 2020,
        cases: 817077,
        deaths: 12109,
        recovered: 796353,
        vaccinated: 0,
      },
      {
        state: 'Tamil Nadu',
        year: 2021,
        cases: 2746890,
        deaths: 36765,
        recovered: 2703196,
        vaccinated: 81563212,
      },
      {
        state: 'Tamil Nadu',
        year: 2022,
        cases: 3595415,
        deaths: 38049,
        recovered: 3556292,
        vaccinated: 127542911,
      },
      {
        state: 'Telangana',
        year: 2020,
        cases: 286354,
        deaths: 1541,
        recovered: 278839,
        vaccinated: 0,
      },
      {
        state: 'Telangana',
        year: 2021,
        cases: 681587,
        deaths: 4025,
        recovered: 673999,
        vaccinated: 47894213,
      },
      {
        state: 'Telangana',
        year: 2022,
        cases: 841839,
        deaths: 4111,
        recovered: 837162,
        vaccinated: 77542912,
      },
      { state: 'Tripura', year: 2020, cases: 33264, deaths: 385, recovered: 32751, vaccinated: 0 },
      {
        state: 'Tripura',
        year: 2021,
        cases: 85069,
        deaths: 829,
        recovered: 84145,
        vaccinated: 4912458,
      },
      {
        state: 'Tripura',
        year: 2022,
        cases: 108034,
        deaths: 940,
        recovered: 107094,
        vaccinated: 5912458,
      },
      {
        state: 'Uttar Pradesh',
        year: 2020,
        cases: 584966,
        deaths: 8352,
        recovered: 562459,
        vaccinated: 0,
      },
      {
        state: 'Uttar Pradesh',
        year: 2021,
        cases: 1711359,
        deaths: 22915,
        recovered: 1687799,
        vaccinated: 200854213,
      },
      {
        state: 'Uttar Pradesh',
        year: 2022,
        cases: 2128104,
        deaths: 23633,
        recovered: 2104432,
        vaccinated: 392014913,
      },
      {
        state: 'Uttarakhand',
        year: 2020,
        cases: 90616,
        deaths: 1504,
        recovered: 84149,
        vaccinated: 0,
      },
      {
        state: 'Uttarakhand',
        year: 2021,
        cases: 344940,
        deaths: 7417,
        recovered: 337268,
        vaccinated: 13842155,
      },
      {
        state: 'Uttarakhand',
        year: 2022,
        cases: 449389,
        deaths: 7751,
        recovered: 441610,
        vaccinated: 20124912,
      },
      {
        state: 'West Bengal',
        year: 2020,
        cases: 550893,
        deaths: 9683,
        recovered: 528829,
        vaccinated: 0,
      },
      {
        state: 'West Bengal',
        year: 2021,
        cases: 1635034,
        deaths: 19757,
        recovered: 1606501,
        vaccinated: 104291458,
      },
      {
        state: 'West Bengal',
        year: 2022,
        cases: 2118617,
        deaths: 21532,
        recovered: 2097026,
        vaccinated: 156024915,
      },
    ];

    const HC_STATE_MAP = {
      'Andaman and Nicobar Islands': 'in-an',
      'Andaman and Nicobar': 'in-an',
      'Andhra Pradesh': 'in-ap',
      'Arunachal Pradesh': 'in-ar',
      Assam: 'in-as',
      Bihar: 'in-br',
      Chandigarh: 'in-ch',
      Chhattisgarh: 'in-ct',
      'Dadra and Nagar Haveli': 'in-dn',
      'Daman and Diu': 'in-dn',
      'Dadra and Nagar Haveli and Daman and Diu': 'in-dn',
      Delhi: 'in-dl',
      Goa: 'in-ga',
      Gujarat: 'in-gj',
      Haryana: 'in-hr',
      'Himachal Pradesh': 'in-hp',
      'Jammu and Kashmir': 'in-jk',
      Jharkhand: 'in-jh',
      Karnataka: 'in-ka',
      Kerala: 'in-kl',
      Lakshadweep: 'in-ld',
      'Madhya Pradesh': 'in-mp',
      Maharashtra: 'in-mh',
      Manipur: 'in-mn',
      Meghalaya: 'in-ml',
      Mizoram: 'in-mz',
      Nagaland: 'in-nl',
      Odisha: 'in-or',
      Puducherry: 'in-py',
      Punjab: 'in-pb',
      Rajasthan: 'in-rj',
      Sikkim: 'in-sk',
      'Tamil Nadu': 'in-tn',
      Telangana: 'in-tg',
      Tripura: 'in-tr',
      'Uttar Pradesh': 'in-up',
      Uttarakhand: 'in-ut',
      'West Bengal': 'in-wb',
    };

    const METRICS = {
      cases: {
        key: 'cases',
        label: 'Cases',
        noun: 'confirmed cases',
        varName: '--c-cases',
        icon: 'fa-virus-covid',
      },
      deaths: {
        key: 'deaths',
        label: 'Deaths',
        noun: 'deaths',
        varName: '--c-deaths',
        icon: 'fa-heart-crack',
      },
      recovered: {
        key: 'recovered',
        label: 'Recoveries',
        noun: 'recoveries',
        varName: '--c-recov',
        icon: 'fa-shield-heart',
      },
      vaccinated: {
        key: 'vaccinated',
        label: 'Vaccinations',
        noun: 'doses',
        varName: '--c-vax',
        icon: 'fa-syringe',
      },
    };

    const state = {
      dataset: [],
      source: 'Embedded baseline dataset',
      report: null,
      filters: { year: 'all', state: 'all', metric: 'cases' },
      table: { search: '', sortKey: 'cases', sortDir: 'desc', page: 1, perPage: 10 },
      compare: { a: '', b: '', logScale: true },
      vaxView: 'year',
      theme: 'dark',
      booted: false,
    };

    /* ==================================================================
     UTILITIES
     ================================================================== */
    const $ = (id) => document.getElementById(id);
    const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
    const reduceMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function toNumber(v) {
      if (typeof v === 'number') return isFinite(v) ? v : NaN;
      if (v === null || v === undefined) return NaN;
      const s = String(v).trim().replace(/,/g, '').replace(/%$/, '').replace(/\s+/g, '');
      if (s === '') return NaN;
      if (!/^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(s)) return NaN;
      return Number(s);
    }

    function safeDiv(a, b) {
      return !b || !isFinite(b) || b === 0 ? 0 : a / b;
    }

    function fmtInt(n) {
      const v = Math.round(Number(n) || 0);
      try {
        return v.toLocaleString('en-IN');
      } catch (e) {
        return String(v);
      }
    }

    function fmtCompact(n) {
      const v = Math.abs(Number(n) || 0);
      const sign = (Number(n) || 0) < 0 ? '-' : '';
      if (v >= 1e7) return sign + (v / 1e7).toFixed(v >= 1e8 ? 1 : 2) + ' Cr';
      if (v >= 1e5) return sign + (v / 1e5).toFixed(v >= 1e6 ? 1 : 2) + ' L';
      if (v >= 1e3) return sign + (v / 1e3).toFixed(1) + 'K';
      return sign + String(Math.round(v));
    }

    function fmtPct(v, dp) {
      return (Number(v) || 0).toFixed(dp === undefined ? 2 : dp) + '%';
    }

    function fmtSigned(n) {
      return (n > 0 ? '+' : '') + fmtInt(n);
    }

    function cssVar(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#64748b';
    }

    function withAlpha(hex, alpha) {
      const h = String(hex).replace('#', '').trim();
      if (h.length !== 6) return hex;
      const r = parseInt(h.slice(0, 2), 16),
        g = parseInt(h.slice(2, 4), 16),
        b = parseInt(h.slice(4, 6), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    function metricColor(key) {
      return cssVar((METRICS[key] || METRICS.cases).varName);
    }

    function debounce(fn, ms) {
      let t;
      return function () {
        const args = arguments,
          ctx = this;
        clearTimeout(t);
        t = setTimeout(function () {
          fn.apply(ctx, args);
        }, ms);
      };
    }

    function titleCase(s) {
      return String(s)
        .toLowerCase()
        .replace(/\b([a-z])/g, function (m, c) {
          return c.toUpperCase();
        });
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    const memoryStore = {};
    const store = {
      get: function (k) {
        try {
          return window.localStorage.getItem(k);
        } catch (e) {
          return memoryStore[k] || null;
        }
      },
      set: function (k, v) {
        try {
          window.localStorage.setItem(k, v);
        } catch (e) {
          memoryStore[k] = v;
        }
      },
    };

    const TOAST_STYLES = {
      success: { icon: 'fa-circle-check', varName: '--c-recov' },
      error: { icon: 'fa-circle-exclamation', varName: '--c-deaths' },
      warn: { icon: 'fa-triangle-exclamation', varName: '--c-active' },
      info: { icon: 'fa-circle-info', varName: '--accent' },
    };

    function toast(message, type, detail) {
      const host = $('toastHost');
      if (!host) return;
      const cfg = TOAST_STYLES[type] || TOAST_STYLES.info;
      const el = document.createElement('div');
      el.className = 'toast';
      el.style.borderLeftColor = cssVar(cfg.varName);
      el.innerHTML =
        '<i class="fa-solid ' +
        cfg.icon +
        ' mt-0.5" style="color:' +
        cssVar(cfg.varName) +
        '"></i>' +
        '<div class="min-w-0"><p class="font-semibold text-[.8rem]">' +
        escapeHtml(message) +
        '</p>' +
        (detail
          ? '<p class="t-muted text-[.74rem] mt-0.5 leading-snug">' + escapeHtml(detail) + '</p>'
          : '') +
        '</div>';
      host.appendChild(el);
      setTimeout(
        function () {
          el.classList.add('out');
          setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
          }, 240);
        },
        type === 'error' ? 6200 : 4200,
      );
    }

    function animateValue(el, to, formatter, duration) {
      if (!el) return;
      const fmt = formatter || fmtInt;
      const target = Number(to) || 0;
      const from = Number(el.dataset.raw || 0);
      el.dataset.raw = String(target);
      if (reduceMotion || from === target) {
        el.textContent = fmt(target);
        return;
      }
      const dur = duration || 780;
      const start = performance.now();
      function step(now) {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(from + (target - from) * eased);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = fmt(target);
      }
      requestAnimationFrame(step);
    }

    function setText(id, text) {
      const el = $(id);
      if (el) el.textContent = text;
    }

    function setWidth(id, pct) {
      const el = $(id);
      if (el) el.style.width = Math.max(0, Math.min(100, Number(pct) || 0)) + '%';
    }

    /* ==================================================================
     MODULE: PARSER
     ================================================================== */
    const Parser = {
      REQUIRED: ['state', 'year', 'cases', 'deaths', 'recovered', 'vaccinated'],
      ALIASES: {
        state: [
          'state',
          'statename',
          'states',
          'stateut',
          'statesut',
          'stateunionterritory',
          'statesandut',
          'region',
          'province',
          'ut',
          'location',
        ],
        year: ['year', 'yr', 'calendaryear', 'reportyear', 'reportingyear'],
        cases: [
          'cases',
          'totalcases',
          'confirmed',
          'confirmedcases',
          'totalconfirmed',
          'positive',
          'positivecases',
          'infections',
          'casesconfirmed',
        ],
        deaths: [
          'deaths',
          'death',
          'totaldeaths',
          'deceased',
          'died',
          'fatalities',
          'fatality',
          'deathstotal',
        ],
        recovered: [
          'recovered',
          'totalrecovered',
          'cured',
          'discharged',
          'recoveries',
          'recovery',
          'cureddischarged',
          'curedrecovered',
        ],
        vaccinated: [
          'vaccinated',
          'vaccination',
          'vaccinations',
          'totalvaccinated',
          'doses',
          'dosesadministered',
          'vaccinedoses',
          'totaldoses',
          'vaccinationsadministered',
        ],
      },
      FUZZY: [
        ['state', ['state', 'region', 'province']],
        ['year', ['year']],
        ['vaccinated', ['vaccin', 'dose', 'jab']],
        ['recovered', ['recover', 'cured', 'discharg']],
        ['deaths', ['death', 'deceas', 'fatal', 'died']],
        ['cases', ['case', 'confirm', 'positiv', 'infect']],
      ],
      norm: function (k) {
        return String(k === null || k === undefined ? '' : k)
          .toLowerCase()
          .replace(/[\s_\-./()]/g, '')
          .replace(/[^a-z0-9]/g, '');
      },
      mapHeaders: function (headers) {
        const map = {},
          used = {};
        const normed = headers.map((h) => ({ raw: h, n: Parser.norm(h) }));

        Parser.REQUIRED.forEach(function (field) {
          const list = Parser.ALIASES[field];
          for (let i = 0; i < normed.length; i++) {
            if (used[normed[i].raw]) continue;
            if (list.indexOf(normed[i].n) !== -1) {
              map[field] = normed[i].raw;
              used[normed[i].raw] = true;
              return;
            }
          }
        });

        Parser.FUZZY.forEach(function (pair) {
          const field = pair[0],
            tokens = pair[1];
          if (map[field]) return;
          for (let i = 0; i < normed.length; i++) {
            if (used[normed[i].raw]) continue;
            for (let t = 0; t < tokens.length; t++) {
              if (normed[i].n.indexOf(tokens[t]) !== -1) {
                map[field] = normed[i].raw;
                used[normed[i].raw] = true;
                return;
              }
            }
          }
        });
        return map;
      },
      read: function (file) {
        return new Promise(function (resolve, reject) {
          if (typeof XLSX === 'undefined') {
            reject(
              new Error(
                'The SheetJS library did not load. Check your internet connection and reload.',
              ),
            );
            return;
          }
          const reader = new FileReader();
          reader.onerror = function () {
            reject(new Error('The file could not be read from disk.'));
          };
          reader.onload = function (ev) {
            try {
              const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
              const sheetName = wb.SheetNames && wb.SheetNames[0];
              if (!sheetName) throw new Error('The workbook contains no sheets.');
              const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
                defval: '',
                raw: true,
              });
              resolve({ rows: rows, sheet: sheetName, sheetCount: wb.SheetNames.length });
            } catch (err) {
              reject(
                new Error(
                  err && err.message
                    ? err.message
                    : 'The file could not be parsed as CSV or Excel.',
                ),
              );
            }
          };
          reader.readAsArrayBuffer(file);
        });
      },
    };

    /* ==================================================================
     MODULE: VALIDATOR
     ================================================================== */
    const Validator = {
      MAX_LISTED: 60,
      validate: function (rawRows, sourceLabel) {
        const report = {
          status: 'fail',
          ok: false,
          source: sourceLabel || 'Unknown source',
          rows: [],
          errors: [],
          warnings: [],
          missing: [],
          headerMap: {},
          counts: { input: 0, accepted: 0, rejected: 0, flagged: 0 },
          states: [],
          years: [],
        };

        if (!Array.isArray(rawRows) || rawRows.length === 0) {
          report.errors.push('The file has no data rows below the header.');
          return report;
        }
        report.counts.input = rawRows.length;

        const headerSet = {};
        rawRows.slice(0, 25).forEach(function (r) {
          Object.keys(r).forEach(function (k) {
            headerSet[k] = true;
          });
        });
        const headers = Object.keys(headerSet);
        const map = Parser.mapHeaders(headers);
        report.headerMap = map;
        report.missing = Parser.REQUIRED.filter(function (f) {
          return !map[f];
        });

        if (report.missing.length) {
          report.errors.push(
            'Missing required column' +
              (report.missing.length > 1 ? 's' : '') +
              ': ' +
              report.missing.map(titleCase).join(', ') +
              '. Found: ' +
              (headers.join(', ') || 'nothing') +
              '.',
          );
          return report;
        }

        const seen = {};
        const NUMERIC = ['cases', 'deaths', 'recovered', 'vaccinated'];

        rawRows.forEach(function (raw, i) {
          const label = 'Row ' + (i + 2);
          const problems = [];

          const stateName = String(
            raw[map.state] === null || raw[map.state] === undefined ? '' : raw[map.state],
          ).trim();
          if (!stateName) problems.push('State is empty');

          const yearNum = toNumber(raw[map.year]);
          if (isNaN(yearNum)) {
            problems.push('Year "' + String(raw[map.year]).slice(0, 18) + '" is not a number');
          } else if (yearNum < 1900 || yearNum > 2100 || Math.floor(yearNum) !== yearNum) {
            problems.push('Year ' + yearNum + ' is not a valid four-digit year');
          }

          const values = {};
          NUMERIC.forEach(function (f) {
            const cell = raw[map[f]];
            if (cell === '' || cell === null || cell === undefined) {
              problems.push(titleCase(f) + ' is missing');
              values[f] = 0;
              return;
            }
            const n = toNumber(cell);
            if (isNaN(n)) {
              problems.push(titleCase(f) + ' "' + String(cell).slice(0, 18) + '" is not numeric');
              values[f] = 0;
            } else if (n < 0) {
              problems.push(titleCase(f) + ' is negative (' + n + ')');
              values[f] = 0;
            } else {
              values[f] = Math.round(n);
            }
          });

          if (problems.length) {
            report.counts.rejected++;
            if (report.errors.length < Validator.MAX_LISTED) {
              report.errors.push(label + ' rejected — ' + problems.join('; ') + '.');
            }
            return;
          }

          let flagged = false;
          if (values.deaths + values.recovered > values.cases) {
            flagged = true;
            if (report.warnings.length < Validator.MAX_LISTED) {
              report.warnings.push(
                label +
                  ' (' +
                  stateName +
                  ' ' +
                  yearNum +
                  ') — deaths + recovered (' +
                  fmtInt(values.deaths + values.recovered) +
                  ') exceed cases (' +
                  fmtInt(values.cases) +
                  '); active cases clamped to 0.',
              );
            }
          }
          const dupKey = stateName.toLowerCase() + '|' + yearNum;
          if (seen[dupKey]) {
            flagged = true;
            if (report.warnings.length < Validator.MAX_LISTED) {
              report.warnings.push(
                label +
                  ' — duplicate entry for ' +
                  stateName +
                  ' ' +
                  yearNum +
                  '; both rows are aggregated.',
              );
            }
          }
          seen[dupKey] = true;

          if (flagged) report.counts.flagged++;
          report.rows.push(
            Calc.derive({
              state: titleCase(stateName),
              year: yearNum,
              cases: values.cases,
              deaths: values.deaths,
              recovered: values.recovered,
              vaccinated: values.vaccinated,
              flagged: flagged,
            }),
          );
        });

        report.counts.accepted = report.rows.length;
        if (!report.rows.length) {
          report.errors.unshift('No row passed validation, so the dashboard has nothing to plot.');
          report.status = 'fail';
          return report;
        }
        report.ok = true;
        report.status =
          report.counts.rejected > 0 || report.warnings.length > 0 ? 'partial' : 'pass';
        report.states = Calc.uniqueStates(report.rows);
        report.years = Calc.uniqueYears(report.rows);
        return report;
      },
    };

    /* ==================================================================
     MODULE: CALC
     ================================================================== */
    const Calc = {
      derive: function (r) {
        const active = Math.max(0, r.cases - r.deaths - r.recovered);
        return {
          state: r.state,
          year: r.year,
          cases: r.cases,
          deaths: r.deaths,
          recovered: r.recovered,
          vaccinated: r.vaccinated,
          active: active,
          deathRate: safeDiv(r.deaths, r.cases) * 100,
          recoveryRate: safeDiv(r.recovered, r.cases) * 100,
          dosesPerCase: safeDiv(r.vaccinated, r.cases),
          flagged: !!r.flagged,
        };
      },
      total: function (rows) {
        const t = {
          records: rows.length,
          cases: 0,
          deaths: 0,
          recovered: 0,
          vaccinated: 0,
          active: 0,
        };
        for (let i = 0; i < rows.length; i++) {
          t.cases += rows[i].cases;
          t.deaths += rows[i].deaths;
          t.recovered += rows[i].recovered;
          t.vaccinated += rows[i].vaccinated;
          t.active += rows[i].active;
        }
        t.deathRate = safeDiv(t.deaths, t.cases) * 100;
        t.recoveryRate = safeDiv(t.recovered, t.cases) * 100;
        t.dosesPerCase = safeDiv(t.vaccinated, t.cases);
        return t;
      },
      uniqueStates: function (rows) {
        const seen = {},
          out = [];
        rows.forEach(function (r) {
          if (!seen[r.state]) {
            seen[r.state] = true;
            out.push(r.state);
          }
        });
        return out.sort();
      },
      uniqueYears: function (rows) {
        const seen = {},
          out = [];
        rows.forEach(function (r) {
          if (!seen[r.year]) {
            seen[r.year] = true;
            out.push(r.year);
          }
        });
        return out.sort(function (a, b) {
          return a - b;
        });
      },
      applyFilters: function (rows, filters) {
        return rows.filter(function (r) {
          if (filters.year !== 'all' && String(r.year) !== String(filters.year)) return false;
          if (filters.state !== 'all' && r.state !== filters.state) return false;
          return true;
        });
      },
      filtered: function () {
        return Calc.applyFilters(state.dataset, state.filters);
      },
      yearScope: function () {
        return Calc.applyFilters(state.dataset, { year: state.filters.year, state: 'all' });
      },
      byYear: function (rows) {
        const buckets = {};
        rows.forEach(function (r) {
          (buckets[r.year] = buckets[r.year] || []).push(r);
        });
        return Object.keys(buckets)
          .map(Number)
          .sort(function (a, b) {
            return a - b;
          })
          .map(function (y) {
            const t = Calc.total(buckets[y]);
            t.year = y;
            return t;
          });
      },
      byState: function (rows) {
        const buckets = {};
        rows.forEach(function (r) {
          (buckets[r.state] = buckets[r.state] || []).push(r);
        });
        return Object.keys(buckets).map(function (s) {
          const t = Calc.total(buckets[s]);
          t.state = s;
          return t;
        });
      },
      rankStates: function (rows, metricKey) {
        return Calc.byState(rows).sort(function (a, b) {
          return b[metricKey] - a[metricKey];
        });
      },
      stateTotal: function (rows, stateName) {
        return Calc.total(
          rows.filter(function (r) {
            return r.state === stateName;
          }),
        );
      },
      rankOf: function (rows, stateName, metricKey) {
        const ranked = Calc.rankStates(rows, metricKey);
        for (let i = 0; i < ranked.length; i++) if (ranked[i].state === stateName) return i + 1;
        return 0;
      },
      extremeBy: function (rows, field, direction, minCases) {
        const floor = minCases === undefined ? 1000 : minCases;
        let pool = Calc.byState(rows).filter(function (s) {
          return s.cases >= floor;
        });
        if (!pool.length) pool = Calc.byState(rows);
        if (!pool.length) return null;
        return pool.sort(function (a, b) {
          return direction === 'min' ? a[field] - b[field] : b[field] - a[field];
        })[0];
      },
    };

    // Expose everything needed by the other files.
    return {
      DEFAULT_DATASET,
      HC_STATE_MAP,
      METRICS,
      state,
      $,
      $$,
      reduceMotion,
      toNumber,
      safeDiv,
      fmtInt,
      fmtCompact,
      fmtPct,
      fmtSigned,
      cssVar,
      withAlpha,
      metricColor,
      debounce,
      titleCase,
      escapeHtml,
      memoryStore,
      store,
      TOAST_STYLES,
      toast,
      animateValue,
      setText,
      setWidth,
      Parser,
      Validator,
      Calc,
    };
  })(),
);
