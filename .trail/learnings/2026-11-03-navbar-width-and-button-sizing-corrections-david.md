---
title: Navbar width and button sizing corrections
author: David
date: 2026-11-03
branch: main
cost: { minutes: 1, tokens: 98331 }
id: l-4c9ea68e
scope: repo
status: active
src: agent
---

## Decided
- Reverted navbar max-width from `max-w-8xl` back to `max-w-7xl` because 8xl expands navbar to full viewport width on PC views
- Reverted button padding from `py-2` back to `py-3` in buttonClass function because reduced padding causes navbar overflow on desktop

## Tried and ruled out
- `max-w-8xl` for navbar: expands to full viewport width, breaking layout
- `py-2` button padding: causes button to overflow navbar container on PC

## Watch out
- Future changes to navbar max-width or button padding should consider viewport impact
- `max-w-8xl` should only be used if full-width navbar is intentional
- `py-2` button works only with constrained navbar widths
