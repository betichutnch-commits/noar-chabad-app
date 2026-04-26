# Pre-Merge Checklist

Run these commands before opening or merging a PR:

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`

Manual smoke checks:

1. Coordinator login and dashboard load.
2. Manager login and manager routes access.
3. Share page opens only approved trips.
4. Inbox image attachments load through signed URL only.
5. Profile save works on both dashboard and manager pages.
6. Draft trip delete/cancel works only for owner account.
7. Manager can approve/reject trips; non-manager cannot update status.
8. Contact form submission works; manager can mark message as treated.
9. Secondary staff add/remove works only from manager-authorized account.
