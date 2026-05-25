## Goal
Make the top navigation bar taller and all buttons easier to tap on mobile.

## Current State
- Header container is `h-14` (56 px)
- Nav links have `px-3 py-1.5` padding with `h-3.5 w-3.5` icons
- Sign-out button is `h-7 w-7`
- Sign-in button is `h-8 px-4`

## Changes
1. **Header container** – bump from `h-14` to `h-16` (64 px)
2. **Nav links** – increase padding from `px-3 py-1.5` to `px-4 py-2` and bump icon size from `h-3.5 w-3.5` to `h-4 w-4`
3. **Sign-out button** – increase from `h-7 w-7` to `h-8 w-8`
4. **Credits badge** – slightly more padding for parity
5. **Logo** – increase from `h-7 w-7` to `h-8 w-8`

## Scope
Single file: `src/components/Header.tsx`