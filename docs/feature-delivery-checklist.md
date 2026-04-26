# Feature Delivery Checklist

Use this checklist for every new feature to keep speed and consistency.

- [ ] Scope is minimal and clearly defined.
- [ ] Existing components/patterns were reused before creating new ones.
- [ ] Styling uses shared tokens and avoids new hardcoded values.
- [ ] Accessibility basics checked (focus, labels, keyboard flow where relevant).
- [ ] Validation run (as needed by impact):
  - [ ] `npm run lint`
  - [ ] `npx tsc --noEmit`
  - [ ] `npm run build`
  - [ ] `npm test`
- [ ] Final note includes: change summary, rationale, verification results.
