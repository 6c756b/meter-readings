# Zähler-Tracker

A self-hosted utility meter tracker for **water, electricity, and gas**. Log readings manually, visualize consumption over time, and track tariff costs — all in a single PHP + Vanilla JS app with no build system.

> UI language is German. Auth is a shared secret key in the URL.

## Features

- **Three meter types** — Water (with 4-hour time-slot rounding), Electricity, Gas
- **Stats overview** — side-by-side KPIs and charts for all three meters at a glance
- **KPI tiles** — current reading, last 12 months, this week, this month, cost/month
- **Cost tracking** — tariff contracts (base fee + unit price) with full price history; cost is calculated per-day using the correct contract for each period
- **Monthly charts** — consumption bar chart (last 24 months) and reading trend line per meter
- **Chart modal** — full history view with dynamic granularity (month / week / day) and time range (3M / 6M / 1J / 2J / all)
- **Anomaly detection** — configurable threshold; high-consumption periods highlighted in red
- **Mobile capture page** — `/mobile.php` optimized for quick phone entry, bookmarkable
- **CSV export** — date, reading, consumption, daily average, comment
- **No build step** — plain PHP + Vanilla JS, runs with `php -S`
- **Dark theme** — fixed

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | PHP 8+, single `api.php`, JSON file storage |
| Frontend | Vanilla JS (ES2020), no frameworks |
| Charts | [Chart.js 4.4](https://www.chartjs.org/) via CDN |
| Auth | Shared secret key via URL parameter |

## Setup

```bash
git clone https://github.com/your-user/meter-readings.git
cd meter-readings

cp config.example.php config.php
# Edit config.php → set SECRET_KEY to a random string

php -S localhost:8080
```

Open: `http://localhost:8080/?key=YOUR_SECRET_KEY`

For production, deploy to any PHP-capable web host. Make sure the `data/` directory is writable and not publicly listed.

## Configuration

`config.php` has two settings:

```php
define('SECRET_KEY', 'your-secret-key-here');
define('APP_VERSION', '0.1.1');
```

Data is stored as JSON files in `data/` (gitignored by default). No database required.

## Usage

### Logging readings

Select a meter tab, enter the reading and an optional comment, click **Speichern**.

- **Water** — rounded to the nearest 4-hour slot (00:00, 04:00, 08:00 …)
- **Electricity / Gas** — date only, no time input

### Mobile capture

`/mobile.php?key=YOUR_KEY` — all three input forms on one minimal page. Bookmark to home screen for quick access.

### Cost tracking

In any meter tab, scroll to **Vertrag** and add a tariff entry:

| Field | Description |
|---|---|
| Gültig ab | Contract start date |
| Gültig bis | Contract end date (empty = currently active) |
| Grundpreis | Monthly base fee (€/month) |
| Arbeitspreis | Unit price (€/kWh or €/m³) |

Add a new entry whenever prices change — historical entries are preserved for accurate retroactive cost calculation.

### Charts

The detail chart shows **monthly consumption for the last 2 years**. Click the eye icon (👁) to open a full-history modal where you can switch granularity and time range:

| Control | Options |
|---|---|
| Granularity | Monat · Woche · Tag |
| Time range | 3M · 6M · 1J · 2J · Alle |

### CSV Export

Click **CSV exportieren** in any meter tab. Includes: date, time (water only), reading, consumption, daily average, comment.

## File Structure

```
index.php           — App shell (auth, HTML, PHP meter config)
app.js              — All frontend logic (state, API calls, rendering, charts)
style.css           — Dark theme (CSS custom properties)
api.php             — REST-style API (readings + contracts, JSON storage)
mobile.php          — Mobile-optimized capture page
config.php          — Secret key + version (not committed)
config.example.php  — Template for config.php
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
GET  ?action=list&type=…                  → all readings (ascending)
POST ?action=add&type=…                   → add reading { timestamp, reading, comment? }
POST ?action=delete&id=…&type=…           → delete reading by UUID

GET  ?action=list_contracts&type=…        → all contracts (descending by valid_from)
POST ?action=save_contract&type=…         → add contract { valid_from, valid_to?, base_monthly, unit_price, comment? }
POST ?action=update_contract&id=…&type=…  → update contract
POST ?action=delete_contract&id=…&type=…  → delete contract
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).
