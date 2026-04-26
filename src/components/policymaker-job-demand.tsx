/**
 * PolicymakerJobDemand — Labour market demand signals table for policymakers.
 * Sortable by vacancies, sector, salary. Shows formal sector coverage caveat.
 */
import { useMemo, useState } from "react";
import { getSeedJobs } from "@/lib/seed-jobs";
import { DataSource } from "@/components/data-source";
import { SOURCES } from "@/lib/sources";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowUpDown } from "lucide-react";

interface Props {
  iso3: string;
  countryName: string;
}

type SortKey = "vacancies" | "sector" | "salary" | "trend";

function trendIcon(trend: string): string {
  const t = trend.toLowerCase();
  if (t.includes("very high") || t.includes("high")) return "📈";
  if (t.includes("declining")) return "📉";
  return "➡️";
}

function trendColor(trend: string): string {
  const t = trend.toLowerCase();
  if (t.includes("very high") || t.includes("high")) return "text-emerald-600";
  if (t.includes("declining")) return "text-red-600";
  return "text-amber-600";
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

export function PolicymakerJobDemand({ iso3, countryName }: Props) {
  const seedData = useMemo(() => getSeedJobs(iso3), [iso3]);
  const [sortKey, setSortKey] = useState<SortKey>("vacancies");
  const [sortAsc, setSortAsc] = useState(false);

  if (!seedData) {
    return (
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold">Labour Market Demand Signals</h2>
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Job demand data coming soon for <strong>{countryName}</strong>
          </p>
        </div>
      </section>
    );
  }

  const occupations: any[] =
    (seedData as any).occupation_level_demand ?? (seedData as any).occupation_demand ?? [];
  const summary = seedData.demand_summary;
  const meta = seedData._metadata;
  const maxVacancies = Math.max(...occupations.map((o: any) => o.estimated_vacancies || 0), 1);

  const sorted = useMemo(() => {
    const arr = [...occupations];
    arr.sort((a: any, b: any) => {
      let cmp = 0;
      switch (sortKey) {
        case "vacancies":
          cmp = (a.estimated_vacancies || 0) - (b.estimated_vacancies || 0);
          break;
        case "sector":
          cmp = (a.sector || "").localeCompare(b.sector || "");
          break;
        case "salary":
          cmp = (a.median_salary_usd_monthly || 0) - (b.median_salary_usd_monthly || 0);
          break;
        case "trend":
          cmp = (a.demand_trend || "").localeCompare(b.demand_trend || "");
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [occupations, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const thClass = "pb-2 cursor-pointer hover:text-cobalt transition-colors select-none";
  const thInner = "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground";

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-xl font-bold">Labour Market Demand Signals</h2>
        <Badge variant="secondary" className="text-xs gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          {summary.data_vintage}
        </Badge>
      </div>

      {/* Callout */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 p-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-300">
          Data scraped from online job platforms. Covers formal sector listings only —
          informal economy demand is not captured. {summary.total_vacancies_scraped.toLocaleString()} total vacancies tracked
          across {summary.sectors_ranked_by_demand.length} sectors.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className={thClass} onClick={() => toggleSort("sector")}>
                <span className={thInner}>Occupation <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("sector")}>
                <span className={thInner}>Sector <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className={cn(thClass, "text-right")} onClick={() => toggleSort("vacancies")}>
                <span className={cn(thInner, "justify-end")}>Vacancies <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className={thClass} onClick={() => toggleSort("trend")}>
                <span className={thInner}>Trend <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className={cn(thClass, "text-right")} onClick={() => toggleSort("salary")}>
                <span className={cn(thInner, "justify-end")}>Salary (USD/mo) <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="pb-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Demand</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((occ: any) => {
              const title = occ.title || occ.label;
              const vacancies = occ.estimated_vacancies || 0;
              const trend = occ.demand_trend || "Stable";
              const salaryMin = occ.salary_range_usd?.[0];
              const salaryMax = occ.salary_range_usd?.[1];
              const barWidth = Math.max(5, (vacancies / maxVacancies) * 100);

              return (
                <tr key={occ.isco08} className="border-b border-line/30 hover:bg-sand/30">
                  <td className="py-2.5 font-medium">{title}</td>
                  <td className="py-2.5 text-muted-foreground">{occ.sector}</td>
                  <td className="py-2.5 text-right font-mono font-semibold">~{vacancies.toLocaleString()}</td>
                  <td className="py-2.5">
                    <span className={cn("text-xs font-medium", trendColor(trend))}>
                      {trendIcon(trend)} {shortTrend(trend)}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono text-muted-foreground">
                    {salaryMin != null ? `$${salaryMin}–$${salaryMax}` : "—"}
                  </td>
                  <td className="py-2.5 w-24">
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cobalt/60 transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Source citation */}
      <div className="flex flex-wrap gap-2">
        <DataSource
          compact
          label="Job Boards 2025"
          dataset={meta.sources?.[0] || "Multiple job platforms"}
          vintage="April 2025"
          caveat={meta.data_gaps?.join(". ") || "Formal sector only"}
        />
        <DataSource compact {...SOURCES.ILOSTAT_2024} />
      </div>
    </section>
  );
}
