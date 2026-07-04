import { useState, useEffect, useRef, useCallback } from "react";
import { buildPool, pickMessage } from "@/lib/creapdMessages";

/**
 * CREAPD message rotation hook.
 *
 * Returns the current CREAPD personality message, fading between a fresh pool
 * every 2–4 seconds. The same message never repeats back-to-back.
 *
 * @param {object} opts
 * @param {string|null} opts.profile — active production profile key (news, talk, etc.)
 * @param {number} opts.minInterval — minimum rotation interval in ms (default 2000)
 * @param {number} opts.maxInterval — maximum rotation interval in ms (default 4000)
 * @param {boolean} opts.active — whether rotation is running (default true)
 * @returns {{ message: string, key: number }}
 */
export function useCreapdMessage({ profile = null, minInterval = 2000, maxInterval = 4000, active = true } = {}) {
  const poolRef = useRef(buildPool(profile));
  const [message, setMessage] = useState(() => pickMessage(poolRef.current));
  const [key, setKey] = useState(0);

  // Rebuild the pool when the production profile changes.
  useEffect(() => {
    poolRef.current = buildPool(profile);
    const next = pickMessage(poolRef.current);
    setMessage(next);
    setKey((k) => k + 1);
  }, [profile]);

  useEffect(() => {
    if (!active) return undefined;

    let timeoutId;
    let lastMessage = message;

    const scheduleNext = () => {
      const delay = minInterval + Math.random() * (maxInterval - minInterval);
      timeoutId = setTimeout(() => {
        const next = pickMessage(poolRef.current, lastMessage);
        lastMessage = next;
        setMessage(next);
        setKey((k) => k + 1);
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, minInterval, maxInterval]);

  return { message, key };
}