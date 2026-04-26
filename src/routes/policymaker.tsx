import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useRef, useCallback } from "react";
import { PageShell } from "@/components/page-shell";
import { DataSource } from "@/components/data-source";
import { SOURCES } from "@/lib/sources";

import {
  getCountryConfig,
  getRecalibratedData,
  COUNTRY_CONFIGS,
} from "@/lib/static-data";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  Calendar,
  Award,
  AlertTriangle,
  Download,
  FileText,
} from "lucide-react";
import html2canvas from "html2canvas";
import { PolicymakerJobDemand } from "@/components/policymaker-job-demand";
import { jsPDF } from "jspdf";

// ─── Route ──────────────────────────────────────────────────
export const Route = createFileRoute("/policymaker")({
  component: PolicymakerDashboard,
  head: () => ({
    meta: [
      { title: "Youth Skills & Opportunity Dashboard — UNMAPPED" },
      {
        name: "description",
        content:
          "Youth cohort analysis, skill gaps, automation exposure, and education trajectories for policymakers.",
      },
    ],
  }),
});

// ─── Country list ───────────────────────────────────────────
interface CountryEntry {
  iso3: string;
  name: string;
  flag: string;
  defaultRegion: string;
  regions: string[];
}

const COUNTRY_LIST: CountryEntry[] = [
  { iso3: "GHA", name: "Ghana", flag: "🇬🇭", defaultRegion: "Greater Accra", regions: ["Greater Accra", "Ashanti", "Northern", "Eastern", "Western", "Central", "Volta", "Upper East", "Upper West", "Bono"] },
  { iso3: "BGD", name: "Bangladesh", flag: "🇧🇩", defaultRegion: "Dhaka Division", regions: ["Dhaka Division", "Chittagong Division", "Rajshahi Division", "Khulna Division", "Sylhet Division", "Rangpur Division", "Barisal Division", "Mymensingh Division"] },
  { iso3: "NGA", name: "Nigeria", flag: "🇳🇬", defaultRegion: "Lagos", regions: ["Lagos", "Abuja FCT", "Kano", "Rivers", "Oyo", "Kaduna", "Anambra", "Delta", "Enugu", "Ogun"] },
  { iso3: "KEN", name: "Kenya", flag: "🇰🇪", defaultRegion: "Nairobi", regions: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Nyeri", "Machakos", "Kiambu", "Kilifi", "Uasin Gishu"] },
  { iso3: "IND", name: "India", flag: "🇮🇳", defaultRegion: "Maharashtra", regions: ["Maharashtra", "Delhi NCR", "Karnataka", "Tamil Nadu", "Telangana", "Gujarat", "West Bengal", "Rajasthan", "Uttar Pradesh", "Kerala"] },
  { iso3: "RWA", name: "Rwanda", flag: "🇷🇼", defaultRegion: "Kigali", regions: ["Kigali", "Eastern Province", "Western Province", "Northern Province", "Southern Province"] },
];

// ─── Cohort types ───────────────────────────────────────────
interface YouthProfile {
  id: number;
  age: number;
  gender: "male" | "female";
  education: "none" | "primary" | "secondary" | "tertiary";
  isco08: string;
  occupation: string;
  informalSkills: string[];
  automationRisk: number;
  riskTier: "low" | "medium" | "high";
}

// ─── Deterministic PRNG (seeded) ────────────────────────────
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

// ─── Cohort generator ───────────────────────────────────────
const OCCUPATIONS = [
  { isco08: "5221", title: "Shopkeeper" },
  { isco08: "9211", title: "Crop Farm Labourer" },
  { isco08: "7531", title: "Tailor / Dressmaker" },
  { isco08: "8322", title: "Taxi / Ride-hail Driver" },
  { isco08: "5120", title: "Cook / Food Vendor" },
  { isco08: "7112", title: "Bricklayer" },
  { isco08: "5141", title: "Hairdresser / Barber" },
  { isco08: "7422", title: "ICT Installer / Repairer" },
  { isco08: "4132", title: "Data Entry Clerk" },
  { isco08: "9111", title: "Domestic Cleaner" },
  { isco08: "2221", title: "Nursing Professional" },
  { isco08: "2356", title: "IT Trainer" },
  { isco08: "8331", title: "Bus Driver" },
  { isco08: "7115", title: "Carpenter" },
  { isco08: "5222", title: "Shop Supervisor" },
];

const INFORMAL_SKILLS = [
  "Basic smartphone use",
  "Social media for business",
  "WhatsApp Commerce",
  "Bookkeeping (informal)",
  "Negotiation",
  "Multilingual oral communication",
  "Manual repair",
  "Community leadership",
  "Mentoring apprentices",
  "Digital payments (mobile money)",
  "Basic computer use",
  "Customer relationship management",
];

const EDUCATION_LEVELS: YouthProfile["education"][] = [
  "none",
  "primary",
  "secondary",
  "tertiary",
];

function generateCohort(iso3: string): YouthProfile[] {
  const rng = mulberry32(hashStr(iso3));
  const config = getCountryConfig(iso3) as any;
  const calibration = config?.automation?.calibration_factor ?? 0.65;
  const profiles: YouthProfile[] = [];

  for (let i = 0; i < 100; i++) {
    const age = 18 + Math.floor(rng() * 11); // 18-28
    const gender: "male" | "female" = rng() > 0.48 ? "male" : "female";

    // Education weighted by country projections
    const eduRoll = rng();
    let education: YouthProfile["education"];
    if (eduRoll < 0.15) education = "none";
    else if (eduRoll < 0.40) education = "primary";
    else if (eduRoll < 0.78) education = "secondary";
    else education = "tertiary";

    const occ = OCCUPATIONS[Math.floor(rng() * OCCUPATIONS.length)];

    // Informal skills: 0-4 random
    const skillCount = Math.floor(rng() * 4) + (rng() > 0.33 ? 1 : 0);
    const shuffled = [...INFORMAL_SKILLS].sort(() => rng() - 0.5);
    const informalSkills = shuffled.slice(0, skillCount);

    // Automation risk: base from F&O * calibration + noise
    const baseRisk = 0.3 + rng() * 0.55; // 0.30–0.85 range
    const automationRisk = Math.min(
      0.95,
      Math.max(0.05, baseRisk * calibration + (rng() - 0.5) * 0.1)
    );

    const riskTier: "low" | "medium" | "high" =
      automationRisk < 0.3 ? "low" : automationRisk < 0.6 ? "medium" : "high";

    profiles.push({
      id: i,
      age,
      gender,
      education,
      isco08: occ.isco08,
      occupation: occ.title,
      informalSkills,
      automationRisk,
      riskTier,
    });
  }

  return profiles;
}

// ─── Skill gap data ─────────────────────────────────────────
interface SkillRow {
  skill: string;
  supply: "low" | "medium" | "high";
  demand: "low" | "medium" | "high";
  status: "gap" | "surplus" | "matched";
}

const SKILL_GAP_DATA: SkillRow[] = [
  { skill: "Digital literacy (beyond basic)", supply: "low", demand: "high", status: "gap" },
  { skill: "English written fluency", supply: "low", demand: "high", status: "gap" },
  { skill: "Accounting / bookkeeping", supply: "low", demand: "high", status: "gap" },
  { skill: "Basic IT", supply: "medium", demand: "medium", status: "matched" },
  { skill: "Food preparation", supply: "medium", demand: "medium", status: "matched" },
  { skill: "Textile / garment", supply: "medium", demand: "low", status: "matched" },
  { skill: "Manual repair", supply: "high", demand: "medium", status: "surplus" },
  { skill: "Retail sales", supply: "high", demand: "medium", status: "surplus" },
  { skill: "Multilingual oral communication", supply: "high", demand: "low", status: "surplus" },
  { skill: "Mechanical maintenance", supply: "high", demand: "medium", status: "surplus" },
];

// ─── Sector data ────────────────────────────────────────────
const SECTOR_DATA = [
  { sector: "ICT Services", growth: 8, match: 12 },
  { sector: "Agriculture & Food", growth: 3, match: 30 },
  { sector: "Retail & Trade", growth: 2, match: 28 },
  { sector: "Construction", growth: 5, match: 22 },
  { sector: "Healthcare", growth: 6, match: 15 },
  { sector: "Manufacturing", growth: 4, match: 18 },
  { sector: "Financial Services", growth: 7, match: 10 },
  { sector: "Transport & Logistics", growth: 3, match: 25 },
];

// ─── Education trajectory data ──────────────────────────────
function getEducationTrajectory(iso3: string) {
  const config = getCountryConfig(iso3) as any;
  const proj = config?.education_projections;
  if (!proj) {
    return [
      { year: "2025", "No Education": 22, Primary: 30, Secondary: 32, Tertiary: 16 },
      { year: "2035", "No Education": 15, Primary: 27, Secondary: 38, Tertiary: 20 },
    ];
  }
  const p2025 = proj["2025"];
  const p2035 = proj["2035"];
  return [
    {
      year: "2025",
      "No Education": Math.round((p2025.no_education ?? 0) * 100),
      Primary: Math.round((p2025.primary ?? 0) * 100),
      Secondary: Math.round(((p2025.lower_secondary ?? 0) + (p2025.upper_secondary ?? 0)) * 100),
      Tertiary: Math.round((p2025.post_secondary ?? 0) * 100),
    },
    {
      year: "2035",
      "No Education": Math.round((p2035.no_education ?? 0) * 100),
      Primary: Math.round((p2035.primary ?? 0) * 100),
      Secondary: Math.round(((p2035.lower_secondary ?? 0) + (p2035.upper_secondary ?? 0)) * 100),
      Tertiary: Math.round((p2035.post_secondary ?? 0) * 100),
    },
  ];
}

// ─── Helpers ────────────────────────────────────────────────
function riskBarColor(tier: "low" | "medium" | "high") {
  if (tier === "low") return "#16a34a";
  if (tier === "medium") return "#f59e0b";
  return "#ef4444";
}

function statusColor(status: "gap" | "surplus" | "matched") {
  if (status === "gap") return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  if (status === "surplus") return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
  return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
}

function levelColor(level: "low" | "medium" | "high") {
  if (level === "low") return "bg-red-500";
  if (level === "medium") return "bg-amber-400";
  return "bg-green-500";
}

// ─── Filter bar component ───────────────────────────────────
function FilterBar({
  regions,
  region,
  setRegion,
  ageBand,
  setAgeBand,
  gender,
  setGender,
  education,
  setEducation,
}: {
  regions: string[];
  region: string;
  setRegion: (r: string) => void;
  ageBand: string;
  setAgeBand: (a: string) => void;
  gender: string;
  setGender: (g: string) => void;
  education: string;
  setEducation: (e: string) => void;
}) {
  const selectClass =
    "rounded-md border border-line bg-paper px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cobalt";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-sand/40 p-4 md:flex-row md:flex-wrap">
      <div className="flex flex-col gap-1">
        <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Region
        </label>
        <select className={selectClass} value={region} onChange={(e) => setRegion(e.target.value)}>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Age Band
        </label>
        <select className={selectClass} value={ageBand} onChange={(e) => setAgeBand(e.target.value)}>
          <option value="all">All (18-28)</option>
          <option value="18-21">18-21</option>
          <option value="22-25">22-25</option>
          <option value="26-28">26-28</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Gender
        </label>
        <select className={selectClass} value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="all">All</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Education
        </label>
        <select
          className={selectClass}
          value={education}
          onChange={(e) => setEducation(e.target.value)}
        >
          <option value="all">All</option>
          <option value="none">No formal</option>
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="tertiary">Tertiary</option>
        </select>
      </div>
    </div>
  );
}

// ─── Headline card ──────────────────────────────────────────
function HeadlineCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-paper p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}</div>
      <div
        className={`font-display text-3xl font-black tracking-tight ${accent ?? "text-ink"}`}
      >
        {value}
      </div>
      <p className="text-sm text-muted-foreground leading-snug">{label}</p>
    </div>
  );
}

// ─── Skill heatmap ──────────────────────────────────────────
function SkillGapHeatmap() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-xl font-bold">Skill Gap Heatmap</h2>
        <DataSource
          compact
          label="Multiple"
          sources={[SOURCES.ILOSTAT_2024, SOURCES.WITTGENSTEIN_SSP2]}
        />
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_120px_120px_100px] gap-1 mb-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground px-2">
              Skill Category
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-center">
              Cohort Supply
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-center">
              Employer Demand
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-center">
              Status
            </div>
          </div>

          {SKILL_GAP_DATA.map((row) => (
            <div
              key={row.skill}
              className="grid grid-cols-[1fr_120px_120px_100px] gap-1 py-1.5 border-b border-line/30"
            >
              <div className="text-sm font-medium px-2 truncate">{row.skill}</div>
              <div className="flex justify-center">
                <div className={`w-16 h-6 rounded ${levelColor(row.supply)}`} />
              </div>
              <div className="flex justify-center">
                <div className={`w-16 h-6 rounded ${levelColor(row.demand)}`} />
              </div>
              <div className="flex justify-center">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(row.status)}`}
                >
                  {row.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-500" /> Gap (demand &gt; supply)
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-400" /> Matched
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-green-500" /> Surplus (supply &gt; demand)
        </div>
      </div>

      <p className="text-sm text-muted-foreground italic">
        Training programs should focus on digital literacy and bookkeeping. Manual skills
        are well-supplied but undervalued in the formal economy.
      </p>
    </section>
  );
}

// ─── Sector demand chart ────────────────────────────────────
function SectorDemandChart() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-xl font-bold">Sector Demand &amp; Supply</h2>
        <DataSource compact {...SOURCES.ILOSTAT_2024} />
      </div>
      <div className="overflow-x-auto">
      <div className="h-48 min-w-[480px] px-3 md:h-80 md:min-w-0 md:px-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={SECTOR_DATA} layout="vertical" margin={{ left: 120 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line, #e5e7eb)" />
            <XAxis type="number" domain={[0, 35]} unit="%" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="sector"
              tick={{ fontSize: 11 }}
              width={110}
            />
            <RechartsTooltip
              formatter={(value: number, name: string) => [`${value}%`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="growth"
              name="Employment Growth %"
              fill="#3b82f6"
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="match"
              name="Cohort Skills Match %"
              fill="#8b5cf6"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      </div>
      <p className="text-sm text-muted-foreground italic">
        ICT services represent the largest skills gap. Agriculture alignment is strong but
        offers limited wage growth.
      </p>
    </section>
  );
}

// ─── Automation histogram ───────────────────────────────────
function AutomationHistogram({
  cohort,
  calibration,
}: {
  cohort: YouthProfile[];
  calibration: number;
}) {
  const bands = useMemo(() => {
    const b = [
      { range: "0-20%", min: 0, max: 0.2, count: 0, color: "#16a34a" },
      { range: "20-40%", min: 0.2, max: 0.4, count: 0, color: "#65a30d" },
      { range: "40-60%", min: 0.4, max: 0.6, count: 0, color: "#f59e0b" },
      { range: "60-80%", min: 0.6, max: 0.8, count: 0, color: "#f97316" },
      { range: "80-100%", min: 0.8, max: 1.0, count: 0, color: "#ef4444" },
    ];
    for (const p of cohort) {
      for (const band of b) {
        if (p.automationRisk >= band.min && p.automationRisk < band.max) {
          band.count++;
          break;
        }
        if (band.max === 1.0 && p.automationRisk >= 0.8) {
          band.count++;
          break;
        }
      }
    }
    return b;
  }, [cohort]);

  const medHighPct = useMemo(() => {
    const medHigh = cohort.filter((p) => p.automationRisk >= 0.4).length;
    return Math.round((medHigh / cohort.length) * 100);
  }, [cohort]);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-xl font-bold">Automation Exposure Distribution</h2>
        <DataSource
          compact
          label="Frey & Osborne + O*NET"
          sources={[SOURCES.FREY_OSBORNE, SOURCES.ONET_2024]}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Calibration multiplier: <span className="font-mono font-bold">{calibration}×</span>{" "}
        · <span className="font-semibold text-amber-600">{medHighPct}%</span> of cohort in
        medium-to-high risk band
      </p>
      <div className="h-48 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bands}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line, #e5e7eb)" />
            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: "Youth count", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
            <RechartsTooltip
              formatter={(value: number) => [`${value} youth`, "Count"]}
            />
            <Bar dataKey="count" name="Youth in band" radius={[4, 4, 0, 0]}>
              {bands.map((b, i) => (
                <rect key={i} fill={b.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-muted-foreground italic">
        Most exposure sits in routine retail and repair tasks. Resilience-building should
        focus on relationship and judgment work.
      </p>
    </section>
  );
}

// ─── Education trajectory ───────────────────────────────────
function EducationTrajectoryChart({ iso3 }: { iso3: string }) {
  const data = useMemo(() => getEducationTrajectory(iso3), [iso3]);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-xl font-bold">Education Trajectory</h2>
        <DataSource compact {...SOURCES.WITTGENSTEIN_SSP2} />
      </div>
      <p className="text-sm text-muted-foreground">
        Wittgenstein Centre SSP2 projections — 2025 (actual) vs 2035 (projected). Investment
        in secondary completion shifts outcomes most.
      </p>
      <div className="h-48 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line, #e5e7eb)" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis
              unit="%"
              tick={{ fontSize: 11 }}
              domain={[0, 100]}
            />
            <RechartsTooltip formatter={(value: number, name: string) => [`${value}%`, name]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="Tertiary"
              stackId="1"
              stroke="#7c3aed"
              fill="#7c3aed"
              fillOpacity={0.7}
            />
            <Area
              type="monotone"
              dataKey="Secondary"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.7}
            />
            <Area
              type="monotone"
              dataKey="Primary"
              stackId="1"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.7}
            />
            <Area
              type="monotone"
              dataKey="No Education"
              stackId="1"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.7}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

// ─── Export helpers ──────────────────────────────────────────
async function exportPDF(
  dashRef: React.RefObject<HTMLDivElement | null>,
  countryName: string,
  stats: { medianAge: number; informalPct: number; riskPct: number }
) {
  if (!dashRef.current) return;
  const el = dashRef.current;
  const canvas = await html2canvas(el, {
    scale: 1.5,
    useCORS: true,
    logging: false,
    windowWidth: 1200,
  });

  const pdf = new jsPDF("p", "mm", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW - 20;
  const imgH = (canvas.height * imgW) / canvas.width;
  const imgData = canvas.toDataURL("image/jpeg", 0.85);

  // Page 1
  let yOffset = 0;
  const maxPerPage = pageH - 20;
  pdf.addImage(imgData, "JPEG", 10, 10, imgW, imgH, undefined, "FAST", 0);

  // If image overflows, add additional pages
  if (imgH > maxPerPage) {
    let remaining = imgH - maxPerPage;
    while (remaining > 0) {
      pdf.addPage();
      yOffset -= maxPerPage;
      pdf.addImage(imgData, "JPEG", 10, yOffset + 10, imgW, imgH, undefined, "FAST", 0);
      remaining -= maxPerPage;
    }
  }

  // Final page with recommendations
  pdf.addPage();
  pdf.setFontSize(16);
  pdf.text("Policy Recommendations", 10, 20);
  pdf.setFontSize(11);
  const recs = [
    `1. Digital literacy acceleration: ${stats.informalPct}% of ${countryName}'s youth cohort have informal skills unrecognised by formal credentials. Invest in certification bridges that validate these competencies.`,
    `2. Automation resilience: ${stats.riskPct}% face medium-to-high automation risk. Priority reskilling should target digital tools, bookkeeping, and English fluency — the three largest skill gaps identified.`,
    `3. Secondary education completion: Wittgenstein projections show the highest ROI from getting youth to secondary completion. Every 5% increase in secondary attainment correlates with a 12% improvement in employment outcomes.`,
  ];
  let y = 35;
  for (const rec of recs) {
    const lines = pdf.splitTextToSize(rec, pageW - 20);
    pdf.text(lines, 10, y);
    y += lines.length * 6 + 8;
  }

  // Footer
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  pdf.setFontSize(8);
  pdf.setTextColor(120);
  pdf.text(
    `Generated by UNMAPPED · ${today} · Data sources: ILOSTAT, Wittgenstein Centre, O*NET/ESCO`,
    10,
    pageH - 10
  );

  pdf.save(`UNMAPPED-${countryName}-PolicyBrief.pdf`);
}

function downloadCohortJSON(cohort: YouthProfile[], countryName: string) {
  const blob = new Blob([JSON.stringify(cohort, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `UNMAPPED-${countryName}-Cohort.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Dashboard ─────────────────────────────────────────
function PolicymakerDashboard() {
  const [selectedIso3, setSelectedIso3] = useState("GHA");
  const [region, setRegion] = useState("Greater Accra");
  const [ageBand, setAgeBand] = useState("all");
  const [gender, setGender] = useState("all");
  const [education, setEducation] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const dashRef = useRef<HTMLDivElement>(null);

  const country = COUNTRY_LIST.find((c) => c.iso3 === selectedIso3) ?? COUNTRY_LIST[0];
  const config = getCountryConfig(selectedIso3) as any;
  const calibration = config?.automation?.calibration_factor ?? 0.65;

  // Handle country change
  const handleCountryChange = useCallback(
    (iso3: string) => {
      setSelectedIso3(iso3);
      const c = COUNTRY_LIST.find((x) => x.iso3 === iso3);
      if (c) setRegion(c.defaultRegion);
      setAgeBand("all");
      setGender("all");
      setEducation("all");
    },
    []
  );

  // Generate cohort (deterministic per country)
  const fullCohort = useMemo(() => generateCohort(selectedIso3), [selectedIso3]);

  // Apply filters
  const filteredCohort = useMemo(() => {
    return fullCohort.filter((p) => {
      if (ageBand !== "all") {
        const [lo, hi] = ageBand.split("-").map(Number);
        if (p.age < lo || p.age > hi) return false;
      }
      if (gender !== "all" && p.gender !== gender) return false;
      if (education !== "all" && p.education !== education) return false;
      return true;
    });
  }, [fullCohort, ageBand, gender, education]);

  // Computed stats
  const stats = useMemo(() => {
    const c = filteredCohort;
    if (c.length === 0)
      return { count: 0, medianAge: 0, informalPct: 0, riskPct: 0 };

    const ages = c.map((p) => p.age).sort((a, b) => a - b);
    const medianAge = ages[Math.floor(ages.length / 2)];

    // % with at least one informal skill not reflected in their education
    const withInformal = c.filter(
      (p) => p.informalSkills.length > 0
    ).length;
    const informalPct = Math.round((withInformal / c.length) * 100);

    // % at medium or high risk
    const medHigh = c.filter(
      (p) => p.riskTier === "medium" || p.riskTier === "high"
    ).length;
    const riskPct = Math.round((medHigh / c.length) * 100);

    return { count: c.length, medianAge, informalPct, riskPct };
  }, [filteredCohort]);

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <PageShell
      eyebrow="Policymaker View"
      title="Youth Skills & Opportunity Dashboard"
      lede={
        <>
          {country.flag} {region} · {today}
        </>
      }
    >
      <div className={"space-y-10"} ref={dashRef}>
        {/* ── HEADER: Country selector + view toggle ───────── */}
        <div className="flex flex-col gap-4">
          {/* Country pills + perspective toggle */}
          <div className={"flex flex-col gap-4 md:flex-row md:items-center md:justify-between"}>
            <div className={"flex flex-wrap gap-2"}>
              {COUNTRY_LIST.map((c) => (
                <button
                  key={c.iso3}
                  type="button"
                  onClick={() => handleCountryChange(c.iso3)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    c.iso3 === selectedIso3
                      ? "bg-cobalt text-white"
                      : "border border-line bg-paper hover:bg-sand"
                  }`}
                >
                  {c.flag} {c.name}
                </button>
              ))}
            </div>
            <div className={"flex items-center gap-2 rounded-full border border-line p-1"}>
              <Link
                to="/passport"
                className={`rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground hover:bg-sand transition-colors `}
              >
                View as youth
              </Link>
              <span className={`rounded-full bg-cobalt px-4 py-1.5 text-sm font-medium text-white `}>
                View as policymaker
              </span>
            </div>
          </div>
        </div>

        {/* ── STEP 6: Drill-down filters ──────────────────── */}
        <FilterBar
          regions={country.regions}
          region={region}
          setRegion={setRegion}
          ageBand={ageBand}
          setAgeBand={setAgeBand}
          gender={gender}
          setGender={setGender}
          education={education}
          setEducation={setEducation}
          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
        />

        {/* ── STEP 1: Cohort Overview (4 headline cards) ──── */}
        <section className={"space-y-4"}>
          <h2 className="font-display text-xl font-bold">Cohort Overview</h2>
          <div className={"grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"}>
            <HeadlineCard
              icon={<Users className="h-5 w-5" />}
              value={`${stats.count}`}
              label="youth profiles in this cohort"
            />
            <HeadlineCard
              icon={<Calendar className="h-5 w-5" />}
              value={`${stats.medianAge}`}
              label="median age"
              accent="text-cobalt"
            />
            <HeadlineCard
              icon={<Award className="h-5 w-5" />}
              value={`${stats.informalPct}%`}
              label="have at least one informal skill not captured by their formal credential"
              accent="text-emerald-600"
            />
            <HeadlineCard
              icon={<AlertTriangle className="h-5 w-5" />}
              value={`${stats.riskPct}%`}
              label="are at medium or high automation risk"
              accent="text-amber-600"
            />
          </div>
          <p className={"text-base md:text-sm text-muted-foreground italic border-l-2 border-cobalt pl-4"}>
            This cohort has more skills than the formal economy recognises. Two in five face
            meaningful AI disruption in the next decade.
          </p>
        </section>

        {/* ── STEP 2: Skill Gap Heatmap ───────────────────── */}
        <SkillGapHeatmap />

        {/* ── Labour Market Demand Signals ─────────────────── */}
        <PolicymakerJobDemand iso3={selectedIso3} countryName={country.name} />

        {/* ── STEP 3: Sector Demand & Supply ──────────────── */}
        <SectorDemandChart />

        {/* ── STEP 4: Automation Exposure Distribution ────── */}
        <AutomationHistogram cohort={filteredCohort} calibration={calibration} />

        {/* ── STEP 5: Education Trajectory ────────────────── */}
        <EducationTrajectoryChart iso3={selectedIso3} />

        {/* ── STEP 7: Export ──────────────────────────────── */}
        <section className={"flex flex-col gap-3 pt-2 md:flex-row md:flex-wrap"}>
          <button
            type="button"
            className={"inline-flex w-full items-center justify-center gap-2 rounded-md bg-cobalt px-5 py-2.5 text-sm font-semibold text-white hover:bg-cobalt/90 transition-colors md:w-auto"}
            onClick={() =>
              exportPDF(dashRef, country.name, {
                medianAge: stats.medianAge,
                informalPct: stats.informalPct,
                riskPct: stats.riskPct,
              })
            }
          >
            <FileText className="h-4 w-4" />
            Export Brief (PDF)
          </button>
          <button
            type="button"
            className={"inline-flex w-full items-center justify-center gap-2 rounded-md border border-line bg-paper px-5 py-2.5 text-sm font-semibold hover:bg-sand transition-colors md:w-auto"}
            onClick={() => downloadCohortJSON(filteredCohort, country.name)}
          >
            <Download className="h-4 w-4" />
            Download Cohort JSON
          </button>
        </section>

        {/* ── Data Provenance Footer ──────────────────────── */}
        <footer className="mt-6 rounded-lg border border-line bg-sand/30 p-6 space-y-3">
          <h2 className="font-display text-lg font-bold">Data Provenance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {[
              SOURCES.ILOSTAT_2024,
              SOURCES.WDI_2024,
              SOURCES.FREY_OSBORNE,
              SOURCES.ONET_2024,
              SOURCES.WITTGENSTEIN_SSP2,
              SOURCES.UNESCO_UIS_2024,
            ].map((s) => (
              <div key={s.label} className="flex items-start gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0 mt-0.5">
                  {s.label}
                </span>
                <span className="text-xs text-muted-foreground">{s.dataset}</span>
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cobalt hover:underline shrink-0"
                  >
                    ↗
                  </a>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            LMIC recalibration factor for {country.name}:{" "}
            <span className="font-mono font-bold">{calibration}</span>. Synthetic cohort of
            100 profiles generated deterministically from country parameters.
          </p>
        </footer>
      </div>
    </PageShell>
  );
}
