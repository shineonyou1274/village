# Harvest feedback and progress consistency

The farm summary and seed availability now read the authoritative action-response state, using the same count and unlock conditions as `farmProgress`. The optional growth-board request is no longer required to update farm progress. Trial accounts track their own harvest count; their records remain separate from real classes.

Pending farm actions immediately disable the action button and announce planting, watering or harvesting. The existing save-before-animation and request-id retry behavior remain intact. Visual work ends with the farmer moving into the aisle. Future destination scenery appears only while its explicitly labelled preview is expanded.

First-harvest guidance is an inline card below the map. Dismissal is a per-player browser preference, not an achievement or server record. Clearing browser storage can show it again. The single-item village sub-navigation is no longer mounted.

Regression: `node tests/harvest-feedback.cjs` (TEST_URL optional). This creates isolated trial/classroom fixtures and checks desktop and 390px layouts, delayed-request feedback, progress, first-harvest guidance, dismissal/reload and village navigation. Before the fix it detected stale counts, missing feedback and guidance, and redundant navigation. Existing `tests/stage0-regression.cjs` covers plot alignment, view round trips, saved state, library navigation and overflow.

Lesson: test visible UI, not only DOM presence. The first draft of the notice used an `aside`, which a legacy global selector hid. Visibility assertions and screenshots caught it before release. Read activity totals from the same authoritative response as inventory rather than from a separately polled panel.
