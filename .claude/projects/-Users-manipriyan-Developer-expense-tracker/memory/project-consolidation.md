---
name: project-consolidation
description: Finance pages consolidated — Goals+Intelligence merged, Insights redirected to Analytics, shared health-score utils extracted, Goal Planner added to SIP calculator
metadata:
  type: project
---

## Round 2 consolidations (2026-06-09)

**Expenses + Income** merged into `/expenses` (Money Flow page):
- Three tabs: Expenses | Income | Summary
- Summary tab shows 6-month cashflow bars, MoM table, top expense categories
- `/incomes` redirects to `/expenses?tab=income`
- Sidebar "Cash Flow" group: Money Flow, Recurring, Debt Tracker (was "Finance" with Expenses + Income separate)
- Home page quick links updated: 8 items in 4-column grid including Money Flow

**Sidebar cleanup:**
- Removed "Insights" as separate nav item (analytics already has it as a tab)
- Removed "Goals Intelligence" as separate nav item (goals has Intelligence tab)
- Renamed Finance sub-group to "Cash Flow"

## Round 1 consolidations (2026-06-09)

**Goals + Goals Intelligence** merged into one page at `/goals`:
- `/goals` now has two tabs: "Goals" (existing list) and "Intelligence" (full goals-analysis with Focus/Queue/Analytics/Strategy subtabs)
- `/goals-analysis` redirects to `/goals?tab=intelligence`
- Sidebar "Goals Intelligence" now points to `/goals?tab=intelligence`

**Insights** redirected to Analytics:
- `/insights` redirects to `/analytics?tab=insights` (analytics already had InsightsTabContent embedded)
- Sidebar "Insights" now points to `/analytics?tab=insights`

**Shared health score utils** extracted to `lib/health-score-utils.ts`:
- Both `dashboard/page.tsx` and `health-score/page.tsx` import from there
- Eliminates duplicated `scoreSavings`, `scoreBudget`, `scoreDebt`, `scoreGoals`, `scoreInvestments`, `gradeFromTotal` etc.

**New feature — Goal Planner** added to SIP Calculator (`/sip-calculator`):
- Third tab "Goal Planner" alongside SIP and SWP
- Enter target amount, current savings, timeline, expected return → calculates required monthly SIP
- Shows rate sensitivity table (8%/10%/12%/15%/18%)
- Supports step-up SIP

**Why:** User asked to consolidate pages, remove duplicates, and add advanced features.
**How to apply:** Goals Intelligence is now a tab in /goals. Insights is embedded in Analytics. Don't re-create standalone pages for these.
