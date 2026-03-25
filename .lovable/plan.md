

# Social Platform Overhaul: "The Honk Zone"

Rename the community section to something funnier — **"The Honk Zone"** (other options: "Road Rage Therapy", "The Blinker-Free Zone") — and add key social media features inspired by Facebook, X, Reddit, Instagram, and Tumblr.

## Name Options (pick during implementation or ask)
- **The Honk Zone** — playful, memorable
- **Road Rage Therapy** — relatable humor
- **The Blinker-Free Zone** — on-brand

The "Wall of Shame" becomes a sub-section *within* this new parent path.

## Route Structure

```text
/honkzone          → Main social hub (feed, trending, categories)
/honkzone/wall     → Wall of Shame (worst offenders leaderboard)
```

The landing page `/` card currently linking to `/community` will link to `/honkzone` instead.

## Features Inspired by Major Platforms

### From Reddit
- **Category/flair filters** — filter feed by infraction type ("No Blinker Gang", "Parking Picasso", etc.)
- **Sort options** — Hot / New / Top (today, week, all time)
- **Upvote/downvote** with net score (expand current upvote-only to include downvotes)
- **Comment threads** on reports (nested replies, future phase)

### From X (Twitter)
- **Trending section** — "Trending plates" sidebar/banner showing plates getting most reports right now
- **Quote-repost** style shares — "Can you BELIEVE this guy??"
- **Character-limited hot takes** — optional short comment when reporting

### From Instagram
- **Story-like "Fresh Catches"** — horizontal scrollable row of the latest reports at the top (avatar circles)
- **Grid vs. Feed toggle** — switch between card feed and compact grid view

### From Facebook
- **Reaction bar upgrade** — expand emoji reactions beyond current 4, show reaction counts
- **"Happened to me too" button** — a "me too" solidarity react for shared experiences

### From Tumblr
- **Reblog/reshare with commentary** — stack user commentary on top of original reports
- **Tags** — user-added funny hashtags (#NoSignalNovember, #ParkingLotPicasso)

## Implementation Plan

### 1. Rename route & update nav
- **`src/App.tsx`**: Change `/community` to `/honkzone` and add `/honkzone/wall` nested route
- **`src/pages/Index.tsx`**: Update the community card link to `/honkzone`
- **`src/components/Header.tsx`**: Add "Honk Zone" nav link

### 2. Create `src/pages/HonkZone.tsx` — Main social hub
- Tab bar: **Feed** | **Wall of Shame** | **Trending**
- Sort controls: Hot / New / Top (with time range dropdown)
- Category filter chips (infraction types with funny names)
- "Fresh Catches" horizontal story-like row at top
- Grid/Feed view toggle button
- Existing social feed content migrated here
- Links to `/honkzone/wall` for the full Wall of Shame

### 3. Create `src/pages/WallOfShame.tsx` — Dedicated worst offenders
- The current "Worst Offenders" grid + "Driver of the Week" spotlight
- Full leaderboard of shame with pagination
- Sort by: Most reports, Most upvoted, Most recent

### 4. Update `src/components/SocialReportCard.tsx`
- Add expanded reaction bar (6 emojis with counts)
- Add "comment" count indicator
- Add optional hot-take text field on cards
- Category flair/badge chip
- Funny hashtag display

### 5. Create `src/components/FreshCatches.tsx`
- Instagram-stories-style horizontal scroll of latest reports
- Circular plate thumbnails with glow ring
- Click to expand full report card

### 6. Create `src/components/TrendingPlates.tsx`
- Sidebar/banner showing top 5 trending plates
- Shows plate number, report velocity, top infraction

### 7. Database changes (migration)
- Add `downvote_count` column to `reports` table
- Add `hot_take` text column to `reports` (short user comment, max 140 chars)
- Create `report_reactions` table (user_id, report_id, reaction_type)
- Add `tags` text array column to `reports`

## Files
- **Create**: `src/pages/HonkZone.tsx`, `src/pages/WallOfShame.tsx`, `src/components/FreshCatches.tsx`, `src/components/TrendingPlates.tsx`
- **Edit**: `src/App.tsx`, `src/pages/Index.tsx`, `src/components/Header.tsx`, `src/components/SocialReportCard.tsx`
- **Migration**: New columns + `report_reactions` table

