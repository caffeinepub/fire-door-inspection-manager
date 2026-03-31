# HSF Compliance Fire - Door Inspection Software

## Current State

The app is a full fire door inspection management system. The app name throughout the UI reads "Fire Door Inspector" or "Fire Door Inspection Manager". There is no company logo displayed anywhere. The logo file has been uploaded by the user and is already present at `src/frontend/public/assets/screenshot_2026-03-27_at_16.18.34-019d4309-6f13-7322-af88-702e125e6e33.png`.

## Requested Changes (Diff)

### Add
- HSF Compliance logo image displayed in all headers (main app header, login screen header, public QR status page header)
- Logo also appears in report headers (InspectionReportPage, CompanyReportPage)

### Modify
- App name changed everywhere from "Fire Door Inspector" / "Fire Door Inspection Manager" to "HSF Compliance Fire - Door Inspection Software"
- `index.html` `<title>` updated to "HSF Compliance Fire - Door Inspection Software"
- Main header in `App.tsx`: replace Flame icon + "Fire Door Inspector" text with logo image + abbreviated name
- Login screen in `App.tsx`: replace icon + "Fire Door Inspector" title with logo + full name
- Public status page header in `DoorStatusPage.tsx`: replace Flame icon + "Fire Door Inspector" with logo + name
- Footer text in `InspectionReportPage.tsx` and `CompanyReportPage.tsx`: update from "Fire Door Inspection Manager" to "HSF Compliance Fire - Door Inspection Software"
- Report header title can remain "Fire Door Inspection Report" but company branding should show HSF logo

### Remove
- Flame icon from all headers (replaced by logo)

## Implementation Plan

1. Update `src/frontend/index.html` title
2. In `App.tsx`:
   - Main header: swap Flame icon + span for `<img>` of logo (with white bg pill for contrast against navy header) + "HSF Compliance Fire" text (full on desktop, abbreviated on mobile)
   - Login screen: replace icon+title block with logo image + full app name below
   - Status page mini-header (inside App.tsx for authenticated state): same logo treatment
3. In `DoorStatusPage.tsx`: replace Flame icon + text in header with logo + name
4. In `InspectionReportPage.tsx`: update footer "Fire Door Inspection Manager" to "HSF Compliance Fire - Door Inspection Software"; add small logo to report header
5. In `CompanyReportPage.tsx`: same footer and header logo updates
