import { useState, useRef, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { CountryPill } from "./country-pill";
import { LanguageSwitcher } from "./language-switcher";

/* ─── Nav structure ────────────────────────────────────────────────────── */

interface NavSection {
  label: string;
  items: { to: string; label: string }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Youth Tools",
    items: [
      { to: "/passport", label: "Skills Passport" },
      { to: "/results", label: "Results" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { to: "/policymaker", label: "Policymaker" },
      { to: "/compare", label: "Compare" },
      { to: "/education", label: "Education" },
      { to: "/crosswalk", label: "Crosswalk" },
      { to: "/coverage", label: "Coverage" },
    ],
  },
  {
    label: "About",
    items: [
      { to: "/infrastructure", label: "Infrastructure" },
      { to: "/methodology", label: "Methodology" },
    ],
  },
];

const ALL_LINKS = NAV_SECTIONS.flatMap((s) => s.items);

/* ─── Desktop Dropdown ─────────────────────────────────────────────────── */

function NavDropdown({
  section,
  currentPath,
}: {
  section: NavSection;
  currentPath: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasActive = section.items.some((i) => currentPath.startsWith(i.to));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 whitespace-nowrap px-3 py-4 text-sm font-medium transition-colors ${
          hasActive ? "text-ink" : "text-ink/70 hover:text-ink"
        }`}
      >
        {section.label}
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        {hasActive && (
          <span className="absolute inset-x-3 bottom-0 h-0.5 bg-cobalt" />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 min-w-[180px] border border-line bg-paper py-1 shadow-lg">
          {section.items.map((item) => {
            const active = currentPath.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-cobalt/5 font-semibold text-cobalt"
                    : "text-ink/80 hover:bg-cobalt/5 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Mobile Drawer ────────────────────────────────────────────────────── */

function MobileDrawer({
  open,
  onClose,
  currentPath,
}: {
  open: boolean;
  onClose: () => void;
  currentPath: string;
}) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-72 transform bg-paper shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <span className="font-display text-lg font-black">Menu</span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center text-ink/70 hover:text-ink"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="overflow-y-auto px-3 py-4">
          {/* Home */}
          <Link
            to="/"
            onClick={onClose}
            className={`block rounded px-3 py-2.5 text-sm font-medium ${
              currentPath === "/"
                ? "bg-cobalt/10 text-cobalt"
                : "text-ink/70 hover:text-ink"
            }`}
          >
            Home
          </Link>

          {/* Demo */}
          <Link
            to="/demo"
            onClick={onClose}
            className={`block rounded px-3 py-2.5 text-sm font-medium ${
              currentPath === "/demo"
                ? "bg-cobalt/10 text-cobalt"
                : "text-ink/70 hover:text-ink"
            }`}
          >
            🎬 Demo
          </Link>

          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mt-4">
              <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {section.label}
              </div>
              {section.items.map((item) => {
                const active = currentPath.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={`mt-0.5 block rounded px-3 py-2.5 text-sm font-medium ${
                      active
                        ? "bg-cobalt/10 text-cobalt"
                        : "text-ink/70 hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Country, language & view mode in drawer */}
          <div className="mt-6 border-t border-line pt-4">
            <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Settings
            </div>
            <div className="mt-2 space-y-2 px-2">
              <div className="[&_label]:border-ink/20 [&_label]:text-ink [&_select]:text-ink">
                <CountryPill />
              </div>
              <LanguageSwitcher variant="full" />
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}

/* ─── SiteNav ──────────────────────────────────────────────────────────── */

/* ─── SiteNav ──────────────────────────────────────────────────────────── */

export function SiteNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full overflow-x-clip">
      {/* Cyan brand bar */}
      <div className="bg-cobalt">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
          <Link
            to="/"
            className="flex min-w-0 shrink-0 items-center gap-3 text-paper"
          >
            <span className="font-display text-xl font-black tracking-tight md:text-2xl">
              unmapped
            </span>
            <span className="hidden h-6 w-px bg-paper/40 md:block" />
            <span className="hidden text-sm font-medium tracking-wide text-paper/95 md:inline">
              for every young person
            </span>
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Desktop controls */}
            <div className="hidden items-center gap-2 md:flex">
              <CountryPill />
              <LanguageSwitcher variant="compact" />
            </div>
            <Link
              to="/demo"
              className="hidden rounded-none border-2 border-paper px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-paper hover:text-cobalt md:inline-block"
            >
              🎬 Demo
            </Link>
            <Link
              to="/passport"
              className="shrink-0 whitespace-nowrap rounded-none bg-paper px-3 py-2 text-xs font-semibold text-cobalt hover:bg-ink hover:text-paper md:px-5 md:text-sm"
            >
              Get started
            </Link>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center text-paper md:hidden"
              aria-label="Open menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop nav bar */}
      <div className="hidden border-b border-line bg-paper md:block">
        <div className="mx-auto flex max-w-[1400px] items-center gap-1 px-4 md:px-6">
          <Link
            to="/"
            className={`relative shrink-0 whitespace-nowrap px-3 py-4 text-sm font-medium transition-colors ${
              path === "/" ? "text-ink" : "text-ink/70 hover:text-ink"
            }`}
          >
            Home
            {path === "/" && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 bg-cobalt" />
            )}
          </Link>

          {NAV_SECTIONS.map((section) => (
            <NavDropdown
              key={section.label}
              section={section}
              currentPath={path}
            />
          ))}
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        currentPath={path}
      />
    </header>
  );
}

/* ─── SiteFooter (unchanged from original) ─────────────────────────────── */

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="bg-cobalt">
        <div className="mx-auto max-w-[1400px] px-6 py-6">
          <div className="font-display text-2xl font-black">
            unmapped{" "}
            <span className="font-normal text-paper/80">
              | for every young person
            </span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-paper/50">
              About
            </div>
            <p className="mt-2 max-w-xs text-sm text-paper/80">
              An open infrastructure layer for mapping informal talent to real
              economic opportunity. Built for the World Bank Youth Summit ×
              Hack-Nation 2026.
            </p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-paper/50">
              Data sources
            </div>
            <ul className="mt-2 space-y-1 text-sm text-paper/80">
              <li>ESCO · O*NET skill taxonomies</li>
              <li>Frey &amp; Osborne automation scores</li>
              <li>ILO task indices · World Bank STEP</li>
              <li>Wittgenstein Centre 2025–2035 projections</li>
              <li>ITU DataHub · WBES Employment</li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-paper/50">
              Principle
            </div>
            <p className="mt-2 text-sm text-paper/80">
              Country parameters are{" "}
              <span className="font-semibold text-paper">inputs</span>, never
              hardcoded. The same code runs an Accra repair stall and a Khulna
              rice cooperative.
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
