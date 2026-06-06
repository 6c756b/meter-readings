<?php
require_once __DIR__ . '/config.php';
$key = $_GET['key'] ?? '';
if ($key !== SECRET_KEY) { http_response_code(404); exit; }

$meters = [
    'water' => [
        'label'            => 'Wasser',
        'unit'             => 'm³',
        'consumUnit'       => 'L',
        'thresholdUnit'    => 'L/Tag',
        'hasTime'          => true,
        'placeholder'      => 'z. B. 10.5',
        'step'             => '0.1',
        'icon'             => '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6 8 4 13 4 16a8 8 0 0 0 16 0c0-3-2-8-8-14z"/></svg>',
    ],
    'electricity' => [
        'label'            => 'Strom',
        'unit'             => 'kWh',
        'consumUnit'       => 'kWh',
        'thresholdUnit'    => 'kWh/Tag',
        'hasTime'          => false,
        'placeholder'      => 'z. B. 4850',
        'step'             => '1',
        'icon'             => '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    ],
    'gas' => [
        'label'            => 'Gas',
        'unit'             => 'm³',
        'consumUnit'       => 'm³',
        'thresholdUnit'    => 'm³/Tag',
        'hasTime'          => false,
        'placeholder'      => 'z. B. 1234',
        'step'             => '1',
        'icon'             => '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    ],
];

$key = htmlspecialchars($_GET['key']);
?>
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zähler-Tracker</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js" defer></script>
  <script src="app.js" defer></script>
</head>
<body>

<header class="app-header">
  <div class="container">
    <a class="app-title" href="?key=<?= $key ?>">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="40" height="40">
        <g transform="translate(0,512) scale(0.1,-0.1)" fill="#c4c4c4" stroke="none">
          <path d="M1226 4340 c-102 -90 -143 -291 -96 -474 20 -78 76 -204 126 -285 23 -38 24 -43 8 -37 -38 15 -171 19 -225 6 -129 -30 -253 -124 -294 -223 -12 -29 -11 -38 5 -75 28 -63 113 -140 199 -181 63 -30 88 -36 161 -39 47 -2 103 1 125 7 21 6 40 9 41 8 1 -1 -4 -31 -12 -67 -7 -36 -17 -123 -20 -195 l-7 -130 -41 -45 c-85 -91 -145 -198 -192 -340 -26 -80 -28 -96 -28 -255 -1 -193 9 -243 75 -383 99 -214 273 -377 493 -466 65 -27 103 -50 149 -92 81 -73 262 -194 358 -238 144 -67 202 -78 421 -83 208 -5 276 1 389 38 144 46 335 161 481 289 33 29 82 61 110 72 146 55 260 130 364 241 239 251 310 619 182 951 -32 83 -126 232 -177 280 -28 27 -31 35 -31 95 0 87 -18 229 -39 313 l-17 66 36 -18 c122 -62 277 -67 394 -12 108 50 177 115 211 195 12 29 11 38 -4 73 -10 22 -41 63 -68 90 -116 116 -279 160 -438 118 -56 -14 -86 -28 -148 -68 -21 -14 -16 -3 27 63 66 100 117 204 148 301 30 97 33 267 5 346 -57 163 -165 229 -252 152 -43 -37 -75 -98 -140 -263 -89 -226 -167 -345 -226 -345 -11 0 -51 18 -87 39 -85 51 -196 95 -309 123 -81 21 -110 23 -368 23 -233 0 -292 -3 -352 -18 -111 -26 -232 -73 -318 -122 -43 -25 -89 -45 -102 -45 -57 0 -135 124 -227 364 -83 214 -121 266 -204 274 -44 4 -52 1 -86 -28z m149 -325 c69 -179 124 -282 184 -347 l53 -58 -42 -48 c-24 -26 -47 -51 -51 -56 -12 -14 -127 151 -179 258 -26 56 -54 125 -60 154 -15 63 -9 195 10 235 l14 28 13 -24 c7 -14 33 -78 58 -142z m2379 0 c0 -89 -4 -109 -32 -182 -33 -81 -120 -227 -177 -298 l-31 -37 -48 56 -48 56 49 54 c60 65 106 151 179 333 31 76 61 149 66 163 l10 25 17 -35 c11 -25 16 -64 15 -135z m-869 -289 c403 -122 685 -451 733 -856 5 -41 8 -76 7 -78 -2 -2 -29 10 -61 26 -98 50 -215 81 -343 93 -78 7 -357 9 -798 6 -657 -4 -681 -4 -762 -26 -46 -12 -122 -39 -169 -61 -47 -22 -87 -38 -89 -36 -9 9 20 174 44 250 116 372 422 638 813 710 14 2 140 3 280 2 246 -2 258 -3 345 -30z m-1631 -355 c23 -10 56 -30 74 -46 l33 -28 -23 -24 c-62 -66 -185 -97 -279 -70 -52 16 -139 70 -139 87 0 26 89 84 155 101 43 11 132 1 179 -20z m2849 -1 c44 -21 97 -64 97 -80 0 -17 -87 -71 -139 -87 -94 -27 -217 4 -279 70 l-23 24 32 27 c90 76 211 94 312 46z m-760 -638 c457 -127 686 -622 483 -1047 -93 -196 -259 -333 -481 -397 l-80 -23 -755 0 -755 0 -90 28 c-261 82 -450 276 -515 532 -27 105 -27 264 -1 367 77 300 336 524 645 558 39 4 386 7 771 6 684 -2 702 -3 778 -24z m-243 -1636 c0 -9 -131 -88 -194 -116 -124 -57 -199 -70 -391 -70 -139 0 -187 4 -251 20 -84 21 -259 103 -309 144 l-30 25 588 1 c323 0 587 -2 587 -4z"/>
          <path d="M1877 3350 c-100 -39 -162 -114 -174 -209 -7 -61 12 -96 56 -106 41 -9 89 18 96 53 19 92 55 122 147 122 98 0 158 -39 158 -103 0 -33 40 -77 69 -77 61 0 98 51 86 117 -17 100 -89 178 -188 208 -71 21 -190 19 -250 -5z"/>
          <path d="M2887 3350 c-103 -40 -164 -115 -174 -214 -5 -49 -3 -57 20 -80 28 -28 53 -32 91 -15 23 11 32 26 52 94 14 46 66 75 136 75 98 0 158 -39 158 -103 0 -33 40 -77 69 -77 68 0 101 53 82 133 -22 94 -88 163 -187 193 -67 20 -188 17 -247 -6z"/>
          <path d="M1804 2450 c-62 -13 -139 -55 -185 -101 -92 -92 -125 -249 -78 -374 31 -83 121 -173 204 -204 85 -32 207 -27 283 13 220 113 266 396 91 567 -84 83 -207 122 -315 99z m157 -176 c76 -39 119 -132 98 -216 -21 -91 -94 -148 -188 -148 -112 0 -191 78 -191 190 0 146 152 240 281 174z"/>
          <path d="M3090 2449 c-112 -23 -208 -100 -258 -207 -22 -47 -27 -71 -27 -142 0 -77 3 -92 33 -152 36 -75 95 -133 170 -169 71 -34 198 -38 274 -9 75 28 155 101 193 177 27 52 30 68 30 153 0 83 -3 102 -27 150 -71 145 -237 230 -388 199z m160 -178 c53 -27 92 -89 98 -155 11 -134 -102 -228 -243 -202 -71 14 -144 107 -145 187 0 19 12 58 26 87 50 100 161 135 264 83z"/>
        </g>
      </svg>
      Zähler-Tracker
    </a>
    <div style="display:flex;gap:.5rem;align-items:center">
      <a class="btn btn-secondary" href="mobile.php?key=<?= htmlspecialchars($key, ENT_QUOTES) ?>" style="text-decoration:none">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
        </svg>
        Erfassen
      </a>
      <button class="btn btn-secondary" id="btn-export">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        CSV exportieren
      </button>
    </div>
  </div>
</header>

<nav class="tab-nav">
  <div class="container">
    <button class="tab-btn" data-meter="stats">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      Übersicht
    </button>
    <?php foreach ($meters as $t => $cfg): ?>
    <button class="tab-btn" data-meter="<?= $t ?>">
      <?= $cfg['icon'] ?>
      <?= $cfg['label'] ?>
    </button>
    <?php endforeach; ?>
  </div>
</nav>

<main class="container">

<!-- Stats-Übersicht -->
<div class="meter-panel" data-panel="stats" hidden>
  <section class="section">
    <div class="stats-grid">
      <?php foreach ($meters as $t => $cfg): ?>
      <div class="stats-col card" data-col="<?= $t ?>">
        <div class="stats-col-header">
          <?= $cfg['icon'] ?> <?= $cfg['label'] ?>
        </div>
        <div class="stats-kpis">
          <div class="stats-kpi">
            <span class="stats-kpi-label">Heute</span>
            <span class="stats-kpi-right">
              <span class="stats-kpi-value" id="stats-<?= $t ?>-today">—</span>
              <span class="stats-kpi-unit"><?= $cfg['consumUnit'] ?></span>
            </span>
          </div>
          <div class="stats-kpi">
            <span class="stats-kpi-label">Diese Woche</span>
            <span class="stats-kpi-right">
              <span class="stats-kpi-value" id="stats-<?= $t ?>-week">—</span>
              <span class="stats-kpi-unit"><?= $cfg['consumUnit'] ?></span>
              <span class="stats-kpi-sub" id="stats-<?= $t ?>-week-avg"></span>
            </span>
          </div>
          <div class="stats-kpi">
            <span class="stats-kpi-label">Dieser Monat</span>
            <span class="stats-kpi-right">
              <span class="stats-kpi-value" id="stats-<?= $t ?>-month">—</span>
              <span class="stats-kpi-unit"><?= $cfg['consumUnit'] ?></span>
              <span class="stats-kpi-sub" id="stats-<?= $t ?>-month-avg"></span>
            </span>
          </div>
          <div class="stats-kpi stats-kpi--cost" id="stats-<?= $t ?>-cost-row" hidden>
            <span class="stats-kpi-label">Kosten/Monat</span>
            <span class="stats-kpi-right">
              <span class="stats-kpi-value stats-kpi-value--cost" id="stats-<?= $t ?>-cost-month">—</span>
              <span class="stats-kpi-unit">€</span>
            </span>
          </div>
        </div>
        <div class="chart-wrapper-sm">
          <canvas id="stats-<?= $t ?>-chart"></canvas>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
  </section>
</div>

<?php foreach ($meters as $t => $cfg): ?>
<!-- Zähler-Panels -->
<div class="meter-panel" data-panel="<?= $t ?>" hidden>

  <section class="section">
    <div class="card">
      <p class="section-title">Neuer Eintrag</p>
      <!-- Eingabe -->
      <form id="<?= $t ?>-form" novalidate>
        <div class="form-grid">

          <div class="form-group">
            <label for="<?= $t ?>-input-date">Datum</label>
            <input type="date" id="<?= $t ?>-input-date" required>
            <span class="error-message" id="<?= $t ?>-err-date"></span>
          </div>

          <?php if ($cfg['hasTime']): ?>
          <div class="form-group">
            <label for="<?= $t ?>-input-time">Uhrzeit</label>
            <input type="time" id="<?= $t ?>-input-time" placeholder="Jetzt">
            <span class="slot-preview" id="<?= $t ?>-slot-preview"></span>
            <span class="error-message" id="<?= $t ?>-err-time"></span>
          </div>
          <?php endif; ?>

          <div class="form-group">
            <label for="<?= $t ?>-input-reading">Zählerstand (<?= $cfg['unit'] ?>)</label>
            <input type="number" id="<?= $t ?>-input-reading"
              step="<?= $cfg['step'] ?>" min="0"
              placeholder="<?= $cfg['placeholder'] ?>"
              inputmode="decimal" required>
            <span class="error-message" id="<?= $t ?>-err-reading"></span>
          </div>

          <div class="form-group">
            <label for="<?= $t ?>-input-comment">Kommentar</label>
            <input type="text" id="<?= $t ?>-input-comment" placeholder="Optionaler Kommentar">
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="<?= $t ?>-btn-submit">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Eintrag speichern
            </button>
          </div>

        </div>
      </form>
    </div>
  </section>

  <!-- KPI-Karten -->
  <section class="section">
    <div class="grid-4">
      <div class="card kpi-card">
        <span class="kpi-label">Aktueller Stand</span>
        <span class="kpi-value" id="<?= $t ?>-kpi-current">—</span>
        <span class="kpi-unit"><?= $cfg['unit'] ?></span>
      </div>
      <div class="card kpi-card">
        <span class="kpi-label">Heute</span>
        <span class="kpi-value" id="<?= $t ?>-kpi-today">—</span>
        <span class="kpi-unit"><?= $cfg['consumUnit'] ?></span>
      </div>
      <div class="card kpi-card">
        <span class="kpi-label">Diese Woche</span>
        <span class="kpi-value" id="<?= $t ?>-kpi-week">—</span>
        <span class="kpi-unit"><?= $cfg['consumUnit'] ?> <span class="kpi-avg" id="<?= $t ?>-kpi-week-avg"></span></span>
      </div>
      <div class="card kpi-card">
        <span class="kpi-label">Dieser Monat</span>
        <span class="kpi-value" id="<?= $t ?>-kpi-month">—</span>
        <span class="kpi-unit"><?= $cfg['consumUnit'] ?> <span class="kpi-avg" id="<?= $t ?>-kpi-month-avg"></span></span>
      </div>
    </div>
  </section>

  <!-- Kosten-KPIs -->
  <section class="section" id="<?= $t ?>-cost-section" hidden>
    <div class="grid-4">
      <div class="card kpi-card">
        <span class="kpi-label">Grundpreis</span>
        <span class="kpi-value" id="<?= $t ?>-cost-base">—</span>
        <span class="kpi-unit">€/Monat</span>
      </div>
      <div class="card kpi-card">
        <span class="kpi-label">Arbeitspreis</span>
        <span class="kpi-value" id="<?= $t ?>-cost-unit-price">—</span>
        <span class="kpi-unit">€/<?= $cfg['unit'] ?></span>
      </div>
      <div class="card kpi-card">
        <span class="kpi-label">Kosten Monat</span>
        <span class="kpi-value" id="<?= $t ?>-cost-month">—</span>
        <span class="kpi-unit">€</span>
      </div>
      <div class="card kpi-card">
        <span class="kpi-label">Hochrechnung Jahr</span>
        <span class="kpi-value" id="<?= $t ?>-cost-year">—</span>
        <span class="kpi-unit">€</span>
      </div>
    </div>
  </section>

  <!-- Schwellenwert -->
  <section class="section">
    <div class="card">
      <div class="slider-row">
        <span class="slider-label">
          Schwellenwert: <strong id="<?= $t ?>-threshold-display">—</strong> <?= $cfg['thresholdUnit'] ?>
        </span>
        <input type="range" id="<?= $t ?>-threshold-slider" min="1" max="500" step="1" value="200">
      </div>
    </div>
  </section>

  <!-- Diagramme -->
  <section class="section">
    <div class="grid-2">
      <div class="card">
        <p class="chart-title">Tagesverbrauch (alle Einträge, max. 120 Tage)</p>
        <div class="chart-wrapper">
          <canvas id="<?= $t ?>-chart-daily"></canvas>
        </div>
      </div>
      <div class="card">
        <p class="chart-title">Zählerstandsverlauf (letzte 30 Messungen)</p>
        <div class="chart-wrapper">
          <canvas id="<?= $t ?>-chart-trend"></canvas>
        </div>
      </div>
    </div>
  </section>

  <!-- Tabelle -->
  <section class="section">
    <div class="card">
      <p class="section-title">Alle Einträge</p>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Datum</th>
              <?php if ($cfg['hasTime']): ?><th>Uhrzeit</th><?php endif; ?>
              <th>Zählerstand (<?= $cfg['unit'] ?>)</th>
              <th>Verbrauch (<?= $cfg['consumUnit'] ?>)</th>
              <th>&#216; <?= $cfg['consumUnit'] ?>/Tag</th>
              <th>Kommentar</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="<?= $t ?>-table-body">
            <tr><td colspan="7" class="empty-state">Lade Daten&#8230;</td></tr>
          </tbody>
        </table>
      </div>
      <div id="<?= $t ?>-table-pagination" class="table-pagination"></div>
    </div>
  </section>

  <!-- Verträge -->
  <section class="section">
    <div class="card">
      <div class="section-title-row">
        <p class="section-title">Vertrag</p>
        <button type="button" class="btn btn-secondary btn-sm" id="<?= $t ?>-btn-add-contract">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Hinzufügen
        </button>
      </div>

      <div id="<?= $t ?>-contract-form-wrap" hidden>
        <form id="<?= $t ?>-contract-form" novalidate class="contract-form">
          <div class="form-grid">
            <div class="form-group">
              <label for="<?= $t ?>-contract-from">Gültig ab</label>
              <input type="date" id="<?= $t ?>-contract-from" required>
            </div>
            <div class="form-group">
              <label for="<?= $t ?>-contract-to">Gültig bis</label>
              <input type="date" id="<?= $t ?>-contract-to">
              <span class="slot-preview">Leer = aktuell gültig</span>
            </div>
            <div class="form-group">
              <label for="<?= $t ?>-contract-base">Grundpreis (€/Monat)</label>
              <input type="number" id="<?= $t ?>-contract-base" step="0.01" min="0" placeholder="z. B. 12.50" inputmode="decimal" required>
            </div>
            <div class="form-group">
              <label for="<?= $t ?>-contract-unit-price">Arbeitspreis (€/<?= $cfg['unit'] ?>)</label>
              <input type="number" id="<?= $t ?>-contract-unit-price" step="0.0001" min="0" placeholder="z. B. 0.3200" inputmode="decimal" required>
            </div>
            <div class="form-group" id="<?= $t ?>-contract-comment-group" hidden style="grid-column:1/-1">
              <label for="<?= $t ?>-contract-comment">Notiz</label>
              <input type="text" id="<?= $t ?>-contract-comment" maxlength="300" placeholder="z. B. Preiserhöhung ab März">
            </div>
            <div class="form-actions" style="gap:.5rem">
              <button type="submit" class="btn btn-primary btn-sm"><span id="<?= $t ?>-contract-submit-label">Speichern</span></button>
              <button type="button" class="btn btn-secondary btn-sm" id="<?= $t ?>-contract-cancel">Abbrechen</button>
            </div>
          </div>
        </form>
      </div>

      <div id="<?= $t ?>-contract-list"></div>
    </div>
  </section>

</div>
<?php endforeach; ?>

</main>

<div class="toast-container" id="toast-container"></div>

</body>
</html>
