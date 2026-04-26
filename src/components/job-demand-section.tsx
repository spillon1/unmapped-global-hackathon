/**
 * JobDemandSection — Displays live job demand signals from seed data.
 * Used on the Results page to show country-level labour market intelligence.
 */
import { useMemo } from "react";
import { getSeedJobs } from "@/lib/seed-jobs";
import { DataSource } from "@/components/data-source";
import { SOURCES } from "@/lib/sources";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────

interface JobDemandSectionProps {
  country: string;
  countryName: string;
  userIsco08?: string;
}

// ── Helpers ─────────────────────────────────────────────────

function trendIcon(trend: string): string {
  const t = trend.toLowerCase();
  if (t.includes("very high") || t.includes("high")) return "📈";
  if (t.includes("stable") || t.includes("moderate") || t.includes("medium")) return "➡️";
  if (t.includes("declining") || t.includes("low")) return "📉";
  return "➡️";
}

function trendColor(trend: string): string {
  const t = trend.toLowerCase();
  if (t.includes("very high") || t.includes("high")) return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30";
  if (t.includes("declining")) return "text-red-600 bg-red-50 dark:bg-red-950/30";
  return "text-amber-600 bg-amber-50 dark:bg-amber-950/30";
}

function trendBarColor(trend: string): string {
  const t = trend.toLowerCase();
  if (t.includes("very high") || t.includes("high")) return "bg-emerald-500";
  if (t.includes("declining")) return "bg-red-400";
  return "bg-amber-400";
}

function shortTrend(trend: string): string {
  const t = trend.toLowerCase();
  if (t.includes("very high")) return "Very High";
  if (t.includes("high")) return "High";
  if (t.includes("stable")) return "Stable";
  if (t.includes("moderate")) return "Moderate";
  if (t.includes("medium")) return "Medium";
  if (t.includes("declining")) return "Declining";
  return trend.split("—")[0].trim();
}

// ── Main Component ──────────────────────────────────────────

export function JobDemandSection({ country, countryName, userIsco08 }: JobDemandSectionProps) {
  const seedData = useMemo(() => getSeedJobs(country), [country]);

  if (!seedData) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-pulse">🔍</span>
          <h2 className="font-display text-xl font-bold text-ink">
            📊 Local Job Demand Signals
          </h2>
        </div>
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Job demand data coming soon for <strong>{countryName}</strong>
            </p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              We're expanding our job market coverage. Check back soon.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const meta = seedData._metadata;
  const summary = seedData.demand_summary;
  const sectors = summary.sectors_ranked_by_demand;
  // NGA uses occupation_level_demand, GHA uses occupation_demand
  const occupations: any[] =
    (seedData as any).occupation_level_demand ?? (seedData as any).occupation_demand ?? [];

  const maxVacancies = Math.max(...occupations.map((o: any) => o.estimated_vacancies || 0), 1);

  // Check if user's ISCO matches any occupation
  const userOccMatch = userIsco08
    ? occupations.find((o: any) => o.isco08 === userIsco08)
    : null;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5" style={{ animation: "pulse 2s ease-in-out infinite" }}>🔍</span>
        <div>
          <h2 className="font-display text-xl font-bold text-ink">
            📊 Local Job Demand Signals
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Scraped from LinkedIn, Jobberman, and Indeed — {countryName} labour market as of April 2025
          </p>
        </div>
      </div>

      {/* Summary banner */}
      <div className="rounded-lg border-2 border-cobalt/20 bg-cobalt/5 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">
            {summary.total_vacancies_scraped.toLocaleString()} active vacancies tracked
          </p>
          <p className="text-xs text-muted-foreground">
            Across {sectors.length} sectors · {summary.source}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-xs gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Last updated: {summary.data_vintage}
        </Badge>
      </div>

      {/* User match callout */}
      {userOccMatch && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="py-4 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Your occupation is in demand!
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                <strong>{userOccMatch.title || userOccMatch.label}</strong> has ~{userOccMatch.estimated_vacancies} estimated vacancies
                in {countryName} ({trendIcon(userOccMatch.demand_trend || "stable")} {shortTrend(userOccMatch.demand_trend || "stable")})
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Occupation cards grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Top Occupations by Demand
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {occupations.map((occ: any) => {
            const title = occ.title || occ.label;
            const vacancies = occ.estimated_vacancies || 0;
            const trend = occ.demand_trend || "Stable";
            const salaryMin = occ.salary_range_usd?.[0];
            const salaryMax = occ.salary_range_usd?.[1];
            const isUserMatch = userIsco08 && occ.isco08 === userIsco08;
            const barWidth = Math.max(5, (vacancies / maxVacancies) * 100);

            return (
              <Card
                key={occ.isco08}
                className={cn(
                  "overflow-hidden transition-all",
                  isUserMatch && "ring-2 ring-emerald-500 ring-offset-2"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold leading-snug">
                      {isUserMatch && <span className="mr-1">🎯</span>}
                      {title}
                    </CardTitle>
                    <Badge
                      className={cn(
                        "shrink-0 text-[10px] font-medium border-0",
                        trendColor(trend)
                      )}
                    >
                      {trendIcon(trend)} {shortTrend(trend)}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">
                    {occ.sector} · ISCO {occ.isco08}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Vacancy bar */}
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Est. vacancies</span>
                      <span className="font-mono font-semibold text-ink">~{vacancies.toLocaleString()}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          trendBarColor(trend)
                        )}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Salary */}
                  {salaryMin != null && salaryMax != null && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Salary range (USD/mo)</span>
                      <span className="font-mono font-semibold text-ink">
                        ${salaryMin}–${salaryMax}
                      </span>
                    </div>
                  )}

                  {/* Platforms / source */}
                  <p className="text-[10px] text-muted-foreground/50">
                    {occ.salary_source || occ.data_source || meta.sources?.slice(0, 2).join(", ")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Sector summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sector Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="pb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Sector</th>
                <th className="pb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">Vacancies</th>
                <th className="pb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">Share</th>
                <th className="pb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Growth</th>
                <th className="pb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right">Median Salary</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((s: any) => (
                <tr key={s.sector} className="border-b border-line/30">
                  <td className="py-2 font-medium">{s.sector}</td>
                  <td className="py-2 text-right font-mono">{s.vacancy_count.toLocaleString()}</td>
                  <td className="py-2 text-right font-mono">{s.vacancy_share_pct}%</td>
                  <td className="py-2">
                    <Badge className={cn("text-[10px] border-0", trendColor(s.growth_signal))}>
                      {trendIcon(s.growth_signal)} {s.growth_signal}
                    </Badge>
                  </td>
                  <td className="py-2 text-right font-mono">${s.median_salary_usd_monthly}/mo</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data source citation */}
      <div className="flex flex-wrap gap-2">
        <DataSource
          compact
          label="Job Boards 2025"
          dataset={`${meta.sources?.[0] || 'Multiple job platforms'}`}
          vintage="April 2025"
          caveat={meta.data_gaps?.join(". ") || "Formal sector only"}
        />
        <DataSource compact {...SOURCES.NBS_LFS_2022} />
      </div>

      {/* Data limitations */}
      {meta.data_gaps && meta.data_gaps.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">
              Data limitations
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              {meta.data_gaps.map((gap: string, i: number) => (
                <li key={i} className="text-xs text-amber-800 dark:text-amber-300">{gap}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
