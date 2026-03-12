

# Wisconsin Bad Driver Report

## Overview
A public reporting platform where Wisconsin residents can report bad drivers by license plate number. Each plate accumulates a score based on community reports, and the worst offenders are featured publicly. Reporters earn badges and ranks through gamification.

## Pages

### 1. Homepage
- **Hero section** with "Report Bad Drivers in Wisconsin" headline and a prominent "Report a Plate" input field as the primary CTA
- **Featured Plates** — a grid of the top 6 worst-scoring plates with their score, infraction count, and last-seen location
- **Recent Reports** — a live feed of the latest submitted reports (plate, infraction type, time, location)

### 2. Report Flow (Multi-Step Modal)
- **Step 1:** Enter license plate number
- **Step 2:** Select infraction type from a grid of icons (Tailgating, Speeding, Ran Red Light, Bad Parking, Aggressive Lane Change, Distracted Driving)
- **Step 3:** Enter location and time (with sensible defaults)
- **Step 4:** Review and confirm submission

### 3. Plate Detail Page (`/plate/:plateNumber`)
- Plate summary card with overall score, rank, total reports, and infraction breakdown
- Chronological feed of all reports for that plate

### 4. Leaderboard Page (`/leaderboard`)
- Ranked list of worst-scoring plates in Wisconsin
- Filterable by infraction type and time period

### 5. Reporter Profile Page (`/profile`)
- Reporter stats: total reports submitted, accuracy, badges earned
- **Gamification badges**: "First Report", "Top Reporter", "Watchdog" (10+ reports), "Eagle Eye" (50+ reports)
- Report history

## Data & Backend (Lovable Cloud / Supabase)
- **plates** table: plate number, cumulative score, report count, last reported location/time
- **reports** table: plate reference, infraction type, location, timestamp, reporter ID
- **reporters** table: anonymous reporter profiles with stats
- **badges** table: badge definitions and earned badges per reporter
- Scoring algorithm: each infraction type has a point value; plate score = sum of all report points

## Design
- Official, serious tone inspired by Gov.uk — clean, spacious, geometric
- IBM Plex Sans + IBM Plex Mono for plate numbers
- Wisconsin-derived color palette (official blue + gold accents for badges)
- Cards with subtle shadows, no borders
- Mobile-first reporting flow optimized for quick submissions

## Key Constraints (per design brief)
- No user comments on reports — data only
- No photo/video uploads
- No social sharing per plate
- No "good driver" leaderboard — gamification is for reporters only

