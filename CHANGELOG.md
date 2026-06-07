# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.1] - 2026-06-07

### Added
- Chart modal with dynamic granularity toggle (Monat / Woche / Tag)
- Time range selector in chart modal (3M / 6M / 1J / 2J / Alle)
- Eye-button on consumption chart to open full-history modal
- APP_VERSION constant in config.php, displayed in page footer

### Changed
- Consumption charts changed from daily to monthly aggregation (last 24 months in detail view, last 12 months in overview)
- Stats overview chart shows last 12 months instead of last 30 days
- KPI tile "Heute" renamed to "Letztes Jahr" for gas and electricity, showing rolling 12-month consumption
- KPI tile "Ø/Woche" removed in favour of "Letztes Jahr"
- Overview stats "Heute" row renamed to "Letztes Jahr" for all meter types
- Chart title updated to "Monatsverbrauch (letzte 2 Jahre)"
- Form submit button vertical alignment corrected

## [0.1.0] - 2026-06-06

### Added
- Initial release
- Water, electricity and gas meter reading tracking
- Contract management per meter type (provider, base price, unit price, validity period)
- KPI tiles: current reading, this week, this month, cost/month
- Cost calculation based on active contract (variable + base price)
- Daily consumption bar chart and reading trend chart per meter type
- Overview/stats panel with charts for all three meter types
- Anomaly detection with configurable threshold per meter type
- CSV export of readings
- Reading table with pagination
- Toast notifications for save/delete actions
