<?php
require_once __DIR__ . '/config.php';
$key = $_GET['key'] ?? '';
if ($key !== SECRET_KEY) { http_response_code(404); exit; }
$safeKey = htmlspecialchars($key, ENT_QUOTES);
?><!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>Zähler erfassen</title>
<link rel="stylesheet" href="style.css">
<style>
body {
  padding: .85rem;
  padding-bottom: calc(.85rem + env(safe-area-inset-bottom));
  max-width: 480px;
  margin: 0 auto;
}

.mob-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.1rem;
  padding-bottom: .75rem;
  border-bottom: 1px solid var(--color-border);
}
.mob-header h1 { font-size: 1.1rem; font-weight: 600; margin: 0; }
.mob-back { font-size: .85rem; color: var(--color-text-muted); text-decoration: none; }
.mob-back:hover { color: var(--color-text); }

.mob-card {
  background: var(--color-surface);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: .85rem;
}
.mob-card-header {
  display: flex;
  align-items: center;
  gap: .55rem;
  margin-bottom: .9rem;
}
.mob-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.mob-card-header h2 { font-size: 1rem; font-weight: 600; margin: 0; flex: 1; }
.mob-unit { font-size: .8rem; color: var(--color-text-muted); }

.mob-row { display: flex; gap: .5rem; margin-bottom: .5rem; }

.mob-input {
  width: 100%;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  padding: .65rem .75rem;
  font-size: 1rem;
  box-sizing: border-box;
  -webkit-appearance: none;
}
.mob-input:focus { outline: none; border-color: var(--color-primary); }
.mob-input--date { margin-bottom: .5rem; }
.mob-input--time { max-width: 108px; flex-shrink: 0; }
.mob-input--reading {
  font-size: 1.5rem;
  text-align: right;
  margin-bottom: .5rem;
  font-variant-numeric: tabular-nums;
}
.mob-input--comment { font-size: .9rem; color: var(--color-text-muted); margin-bottom: .6rem; }
.mob-input--comment::placeholder { color: var(--color-text-muted); opacity: .6; }

.mob-slot { font-size: .8rem; color: var(--color-text-muted); margin-bottom: .5rem; min-height: 1.1em; }

.mob-btn {
  width: 100%;
  padding: .9rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity .12s;
  -webkit-tap-highlight-color: transparent;
}
.mob-btn:active { opacity: .75; }
.mob-btn:disabled { opacity: .45; cursor: default; }
.mob-btn--water       { background: var(--meter-water);       color: #fff; }
.mob-btn--electricity { background: var(--meter-electricity); color: #1a1a1a; }
.mob-btn--gas         { background: var(--meter-gas);         color: #1a1a1a; }

.mob-status {
  margin-top: .55rem;
  padding: .45rem .75rem;
  border-radius: 6px;
  font-size: .9rem;
  display: none;
}
.mob-status.success { display: block; background: rgba(174,214,149,.12); color: #aed695; border: 1px solid rgba(174,214,149,.25); }
.mob-status.error   { display: block; background: rgba(250,128,114,.12); color: salmon;  border: 1px solid rgba(250,128,114,.25); }
</style>
</head>
<body>

<div class="mob-header">
  <h1>Zähler erfassen</h1>
  <a class="mob-back" href="index.php?key=<?= $safeKey ?>#stats">← Übersicht</a>
</div>

<!-- Wasser -->
<div class="mob-card">
  <div class="mob-card-header">
    <span class="mob-dot" style="background:var(--meter-water)"></span>
    <h2>Wasser</h2>
    <span class="mob-unit">m³</span>
  </div>
  <div class="mob-row">
    <input type="date" id="water-date" class="mob-input">
    <input type="time" id="water-time" class="mob-input mob-input--time">
  </div>
  <div class="mob-slot" id="water-slot"></div>
  <input type="number" id="water-reading" class="mob-input mob-input--reading"
    step="0.1" min="0" inputmode="decimal" autocomplete="off" placeholder="0,0">
  <input type="text" id="water-comment" class="mob-input mob-input--comment"
    placeholder="Kommentar (optional)" maxlength="200">
  <button class="mob-btn mob-btn--water" id="water-submit">Speichern</button>
  <div class="mob-status" id="water-status"></div>
</div>

<!-- Strom -->
<div class="mob-card">
  <div class="mob-card-header">
    <span class="mob-dot" style="background:var(--meter-electricity)"></span>
    <h2>Strom</h2>
    <span class="mob-unit">kWh</span>
  </div>
  <input type="date" id="electricity-date" class="mob-input mob-input--date">
  <input type="number" id="electricity-reading" class="mob-input mob-input--reading"
    step="1" min="0" inputmode="numeric" autocomplete="off" placeholder="0">
  <input type="text" id="electricity-comment" class="mob-input mob-input--comment"
    placeholder="Kommentar (optional)" maxlength="200">
  <button class="mob-btn mob-btn--electricity" id="electricity-submit">Speichern</button>
  <div class="mob-status" id="electricity-status"></div>
</div>

<!-- Gas -->
<div class="mob-card">
  <div class="mob-card-header">
    <span class="mob-dot" style="background:var(--meter-gas)"></span>
    <h2>Gas</h2>
    <span class="mob-unit">m³</span>
  </div>
  <input type="date" id="gas-date" class="mob-input mob-input--date">
  <input type="number" id="gas-reading" class="mob-input mob-input--reading"
    step="1" min="0" inputmode="numeric" autocomplete="off" placeholder="0">
  <input type="text" id="gas-comment" class="mob-input mob-input--comment"
    placeholder="Kommentar (optional)" maxlength="200">
  <button class="mob-btn mob-btn--gas" id="gas-submit">Speichern</button>
  <div class="mob-status" id="gas-status"></div>
</div>

<script>
'use strict';
const KEY = '<?= $safeKey ?>';
const API = 'api.php';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function currentTimeStr() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}
function pad(n) { return String(n).padStart(2, '0'); }

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

function updateSlot() {
  const dateVal = document.getElementById('water-date').value;
  const timeVal = document.getElementById('water-time').value;
  const preview = document.getElementById('water-slot');
  if (!dateVal) { preview.textContent = ''; return; }
  const timeUsed = timeVal || currentTimeStr();
  const dt   = new Date(`${dateVal}T${timeUsed}:00`);
  const slot = roundToSlot(dt);
  const label = slot.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  preview.textContent = `→ Slot: ${label} Uhr${slot.getDate() !== dt.getDate() ? ' (nächster Tag)' : ''}`;
}

function showStatus(type, msg, isError) {
  const el = document.getElementById(`${type}-status`);
  el.textContent = msg;
  el.className = `mob-status ${isError ? 'error' : 'success'}`;
}

async function submit(type) {
  const dateVal    = document.getElementById(`${type}-date`).value;
  const readingVal = document.getElementById(`${type}-reading`).value;
  const comment    = document.getElementById(`${type}-comment`).value.trim();
  const btn        = document.getElementById(`${type}-submit`);

  if (!dateVal || readingVal === '') {
    showStatus(type, 'Datum und Zählerstand erforderlich.', true);
    return;
  }

  let timestamp;
  if (type === 'water') {
    const timeVal  = document.getElementById('water-time').value;
    const timeUsed = timeVal || currentTimeStr();
    const slotted  = roundToSlot(new Date(`${dateVal}T${timeUsed}:00`));
    timestamp = `${slotted.getFullYear()}-${pad(slotted.getMonth()+1)}-${pad(slotted.getDate())}T${pad(slotted.getHours())}:00:00`;
  } else {
    timestamp = `${dateVal}T00:00:00`;
  }

  btn.disabled = true;
  try {
    const res = await fetch(`${API}?action=add&type=${type}&key=${KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp, reading: parseFloat(readingVal), comment }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`);
    const fmt = type === 'water'
      ? parseFloat(readingVal).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : parseFloat(readingVal).toLocaleString('de-DE', { maximumFractionDigits: 0 });
    showStatus(type, `✓ ${fmt} gespeichert`, false);
    document.getElementById(`${type}-reading`).value = '';
    document.getElementById(`${type}-comment`).value = '';
  } catch (e) {
    showStatus(type, e.message, true);
  }
  btn.disabled = false;
}

document.addEventListener('DOMContentLoaded', () => {
  const today = todayStr();
  ['water', 'electricity', 'gas'].forEach(t => {
    document.getElementById(`${t}-date`).value = today;
  });
  document.getElementById('water-time').value = currentTimeStr();
  updateSlot();

  document.getElementById('water-date').addEventListener('input', updateSlot);
  document.getElementById('water-time').addEventListener('input', updateSlot);

  ['water', 'electricity', 'gas'].forEach(t => {
    document.getElementById(`${t}-submit`).addEventListener('click', () => submit(t));
    document.getElementById(`${t}-reading`).addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); submit(t); }
    });
  });
});
</script>
</body>
</html>
