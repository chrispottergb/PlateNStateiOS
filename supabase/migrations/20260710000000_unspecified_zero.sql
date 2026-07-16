-- QA fix (2026-07-10): a report with NO behavior rating ('unspecified') must
-- not move the plate's score. It was worth +2, so merely being reported —
-- even with a neutral/positive comment — read as bad driving.
-- infraction_points() is the single source of truth; the MV and
-- get_plate_stats() both recompute from it on refresh.
CREATE OR REPLACE FUNCTION public.infraction_points(inf text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
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
    ELSE 5
  END;
$$;

SELECT public.refresh_wall_of_shame();
