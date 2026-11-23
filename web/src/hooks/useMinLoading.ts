import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Session-wide shimmer gate.
 * `true` once ANY page has finished its first load in this session.
 * After that, subsequent pages skip the skeleton entirely.
 */
let hasShimmered = false;
const subscribers = new Set<() => void>();

function markShimmered() {
  if (hasShimmered) return;
  hasShimmered = true;
  subscribers.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

export function useMinLoading(minMs = 400) {
  // Loading is only true if the session hasn't shimmered yet.
  const [loading, setLoading] = useState(!hasShimmered);
  const startedAt = useRef<number>(Date.now());
  const timeoutRef = useRef<number | undefined>(undefined);

  // Resync with the global flag when it flips (e.g. another page finished first)
  useEffect(() => {
    return subscribe(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading) startedAt.current = Date.now();
  }, [loading]);

  const start = useCallback(() => {
    if (hasShimmered) {
      // Skip skeleton entirely — the caller will just render current data
      setLoading(false);
      return;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    startedAt.current = Date.now();
    setLoading(true);
  }, []);

  const stop = useCallback(() => {
    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(0, minMs - elapsed);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setLoading(false);
      markShimmered();
      timeoutRef.current = undefined;
    }, remaining);
  }, [minMs]);

  return { loading, start, stop };
}

export function resetShimmer() {
  hasShimmered = false;
}