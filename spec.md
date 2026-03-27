# Fire Door Inspection Manager

## Current State
App has a DoorDetailPage showing door info and inspection history. There is no PDF/print report feature. The app uses React + Tailwind, with a navy/fire-red color scheme.

## Requested Changes (Diff)

### Add
- `InspectionReportPage.tsx` — a dedicated print-optimized report page showing full inspection details for a single door (or all inspections for a door). Includes company header, door details table, checklist results with pass/fail per item, overall status, inspector name, date, and notes. Has a 'Print / Save as PDF' button and a 'Back' button (both hidden on print). Print CSS hides all UI chrome.
- A 'Generate Report' button on DoorDetailPage (per inspection row, or a top-level button to report latest inspection).
- Add `report` to the Page type in App.tsx and route to InspectionReportPage.

### Modify
- `App.tsx`: Add `report` page type, pass `activeInspectionId` state, render InspectionReportPage.
- `DoorDetailPage.tsx`: Add a report button per inspection row (or a 'Print Report' button for latest).

### Remove
- Nothing removed.

## Implementation Plan
1. Create `InspectionReportPage.tsx` with print-optimized layout: company name, door reference, all door fields, checklist table with tick/cross per item, overall status badge, inspector, date, notes, print button.
2. Add `report` page and `activeInspectionId` to App.tsx state, render the new page.
3. Add 'Print Report' buttons on DoorDetailPage inspection history rows.
4. Add `@media print` CSS via inline styles or a style tag to hide nav/header/footer and show only report content.
