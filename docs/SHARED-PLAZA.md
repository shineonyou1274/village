# Shared classroom plaza — first playable slice

## Scope
- Our Village opens a close view of a shared plaza, retaining the existing five-tab shell.
- Ground click/tap, keyboard arrows while map is focused, or optional touch buttons move the student.
- Same-class students see server-derived positions and a short wave greeting.
- Market entrance/“walk to market” walks to the gate, then opens the existing market.
- Whole-map toggle preserves the existing overview and facility navigation.
- Trial accounts remain isolated; simulated classmates are never presented as live visitors.

## Data and lifecycle
- `plaza_visitors` stores only transient positions, destination, heartbeat and greeting time. Student inventory/state is not updated by movement.
- All requests use existing student authentication and derive the classroom server-side.
- Movement is bounded to the plaza and interpolated at server-defined speed (3 world units/second).
- One non-overlapping request loop per visible plaza, approximately 1.1–1.25 seconds plus response time. No animation-frame network calls.
- Route exit/hidden/page exit sends leave; 15-second TTL removes abandoned sessions. Errors are displayed; stale avatars are removed and reconnection retries automatically.
- One identity has one presence record; simultaneous tabs for the same student represent the same character. Use separate student codes to test a meeting.
- Greeting allowlist, five-second cooldown, teacher pause and class boundaries enforced on server.

## Validation
- `tests/plaza-unit.mjs`: 30 distinct spawn positions, classroom isolation, auth, bounds, server movement speed, greeting cooldown/expiry, departure/TTL/reconnect, unchanged student state, teacher pause.
- `tests/plaza-browser.cjs`: two independent student browser contexts, at 1360px and 390px. Movement by button/keyboard, greeting, class isolation, walking into market, departure, reload reconnect, unchanged coins/farm, no JS errors. 14 checks pass.
- Existing `tests/stage0-regression.cjs`: 16 pass.
- Existing `tests/stage1-view-switch.cjs`: 4 pass, including frozen-animation transitions.
- `tests/plaza-reconnect.cjs`: actual ground click and simulated network loss/recovery.
- Captures: `test-output/plaza/1360-together.png`, `390-together.png`.

## Limits and next slice
This is a classroom plaza prototype, not a fully connected world. Farm visits and library door transitions are not implemented here. Existing market has its own slower presence loop. Movement uses HTTP snapshots with interpolation, not WebSockets; production 120-player capacity and physical mobile-device behavior are not established by local tests. Class-size visual crowding needs a real classroom pilot before larger spaces are introduced.
