# Budget Book

A polished, offline-first personal budgeting web app built with **plain HTML, CSS and JavaScript**. It is designed to feel like a real everyday finance tool rather than a digitized handwritten sheet.

## Personal touch

This version includes a Tagalog/Taglish in-app tutorial written like a personal guide from Kenjie to Lablab. The **Para kay Lablab** button opens the full guide, while each main section has its own **How to use?** guide.

It also includes a small creator credit: **“Your lablab made this for you — Kenjie Reyes”**.

## What it does

### Budget periods
- Create unlimited budget records with a name, start date, end date and available money.
- Return to any previous date/period from **History**.
- Duplicate an older budget to start a fresh period quickly.
- Edit planned days and amount/day directly in the budget table.
- Add, rename and remove custom categories.

### Actual spending
- Add expenses with date, category, description, payment method and note.
- Payment methods include Cash, GCash, Bank Transfer, Debit/Card and Other.
- Edit or delete transactions.
- Search transactions by description, category, date or payment method.
- Actual category totals automatically update from transactions.

### Accounting-style checks
- Planned expenses vs planned savings.
- Planned allocation vs available money.
- Planned total vs actual total per category.
- Actual remaining after recorded spending/savings.
- Physical cash-on-hand entry and cash variance check.
- Clear warning when the planned budget exceeds available money.

### Savings
- Create multiple savings goals.
- Track target amount and saved amount.
- Visual progress and remaining amount.

### Records and portability
- Everything is stored locally in the browser.
- No account, backend, analytics or internet connection is required for normal use.
- Export a complete JSON backup.
- Restore a JSON backup on the same or another device/browser.
- Export the current budget's transactions to CSV.

### Printing
- Dedicated A4 print layout.
- Includes period, totals, planned/actual table, cash reconciliation and notes.
- Works with the browser's **Print → Save as PDF** option.
- Ctrl/Cmd + P also prints the active budget.

### Phone / offline
- Responsive mobile UI with bottom navigation.
- Large touch-friendly controls.
- Dark mode.
- PWA manifest and service worker included for GitHub Pages/HTTPS offline caching.

## Run locally

The app is static and can be opened directly with `index.html`. For service-worker/PWA testing, use a local server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

1. Create a repository.
2. Upload all files and the `icons` folder.
3. Enable GitHub Pages from the repository's Pages settings.
4. Deploy from the `main` branch/root folder.
5. Open the published HTTPS URL once so the service worker can cache the app.

## Data safety

Budget records are stored with browser `localStorage`. This means the app is private and fast, but browser/site-data clearing can remove records. For anything important, export a JSON backup regularly.

The JSON backup is the recommended way to move records between browsers/devices.

## Project structure

```text
Budget-Book-Website/
├── index.html
├── style.css
├── app.js
├── manifest.json
├── service-worker.js
├── README.md
└── icons/
    └── icon.svg
```

No framework, build step, npm install, database or API is required.

## Final verification

The final build was checked before packaging:

- JavaScript syntax: passed
- Service worker syntax: passed
- HTML structure: passed
- Local asset references: passed
- UI action-to-handler mapping: passed
- ₱3,000 budget → ₱3,000 expense → **₱0 actual remaining**: passed
- ₱3,000 budget → ₱2,500 expense → **₱500 actual remaining**: passed
- ₱3,000 budget → ₱3,500 expense → **−₱500 actual remaining**: passed
- Planned expense/savings separation: passed
- Date helper checks: passed
- Tutorial section coverage: passed

A full automated browser click-through could not be completed in the build environment because its Chromium sandbox/browser process does not exit reliably for local pages. The source was therefore additionally validated with a DOM-mock runtime test for initialization and core application logic. The website is still intended to be tested once on the target phone/browser after deployment to GitHub Pages.
