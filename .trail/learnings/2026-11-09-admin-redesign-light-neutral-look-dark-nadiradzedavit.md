---
title: "Admin redesign: light neutral look, dark primary buttons, brand orange only as accent"
author: Nadiradzedavit
date: 2026-11-09
branch: chore/rename-new-house-world
cost: { minutes: 5, tokens: 94986 }
id: l-bb3778f3
scope: repo
status: active
src: agent
touches:
  - admin/src/app/globals.css
  - admin/src/components/shell.tsx
  - admin/src/components/ui.tsx
  - admin/src/components/status-badge.tsx
  - admin/src/components/data-table.tsx
  - admin/src/components/brand-mark.tsx
  - admin/src/app/login/page.tsx
  - admin/src/app/(app)/page.tsx
  - admin/src/components/revenue-chart.tsx
---

## Decided
- The admin uses one light theme (no dark mode, no new UI packages): white cards and sidebar on a near-white canvas. The user chose this over a dark sidebar or full dark look.
- The whole admin is re-toned from one place: the `stone` colour scale is overridden with cool zinc-like greys. All 24 pages are written against `stone-*`, so remapping the scale changes every page without touching page code.
- Primary buttons are near-black with white text. White text on brand orange (#e3530c) is only about 3.8:1 contrast, below AA for 14px text, so orange is kept for accents: active menu marker, focus ring, links, progress bars, tab underline.
- No new interface strings were added, so the ka/ru catalogs did not need changes. The header breadcrumb reuses the menu group and item labels.

## Tried and ruled out
- Renaming `stone-*` classes to another scale page by page: hundreds of edits for the same result as the token override.
- Orange primary buttons with white text: fails contrast. Orange with black text (the old look) reads as dated next to the neutral palette.

## Watch out
- `stone-*` in admin no longer means Tailwind's warm stone. A hard-coded warm hex (for example in chart props) will look off beside it.
- Pages that paint their own highlight (estimator total tile, quotation total row and PDF link) do not use the shared button and had to be restyled by hand; new ones should use `buttonClass`.
- `npm run build` in admin fetches Inter from Google Fonts and fails offline.

In the code:
- admin/src/app/globals.css: `--color-stone-*` overrides, `--shadow-xs`, `--shadow-sm`
- admin/src/components/ui.tsx: `buttonVariants`, `controlClass`, `StatCard`, `Card`
- admin/src/components/shell.tsx: light sidebar, `Crumbs`, `currentEntry`
- admin/src/components/status-badge.tsx: `DOTS`
