// k6 load test for Plate N' State.
// Run from a real VPS (≥ 4 vCPU, 8 GB RAM). DO NOT run from a laptop at 100k VUs.
//
//   BASE_URL=https://platenstate.lovable.app \
//   SUPABASE_URL=https://diaydeyqbcseufpbwpki.supabase.co \
//   SUPABASE_ANON_KEY=... \
//   k6 run loadtest/scaling.js

import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "https://platenstate.lovable.app";
const SB = __ENV.SUPABASE_URL || "";
const SB_KEY = __ENV.SUPABASE_ANON_KEY || "";

export const options = {
  scenarios: {
    ramp_1k: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m",  target: 1000 },
        { duration: "5m",  target: 1000 },
        { duration: "5m",  target: 10000 },
        { duration: "10m", target: 10000 },
        { duration: "10m", target: 100000 },
        { duration: "10m", target: 100000 },
      ],
      gracefulStop: "30s",
    },
  },
  thresholds: {
    http_req_failed:   ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

const READS = [
  () => http.get(`${BASE}/`),
  () => http.get(`${BASE}/a-hole-patrol`),
  () => SB && http.get(`${SB}/rest/v1/reports?select=id,plate_number,infraction,created_at&order=created_at.desc&limit=20`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }),
  () => SB && http.post(`${SB}/rest/v1/rpc/get_wall_of_shame`,
        JSON.stringify({ p_state: "WI", p_limit: 20 }),
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" } }),
];

export default function () {
  const r = Math.random();
  if (r < 0.9) {
    // 90% reads
    const fn = READS[Math.floor(Math.random() * READS.length)];
    const res = fn && fn();
    if (res) check(res, { "read 2xx/3xx": (r) => r.status < 400 });
  } else {
    // 10% writes — anonymous scan-plate hit (will 401/429 in production but exercises the path)
    if (SB) {
      const res = http.post(`${SB}/functions/v1/scan-plate`,
        JSON.stringify({ image: "data:image/png;base64,iVBORw0KGgo=" }),
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" } });
      check(res, { "write 2xx/4xx (not 5xx)": (r) => r.status < 500 });
    }
  }
  sleep(Math.random() * 2);
}
