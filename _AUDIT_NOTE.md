# Audit Note — AIRoboticProcessChoreographer

## Original audit recommendations (batch_07.md §20)

**Missing AI endpoints:** `/battery-optimization`, `/zone-heat-map`, `/robot-health-dashboard`, `/performance-benchmarking`, `/fault-diagnosis`.

**Missing non-AI features:** fleet visualization/mapping, robot device drivers, zone/layout UI, task queue management, WMS integration.

**Custom suggestions:** dynamic fleet size optimization, predictive collision prevention, zone capacity forecasting, robot specialization learning, autonomous charging orchestration, failure mode learning.

## Implemented this pass (3 mechanical)
1. `POST /api/ai/battery-optimization` — charge schedule across the fleet over an N-hour horizon, queue collisions, idle time avoided.
2. `POST /api/ai/zone-heat-map` — bottleneck identification using zones × tasks × collisions.
3. `POST /api/ai/fault-diagnosis` — ranked-cause diagnosis with confirmation steps using fault code, symptoms, and recent maintenance.

All three reuse `callOpenRouter`, `parseAIJson`, `authMiddleware`, `aiRateLimiter` and persist to `ai_results`. Syntax-checked.

## Backlog (prioritized)
1. `POST /api/ai/robot-health-dashboard` (mechanical — aggregate/return existing telemetry).
2. `POST /api/ai/performance-benchmarking` (mechanical — compare to theoretical max).
3. Fleet visualization endpoint + websocket positions (mechanical, NEEDS-PRODUCT-DECISION on UI).
4. WMS integration (NEEDS-CREDS).
5. Robot device-driver bridges (NEEDS-CREDS — vendor APIs, ROS bridges).

## Apply pass 3 (frontend)

LEFT-AS-IS. `frontend/src/App.jsx` declares routes for every `/api/ai/*` endpoint. Generic `AIFeaturePage.jsx` covers task-allocation/auto-dispatch/collision-avoidance/path-planning/throughput-optimization/predictive-maintenance/demand-forecast/simulation; dedicated `BatteryOptimizationPage.jsx`, `ZoneHeatMapPage.jsx`, `FaultDiagnosisPage.jsx` (apply-pass-2 additions) call their endpoints. Auth: `frontend/src/api.js` axios interceptor injects `Authorization: Bearer ${localStorage.token}`. No FE changes needed.

## Apply pass 4 (mechanical backlog)

Implemented 3 mechanical AI features from the audit's "Custom suggestions" list (dynamic fleet-size optimization, zone capacity forecasting, autonomous charging orchestration). Each endpoint reuses `callOpenRouter`, returns 503 when `OPENROUTER_API_KEY` is missing, and persists to `ai_results` via the existing helper.

- BE: `backend/routes/ai.js` — `POST /api/ai/dynamic-fleet-sizing`, `POST /api/ai/zone-capacity-forecast`, `POST /api/ai/charging-orchestration`.
- FE: `frontend/src/pages/DynamicFleetSizingPage.jsx`, `ZoneCapacityForecastPage.jsx`, `ChargingOrchestrationPage.jsx` plus routes in `frontend/src/App.jsx` and entries in `frontend/src/components/Sidebar.jsx`. Each page uses the existing `api` axios client (JWT bearer), shows 503 errors verbatim, and renders structured `result_json` tables with a Markdown fallback.
- Syntax-checked: BE via `node --check` (PASS); FE files balance-checked (no node_modules / esbuild available in this sandbox).
- Backlog deferred: predictive collision prevention, robot specialization learning, failure-mode learning (custom AI suggestions remain available for future passes); WMS / robot device-driver bridges (NEEDS-CREDS); fleet visualization UI (NEEDS-PRODUCT-DECISION).
