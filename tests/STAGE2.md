# Phase 2 — plot alignment and visible growth

Scope: bed number placement, seed and crop appearance. Buildings and props keep their artwork. Beds now retain their actual 3D soil/seed/crop meshes instead of billboard images that displaced the soil and hid seed meshes. The drawn bed and raycast target therefore share coordinates. Labels project a local point within that same bed.

Baseline: test-output/stage2-before/report.json, 8/16 failed including alignment and planted appearance in both trial/classroom modes. Test seed detection accepts visible seeds or a changed atlas cell; watering checks the active rendering path. Maturity must differ from the sprout. No state is injected to manufacture growth.

Verification: tests/stage0-regression.cjs runs isolated local accounts. TEST_WIDTH=390 repeats on mobile; TEST_OUTPUT preserves separate reports. Main targets are alignment, only intended plot changed, seed/sprout/maturity appearance, saved farm and stock. Phase 1 frozen-animation switching remains a required regression. Unit checks cover camera-relative controls and real-time work at different frame rates.

Known later-phase failures: route-reload and library-common-navigation, in each account mode. Five-tab navigation, route persistence and unified library/passport remain out of this release.
