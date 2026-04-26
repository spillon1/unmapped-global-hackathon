import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { PageShell } from "@/components/page-shell";
import { DataSource } from "@/components/data-source";
import { SOURCES } from "@/lib/sources";
import { useOnboarding } from "@/lib/profile-store";
import { fetchWithFallback } from "@/lib/api-client";
import { getQueryResponse, getRecalibratedData } from "@/lib/static-data";
import { useI18n } from "@/lib/i18n";
import { ProfileCard } from "@/components/profile-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Briefcase,
  GraduationCap,
  AlertCircle,
  Users,
  BarChart3,
} from "lucide-react";
import { JobDemandSection } from "@/components/job-demand-section";

// ────────────────────────────────────────────
// Route definition
// ────────────────────────────────────────────

export const Route = createFileRoute("/results")({
  component: ResultsDashboard,
  head: () => ({
    meta: [
      { title: "Your Results — UNMAPPED" },
      {
        name: "description",
        content:
          "Your personalised AI readiness score, task breakdown, and career transition pathways.",
      },
    ],
  }),
});

// ────────────────────────────────────────────
// Constants & types
// ────────────────────────────────────────────

interface TaskBreakdown {
  share: number;
  risk: number;
}

interface RecalibrationOccupation {
  isco08: string;
  original_frey_osborne: number;
  recalibrated_probability: number;
  risk_tier: "low" | "medium" | "high";
  task_risk_breakdown: Record<string, TaskBreakdown>;
  narrative: string;
}

interface RecalibrationResponse {
  occupations: RecalibrationOccupation[];
}

interface AdjacencyPathway {
  target_isco08: string;
  target_title: string;
  skill_overlap_pct: number;
  missing_skills_count: number;
  wage_uplift_pct: number;
  gap_description: string;
  training_cost_tier?: "low" | "medium" | "high";
}

interface DemandSignals {
  total_jobs: number;
  avg_salary_ngn: number;
  sector_growth?: { sector: string; growth_pct: number }[];
}

interface EconometricSignals {
  labour_force_participation_pct: number;
  labour_force_participation_trend: "up" | "down" | "stable";
  youth_unemployment_pct: number;
  youth_unemployment_trend?: "up" | "down" | "stable";
}

interface QueryResponse {
  occupation: { isco08: string; title: string };
  demand_signals: DemandSignals;
  adjacency_pathways: AdjacencyPathway[];
  ai_risk: {
    original: number;
    recalibrated: number;
    tier: "low" | "medium" | "high";
  };
  econometric_signals: EconometricSignals;
  data_limitations: string[];
}

// Country metadata for greetings & flags
const COUNTRY_META: Record<
  string,
  { flag: string; greeting: string; name: string }
> = {
  NGA: { flag: "🇳🇬", greeting: "Bawo ni! 👋", name: "Nigeria" },
  GHA: { flag: "🇬🇭", greeting: "Ɛte sɛn! 👋", name: "Ghana" },
  KEN: { flag: "🇰🇪", greeting: "Habari! 👋", name: "Kenya" },
  ZAF: { flag: "🇿🇦", greeting: "Sawubona! 👋", name: "South Africa" },
  BGD: { flag: "🇧🇩", greeting: "স্বাগতম! 👋", name: "Bangladesh" },
  IND: { flag: "🇮🇳", greeting: "Namaste! 👋", name: "India" },
  EGY: { flag: "🇪🇬", greeting: "!أهلاً 👋", name: "Egypt" },
  ETH: { flag: "🇪🇹", greeting: "ሰላም! 👋", name: "Ethiopia" },
  TZA: { flag: "🇹🇿", greeting: "Habari! 👋", name: "Tanzania" },
  RWA: { flag: "🇷🇼", greeting: "Muraho! 👋", name: "Rwanda" },
};

const TASK_CATEGORIES: Record<
  string,
  { label: string; icon: string; description: string }
> = {
  routine_manual: {
    label: "Repetitive physical tasks",
    icon: "🔧",
    description:
      "Physical tasks like assembly, sorting, or basic repairs that follow a fixed pattern — highly automatable with robotics.",
  },
  routine_cognitive: {
    label: "Repetitive thinking tasks",
    icon: "📋",
    description:
      "Structured information processing like data entry, bookkeeping, or form filling — vulnerable to AI/software.",
  },
  nonroutine_manual: {
    label: "Hands-on problem solving",
    icon: "🤲",
    description:
      "Dexterous, adaptive physical tasks like plumbing, cooking, or care work — harder for machines to replicate.",
  },
  nonroutine_cognitive: {
    label: "Creative & analytical work",
    icon: "🧠",
    description:
      "Complex problem-solving, creative thinking, and strategic planning — the most AI-resilient category.",
  },
  social: {
    label: "People & relationship work",
    icon: "🤝",
    description:
      "Negotiation, persuasion, teaching, and empathy — skills that require genuine human connection.",
  },
};

type SortKey = "overlap" | "wage" | "training";

// ────────────────────────────────────────────
// Gauge component (SVG semicircle)
// ────────────────────────────────────────────

function ReadinessGauge({
  percentage,
  tier,
}: {
  percentage: number;
  tier: "low" | "medium" | "high";
}) {
  const clampedPct = Math.max(0, Math.min(100, Math.round(percentage * 100)));
  const radius = 80;
  const circumference = Math.PI * radius;
  const targetOffset = circumference - (clampedPct / 100) * circumference;

  // Animate from full offset (empty) to target offset
  const [animatedOffset, setAnimatedOffset] = useState(circumference);
  useEffect(() => {
    // Small delay so the animation is visible after mount
    const timer = setTimeout(() => setAnimatedOffset(targetOffset), 100);
    return () => clearTimeout(timer);
  }, [targetOffset]);

  const offset = animatedOffset;
  const color =
    tier === "low"
      ? "text-emerald-500"
      : tier === "medium"
        ? "text-amber-500"
        : "text-red-500";
  const bgColor =
    tier === "low"
      ? "text-emerald-500/15"
      : tier === "medium"
        ? "text-amber-500/15"
        : "text-red-500/15";
  const tierLabel =
    tier === "low"
      ? "Low risk — your skills are resilient"
      : tier === "medium"
        ? "Moderate risk — some tasks are automatable"
        : "High risk — consider upskilling";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg
          width="200"
          height="120"
          viewBox="0 0 200 120"
          className="overflow-visible"
        >
          {/* Background arc */}
          <path
            d="M 10 110 A 80 80 0 0 1 190 110"
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            strokeLinecap="round"
            className={bgColor}
          />
          {/* Filled arc */}
          <path
            d="M 10 110 A 80 80 0 0 1 190 110"
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={offset}
            className={cn("transition-[stroke-dashoffset] duration-[1500ms] ease-[cubic-bezier(0.33,1,0.68,1)]", color)}
          />
          {/* Center text */}
          <text
            x="100"
            y="95"
            textAnchor="middle"
            className="fill-current text-ink font-display text-4xl font-black"
          >
            {clampedPct}%
          </text>
          <text
            x="100"
            y="115"
            textAnchor="middle"
            className="fill-current text-muted-foreground text-xs"
          >
            automation exposure
          </text>
        </svg>
      </div>
      <p className="text-center text-sm text-muted-foreground max-w-sm">
        Your automation exposure is{" "}
        <span className="font-semibold text-ink">{clampedPct}%</span> —{" "}
        {tierLabel}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────
// Task breakdown card
// ────────────────────────────────────────────

function TaskCard({
  category,
  share,
  risk,
}: {
  category: string;
  share: number;
  risk: number;
}) {
  const meta = TASK_CATEGORIES[category] ?? {
    label: category.replace(/_/g, " "),
    icon: "📊",
    description: "",
  };
  const sharePct = Math.round(share * 100);
  const riskPct = Math.round(risk * 100);
  const riskColor =
    risk < 0.3
      ? "bg-emerald-500"
      : risk < 0.6
        ? "bg-amber-500"
        : "bg-red-500";
  const riskBadge =
    risk < 0.3 ? "Low" : risk < 0.6 ? "Medium" : "High";
  const riskBadgeVariant =
    risk < 0.3 ? "secondary" : risk < 0.6 ? "outline" : "destructive";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{meta.icon}</span>
            <CardTitle className="text-sm font-semibold">
              {meta.label}
            </CardTitle>
          </div>
          <Badge variant={riskBadgeVariant as any} className="shrink-0 text-[10px]">
            {riskBadge} risk
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Share bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Task share</span>
            <span className="font-mono">{sharePct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", riskColor)}
              style={{ width: `${sharePct}%` }}
            />
          </div>
        </div>
        {/* Risk level */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Automation risk</span>
          <span className="font-mono">{riskPct}%</span>
        </div>
        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {meta.description}
        </p>
        <DataSource
          compact
          sources={[SOURCES.FREY_OSBORNE, SOURCES.ONET_2024]}
        />
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────
// Pathway card
// ────────────────────────────────────────────

function PathwayCard({ pathway }: { pathway: AdjacencyPathway }) {
  const overlapPct = Math.round(pathway.skill_overlap_pct);
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold leading-snug">
          {pathway.target_title}
        </CardTitle>
        <CardDescription className="text-[9px] text-muted-foreground/50" title={`ISCO-08 code: ${pathway.target_isco08}`}>
          ISCO {pathway.target_isco08}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Skill overlap</span>
            <p className="font-semibold text-sm text-emerald-600">
              {overlapPct}%
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Missing skills</span>
            <p className="font-semibold text-sm">{pathway.missing_skills_count}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Wage uplift</span>
            <p className="font-semibold text-sm text-blue-600">
              +{Math.round(pathway.wage_uplift_pct)}%
            </p>
          </div>
          {pathway.training_cost_tier && (
            <div>
              <span className="text-muted-foreground">Training cost</span>
              <p className="font-semibold text-sm capitalize">
                {pathway.training_cost_tier}
              </p>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {pathway.gap_description}
        </p>
        <DataSource compact {...SOURCES.ESCO_V12} />
      </CardContent>
      <CardFooter className="pt-0">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-cobalt hover:underline"
        >
          <GraduationCap className="h-3 w-3" />
          View training options
        </button>
      </CardFooter>
    </Card>
  );
}

// ────────────────────────────────────────────
// Loading skeleton
// ────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      {/* Hero skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-72" />
      </div>
      {/* Gauge skeleton */}
      <div className="flex justify-center">
        <Skeleton className="h-32 w-52 rounded-full" />
      </div>
      {/* Task cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
      {/* Pathway skeleton */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Error state
// ────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
      <CardContent className="flex items-start gap-3 py-6">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            Unable to load results
          </p>
          <p className="text-xs text-red-700 dark:text-red-400">{message}</p>
          <p className="text-xs text-muted-foreground mt-2">
            The API may be temporarily unavailable. Your onboarding data is
            saved — try refreshing in a few moments.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────
// Main dashboard
// ────────────────────────────────────────────

function ResultsDashboard() {
  const { t } = useI18n();

  const [onboarding] = useOnboarding();
  const [queryData, setQueryData] = useState<QueryResponse | null>(null);
  const [recalData, setRecalData] = useState<RecalibrationOccupation | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pathwaySort, setPathwaySort] = useState<SortKey>("overlap");

  const country = onboarding.country || "NGA";
  const isco08 = onboarding.isco08 || "7422";
  const occupationLabel = onboarding.isco08_label || "Your Occupation";
  const meta = COUNTRY_META[country] ?? {
    flag: "🌍",
    greeting: "Welcome! 👋",
    name: country,
  };

  // ── Fetch data ──
  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const [qData, rData] = await Promise.all([
          fetchWithFallback<QueryResponse>(
            `/api/query?isco08=${isco08}&country=${country}`,
            () => getQueryResponse(isco08, country) as unknown as QueryResponse,
          ),
          fetchWithFallback<RecalibrationResponse>(
            `/api/recalibrated/${country}/${isco08}`,
            () => getRecalibratedData(country, isco08) as unknown as RecalibrationResponse,
          ),
        ]);
        if (!cancelled) {
          setQueryData(qData);
          setRecalData(rData.occupations?.[0] ?? null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [isco08, country]);

  // ── Sorted pathways ──
  const sortedPathways = useMemo(() => {
    if (!queryData?.adjacency_pathways) return [];
    const p = [...queryData.adjacency_pathways];
    switch (pathwaySort) {
      case "wage":
        return p.sort((a, b) => b.wage_uplift_pct - a.wage_uplift_pct);
      case "training":
        return p.sort(
          (a, b) =>
            (a.missing_skills_count ?? 99) - (b.missing_skills_count ?? 99),
        );
      default:
        return p.sort((a, b) => b.skill_overlap_pct - a.skill_overlap_pct);
    }
  }, [queryData?.adjacency_pathways, pathwaySort]);

  // ── Render ──
  return (
    <PageShell
      eyebrow="Results"
      title={
        <>
          {meta.flag} {occupationLabel}
        </>
      }
      lede={
        <>
          {meta.greeting} Here&rsquo;s your personalised AI readiness
          assessment for <strong>{meta.name}</strong>.
        </>
      }
    >
      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-14">
          {/* ── Profile Card ── */}
          <section>
            <ProfileCard
              isco08={isco08}
              occupationTitle={occupationLabel}
              country={country}
              educationLevel={onboarding.education_level || "—"}
              experienceYears={onboarding.experience_years || "—"}
              informalSkills={onboarding.informal_skills || []}
              riskScore={
                recalData?.recalibrated_probability ??
                queryData?.ai_risk.recalibrated ??
                0
              }
              riskTier={
                recalData?.risk_tier ?? queryData?.ai_risk.tier ?? "medium"
              }
              topPathways={
                (queryData?.adjacency_pathways ?? []).slice(0, 3).map((p) => ({
                  title: p.target_title,
                  overlapPct: p.skill_overlap_pct,
                }))
              }
              taskComposition={
                recalData?.task_risk_breakdown
                  ? Object.fromEntries(
                      Object.entries(recalData.task_risk_breakdown).map(
                        ([k, v]) => [k, v.share],
                      ),
                    ) as any
                  : undefined
              }
            />
          </section>

          {/* ── Section 1: AI Readiness Gauge ── */}
          <section className="flex flex-col items-center gap-6">
            <h2 className="font-display text-2xl font-bold text-ink">
              {t('results.ai_gauge.title', 'AI Readiness')}
            </h2>
            <ReadinessGauge
              percentage={
                recalData?.recalibrated_probability ??
                queryData?.ai_risk.recalibrated ??
                0
              }
              tier={
                recalData?.risk_tier ?? queryData?.ai_risk.tier ?? "medium"
              }
            />
            <div className="flex flex-wrap justify-center gap-2">
              <DataSource {...SOURCES.FREY_OSBORNE} />
              <DataSource {...SOURCES.ONET_2024} />
            </div>
            {/* Narrative */}
            {recalData?.narrative && (
              <Card className="max-w-2xl w-full">
                <CardContent className="py-4">
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    &ldquo;{recalData.narrative}&rdquo;
                  </p>
                </CardContent>
              </Card>
            )}
            {/* Original vs Recalibrated comparison */}
            {recalData && (
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>
                  Original Frey & Osborne:{" "}
                  <span className="font-mono font-semibold text-ink">
                    {Math.round(recalData.original_frey_osborne * 100)}%
                  </span>
                </span>
                <span className="text-muted-foreground/40">→</span>
                <span>
                  Recalibrated:{" "}
                  <span className="font-mono font-semibold text-ink">
                    {Math.round(recalData.recalibrated_probability * 100)}%
                  </span>
                </span>
              </div>
            )}
          </section>

          {/* ── Section 2: Task Breakdown ── */}
          {recalData?.task_risk_breakdown && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-cobalt" />
                <h2 className="font-display text-xl font-bold text-ink">
                  {t('results.tasks.title', 'How Your Work Breaks Down')}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl">
                How your occupation&rsquo;s tasks split across categories, and
                the automation risk for each.
              </p>
              <div className={"grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
                {Object.entries(recalData.task_risk_breakdown).map(
                  ([key, val]) => (
                    <TaskCard
                      key={key}
                      category={key}
                      share={val.share}
                      risk={val.risk}
                    />
                  ),
                )}
              </div>
            </section>
          )}

          {/* ── Job Demand Signals ── */}
          <JobDemandSection
            country={country}
            countryName={meta.name}
            userIsco08={isco08}
          />

          {/* ── Section 3: Transition Pathways ── */}
          {sortedPathways.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cobalt" />
                <h2 className="font-display text-xl font-bold text-ink">
                  {t('results.pathways.title', 'Where You Could Go Next')}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Adjacent careers where your existing skills transfer — sorted by
                compatibility.
              </p>
              {/* Sort controls */}
              <div className="flex gap-2">
                {(
                  [
                    ["overlap", "Skill Overlap"],
                    ["wage", "Wage Uplift"],
                    ["training", "Training Cost"],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPathwaySort(key)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      pathwaySort === key
                        ? "border-cobalt bg-cobalt/10 text-cobalt"
                        : "border-border text-muted-foreground hover:border-cobalt/40",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className={"grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
                {sortedPathways.map((pw) => (
                  <PathwayCard
                    key={pw.target_isco08}
                    pathway={pw}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Section 4: What To Do Next ── */}
          <section className="mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-cobalt" />
              <h2 className="font-display text-xl font-bold text-ink">
                What To Do Next
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Practical next steps to act on your results — whether you want to
              upskill, find work, or share your profile.
            </p>
            <div className={"grid grid-cols-1 gap-4 sm:grid-cols-3"}>
              {/* Get Trained */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">🎓 Get Trained</CardTitle>
                  <CardDescription className="text-xs">
                    Find courses and apprenticeships to build new skills
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      <a
                        href="https://www.coursera.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-cobalt hover:underline"
                      >
                        • Coursera — free certificates
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://learndigital.withgoogle.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-cobalt hover:underline"
                      >
                        • Google Digital Skills
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://alison.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-cobalt hover:underline"
                      >
                        • Alison — free vocational training
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://www.afdb.org/en/topics-and-sectors/initiatives-partnerships/youth-entrepreneurship-and-innovation"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-cobalt hover:underline"
                      >
                        • AfDB Youth Skills Programme
                      </a>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Find Opportunities */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">💼 Find Opportunities</CardTitle>
                  <CardDescription className="text-xs">
                    Job platforms active in your region
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      <a
                        href="https://www.linkedin.com/jobs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-cobalt hover:underline"
                      >
                        • LinkedIn Jobs
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://africa.com/jobs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-cobalt hover:underline"
                      >
                        • Local job boards in your country
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://www.wfp.org/publications/jobs-21st-century"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-cobalt hover:underline"
                      >
                        • ILO Global Jobs Portal
                      </a>
                    </li>
                    <li className="text-xs text-muted-foreground/70 italic mt-2">
                      Check government employment portals in your country for
                      subsidised placements.
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Share Your Profile */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">📊 Share Your Profile</CardTitle>
                  <CardDescription className="text-xs">
                    Show employers and training providers what you can do
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Your skills passport is a portable record of your
                    experience, mapped to international standards — shareable
                    with anyone.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use the profile card above to export as PDF and attach it
                    to job applications or training enrolments.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* ── Section 5: Demand Signals ── */}
          {queryData?.demand_signals && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-cobalt" />
                <h2 className="font-display text-xl font-bold text-ink">
                  {t('results.demand.title', 'Demand for Your Skills')}
                </h2>
              </div>
              <div className={"grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
                {/* Total jobs */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">
                      Open positions
                    </CardDescription>
                    <CardTitle className="text-2xl font-black font-display">
                      {queryData.demand_signals.total_jobs.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">
                      Total job postings for this occupation in {meta.name}
                    </p>
                    <DataSource compact {...SOURCES.ILOSTAT_2024} />
                  </CardContent>
                </Card>
                {/* Avg salary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs">
                      Average salary
                    </CardDescription>
                    <CardTitle className="text-2xl font-black font-display">
                      ₦
                      {queryData.demand_signals.avg_salary_ngn?.toLocaleString() ??
                        "—"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">
                      Monthly average for this role
                    </p>
                    <DataSource compact {...SOURCES.NBS_LFS_2022} />
                  </CardContent>
                </Card>
                {/* Sector growth */}
                {queryData.demand_signals.sector_growth?.map((sg) => (
                  <Card key={sg.sector}>
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">
                        Sector growth
                      </CardDescription>
                      <CardTitle className="text-lg font-bold">
                        {sg.sector}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                        <ArrowUpRight className="h-4 w-4" />+{sg.growth_pct}%
                        annual growth
                      </div>
                      <div className="mt-2">
                        <DataSource compact {...SOURCES.WDI_2024} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* ── Section 6: Data Limitations ── */}
          {queryData?.data_limitations &&
            queryData.data_limitations.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
                <CardContent className="py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">
                    Data limitations
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {queryData.data_limitations.map((lim, i) => (
                      <li
                        key={i}
                        className="text-xs text-amber-800 dark:text-amber-300"
                      >
                        {lim}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

          {/* ── Section 7: Econometric Signals Footer ── */}
          {queryData?.econometric_signals && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-cobalt" />
                <h2 className="font-display text-xl font-bold text-ink">
                  {t('results.econometric.title', 'Econometric Signals')}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Labour force participation */}
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs uppercase tracking-wider">
                      Labour Force Participation
                    </CardDescription>
                    <CardTitle className="flex items-center gap-2 text-3xl font-black font-display">
                      {queryData.econometric_signals.labour_force_participation_pct}%
                      {queryData.econometric_signals
                        .labour_force_participation_trend === "up" ? (
                        <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                      ) : queryData.econometric_signals
                          .labour_force_participation_trend === "down" ? (
                        <ArrowDownRight className="h-5 w-5 text-red-500" />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          →
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">
                      Share of working-age population active in the labour
                      market in {meta.name}
                    </p>
                    <DataSource {...SOURCES.ILOSTAT_2024} />
                  </CardContent>
                </Card>
                {/* Youth unemployment */}
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs uppercase tracking-wider">
                      Youth Unemployment
                    </CardDescription>
                    <CardTitle className="flex items-center gap-2 text-3xl font-black font-display">
                      {queryData.econometric_signals.youth_unemployment_pct}%
                      {queryData.econometric_signals
                        .youth_unemployment_trend === "up" ? (
                        <ArrowUpRight className="h-5 w-5 text-red-500" />
                      ) : queryData.econometric_signals
                          .youth_unemployment_trend === "down" ? (
                        <ArrowDownRight className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          →
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">
                      Unemployment rate among 15–24 year olds in {meta.name}
                    </p>
                    <DataSource {...SOURCES.WDI_2024} />
                  </CardContent>
                </Card>
              </div>
            </section>
          )}
        </div>
      )}
    </PageShell>
  );
}
