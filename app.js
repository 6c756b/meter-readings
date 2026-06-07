'use strict';

// Meter-Konfiguration
const METERS = {
  water: {
    label:            'Wasser',
    unit:             'm³',
    consumUnit:       'L',
    consumFactor:     1000,
    consumDecimals:   0,
    readingDecimals:  1,
    thresholdDefault: 200,
    thresholdMin:     50,
    thresholdMax:     500,
    thresholdStep:    10,
    color:            '#61828F',
    csvName:          'wasser',
    hasTime:          true,
    demoReading:      10.5,
  },
  electricity: {
    label:            'Strom',
    unit:             'kWh',
    consumUnit:       'kWh',
    consumFactor:     1,
    consumDecimals:   0,
    readingDecimals:  0,
    thresholdDefault: 20,
    thresholdMin:     1,
    thresholdMax:     100,
    thresholdStep:    1,
    color:            '#F59E0B',
    csvName:          'strom',
    hasTime:          false,
    demoReading:      4850.0,
    weeklyKPI:        true,
  },
  gas: {
    label:            'Gas',
    unit:             'm³',
    consumUnit:       'm³',
    consumFactor:     1,
    consumDecimals:   0,
    readingDecimals:  0,
    thresholdDefault: 5,
    thresholdMin:     0.5,
    thresholdMax:     30,
    thresholdStep:    0.5,
    color:            '#aed695',
    csvName:          'gas',
    hasTime:          false,
    demoReading:      1234.5,
    weeklyKPI:        true,
  },
};

const METER_TYPES = Object.keys(METERS);

const CONFIG = {
  API_URL:        'api.php',
  CHART_DAYS_MAX: 120,
  TREND_READINGS: 30,
};

const KEY = new URLSearchParams(window.location.search).get('key') ?? '';

// State
const state = {
  activeMeter: 'water',
  meters: Object.fromEntries(METER_TYPES.map(type => [type, {
    readings:  null,   // null = not yet loaded
    threshold: Number(localStorage.getItem(`threshold_${type}`) ?? METERS[type].thresholdDefault),
    contracts: null,
    charts:    { daily: null, trend: null, stats: null },
    tablePage: 0,
  }])),
};

// Utility
const TABLE_PAGE_SIZE = 15;

const el = id => document.getElementById(id);

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundToSlot(date) {
  const d = new Date(date.getTime());
  const h = d.getHours();
  let slot, addDay = false;
  if      (h <  2) { slot =  0; }
  else if (h <  6) { slot =  4; }
  else if (h < 10) { slot =  8; }
  else if (h < 14) { slot = 12; }
  else if (h < 18) { slot = 16; }
  else if (h < 22) { slot = 20; }
  else             { slot =  0; addDay = true; }
  if (addDay) d.setDate(d.getDate() + 1);
  d.setHours(slot, 0, 0, 0);
  return d;
}

function fmtDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function dateStrFromTs(ts) { return ts.slice(0, 10); }

function currentTimeStr() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

function getChartAnchor(readings) {
  if (!readings.length) return new Date();
  const sorted = [...readings].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return new Date(sorted.at(-1).timestamp.slice(0, 10) + 'T12:00:00');
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtConsump(value, m) {
  const factor = Math.pow(10, m.consumDecimals);
  return (Math.round(value * factor) / factor).toLocaleString('de-DE', {
    minimumFractionDigits: m.consumDecimals,
    maximumFractionDigits: m.consumDecimals,
  });
}

function fmtReading(value, m) {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: m.readingDecimals,
    maximumFractionDigits: m.readingDecimals,
  });
}

function fmtCost(value) {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function fmtUnitPrice(value) {
  return value.toLocaleString('de-DE', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + ' €';
}

// Berechnungen
function getDayRange(ts1, ts2) {
  const days = [];
  const cur = new Date(ts1.slice(0, 10) + 'T00:00:00');
  const end = new Date(ts2.slice(0, 10) + 'T00:00:00');
  while (cur <= end) {
    days.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function calcDailyConsumption(readings, factor) {
  const sorted = [...readings].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const map = new Map();
  for (let i = 1; i < sorted.length; i++) {
    const total = (sorted[i].reading - sorted[i-1].reading) * factor;
    if (total < 0) continue;
    const days = getDayRange(sorted[i-1].timestamp, sorted[i].timestamp);
    const perDay = total / days.length;
    for (const day of days) {
      map.set(day, (map.get(day) ?? 0) + perDay);
    }
  }
  return map;
}

function detectAnomalies(dailyData, threshold) {
  const anomalies = new Set();
  for (const [day, val] of dailyData) {
    if (val > threshold) anomalies.add(day);
  }
  return anomalies;
}

function dayToWeekKey(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  const mon = new Date(d);
  mon.setDate(mon.getDate() - (dow === 0 ? 6 : dow - 1));
  return mon.toISOString().slice(0, 10);
}

function calcWeeklyConsumption(daily) {
  const map = new Map();
  for (const [day, val] of daily) {
    const key = dayToWeekKey(day);
    map.set(key, (map.get(key) ?? 0) + val);
  }
  return map;
}

function weekAnomaliesSet(dailyAnomalies) {
  const set = new Set();
  for (const day of dailyAnomalies) set.add(dayToWeekKey(day));
  return set;
}

function calcMonthlyConsumption(daily) {
  const map = new Map();
  for (const [day, val] of daily) {
    const key = day.slice(0, 7);
    map.set(key, (map.get(key) ?? 0) + val);
  }
  return map;
}

function monthAnomaliesSet(dailyAnomalies) {
  const set = new Set();
  for (const day of dailyAnomalies) set.add(day.slice(0, 7));
  return set;
}

function fmtMonth(yyyymm) {
  const [y, m] = yyyymm.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
}

function getKPIValues(readings, factor) {
  if (!readings.length) return { current: null, today: null, week: null, month: null, weeklyAvg: null };
  const sorted = [...readings].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const current = sorted.at(-1).reading;
  const daily = calcDailyConsumption(sorted, factor);
  const anchor = sorted.at(-1).timestamp.slice(0, 10);
  const anchorMs = new Date(anchor + 'T12:00:00').getTime();
  let todayV = 0, weekV = 0, monthV = 0, yearV = 0;
  for (const [day, val] of daily) {
    const diffDays = Math.round((anchorMs - new Date(day + 'T12:00:00').getTime()) / 86400000);
    if (day === anchor) todayV += val;
    if (diffDays < 7)   weekV  += val;
    if (diffDays < 30)  monthV += val;
    if (diffDays < 365) yearV  += val;
  }
  return { current, today: todayV, week: weekV, month: monthV, lastYear: yearV };
}


// Vertrags-/Kostenberechnung
// "Neuester gültiger Vertrag zum Datum" — neuestes valid_from ≤ date gewinnt
function getActiveContract(contracts, dateStr) {
  const sorted = [...contracts].sort((a, b) => b.valid_from.localeCompare(a.valid_from));
  for (const c of sorted) {
    if (c.valid_from <= dateStr && (!c.valid_to || c.valid_to >= dateStr)) return c;
  }
  return null;
}

function getCostKPIs(readings, contracts, m) {
  if (!contracts.length || !readings.length) return null;
  const sorted = [...readings].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const lastDate = sorted.at(-1).timestamp.slice(0, 10);
  // Use today for active contract lookup so contracts added after last reading are found.
  const contractCheckDate = todayStr() > lastDate ? todayStr() : lastDate;
  const activeContract = getActiveContract(contracts, contractCheckDate);
  if (!activeContract) return null;

  const daily    = calcDailyConsumption(sorted, m.consumFactor);
  // Anchor the 30-day window on the last reading date (where data actually exists).
  const anchorMs = new Date(lastDate + 'T12:00:00').getTime();
  let varCostMonth = 0;

  for (const [day, consumption] of daily) {
    const diffDays = Math.round((anchorMs - new Date(day + 'T12:00:00').getTime()) / 86400000);
    if (diffDays >= 30) continue;
    // Per-day contract for multi-year accuracy; fall back to active contract when
    // valid_from is later than the consumption period (contract entered retroactively).
    const contract = getActiveContract(contracts, day) ?? activeContract;
    varCostMonth += (consumption / m.consumFactor) * contract.unit_price;
  }

  const costMonth = varCostMonth + activeContract.base_monthly;
  return { activeContract, costMonth, costYear: costMonth * 12 };
}

// CSV Export
function generateCSV(type) {
  const m = METERS[type];
  const readings = state.meters[type].readings ?? [];
  const sorted = [...readings].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const header = ['Datum'];
  if (m.hasTime) header.push('Uhrzeit');
  header.push(`Zählerstand (${m.unit})`, `Verbrauch (${m.consumUnit})`, `Ø ${m.consumUnit}/Tag`, 'Kommentar');
  const rows = [header];

  for (let i = 0; i < sorted.length; i++) {
    const r    = sorted[i];
    const prev = i > 0 ? sorted[i-1] : null;
    const [date, time] = r.timestamp.split('T');
    const rawDiff  = prev ? Math.max(0, (r.reading - prev.reading) * m.consumFactor) : null;
    const daySpan  = prev ? getDayRange(prev.timestamp, r.timestamp).length : null;
    const diff     = rawDiff !== null ? fmtConsump(rawDiff, m) : '';
    const dailyAvg = rawDiff !== null ? fmtConsump(rawDiff / daySpan, m) : '';

    const row = [date];
    if (m.hasTime) row.push(time.slice(0, 5));
    row.push(fmtReading(r.reading, m), diff, dailyAvg, r.comment ?? '');
    rows.push(row);
  }
  return '﻿' + rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
}

// API
async function withErrorToast(fn) {
  try {
    return await fn();
  } catch (e) {
    showToast(e.message || 'Unbekannter Fehler', 'error');
    return null;
  }
}

async function apiRequest(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const apiList            = type => apiRequest(`${CONFIG.API_URL}?action=list&type=${type}&key=${KEY}`);
const apiListContracts   = type => apiRequest(`${CONFIG.API_URL}?action=list_contracts&type=${type}&key=${KEY}`);
const apiSaveContract    = (type, body) => apiRequest(`${CONFIG.API_URL}?action=save_contract&type=${type}&key=${KEY}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const apiUpdateContract  = (type, id, body) => apiRequest(`${CONFIG.API_URL}?action=update_contract&type=${type}&id=${encodeURIComponent(id)}&key=${KEY}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const apiDeleteContract  = (type, id) => apiRequest(`${CONFIG.API_URL}?action=delete_contract&type=${type}&id=${encodeURIComponent(id)}&key=${KEY}`, {
  method: 'POST',
});
const apiAdd    = (type, body) => apiRequest(`${CONFIG.API_URL}?action=add&type=${type}&key=${KEY}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const apiDelete = (type, id) => apiRequest(`${CONFIG.API_URL}?action=delete&type=${type}&id=${encodeURIComponent(id)}&key=${KEY}`, {
  method: 'POST',
});

// Toast
function showToast(message, type = 'info') {
  const container = el('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3000);
}

// Render: KPIs
function renderKPIs(type) {
  const m = METERS[type];
  const { current, today, week, month, lastYear } = getKPIValues(state.meters[type].readings ?? [], m.consumFactor);

  const fmt  = v => v === null ? '—' : fmtConsump(v, m);
  const avg  = (v, days) => {
    if (v === null) return '';
    return `ø ${fmtConsump(v / days, m)} ${m.consumUnit}/Tag`;
  };

  const todayDisplay = m.weeklyKPI ? lastYear : today;

  el(`${type}-kpi-current`).textContent      = current !== null ? fmtReading(current, m) : '—';
  el(`${type}-kpi-today`).textContent        = fmt(todayDisplay);
  el(`${type}-kpi-week`).textContent         = fmt(week);
  el(`${type}-kpi-month`).textContent        = fmt(month);
  el(`${type}-kpi-week-avg`).textContent     = avg(week, 7);
  el(`${type}-kpi-month-avg`).textContent    = avg(month, 30);
}

// Render: Tabelle
function renderTable(type) {
  const m = METERS[type];
  const ms = state.meters[type];
  const readings = ms.readings ?? [];
  const tbody = el(`${type}-table-body`);
  const sorted = [...readings].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  if (!sorted.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Keine Einträge vorhanden.</td></tr>';
    renderTablePagination(type, 0, 0);
    return;
  }

  const asc = [...readings].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const prevMap = new Map();
  for (let i = 1; i < asc.length; i++) prevMap.set(asc[i].id, asc[i-1]);

  const dailyData = calcDailyConsumption(readings, m.consumFactor);
  const anomalies = detectAnomalies(dailyData, ms.threshold);

  const totalPages = Math.ceil(sorted.length / TABLE_PAGE_SIZE);
  ms.tablePage = Math.min(ms.tablePage, Math.max(0, totalPages - 1));
  const page = sorted.slice(ms.tablePage * TABLE_PAGE_SIZE, (ms.tablePage + 1) * TABLE_PAGE_SIZE);

  // Table may omit time column for non-water types; colspan must match thead
  const colCount = m.hasTime ? 7 : 6;

  tbody.innerHTML = page.map(r => {
    const prev     = prevMap.get(r.id);
    const rawDiff  = prev ? Math.max(0, (r.reading - prev.reading) * m.consumFactor) : null;
    const [date, time] = r.timestamp.split('T');
    const daySpan  = prev ? getDayRange(prev.timestamp, r.timestamp).length : 1;
    const dailyAvg = rawDiff !== null ? rawDiff / daySpan : 0;
    const isHigh   = dailyAvg > ms.threshold;

    const diffDisplay = rawDiff !== null
      ? `${fmtConsump(rawDiff, m)} ${m.consumUnit}`
      : '<span class="no-data">—</span>';

    const avgDisplay = rawDiff !== null && daySpan > 1
      ? `<span class="consumption-avg"><small>${daySpan} × </small>${fmtConsump(dailyAvg, m)}</span>`
      : '<span class="no-data">—</span>';

    const timeCell = m.hasTime ? `<td>${time.slice(0, 5)} Uhr</td>` : '';

    return `<tr class="${isHigh ? 'high-consumption' : ''}">
      <td>${fmtDate(date)}</td>
      ${timeCell}
      <td>${fmtReading(r.reading, m)} ${m.unit}</td>
      <td class="${isHigh ? 'consumption-high' : 'consumption-normal'}">${diffDisplay}</td>
      <td>${avgDisplay}</td>
      <td>${r.comment ? escHtml(r.comment) : '<span class="no-data">—</span>'}</td>
      <td><button class="btn btn-danger btn-icon" data-action="delete" data-id="${r.id}" title="Löschen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button></td>
    </tr>`;
  }).join('');

  // Sync empty-state colspan if needed
  const emptyCell = tbody.querySelector('.empty-state');
  if (emptyCell) emptyCell.colSpan = colCount;

  renderTablePagination(type, ms.tablePage, totalPages);
}

function renderTablePagination(type, currentPage, totalPages) {
  const pag = el(`${type}-table-pagination`);
  if (totalPages <= 1) { pag.innerHTML = ''; return; }
  const prev = `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 0 ? 'disabled' : ''}>&#8592;</button>`;
  const next = `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages - 1 ? 'disabled' : ''}>&#8594;</button>`;
  const info = `<span class="page-info">Seite ${currentPage + 1} / ${totalPages}</span>`;
  pag.innerHTML = prev + info + next;
}

// Render: Charts
const CHART_COLORS = { text: '#FFEE88', tick: '#7d8499', grid: '#2e3d6b', tooltip: '#243256' };

function renderDailyChart(type) {
  const m  = METERS[type];
  const ms = state.meters[type];
  if (ms.charts.daily) { ms.charts.daily.destroy(); ms.charts.daily = null; }

  const readings      = ms.readings ?? [];
  const daily         = calcDailyConsumption(readings, m.consumFactor);
  const monthly       = calcMonthlyConsumption(daily);
  const monthAnomaly  = monthAnomaliesSet(detectAnomalies(daily, ms.threshold));

  const labels   = [...monthly.keys()].sort().slice(-24);
  const factor   = Math.pow(10, m.consumDecimals);
  const data     = labels.map(mo => Math.round((monthly.get(mo) ?? 0) * factor) / factor);
  const bgColors = labels.map(mo => monthAnomaly.has(mo) ? 'salmon' : m.color);

  ms.charts.daily = new Chart(el(`${type}-chart-daily`), {
    type: 'bar',
    data: {
      labels: labels.map(fmtMonth),
      datasets: [{
        label: `Verbrauch (${m.consumUnit})`,
        data,
        backgroundColor: bgColors,
        borderRadius: 3,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_COLORS.tooltip,
          titleColor:      CHART_COLORS.text,
          bodyColor:       CHART_COLORS.text,
          borderColor:     CHART_COLORS.grid,
          borderWidth: 1,
          callbacks: {
            afterBody(ctx) {
              const mo = labels[ctx[0].dataIndex];
              const comments = readings
                .filter(r => dateStrFromTs(r.timestamp).slice(0, 7) === mo && r.comment)
                .map(r => r.comment);
              return comments.length ? ['', ...comments] : [];
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: CHART_COLORS.tick, maxTicksLimit: 24, maxRotation: 45 },
          grid:  { color: CHART_COLORS.grid },
        },
        y: {
          ticks: { color: CHART_COLORS.tick },
          grid:  { color: CHART_COLORS.grid },
          title: { display: true, text: m.consumUnit, color: CHART_COLORS.tick },
        },
      },
    },
  });
}

let modalChart = null;
let modalType  = null;
let modalGran  = 'month';
let modalRange = 'all';

function filterByRange(labels, range) {
  if (range === 'all') return labels;
  const last = labels.at(-1);
  if (!last) return labels;
  const anchorStr = last.length === 7 ? last + '-01' : last;
  const cutoff = new Date(anchorStr + 'T12:00:00');
  const months = { '3m': 3, '6m': 6, '1y': 12, '2y': 24 }[range];
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return labels.filter(l => (l.length === 7 ? l + '-01' : l) >= cutoffStr);
}

function renderModalChart() {
  const m        = METERS[modalType];
  const ms       = state.meters[modalType];
  const readings = ms.readings ?? [];
  const daily    = calcDailyConsumption(readings, m.consumFactor);
  const anomalies = detectAnomalies(daily, ms.threshold);
  const factor   = Math.pow(10, m.consumDecimals);

  let allLabels, dataMap, anomSet, granLabel;

  if (modalGran === 'month') {
    const monthly = calcMonthlyConsumption(daily);
    anomSet    = monthAnomaliesSet(anomalies);
    allLabels  = [...monthly.keys()].sort();
    dataMap    = monthly;
    granLabel  = 'Monatsverbrauch';
  } else if (modalGran === 'week') {
    const weekly = calcWeeklyConsumption(daily);
    anomSet    = weekAnomaliesSet(anomalies);
    allLabels  = [...weekly.keys()].sort();
    dataMap    = weekly;
    granLabel  = 'Wochenverbrauch';
  } else {
    anomSet    = anomalies;
    allLabels  = [...daily.keys()].sort();
    dataMap    = daily;
    granLabel  = 'Tagesverbrauch';
  }

  const labels   = filterByRange(allLabels, modalRange);
  const data     = labels.map(k => Math.round((dataMap.get(k) ?? 0) * factor) / factor);
  const bgColors = labels.map(k => anomSet.has(k) ? 'salmon' : m.color);

  el('chart-modal-title').textContent = `${m.label} – ${granLabel}`;

  const fmtLabel = modalGran === 'month' ? fmtMonth : fmtDate;

  if (modalChart) { modalChart.destroy(); modalChart = null; }
  modalChart = new Chart(el('chart-modal-canvas'), {
    type: 'bar',
    data: {
      labels: labels.map(fmtLabel),
      datasets: [{ label: `Verbrauch (${m.consumUnit})`, data, backgroundColor: bgColors, borderRadius: 3, borderSkipped: false }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_COLORS.tooltip,
          titleColor: CHART_COLORS.text,
          bodyColor:  CHART_COLORS.text,
          borderColor: CHART_COLORS.grid,
          borderWidth: 1,
          callbacks: {
            afterBody(ctx) {
              const key = labels[ctx[0].dataIndex];
              const comments = readings.filter(r => {
                const d = dateStrFromTs(r.timestamp);
                if (gran === 'month') return d.slice(0, 7) === key && r.comment;
                if (gran === 'week')  return dayToWeekKey(d) === key && r.comment;
                return d === key && r.comment;
              }).map(r => r.comment);
              return comments.length ? ['', ...comments] : [];
            },
          },
        },
      },
      scales: {
        x: { ticks: { color: CHART_COLORS.tick, maxTicksLimit: 24, maxRotation: 45 }, grid: { color: CHART_COLORS.grid } },
        y: { ticks: { color: CHART_COLORS.tick }, grid: { color: CHART_COLORS.grid }, title: { display: true, text: m.consumUnit, color: CHART_COLORS.tick } },
      },
    },
  });
}

function openChartModal(type) {
  modalType  = type;
  modalGran  = 'month';
  modalRange = 'all';
  document.querySelectorAll('.chart-gran-btn').forEach(b   => b.classList.toggle('active', b.dataset.gran  === 'month'));
  document.querySelectorAll('.chart-range-btn').forEach(b  => b.classList.toggle('active', b.dataset.range === 'all'));
  el('chart-modal').classList.add('is-open');
  renderModalChart();
}

function closeChartModal() {
  el('chart-modal').classList.remove('is-open');
  if (modalChart) { modalChart.destroy(); modalChart = null; }
}

function renderTrendChart(type) {
  const m  = METERS[type];
  const ms = state.meters[type];
  if (ms.charts.trend) { ms.charts.trend.destroy(); ms.charts.trend = null; }

  const recent = [...(ms.readings ?? [])]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-CONFIG.TREND_READINGS);

  const labels = recent.map(r => {
    const d = new Date(r.timestamp);
    const datePart = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const timePart = m.hasTime
      ? ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      : '';
    return datePart + timePart;
  });

  ms.charts.trend = new Chart(el(`${type}-chart-trend`), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `Zählerstand (${m.unit})`,
        data: recent.map(r => r.reading),
        borderColor:      m.color,
        backgroundColor:  hexToRgba(m.color, 0.1),
        borderWidth: 2,
        pointBackgroundColor: m.color,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_COLORS.tooltip,
          titleColor:      CHART_COLORS.text,
          bodyColor:       CHART_COLORS.text,
          borderColor:     CHART_COLORS.grid,
          borderWidth: 1,
          callbacks: {
            afterBody(ctx) {
              const r = recent[ctx[0].dataIndex];
              return r.comment ? ['', r.comment] : [];
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: CHART_COLORS.tick, maxRotation: 45 },
          grid:  { color: CHART_COLORS.grid },
        },
        y: {
          ticks: { color: CHART_COLORS.tick },
          grid:  { color: CHART_COLORS.grid },
          title: { display: true, text: m.unit, color: CHART_COLORS.tick },
        },
      },
    },
  });
}

// Render: alles
function renderAll(type) {
  renderKPIs(type);
  renderTable(type);
  renderDailyChart(type);
  renderTrendChart(type);
}

// Render: Kosten & Verträge
function renderCostKPIs(type) {
  const m       = METERS[type];
  const ms      = state.meters[type];
  const section = el(`${type}-cost-section`);
  const kpis    = getCostKPIs(ms.readings ?? [], ms.contracts ?? [], m);

  if (!kpis) { section.hidden = true; return; }

  const { activeContract, costMonth, costYear } = kpis;
  el(`${type}-cost-base`).textContent       = fmtCost(activeContract.base_monthly);
  el(`${type}-cost-unit-price`).textContent = fmtUnitPrice(activeContract.unit_price);
  el(`${type}-cost-month`).textContent      = fmtCost(costMonth);
  el(`${type}-cost-year`).textContent       = fmtCost(costYear);
  section.hidden = false;
}

function renderContractTable(type) {
  const contracts = state.meters[type].contracts ?? [];
  const wrap      = el(`${type}-contract-list`);
  const m         = METERS[type];

  if (!contracts.length) {
    wrap.innerHTML = '<p class="empty-state" style="padding:.75rem 0 .25rem">Kein Vertrag hinterlegt.</p>';
    return;
  }

  const sorted = [...contracts].sort((a, b) => b.valid_from.localeCompare(a.valid_from));
  wrap.innerHTML = `
    <table class="data-table contract-table">
      <thead><tr>
        <th>Gültig ab</th><th>Gültig bis</th>
        <th>Grundpreis</th><th>Arbeitspreis</th><th></th><th></th>
      </tr></thead>
      <tbody>
        ${sorted.map(c => `<tr>
          <td>${fmtDate(c.valid_from)}</td>
          <td>${c.valid_to ? fmtDate(c.valid_to) : '<span class="no-data">aktuell</span>'}</td>
          <td>${fmtCost(c.base_monthly)}/Monat</td>
          <td>${fmtUnitPrice(c.unit_price)}/${m.unit}</td>
          <td>${c.comment ? `<span class="contract-info-icon" data-tooltip="${escHtml(c.comment)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </span>` : ''}</td>
          <td style="display:flex;gap:.35rem">
            <button class="btn btn-secondary btn-icon" data-action="edit-contract" data-id="${c.id}" title="Bearbeiten">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn btn-danger btn-icon" data-action="delete-contract" data-id="${c.id}" title="Löschen">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

async function loadContracts(type) {
  const contracts = await withErrorToast(() => apiListContracts(type));
  if (contracts === null) return;
  state.meters[type].contracts = contracts;
  renderContractTable(type);
  renderCostKPIs(type);
  if (state.activeMeter === 'stats') renderStatsCostColumn(type);
}

// Render: Stats-Übersicht
function renderStatsChart(type) {
  const m  = METERS[type];
  const ms = state.meters[type];
  if (ms.charts.stats) { ms.charts.stats.destroy(); ms.charts.stats = null; }

  const readings     = ms.readings ?? [];
  const daily        = calcDailyConsumption(readings, m.consumFactor);
  const monthly      = calcMonthlyConsumption(daily);
  const monthAnomaly = monthAnomaliesSet(detectAnomalies(daily, ms.threshold));

  const labels = [...monthly.keys()].sort().slice(-12);

  const factor   = Math.pow(10, m.consumDecimals);
  const data     = labels.map(mo => Math.round((monthly.get(mo) ?? 0) * factor) / factor);
  const bgColors = labels.map(mo => monthAnomaly.has(mo) ? 'salmon' : m.color);

  ms.charts.stats = new Chart(el(`stats-${type}-chart`), {
    type: 'bar',
    data: {
      labels: labels.map(fmtMonth),
      datasets: [{
        data,
        backgroundColor: bgColors,
        borderRadius: 2,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_COLORS.tooltip,
          titleColor:      CHART_COLORS.text,
          bodyColor:       CHART_COLORS.text,
          borderColor:     CHART_COLORS.grid,
          borderWidth: 1,
          callbacks: { label: ctx => `${ctx.formattedValue} ${m.consumUnit}` },
        },
      },
      scales: {
        x: {
          ticks: { color: CHART_COLORS.tick, maxTicksLimit: 6, maxRotation: 0 },
          grid:  { color: CHART_COLORS.grid },
        },
        y: {
          ticks: { color: CHART_COLORS.tick },
          grid:  { color: CHART_COLORS.grid },
        },
      },
    },
  });
}

function renderStatsColumn(type) {
  const m = METERS[type];
  const { today, week, month, lastYear } = getKPIValues(state.meters[type].readings ?? [], m.consumFactor);

  const fmt = v => v === null ? '—' : fmtConsump(v, m);
  const avg = (v, days) => v === null ? '' : `ø ${fmtConsump(v / days, m)} ${m.consumUnit}/Tag`;

  el(`stats-${type}-today`).textContent     = fmt(lastYear);
  el(`stats-${type}-week`).textContent      = fmt(week);
  el(`stats-${type}-month`).textContent     = fmt(month);
  el(`stats-${type}-week-avg`).textContent  = avg(week, 7);
  el(`stats-${type}-month-avg`).textContent = avg(month, 30);

  renderStatsChart(type);
}

function renderStatsCostColumn(type) {
  const m    = METERS[type];
  const ms   = state.meters[type];
  const row  = el(`stats-${type}-cost-row`);
  const kpis = getCostKPIs(ms.readings ?? [], ms.contracts ?? [], m);
  if (!kpis) { row.hidden = true; return; }
  el(`stats-${type}-cost-month`).textContent = fmtCost(kpis.costMonth);
  row.hidden = false;
}

function renderStats() {
  for (const type of METER_TYPES) {
    renderStatsColumn(type);
    renderStatsCostColumn(type);
  }
}

// Laden
async function loadAndRender(type) {
  const readings = await withErrorToast(() => apiList(type));
  if (readings === null) return;

  if (readings.length === 0) {
    const demo = new Date();
    demo.setHours(8, 0, 0, 0);
    const ts = `${demo.getFullYear()}-${String(demo.getMonth()+1).padStart(2,'0')}-${String(demo.getDate()).padStart(2,'0')}T08:00:00`;
    await withErrorToast(() => apiAdd(type, {
      timestamp: ts,
      reading:   METERS[type].demoReading,
      comment:   'Startwert',
    }));
    const fresh = await withErrorToast(() => apiList(type));
    state.meters[type].readings = fresh ?? [];
  } else {
    state.meters[type].readings = readings;
  }

  state.meters[type].tablePage = 0;
  if (state.activeMeter === type) { renderAll(type); renderCostKPIs(type); }
  if (state.activeMeter === 'stats') { renderStatsColumn(type); renderStatsCostColumn(type); }
}

// Form-Validierung
function setFieldError(type, inputId, message) {
  el(inputId).classList.toggle('input-error', !!message);
  const errId = inputId.replace(`${type}-input-`, `${type}-err-`);
  const errEl = el(errId);
  if (errEl) errEl.textContent = message ?? '';
}

function clearErrors(type) {
  [`${type}-input-date`, `${type}-input-reading`].forEach(id => setFieldError(type, id, ''));
  if (METERS[type].hasTime) setFieldError(type, `${type}-input-time`, '');
}

// Slot-Vorschau (nur Wasser)
function updateSlotPreview() {
  const dateVal = el('water-input-date').value;
  const timeVal = el('water-input-time').value;
  const preview = el('water-slot-preview');
  const timeUsed = timeVal || currentTimeStr();
  if (!dateVal) { preview.textContent = ''; return; }
  const dt   = new Date(`${dateVal}T${timeUsed}:00`);
  const slot = roundToSlot(dt);
  const label   = slot.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const dayDiff = slot.getDate() - dt.getDate();
  const hint    = timeVal ? '' : ' (jetzt)';
  preview.textContent = `→ Slot: ${label} Uhr${dayDiff > 0 ? ' (nächster Tag)' : ''}${hint}`;
}

// Tab-Wechsel
function switchTab(type) {
  state.activeMeter = type;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.meter === type);
  });
  document.querySelectorAll('.meter-panel').forEach(panel => {
    panel.hidden = panel.dataset.panel !== type;
  });

  history.replaceState(null, '', `?key=${KEY}#${type}`);

  if (type === 'stats') {
    for (const t of METER_TYPES) {
      if (state.meters[t].readings   === null) loadAndRender(t);
      if (state.meters[t].contracts  === null) loadContracts(t);
    }
    renderStats();
    return;
  }

  if (state.meters[type].readings  === null) loadAndRender(type);
  else { renderAll(type); renderCostKPIs(type); }
  if (state.meters[type].contracts === null) loadContracts(type);
}

// Formular-Submit
function setupForm(type) {
  const m = METERS[type];

  el(`${type}-form`).addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors(type);

    const dateVal    = el(`${type}-input-date`).value;
    const readingVal = el(`${type}-input-reading`).value;
    const comment    = el(`${type}-input-comment`).value.trim();

    let valid = true;
    if (!dateVal)    { setFieldError(type, `${type}-input-date`,    'Datum ist erforderlich.');       valid = false; }
    if (!readingVal) { setFieldError(type, `${type}-input-reading`, 'Zählerstand ist erforderlich.'); valid = false; }
    if (!valid) return;

    const newVal = parseFloat(readingVal);
    const sorted = [...(state.meters[type].readings ?? [])].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const last   = sorted.at(-1);
    if (last && newVal < last.reading) {
      setFieldError(type, `${type}-input-reading`,
        `Zählerstand muss ≥ ${fmtReading(last.reading, m)} ${m.unit} sein.`);
      return;
    }

    let timestamp;
    if (m.hasTime) {
      const timeVal  = el(`${type}-input-time`).value;
      const timeUsed = timeVal || currentTimeStr();
      const dt       = new Date(`${dateVal}T${timeUsed}:00`);
      const slotted  = roundToSlot(dt);
      timestamp = `${slotted.getFullYear()}-${String(slotted.getMonth()+1).padStart(2,'0')}-${String(slotted.getDate()).padStart(2,'0')}T${String(slotted.getHours()).padStart(2,'0')}:00:00`;
    } else {
      timestamp = `${dateVal}T00:00:00`;
    }

    const btn = el(`${type}-btn-submit`);
    btn.disabled = true;

    const result = await withErrorToast(() => apiAdd(type, { timestamp, reading: newVal, comment }));
    btn.disabled = false;

    if (result) {
      showToast('Eintrag gespeichert.', 'success');
      el(`${type}-form`).reset();
      el(`${type}-input-date`).value = todayStr();
      if (m.hasTime) el('water-slot-preview').textContent = '';
      await loadAndRender(type);
    }
  });
}

// Vertragsformular
function setupContractForm(type) {
  const formWrap = el(`${type}-contract-form-wrap`);
  let editingId = null;

  function resetForm() {
    el(`${type}-contract-form`).reset();
    el(`${type}-contract-submit-label`).textContent = 'Speichern';
    el(`${type}-contract-comment-group`).hidden = true;
    editingId = null;
    formWrap.hidden = true;
  }

  el(`${type}-btn-add-contract`).addEventListener('click', () => {
    editingId = null;
    el(`${type}-contract-submit-label`).textContent = 'Speichern';
    el(`${type}-contract-comment-group`).hidden = true;
    el(`${type}-contract-form`).reset();
    el(`${type}-contract-from`).value = todayStr();
    formWrap.hidden = false;
  });

  el(`${type}-contract-cancel`).addEventListener('click', resetForm);

  el(`${type}-contract-form`).addEventListener('submit', async e => {
    e.preventDefault();
    const from      = el(`${type}-contract-from`).value;
    const to        = el(`${type}-contract-to`).value;
    const base      = parseFloat(el(`${type}-contract-base`).value);
    const unitPrice = parseFloat(el(`${type}-contract-unit-price`).value);

    if (!from || isNaN(base) || isNaN(unitPrice)) {
      showToast('Bitte alle Pflichtfelder ausfüllen.', 'warning');
      return;
    }

    const comment = el(`${type}-contract-comment`).value.trim();
    const payload = { valid_from: from, valid_to: to || null, base_monthly: base, unit_price: unitPrice, comment };

    const result = editingId
      ? await withErrorToast(() => apiUpdateContract(type, editingId, payload))
      : await withErrorToast(() => apiSaveContract(type, payload));

    if (result) {
      showToast(editingId ? 'Vertrag aktualisiert.' : 'Vertrag gespeichert.', 'success');
      resetForm();
      await loadContracts(type);
    }
  });

  el(`${type}-contract-list`).addEventListener('click', async e => {
    const editBtn = e.target.closest('[data-action="edit-contract"]');
    if (editBtn) {
      const contract = (state.meters[type].contracts ?? []).find(c => c.id === editBtn.dataset.id);
      if (!contract) return;
      editingId = contract.id;
      el(`${type}-contract-from`).value       = contract.valid_from;
      el(`${type}-contract-to`).value         = contract.valid_to ?? '';
      el(`${type}-contract-base`).value       = contract.base_monthly;
      el(`${type}-contract-unit-price`).value = contract.unit_price;
      el(`${type}-contract-comment`).value    = contract.comment ?? '';
      el(`${type}-contract-comment-group`).hidden = false;
      el(`${type}-contract-submit-label`).textContent = 'Aktualisieren';
      formWrap.hidden = false;
      return;
    }

    const deleteBtn = e.target.closest('[data-action="delete-contract"]');
    if (!deleteBtn) return;
    if (!confirm('Diesen Vertrag wirklich löschen?')) return;
    const result = await withErrorToast(() => apiDeleteContract(type, deleteBtn.dataset.id));
    if (result) {
      showToast('Vertrag gelöscht.', 'info');
      await loadContracts(type);
    }
  });
}

// Event-Handler
function setupEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.meter));
  });

  el('btn-export').addEventListener('click', () => {
    const type = state.activeMeter;
    if (type === 'stats' || !METERS[type]) {
      showToast('Bitte zuerst einen Zähler-Tab auswählen.', 'info');
      return;
    }
    if (!(state.meters[type].readings ?? []).length) {
      showToast('Keine Daten zum Exportieren.', 'warning');
      return;
    }
    const csv  = generateCSV(type);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${METERS[type].csvName}verbrauch_${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  el('water-input-time').addEventListener('input', updateSlotPreview);
  el('water-input-date').addEventListener('input', updateSlotPreview);

  for (const type of METER_TYPES) {
    setupForm(type);
    setupContractForm(type);

    el(`${type}-threshold-slider`).addEventListener('input', function () {
      state.meters[type].threshold = parseFloat(this.value);
      localStorage.setItem(`threshold_${type}`, state.meters[type].threshold);
      el(`${type}-threshold-display`).textContent = state.meters[type].threshold;
      if (state.activeMeter === type) {
        renderDailyChart(type);
        renderTable(type);
      }
    });

    el(`${type}-table-body`).addEventListener('click', async e => {
      const btn = e.target.closest('[data-action="delete"]');
      if (!btn) return;
      if (!confirm('Diesen Eintrag wirklich löschen?')) return;
      const result = await withErrorToast(() => apiDelete(type, btn.dataset.id));
      if (result) {
        showToast('Eintrag gelöscht.', 'info');
        await loadAndRender(type);
      }
    });

    el(`${type}-table-pagination`).addEventListener('click', e => {
      const btn = e.target.closest('.page-btn');
      if (!btn || btn.disabled) return;
      state.meters[type].tablePage = parseInt(btn.dataset.page);
      renderTable(type);
    });
  }
}

// Initialisierung
async function init() {
  for (const type of METER_TYPES) {
    const m      = METERS[type];
    const ms     = state.meters[type];
    const slider = el(`${type}-threshold-slider`);
    slider.min   = m.thresholdMin;
    slider.max   = m.thresholdMax;
    slider.step  = m.thresholdStep;
    slider.value = ms.threshold;
    el(`${type}-threshold-display`).textContent = ms.threshold;
    el(`${type}-input-date`).value = todayStr();
  }

  const hash    = window.location.hash.replace('#', '');
  const initial = ['stats', ...METER_TYPES].includes(hash) ? hash : 'stats';

  setupEventListeners();

  document.addEventListener('click', e => {
    const granBtn = e.target.closest('.chart-gran-btn');
    if (granBtn) {
      modalGran = granBtn.dataset.gran;
      document.querySelectorAll('.chart-gran-btn').forEach(b => b.classList.toggle('active', b === granBtn));
      renderModalChart();
      return;
    }
    const rangeBtn = e.target.closest('.chart-range-btn');
    if (rangeBtn) {
      modalRange = rangeBtn.dataset.range;
      document.querySelectorAll('.chart-range-btn').forEach(b => b.classList.toggle('active', b === rangeBtn));
      renderModalChart();
      return;
    }
    if (e.target.closest('.btn-chart-expand')) {
      openChartModal(e.target.closest('.btn-chart-expand').dataset.type);
    } else if (e.target.closest('#chart-modal-close') || e.target.id === 'chart-modal-backdrop') {
      closeChartModal();
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeChartModal(); });

  switchTab(initial);

  if (initial === 'water') updateSlotPreview();
}

document.addEventListener('DOMContentLoaded', init);
