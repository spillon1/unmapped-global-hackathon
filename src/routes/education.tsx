/**
 * /education — Standalone education projection page
 *
 * Shows Wittgenstein SSP2 education attainment projections for a selected country.
 * Includes WDI literacy and enrollment signals, country selector, and DataSource
 * citations for Wittgenstein Centre and UNESCO UIS.
 */

import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useState, useMemo } from "react";
import { PageShell } from "@/components/page-shell";
import { EducationLandscape } from "@/components/education-landscape";
import { DataSource } from "@/components/data-source";
import { COUNTRIES, type CountryKey, type CountryConfig } from "@/data/countries";
import { cn } from "@/lib/utils";
import { GraduationCap, TrendingUp, BookOpen, Users } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Route
// ─────────────────────────────────────────────────────────────

export const Route = createFileRoute("/education")({
  component: EducationPage,
  head: () => ({
    meta: [
      { title: "Education Landscape — UNMAPPED" },
      {
        name: "description",
        content:
          "Wittgenstein SSP2 education attainment projections. See how 2025–2035 education distribution shifts across skill levels.",
      },
    ],
  }),
});

// ─────────────────────────────────────────────────────────────
// Country selector
// ─────────────────────────────────────────────────────────────

interface CountrySelectorProps {
  selected: CountryKey;
  onChange: (key: CountryKey) => void;
}

function CountrySelector({ selected, onChange }: CountrySelectorProps) {
  const options = Object.values(COUNTRIES);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.key)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors border",
            selected === c.key
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground bg-transparent",
          )}
        >
          <span className="text-base leading-none">{c.flag}</span>
          <span>{c.country}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WDI context signals
// ─────────────────────────────────────────────────────────────

interface SignalCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  caveat?: string;
}

function SignalCard({ icon, label, value, caveat }: SignalCardProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 flex gap-3">
      <div className="shrink-0 mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground leading-none mb-1.5">
          {label}
        </div>
        <div className="font-display font-black text-2xl tracking-tight leading-none">
          {value}
        </div>
        {caveat && (
          <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
            {caveat}
          </div>
        )}
      </div>
    </div>
  );
}

function WdiSignals({ config }: { config: CountryConfig }) {
  const signals = [
    {
      icon: <BookOpen className="h-4 w-4" />,
      label: "Adult Literacy Rate",
      value:
        config.literacyRate != null ? `${config.literacyRate}%` : "—",
      caveat: "Adults 15+ · UNESCO UIS 2024",
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: "Youth Literacy Rate",
      value:
        config.youthLiteracyRate != null
          ? `${config.youthLiteracyRate}%`
          : "—",
      caveat: "Youth 15–24 · UNESCO UIS 2024",
    },
    {
      icon: <GraduationCap className="h-4 w-4" />,
      label: "Primary Enrollment",
      value:
        config.primaryEnrollmentRate != null
          ? `${config.primaryEnrollmentRate}%`
          : "—",
      caveat: "Gross enrollment ratio · WDI 2024",
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Secondary Enrollment",
      value:
        config.secondaryEnrollmentRate != null
          ? `${config.secondaryEnrollmentRate}%`
          : "—",
      caveat: "Gross enrollment ratio · WDI 2024",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {signals.map((s) => (
        <SignalCard key={s.label} {...s} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SSP scenario explainer
// ─────────────────────────────────────────────────────────────

function ScenarioNote() {
  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-4">
      <div className="font-mono text-[9px] uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1.5">
        About SSP2 — "Middle of the Road"
      </div>
      <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
        The SSP2 scenario assumes moderate fertility decline, continued but
        gradual education investment, and stable migration patterns. It
        represents the most commonly cited baseline for human capital planning.
        SSP1 (rapid progress) and SSP3 (stagnation) bracket the range of
        plausible futures.
      </p>
      <div className="flex gap-2 mt-3">
        <DataSource
          label="WIC SSP2 2023"
          dataset="Wittgenstein Centre Human Capital Data Explorer"
          vintage="2023"
          methodology="SSP2 scenario age-structured population projections by education level. Both sexes, age 15+."
          url="https://dataexplorer.wittgensteincentre.org"
        />
        <DataSource
          label="UNESCO UIS 2024"
          dataset="UNESCO Institute for Statistics — Education Data"
          vintage="2024"
          methodology="Nationally reported data on school enrollment, literacy, and attainment"
          url="https://uis.unesco.org"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Returns-to-education mini chart
// ─────────────────────────────────────────────────────────────

function ReturnsChart({ config }: { config: CountryConfig }) {
  const maxPremium = Math.max(...config.signals.returnsToEducation.map((r) => r.premiumPct));

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
        Wage Premium by Education Level
      </div>
      <div className="space-y-2">
        {config.signals.returnsToEducation.map((r) => (
          <div key={r.level}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{r.level}</span>
              <span className="font-mono font-bold">+{r.premiumPct}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${(r.premiumPct / maxPremium) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10px] text-muted-foreground">
        vs. primary-educated baseline · ILOSTAT / national survey
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

function EducationPage() {
  const [selectedKey, setSelectedKey] = useState<CountryKey>("ssa-nigeria");

  const config = useMemo(() => COUNTRIES[selectedKey], [selectedKey]);

  // Fallback if country somehow lacks projections
  const hasProjections =
    config.educationProjections &&
    Object.keys(config.educationProjections).length > 0;

  return (
    <PageShell
      eyebrow="Human Capital Projections"
      title="Education Landscape"
      lede={`Wittgenstein Centre SSP2 projections for education attainment distribution, 2025 vs 2035. Compare how skill supply shifts under the "middle of the road" scenario.`}
    >
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">

        {/* Country selector */}
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
            Select Country
          </div>
          <CountrySelector selected={selectedKey} onChange={setSelectedKey} />
        </div>

        {/* WDI context signals */}
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
            {config.flag} {config.country} — Education Context
          </div>
          <WdiSignals config={config} />
        </div>

        {/* Main chart */}
        {hasProjections ? (
          <div className="rounded-xl border border-border bg-background p-5 sm:p-8">
            <EducationLandscape
              country={selectedKey}
              countryName={config.country}
              projections={config.educationProjections}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
            <GraduationCap className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p>Education projection data not yet available for {config.country}.</p>
          </div>
        )}

        {/* Two-column: scenario note + returns chart */}
        <div className={`grid gap-4 $"grid-cols-1 sm:grid-cols-2"`}>
          <ScenarioNote />
          <ReturnsChart config={config} />
        </div>

        {/* Methodology footer */}
        <div className="border-t border-border pt-6 text-[11px] text-muted-foreground leading-relaxed space-y-1">
          <p>
            <strong>Education projections:</strong> Wittgenstein Centre Human
            Capital Data Explorer (WIC 2023), SSP2 scenario. Values represent
            share of adult population (15+) by highest education level attained.
            Both sexes combined.
          </p>
          <p>
            <strong>Literacy & enrollment:</strong> UNESCO Institute for
            Statistics (UIS) 2024 and World Bank World Development Indicators
            (WDI) 2024.
          </p>
          <p>
            <strong>Wage premiums:</strong> Derived from national labour force
            surveys via ILOSTAT. Relative to primary-educated baseline.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
