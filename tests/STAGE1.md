# Phase 1 — synchronous farm/village presentation

Scope: separate farm controls from village rendering. No account, passport, navigation layout or plot-coordinate migration.

Regression: tests/stage1-view-switch.cjs suspends animation callbacks after initial rendering and switches views with a selected plot. It checks farm-control absence, visible village destinations, non-uniform canvas pixels, and three round trips in trial/classroom modes at 1360/390 px.

Before: 4/4 failed (six farm labels and controls persisted, village destinations absent).
After: 4/4 passed. Screenshot artifacts: test-output/stage1-after/.
An intermediate blank-canvas failure required making the scene visible before measuring it and redrawing after ResizeObserver changes renderer size.

Other verification: manual-controls-unit and farm-timing-unit passed. Stage0 retained the same eight known failures (four per mode): plot-label-alignment, plant-target-and-visual, route-reload, library-common-navigation. Its other eight checks passed. These are pending later phases, not claimed fixed here.

Next: plot projection and growth artwork; then shared five-tab navigation, persistent routes and unified passport presentation. Keep deployments separate.
