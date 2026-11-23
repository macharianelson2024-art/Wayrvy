import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./AuthLayout";

const TARGET_BALANCE = 48500;

const TAGLINES = [
  "Save towards what matters.",
  "One deposit at a time.",
  "Withdraw straight to M-PESA.",
];

const GOALS = [
  { name: "Laptop", target: 64 },
  { name: "Emergency fund", target: 42 },
];

// tagline timing (ms)
const OUT_MS = 450;
const GAP_MS = 200;
const IN_MS = 450;
const HOLD_MS = 3000;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type TaglineState = "visible" | "exiting" | "hidden" | "entering";

interface BrandPanelProps {
  leaving?: boolean;
}

export function BrandPanel({ leaving = false }: BrandPanelProps) {
  const reduced = useRef(prefersReducedMotion());

  const [balance, setBalance] = useState(0);
  const [progress, setProgress] = useState<number[]>([0, 0]);

  const [tagIdx, setTagIdx] = useState(0);
  const [tagState, setTagState] = useState<TaglineState>("visible");

  // ---- balance counter ----
  useEffect(() => {
    if (reduced.current) {
      setBalance(TARGET_BALANCE);
      return;
    }
    let raf = 0;
    let start = 0;
    const duration = 1800;

    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setBalance(Math.round(TARGET_BALANCE * eased));

      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        let drift = TARGET_BALANCE;
        const driftEnd = performance.now() + 6000;
        const driftStep = () => {
          if (document.hidden) {
            raf = requestAnimationFrame(driftStep);
            return;
          }
          drift += 1;
          setBalance(drift);
          if (performance.now() < driftEnd) {
            raf = requestAnimationFrame(driftStep);
          } else {
            setBalance(0);
            start = 0;
            raf = requestAnimationFrame(step);
          }
        };
        raf = requestAnimationFrame(driftStep);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---- progress bars ----
  useEffect(() => {
    if (reduced.current) {
      setProgress(GOALS.map((g) => g.target));
      return;
    }
    const t = setTimeout(() => setProgress(GOALS.map((g) => g.target)), 300);
    const breathe = setInterval(() => {
      if (document.hidden) return;
      setProgress(
        GOALS.map((g, i) => {
          const wobble = Math.sin(Date.now() / 900 + i * 1.3) * 3;
          return Math.max(0, Math.min(100, g.target + wobble));
        })
      );
    }, 60);
    return () => {
      clearTimeout(t);
      clearInterval(breathe);
    };
  }, []);

  // ---- tagline sequential state machine ----
  useEffect(() => {
    if (reduced.current) return;

    let cancelled = false;
    let timer: number | undefined;

    const next = (fn: () => void, ms: number) => {
      timer = window.setTimeout(() => {
        if (!cancelled && !document.hidden) fn();
      }, ms);
    };

    const runFromVisible = () => {
      next(() => {
        setTagState("exiting");
        next(() => {
          setTagState("hidden");
          next(() => {
            setTagIdx((i) => (i + 1) % TAGLINES.length);
            requestAnimationFrame(() => {
              if (cancelled) return;
              requestAnimationFrame(() => {
                if (cancelled) return;
                setTagState("entering");
                next(() => {
                  setTagState("visible");
                  next(runFromVisible, HOLD_MS);
                }, IN_MS);
              });
            });
          }, GAP_MS);
        }, OUT_MS);
      }, HOLD_MS);
    };

    runFromVisible();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const taglineClass =
    "absolute inset-0 transition-all ease-out " +
    (tagState === "visible"
      ? "duration-0 opacity-100 translate-y-0"
      : tagState === "exiting"
      ? "duration-[450ms] opacity-0 -translate-y-3"
      : tagState === "hidden"
      ? "duration-0 opacity-0 translate-y-3"
      : "duration-[450ms] opacity-100 translate-y-0");

  return (
    <div
      className={[
        "relative w-full bg-brand text-white overflow-hidden",
        "transition-all duration-[600ms] ease-out will-change-transform",
        leaving
          ? "opacity-0 translate-x-6 scale-[0.985]"
          : "opacity-100 translate-x-0 scale-100",
      ].join(" ")}
    >
      <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-white/5 blur-2xl animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl" />

      <div className="relative h-full flex flex-col p-10 xl:p-14">
        <div className="flex items-center gap-3">
          <div className="rounded-[10px] bg-white/10 ring-1 ring-white/20 h-10 w-10 grid place-items-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z"
                stroke="white"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">Wayrvy</span>
        </div>

        <div className="mt-auto">
          <h1 className="relative text-3xl xl:text-4xl font-semibold leading-tight tracking-tight h-[2.4em] xl:h-[2.6em] overflow-hidden">
            <span key={tagIdx} className={taglineClass}>
              {TAGLINES[tagIdx]}
            </span>
          </h1>

          <p className="mt-3 text-white/70 text-sm max-w-sm">
            Your savings are safe and growing steadily — with withdrawals straight to M-PESA.
          </p>

          <div className="mt-8 rounded-2xl bg-white/[0.07] ring-1 ring-white/10 backdrop-blur p-5">
            <div className="text-[11px] uppercase tracking-wide text-white/50">Total saved</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              KES {balance.toLocaleString("en-KE")}
            </div>
            <div className="mt-4 space-y-2.5">
              {GOALS.map((g, i) => (
                <div key={g.name}>
                  <div className="flex justify-between text-[11px] text-white/60 mb-1">
                    <span>{g.name}</span>
                    <span className="tabular-nums">{Math.round(progress[i])}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/80 transition-[width] duration-700 ease-out"
                      style={{ width: `${progress[i]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-[11px] text-white/50">
            Every transaction is recorded and confirmed by M-PESA.
          </p>
        </div>

        <div className="mt-10 flex items-center gap-2 text-[11px] text-white/40">
          <BrandMark size={16} />
          <span>© {new Date().getFullYear()} Wayrvy</span>
        </div>
      </div>
    </div>
  );
}