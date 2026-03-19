# Remittance Tracker

Claims tracking and cross-referencing tool for medical billing remittances. Upload ERA/EOB data as CSV and get instant visibility into claim statuses, denials, forwarded claims, and payment breakdowns by payer.

## Features

- **CSV import** with flexible column mapping (TriZetto, Availity, any clearinghouse export)
- **Auto-status detection** from reason codes (PR-24 → Denied, CO-B11 → Forwarded, etc.)
- **Dashboard** with total billed/paid/denied, status breakdown bar, top reason codes, per-payer summary
- **Claims table** with sorting, filtering by status/payer, search, and CSV export
- **Detail modal** for full claim inspection
- **Persistent storage** via localStorage — data grows across sessions

## Tracked Fields

Patient Name, Member ID, Account #, ICN, Date of Service, CPT/Proc Code, Payer, Billed, Allowed, Deductible, Coinsurance, Copay/Pt Resp, Reason Codes, Provider Paid, Claim Status, Remark Codes

## Status Logic

| Status | Trigger |
|---|---|
| Paid | Prov paid ≥ 90% of allowed |
| Partial | Prov paid > 0 but < 90% |
| Denied | PR-24, PR-27, PR-119, CO-22, OA-18, etc. with $0 paid |
| Forwarded | CO-B11, CO-B9 with $0 paid (misrouted/hospice) |
| Pt Resp | PR-1/2/3 with $0 paid but allowed > 0 |
| Reversed | Negative billed or paid amounts |
| Adjusted | Fallback for other scenarios |

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Tech Stack

- Vite + React
- localStorage persistence
- No external UI libraries — custom dark theme
