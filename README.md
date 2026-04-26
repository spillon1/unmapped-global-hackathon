# UNMAPPED 🗺️

**Map informal skills to economic opportunity**

*World Bank Youth Summit × Hack-Nation 2026*

---

## The Problem

1.7 billion informal workers globally are invisible to economic systems. They have real skills — phone repair, tailoring, farming, driving — but no way to translate those skills into formal qualifications, career pathways, or policy visibility.

Traditional labour market tools assume formal employment, standardised credentials, and well-documented job histories. For a 22-year-old phone repairer in Lagos or a tailor in Dhaka, none of that exists.

**UNMAPPED bridges that gap.**

## Our Approach

UNMAPPED is an open infrastructure layer that maps informal talent to real economic opportunity. It works like this:

1. **Capture** — A 5-step onboarding (available in 8 languages) translates informal work descriptions into ISCO-08 occupation codes
2. **Bridge** — A unified crosswalk engine connects SOC ↔ ISCO-08 ↔ ESCO ↔ O\*NET, linking 4 international taxonomy systems
3. **Analyse** — Task-level automation recalibration adjusts Frey & Osborne probabilities for informal economy contexts
4. **Project** — Wittgenstein SSP2 education projections and ILO labour market signals show where the economy is heading
5. **Act** — Career transition pathways with specific skill gaps, training costs, and wage uplift estimates

## What Makes This Different

- **Task-level automation recalibration** — not just "you're at 64% risk" but *which tasks* are at risk and *why*
- **SOC ↔ ISCO-08 ↔ ESCO ↔ O\*NET unified crosswalk** — 4 taxonomy systems bridged in one explorer
- **Country-agnostic** — swap a config file, get Nigeria, Ghana, Kenya, India, Rwanda, or Bangladesh
- **Real data** — 9 international sources, 174K+ records, every number cited with source and vintage
- **Informal economy calibration** — automation probabilities adjusted for context (Nigeria ≠ the US)

## Live Demo

🔗 **[unmapped-global-hackathon.lovable.app](https://unmapped-global-hackathon.lovable.app)**

## Data Foundation

| Source | Records | Coverage |
|--------|---------|----------|
| ILO ILOSTAT | 2.6M rows | 190 countries |
| O\*NET | 19K tasks | 894 SOC occupations |
| ESCO v1.2 | 14,209 skills | 28 languages |
| World Bank WDI | 117K rows | 25 indicators |
| Frey & Osborne (2013) | 702 occupations | Automation probabilities |
| Wittgenstein Centre | 228 countries | Education projections 2020–2100 (SSP2) |
| UN Population Division | 237 countries | Demographics 1950–2100 |
| World Bank HCI | 37K rows | Human Capital Index |
| UNESCO UIS | 31 indicators | Education statistics |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Layer 5: Youth Interface + Policymaker Dashboard   │
│  React · TanStack Router · Tailwind · Recharts      │
├─────────────────────────────────────────────────────┤
│  Layer 4: AI Classification Engine                   │
│  GPT-4o-mini · ISCO-08 mapping · Skill extraction   │
├─────────────────────────────────────────────────────┤
│  Layer 3: Crosswalk & Recalibration Engine           │
│  SOC↔ISCO-08↔ESCO↔O*NET · Task-level calibration   │
├─────────────────────────────────────────────────────┤
│  Layer 2: Country Configuration Layer                │
│  6 country configs · Education taxonomies · Themes   │
├─────────────────────────────────────────────────────┤
│  Layer 1: Data Foundation                            │
│  9 sources · 174K+ records · Static fallback mode    │
└─────────────────────────────────────────────────────┘
```

## Features

### Youth Interface
- 5-step onboarding in 8 languages (English, French, Yoruba, Hausa, Swahili, Hindi, Kinyarwanda, Bengali)
- AI-powered occupation matching for freetext descriptions
- Animated readiness gauge with task-level automation breakdown
- Career transition pathways with specific skill gaps and training cost tiers
- Exportable profile card with occupation, risk score, and top pathways
- Country-adaptive visual theming (colours, patterns, cultural greetings)

### Policymaker Dashboard
- Workforce automation exposure distribution across occupations
- Top 10 most resilient and most exposed occupation tables
- Skills gap analysis with ESCO skill taxonomy
- Education pipeline projections (Wittgenstein SSP2, 2025–2035)
- Country comparison mode with side-by-side analytics

### Taxonomy Crosswalk Explorer
- Interactive SOC ↔ ISCO-08 ↔ ESCO ↔ O\*NET mapping visualisation
- Skill-level drill-down with ESCO competency details
- 13 priority informal-economy occupations pre-loaded

### Data Coverage Dashboard
- Source-by-country coverage matrix
- Freshness indicators and record counts
- Gap identification for future data collection

## Tech Stack

- **Frontend:** React 19, TanStack Router, TanStack Start, Tailwind CSS v4, Radix UI, Recharts, Lucide icons
- **AI:** OpenAI GPT-4o-mini (occupation classification + skill extraction)
- **Data:** Embedded static JSON with API fallback, O\*NET + ESCO + ISCO-08 crosswalks
- **i18n:** 8 languages with dynamic locale loading
- **Deploy:** GitHub Pages (frontend), static data fallback for full offline demo

## Setup

```bash
npm install
npm run dev
```

The app runs entirely client-side with embedded static data. No backend required for demo mode.

To connect to the full API:
```bash
VITE_API_URL=http://localhost:8000 npm run dev
```

## Project Structure

```
src/
├── routes/           # File-based routing (TanStack Router)
│   ├── index.tsx     # Landing page
│   ├── passport.tsx  # 5-step onboarding
│   ├── results.tsx   # Personal results dashboard
│   ├── policymaker.tsx # Workforce intelligence
│   ├── compare.tsx   # Country comparison
│   ├── education.tsx # Education projections
│   ├── crosswalk.tsx # Taxonomy explorer
│   ├── coverage.tsx  # Data coverage matrix
│   ├── infrastructure.tsx # Architecture docs
│   ├── methodology.tsx    # Data methodology
│   └── demo.tsx      # Interactive demo
├── components/       # Shared UI components
├── lib/              # Core logic (API client, i18n, stores, engine)
├── data/             # Country configs, skill data
└── locales/          # Translation files (8 languages)
```

## Team

Built by **Josh Augustine** — Cambridge Judge Business School MBA

## License

MIT
