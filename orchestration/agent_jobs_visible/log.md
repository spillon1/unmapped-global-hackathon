# Agent: jobs-visible
## Status: COMPLETE ✅

### What was built

1. **`src/lib/seed-jobs.ts`** — New module exporting `NGA_SEED_JOBS`, `GHA_SEED_JOBS`, and `getSeedJobs(iso3)` function. Contains full seed job data from `data/nga/seed_jobs.json` and `data/gha/seed_jobs.json`. Returns `null` for countries without data (KEN, IND, RWA, BGD).

2. **`src/components/job-demand-section.tsx`** — "📊 Local Job Demand Signals" component for the Results page:
   - Banner: "Scraped from LinkedIn, Jobberman, and Indeed — [country] labour market as of April 2025"
   - Summary stats (total vacancies tracked, source)
   - User match callout (🎯) if their ISCO code matches a tracked occupation
   - Card grid for each occupation: title, sector, vacancy bar (relative), trend (📈/➡️/📉), salary range
   - Sector breakdown table
   - DataSource citations
   - Data limitations callout
   - "Coming soon" message for countries without seed data

3. **`src/components/policymaker-job-demand.tsx`** — "Labour Market Demand Signals" component for policymakers:
   - Sortable table (occupation, sector, vacancies, trend, salary)
   - Default sort: vacancies descending
   - Demand bar chart per row
   - Formal sector only caveat
   - DataSource citations

4. **`src/routes/results.tsx`** — Added `<JobDemandSection>` between Task Breakdown and Transition Pathways sections. Passes country, countryName, and userIsco08.

5. **`src/routes/index.tsx`** — Added `<JobMarketPulse>` section between "How It Works" and "Impact Numbers":
   - "🔍 Live Job Intelligence" callout with animated pulse
   - Stats: 374+ occupation categories, 3 platforms, April 2025 vintage
   - Description of scraping methodology

6. **`src/routes/policymaker.tsx`** — Added `<PolicymakerJobDemand>` between Skill Gap Heatmap and Sector Demand sections.

### Styling
- Green (emerald) for growing/high trends
- Amber for stable/moderate
- Red for declining
- Vacancy bars show relative magnitude with CSS width transition
- Animated pulse dots for "live data" feel
- "Last updated" badges with green pulse indicator

### Build
✅ `npx vite build` passes successfully
