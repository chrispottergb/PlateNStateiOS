## Auto-flag HIGH RISK on severe infractions

Update `src/pages/PlateDetail.tsx`:

1. Add a `HIGH_RISK_INFRACTIONS` set: `road_rage`, `hit_and_run`, `dui_suspected`, `wrong_way`, `passing_school_bus`, `brake_checking`, `ran_red_light`.
2. Extend `getSeverityLabel(score, hasHighRiskInfraction)` to return **HIGH RISK** whenever any report on the plate matches that set, regardless of total score (CRITICAL OFFENDER at 40+ still wins).
3. Compute `hasHighRiskInfraction` from `reports` and pass to the helper where the badge is rendered.

No backend changes needed — the risk_score weight bump (Road Rage = 30) is already live.