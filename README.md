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
