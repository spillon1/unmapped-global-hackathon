import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { PageShell } from "@/components/page-shell";
import { LlmInput } from "@/components/llm-input";
import { FollowupQuestions } from "@/components/followup-questions";
import { useOnboarding } from "@/lib/profile-store";
import { useI18n } from "@/lib/i18n";
import { getCountryTheme } from "@/lib/country-theme";

export const Route = createFileRoute("/passport")({
  component: Passport,
  head: () => ({
    meta: [
      { title: "Your Skills Passport — UNMAPPED" },
      {
        name: "description",
        content:
          "Answer 5 quick questions to build your portable, ESCO-aligned skill passport.",
      },
    ],
  }),
});

/* ── ISCO-08 occupation mapping ── */

interface OccupationOption {
  label: string;
  isco08: string | null;
  icon: string;
}

const WORK_OPTIONS: OccupationOption[] = [
  { label: "Repairing phones, electronics", isco08: "7422", icon: "🔧" },
  { label: "Selling goods", isco08: "5221", icon: "🛒" },
  { label: "Sewing, tailoring", isco08: "7531", icon: "🧵" },
  { label: "Driving", isco08: "8322", icon: "🚗" },
  { label: "Cooking, food prep", isco08: "5120", icon: "🍳" },
  { label: "Construction", isco08: "7112", icon: "🏗️" },
  { label: "Farming", isco08: "9211", icon: "🌾" },
  { label: "Teaching", isco08: "2356", icon: "📚" },
  { label: "Office, admin", isco08: "4132", icon: "🗂️" },
  { label: "Healthcare", isco08: "2221", icon: "🏥" },
  { label: "IT, tech", isco08: "2512", icon: "💻" },
  { label: "Fintech, mobile money", isco08: "4215", icon: "📱" },
  { label: "Creative work", isco08: "2651", icon: "🎨" },
  { label: "Something else", isco08: null, icon: "✏️" },
];

const EDUCATION_OPTIONS = [
  { code: "L0", label: "No formal education", isced: "0" },
  { code: "L1", label: "Primary (incomplete)", isced: "1" },
  { code: "L2", label: "Primary leaving certificate", isced: "1" },
  { code: "L3", label: "Junior Secondary (JSSC)", isced: "2" },
  { code: "L4", label: "Senior Secondary (WAEC/NECO)", isced: "3" },
  { code: "L5", label: "National Diploma / Technical cert", isced: "4" },
  { code: "L6", label: "Higher National Diploma (HND)", isced: "5" },
  { code: "L7", label: "University degree (B.Sc / B.A)", isced: "6" },
  { code: "L8", label: "Postgraduate", isced: "7+" },
];

const INFORMAL_SKILLS_OPTIONS = [
  "Basic computer use",
  "Smartphones and apps",
  "Social media for business",
  "Accounting / bookkeeping",
  "Trade through apprenticeship",
  "Coding / tech",
  "A language",
  "Nothing specific",
];

const EXPERIENCE_OPTIONS = [
  { label: "Less than 1 year", value: "<1" },
  { label: "1–2 years", value: "1-2" },
  { label: "3–5 years", value: "3-5" },
  { label: "More than 5 years", value: "5+" },
];

const GOAL_OPTIONS = [
  { label: "Find a formal job", icon: "💼" },
  { label: "Grow my own business", icon: "📈" },
  { label: "Learn new skill / get certified", icon: "🎓" },
  { label: "Understand what jobs pay", icon: "💰" },
  { label: "See how AI might affect my work", icon: "🤖" },
];

const TOTAL_STEPS = 5;
const TOTAL_STEPS_WITH_INTRO = 6;

/* ── Main component ── */

function Passport() {
  const { t, locale, setLocale, availableLocales } = useI18n();
  const [onboarding, setOnboarding] = useOnboarding();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Read country from the country-theme picker (persisted in localStorage), fallback to NGA
  const currentCountry = (() => {
    try {
      return localStorage.getItem('unmapped-country')?.toUpperCase() || 'NGA';
    } catch {
      return 'NGA';
    }
  })();
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animating, setAnimating] = useState(false);
  const [building, setBuilding] = useState(false);

  // Local draft state (committed to store on completion)
  const [nameInput, setNameInput] = useState(onboarding.name || "");
  const [ageInput, setAgeInput] = useState(onboarding.age || "");
  const [selectedWork, setSelectedWork] = useState<string | null>(
    onboarding.isco08_label || null,
  );
  const [freeText, setFreeText] = useState(onboarding.isco08_freetext || "");
  const [selectedEdu, setSelectedEdu] = useState(
    onboarding.education_level || "",
  );
  const [selectedInformal, setSelectedInformal] = useState<string[]>(
    onboarding.informal_skills || [],
  );
  const [selectedExp, setSelectedExp] = useState(
    onboarding.experience_years || "",
  );
  const [selectedGoal, setSelectedGoal] = useState(
    onboarding.user_goal || "",
  );

  // LLM-related state
  const [llmIsco08, setLlmIsco08] = useState<string | null>(null);
  const [llmLabel, setLlmLabel] = useState<string>("");
  const [detectedSkills, setDetectedSkills] = useState<string[]>([]);
  const [showFollowup, setShowFollowup] = useState(false);

  const goTo = useCallback(
    (next: number) => {
      if (animating) return;
      setDirection(next > step ? "forward" : "back");
      setAnimating(true);
      setTimeout(() => {
        setStep(next);
        setAnimating(false);
      }, 250);
    },
    [step, animating],
  );

  const canNext = (): boolean => {
    switch (step) {
      case 1:
        return nameInput.trim().length >= 1 && nameInput.trim().length <= 60 &&
          /^\d{1,3}$/.test(ageInput.trim()) &&
          Number(ageInput) >= 10 && Number(ageInput) <= 99;
      case 2:
        return selectedWork === "Something else"
          ? llmIsco08 !== null
          : selectedWork !== null;
      case 3: return selectedEdu !== "";
      case 4: return selectedInformal.length > 0;
      case 5: return selectedExp !== "";
      case 6: return selectedGoal !== "";
      default:
        return false;
    }
  };

  const commitAndNavigate = useCallback(() => {
    const workOption = WORK_OPTIONS.find((o) => o.label === selectedWork);
    const isLlm = selectedWork === "Something else" && llmIsco08;
    setOnboarding({
      name: nameInput.trim().slice(0, 60),
      age: ageInput.trim(),
      isco08: isLlm ? llmIsco08 : (workOption?.isco08 ?? null),
      isco08_label: isLlm ? llmLabel : (selectedWork || ""),
      isco08_freetext: selectedWork === "Something else" ? freeText : "",
      education_level: selectedEdu,
      informal_skills: selectedInformal,
      experience_years: selectedExp,
      user_goal: selectedGoal,
      country: currentCountry,
      completed: true,
    });
    setBuilding(true);
    setTimeout(() => {
      navigate({ to: "/readiness" });
    }, 2200);
  }, [
    nameInput,
    ageInput,
    selectedWork,
    freeText,
    llmIsco08,
    llmLabel,
    selectedEdu,
    selectedInformal,
    selectedExp,
    selectedGoal,
    setOnboarding,
    navigate,
    currentCountry,
  ]);

  const handleComplete = useCallback(() => {
    // If user used LLM path, show follow-up questions before building
    const usedLlm = selectedWork === "Something else" && llmIsco08;
    if (usedLlm && !showFollowup) {
      setShowFollowup(true);
      return;
    }
    commitAndNavigate();
  }, [selectedWork, llmIsco08, showFollowup, commitAndNavigate]);

  const handleNext = () => {
    if (!canNext()) return;
    if (step < TOTAL_STEPS_WITH_INTRO) {
      goTo(step + 1);
    } else {
      handleComplete();
    }
  };

  /* ── Follow-up questions (post-Step 5, LLM path only) ── */
  if (showFollowup && !building) {
    return (
      <PageShell
        eyebrow="Module 01 · Skills Signal Engine"
        title={<>{"A few more questions…"}</>}
        lede="Help us refine your results with a couple of quick follow-ups."
      >
        <FollowupQuestions
          isco08={llmIsco08 || ""}
          detectedSkills={detectedSkills}
          country={currentCountry}
          onComplete={(_answers) => {
            // Answers captured — proceed to build
            commitAndNavigate();
          }}
          onSkip={() => {
            commitAndNavigate();
          }}
        />
      </PageShell>
    );
  }

  /* ── Building state ── */
  if (building) {
    return (
      <PageShell
        eyebrow="Module 01 · Skills Signal Engine"
        title={<>{"Building your profile…"}</>}
      >
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-line border-t-cobalt" />
          <p className="mt-6 font-mono text-sm text-muted-foreground">
            Mapping your experience to ESCO &amp; ISCO-08&hellip;
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Module 01 · Skills Signal Engine"
      title={
        <>
          Build a passport that{" "}
          <span className="text-cobalt">travels</span>.
        </>
      }
      lede="Answer 5 quick questions so we can map your experience into a portable, human-readable profile."
    >
      {/* Live language strip — proves the localisation is real, not a slide.
          Tap any chip and the step heading & hint re-render in that script. */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-sm border border-cobalt/30 bg-cobalt/5 px-4 py-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cobalt">
          Try this passport in →
        </span>
        {availableLocales.map(l => {
          const active = l.code === locale;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLocale(l.code)}
              className={
                active
                  ? "rounded-full border border-ink bg-ink px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-paper"
                  : "rounded-full border border-cobalt/30 bg-paper px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-cobalt hover:border-ink hover:text-ink"
              }
              aria-pressed={active}
              title={l.name}
            >
              <span className="mr-1">{l.flag}</span>
              <span style={{ fontFamily: "system-ui, sans-serif" }}>{l.nativeName}</span>
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span>Step {step} of {TOTAL_STEPS_WITH_INTRO}</span>
          <span>{Math.round((step / TOTAL_STEPS_WITH_INTRO) * 100)}%</span>
        </div>
        <div className="mt-2 w-full rounded-full bg-line h-2.5 md:h-1.5">
          <div
            className="h-full rounded-full bg-cobalt transition-all duration-500 ease-out"
            style={{ width: `${(step / TOTAL_STEPS_WITH_INTRO) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="mx-auto max-w-full px-1 md:max-w-2xl md:px-0">
        <div
          className={`transition-all duration-250 ease-out ${
            animating
              ? direction === "forward"
                ? "translate-x-8 opacity-0"
                : "-translate-x-8 opacity-0"
              : "translate-x-0 opacity-100"
          }`}
        >
          {step === 1 && (
            <StepIntro
              name={nameInput}
              age={ageInput}
              onName={setNameInput}
              onAge={setAgeInput}
            />
          )}
          {step === 2 && (
            <StepWork
              selected={selectedWork}
              onSelect={(v) => {
                setSelectedWork(v);
                // Reset LLM state when switching away from "Something else"
                if (v !== "Something else") {
                  setLlmIsco08(null);
                  setLlmLabel("");
                  setDetectedSkills([]);
                }
              }}
              llmConfirmed={llmIsco08 !== null}
              llmLabel={llmLabel}
              onLlmConfirm={(isco08, label, skills) => {
                if (!isco08) {
                  // Reset (user clicked "Change")
                  setLlmIsco08(null);
                  setLlmLabel("");
                  setDetectedSkills([]);
                } else {
                  setLlmIsco08(isco08);
                  setLlmLabel(label);
                  setDetectedSkills(skills);
                }
              }}
              currentCountry={currentCountry}
            />
          )}
          {step === 3 && (
            <StepEducation
              selected={selectedEdu}
              onSelect={setSelectedEdu}
            />
          )}
          {step === 4 && (
            <StepInformalSkills
              selected={selectedInformal}
              onToggle={(skill) =>
                setSelectedInformal((prev) =>
                  prev.includes(skill)
                    ? prev.filter((s) => s !== skill)
                    : [...prev, skill],
                )
              }
            />
          )}
          {step === 5 && (
            <StepExperience
              selected={selectedExp}
              onSelect={setSelectedExp}
            />
          )}
          {step === 6 && (
            <StepGoal selected={selectedGoal} onSelect={setSelectedGoal} />
          )}
        </div>

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={() => step > 1 && goTo(step - 1)}
            disabled={step === 1}
            className="min-h-[44px] min-w-[44px] rounded-sm border border-line px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            ← Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canNext()}
            className="min-h-[44px] min-w-[100px] rounded-sm border border-ink bg-ink px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-paper transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {step === TOTAL_STEPS_WITH_INTRO ? "Build passport →" : "Next →"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}

/* ── Step components ── */

function StepHeading({
  number,
  question,
}: {
  number: number;
  question: string;
}) {
  const { t } = useI18n();
  return (
    <div className="mb-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cobalt">
        {t(`onboarding.step${number}.question_label`, `Question ${number}`)}
      </div>
      <h2 className="mt-2 font-display text-2xl font-black leading-tight text-ink md:text-3xl">
        {question}
      </h2>
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] w-full cursor-pointer rounded-sm border p-4 text-left transition-all ${
        selected
          ? "border-ink bg-paper shadow-[4px_4px_0_0_var(--ink)]"
          : "border-line bg-card hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}

/* Step 1: Work activity */
function StepWork({
  selected,
  onSelect,
  llmConfirmed,
  llmLabel,
  onLlmConfirm,
  currentCountry,
}: {
  selected: string | null;
  onSelect: (v: string) => void;
  llmConfirmed: boolean;
  llmLabel: string;
  onLlmConfirm: (isco08: string, label: string, skills: string[]) => void;
  currentCountry: string;
}) {
  const { t } = useI18n();
  return (
    <div>
      <StepHeading
        number={1}
        question={t('onboarding.step1.title', 'What do you spend most of your working time doing?')}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {WORK_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.label}
            selected={selected === opt.label}
            onClick={() => onSelect(opt.label)}
          >
            <div className="text-xl">{opt.icon}</div>
            <div className="mt-1 text-sm font-medium leading-snug">
              {opt.label}
            </div>
          </OptionCard>
        ))}
      </div>
      {selected === "Something else" && !llmConfirmed && (
        <LlmInput country={currentCountry} onConfirm={onLlmConfirm} />
      )}
      {selected === "Something else" && llmConfirmed && (
        <div className="mt-4 rounded-sm border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-800">
            ✓ Matched: <strong>{llmLabel}</strong>
          </p>
          <button
            type="button"
            onClick={() => onLlmConfirm("", "", [])}
            className="mt-1 text-xs text-emerald-600 underline hover:text-emerald-800"
          >
            Change
          </button>
        </div>
      )}
    </div>
  );
}

/* Step 2: Education */
function StepEducation({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (v: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <StepHeading
        number={2}
        question={t('onboarding.step2.title', 'What is your highest level of education?')}
      />
      <div className="grid gap-3">
        {EDUCATION_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.code}
            selected={selected === opt.code}
            onClick={() => onSelect(opt.code)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{opt.label}</span>
              <span
                className="font-mono text-[9px] text-muted-foreground/50"
                title={`ISCED level ${opt.isced}`}
              >
                L{opt.isced}
              </span>
            </div>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

/* Step 3: Informal skills (multi-select) */
function StepInformalSkills({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (skill: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <StepHeading
        number={3}
        question={t('onboarding.step3.title', 'Have you taught yourself any skills?')}
      />
      <p className="mb-4 text-sm text-muted-foreground">
        Select all that apply.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {INFORMAL_SKILLS_OPTIONS.map((skill) => {
          const isSelected = selected.includes(skill);
          return (
            <button
              key={skill}
              type="button"
              onClick={() => onToggle(skill)}
              className={`flex min-h-[44px] items-center gap-3 rounded-sm border p-4 text-left transition-all ${
                isSelected
                  ? "border-ink bg-paper shadow-[4px_4px_0_0_var(--ink)]"
                  : "border-line bg-card hover:border-ink"
              }`}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                  isSelected
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-paper"
                }`}
              >
                {isSelected && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium">{skill}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Step 4: Experience years */
function StepExperience({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (v: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <StepHeading
        number={4}
        question={t('onboarding.step4.title', 'How many years have you been doing your main work?')}
      />
      {/* Visual timeline — also acts as the selector */}
      <div className="flex items-start justify-between gap-2 px-2">
        {EXPERIENCE_OPTIONS.map((opt, i) => (
          <div key={opt.value} className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => onSelect(opt.value)}
              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                selected === opt.value
                  ? "border-cobalt bg-cobalt text-paper scale-110"
                  : "border-line bg-paper text-muted-foreground hover:border-ink"
              }`}
            >
              {i + 1}
            </button>
            <span className="mt-2 text-center text-xs text-muted-foreground max-w-[70px]">
              {opt.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Step 5: Goal */
function StepGoal({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (v: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <StepHeading
        number={5}
        question={t('onboarding.step5.title', 'What are you most hoping to do?')}
      />
      <div className="grid gap-3">
        {GOAL_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.label}
            selected={selected === opt.label}
            onClick={() => onSelect(opt.label)}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{opt.icon}</span>
              <span className="text-sm font-medium">{opt.label}</span>
            </div>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

/* Step 0: Name + age */
function StepIntro({
  name,
  age,
  onName,
  onAge,
}: {
  name: string;
  age: string;
  onName: (v: string) => void;
  onAge: (v: string) => void;
}) {
  const ageNum = age === "" ? null : Number(age);
  const ageInvalid = age !== "" && (!/^\d{1,3}$/.test(age) || ageNum! < 10 || ageNum! > 99);
  return (
    <div>
      <StepHeading number={1} question="First — what should we call you?" />
      <p className="mb-6 text-sm text-muted-foreground">
        We&rsquo;ll use your name across your passport and on the report you can download.
      </p>
      <div className="space-y-5">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Your name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => onName(e.target.value.slice(0, 60))}
            maxLength={60}
            autoComplete="given-name"
            placeholder="e.g. Amara"
            className="mt-2 block w-full min-h-[44px] rounded-sm border border-line bg-paper px-4 py-2.5 text-base font-medium text-ink placeholder:text-muted-foreground/50 focus:border-ink focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Your age
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={10}
            max={99}
            value={age}
            onChange={(e) => onAge(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
            placeholder="e.g. 22"
            className="mt-2 block w-full min-h-[44px] max-w-[140px] rounded-sm border border-line bg-paper px-4 py-2.5 text-base font-medium text-ink placeholder:text-muted-foreground/50 focus:border-ink focus:outline-none"
          />
          {ageInvalid && (
            <span className="mt-1 block text-xs text-rust">
              Please enter an age between 10 and 99.
            </span>
          )}
        </label>
      </div>
    </div>
  );
}
