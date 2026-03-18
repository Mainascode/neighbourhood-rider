# Production Plan: Early March 2026

## Objective
Ship Neighborhood Rider to production by early March with stable core flows:
- auth
- ordering
- rider assignment and tracking
- M-Pesa payment
- push notifications

## Timeline

## Week 0: Baseline (Thursday, February 19, 2026)
- Frontend production build verified passing.
- Backend startup verified and env-dependent warnings observed.
- Release runbook created in `docs/deployment.md`.

## Week 1: Scope lock and hardening (February 20 to February 22, 2026)
- Freeze v1 scope.
- Create P0 issue board and label all release-blocking bugs.
- Fill `backend/.env.example` and `frontend/.env.example`.
- Confirm staging has all required third-party credentials.

Exit criteria:
- Feature freeze approved.
- No unknown production dependencies.

## Week 2: P0 execution (February 23 to February 29, 2026)
- Fix all P0 defects.
- Remove route duplication and high-risk config inconsistencies.
- Verify full auth, order, payment, push flows in staging.
- Add lightweight monitor for API health.
- Add lightweight monitor for payment failures.
- Add lightweight monitor for push subscription failures.

Exit criteria:
- P0 backlog at zero.
- Staging smoke tests pass end-to-end.

## Week 3: Release prep and dry run (March 1 to March 5, 2026)
- Enforce code freeze for non-bug changes.
- Perform one full staging deploy rehearsal.
- Run full staging smoke tests during rehearsal.
- Run rollback rehearsal in staging.
- Finalize support/on-call coverage for first 72h.

Exit criteria:
- Go/no-go checklist complete.
- Rollback validated.

## Go-live window (March 6 to March 9, 2026)
- Deploy in low-traffic window.
- Run production smoke tests immediately.
- Keep hotfix window open for 48 to 72 hours.

Success criteria:
- No Sev-1 incidents in first 24h.
- Core order-to-payment path healthy.

## Execution board template
Use these columns in your tracker:
- `Backlog`
- `This Week`
- `In Progress`
- `Blocked`
- `Ready for QA`
- `Done`

Use these labels:
- `P0-ReleaseBlocker`
- `P1-High`
- `Payments`
- `Notifications`
- `Auth`
- `Ops`

## Daily standup format (release mode)
- Yesterday: completed items
- Today: top 1-3 release tasks
- Risks: blockers requiring owner action today
