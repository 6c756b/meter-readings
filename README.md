# Zähler-Tracker

A self-hosted utility meter tracker for **water, electricity, and gas**. The UI language is **German**. Log readings manually, visualize consumption over time, and optionally track tariff costs — all in a single PHP + Vanilla JS app with no build system or external dependencies beyond Chart.js.

## Features

- **Three meter types** — Water (with 4-hour time-slot rounding), Electricity, Gas
- **Stats overview** — side-by-side consumption KPIs and charts for all three meters
- **Cost tracking** — optional tariff contracts (base fee + unit price) with full price history for multi-year use
- **Charts** — daily consumption bar chart and meter reading trend line per meter
- **Anomaly detection** — configurable daily threshold; high-consumption days highlighted in red
- **Mobile capture page** — minimal `/mobile.php` optimized for phone input, bookmarkable
- **CSV export** — per-meter export with date, reading, consumption, daily average, and comment
- **No build step** — plain PHP + Vanilla JS, runs with `php -S`
- **Dark theme** — fixed, no light mode

## Tech Stack

- **Backend:** PHP 8+ (single `api.php` file, JSON file storage)
- **Frontend:** Vanilla JS (ES2020), no frameworks
- **Charts:** [Chart.js 4.4](https://www.chartjs.org/) via CDN
- **Auth:** shared secret key via URL parameter

## Setup

```bash
git clone https://github.com/your-user/meter-readings.git
cd meter-readings

# Copy and edit the config
cp config.example.php config.php
# → set SECRET_KEY to a random string

# Start the built-in PHP server
php -S localhost:8080
```

Then open: `http://localhost:8080/?key=YOUR_SECRET_KEY`

> The app auto-creates a demo entry on first visit if the data file is empty.

## Configuration

Edit `config.php`:

```php
<?php
define('SECRET_KEY', 'your-secret-key-here');
```

Data is stored in `data/*.json` (gitignored by default). No database required.

## Usage

### Logging readings

Open the app and select a meter tab. Enter the meter reading and optionally a comment, then click **Speichern**.

- **Water** — readings are rounded to the nearest 4-hour time slot (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
- **Electricity / Gas** — one reading per day, no time input required

### Mobile capture

Navigate to `/mobile.php?key=YOUR_KEY` for a stripped-down page showing all three input forms. Designed for quick phone entry — bookmark it to your home screen.

### Cost tracking

In any meter tab, scroll to the **Vertrag** section and add a tariff:

| Field | Description |
|---|---|
| Gültig ab | Contract start date |
| Gültig bis | Contract end date (leave empty = currently active) |
| Grundpreis | Monthly base fee (€/month) |
| Arbeitspreis | Unit price (€/m³ or €/kWh) |

Add a new contract entry whenever prices change — old entries are kept for historical cost calculations. The newest contract valid for a given date is always used.

### CSV Export

Switch to any meter tab and click **CSV exportieren**. The export includes: date, time (water only), meter reading, consumption, daily average, and comment.

## File Structure

```
index.php          — App shell (PHP auth + HTML)
app.js             — All frontend logic (state, API calls, rendering, charts)
style.css          — Dark theme (CSS custom properties)
api.php            — REST API (readings + contracts, JSON file storage)
mobile.php         — Mobile-optimized capture page
config.php         — Secret key (not committed)
config.example.php — Template for config.php
data/
  water.json                  — Water readings
  electricity.json            — Electricity readings
  gas.json                    — Gas readings
  contracts_water.json        — Water tariff history
  contracts_electricity.json  — Electricity tariff history
  contracts_gas.json          — Gas tariff history
```

## API

All endpoints require `&key=SECRET_KEY` and `&type=water|electricity|gas`.

```
GET  ?action=list&type=…               → all readings (ascending)
POST ?action=add&type=…                → add reading  { timestamp, reading, comment? }
POST ?action=delete&id=…&type=…        → delete reading by UUID

GET  ?action=list_contracts&type=…     → all contracts (descending)
POST ?action=save_contract&type=…      → add contract  { valid_from, valid_to?, base_monthly, unit_price, comment? }
POST ?action=update_contract&id=…&type=… → update contract
POST ?action=delete_contract&id=…&type=… → delete contract
```

## License

MIT
