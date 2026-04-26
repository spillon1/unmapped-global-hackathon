/**
 * /infrastructure — Interactive Architecture Diagram
 *
 * Shows the full data pipeline: sources → crosswalks → engines → API → interfaces.
 * CSS-only connectors, expandable detail panels, no charting library.
 */

import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Database, GitMerge, Cpu, Zap, Monitor, ExternalLink, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/infrastructure")({
  component: InfrastructurePage,
});

// ─────────────────────────────────────────────────────────────────────────────
// Data model
// ─────────────────────────────────────────────────────────────────────────────

type CoverageStatus = "full" | "partial" | "limited";

interface ArchNode {
  id: string;
  name: string;
  subtitle: string;
  stats?: string[];
  lastUpdated: string;
  url?: string;
  feedsInto: string[];
  limitations?: string;
  coverage?: CoverageStatus;
}

interface ArchLayer {
  id: string;
  label: string;
  color: "blue" | "green" | "purple" | "orange" | "teal";
  icon: React.ReactNode;
  nodes: ArchNode[];
}

const LAYERS: ArchLayer[] = [
  {
    id: "sources",
    label: "Data Sources",
    color: "blue",
    icon: <Database className="h-4 w-4" />,
    nodes: [
      {
        id: "ilo",
        name: "ILO ILOSTAT",
        subtitle: "Labour market indicators",
        stats: ["10 indicators", "2.6M rows", "190+ countries"],
        lastUpdated: "2024-Q4",
        url: "https://ilostat.ilo.org/data/",
        feedsInto: ["crosswalk-unified"],
        limitations: "Formal sector bias; informal economy underrepresented in LMICs.",
        coverage: "full",
      },
      {
        id: "wdi",
        name: "World Bank WDI",
        subtitle: "World Development Indicators",
        stats: ["25 indicators", "117K rows", "217 economies"],
        lastUpdated: "2024-Q3",
        url: "https://databank.worldbank.org/source/world-development-indicators",
        feedsInto: ["crosswalk-lmic"],
        limitations: "Some indicators have 2–3 year reporting lag for low-income countries.",
        coverage: "full",
      },
      {
        id: "hci",
        name: "World Bank HCI",
        subtitle: "Human Capital Index",
        stats: ["15 indicators", "37K rows", "174 countries"],
        lastUpdated: "2024-Q2",
        url: "https://www.worldbank.org/en/publication/human-capital",
        feedsInto: ["crosswalk-lmic"],
        limitations: "HCI not available for all small island states.",
        coverage: "partial",
      },
      {
        id: "unwpp",
        name: "UN Population WPP 2024",
        subtitle: "World Population Prospects",
        stats: ["237 countries", "1950–2100 projections"],
        lastUpdated: "2024-Q2",
        url: "https://population.un.org/wpp/",
        feedsInto: ["crosswalk-unified"],
        limitations: "Projections past 2060 carry high uncertainty.",
        coverage: "full",
      },
      {
        id: "witt",
        name: "Wittgenstein Centre",
        subtitle: "Education & population projections",
        stats: ["228 countries", "SSP1/2/3 scenarios", "2020–2100"],
        lastUpdated: "2023-Q4",
        url: "http://www.wittgensteincentre.org/dataexplorer",
        feedsInto: ["engine-readiness"],
        limitations: "Sub-national breakdowns not available.",
        coverage: "partial",
      },
      {
        id: "unesco",
        name: "UNESCO UIS",
        subtitle: "Education & skills statistics",
        stats: ["31 indicators", "275 countries"],
        lastUpdated: "2024-Q1",
        url: "https://uis.unesco.org/",
        feedsInto: ["crosswalk-unified"],
        limitations: "TVET enrollment data sparse for Sub-Saharan Africa.",
        coverage: "partial",
      },
      {
        id: "frey",
        name: "Frey & Osborne",
        subtitle: "Automation probability by occupation",
        stats: ["702 US occupations", "Automation probabilities"],
        lastUpdated: "2013 (base), 2024 recalibration",
        url: "https://www.oxfordmartin.ox.ac.uk/publications/the-future-of-employment/",
        feedsInto: ["crosswalk-tasks", "engine-readiness"],
        limitations: "US-centric; requires LMIC recalibration for different task compositions.",
        coverage: "limited",
      },
      {
        id: "onet",
        name: "O*NET",
        subtitle: "Occupation characteristics database",
        stats: ["19K tasks", "62K skills", "73K work activities", "894 SOC codes"],
        lastUpdated: "2024.1",
        url: "https://www.onetcenter.org/database.html",
        feedsInto: ["crosswalk-soc-isco", "engine-skills"],
        limitations: "Occupational definitions reflect US labour market.",
        coverage: "limited",
      },
      {
        id: "esco",
        name: "ESCO",
        subtitle: "European skills/occupations taxonomy",
        stats: ["3,552 occupations", "14,209 skills", "28 languages"],
        lastUpdated: "v1.2.0 (2023)",
        url: "https://esco.ec.europa.eu/",
        feedsInto: ["crosswalk-isco-esco", "engine-opportunity"],
        limitations: "EU labour market framing; some occupations absent in LMICs.",
        coverage: "partial",
      },
    ],
  },
  {
    id: "crosswalk",
    label: "Crosswalk Bridge",
    color: "green",
    icon: <GitMerge className="h-4 w-4" />,
    nodes: [
      {
        id: "crosswalk-soc-isco",
        name: "SOC ↔ ISCO-08 Mapping",
        subtitle: "US to international occupation codes",
        stats: ["1,634 links"],
        lastUpdated: "2024-Q1",
        url: "https://www.bls.gov/soc/",
        feedsInto: ["crosswalk-unified"],
        limitations: "Many-to-many links create ambiguity for niche occupations.",
        coverage: "partial",
      },
      {
        id: "crosswalk-isco-esco",
        name: "ISCO-08 ↔ ESCO Matching",
        subtitle: "International to European occupation bridge",
        stats: ["426 ISCO codes matched"],
        lastUpdated: "2024-Q2",
        url: "https://esco.ec.europa.eu/en/use-esco/crosswalks",
        feedsInto: ["crosswalk-unified"],
        limitations: "ESCO v1 misses emerging digital occupations; v1.2 partially addresses.",
        coverage: "partial",
      },
      {
        id: "crosswalk-tasks",
        name: "Task Composition Analysis",
        subtitle: "5-category task breakdown per occupation",
        stats: ["5 categories/occupation", "Cognitive / manual / routine splits"],
        lastUpdated: "2024-Q3",
        feedsInto: ["crosswalk-lmic", "engine-readiness"],
        limitations: "Task categories derived from US O*NET — recalibrated for LMICs.",
        coverage: "partial",
      },
      {
        id: "crosswalk-lmic",
        name: "LMIC Recalibration Model",
        subtitle: "Country-specific automation multipliers",
        stats: ["Country-specific multipliers", "WDI + HCI inputs"],
        lastUpdated: "2024-Q4",
        feedsInto: ["crosswalk-unified"],
        limitations: "Multipliers are country-level, not sub-national.",
        coverage: "full",
      },
      {
        id: "crosswalk-skills",
        name: "Skills Adjacency Graph",
        subtitle: "Skill-to-skill transition pathways",
        stats: ["155 edges", "13K skill gaps mapped"],
        lastUpdated: "2024-Q3",
        feedsInto: ["engine-opportunity"],
        limitations: "Graph density low for informal/agricultural occupations.",
        coverage: "limited",
      },
      {
        id: "crosswalk-unified",
        name: "Unified SQLite DB",
        subtitle: "Master analytical store",
        stats: ["18.2 MB", "7 tables", "174K+ rows"],
        lastUpdated: "2025-04-20",
        feedsInto: ["engine-skills", "engine-readiness", "engine-opportunity"],
        limitations: "Static snapshot; real-time streaming not yet implemented.",
        coverage: "full",
      },
    ],
  },
  {
    id: "engines",
    label: "Analytical Engines",
    color: "purple",
    icon: <Cpu className="h-4 w-4" />,
    nodes: [
      {
        id: "engine-skills",
        name: "Skills Signal Engine",
        subtitle: "Free-text → ISCO-08 → risk profile",
        stats: ["NLP + fuzzy matching", "ISCO-08 resolution"],
        lastUpdated: "2025-04-20",
        feedsInto: ["api-fastapi"],
        limitations: "English-first; multilingual support in progress.",
        coverage: "partial",
      },
      {
        id: "engine-readiness",
        name: "AI Readiness Lens",
        subtitle: "Task-level automation recalibration",
        stats: ["Frey-Osborne base", "LMIC-adjusted scores"],
        lastUpdated: "2025-04-20",
        feedsInto: ["api-fastapi"],
        limitations: "Recalibration uses country aggregates, not employer-level data.",
        coverage: "full",
      },
      {
        id: "engine-opportunity",
        name: "Opportunity Matching",
        subtitle: "Adjacency pathways + training gaps",
        stats: ["ESCO skills graph", "Gap scoring"],
        lastUpdated: "2025-04-20",
        feedsInto: ["api-fastapi"],
        limitations: "Training provider data not yet integrated.",
        coverage: "limited",
      },
    ],
  },
  {
    id: "api",
    label: "API Layer",
    color: "orange",
    icon: <Zap className="h-4 w-4" />,
    nodes: [
      {
        id: "api-fastapi",
        name: "FastAPI",
        subtitle: "REST + LLM endpoints",
        stats: ["7 REST endpoints", "3 LLM endpoints"],
        lastUpdated: "2025-04-20",
        url: "https://fastapi.tiangolo.com/",
        feedsInto: ["ui-youth", "ui-policy"],
        limitations: "Rate limited to 100 req/min on free hosting tier.",
        coverage: "full",
      },
      {
        id: "api-openai",
        name: "OpenAI GPT-4o-mini",
        subtitle: "Skills parsing & follow-up questions",
        stats: ["Skills extraction", "Contextual Q&A"],
        lastUpdated: "2025-04-20",
        url: "https://platform.openai.com/docs/models/gpt-4o-mini",
        feedsInto: ["ui-youth"],
        limitations: "Token costs scale with usage; caching applied.",
        coverage: "full",
      },
      {
        id: "api-duckdb",
        name: "DuckDB / SQLite Query Engine",
        subtitle: "Analytical query layer",
        stats: ["In-process OLAP", "Sub-100ms queries"],
        lastUpdated: "2025-04-20",
        url: "https://duckdb.org/",
        feedsInto: ["api-fastapi"],
        limitations: "No persistent connections — queries are stateless.",
        coverage: "full",
      },
    ],
  },
  {
    id: "interfaces",
    label: "Interfaces",
    color: "teal",
    icon: <Monitor className="h-4 w-4" />,
    nodes: [
      {
        id: "ui-youth",
        name: "Youth Interface",
        subtitle: "Mobile-first, 5-step onboarding → results",
        stats: ["Skills Passport", "AI Readiness", "Opportunities"],
        lastUpdated: "2025-04-25",
        feedsInto: [],
        limitations: "Optimised for smartphones; desktop is secondary.",
        coverage: "full",
      },
      {
        id: "ui-policy",
        name: "Policymaker Dashboard",
        subtitle: "Aggregate workforce intelligence",
        stats: ["Country-level analytics", "Cohort breakdowns"],
        lastUpdated: "2025-04-25",
        feedsInto: [],
        limitations: "Requires aggregated cohort data; individual-level views not available.",
        coverage: "partial",
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Colour helpers
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  blue:   { header: "bg-blue-600",   badge: "bg-blue-100 text-blue-800",   border: "border-blue-200",   icon: "text-blue-600",   ring: "ring-blue-200"   },
  green:  { header: "bg-emerald-600",badge: "bg-emerald-100 text-emerald-800", border: "border-emerald-200", icon: "text-emerald-600", ring: "ring-emerald-200" },
  purple: { header: "bg-purple-600", badge: "bg-purple-100 text-purple-800", border: "border-purple-200", icon: "text-purple-600", ring: "ring-purple-200" },
  orange: { header: "bg-orange-500", badge: "bg-orange-100 text-orange-800", border: "border-orange-200", icon: "text-orange-500", ring: "ring-orange-200" },
  teal:   { header: "bg-teal-600",   badge: "bg-teal-100 text-teal-800",   border: "border-teal-200",   icon: "text-teal-600",   ring: "ring-teal-200"   },
};

const COVERAGE_BADGE: Record<CoverageStatus, { label: string; cls: string }> = {
  full:    { label: "Full coverage",    cls: "bg-green-100 text-green-700" },
  partial: { label: "Partial coverage", cls: "bg-yellow-100 text-yellow-700" },
  limited: { label: "Limited / US-only",cls: "bg-red-100 text-red-700" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Node card component
// ─────────────────────────────────────────────────────────────────────────────

function NodeCard({ node, color }: { node: ArchNode; color: ArchLayer["color"] }) {
  const [open, setOpen] = React.useState(false);
  const c = COLOR_MAP[color];

  return (
    <div
      className={cn(
        "rounded-lg border bg-white shadow-sm transition-all duration-200",
        c.border,
        open && `ring-2 ${c.ring}`,
      )}
    >
      {/* Clickable header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-start gap-2 p-3 text-left"
      >
        <div className="mt-0.5 shrink-0">
          {open
            ? <ChevronDown className={cn("h-3.5 w-3.5", c.icon)} />
            : <ChevronRight className={cn("h-3.5 w-3.5", c.icon)} />
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-gray-900">{node.name}</p>
          <p className="mt-0.5 text-xs text-gray-500 leading-snug">{node.subtitle}</p>
          {node.stats && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {node.stats.map(s => (
                <span key={s} className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", c.badge)}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>

      {/* Expandable detail */}
      {open && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2 space-y-2">
          <DetailRow label="Last updated" value={node.lastUpdated} icon={<Clock className="h-3 w-3" />} />
          {node.coverage && (
            <div className="flex items-center gap-1.5">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", COVERAGE_BADGE[node.coverage].cls)}>
                {COVERAGE_BADGE[node.coverage].label}
              </span>
            </div>
          )}
          {node.feedsInto.length > 0 && (
            <DetailRow
              label="Feeds into"
              value={node.feedsInto.map(id => {
                const found = LAYERS.flatMap(l => l.nodes).find(n => n.id === id);
                return found?.name ?? id;
              }).join(", ")}
            />
          )}
          {node.limitations && (
            <div className="rounded bg-amber-50 px-2.5 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Known limitation</p>
              <p className="mt-0.5 text-xs text-amber-800">{node.limitations}</p>
            </div>
          )}
          {node.url && (
            <a
              href={node.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("inline-flex items-center gap-1 text-xs font-medium hover:underline", c.icon)}
            >
              <ExternalLink className="h-3 w-3" />
              View source
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-700">
        {icon}
        {value}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer column component
// ─────────────────────────────────────────────────────────────────────────────

function LayerColumn({ layer, isLast }: { layer: ArchLayer; isLast: boolean }) {
  const c = COLOR_MAP[layer.color];

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Header */}
      <div className={cn("flex items-center gap-2 rounded-t-xl px-3 py-2.5 text-white", c.header)}>
        {layer.icon}
        <span className="text-xs font-bold uppercase tracking-wider">{layer.label}</span>
      </div>

      {/* Nodes */}
      <div className={cn(
        "flex flex-1 flex-col gap-2 rounded-b-xl border-x border-b p-2",
        c.border,
        "bg-white/50",
      )}>
        {layer.nodes.map(node => (
          <NodeCard key={node.id} node={node} color={layer.color} />
        ))}
      </div>

      {/* Arrow connector (hidden on last layer) */}
      {!isLast && (
        <div className="hidden xl:flex justify-end">
          {/* purely decorative — real arrows live in the SVG overlay */}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Freshness section
// ─────────────────────────────────────────────────────────────────────────────

const FRESHNESS_ITEMS = [
  { name: "ILO ILOSTAT",            pulled: "2024-Q4", status: "fresh"  as const },
  { name: "World Bank WDI",         pulled: "2024-Q3", status: "fresh"  as const },
  { name: "World Bank HCI",         pulled: "2024-Q2", status: "fresh"  as const },
  { name: "UN Population WPP 2024", pulled: "2024-Q2", status: "fresh"  as const },
  { name: "Wittgenstein Centre",    pulled: "2023-Q4", status: "aging"  as const },
  { name: "UNESCO UIS",             pulled: "2024-Q1", status: "fresh"  as const },
  { name: "Frey & Osborne",         pulled: "2024 recalib.", status: "aging" as const },
  { name: "O*NET 29.2",             pulled: "2024.1",  status: "fresh"  as const },
  { name: "ESCO v1.2.0",            pulled: "2023",    status: "aging"  as const },
  { name: "Unified SQLite DB",      pulled: "2025-04-20", status: "live" as const },
];

function DataFreshness() {
  const statusConfig = {
    live:  { label: "Live",  cls: "bg-green-100 text-green-700",  icon: <CheckCircle className="h-3 w-3" /> },
    fresh: { label: "Fresh", cls: "bg-blue-100 text-blue-700",    icon: <CheckCircle className="h-3 w-3" /> },
    aging: { label: "Aging", cls: "bg-yellow-100 text-yellow-700",icon: <AlertCircle className="h-3 w-3" /> },
  };

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-black text-ink">Data Freshness</h2>
      <p className="mt-2 text-sm text-ink/60">When each dataset was last ingested into the pipeline.</p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {FRESHNESS_ITEMS.map(item => {
          const s = statusConfig[item.status];
          return (
            <div key={item.name} className="flex items-center gap-3 rounded-lg border border-line bg-white p-3 shadow-sm">
              <span className={cn("flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", s.cls)}>
                {s.icon}
                {s.label}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">{item.name}</p>
                <p className="text-[10px] text-ink/50">{item.pulled}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Coverage Map section
// ─────────────────────────────────────────────────────────────────────────────

const COVERAGE_REGIONS = [
  { region: "East Asia & Pacific",       status: "full"    as CoverageStatus, note: "All major datasets present" },
  { region: "Europe & Central Asia",     status: "full"    as CoverageStatus, note: "ESCO + ISCO-08 well-covered" },
  { region: "Latin America & Caribbean", status: "partial" as CoverageStatus, note: "ILO + WDI strong; TVET gaps" },
  { region: "Middle East & N. Africa",   status: "partial" as CoverageStatus, note: "HCI partial; informal data sparse" },
  { region: "North America",             status: "limited" as CoverageStatus, note: "O*NET / SOC only; no ISCO equivalent" },
  { region: "South Asia",               status: "partial" as CoverageStatus, note: "UNESCO UIS gaps in TVET" },
  { region: "Sub-Saharan Africa",        status: "partial" as CoverageStatus, note: "ILO sparse; WDI strongest" },
];

function CoverageMap() {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-black text-ink">Coverage Map</h2>
      <p className="mt-2 text-sm text-ink/60">Data completeness across World Bank regions.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {COVERAGE_REGIONS.map(r => {
          const { label, cls } = COVERAGE_BADGE[r.status];
          return (
            <div key={r.region} className="rounded-lg border border-line bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-ink">{r.region}</p>
              <p className="mt-1 text-xs text-ink/60">{r.note}</p>
              <span className={cn("mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", cls)}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LMIC Methodology note
// ─────────────────────────────────────────────────────────────────────────────

function MethodologyNote() {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-black text-ink">LMIC Recalibration Methodology</h2>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <h3 className="text-base font-bold text-emerald-900">The Problem</h3>
          <p className="mt-2 text-sm text-emerald-800 leading-relaxed">
            Most automation research — including Frey &amp; Osborne's landmark 2013 study — uses US occupation data
            (O*NET / SOC codes). Their automation probabilities reflect how routine tasks are distributed in a
            high-income, technology-rich labour market. In a low- or middle-income country (LMIC), the same job
            title can involve very different tasks. A "clerk" in Nigeria may do far more manual filing than a
            clerk in Germany — making the US-derived probability misleading.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <h3 className="text-base font-bold text-emerald-900">Our Approach</h3>
          <p className="mt-2 text-sm text-emerald-800 leading-relaxed">
            We apply a three-step recalibration: <strong>(1)</strong> Map occupations from SOC → ISCO-08 using
            the BLS crosswalk (1,634 links). <strong>(2)</strong> Adjust the task composition using country-level
            proxies from World Bank WDI and Human Capital Index — countries with lower HCI scores shift
            occupations toward higher manual / routine task shares. <strong>(3)</strong> The adjusted task share
            produces a revised automation probability. The result: an ISCO-08 automation score that reflects
            what a job actually looks like in that country, not what it looks like in a US office.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 lg:col-span-2">
          <h3 className="text-base font-bold text-emerald-900">Limitations &amp; Transparency</h3>
          <p className="mt-2 text-sm text-emerald-800 leading-relaxed">
            Recalibration operates at country level, not employer or sub-national level. The multipliers are
            proxies — grounded in data, but not direct measurements. For occupations with sparse ISCO coverage
            (e.g. many informal sector roles), we flag uncertainty explicitly in the UI. We do not smooth over
            data gaps; we show them. Our goal is directional accuracy for decision-making, not false precision.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Why This Matters
// ─────────────────────────────────────────────────────────────────────────────

function WhyThisMatters() {
  return (
    <section className="mt-12 rounded-2xl border-2 border-cobalt/20 bg-cobalt/5 p-8">
      <h2 className="font-display text-2xl font-black text-cobalt">Why This Matters</h2>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink">
        Every number you see on this platform traces back to a real dataset. We don't use synthetic data or
        estimates without telling you.
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">
        When a young person in Lagos sees that their job has a 71% automation risk over 15 years, that number
        comes from ILO labour data, a BLS-to-ISCO crosswalk, Frey &amp; Osborne's task taxonomy, and a
        recalibration model trained on World Bank development indicators — not a black-box model. We believe
        that people deserve to understand the evidence behind decisions that affect their futures. Every data
        source is citable, every methodology is documented, and every limitation is disclosed.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <span className="rounded-full border border-cobalt/30 bg-white px-3 py-1.5 text-xs font-semibold text-cobalt">
          No synthetic data
        </span>
        <span className="rounded-full border border-cobalt/30 bg-white px-3 py-1.5 text-xs font-semibold text-cobalt">
          All sources cited
        </span>
        <span className="rounded-full border border-cobalt/30 bg-white px-3 py-1.5 text-xs font-semibold text-cobalt">
          Limitations disclosed
        </span>
        <span className="rounded-full border border-cobalt/30 bg-white px-3 py-1.5 text-xs font-semibold text-cobalt">
          Methodology open
        </span>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flow connector arrows (CSS-only horizontal arrows between layers)
// ─────────────────────────────────────────────────────────────────────────────

function FlowArrow() {
  return (
    <div className="hidden xl:flex shrink-0 flex-col items-center justify-center pt-10">
      <div className="relative flex items-center">
        <div className="h-0.5 w-6 bg-gray-300" />
        {/* Arrowhead */}
        <div className="h-0 w-0 border-y-4 border-l-6 border-y-transparent border-l-gray-300" style={{ borderLeftWidth: 6 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Legend
// ─────────────────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { color: "bg-blue-600",    label: "External Data Sources" },
    { color: "bg-emerald-600", label: "Crosswalk / Bridge" },
    { color: "bg-purple-600",  label: "Analytical Engines" },
    { color: "bg-orange-500",  label: "API Layer" },
    { color: "bg-teal-600",    label: "User Interfaces" },
  ];
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2">
          <div className={cn("h-3 w-3 rounded-sm", color)} />
          <span className="text-xs text-ink/60">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

function InfrastructurePage() {
  return (
    <PageShell
      eyebrow="Data Architecture"
      title="How unmapped works"
      lede="Every data source, every crosswalk, every analytical engine — fully transparent. Click any box to see source URLs, coverage, and known limitations."
    >
      {/* Architecture Diagram */}
      <section>
        <Legend />

        {/* Mobile: vertical stack. Desktop: horizontal columns with arrows */}
        <div className={`flex flex-col gap-4 $"xl:flex-row xl:gap-0 xl:items-start"`}>
          {LAYERS.map((layer, i) => (
            <React.Fragment key={layer.id}>
              <LayerColumn layer={layer} isLast={i === LAYERS.length - 1} />
              {i < LAYERS.length - 1 && (
                <FlowArrow />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Mobile data flow note */}
        <p className="mt-4 text-center text-xs text-ink/40 xl:hidden">
          Data flows left → right: Sources → Crosswalk → Engines → API → Interfaces
        </p>
      </section>

      <DataFreshness />
      <CoverageMap />
      <MethodologyNote />
      <WhyThisMatters />
    </PageShell>
  );
}
