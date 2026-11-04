---
title: Header button overrides need the important modifier because the shared button padding otherwise wins
author: David
date: 2026-11-04
branch: main
id: l-10023362
scope: repo
status: active
src: agent
touches:
  - web/src/components/site-header.tsx
  - docker-compose.dev.yml
  - web/src/components/ui.tsx
---

## Decided
- The header "Get estimate" button passes `h-11 shrink-0 px-5! py-0! whitespace-nowrap` to buttonClass. Without the `!` the overrides did nothing: buttonClass already sets px-6 py-3, clsx keeps both classes, and Tailwind decides by stylesheet order, where px-6 and py-3 come after px-5 and py-0. The button stayed 24px wide on each side, and the Georgian bar overflowed by 5px from 1536px up.
- The rest of the earlier fix stands: fixed 44px height, nowrap, nav links px-3.5, bar gap-3, right group gap-2.5, max-w-7xl.

## Tried and ruled out
- Plain `px-5 py-0` overrides: they lose to buttonClass's base padding (see above). Earlier checks missed this because they only measured height and overflow on fallback content.

## Watch out
- Any className passed to buttonClass that conflicts with its base classes (padding, size, colour) needs `!` or will be ignored. There is no tailwind-merge in web/.
- The dev web container (docker-compose.dev.yml) did not pick up file edits until restarted. If a change doesn't show at :3000, check the served HTML for the new class before debugging the CSS.
- Check computed padding, not just class names, when verifying.

In the code: web/src/components/site-header.tsx (desktop CTA Link), web/src/components/ui.tsx buttonClass.
