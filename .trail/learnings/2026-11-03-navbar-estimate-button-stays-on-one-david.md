---
title: Navbar estimate button stays on one line with a fixed height; spacing was tightened to make room
author: David
date: 2026-11-03
branch: main
cost: { minutes: 6, tokens: 197226 }
touches:
  - web/src/components/site-header.tsx
---

## Decided
- The header "Get estimate" button uses a fixed height (h-11, i.e. 44px in the 64px bar, so it sits 10px from the top, bottom and right) and whitespace-nowrap, instead of the global button padding. In Georgian it was wrapping to two lines and filling the whole bar.
- Spacing tightened so Georgian fits once the phone number shows (from 2xl, 1536px up, inside the 1280px max-w-7xl bar): nav links px-4 to px-3.5, bar gap-4 to gap-3, right group gap-3 to gap-2.5.

## Tried and ruled out
- Only adding nowrap: Georgian then overflowed the bar by 19px at 1536px and above. The wrapping had been hiding that.

## Watch out
- Georgian labels are the widest. Check ka at 1536px for overflow (bar.scrollWidth > clientWidth) after changing nav labels or spacing.
- Earlier learning still holds: keep max-w-7xl and the global buttonClass py-3.

In the code: web/src/components/site-header.tsx (header bar div, nav Link className, desktop CTA Link).
