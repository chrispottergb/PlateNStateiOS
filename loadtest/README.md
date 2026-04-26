# Load testing

This directory contains a [k6](https://k6.io) script that ramps from 0 → 100k
virtual users against Plate N' State to surface read-side bottlenecks.

## DO NOT RUN FROM A LAPTOP

At anything past ~5k VUs k6 will saturate file descriptors, ephemeral ports, and
the kernel's TCP stack on a typical laptop. Use a dedicated VPS:

- Hetzner CCX33 (8 vCPU, 32 GB) ≈ €40/mo, easy 100k VUs
- DigitalOcean CPU-Optimized 8 vCPU droplet
- AWS c7i.4xlarge

Increase the file-descriptor limit before running:

```bash
ulimit -n 1048576
sysctl -w net.ipv4.ip_local_port_range="1024 65535"
sysctl -w net.ipv4.tcp_tw_reuse=1
```

## Install

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install -y k6
```

## Run

```bash
BASE_URL=https://platenstate.lovable.app \
SUPABASE_URL=https://diaydeyqbcseufpbwpki.supabase.co \
SUPABASE_ANON_KEY=eyJ... \
k6 run loadtest/scaling.js
```

## Stages (default)

| Stage     | Target VUs | Duration |
|-----------|-----------:|---------:|
| Ramp 1    |      1 000 |     2 m  |
| Hold 1    |      1 000 |     5 m  |
| Ramp 2    |     10 000 |     5 m  |
| Hold 2    |     10 000 |    10 m  |
| Ramp 3    |    100 000 |    10 m  |
| Hold 3    |    100 000 |    10 m  |

Total run: ~42 min.

## Mix

- **90% reads** — homepage, `/a-hole-patrol`, recent reports, `get_wall_of_shame` RPC.
- **10% writes** — anonymous `scan-plate` invocation (intentionally hits the auth/rate-limit path).

## What to watch

- Edge function p95 in Lovable Cloud → Logs.
- DB CPU in Cloud → Database → Performance.
- `/health` endpoint return times.
- 429 ratio — a healthy run shows 429s appearing once per-IP token buckets exhaust, not 5xx.
