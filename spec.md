# Fire Door Inspection Manager

## Current State

The app has:
- Full door management (CRUD) with company, building, floor, location, dimensions, materials, fire rating
- Inspection management with 14-item checklist and overall status
- Per-inspection PDF report page (`InspectionReportPage.tsx`) opened via "Report" button in Door Detail
- Door Detail page showing inspection history, QR code, door info
- By Company inspection wizard (`CompanyInspectionWizard.tsx`)
- Blob storage client (`StorageClient.ts`) already present in the codebase
- `blob-storage` component available but NOT currently selected/wired into the backend
- Backend has no attachment storage or retrieval functions
- `backendInterface` has no attachment-related methods

## Requested Changes (Diff)

### Add
1. **Company Inspection Summary PDF** — A new print-ready page/view (`CompanyReportPage.tsx`) that shows all doors for a selected company and their latest inspection result (status, date, inspector, checklist pass/fail summary). Accessible via a "Export Company Report" button from the Inspect page (By Company tab) and possibly a Reports nav item. Uses the same browser print-to-PDF pattern as `InspectionReportPage`.

2. **Fire Door Certification Data Sheet Attachment** — An "Attachments" section on the Door Detail page (`DoorDetailPage.tsx`) allowing:
   - Upload a PDF or image file (Fire Door Certification Data Sheet)
   - Display the uploaded file name with a download/view link
   - Remove an attachment
   - Multiple attachments per door supported
   - Uses `blob-storage` component + `StorageClient`

3. **Backend: Attachment storage** — New Motoko types and functions:
   - `DoorAttachment` type: `{ id: Nat; doorId: DoorId; filename: Text; blobHash: Text; uploadedAt: Time.Time }`
   - `doorAttachments` stable map: `DoorId -> List<DoorAttachment>`
   - `addDoorAttachment(doorId, filename, blobHash)` — authenticated
   - `getDoorAttachments(doorId)` — authenticated
   - `removeDoorAttachment(doorId, attachmentId)` — authenticated

### Modify
- `DoorDetailPage.tsx` — Add "Attachments" card section below inspection history
- `App.tsx` — Add navigation to `CompanyReportPage` if needed; add "company-report" page type
- `useQueries.ts` — Add hooks for attachment operations (useGetDoorAttachments, useAddDoorAttachment, useRemoveDoorAttachment)
- `InspectionReportPage.tsx` — already has nav blue, no change needed unless company report shares components

### Remove
- Nothing removed

## Implementation Plan

1. Select `blob-storage` Caffeine component
2. Generate updated Motoko backend with attachment types and functions (keeping all existing door/inspection code intact)
3. Frontend:
   a. Add `CompanyReportPage.tsx` — print-ready page with company header, table of all doors with latest inspection status, summary stats, print button
   b. Add attachment hooks in `useQueries.ts` — `useGetDoorAttachments`, `useAddDoorAttachment`, `useRemoveDoorAttachment`
   c. Update `DoorDetailPage.tsx` — add Attachments card section with file upload (using StorageClient), file list with view/delete
   d. Update `App.tsx` — add `company-report` page type, wire up `CompanyReportPage`, add "Export Report" button in inspect flow
   e. Wire `StorageClient` in attachment upload using the existing pattern from the storage utils
