# Staffing Middleman System — React + Express + Google Sheets

## Setup

### 1. Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable **Google Sheets API**
4. Go to **Credentials** → **Create Credentials** → **Service Account**
5. Download the JSON key file
6. Rename it to `credentials.json` and place it in the project root

### 2. Google Sheet

1. Open your existing Google Sheet (the one used by the Apps Script version)
2. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```
3. Share the sheet with the service account email (found in `credentials.json` → `client_email`) — give **Editor** access

### 3. Environment Variables

Edit the `.env` file in the project root:

```env
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_CREDENTIALS_PATH=./credentials.json
PORT=5000
```

### 4. Install & Run

```bash
npm install
npm run dev
```

This starts:
- **React** dev server on `http://localhost:3000`
- **Express** API server on `http://localhost:5000`

The React dev server proxies `/api/*` requests to Express.

### 5. Production Build

```bash
npm run build
npm start
```

Serves the built React app + API from Express on port 5000.

## Features

- **Dashboard** — receivable/payable overview, status breakdown, recent invoices
- **Customers / Vendors / Agents** — full CRUD
- **Engagements** — link Customer ↔ Vendor with rates and terms
- **Timesheets** — auto-generated description (`Add Time Sheet For MM/DD/YYYY - MM/DD/YYYY (Approved)`) and week number from start date
- **Invoices** — ID format: `invoice-Jun-2026`, auto-generated from timesheets
- **Payments** — record customer received / vendor paid, auto-recomputes balances
- **Commission** — auto-computed from engagement config, mark paid/pending

## Architecture

```
StaffingApp/
├── .env                    # Google Sheets ID + credentials path
├── credentials.json        # Google service account key (DO NOT COMMIT)
├── server/
│   ├── index.js            # Express server
│   ├── googleSheets.js     # Google Sheets API wrapper + business logic
│   └── routes/sheets.js    # REST API endpoints
├── src/
│   ├── main.jsx            # React entry
│   ├── App.jsx             # Router + providers
│   ├── api.js              # Fetch wrapper for /api/*
│   ├── context/AppContext.jsx  # Global state + column constants
│   ├── components/         # All page components
│   └── styles/app.css      # Dark theme CSS
└── index.html              # Vite HTML entry
```
