# Save before animation

User-reported regression: planting was committed only after the farmer reached the plot. Opening the separate library page or suspending animation discarded the in-memory job before it committed.

Farm actions now call the authoritative save immediately; only confirmed actions enter the visual queue. Finishing/cancelling the animation never changes inventory. Navigation waits for the in-flight save. Action requests use keepalive; the stored idempotency key survives reload. Campus also recovers pending commands, and recovery preserves the originally selected crop.

Plaza: stale connection timing is reset on re-entry and evaluated only in the active classroom plaza. Trial movement is transient local state with an explicitly labelled practice character; it does not need the presence API. Real classroom connection failures remain visible.

Market: removed the separate market subtab. The map entrance and walking control use the same walking flow. Existing market deep links still work. Instructions now describe the actual plot actions and walking entrance.

Validation:
- `tests/action-save.cjs`: all 10 baseline checks failed before changes; all 10 pass after. Includes frozen animation plus immediate library navigation, trial presence-server failure, 1360px/390px and trial/classroom.
- `tests/pending-farm-save.cjs`: lost response after server commit, campus recovery exactly once; immediate navigation after watering.
- Existing stage0: 16 pass; stage1: 4 pass; two-student plaza: 14 pass.
- Stage0 captures include seeds, sprouts and mature crops. 390px is browser emulation, not physical-device testing.

Library secondary weather row and remaining subtle styling differences are deferred as the user permitted; this change does not claim those are unified.
