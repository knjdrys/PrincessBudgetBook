# Changelog

## Final mobile polish — 2026-08-14

- Reworked **Para kay Lablab** into a real tutorial menu with six sections.
- Tutorial menu becomes a horizontal touch menu on phones.
- Added mobile-friendly modal sizing, sticky action area, and touch targets.
- Added automatic mobile sidebar closing when tapping outside it.
- Added modal scroll locking and safer modal focus behavior.
- Kept the tutorial personalized in Tagalog/Taglish as a guide from Kenjie.
- Verified all `data-action` UI actions have matching JavaScript handlers.
- Verified `index.html` tag structure and all local asset references.
- Verified `app.js` and `service-worker.js` syntax.
- Verified the core accounting scenario: ₱3,000 available minus ₱3,000 actual spending = ₱0 remaining.
- Verified partial and over-budget scenarios, planned expense/savings totals, date helpers, and tutorial section coverage.

## Modal interaction fix
- Fixed a critical modal bug where tapping any field, button, input, date picker, or text area inside a modal could close the modal because the backdrop's `data-modal-close` attribute was being matched by `closest()`.
- Modal content now stays open while users tap and type normally.
- The modal closes only when the user taps the close button or the dimmed backdrop area.
- This applies to Create Budget, Add Category, Add Expense, Savings Goal, Tutorial, Help, and other modal dialogs.
