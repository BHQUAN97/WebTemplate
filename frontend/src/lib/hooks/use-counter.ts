'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counter animation hook — count up khi element visible.
 * Dùng: const { ref, count } = useCounter({ end: 1000, duration: 2000 })
 */
export function useCounter({
  end,
  duration = 2000,
  start = 0,
}: {
  end: number;
  duration?: number;
  start?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [count, setCount] = useState(start);
  const hasStarted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted.current) {
          hasStarted.current = true;
          observer.disconnect();

          if (prefersReduced) { setCount(end); return; }

          const startTime = performance.now();
          const range = end - start;

          const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(start + range * eased));
            if (progress < 1) requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration, start]);

  return { ref, count };
}
