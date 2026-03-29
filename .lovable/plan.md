

# UI Redesign + Enhanced Admin Panel + Dedicated Portal Dashboards

## Overview
Redesign key pages to match the uploaded reference mockups (mobile-first, clean card-based layouts with Wisconsin plate components), build out dedicated "inside" dashboards for approved Insurance and Law Enforcement accounts, and expand the Admin Panel with more management capabilities.

## What Changes

### 1. Plate Detail Page Redesign (`src/pages/PlateDetail.tsx`)
Match the "Plate Detail" mockup:
- Large centered WisconsinPlate component with prominent display
- Safety Score pill below plate (colored by severity, e.g. "SAFETY SCORE: 42 / CRITICAL OFFENDER")
- Three stat cards in a row: Reports, Rank, Verified
- "Top Infractions" section with colored badge chips showing counts
- Report History with sort toggle (Newest), each entry showing infraction icon, location, time ago, comment quote, upvote + comment counts
- Sticky bottom "Report This Plate Again" CTA button

### 2. Report Flow Modal Redesign (`src/components/ReportModal.tsx`)
Match the "Report Flow Modal" mockup:
- "Report a Plate" title with step indicator ("Step 1 of 6: The Basics")
- WisconsinPlate-styled input field for plate number
- "Identify the getaway vehicle" with "Distinguishing Features" toggle chips (Visible, Tinted, Loud, Bumper, Lifted)
- "What was the crime?" section with emoji-decorated infraction cards showing points
- "Where did this go down?" with Auto-Detect button
- "Roast 'em" hot take textarea with placeholder "Your mom said use your blinker..."
- Bottom: Cancel + "Submit Report (1 Coin)" button

### 3. User Profile Page Redesign (`src/pages/Profile.tsx`)
Match the "User Profile Badges" mockup:
- "Your Profile" header with avatar circle (initials), "Reporting for duty since [date]"
- Three stat cards: Reports, Day Streak, Coins
- Level progress bar (e.g. "Level 12 - Road Guardian", "850 / 1000 XP", "150 XP until 'Asphalt Avenger'")
- "Achievements" grid with icon cards (earned = solid border, unearned = faded)
- "Recent Reports" list with WisconsinPlate mini, infraction, location, XP earned, time
- "View Full History" button

### 4. Wall of Shame Redesign (`src/pages/WallOfShame.tsx`)
Match the "Wall of Shame" mockup:
- Skull emoji title header with subtitle "Wisconsin's most 'gifted' drivers"
- "WORST OF THE WEEK" spotlight card with gradient background, plate, points, top sin, city
- "The Naughty List" grid (2-col) with rank badges, point counts, WisconsinPlate components, infraction labels, report counts
- Bottom CTA: "+ Report an A-Hole"

### 5. Watch Map Redesign (`src/pages/WatchMap.tsx`)
Match the "Watch Map" mockup:
- Search bar at top ("Search Wisconsin plates...")
- Location pin button (top right)
- Filter chips row (Last 24h, etc.)
- Report popup cards showing plate, time, infraction with severity color, location, "View Full Details" link
- Color-coded map markers (Red = Reckless, Orange = Speeding, Blue = Other)
- Bottom bar: legend + live count ("1,284 Live"), "Wisconsin Active" badge
- FAB (+) button for quick report

### 6. Fleet Dashboard Redesign (`src/pages/Fleet.tsx`)
Match the "Fleet Dashboard" mockup:
- "Fleet Dashboard" header with company name + tier, settings gear icon
- Alert banner for new serious infractions (red accent, clickable)
- Three stat cards: Total Vehicles, Fleet Score (calculated), Active Alerts
- "7-Day Incident Trend" line chart with "Live Update" badge
- "Monitored Vehicles" section with search bar + filter icon
- Vehicle cards showing WisconsinPlate, label + make, report count, risk badge (High/Moderate/Low)
- Bottom CTA: "Generate Weekly Fleet Report"

### 7. Business/Enterprise Hub Redesign (`src/pages/Business.tsx`)
Match the "Enterprise Hub" mockup:
- "ENTERPRISE SOLUTIONS" badge, large heading "Plate N' State for Business"
- Stats bar: 500+ Clients, 99.9% Uptime, SOC2 Compliant
- Three portal cards with icons, category badges (Fleet/Risk/Agency), descriptions, prices, CTA buttons
- Testimonial card with quote + attribution
- "Wisconsin Certified Data Provider" footer badge

### 8. Auth Page Redesign (`src/pages/Auth.tsx`)
Match the "Auth Portal" mockup:
- Logo icon + "Plate N' State" branding with tagline "Because honking isn't enough™"
- Glassmorphism card with Sign In / Sign Up toggle tabs
- Styled email + password inputs with icons
- "Forgot Password?" link
- "Enter the Patrol →" submit button (blue gradient)
- Social login buttons (Google, Apple, GitHub icons)
- "New to the neighborhood? Join the Snitches" toggle text
- "Enterprise? Use the Business Portal" link at bottom

### 9. Insurance Portal Dashboard (approved view in `src/pages/InsurancePortal.tsx`)
Enhance the existing approved state into a full dashboard:
- Company header with approval badge
- Dashboard stats: Total Lookups, Risk Flags, Avg Score
- Tabbed interface: "Single Lookup" | "Bulk Upload" | "Upload History"
- Improved results cards with risk gauge visualizations

### 10. Law Enforcement Portal Dashboard (approved view in `src/pages/LawEnforcement.tsx`)
Enhance the existing approved state:
- Department header with tier badge
- Dashboard stats: Lookups Used / Limit, Flagged Plates, Active Cases
- Tabbed interface: "Plate Lookup" | "Bulk Upload" | "Upload History"
- Enhanced result display with GPS coordinates, evidence timestamps

### 11. Enhanced Admin Panel (`src/pages/AdminPanel.tsx`)
Expand beyond just approvals:
- Dashboard overview tab with counts: Total Users, Pending Apps, Total Reports, Active Fleets
- "Applications" tab (existing approve/reject, improved layout)
- "Users" tab: browse profiles, view reports count, manage roles (promote to admin/moderator)
- "Reports" tab: recent reports feed, ability to flag/remove inappropriate reports
- "Fleet Companies" tab: view all registered companies, their tiers, vehicle counts
- Add database migration for admin delete capability on reports

## Technical Details

### New Database Migration
- Add RLS policy for admins to delete reports
- Add RLS policy for admins to SELECT all profiles
- Add RLS policy for admins to SELECT all companies

### Files Modified
- `src/pages/PlateDetail.tsx` - full redesign
- `src/components/ReportModal.tsx` - visual refresh to match mockup
- `src/pages/Profile.tsx` - redesign with level system
- `src/pages/WallOfShame.tsx` - redesign with spotlight card
- `src/pages/WatchMap.tsx` - UI refresh with search + legend
- `src/pages/Fleet.tsx` - dashboard redesign with chart
- `src/pages/Business.tsx` - enterprise hub redesign
- `src/pages/Auth.tsx` - visual refresh
- `src/pages/InsurancePortal.tsx` - enhanced dashboard
- `src/pages/LawEnforcement.tsx` - enhanced dashboard
- `src/pages/AdminPanel.tsx` - expanded with users/reports/fleet tabs

### New Dependencies
- `recharts` (already likely available via shadcn chart) for Fleet incident trend chart

