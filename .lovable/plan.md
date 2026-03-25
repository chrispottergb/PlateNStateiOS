

# Landing Page Redesign: Dual-Mode with Humor

Split the landing page into two distinct experiences accessible via prominent nav toggle buttons — a **Community/Social** mode (fun, meme-style feed of bad driver reports) and a **Business** mode (professional portal for Fleet, Law Enforcement, Insurance).

## Concept

```text
┌─────────────────────────────────────────────┐
│  Header: Plate In State                     │
├─────────────────────────────────────────────┤
│  Hero with tagline + two big toggle buttons │
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │ 🎭 Wall of   │  │ 💼 Business &        │ │
│  │    Shame      │  │    Enterprise        │ │
│  └──────────────┘  └──────────────────────┘ │
├─────────────────────────────────────────────┤
│  [Content switches based on active tab]     │
│                                             │
│  SOCIAL MODE:                               │
│  - Funny taglines rotating                  │
│  - Reports styled as social media cards     │
│  - Upvote/react system (😂🤦‍♂️🚨)            │
│  - "Worst Driver of the Week" spotlight     │
│  - Meme-style plate roasts                  │
│                                             │
│  BUSINESS MODE:                             │
│  - Fleet / LEO / Insurance portal cards     │
│  - Professional stats & pricing links       │
│  - Trust badges & testimonials              │
└─────────────────────────────────────────────┘
```

## Humor Elements (Social Mode)

- **Rotating funny taglines** in the hero: "Because honking isn't enough™", "Snitches get... safer roads", "Passive-aggressive, but make it civic duty"
- **Social-media-style report cards** with reaction emojis (😂 🤦 🚨 💀) instead of plain lists
- **"Wall of Shame" branding** for the worst offenders section
- **"Driver of the Week" spotlight** card with dramatic styling
- **Funny category badges** on reports: "Turn Signal Allergic", "Speed Demon", "Parking Picasso"

## Changes

### 1. `src/pages/Index.tsx` — Major overhaul
- Add `activeTab` state: `"social"` | `"business"` (default: social)
- **Hero**: Keep search/report, add two large pill-toggle buttons beneath
- **Social tab content**:
  - Rotating funny tagline with `AnimatePresence`
  - "Wall of Shame" header for worst offenders with dramatic styling
  - Report cards restyled as social-media-style posts with emoji reactions
  - "Driver of the Week" featured card with glow
- **Business tab content**:
  - Professional headline: "Enterprise Solutions for Road Safety"
  - The existing 3-column Fleet/LEO/Insurance CTA grid (moved here)
  - Stats row (reports filed, plates tracked, etc.)
  - Trust/credibility section

### 2. `src/components/SocialReportCard.tsx` — New component
- Social-media-style card for plate reports
- Shows `WisconsinPlate` mini, report reason with funny badge, timestamp
- Row of emoji reaction buttons (visual only for now)
- "Share" and "Comment" icons for social feel

### 3. `src/components/DriverOfTheWeek.tsx` — New component
- Spotlight card with gradient border glow
- Shows the #1 worst offender plate large
- Dramatic title: "🏆 Worst Driver of the Week"
- Report count and top violation category

### 4. `src/components/Header.tsx` — Minor update
- Add "Wall of Shame" and "Business" quick-links in nav (optional, or keep as-is since Index handles tabs)

## Files
- **Edit**: `src/pages/Index.tsx`
- **Create**: `src/components/SocialReportCard.tsx`
- **Create**: `src/components/DriverOfTheWeek.tsx`

