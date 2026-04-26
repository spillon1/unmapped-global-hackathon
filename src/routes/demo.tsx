import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { CulturalPattern } from "@/components/cultural-pattern";


export const Route = createFileRoute("/demo")({
  component: DemoPage,
  head: () => ({
    meta: [
      { title: "UNMAPPED — Guided Demo" },
      {
        name: "description",
        content: "Walk through the key features of UNMAPPED in a guided demo.",
      },
    ],
  }),
});

/* ─── Slide data ───────────────────────────────────────────────────────── */

interface Slide {
  title: string;
  bullets: string[];
  visual: "problem" | "bridge" | "youth" | "policymaker" | "data" | "moat" | "cta";
  accent: string;
}

const SLIDES: Slide[] = [
  {
    title: "The Problem",
    bullets: [
      "1.7 billion informal workers globally — invisible to economic systems",
      "71% of Sub-Saharan youth work informally with zero verifiable credentials",
      "Existing skill taxonomies were built for OECD economies, not Lagos markets",
    ],
    visual: "problem",
    accent: "🌍",
  },
  {
    title: "The Bridge",
    bullets: [
      "SOC ↔ ISCO ↔ ESCO ↔ O*NET unified crosswalk",
      "174,000+ crosswalk records linking four taxonomy systems",
      "Task-level mapping — not just titles, but what people actually do",
    ],
    visual: "bridge",
    accent: "🔗",
  },
  {
    title: "For Youth",
    bullets: [
      "Conversational onboarding in any of 7 languages",
      "AI-powered skill extraction from informal experience descriptions",
      "Portable skills passport with ESCO-aligned credentials",
    ],
    visual: "youth",
    accent: "🎓",
  },
  {
    title: "For Policymakers",
    bullets: [
      "Aggregate workforce intelligence across informal economies",
      "AI automation exposure analysis calibrated to LMIC task composition",
      "Country-comparative dashboards with real economic signals",
    ],
    visual: "policymaker",
    accent: "📊",
  },
  {
    title: "The Data",
    bullets: [
      "9 real data sources — ESCO, O*NET, ILO, World Bank STEP, and more",
      "174K+ crosswalk records, 14,209 skills mapped, 374 occupations analyzed",
      "Real signals: wage floors, broadband penetration, informal share by country",
    ],
    visual: "data",
    accent: "🗂️",
  },
  {
    title: "The Moat",
    bullets: [
      "Task-level recalibration for LMIC economies (not raw Frey-Osborne)",
      "ESCO skills graph with adjacency scoring for career pathways",
      "Country-agnostic architecture — swap config, not code",
    ],
    visual: "moat",
    accent: "🏰",
  },
  {
    title: "Try It",
    bullets: [
      "Experience the skills passport as a young person in 5 countries",
      "Explore the policymaker dashboard with real workforce data",
      "See the full infrastructure: crosswalk, coverage, methodology",
    ],
    visual: "cta",
    accent: "🚀",
  },
];

const AUTO_ADVANCE_MS = 8000;

/* ─── Visual Cards ─────────────────────────────────────────────────────── */

function SlideVisual({ type }: { type: Slide["visual"] }) {
  const cardBase =
    "w-full max-w-md mx-auto border border-line bg-paper p-6 md:p-8";

  switch (type) {
    case "problem":
      return (
        <div className={cardBase}>
          <div className="space-y-4">
            {[
              { pct: "71%", label: "Youth informal employment (SSA)", color: "bg-red-500" },
              { pct: "3%", label: "Hold verifiable credentials", color: "bg-amber-500" },
              { pct: "0%", label: "Covered by existing skill frameworks", color: "bg-cobalt" },
            ].map((r) => (
              <div key={r.label}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-bold">{r.pct}</span>
                </div>
                <div className="mt-1 h-2 w-full bg-ink/10">
                  <div
                    className={`h-full ${r.color}`}
                    style={{ width: r.pct === "0%" ? "2%" : r.pct }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "bridge":
      return (
        <div className={cardBase}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {["SOC", "ISCO", "ESCO", "O*NET"].map((t, i) => (
              <div key={t} className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center bg-cobalt text-xs font-bold text-paper">
                  {t}
                </div>
                {i < 3 && (
                  <span className="text-lg text-cobalt">↔</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            174,000+ crosswalk records
          </div>
        </div>
      );

    case "youth":
      return (
        <div className={cardBase}>
          <div className="text-xs uppercase tracking-wider text-cobalt">
            Skills Passport Preview
          </div>
          <div className="mt-3 space-y-2">
            {[
              ["Phone Repair", 92],
              ["Customer Service", 88],
              ["Multilingual Comm.", 95],
              ["Basic Programming", 61],
            ].map(([skill, conf]) => (
              <div key={skill as string}>
                <div className="flex justify-between text-sm">
                  <span>{skill}</span>
                  <span className="text-xs text-muted-foreground">
                    {conf}%
                  </span>
                </div>
                <div className="mt-0.5 h-1.5 bg-ink/10">
                  <div
                    className="h-full bg-cobalt"
                    style={{ width: `${conf}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "policymaker":
      return (
        <div className={cardBase}>
          <div className="text-xs uppercase tracking-wider text-cobalt">
            Workforce Intelligence
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { v: "374", l: "Occupations" },
              { v: "14.2K", l: "Skills" },
              { v: "47%", l: "AI Exposure" },
              { v: "5", l: "Countries" },
            ].map((s) => (
              <div key={s.l} className="bg-cobalt/5 p-3 text-center">
                <div className="font-display text-xl font-black text-cobalt">
                  {s.v}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "data":
      return (
        <div className={cardBase}>
          <div className="text-xs uppercase tracking-wider text-cobalt">
            Data Sources
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              "ESCO",
              "O*NET",
              "ILO",
              "STEP",
              "WBES",
              "ITU",
              "F&O",
              "Witt.",
              "ILOSTAT",
            ].map((src) => (
              <div
                key={src}
                className="bg-cobalt/10 px-2 py-1.5 text-center text-xs font-semibold"
              >
                {src}
              </div>
            ))}
          </div>
        </div>
      );

    case "moat":
      return (
        <div className={cardBase}>
          <div className="text-xs uppercase tracking-wider text-cobalt">
            Technical Moat
          </div>
          <div className="mt-3 space-y-3">
            {[
              "Task-level LMIC recalibration",
              "ESCO adjacency graph",
              "Country-agnostic config layer",
            ].map((m, i) => (
              <div key={m} className="flex items-start gap-2">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-cobalt text-xs font-bold text-paper">
                  {i + 1}
                </div>
                <span className="text-sm">{m}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "cta":
      return (
        <div className="flex w-full max-w-md flex-col gap-4 mx-auto">
          <Link
            to="/passport"
            className="flex items-center justify-center gap-2 bg-cobalt px-8 py-4 text-base font-semibold text-paper transition-colors hover:bg-ink"
          >
            🎓 Start the Skills Passport →
          </Link>
          <Link
            to="/policymaker"
            className="flex items-center justify-center gap-2 border-2 border-cobalt px-8 py-4 text-base font-semibold text-cobalt transition-colors hover:bg-cobalt hover:text-paper"
          >
            📊 Open Policymaker Dashboard →
          </Link>
          <Link
            to="/crosswalk"
            className="flex items-center justify-center gap-2 border-2 border-ink/20 px-8 py-4 text-sm font-semibold text-ink/70 transition-colors hover:border-ink hover:text-ink"
          >
            🔗 Explore the Crosswalk →
          </Link>
        </div>
      );
  }
}

/* ─── Demo Page ────────────────────────────────────────────────────────── */

function DemoPage() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (idx: number) => {
      setCurrent(((idx % SLIDES.length) + SLIDES.length) % SLIDES.length);
      setProgress(0);
    },
    [],
  );

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Auto-advance
  useEffect(() => {
    if (paused) return;

    // Progress bar update (every 80ms = ~100 ticks in 8s)
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + 1, 100));
    }, AUTO_ADVANCE_MS / 100);

    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length);
      setProgress(0);
    }, AUTO_ADVANCE_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [paused, current]);

  // Keyboard nav
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setPaused(true);
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPaused(true);
        prev();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [next, prev]);

  // Touch/swipe
  const touchStart = useRef<number | null>(null);

  const slide = SLIDES[current];

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink text-paper">
      <CulturalPattern opacity={0.04} size={120} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 md:px-6">
        <Link to="/" className="font-display text-lg font-black text-paper/80 hover:text-paper">
          unmapped
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPaused((p) => !p)}
            className="text-xs font-medium uppercase tracking-wider text-paper/60 hover:text-paper"
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-1 border border-paper/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-paper/80 hover:border-paper hover:bg-paper hover:text-ink"
            aria-label="Exit demo"
          >
            ✕ Exit
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="h-0.5 w-full bg-paper/10">
          <div
            className="h-full bg-cobalt transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Slide content */}
      <div
        className="relative z-10 mx-auto flex min-h-[calc(100vh-120px)] max-w-[1400px] flex-col items-center justify-center px-4 py-8 md:px-6 md:py-12"
        onTouchStart={(e) => {
          touchStart.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStart.current === null) return;
          const diff = e.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(diff) > 50) {
            setPaused(true);
            if (diff < 0) next();
            else prev();
          }
          touchStart.current = null;
        }}
      >
        {/* Slide number + accent */}
        <div className="mb-2 text-4xl">{slide.accent}</div>
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cobalt">
          {current + 1} / {SLIDES.length}
        </div>

        <h1 className="mt-4 text-center font-display text-[clamp(2rem,5vw,4rem)] font-black leading-tight">
          {slide.title}
        </h1>

        {/* Bullets */}
        <ul className="mt-8 max-w-xl space-y-3">
          {slide.bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-base text-paper/80 md:text-lg"
            >
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center bg-cobalt text-[10px] font-bold text-paper">
                {i + 1}
              </span>
              {b}
            </li>
          ))}
        </ul>

        {/* Visual card */}
        <div className="mt-10 w-full max-w-lg">
          <SlideVisual type={slide.visual} />
        </div>

        {/* Arrow navigation */}
        <div className="mt-10 flex items-center gap-6">
          <button
            onClick={() => {
              setPaused(true);
              prev();
            }}
            className="flex h-10 w-10 items-center justify-center border border-paper/30 text-paper/60 hover:border-paper hover:text-paper"
            aria-label="Previous slide"
          >
            ←
          </button>
          <button
            onClick={() => {
              setPaused(true);
              next();
            }}
            className="flex h-10 w-10 items-center justify-center border border-paper/30 text-paper/60 hover:border-paper hover:text-paper"
            aria-label="Next slide"
          >
            →
          </button>
        </div>
      </div>

      {/* Dot navigation */}
      <div className="absolute bottom-6 left-0 right-0 z-10 flex items-center justify-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setPaused(true);
              goTo(i);
            }}
            className={`h-2.5 rounded-full transition-all ${
              i === current
                ? "w-8 bg-cobalt"
                : "w-2.5 bg-paper/30 hover:bg-paper/60"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
