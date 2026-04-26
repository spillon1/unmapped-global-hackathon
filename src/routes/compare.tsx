/**
 * Country Comparison Mode — /compare
 *
 * Lets policymakers compare two countries side-by-side across:
 * - Key macroeconomic and human-capital metrics
 * - Education attainment projections (2025 vs 2035)
 * - Occupation-level automation risk
 * - Structural drivers of difference
 *
 * CSS-only charts. No external charting library.
 */

import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, ChevronDown, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { DataSource } from "@/components/data-source";
import { EducationLandscape } from "@/components/education-landscape";
import { getCountryTheme, getAllCountryThemes } from "@/lib/country-theme";
import { SOURCES } from "@/lib/sources";
import { cn } from "@/lib/utils";
import { fetchWithFallback } from "@/lib/api-client";
import { getCountryConfig, getRecalibratedData } from "@/lib/static-data";
import wdiNGA from "../../data/nga/wdi_labour.json";
import wdiKEN from "../../data/ken/wdi_labour.json";
import wdiIND from "../../data/ind/wdi_labour.json";
import wdiRWA from "../../data/rwa/wdi_labour.json";

// ─────────────────────────────────────────────────────────────
// Route
// ─────────────────────────────────────────────────────────────

export const Route = createFileRoute("/compare")({
  component: ComparePage,
  head: () => ({
    meta: [
      { title: "Country Comparison — UNMAPPED" },
      {
        name: "description",
        content:
          "Compare two countries side-by-side on GDP, education, automation risk, and more.",
      },
    ],
  }),
});

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_URL || "";

const ALL_COUNTRIES = getAllCountryThemes();

// ─────────────────────────────────────────────────────────────
// Country-config → flat metric shape used by the compare UI.
// The raw country_config_*.json files are nested (`automation.calibration_factor`,
// no `wdi` block), but this page reads `config.calibration_factor`,
// `config.hci`, and `config.wdi.*`. We bridge the two here so the UI
// stays simple and the data files stay canonical.
// ─────────────────────────────────────────────────────────────

type RawWdiLabour = {
  macro?: { gdp_per_capita_usd?: { value?: number } };
  labour_market?: {
    youth_unemployment_rate_pct?: { value?: number };
    labour_force_participation_pct?: { value?: number };
    female_labour_participation_pct?: { value?: number };
  };
  education?: { human_capital_index?: { value?: number } };
  digital?: { internet_penetration_pct?: { value?: number } };
};

const WDI_LABOUR_BY_ISO: Record<string, RawWdiLabour> = {
  NGA: wdiNGA as RawWdiLabour,
  KEN: wdiKEN as RawWdiLabour,
  IND: wdiIND as RawWdiLabour,
  RWA: wdiRWA as RawWdiLabour,
  // Ghana has no wdi_labour.json yet — supply the same shape inline so
  // the comparison UI is fully populated without a separate fetch.
  GHA: {
    macro: { gdp_per_capita_usd: { value: 2238 } },
    labour_market: {
      youth_unemployment_rate_pct: { value: 8.5 },
      labour_force_participation_pct: { value: 67.0 },
      female_labour_participation_pct: { value: 63.4 },
    },
    education: { human_capital_index: { value: 0.45 } },
    digital: { internet_penetration_pct: { value: 68.2 } },
  },
};

function enrichConfig(iso3: string, raw: unknown) {
  if (!raw || typeof raw !== "object") return raw;
  const cfg = raw as Record<string, unknown>;
  const wdiRaw = WDI_LABOUR_BY_ISO[iso3.toUpperCase()] ?? {};
  const educationProjections =
    (cfg.educationProjections as CountryConfig["educationProjections"] | undefined) ??
    (cfg.education_projections as CountryConfig["educationProjections"] | undefined);
  const wdi = {
    gdp_per_capita: wdiRaw.macro?.gdp_per_capita_usd?.value,
    youth_unemployment: wdiRaw.labour_market?.youth_unemployment_rate_pct?.value,
    labour_force_participation:
      wdiRaw.labour_market?.labour_force_participation_pct?.value
      ?? wdiRaw.labour_market?.female_labour_participation_pct?.value,
    literacy_rate:
      (cfg.literacy_rate_wdi as { value?: number } | undefined)?.value,
    internet_penetration: wdiRaw.digital?.internet_penetration_pct?.value,
  };
  return {
    ...cfg,
    calibration_factor:
      (cfg.automation as { calibration_factor?: number } | undefined)
        ?.calibration_factor,
    educationProjections,
    hci: wdiRaw.education?.human_capital_index?.value,
    wdi,
  };
}

// 5 selected ISCO-08 codes for the occupation comparison table
const SELECTED_ISOS = ["7422", "4110", "2330", "5321", "8343"] as const;

const ISCO_LABELS: Record<string, string> = {
  "7422": "Electronics mechanics",
  "4110": "General office clerks",
  "2330": "Secondary school teachers",
  "5321": "Healthcare assistants",
  "8343": "Bus & tram drivers",
};

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface WDIData {
  gdp_per_capita?: number;
  youth_unemployment?: number;
  labour_force_participation?: number;
  literacy_rate?: number;
  internet_penetration?: number;
  [key: string]: number | undefined;
}

interface CountryConfig {
  iso3: string;
  name: string;
  calibration_factor?: number;
  hci?: number;
  wdi?: WDIData;
  educationProjections?: {
    [year: string]: {
      no_education: number;
      primary: number;
      lower_secondary: number;
      upper_secondary: number;
      post_secondary: number;
    };
  };
}

interface RecalibratedRisk {
  isco08: string;
  label?: string;
  base_risk: number;
  recalibrated_risk: number;
  calibration_factor: number;
}

interface CountryData {
  config: CountryConfig | null;
  risks: Record<string, RecalibratedRisk>;
  loading: boolean;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────

function useCountryData(iso3: string): CountryData {
  const [config, setConfig] = React.useState<CountryConfig | null>(null);
  const [risks, setRisks] = React.useState<Record<string, RecalibratedRisk>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!iso3) return;
    setLoading(true);
    setError(null);

    const fetchConfig = fetchWithFallback(
      `/api/country/${iso3}`,
      () => getCountryConfig(iso3),
    )
      .then((cfg) => enrichConfig(iso3, cfg))
      .catch(() => null);

    const fetchRisks = Promise.all(
      SELECTED_ISOS.map((isco) =>
        fetchWithFallback(
          `/api/recalibrated/${iso3}/${isco}`,
          () => {
            const rd = getRecalibratedData(iso3, isco);
            const occ = rd.occupations?.[0];
            if (!occ) return null;
            const calibrationFactor =
              "calibration_factor" in rd
                ? (rd as { calibration_factor: number }).calibration_factor
                : 0;
            return {
              isco08: isco,
              base_risk: occ.original_frey_osborne,
              recalibrated_risk: occ.recalibrated_probability,
              calibration_factor: calibrationFactor,
            };
          },
        )
          .then((d) => ({ isco, data: d }))
          .catch(() => ({ isco, data: null })),
      ),
    );

    Promise.all([fetchConfig, fetchRisks])
      .then(([cfg, riskResults]) => {
        setConfig(cfg as unknown as CountryConfig | null);
        const riskMap: Record<string, RecalibratedRisk> = {};
        for (const { isco, data } of riskResults) {
          if (data) riskMap[isco] = data;
        }
        setRisks(riskMap);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [iso3]);

  return { config, risks, loading, error };
}

// ─────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────

function fmt(val: number | undefined | null, decimals = 1): string {
  if (val == null || isNaN(val)) return "—";
  return val.toFixed(decimals);
}

function fmtPct(val: number | undefined | null): string {
  if (val == null || isNaN(val)) return "—";
  return `${val.toFixed(1)}%`;
}

function fmtUSD(val: number | undefined | null): string {
  if (val == null || isNaN(val)) return "—";
  return `$${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/** Return a 0–1 fraction for the bar width, capped at 1 */
function barFraction(val: number | undefined | null, max: number): number {
  if (!val || !max || max === 0) return 0;
  return Math.min(val / max, 1);
}

// ─────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-muted/60",
        className,
      )}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Country Selector
// ─────────────────────────────────────────────────────────────

interface CountrySelectorProps {
  label: string;
  value: string;
  onChange: (iso3: string) => void;
  excludeIso?: string;
  themeColor: string;
}

function CountrySelector({
  label,
  value,
  onChange,
  excludeIso,
  themeColor,
}: CountrySelectorProps) {
  const theme = getCountryTheme(value);

  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border-2 border-border bg-background pl-10 pr-10 py-3 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors"
          style={{
            borderColor: `hsl(${themeColor})`,
            // `focusRingColor` is not a real CSS property; the focus ring is
            // handled by Tailwind's focus:ring utilities above.
          }}
        >
          {ALL_COUNTRIES.filter((c) => c.iso3 !== excludeIso).map((c) => (
            <option key={c.iso3} value={c.iso3}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
        {/* Flag overlay */}
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl">
          {theme.flag}
        </span>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Metric Row
// ─────────────────────────────────────────────────────────────

interface MetricRowProps {
  label: string;
  valA: number | undefined;
  valB: number | undefined;
  format: (v: number | undefined) => string;
  colorA: string;
  colorB: string;
  maxVal?: number;
  source: React.ReactNode;
  higherIsBetter?: boolean;
}

function MetricRow({
  label,
  valA,
  valB,
  format,
  colorA,
  colorB,
  maxVal,
  source,
  higherIsBetter = true,
}: MetricRowProps) {
  const max = maxVal ?? Math.max(valA ?? 0, valB ?? 0, 1);
  const fracA = barFraction(valA, max);
  const fracB = barFraction(valB, max);

  const diff = (valA ?? 0) - (valB ?? 0);
  const TrendIcon =
    diff === 0 ? Minus : higherIsBetter ? (diff > 0 ? TrendingUp : TrendingDown) : diff < 0 ? TrendingUp : TrendingDown;
  const trendColor =
    diff === 0
      ? "text-muted-foreground"
      : higherIsBetter
      ? diff > 0
        ? "text-emerald-600"
        : "text-red-500"
      : diff < 0
      ? "text-emerald-600"
      : "text-red-500";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center py-3 border-b border-border/50 last:border-0">
      {/* Country A side */}
      <div className="flex flex-col items-start gap-1">
        <span className="font-display font-black text-xl tracking-tight">
          {format(valA)}
        </span>
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(fracA * 100, valA ? 4 : 0)}%`,
            backgroundColor: `hsl(${colorA})`,
            opacity: 0.85,
          }}
        />
      </div>

      {/* Center: label + source */}
      <div className="flex flex-col items-center gap-1 px-2 min-w-[140px]">
        <div className="flex items-center gap-1.5">
          <TrendIcon className={cn("h-3.5 w-3.5", trendColor)} />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-center leading-tight">
            {label}
          </span>
        </div>
        <div className="mt-0.5">{source}</div>
      </div>

      {/* Country B side */}
      <div className="flex flex-col items-end gap-1">
        <span className="font-display font-black text-xl tracking-tight">
          {format(valB)}
        </span>
        <div
          className="h-2 rounded-full transition-all duration-500 ml-auto"
          style={{
            width: `${Math.max(fracB * 100, valB ? 4 : 0)}%`,
            backgroundColor: `hsl(${colorB})`,
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Risk Bar
// ─────────────────────────────────────────────────────────────

function RiskBar({
  risk,
  color,
  label,
}: {
  risk: number;
  color: string;
  label: string;
}) {
  const pct = Math.round(risk * 100);
  const riskLabel =
    risk >= 0.7 ? "High" : risk >= 0.4 ? "Medium" : "Low";
  const riskTextColor =
    risk >= 0.7
      ? "text-red-600"
      : risk >= 0.4
      ? "text-amber-600"
      : "text-emerald-600";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className={cn("font-mono font-bold text-sm", riskTextColor)}>
          {pct}% · {riskLabel}
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted/50 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            backgroundColor: `hsl(${color})`,
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Occupation Table
// ─────────────────────────────────────────────────────────────

interface OccupationTableProps {
  themeA: ReturnType<typeof getCountryTheme>;
  themeB: ReturnType<typeof getCountryTheme>;
  risksA: Record<string, RecalibratedRisk>;
  risksB: Record<string, RecalibratedRisk>;
  loadingA: boolean;
  loadingB: boolean;
}

function OccupationTable({
  themeA,
  themeB,
  risksA,
  risksB,
  loadingA,
  loadingB,
}: OccupationTableProps) {
  if (loadingA || loadingB) {
    return (
      <div className="space-y-3">
        {SELECTED_ISOS.map((iso) => (
          <Skeleton key={iso} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Occupation
            </th>
            <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-wider" style={{ color: `hsl(${themeA.colors.primary})` }}>
              {themeA.flag} {themeA.name}
            </th>
            <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-wider" style={{ color: `hsl(${themeB.colors.primary})` }}>
              {themeB.flag} {themeB.name}
            </th>
            <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Δ Risk
            </th>
          </tr>
        </thead>
        <tbody>
          {SELECTED_ISOS.map((isco, i) => {
            const rA = risksA[isco];
            const rB = risksB[isco];
            const pctA = rA ? Math.round(rA.recalibrated_risk * 100) : null;
            const pctB = rB ? Math.round(rB.recalibrated_risk * 100) : null;
            const delta =
              pctA != null && pctB != null ? pctA - pctB : null;

            return (
              <tr
                key={isco}
                className={cn(
                  "border-b border-border/50 transition-colors hover:bg-muted/20",
                  i % 2 === 0 ? "bg-background" : "bg-muted/10",
                )}
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{ISCO_LABELS[isco] ?? isco}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    ISCO-08 {isco}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {pctA != null ? (
                    <span
                      className="font-mono font-bold"
                      style={{ color: `hsl(${themeA.colors.primary})` }}
                    >
                      {pctA}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {pctB != null ? (
                    <span
                      className="font-mono font-bold"
                      style={{ color: `hsl(${themeB.colors.primary})` }}
                    >
                      {pctB}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {delta != null ? (
                    <span
                      className={cn(
                        "font-mono font-bold text-xs",
                        delta > 5
                          ? "text-red-600"
                          : delta < -5
                          ? "text-emerald-600"
                          : "text-muted-foreground",
                      )}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta}pp
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Drives Callout
// ─────────────────────────────────────────────────────────────

interface DriversCalloutProps {
  configA: CountryConfig | null;
  configB: CountryConfig | null;
  themeA: ReturnType<typeof getCountryTheme>;
  themeB: ReturnType<typeof getCountryTheme>;
}

function DriversCallout({
  configA,
  configB,
  themeA,
  themeB,
}: DriversCalloutProps) {
  const calA = configA?.calibration_factor;
  const calB = configB?.calibration_factor;

  const internetA = configA?.wdi?.internet_penetration;
  const internetB = configB?.wdi?.internet_penetration;

  const postSecA =
    configA?.educationProjections?.["2025"]?.post_secondary;
  const postSecB =
    configB?.educationProjections?.["2025"]?.post_secondary;

  const factors: Array<{
    icon: string;
    title: string;
    body: string;
  }> = [
    {
      icon: "🏗️",
      title: "Calibration Factor (Automation Exposure Adjustment)",
      body: `${themeA.flag} ${themeA.name} has a calibration factor of ${calA != null ? calA.toFixed(2) : "—"} versus ${themeB.flag} ${themeB.name}'s ${calB != null ? calB.toFixed(2) : "—"}. This reflects capital intensity, informal economy size, and adoption readiness — countries with lower factors are more insulated from near-term automation because occupational task composition shifts in practice.`,
    },
    {
      icon: "🌐",
      title: "Digital Readiness (Internet Penetration)",
      body: `Internet penetration stands at ${fmtPct(internetA)} in ${themeA.name} vs ${fmtPct(internetB)} in ${themeB.name}. Higher connectivity accelerates both digital disruption risk and access to new digital-economy opportunities. A ${Math.abs((internetA ?? 0) - (internetB ?? 0)).toFixed(1)}pp gap translates directly into uneven speed of AI-tool adoption across sectors.`,
    },
    {
      icon: "🎓",
      title: "Post-Secondary Education Attainment",
      body: `${themeA.name}'s 2025 SSP2 projection shows ${postSecA != null ? Math.round(postSecA * 100) : "—"}% of adults with post-secondary qualifications vs ${postSecB != null ? Math.round(postSecB * 100) : "—"}% in ${themeB.name}. Higher attainment correlates with faster skill adaptation and greater resilience to routine task displacement.`,
    },
    {
      icon: "🏪",
      title: "Informal Economy & Capital Investment",
      body: `In economies with large informal sectors (>50% of employment), automation penetrates more slowly because formal capital investment remains concentrated in a subset of industries. This creates a structural buffer — but also limits productivity gains from AI adoption in the short term.`,
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
          What Drives the Difference
        </h3>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {factors.map((f) => (
          <div
            key={f.title}
            className="flex gap-3 rounded-lg border border-border/50 bg-background p-4"
          >
            <span className="text-2xl shrink-0 mt-0.5">{f.icon}</span>
            <div>
              <div className="font-semibold text-sm leading-tight mb-1.5">
                {f.title}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <DataSource {...SOURCES.WDI_2024} />
        <DataSource {...SOURCES.HCI_2020} />
        <DataSource {...SOURCES.ITU_2024} />
        <DataSource {...SOURCES.WITTGENSTEIN_SSP2} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Country Header Card
// ─────────────────────────────────────────────────────────────

function CountryCard({
  theme,
  config,
  loading,
}: {
  theme: ReturnType<typeof getCountryTheme>;
  config: CountryConfig | null;
  loading: boolean;
}) {
  return (
    <div
      className="rounded-xl border-2 p-5 space-y-2"
      style={{ borderColor: `hsl(${theme.colors.primary})` }}
    >
      <div className="flex items-center gap-3">
        <span className="text-4xl">{theme.flag}</span>
        <div>
          <div className="font-display font-black text-2xl tracking-tight">
            {theme.name}
          </div>
          <div
            className="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: `hsl(${theme.colors.primary})` }}
          >
            {theme.greeting} · {theme.iso3}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="rounded-lg bg-muted/30 p-3">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
            GDP per capita
          </div>
          {loading ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <div className="font-display font-black text-lg">
              {fmtUSD(config?.wdi?.gdp_per_capita)}
            </div>
          )}
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
            Calibration
          </div>
          {loading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <div className="font-display font-black text-lg">
              {config?.calibration_factor != null
                ? config.calibration_factor.toFixed(2)
                : "—"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

function ComparePage() {
  const [isoA, setIsoA] = React.useState("NGA");
  const [isoB, setIsoB] = React.useState("GHA");
  const [focusedIso, setFocusedIso] = React.useState<string | null>(null);

  const themeA = getCountryTheme(isoA);
  const themeB = getCountryTheme(isoB);

  const dataA = useCountryData(isoA);
  const dataB = useCountryData(isoB);

  const handleSwap = () => {
    setIsoA(isoB);
    setIsoB(isoA);
  };

  // ── Metrics ──────────────────────────────────────────────
  const metricsLoading = dataA.loading || dataB.loading;
  const wdiA = dataA.config?.wdi ?? {};
  const wdiB = dataB.config?.wdi ?? {};

  // ── Education ────────────────────────────────────────────
  const edA = dataA.config?.educationProjections;
  const edB = dataB.config?.educationProjections;

  // ── Occupation risk for focus occupation 7422 ────────────
  const riskA7422 = dataA.risks["7422"];
  const riskB7422 = dataB.risks["7422"];

  return (
    <PageShell
      eyebrow="Policy Tools"
      title={
        <>
          Country Comparison{" "}
          <span className="text-muted-foreground font-normal">—</span>{" "}
          <span style={{ color: `hsl(${themeA.colors.primary})` }}>
            {themeA.name}
          </span>{" "}
          vs{" "}
          <span style={{ color: `hsl(${themeB.colors.primary})` }}>
            {themeB.name}
          </span>
        </>
      }
      lede="Compare two countries side-by-side on economic fundamentals, education trajectories, and automation exposure to inform policy and investment decisions."
    >
      <div className="space-y-10">

        {/* ── 1. Country Selector Bar ─────────────────────── */}
        <section aria-label="Country selectors">
          <div className="rounded-xl border border-border bg-muted/20 p-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
              <div className="flex-1">
                <CountrySelector
                  label="Country A"
                  value={isoA}
                  onChange={setIsoA}
                  excludeIso={isoB}
                  themeColor={themeA.colors.primary}
                />
              </div>

              {/* Swap button */}
              <button
                type="button"
                onClick={handleSwap}
                className="shrink-0 flex items-center justify-center gap-2 rounded-lg border-2 border-border bg-background px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted hover:border-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring self-end"
                aria-label="Swap countries"
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span className="hidden sm:inline">Swap</span>
              </button>

              <div className="flex-1">
                <CountrySelector
                  label="Country B"
                  value={isoB}
                  onChange={setIsoB}
                  excludeIso={isoA}
                  themeColor={themeB.colors.primary}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Country Header Cards ────────────────────────── */}
        <section>
          <div className={`grid gap-5 $"grid-cols-1 grid-cols-1 sm:grid-cols-2"`}>
            <CountryCard theme={themeA} config={dataA.config} loading={dataA.loading} />
            <CountryCard theme={themeB} config={dataB.config} loading={dataB.loading} />
          </div>
        </section>

        {/* ── 2. Key Metrics Comparison ───────────────────── */}
        <section aria-label="Key metrics comparison">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display font-black text-2xl tracking-tight">
                Key Metrics
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Side-by-side comparison across 7 indicators
              </p>
            </div>
            {metricsLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 mb-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{themeA.flag}</span>
              <span
                className="font-semibold text-sm"
                style={{ color: `hsl(${themeA.colors.primary})` }}
              >
                {themeA.name}
              </span>
            </div>
            <div className="min-w-[140px]" />
            <div className="flex items-center justify-end gap-2">
              <span
                className="font-semibold text-sm text-right"
                style={{ color: `hsl(${themeB.colors.primary})` }}
              >
                {themeB.name}
              </span>
              <span className="text-lg">{themeB.flag}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background px-5 py-2">
            {metricsLoading ? (
              <div className="space-y-5 py-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <MetricRow
                  label="GDP per Capita"
                  valA={wdiA.gdp_per_capita}
                  valB={wdiB.gdp_per_capita}
                  format={fmtUSD}
                  colorA={themeA.colors.primary}
                  colorB={themeB.colors.primary}
                  source={<DataSource compact {...SOURCES.WDI_2024} />}
                  higherIsBetter
                />
                <MetricRow
                  label="Youth Unemployment"
                  valA={wdiA.youth_unemployment}
                  valB={wdiB.youth_unemployment}
                  format={fmtPct}
                  colorA={themeA.colors.primary}
                  colorB={themeB.colors.primary}
                  source={<DataSource compact {...SOURCES.WDI_2024} />}
                  higherIsBetter={false}
                />
                <MetricRow
                  label="Labour Force Participation"
                  valA={wdiA.labour_force_participation}
                  valB={wdiB.labour_force_participation}
                  format={fmtPct}
                  colorA={themeA.colors.primary}
                  colorB={themeB.colors.primary}
                  source={<DataSource compact {...SOURCES.ILOSTAT_2024} />}
                  higherIsBetter
                />
                <MetricRow
                  label="Human Capital Index"
                  valA={dataA.config?.hci}
                  valB={dataB.config?.hci}
                  format={(v) => (v != null ? v.toFixed(3) : "—")}
                  colorA={themeA.colors.primary}
                  colorB={themeB.colors.primary}
                  maxVal={1}
                  source={<DataSource compact {...SOURCES.HCI_2020} />}
                  higherIsBetter
                />
                <MetricRow
                  label="Literacy Rate"
                  valA={wdiA.literacy_rate}
                  valB={wdiB.literacy_rate}
                  format={fmtPct}
                  colorA={themeA.colors.primary}
                  colorB={themeB.colors.primary}
                  source={<DataSource compact {...SOURCES.UNESCO_UIS_2024} />}
                  higherIsBetter
                />
                <MetricRow
                  label="Internet Penetration"
                  valA={wdiA.internet_penetration}
                  valB={wdiB.internet_penetration}
                  format={fmtPct}
                  colorA={themeA.colors.primary}
                  colorB={themeB.colors.primary}
                  source={<DataSource compact {...SOURCES.ITU_2024} />}
                  higherIsBetter
                />
                <MetricRow
                  label="Automation Calibration Factor"
                  valA={dataA.config?.calibration_factor}
                  valB={dataB.config?.calibration_factor}
                  format={(v) => (v != null ? v.toFixed(2) : "—")}
                  colorA={themeA.colors.primary}
                  colorB={themeB.colors.primary}
                  maxVal={1}
                  source={
                    <DataSource
                      compact
                      label="UNMAPPED Model"
                      dataset="UNMAPPED Automation Recalibration Model"
                      vintage="2025"
                      methodology="Frey-Osborne base risk × multi-factor calibration (capital intensity, informality, digital adoption)"
                    />
                  }
                  higherIsBetter={false}
                />
              </>
            )}
          </div>
        </section>

        {/* ── 3. Education Projection Comparison ─────────── */}
        <section aria-label="Education projections">
          <h2 className="font-display font-black text-2xl tracking-tight mb-1">
            Education Attainment Projections
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Wittgenstein Centre SSP2 scenario · Population 15+ · 2025 vs 2035
          </p>

          <div className={`grid gap-8 $"grid-cols-1 grid-cols-1 lg:grid-cols-2"`}>
            {/* Country A education */}
            <div className="rounded-xl border-2 border-border p-5" style={{ borderColor: `hsl(${themeA.colors.primary})20` }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{themeA.flag}</span>
                <h3 className="font-display font-black text-lg">{themeA.name}</h3>
              </div>
              {dataA.loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : edA ? (
                <EducationLandscape
                  country={isoA}
                  countryName={themeA.name}
                  projections={edA}
                  compact
                />
              ) : (
                <div className="flex items-center justify-center h-40 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                  Education data unavailable
                </div>
              )}
            </div>

            {/* Country B education */}
            <div className="rounded-xl border-2 border-border p-5" style={{ borderColor: `hsl(${themeB.colors.primary})20` }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{themeB.flag}</span>
                <h3 className="font-display font-black text-lg">{themeB.name}</h3>
              </div>
              {dataB.loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : edB ? (
                <EducationLandscape
                  country={isoB}
                  countryName={themeB.name}
                  projections={edB}
                  compact
                />
              ) : (
                <div className="flex items-center justify-center h-40 rounded-lg bg-muted/30 text-sm text-muted-foreground">
                  Education data unavailable
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <DataSource {...SOURCES.WITTGENSTEIN_SSP2} />
            <DataSource {...SOURCES.UNESCO_UIS_2024} />
          </div>
        </section>

        {/* ── 4. Occupation Risk Comparison ──────────────── */}
        <section aria-label="Occupation automation risk">
          <h2 className="font-display font-black text-2xl tracking-tight mb-1">
            Occupation Automation Risk
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Recalibrated risk by country · ISCO-08 classification
          </p>

          {/* Focus occupation: 7422 */}
          <div className="rounded-xl border border-border bg-muted/20 p-5 mb-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Focus Occupation
            </div>
            <div className="font-display font-black text-xl mb-4">
              {ISCO_LABELS["7422"]}{" "}
              <span className="text-muted-foreground font-normal text-base">— ISCO-08 7422</span>
            </div>

            {dataA.loading || dataB.loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {riskA7422 && (
                  <RiskBar
                    risk={riskA7422.recalibrated_risk}
                    color={themeA.colors.primary}
                    label={`${themeA.flag} ${themeA.name} (cal. factor: ${riskA7422.calibration_factor?.toFixed(2) ?? "—"})`}
                  />
                )}
                {riskB7422 && (
                  <RiskBar
                    risk={riskB7422.recalibrated_risk}
                    color={themeB.colors.primary}
                    label={`${themeB.flag} ${themeB.name} (cal. factor: ${riskB7422.calibration_factor?.toFixed(2) ?? "—"})`}
                  />
                )}
                {!riskA7422 && !riskB7422 && !dataA.loading && !dataB.loading && (
                  <p className="text-sm text-muted-foreground">
                    Occupation risk data loading from API…
                  </p>
                )}
              </div>
            )}

            {/* Explanation */}
            {riskA7422 && riskB7422 && (
              <div className="mt-5 rounded-lg bg-background border border-border/50 p-4 text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Why they differ: </strong>
                The recalibrated risk is the base Frey-Osborne score (
                {riskA7422.base_risk != null
                  ? `${Math.round(riskA7422.base_risk * 100)}%`
                  : "—"}
                ) multiplied by each country's calibration factor. {themeA.name}'s
                factor of{" "}
                <strong style={{ color: `hsl(${themeA.colors.primary})` }}>
                  {riskA7422.calibration_factor?.toFixed(2) ?? "—"}
                </strong>{" "}
                reflects its capital intensity, digital infrastructure, and
                informality levels; {themeB.name}'s factor of{" "}
                <strong style={{ color: `hsl(${themeB.colors.primary})` }}>
                  {riskB7422.calibration_factor?.toFixed(2) ?? "—"}
                </strong>{" "}
                reflects its own structural context.
              </div>
            )}
          </div>

          {/* Occupation table */}
          <h3 className="font-semibold text-base mb-3">
            Risk Across 5 Key Occupations
          </h3>
          <OccupationTable
            themeA={themeA}
            themeB={themeB}
            risksA={dataA.risks}
            risksB={dataB.risks}
            loadingA={dataA.loading}
            loadingB={dataB.loading}
          />

          <div className="flex flex-wrap gap-2 mt-4">
            <DataSource
              label="UNMAPPED Model"
              dataset="UNMAPPED Automation Recalibration Model"
              vintage="2025"
              methodology="Frey-Osborne base risk scores recalibrated per country using capital intensity, informality proxy (ILO), internet penetration (ITU), and HCI"
            />
            <DataSource {...SOURCES.FREY_OSBORNE} />
            <DataSource {...SOURCES.ILOSTAT_2024} />
          </div>
        </section>

        {/* ── 5. What Drives The Difference ──────────────── */}
        <section aria-label="Structural drivers of difference">
          <DriversCallout
            configA={dataA.config}
            configB={dataB.config}
            themeA={themeA}
            themeB={themeB}
          />
        </section>

      </div>
    </PageShell>
  );
}

export default ComparePage;
