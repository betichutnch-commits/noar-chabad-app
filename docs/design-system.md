# Design System Baseline

## Goal
Keep UI consistency across dashboard and manager experiences by using shared tokens and UI primitives.

## Tokens Source of Truth
- Global CSS variables: `app/globals.css`
- Tailwind aliases: `tailwind.config.ts`

### Core Token Groups
- **Brand colors**: `brand.cyan`, `brand.green`, `brand.pink`, `brand.yellow`, `brand.dark`
- **Surfaces**: `surface.base`, `surface.card`, `surface.muted`
- **Borders**: `border.subtle`, `border.strong`
- **Text**: `text.primary`, `text.secondary`, `text.muted`
- **States**: `state.success|danger|warning|info` (+ background variants)
- **Radius / Shadow / Spacing**: `rounded-3xl`, `shadow-soft`, `space-section`, `space-block`

## Required UI Primitives
- `components/ui/Button.tsx`
- `components/ui/Input.tsx`
- `components/ui/Modal.tsx`

Use these before adding custom local styling.

## Rules
1. Prefer token classes (`bg-brand-cyan`, `text-text-secondary`) over hardcoded hex values.
2. Prefer shared card/surface classes (`surface-card`, `card-premium`) for container blocks.
3. Keep focus states visible (`focus:ring-*`) on all interactive inputs/buttons.
4. For new pages, start from existing layout/header primitives instead of custom wrappers.
5. Avoid one-off radius/shadow values unless absolutely necessary.

## Migration Guideline (for legacy screens)
1. Replace hardcoded hex colors with token aliases.
2. Normalize container backgrounds/borders to token-based surfaces.
3. Keep typography scale consistent (`text-sm`, `text-base`, `text-xl` tiers).
4. Run full quality gate after visual refactor:
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm run build`
   - `npm test`
