-- Driver score: bad driving SUBTRACTS, good driving ADDS (2026-09-20).
-- Previously bad driving added "shame points" (higher = worse). Every weight is
-- now negated so a plate's score falls as it collects bad reports, and
-- scored_reports_v's self-award guard flips with it (good is positive now).
-- Generated from the LIVE function on qcnhusvxygyczbnmbyvd, which had drifted
-- from 20260707000000_fix_scoring.sql (live used 25/10/2 tiers + PSV codes).

CREATE OR REPLACE FUNCTION public.infraction_points(inf text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE inf
    -- Severe bad (-25)
    WHEN 'road_rage'                        THEN -25
    WHEN 'hit_and_run'                      THEN -25
    WHEN 'dui_suspected'                    THEN -25
    WHEN 'wrong_way'                        THEN -25
    WHEN 'brake_checking'                   THEN -25
    WHEN 'passing_school_bus'               THEN -25
    -- PSV severe (-25)
    WHEN 'psv_intimidation'                 THEN -25
    WHEN 'psv_excessive_force_traffic'      THEN -25
    -- Major bad (-10)
    WHEN 'ran_red_light'                    THEN -10
    WHEN 'tailgating'                       THEN -10
    WHEN 'speeding'                         THEN -10
    WHEN 'distracted_driving'               THEN -10
    WHEN 'texting_driving'                  THEN -10
    WHEN 'aggressive_lane_change'           THEN -10
    WHEN 'blocking_intersection'            THEN -10
    WHEN 'running_stop_sign'                THEN -10
    WHEN 'cutting_off'                      THEN -10
    WHEN 'not_yielding_pedestrian'          THEN -10
    WHEN 'shoulder_driving'                 THEN -10
    -- PSV major (-10)
    WHEN 'psv_lights_sirens_abuse'          THEN -10
    WHEN 'psv_off_duty_speeding'            THEN -10
    WHEN 'psv_no_emergency_running_lights'  THEN -10
    -- Minor bad (-2)
    WHEN 'bad_parking'                      THEN -2
    WHEN 'no_turn_signal'                   THEN -2
    WHEN 'rolling_stop'                     THEN -2
    WHEN 'double_parking'                   THEN -2
    WHEN 'illegal_uturn'                    THEN -2
    WHEN 'driving_too_slow'                 THEN -2
    WHEN 'high_beams'                       THEN -2
    WHEN 'honking_excessively'              THEN -2
    WHEN 'littering'                        THEN -2
    WHEN 'suspicious_vehicle'               THEN -2
    WHEN 'expired_tags'                     THEN -2
    WHEN 'loud_exhaust'                     THEN -2
    WHEN 'left_lane_camping'                THEN -2
    -- PSV minor (-2)
    WHEN 'psv_parked_illegally'             THEN -2
    WHEN 'psv_idling_excessive'             THEN -2
    -- Major good (+10)
    WHEN 'stopped_for_school_bus'           THEN 10
    WHEN 'roadside_assist'                  THEN 10
    WHEN 'yielded_pedestrian'               THEN 10
    -- Minor good (+2)
    WHEN 'courteous_merge'                  THEN 2
    WHEN 'let_me_in'                        THEN 2
    WHEN 'used_turn_signal'                 THEN 2
    WHEN 'great_parking'                    THEN 2
    WHEN 'safe_following_distance'          THEN 2
    WHEN 'hazard_warning'                   THEN 2
    WHEN 'unspecified'                      THEN 0
    ELSE 0  -- unknown/NULL: no score movement
  END;
$function$
;

CREATE OR REPLACE VIEW public.scored_reports_v AS
 SELECT id, plate_number, COALESCE(state, 'WI'::text) AS state, infraction, reporter_id,
    created_at, is_flagged,
    infraction_points(infraction) AS points,
    CASE
      -- self-award guard: a reporter cannot credit GOOD points to a plate they claim.
      -- good is now POSITIVE (scores run negative for bad driving), hence > 0.
      WHEN infraction_points(infraction) > 0 AND reporter_id IS NOT NULL AND (EXISTS ( SELECT 1
         FROM claimed_plates cp WHERE cp.user_id = r.reporter_id AND upper(cp.plate_number) = upper(r.plate_number))) THEN 0
      WHEN reporter_id IS NOT NULL AND (EXISTS ( SELECT 1
         FROM profiles p WHERE p.user_id = r.reporter_id AND (r.created_at - p.joined_at) < '48:00:00'::interval)) THEN 0
      WHEN reporter_id IS NOT NULL AND (EXISTS ( SELECT 1
         FROM reports r2 WHERE r2.reporter_id = r.reporter_id AND r2.plate_number = r.plate_number AND COALESCE(r2.state, 'WI'::text) = COALESCE(r.state, 'WI'::text) AND r2.infraction = r.infraction AND r2.created_at < r.created_at AND r2.created_at >= (r.created_at - '30 days'::interval))) THEN 0
      ELSE infraction_points(infraction)
    END AS weighted_points
   FROM reports r;
REFRESH MATERIALIZED VIEW public.wall_of_shame_mv;