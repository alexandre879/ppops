---
title: The company now lists only two phone numbers; three old ones were retired
author: David
date: 2026-11-06
branch: main
touches:
  - backend/apps/core/models.py
  - backend/apps/public/tests.py
  - web/src/lib/api.ts
  - backend/apps/core/migrations/0005_remove_old_phone_numbers.py
---

## Decided
On 2026-11-06 the user retired +995 579 01 32 41, +995 551 27 77 30 and +995 593 28 68 94. The website, AI assistant and quote PDF must show only +995 557 60 30 04 (main) and +995 568 28 27 72. This replaces the earlier "keep five numbers" decision.

## Watch out
The numbers live in the SiteSettings DB row, not only in code defaults. Changing defaults alone leaves the live site unchanged, so a data migration cleared them from existing rows. The five phone fields still exist; the last three are just empty.

In the code:
- backend/apps/core/migrations/0005_remove_old_phone_numbers.py: strips retired numbers (matched by digits) and moves the kept ones to the front
- backend/apps/core/models.py: phone field defaults
- web/src/lib/api.ts: fallback phones list
- backend/apps/public/tests.py: test_site_settings_are_public
