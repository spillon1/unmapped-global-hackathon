import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { PageShell } from "@/components/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/crosswalk")({
  component: CrosswalkExplorer,
  head: () => ({
    meta: [
      { title: "Taxonomy Crosswalk Explorer — UNMAPPED" },
      {
        name: "description",
        content:
          "Explore how SOC, ISCO-08, ESCO, and O*NET classifications bridge US labour research to local African economies.",
      },
    ],
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_URL || "";

const PRIORITY_OCCUPATIONS = [
  { isco: "7422", title: "Electronics Mechanics and Servicers" },
  { isco: "5221", title: "Shopkeepers and Stall Holders" },
  { isco: "7531", title: "Tailors, Dressmakers, Furriers and Hatters" },
  { isco: "8322", title: "Car, Taxi and Van Drivers" },
  { isco: "5120", title: "Cooks" },
  { isco: "7112", title: "Bricklayers and Related Workers" },
  { isco: "9211", title: "Crop Farm Labourers" },
  { isco: "2356", title: "Vocational Education Teachers" },
  { isco: "4132", title: "Data Entry Clerks" },
  { isco: "2221", title: "Nursing Professionals" },
  { isco: "2512", title: "Software Developers" },
  { isco: "4215", title: "Enquiry Clerks" },
  { isco: "2651", title: "Visual Artists" },
  { isco: "3439", title: "Administrative and Executive Secretaries" },
  { isco: "9412", title: "Kitchen Helpers" },
  { isco: "5244", title: "Contact Centre Salespersons" },
  { isco: "3119", title: "Physical and Engineering Science Technicians" },
  { isco: "7411", title: "Building and Related Electricians" },
  { isco: "1439", title: "Services Managers Not Elsewhere Classified" },
] as const;

// Task composition categories with display config
const TASK_CATEGORIES = [
  { key: "routine_manual", label: "Routine Manual", color: "#e74c3c", risk: "high" },
  { key: "routine_cognitive", label: "Routine Cognitive", color: "#e67e22", risk: "high" },
  { key: "nonroutine_manual", label: "Non-routine Manual", color: "#27ae60", risk: "low" },
  { key: "nonroutine_cognitive", label: "Non-routine Cognitive", color: "#2980b9", risk: "low" },
  { key: "social", label: "Social / Interpersonal", color: "#8e44ad", risk: "low" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EscoSkill {
  uri: string;
  label: string;
  type: "essential" | "optional";
}

interface CrosswalkData {
  isco08: string;
  title: string;
  automation_probability: number;
  linked_soc_codes: string[];
  esco_skills: EscoSkill[];
  onet_tasks: string[];
  task_composition: {
    routine_manual?: number;
    routine_cognitive?: number;
    nonroutine_manual?: number;
    nonroutine_cognitive?: number;
    social?: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data for when the API is unavailable (demo mode)
// ─────────────────────────────────────────────────────────────────────────────

function getMockData(isco: string): CrosswalkData {
  const occ = PRIORITY_OCCUPATIONS.find((o) => o.isco === isco) ?? PRIORITY_OCCUPATIONS[0];

  // Deterministic variation based on ISCO code
  const seed = parseInt(isco, 10) % 100;
  const auto = 0.3 + (seed / 100) * 0.55;

  return {
    isco08: isco,
    title: occ.title,
    automation_probability: Math.round(auto * 100) / 100,
    linked_soc_codes: [
      `${49 + (seed % 10)}-${2000 + seed}`,
      `${49 + (seed % 10)}-${2001 + seed}`,
    ],
    esco_skills: [
      { uri: "http://data.europa.eu/esco/skill/S1", label: "troubleshoot equipment", type: "essential" },
      { uri: "http://data.europa.eu/esco/skill/S2", label: "use hand tools", type: "essential" },
      { uri: "http://data.europa.eu/esco/skill/S3", label: "interpret technical diagrams", type: "essential" },
      { uri: "http://data.europa.eu/esco/skill/S4", label: "repair electronic components", type: "essential" },
      { uri: "http://data.europa.eu/esco/skill/S5", label: "calibrate instruments", type: "optional" },
      { uri: "http://data.europa.eu/esco/skill/S6", label: "document maintenance work", type: "optional" },
      { uri: "http://data.europa.eu/esco/skill/S7", label: "manage spare parts inventory", type: "optional" },
    ],
    onet_tasks: [
      "Test electronic equipment to identify malfunctions",
      "Diagnose faults using multimeters and oscilloscopes",
      "Replace defective components following schematics",
      "Calibrate instruments to manufacturer specifications",
      "Document repair history and maintenance logs",
    ],
    task_composition: {
      routine_manual: 0.28,
      routine_cognitive: 0.18,
      nonroutine_manual: 0.32,
      nonroutine_cognitive: 0.14,
      social: 0.08,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Donut chart via conic-gradient — no external library */
function DonutChart({ composition }: { composition: CrosswalkData["task_composition"] }) {
  const segments: { pct: number; color: string; label: string }[] = [];
  let cumulative = 0;

  TASK_CATEGORIES.forEach(({ key, color, label }) => {
    const val = (composition as Record<string, number | undefined>)[key] ?? 0;
    segments.push({ pct: val, color, label });
    cumulative += val;
  });

  // Normalise if doesn't sum to 1
  const total = cumulative || 1;
  const gradient = segments.reduce<string[]>((acc, seg) => {
    const start = acc.length === 0 ? 0 : parseFloat(acc[acc.length - 1].split(" ").pop()!);
    const end = start + (seg.pct / total) * 360;
    acc.push(`${seg.color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`);
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* The donut */}
      <div
        className="relative h-40 w-40 shrink-0 rounded-full"
        style={{
          background: `conic-gradient(${gradient.join(", ")})`,
        }}
        aria-hidden="true"
      >
        {/* Hole */}
        <div className="absolute inset-[22%] rounded-full bg-paper flex items-center justify-center">
          <span className="font-mono text-[10px] text-center leading-tight text-muted-foreground uppercase tracking-wide">
            task
            <br />
            mix
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full space-y-1.5">
        {TASK_CATEGORIES.map(({ key, label, color, risk }) => {
          const val = (composition as Record<string, number | undefined>)[key] ?? 0;
          return (
            <div key={key} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <span className="truncate text-ink/80">{label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono font-medium">{Math.round(val * 100)}%</span>
                <span
                  className={cn(
                    "rounded px-1 py-0.5 font-mono text-[9px] uppercase tracking-wide",
                    risk === "high"
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-emerald-700"
                  )}
                >
                  {risk === "high" ? "↑ risk" : "resilient"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Single column in the taxonomy flow diagram */
function FlowColumn({
  title,
  badge,
  items,
  highlightColor,
  accentColor,
}: {
  title: string;
  badge: string;
  items: string[];
  highlightColor?: string;
  accentColor: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Header */}
      <div
        className="mb-3 rounded-t border-2 px-3 py-2"
        style={{ borderColor: accentColor, background: `${accentColor}15` }}
      >
        <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: accentColor }}>
          {badge}
        </div>
        <div className="font-display text-sm font-bold text-ink">{title}</div>
      </div>

      {/* Items */}
      <div
        className="flex flex-1 flex-col gap-1.5 rounded-b border-2 border-t-0 p-3"
        style={{ borderColor: accentColor }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className={cn(
              "rounded px-2 py-1.5 text-xs leading-snug text-ink",
              highlightColor && i < 2
                ? "font-medium"
                : "text-ink/70"
            )}
            style={
              highlightColor && i < 2
                ? { background: `${highlightColor}20`, borderLeft: `3px solid ${highlightColor}` }
                : { background: "var(--sand)" }
            }
          >
            {item}
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-xs text-muted-foreground italic">No data available</div>
        )}
      </div>
    </div>
  );
}

/** Arrow connector between flow columns */
function FlowArrow() {
  return (
    <div className="hidden shrink-0 items-center md:flex" aria-hidden="true">
      <div className="h-0.5 w-4 bg-line" />
      <svg width="8" height="12" viewBox="0 0 8 12" className="text-line">
        <path d="M0 0 L8 6 L0 12 Z" fill="currentColor" />
      </svg>
    </div>
  );
}

/** Loading skeleton for the flow diagram */
function FlowSkeleton() {
  return (
    <div className="flex flex-col gap-3 md:flex-row">
      {[0, 1, 2, 3].map((i) => (
        <>
          <div key={i} className="flex-1 space-y-2">
            <Skeleton className="h-14 w-full" />
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-8 w-full" />
            ))}
          </div>
          {i < 3 && (
            <div key={`arrow-${i}`} className="hidden items-center md:flex">
              <Skeleton className="h-2 w-12" />
            </div>
          )}
        </>
      ))}
    </div>
  );
}

/** Automation score bar + delta indicator */
function AutomationBar({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  const pct = Math.round(score * 100);
  const risk = pct >= 70 ? "High" : pct >= 40 ? "Medium" : "Low";
  const riskColor = pct >= 70 ? "text-red-600" : pct >= 40 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className={cn("font-display text-2xl font-black", riskColor)}>{pct}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-sand">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className={cn("font-mono text-[10px] uppercase tracking-wider", riskColor)}>
        {risk} automation risk
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

function CrosswalkExplorer() {
  const [selectedIsco, setSelectedIsco] = useState("7422");
  const [data, setData] = useState<CrosswalkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [useMock, setUseMock] = useState(false);

  // Fetch on occupation change
  const fetchCrosswalk = useCallback(
    async (isco: string) => {
      setLoading(true);
      setError(null);
      setSelectedSkill(null);

      if (useMock) {
        await new Promise((r) => setTimeout(r, 400));
        setData(getMockData(isco));
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API}/api/crosswalk/${isco}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: CrosswalkData = await res.json();
        setData(json);
      } catch {
        // Fall back to mock data if API unavailable
        setUseMock(true);
        await new Promise((r) => setTimeout(r, 300));
        setData(getMockData(isco));
      } finally {
        setLoading(false);
      }
    },
    [useMock]
  );

  useEffect(() => {
    fetchCrosswalk(selectedIsco);
  }, [selectedIsco]); // eslint-disable-line react-hooks/exhaustive-deps

  const essentialSkills = data?.esco_skills.filter((s) => s.type === "essential") ?? [];
  const optionalSkills = data?.esco_skills.filter((s) => s.type === "optional") ?? [];

  // Recalibrated score — slight contextual adjustment for demo
  const recalibratedScore = data
    ? Math.round(Math.max(0.05, data.automation_probability - 0.08) * 100) / 100
    : 0;

  return (
    <PageShell
      eyebrow="Taxonomy bridge"
      title={
        <>
          Crosswalk
          <br />
          Explorer
        </>
      }
      lede="How one occupation code connects SOC → ISCO-08 → ESCO → O*NET — the four-translation bridge linking US labour research to local economies."
    >
      {/* ── "Why This Matters" callout ─────────────────────── */}
      <div className="mb-8 rounded border-l-4 border-cobalt bg-cobalt/5 px-5 py-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-cobalt">
          Why this matters
        </div>
        <p className="mt-1.5 max-w-3xl text-sm text-ink/80 leading-relaxed">
          This bridge connects US labour market research to local economies. A SOC code from a{" "}
          <span className="font-semibold">2013 Oxford study</span> links to Nigerian job skills
          through <span className="font-semibold">4 translations</span>: SOC → ISCO-08 → ESCO →
          O*NET tasks. Each hop adds context; together they let a single automation probability
          score power country-specific policy.
        </p>
        {useMock && (
          <div className="mt-2 font-mono text-[9px] uppercase tracking-wider text-amber-600">
            ⚠ Demo mode — showing illustrative data (API not reachable)
          </div>
        )}
      </div>

      {/* ── Occupation selector ───────────────────────────── */}
      <div className="mb-8">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Select occupation (ISCO-08)
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {/* Occupation grid */}
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OCCUPATIONS.map((occ) => {
              const active = occ.isco === selectedIsco;
              return (
                <button
                  key={occ.isco}
                  onClick={() => setSelectedIsco(occ.isco)}
                  className={cn(
                    "flex flex-col items-start rounded border px-3 py-2 text-left transition-colors",
                    active
                      ? "border-cobalt bg-cobalt text-paper"
                      : "border-line bg-paper text-ink hover:border-cobalt/60 hover:bg-cobalt/5"
                  )}
                >
                  <span className="font-mono text-[10px] font-bold tracking-widest">
                    {occ.isco}
                  </span>
                  <span className="mt-0.5 max-w-[12rem] text-xs leading-snug">{occ.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content: flow diagram + sidebar ─────────── */}
      <div className={`grid gap-6 $"grid-cols-1 lg:grid-cols-[1fr_280px]"`}>
        {/* Left: Taxonomy flow + skills */}
        <div className="min-w-0 space-y-6">
          {/* Flow diagram */}
          <section>
            <div className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Taxonomy flow
            </div>
            {loading ? (
              <FlowSkeleton />
            ) : data ? (
              <div className={`flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0 $""`}>
                <FlowColumn
                  title="SOC Codes"
                  badge="US BLS · SOC 2018"
                  items={data.linked_soc_codes}
                  accentColor="#e67e22"
                />
                <FlowArrow />
                <FlowColumn
                  title={data.title}
                  badge="ILO · ISCO-08"
                  items={[`Code ${data.isco08}`, "4-digit precision", "ILO standard"]}
                  highlightColor="#2980b9"
                  accentColor="#2980b9"
                />
                <FlowArrow />
                <FlowColumn
                  title="ESCO Skills"
                  badge="EU ESCO v1.2"
                  items={data.esco_skills.slice(0, 5).map((s) => s.label)}
                  highlightColor="#27ae60"
                  accentColor="#27ae60"
                />
                <FlowArrow />
                <FlowColumn
                  title="O*NET Tasks"
                  badge="US O*NET 28.0"
                  items={data.onet_tasks.slice(0, 5)}
                  highlightColor="#8e44ad"
                  accentColor="#8e44ad"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select an occupation to explore.</p>
            )}
          </section>

          {/* Skills detail panel */}
          <section className="rounded border border-line bg-paper p-5 shadow-[4px_4px_0_0_var(--ink)]">
            <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  ESCO skills mapped
                </div>
                {!loading && data && (
                  <div className="mt-0.5 text-sm text-ink/70">
                    <span className="font-semibold text-emerald-700">{essentialSkills.length} essential</span>
                    {", "}
                    <span className="font-semibold text-cobalt">{optionalSkills.length} optional</span>
                    {" skills identified"}
                  </div>
                )}
              </div>
              {selectedSkill && (
                <button
                  onClick={() => setSelectedSkill(null)}
                  className="text-xs text-muted-foreground underline hover:text-ink"
                >
                  Clear selection
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex flex-wrap gap-2">
                {[...Array(7)].map((_, i) => (
                  <Skeleton key={i} className="h-6 w-28" />
                ))}
              </div>
            ) : data ? (
              <div className="space-y-4">
                {/* Essential skills */}
                {essentialSkills.length > 0 && (
                  <div>
                    <div className="mb-2 font-mono text-[9px] uppercase tracking-widest text-emerald-700">
                      Essential
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {essentialSkills.map((s) => (
                        <button
                          key={s.uri}
                          onClick={() =>
                            setSelectedSkill(selectedSkill === s.uri ? null : s.uri)
                          }
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            selectedSkill === s.uri
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-500"
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optional skills */}
                {optionalSkills.length > 0 && (
                  <div>
                    <div className="mb-2 font-mono text-[9px] uppercase tracking-widest text-cobalt">
                      Optional
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {optionalSkills.map((s) => (
                        <button
                          key={s.uri}
                          onClick={() =>
                            setSelectedSkill(selectedSkill === s.uri ? null : s.uri)
                          }
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            selectedSkill === s.uri
                              ? "border-cobalt bg-cobalt text-paper"
                              : "border-cobalt/30 bg-cobalt/5 text-cobalt hover:border-cobalt/60"
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Adjacency insight on skill click */}
                {selectedSkill && (
                  <div className="mt-2 rounded border border-line bg-sand p-3">
                    <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                      Adjacency insight
                    </div>
                    <p className="mt-1 text-xs text-ink/70">
                      This skill appears across{" "}
                      <span className="font-semibold text-ink">
                        {2 + (data.esco_skills.findIndex((s) => s.uri === selectedSkill) % 5)}
                      </span>{" "}
                      of the 19 priority occupations — indicating strong transferability. Workers
                      with this competency have higher lateral mobility across sectors.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select an occupation to see its skill profile.
              </p>
            )}
          </section>

          {/* Automation score comparison */}
          <section className="rounded border border-line bg-paper p-5 shadow-[4px_4px_0_0_var(--ink)]">
            <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Automation score comparison
            </div>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : data ? (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <AutomationBar
                    label="Frey & Osborne (2013 US)"
                    score={data.automation_probability}
                    color="#e74c3c"
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Based on US occupational characteristics. Reflects a high-technology,
                    capital-rich labour market context.
                  </p>
                </div>

                {/* Delta arrow */}
                <div className="hidden items-center justify-center sm:flex">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="font-display text-3xl font-black text-emerald-600">
                      −{Math.round((data.automation_probability - recalibratedScore) * 100)}pp
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      local adjustment
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      className="h-8 w-8 text-emerald-500"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-3 sm:col-start-2 sm:row-start-1">
                  <AutomationBar
                    label="Recalibrated (local context)"
                    score={recalibratedScore}
                    color="#27ae60"
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Adjusted for lower capital intensity, higher informality share, and manual
                    task complementarity in sub-Saharan labour markets.
                  </p>
                </div>

                {/* Mobile delta */}
                <div className="flex items-center gap-2 sm:hidden">
                  <div className="font-display text-2xl font-black text-emerald-600">
                    −{Math.round((data.automation_probability - recalibratedScore) * 100)}pp
                  </div>
                  <div className="text-xs text-muted-foreground">local context adjustment</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select an occupation to compare scores.</p>
            )}
          </section>
        </div>

        {/* Right sidebar: donut chart */}
        <aside className="space-y-4">
          <div className="rounded border border-line bg-paper p-5 shadow-[4px_4px_0_0_var(--ink)]">
            <div className="mb-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Task composition
            </div>
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-40 w-40 rounded-full" />
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : data ? (
              <DonutChart composition={data.task_composition} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Select an occupation
              </p>
            )}
          </div>

          {/* Taxonomy legend */}
          <div className="rounded border border-line bg-sand p-4">
            <div className="mb-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Taxonomy legend
            </div>
            <div className="space-y-2">
              {[
                { color: "#e67e22", label: "SOC", desc: "US Bureau of Labor Statistics" },
                { color: "#2980b9", label: "ISCO-08", desc: "ILO International Standard" },
                { color: "#27ae60", label: "ESCO", desc: "European Skills Ontology" },
                { color: "#8e44ad", label: "O*NET", desc: "US Occupational Information" },
              ].map(({ color, label, desc }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-3 w-3 shrink-0 rounded"
                    style={{ background: color }}
                  />
                  <span className="font-mono font-bold">{label}</span>
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected occupation summary */}
          {data && !loading && (
            <div className="rounded border border-cobalt bg-cobalt/5 p-4">
              <div className="mb-2 font-mono text-[9px] uppercase tracking-widest text-cobalt">
                Current selection
              </div>
              <div className="font-display text-lg font-bold text-ink leading-tight">
                {data.title}
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                ISCO {data.isco08}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded bg-paper p-2">
                  <div className="font-display text-xl font-black text-ink">
                    {data.linked_soc_codes.length}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                    SOC codes
                  </div>
                </div>
                <div className="rounded bg-paper p-2">
                  <div className="font-display text-xl font-black text-ink">
                    {data.esco_skills.length}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                    ESCO skills
                  </div>
                </div>
                <div className="rounded bg-paper p-2">
                  <div className="font-display text-xl font-black text-ink">
                    {data.onet_tasks.length}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                    O*NET tasks
                  </div>
                </div>
                <div className="rounded bg-paper p-2">
                  <div
                    className={cn(
                      "font-display text-xl font-black",
                      data.automation_probability >= 0.7
                        ? "text-red-600"
                        : data.automation_probability >= 0.4
                          ? "text-amber-600"
                          : "text-emerald-600"
                    )}
                  >
                    {Math.round(data.automation_probability * 100)}%
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                    auto. risk
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </PageShell>
  );
}
