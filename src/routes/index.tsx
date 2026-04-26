import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import { CulturalPattern } from "@/components/cultural-pattern";
import { useI18n } from "@/lib/i18n";
export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "UNMAPPED — See what your skills are really worth" },
      {
        name: "description",
        content:
          "An open infrastructure layer that maps informal talent to real economic opportunity. Built for the World Bank Youth Summit × Hack-Nation 2026.",
      },
      {
        property: "og:title",
        content: "UNMAPPED — See what your skills are really worth",
      },
      {
        property: "og:description",
        content:
          "Closing the distance between real skills and economic opportunity in the age of AI.",
      },
    ],
  }),
});

/* ─── Root ──────────────────────────────────────────────────────────────── */

function Index() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-paper text-ink">
      <SiteNav />
      <Hero />
      <HowItWorks />
      <JobMarketPulse />
      <ImpactStrip />
      <ProtocolNotProduct />
      <BuiltForAmara />
      <Footer />
    </div>
  );
}

/* ─── Hero ──────────────────────────────────────────────────────────────── */

function Hero() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden bg-ink">
      {/* Hero background image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/hero-amara.jpg)" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 z-[1] bg-ink/70" aria-hidden="true" />
      <CulturalPattern opacity={0.04} size={120} />

      <div className="relative z-[2] mx-auto flex min-h-[80vh] max-w-[1400px] flex-col items-center justify-center px-6 text-center py-12 md:py-24">
        <h1 className="font-display text-[clamp(3rem,8vw,7rem)] font-black leading-[0.95] tracking-tight text-paper">
          {t("hero.title", "UNMAPPED")}
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-paper/80 md:text-xl">
          {t("hero.subtitle", "See what your work skills are really worth — and where they could take you")}
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            to="/start"
            className="group inline-flex items-center gap-3 bg-cobalt px-8 py-4 text-base font-semibold text-paper transition-colors hover:bg-paper hover:text-cobalt"
          >
            <span className="text-xl">🚀</span>
            <span>
              {t("hero.cta_get_started", "Get started")}{" "}
              <span className="inline-block transition-transform group-hover:translate-x-1">
                →
              </span>
            </span>
          </Link>
          <Link
            to="/policymaker"
            className="group inline-flex items-center gap-3 border-2 border-paper bg-transparent px-8 py-4 text-base font-semibold text-paper transition-colors hover:bg-paper hover:text-ink"
          >
            <span className="text-xl">📊</span>
            <span>
              {t("hero.cta_policy", "I'm a policymaker")}{" "}
              <span className="inline-block transition-transform group-hover:translate-x-1">
                →
              </span>{" "}
              {t("hero.cta_policy_sub", "View workforce intelligence")}
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ─────────────────────────────────────────────────────── */

const STEPS = [
  {
    icon: "💬",
    title: "Tell us what you do",
    body: "Describe your work in any language",
  },
  {
    icon: "🔗",
    title: "We bridge the gap",
    body: "9 data sources, 4 taxonomy systems, 5 countries",
  },
  {
    icon: "🧭",
    title: "See your future",
    body: "AI readiness, career pathways, real signals",
  },
];

function HowItWorks() {
  const { t } = useI18n();
  return (
    <section className="border-b border-line bg-paper">
      <div className="mx-auto max-w-[1400px] px-6 py-12 md:py-20">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cobalt">
            How it works
          </div>
          <h2 className="mt-3 font-display text-3xl font-black md:text-4xl">
            {t("how.title", "Three steps. Real outcomes.")}
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cobalt/10 text-4xl">
                {step.icon}
              </div>
              <div className="mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-cobalt text-sm font-bold text-paper">
                {i + 1}
              </div>
              <h3 className="mt-4 font-display text-xl font-black">
                {step.title}
              </h3>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Job Market Pulse ─────────────────────────────────────────────────── */

function JobMarketPulse() {
  return (
    <section className="border-b border-line bg-card">
      <div className="mx-auto max-w-[1400px] px-6 py-12 md:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-lg border-2 border-cobalt/20 bg-cobalt/5 p-6 md:p-8">
            <div className="flex items-start gap-4">
              <span
                className="text-3xl shrink-0"
                style={{ animation: "pulse 2s ease-in-out infinite" }}
              >
                🔍
              </span>
              <div className="space-y-3">
                <h3 className="font-display text-xl font-black md:text-2xl">
                  Live Job Intelligence
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                  We scrape LinkedIn, Indeed, and Jobberman to show you real demand
                  signals — not just theory, but which jobs are actually hiring in
                  your country right now.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-muted-foreground">
                      Tracking <strong className="text-ink">374+</strong> occupation
                      categories
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-muted-foreground">
                      Across <strong className="text-ink">3</strong> major job
                      platforms
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-muted-foreground">
                      Updated <strong className="text-ink">April 2025</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Impact Numbers ───────────────────────────────────────────────────── */

const STATS = [
  { value: "9", label: "Data Sources" },
  { value: "14,209", label: "Skills Mapped" },
  { value: "6", label: "Countries" },
  { value: "374", label: "Occupations Analyzed" },
  { value: "7", label: "Languages" },
];

function ImpactStrip() {
  return (
    <section className="bg-cobalt">
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px bg-cobalt/80 sm:grid-cols-3 md:grid-cols-5">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center justify-center bg-cobalt px-4 py-8 text-center"
          >
            <div className="font-display text-3xl font-black text-paper md:text-4xl">
              {s.value}
            </div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-paper/70">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Built for Amara ──────────────────────────────────────────────────── */

/* ─── Protocol, not product ───────────────────────────────────────────── */

const COUNTRY_INPUTS = [
  { flag: "🇳🇬", name: "Nigeria", lang: "English · Hausa · Yoruba", currency: "₦", calib: "0.62" },
  { flag: "🇬🇭", name: "Ghana", lang: "English · Twi", currency: "GH₵", calib: "0.65" },
  { flag: "🇰🇪", name: "Kenya", lang: "English · Swahili", currency: "KSh", calib: "0.66" },
  { flag: "🇷🇼", name: "Rwanda", lang: "Kinyarwanda · English", currency: "RWF", calib: "0.58" },
  { flag: "🇮🇳", name: "India", lang: "Hindi · English · +21", currency: "₹", calib: "0.71" },
];

function ProtocolNotProduct() {
  return (
    <section className="border-b border-line bg-sand">
      <div className="mx-auto max-w-[1400px] px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          {/* Left — the claim */}
          <div>
            <div className="inline-block border-l-4 border-cobalt bg-cobalt/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cobalt">
              Infrastructure, not just an app
            </div>
            <h2 className="mt-4 font-display text-3xl font-black leading-tight md:text-4xl">
              A protocol any government, NGO or training provider can{" "}
              <span className="text-cobalt">plug into.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-foreground/80 md:text-lg">
              Country-specific parameters — labour data, education taxonomy, language,
              automation calibration — are <strong>inputs to the system, not hardcoded
              assumptions</strong>. Adding a new country is a JSON edit, not a code change.
            </p>
            <div className="mt-6 grid gap-3 text-sm">
              {[
                { k: "Labour data", v: "ILOSTAT · WDI · per-country signals JSON" },
                { k: "Education taxonomy", v: "ISCED-mapped levels per config" },
                { k: "Language", v: "8 locale files · swap without redeploying" },
                { k: "Automation calibration", v: "Frey-Osborne recalibrated per LMIC" },
              ].map(row => (
                <div key={row.k} className="grid grid-cols-[160px_1fr] items-baseline gap-3 border-b border-line pb-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cobalt">{row.k}</span>
                  <span className="text-foreground/80">{row.v}</span>
                </div>
              ))}
            </div>
            <Link
              to="/configure"
              className="mt-7 inline-flex items-center gap-2 border-2 border-ink bg-ink px-5 py-3 text-sm font-semibold text-paper hover:bg-cobalt hover:border-cobalt"
            >
              See the live config switcher →
            </Link>
          </div>

          {/* Right — visual proof: country configs as inputs */}
          <div className="rounded-sm border-2 border-ink bg-paper p-5 shadow-[8px_8px_0_0_var(--ink)]">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                /data/config/country_config_*.json
              </span>
              <span className="rounded-full bg-cobalt/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cobalt">
                6 active
              </span>
            </div>
            <div className="mt-4 grid gap-2">
              {COUNTRY_INPUTS.map(c => (
                <div
                  key={c.name}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-sm border border-line bg-sand/40 px-3 py-2.5 text-sm"
                >
                  <span className="text-xl leading-none">{c.flag}</span>
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">{c.name}</div>
                    <div className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {c.lang}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">calib · {c.calib}</div>
                    <div className="font-mono text-xs font-semibold text-ink">{c.currency}</div>
                  </div>
                </div>
              ))}
              <div className="mt-1 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-sm border border-dashed border-cobalt/40 bg-cobalt/5 px-3 py-2.5 text-sm">
                <span className="text-xl leading-none">＋</span>
                <div className="font-mono text-xs uppercase tracking-wider text-cobalt">
                  Add a country = add a JSON file
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-cobalt/70">no code</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BuiltForAmara() {
  return (
    <section className="border-b border-line bg-card">
      <div className="mx-auto max-w-[1400px] px-6 py-12 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cobalt">
            Built for real people
          </div>
          <h2 className="mt-3 font-display text-3xl font-black md:text-4xl">
            Meet Amara.
          </h2>
          <div className="mt-8 rounded-none border border-line bg-paper p-5 text-left md:p-8">
            <p className="text-lg leading-relaxed">
              Amara repairs phones in Lagos Market. She's 22, taught herself
              from YouTube. Is her livelihood at risk from AI? Where should she
              invest her next skill?
            </p>
            <p className="mt-4 text-lg font-semibold leading-relaxed text-cobalt">
              UNMAPPED gives her — and policymakers — the data to answer that.
            </p>
          </div>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/passport"
              className="inline-flex items-center gap-2 bg-cobalt px-6 py-3 text-sm font-semibold text-paper hover:bg-ink"
            >
              Try Amara's passport →
            </Link>
            <Link
              to="/policymaker"
              className="inline-flex items-center gap-2 border-2 border-cobalt px-6 py-3 text-sm font-semibold text-cobalt hover:bg-cobalt hover:text-paper"
            >
              See the policymaker view →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ───────────────────────────────────────────────────────────── */

const ALL_PAGES = [
  { to: "/passport", label: "Skills Passport" },
  { to: "/results", label: "Results" },
  { to: "/policymaker", label: "Policymaker" },
  { to: "/compare", label: "Compare" },
  { to: "/education", label: "Education" },
  { to: "/crosswalk", label: "Crosswalk" },
  { to: "/coverage", label: "Coverage" },
  { to: "/infrastructure", label: "Infrastructure" },
  { to: "/methodology", label: "Methodology" },
  { to: "/demo", label: "Demo" },
];

function Footer() {
  return (
    <footer className="bg-ink text-paper">
      {/* Brand bar */}
      <div className="bg-cobalt">
        <div className="mx-auto max-w-[1400px] px-6 py-5">
          <div className="font-display text-xl font-black">
            World Bank Youth Summit × Hack-Nation 2026
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Links */}
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-paper/50">
              Pages
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
              {ALL_PAGES.map((p) => (
                <li key={p.to}>
                  <Link
                    to={p.to}
                    className="text-sm text-paper/70 hover:text-paper"
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Data sources */}
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-paper/50">
              Data sources
            </div>
            <ul className="mt-3 space-y-1 text-sm text-paper/70">
              <li>ESCO · O*NET skill taxonomies</li>
              <li>Frey &amp; Osborne automation scores</li>
              <li>ILO task indices · World Bank STEP</li>
              <li>Wittgenstein Centre 2025–2035 projections</li>
              <li>ITU DataHub · WBES Employment</li>
            </ul>
          </div>

          {/* Principle */}
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-paper/50">
              Principle
            </div>
            <p className="mt-3 text-sm text-paper/70">
              Built with real data, not synthetic estimates. Country parameters
              are{" "}
              <span className="font-semibold text-paper">inputs</span>, never
              hardcoded.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-paper/15 pt-4 text-xs uppercase tracking-[0.18em] text-paper/50">
          Prototype · not for production decisions · figures are illustrative
          composites of cited sources
        </div>
      </div>
    </footer>
  );
}
