# Git Publishing Workflow

## Current Constraint
Direct push to upstream `origin/main` can fail with `403` if the authenticated GitHub user does not have write access.

## Recommended Default
Use **fork + PR** as the stable workflow for contributors without upstream write permission.

## Steps
1. Create a fork of `betichutnch-commits/noar-chabad-app` under your account.
2. Point local `origin` to your fork:
   - `git remote set-url origin https://github.com/<your-user>/noar-chabad-app.git`
3. Push branch:
   - `git push -u origin main` (or a feature branch).
4. Open a PR from your fork to upstream `main`.

## If You Have Upstream Write Access
- Keep `origin` pointing to upstream.
- Push directly only if your team policy allows direct `main` pushes.
- Prefer feature branches + PR for safer review and rollback.
