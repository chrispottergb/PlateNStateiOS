import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const feedErrors = new Rate('feed_errors');
const reportsErrors = new Rate('reports_errors');
const leaderboardErrors = new Rate('leaderboard_errors');
const scanErrors = new Rate('scan_errors');
const feedLatency = new Trend('feed_latency');
const scanLatency = new Trend('scan_latency');
const reportsLatency = new Trend('reports_latency');

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // warm up
    { duration: '1m',  target: 200 },  // ramp to 200
    { duration: '2m',  target: 500 },  // push to 500
    { duration: '1m',  target: 200 },  // step down
    { duration: '30s', target: 0 },    // cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // 95% of requests under 1s
    errors: ['rate<0.05'],              // less than 5% errors
    feed_latency: ['p(95)<800'],
    scan_latency: ['p(95)<3000'],       // scan uses Claude vision — give it room
    reports_latency: ['p(95)<600'],
  },
};

const SUPABASE_URL = 'https://qcnhusvxygyczbnmbyvd.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjbmh1c3Z4eWd5Y3pibm1ieXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNzg0NTAsImV4cCI6MjA5Nzc1NDQ1MH0.sQJL5eJkI706OwjtUcmr3R1yaT_VaOyEkV7b-Ljrqyk';
const SCAN_API = 'https://platenstate-scan-api.vercel.app';

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'count=none',          // skip row count — cuts query cost significantly
  'Connection': 'keep-alive',
};

export default function () {
  // Simulate realistic user behaviour — not every user hits every endpoint
  const roll = Math.random();

  group('community feed', () => {
    const start = Date.now();
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/community_posts?select=id,user_id,body,plate_tag,like_count,comment_count,created_at&order=created_at.desc&limit=20`,
      { headers }
    );
    feedLatency.add(Date.now() - start);
    const ok = check(res, { 'feed 200': (r) => r.status === 200 });
    errorRate.add(!ok);
    feedErrors.add(!ok);
    if (!ok) console.log(`feed error: ${res.status} ${res.body?.substring(0, 100)}`);
  });

  if (roll < 0.7) {
    group('reports feed', () => {
      const start = Date.now();
      const res = http.get(
        `${SUPABASE_URL}/rest/v1/reports?select=id,plate_number,state,infraction,location,created_at,upvote_count&order=created_at.desc&limit=12`,
        { headers }
      );
      reportsLatency.add(Date.now() - start);
      const ok = check(res, { 'reports 200': (r) => r.status === 200 });
      errorRate.add(!ok);
      reportsErrors.add(!ok);
      if (!ok) console.log(`reports error: ${res.status} ${res.body?.substring(0, 100)}`);
    });
  }

  if (roll < 0.3) {
    group('leaderboard', () => {
      const res = http.get(
        `${SUPABASE_URL}/rest/v1/wall_of_shame_mv?select=plate_number,state,total_score,report_count,last_reported_at,top_infraction&order=total_score.desc&limit=25`,
        { headers }
      );
      const ok = check(res, { 'leaderboard 200': (r) => r.status === 200 });
      errorRate.add(!ok);
      leaderboardErrors.add(!ok);
      if (!ok) console.log(`leaderboard error: ${res.status} ${res.body?.substring(0, 100)}`);
    });
  }

  // Scan API excluded from load test — it calls Claude Vision + external plate APIs
  // and costs real money per request. Test manually / separately.

  sleep(Math.random() * 2 + 0.5); // 0.5–2.5s between actions
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
}
