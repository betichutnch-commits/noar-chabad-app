# Release Runbook

## Scope
Minimal deploy and rollback process for secure releases.

## Deploy Order
1. Apply DB security/data migrations in Supabase SQL editor.
2. Run verification SQL (`supabase/migrations/20260426_verify_security_state.sql`).
3. Deploy application code.
4. Execute smoke checks from `docs/pre-merge-checklist.md`.

## Pre-Deploy Checklist
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm test`
- Confirm branch is synced and review-complete.

## Post-Deploy Smoke
- Regular user:
  - Can create/edit own trip.
  - Can cancel/delete only own allowed records.
- Manager:
  - Can approve/reject trips.
  - Can mark contact message as treated.
  - Can manage secondary staff assignment.
- Attachments:
  - `trip-files` cannot be opened via broad public access.
  - `avatars` behavior matches bucket policy decision.

## Rollback
1. Roll back app deployment to previous stable commit.
2. If migration caused issue:
  - Re-apply prior known-good policy SQL snapshot.
  - Re-run verification SQL and confirm no missing policies.
3. Re-run smoke checks.

## Incident Notes
When rollback is triggered, record:
- Time and environment
- Triggering error
- Commit SHA rolled back from/to
- SQL changes applied during rollback
