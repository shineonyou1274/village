# Phase 3 — shared navigation and passport presentation

Approved scope: five main tabs on all devices (farm, village, activities, library, passport); market as a village facility; reload/back preserves destination. Student menus exclude teacher operations; teacher entry retains its explicit student return link.

Storage audit:
| Record | Existing read/write authority | Presentation |
| --- | --- | --- |
| Achievement stamps/badges | /api/growth and existing activity commands | Passport stamps, missions, badges |
| Issued passport and visit stamps | /api/campus, /api/campus/passport, /api/campus/visit | Passport profile and travel |
| Study sessions/history/points | /api/campus and /api/campus/study | Library focus/history |
No schema changes, migration, record copies or deletion. One canonical passport page at campus.html#passport. Old travel links open its travel section.

The two document entries keep their independent existing game/study engines; both render the same five-tab shell. Main routes are URL hashes, including #market under village. Cross-document navigation carries the existing session token, not a new account.

Baseline: stage3-navigation failed 4/4 for inconsistent tab sets. Existing stage0 tests also detect route reload and library navigation regressions.

Final checks: stage0 16/16 pass, phase1 animation-independent switching 4/4 pass. Shared navigation test covers trial/classroom at 1360/390 px, market/back/reload, canonical passport from both engines, issued passport record preservation, no overflow, no page exceptions, and teacher entry return without changing student identity. It compares the existing passport/stamps/history/points before and after navigation; it is not a multi-user load or full study-session integration test.
Screenshots and machine-readable reports are in test-output/stage3-navigation, stage3-after and stage1-stage3.
