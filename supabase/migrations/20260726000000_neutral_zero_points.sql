-- Neutral/unknown reports must score 0, not 5 (2026-07-26).
--
-- Bug: infraction_points() ended with `ELSE 5` — any report whose infraction
-- was NULL or not in the known list silently awarded +5 shame points. So a
-- neutral post (no rating) inflated a plate's bad score.
-- Fix: ELSE 0. Only explicitly-rated behavior moves a score.
-- wall_of_shame_mv + get_plate_stats read through scored_reports_v, which
-- calls this function, so refreshing the MV retroactively corrects totals.

CREATE OR REPLACE FUNCTION public.infraction_points(inf text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE inf
    WHEN 'road_rage'               THEN 15
    WHEN 'hit_and_run'             THEN 15
    WHEN 'passing_school_bus'      THEN 12
    WHEN 'dui_suspected'           THEN 12
    WHEN 'wrong_way'               THEN 12
    WHEN 'brake_checking'          THEN 10
    WHEN 'ran_red_light'           THEN 10
    WHEN 'running_stop_sign'       THEN 10
    WHEN 'speeding'                THEN 8
    WHEN 'distracted_driving'      THEN 8
    WHEN 'texting_driving'         THEN 8
    WHEN 'not_yielding_pedestrian' THEN 8
    WHEN 'aggressive_lane_change'  THEN 8
    WHEN 'tailgating'              THEN 6
    WHEN 'cutting_off'             THEN 6
    WHEN 'blocking_intersection'   THEN 6
    WHEN 'shoulder_driving'        THEN 6
    WHEN 'illegal_uturn'           THEN 5
    WHEN 'rolling_stop'            THEN 5
    WHEN 'double_parking'          THEN 5
    WHEN 'bad_parking'             THEN 5
    WHEN 'no_turn_signal'          THEN 3
    WHEN 'honking_excessively'     THEN 3
    WHEN 'high_beams'              THEN 3
    WHEN 'loud_exhaust'            THEN 3
    WHEN 'left_lane_camping'       THEN 3
    WHEN 'littering'               THEN 3
    WHEN 'driving_too_slow'        THEN 2
    WHEN 'expired_tags'            THEN 2
    WHEN 'suspicious_vehicle'      THEN 2
    WHEN 'unspecified'             THEN 0
    WHEN 'courteous_merge'         THEN -2
    WHEN 'yielded_to_pedestrian'   THEN -3
    WHEN 'yielded_pedestrian'      THEN -3
    WHEN 'let_me_in'               THEN -2
    WHEN 'used_turn_signal'        THEN -1
    WHEN 'stopped_for_school_bus'  THEN -4
    WHEN 'good_parking'            THEN -2
    WHEN 'great_parking'           THEN -2
    WHEN 'safe_following_distance' THEN -2
    WHEN 'hazard_lights_warning'   THEN -1
    WHEN 'hazard_warning'          THEN -1
    WHEN 'roadside_assist'         THEN -3
    ELSE 0  -- neutral/unknown/NULL: no score movement (was 5 — the bug)
  END;
$fn$;

-- Show what was being mis-scored (returns the affected rows for the log)
SELECT COALESCE(infraction, '(NULL)') AS infraction, COUNT(*) AS reports
FROM public.reports
WHERE infraction IS NULL
   OR public.infraction_points(infraction) = 0
GROUP BY infraction
ORDER BY reports DESC;

SELECT public.refresh_wall_of_shame();
