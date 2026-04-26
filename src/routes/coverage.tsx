import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, Globe, ArrowRight, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { DataSource } from "@/components/data-source";

export const Route = createFileRoute("/coverage")({
  component: CoverageDashboard,
  head: () => ({
    meta: [
      { title: "Data Coverage — UNMAPPED" },
      {
        name: "description",
        content:
          "Breadth and depth of UNMAPPED data holdings across 9 sources and 5 countries.",
      },
    ],
  }),
});

// ─── Types ────────────────────────────────────────────────────────────────────

type CoverageStatus = "complete" | "partial" | "missing" | "global";

interface MatrixRow {
  source: string;
  description: string;
  nga: CoverageStatus;
  gha: CoverageStatus;
  ken: CoverageStatus;
  ind: CoverageStatus;
  rwa: CoverageStatus;
  rows: string;
  updated: string;
}

interface CountryCard {
  iso3: string;
  flag: string;
  name: string;
  occupationCoverage: number;
  occupationTotal: number;
  educationYears: string;
  gap: string;
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const MATRIX_ROWS: MatrixRow[] = [
  {
    source: "WDI Labour",
    description: "World Bank World Development Indicators – labour market series",
    nga: "complete", gha: "complete", ken: "complete", ind: "complete", rwa: "complete",
    rows: "117K", updated: "2024",
  },
  {
    source: "HCI",
    description: "World Bank Human Capital Index",
    nga: "complete", gha: "complete", ken: "complete", ind: "complete", rwa: "complete",
    rows: "37K", updated: "2020",
  },
  {
    source: "ILOSTAT",
    description: "ILO labour force statistics — employment, wages, hours",
    nga: "complete", gha: "complete", ken: "complete", ind: "complete", rwa: "complete",
    rows: "2.6M", updated: "2024",
  },
  {
    source: "UN Population",
    description: "UN DESA World Population Prospects — age-sex pyramids",
    nga: "complete", gha: "complete", ken: "complete", ind: "complete", rwa: "complete",
    rows: "303+", updated: "2024",
  },
  {
    source: "Wittgenstein",
    description: "Wittgenstein Centre education & population projections to 2100",
    nga: "complete", gha: "complete", ken: "complete", ind: "complete", rwa: "complete",
    rows: "510+", updated: "2023",
  },
  {
    source: "UNESCO UIS",
    description: "UNESCO Institute for Statistics — education attainment & literacy",
    nga: "complete", gha: "complete", ken: "complete", ind: "complete", rwa: "complete",
    rows: "275", updated: "2024",
  },
  {
    source: "Frey-Osborne",
    description: "Oxford automation risk scores — global occupation taxonomy",
    nga: "global", gha: "global", ken: "global", ind: "global", rwa: "global",
    rows: "702", updated: "2013",
  },
  {
    source: "O*NET",
    description: "US Department of Labor occupational task & skill requirements",
    nga: "global", gha: "global", ken: "global", ind: "global", rwa: "global",
    rows: "19K", updated: "2024",
  },
  {
    source: "ESCO",
    description: "EU multilingual classification of skills, competences & occupations",
    nga: "global", gha: "global", ken: "global", ind: "global", rwa: "global",
    rows: "14K", updated: "2024",
  },
  {
    source: "Job Vacancies",
    description: "Scraped online job postings — parsed to ISCO + skills",
    nga: "complete", gha: "partial", ken: "missing", ind: "missing", rwa: "missing",
    rows: "4.9K", updated: "2025",
  },
  {
    source: "Policymaker Agg",
    description: "Aggregated policymaker-ready labour market brief per country",
    nga: "complete", gha: "partial", ken: "partial", ind: "partial", rwa: "partial",
    rows: "—", updated: "2025",
  },
  {
    source: "Recalibrated Risk",
    description: "Automation risk re-scored for local wage & task context",
    nga: "complete", gha: "complete", ken: "complete", ind: "complete", rwa: "complete",
    rows: "1.9K", updated: "2025",
  },
];

const COUNTRIES_DETAIL: CountryCard[] = [
  {
    iso3: "NGA", flag: "🇳🇬", name: "Nigeria",
    occupationCoverage: 19, occupationTotal: 19,
    educationYears: "2010 – 2023",
    gap: "Sub-national data sparse outside Lagos & Kano",
  },
  {
    iso3: "GHA", flag: "🇬🇭", name: "Ghana",
    occupationCoverage: 17, occupationTotal: 19,
    educationYears: "2012 – 2022",
    gap: "Job vacancy data partial; 2 occupations lack wage benchmarks",
  },
  {
    iso3: "KEN", flag: "🇰🇪", name: "Kenya",
    occupationCoverage: 16, occupationTotal: 19,
    educationYears: "2013 – 2023",
    gap: "Informal sector wage data limited; vacancy scraping not yet live",
  },
  {
    iso3: "IND", flag: "🇮🇳", name: "India",
    occupationCoverage: 18, occupationTotal: 19,
    educationYears: "2008 – 2023",
    gap: "State-level education attainment gaps; vacancy scraping pending",
  },
  {
    iso3: "RWA", flag: "🇷🇼", name: "Rwanda",
    occupationCoverage: 14, occupationTotal: 19,
    educationYears: "2015 – 2022",
    gap: "Smallest economy — fewest ILOSTAT series; vacancy data absent",
  },
];

const CROSSWALK_STEPS = [
  { label: "SOC → ISCO mappings", count: "1,634", pct: 100, color: "bg-cobalt" },
  { label: "ISCO → ESCO skill mappings", count: "426", pct: 78, color: "bg-cobalt/80" },
  { label: "Occupations with task-level breakdowns", count: "374", pct: 60, color: "bg-cobalt/65" },
  { label: "Adjacency pathways", count: "155", pct: 40, color: "bg-cobalt/50" },
  { label: "Specific skill gap entries", count: "13,688", pct: 22, color: "bg-cobalt/35" },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CoverageStatus }) {
  const map: Record<CoverageStatus, { icon: string; title: string; cls: string }> = {
    complete: { icon: "✅", title: "Complete", cls: "text-emerald-600" },
    partial:  { icon: "⚠️", title: "Partial",  cls: "text-amber-500" },
    missing:  { icon: "❌", title: "Missing",  cls: "text-rose-500" },
    global:   { icon: "🌐", title: "Global",   cls: "text-sky-500" },
  };
  const { icon, title, cls } = map[status];
  return (
    <span title={title} className={`text-base leading-none ${cls}`} aria-label={title}>
      {icon}
    </span>
  );
}

// ─── Hero Stat Card ───────────────────────────────────────────────────────────

function HeroCard({
  value,
  label,
  sub,
  icon: Icon,
}: {
  value: string;
  label: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-2 border border-line bg-paper p-6 md:p-8">
      <Icon className="h-6 w-6 text-cobalt" strokeWidth={1.5} />
      <div className="mt-2 font-display text-5xl font-black tracking-tight text-ink md:text-6xl">
        {value}
      </div>
      <div className="text-base font-semibold text-ink">{label}</div>
      {sub && <div className="text-xs text-ink/55">{sub}</div>}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  const items: { status: CoverageStatus; label: string }[] = [
    { status: "complete", label: "Complete" },
    { status: "partial",  label: "Partial" },
    { status: "missing",  label: "Missing" },
    { status: "global",   label: "Global (not country-specific)" },
  ];
  return (
    <div className="flex flex-wrap gap-4 text-xs text-ink/70">
      {items.map(({ status, label }) => (
        <span key={status} className="flex items-center gap-1.5">
          <StatusBadge status={status} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cobalt">{eyebrow}</div>
      <h2 className="mt-1 font-display text-2xl font-black text-ink md:text-3xl">{title}</h2>
    </div>
  );
}

// ─── Coverage Matrix ──────────────────────────────────────────────────────────

function CoverageMatrix() {
  const countries = ["NGA", "GHA", "KEN", "IND", "RWA"];
  return (
    <section className="mb-16">
      <SectionHeader eyebrow="02 — Source × Country" title="Coverage Matrix" />
      <Legend />
      <div className={`mt-4 rounded-none border border-line $"overflow-x-auto"`}>
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-sand">
              <th className="whitespace-nowrap px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-ink/50">
                Source
              </th>
              {countries.map((c) => (
                <th
                  key={c}
                  className="whitespace-nowrap px-4 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-ink/50"
                >
                  {c}
                </th>
              ))}
              <th className="whitespace-nowrap px-4 py-3 text-right font-mono text-[10px] uppercase tracking-wider text-ink/50">
                Rows
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-mono text-[10px] uppercase tracking-wider text-ink/50">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {MATRIX_ROWS.map((row, i) => (
              <tr
                key={row.source}
                className={`border-b border-line transition-colors hover:bg-sand/60 ${i % 2 === 0 ? "bg-paper" : "bg-sand/30"}`}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-ink">{row.source}</span>
                    <span className="mt-0.5 text-[11px] text-ink/50">{row.description}</span>
                  </div>
                </td>
                {(["nga", "gha", "ken", "ind", "rwa"] as const).map((iso) => (
                  <td key={iso} className="px-4 py-3 text-center">
                    <StatusBadge status={row[iso]} />
                  </td>
                ))}
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-ink/70">
                  {row.rows}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-ink/70">
                  {row.updated}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Crosswalk Funnel ─────────────────────────────────────────────────────────

function CrosswalkFunnel() {
  return (
    <section className="mb-16">
      <SectionHeader eyebrow="03 — Crosswalk Depth" title="Occupation × Skill Bridge" />
      <div className="flex flex-col gap-2 md:gap-3">
        {CROSSWALK_STEPS.map((step, i) => (
          <div key={step.label} className="flex items-center gap-4">
            {/* Step number */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-sand text-[10px] font-bold text-ink/60">
              {i + 1}
            </div>
            {/* Bar + label */}
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-ink">{step.label}</span>
                <span className="font-mono text-sm font-bold text-cobalt">{step.count}</span>
              </div>
              {/* Funnel bar — narrows as we go deeper */}
              <div
                className="h-5 rounded-sm transition-all"
                style={{
                  width: `${step.pct}%`,
                  background: `hsl(199 89% ${28 + i * 8}%)`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-ink/50">
        Each layer is a deterministic mapping — no imputed or synthetic links.
        SOC codes serve as the universal pivot between O*NET tasks, ISCO classifications, and ESCO skills.
      </p>
    </section>
  );
}

// ─── Per-Country Cards ────────────────────────────────────────────────────────

function CountryCards() {
  return (
    <section className="mb-16">
      <SectionHeader eyebrow="04 — Country Detail" title="Per-Country Coverage" />
      <div className={`grid gap-4 $"grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"`}>
        {COUNTRIES_DETAIL.map((c) => {
          const pct = Math.round((c.occupationCoverage / c.occupationTotal) * 100);
          return (
            <div
              key={c.iso3}
              className="flex flex-col gap-4 border border-line bg-paper p-5 transition-shadow hover:shadow-md"
            >
              {/* Flag + name */}
              <div className="flex items-center gap-2">
                <span className="text-3xl leading-none">{c.flag}</span>
                <div>
                  <div className="font-display text-base font-black text-ink">{c.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink/40">{c.iso3}</div>
                </div>
              </div>

              {/* Occupation coverage */}
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-ink/60">
                  <span>Priority occupations</span>
                  <span className="font-mono font-bold text-cobalt">
                    {c.occupationCoverage}/{c.occupationTotal}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-sand">
                  <div
                    className="h-full rounded-full bg-cobalt transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-0.5 text-right text-[10px] text-ink/40">{pct}% full data</div>
              </div>

              {/* Education data */}
              <div className="rounded-none border-l-2 border-cobalt/30 pl-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">Education data</div>
                <div className="mt-0.5 font-mono text-xs text-ink">{c.educationYears}</div>
              </div>

              {/* Gap */}
              <div className="rounded-none border-l-2 border-amber-400 pl-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Key gap</div>
                <div className="mt-0.5 text-[11px] leading-snug text-ink/70">{c.gap}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Quality Notes ────────────────────────────────────────────────────────────

function QualityNotes() {
  const notes = [
    {
      icon: AlertTriangle,
      title: "Vintage heterogeneity",
      body: "Not all indicators share the same reference year. Time-series comparisons are flagged where vintage gaps exceed 3 years.",
    },
    {
      icon: Globe,
      title: "Global taxonomy applied locally",
      body: "Frey-Osborne, O*NET, and ESCO scores are US/EU-derived. We recalibrate automation risk using local wage and task data, but direct comparability is limited.",
    },
    {
      icon: Database,
      title: "Informal economy undercount",
      body: "ILOSTAT and national labour force surveys systematically undercount informal sector workers — often 70–85% of the workforce in Sub-Saharan Africa.",
    },
    {
      icon: Info,
      title: "Job vacancy coverage",
      body: "Online vacancy data skews toward formal, urban, and digital roles. Rural and agricultural occupations are structurally underrepresented.",
    },
    {
      icon: CheckCircle2,
      title: "Data lineage tracked",
      body: "Every figure in UNMAPPED is traceable to a specific dataset, vintage, and transformation step. No synthetic or modelled gap-fills without explicit disclosure.",
    },
  ];

  return (
    <section className="mb-16">
      <SectionHeader eyebrow="05 — Data Quality" title="Known Limitations" />
      <div className={`grid gap-4 $"grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"`}>
        {notes.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-4 border border-line bg-sand/40 p-5">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-cobalt" strokeWidth={1.5} />
            <div>
              <div className="font-semibold text-ink">{title}</div>
              <p className="mt-1 text-sm leading-relaxed text-ink/70">{body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-3 border border-line bg-paper p-5">
        <ArrowRight className="h-4 w-4 shrink-0 text-cobalt" />
        <p className="text-sm text-ink/70">
          Full methodology, source citations, and recalibration formulas are documented in the{" "}
          <Link to="/methodology" className="font-semibold text-cobalt underline underline-offset-2 hover:text-cobalt/80">
            Methodology page →
          </Link>
        </p>
      </div>
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function CoverageDashboard() {
  return (
    <PageShell
      eyebrow="Data Coverage"
      title="What's under the hood"
      lede="9 international data sources. 5 countries. 174K+ crosswalk records. Here's exactly what we have — and what we don't."
    >
      {/* ── 01 Hero Stats ── */}
      <section className="mb-16">
        <div className="mb-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cobalt">01 — At a glance</div>
          <h2 className="mt-1 font-display text-2xl font-black text-ink md:text-3xl">Data Holdings</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <HeroCard
            value="9"
            label="Data Sources"
            sub="ILO · WDI · HCI · UN Pop · Wittgenstein · UNESCO · Frey-Osborne · O*NET · ESCO"
            icon={Database}
          />
          <HeroCard
            value="5"
            label="Countries"
            sub="🇳🇬 Nigeria · 🇬🇭 Ghana · 🇰🇪 Kenya · 🇮🇳 India · 🇷🇼 Rwanda"
            icon={Globe}
          />
          <HeroCard
            value="174K+"
            label="Crosswalk Records"
            sub="SOC → ISCO → ESCO occupation taxonomy bridges"
            icon={ArrowRight}
          />
          <HeroCard
            value="14,209"
            label="Skills Mapped"
            sub="Specific competences linked to occupations and learning pathways"
            icon={CheckCircle2}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink/50">
          <span>Sources:</span>
          <DataSource label="ILOSTAT 2024" dataset="ILO Statistics" vintage="2024" url="https://ilostat.ilo.org" />
          <DataSource label="WDI 2024" dataset="World Development Indicators" vintage="2024" url="https://databank.worldbank.org/source/world-development-indicators" />
          <DataSource label="O*NET 2024" dataset="O*NET OnLine" vintage="2024" url="https://www.onetonline.org" />
          <DataSource label="ESCO 2024" dataset="European Skills, Competences, Qualifications and Occupations" vintage="2024" url="https://esco.ec.europa.eu" />
        </div>
      </section>

      {/* ── 02 Matrix ── */}
      <CoverageMatrix />

      {/* ── 03 Crosswalk ── */}
      <CrosswalkFunnel />

      {/* ── 04 Countries ── */}
      <CountryCards />

      {/* ── 05 Quality ── */}
      <QualityNotes />
    </PageShell>
  );
}
