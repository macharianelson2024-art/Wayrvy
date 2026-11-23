import { useEffect, useState } from "react";

const EXIT_MS = 200;

export function useModalTransition(open: boolean) {
  const [mounted, setMounted] = useState(open);
  const [state, setState] = useState<"open" | "closed">(open ? "open" : "closed");

  useEffect(() => {
    if (open) {
      setMounted(true);
      // next frame → "open" so the enter animation runs
      const raf = requestAnimationFrame(() => setState("open"));
      return () => cancelAnimationFrame(raf);
    }

    if (mounted) {
      setState("closed");
      const t = window.setTimeout(() => setMounted(false), EXIT_MS);
      return () => window.clearTimeout(t);
    }
  }, [open, mounted]);

  return { mounted, state };
}