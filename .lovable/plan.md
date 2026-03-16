

# Modern Aesthetic Redesign for Plate In State

Based on research into 2026's top technology website design trends (bento grids, glassmorphism 2.0, dark-mode-first design, generous spacing, large radii, gradient accents, and subtle motion), here is the plan to transform the site into a premium, modern tech aesthetic.

## Design Direction

Inspired by: Linear, Vercel, Raycast, and Stripe — clean dark-mode-first interfaces with glassmorphism cards, gradient accents, smooth micro-animations, and generous whitespace.

```text
Current:  Gov.uk-style, flat, navy/white, small radius, utilitarian
Target:   Dark-mode-first, glass cards, gradient hero, glow accents,
          large radii (16px), Inter font, bento-style sections
```

## Changes

### 1. Color System Overhaul (`src/index.css`)
- **Dark mode as default** (add `dark` class to `<html>` in `index.html`)
- New palette: deep charcoal backgrounds (`hsl(228 12% 8%)`), soft off-white text, electric blue primary (`hsl(217 91% 60%)`), cyan-to-blue gradient accents
- Larger border-radius: `--radius: 0.75rem` (12px)
- Subtle border colors with low-opacity whites
- Light mode kept as secondary option with clean whites

### 2. Typography (`src/index.css`, `tailwind.config.ts`)
- Switch from IBM Plex Sans to **Inter** (modern tech standard)
- Keep IBM Plex Mono for plate numbers
- Import Inter from Google Fonts

### 3. Global Glass & Glow Utilities (`src/index.css`)
- Add `.glass` utility class: `backdrop-blur-xl bg-white/5 border border-white/10`
- Add `.glow` utility for subtle blue box-shadow accents
- Add gradient text utility for headings

### 4. Header Redesign (`src/components/Header.tsx`)
- Glassmorphism navbar: `bg-background/60 backdrop-blur-xl border-b border-white/10`
- Pill-shaped active nav indicator with gradient background
- Logo with subtle glow effect

### 5. Hero Section Redesign (`src/pages/Index.tsx`)
- Replace photo background with animated gradient mesh (CSS only — radial gradients with animation)
- Gradient text on heading (`bg-gradient-to-r from-white via-blue-200 to-cyan-400`)
- Glowing CTA button with hover animation
- Floating glass search bar
- Add subtle grid dot pattern overlay

### 6. Card System Overhaul (`src/components/PlateCard.tsx`, `RecentReports.tsx`)
- Glass card style: dark translucent backgrounds with `border-white/10`
- Hover: lift + subtle glow border
- Score badges with gradient backgrounds instead of flat colors

### 7. Auth Page (`src/pages/Auth.tsx`)
- Replace photo bg with animated gradient mesh matching hero
- Glass card for the form
- Gradient button for submit

### 8. Leaderboard & Profile Pages
- Glass card containers
- Gradient accents on stats/numbers
- Consistent with new card system

### 9. Bento-Style Fleet CTA on Index
- Transform the fleet CTA into a wider glass card with gradient border
- Add icon with glow effect

### 10. Footer
- Subtle glass treatment, gradient link hovers

### 11. Additional Tailwind Config (`tailwind.config.ts`)
- Add glow keyframe animation
- Add gradient animation for hero background
- Update default radius

## Files to Modify
- `index.html` — add `class="dark"` to `<html>`
- `src/index.css` — new color system, font import, utility classes, gradient animations
- `tailwind.config.ts` — Inter font, new animations, updated radius
- `src/components/Header.tsx` — glassmorphism nav
- `src/pages/Index.tsx` — gradient mesh hero, glass cards, bento layout
- `src/components/PlateCard.tsx` — glass card style
- `src/components/RecentReports.tsx` — glass report rows
- `src/pages/Auth.tsx` — gradient bg, glass form
- `src/pages/Leaderboard.tsx` — glass cards
- `src/pages/Profile.tsx` — glass cards, gradient stats
- `src/pages/PlateDetail.tsx` — glass cards
- `src/components/NotificationBell.tsx` — glass popover
- `src/components/ReportModal.tsx` — glass dialog
- `src/components/BadgeCard.tsx` — glass badge cards

