'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOnboarding } from '@/lib/hooks/use-onboarding';

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TourStep {
  /** CSS selector xac dinh element highlight (khong can voi placement='center') */
  target: string;
  /** Tieu de tooltip */
  title: string;
  /** Noi dung mo ta */
  content: string;
  /** Vi tri tooltip so voi target */
  placement?: TourPlacement;
  /** Callback chay khi bat dau step (vd: mo menu) */
  action?: () => void;
}

interface OnboardingTourProps {
  steps: TourStep[];
  storageKey: string;
  onComplete?: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8; // padding quanh highlight
const GAP = 12; // khoang cach tooltip voi target

/**
 * Reset trang thai hoan thanh tour theo storageKey (dung de test/xem lai)
 */
export function resetTour(storageKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

/**
 * Onboarding Tour component — custom implementation tuong thich React 19.
 * Render overlay toi + khoet lo highlight quanh target + tooltip huong dan.
 */
export function OnboardingTour({ steps, storageKey, onComplete }: OnboardingTourProps) {
  const { shouldShow, ready, markComplete } = useOnboarding(storageKey);
  const [mounted, setMounted] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [rect, setRect] = React.useState<Rect | null>(null);
  const [viewport, setViewport] = React.useState({ w: 0, h: 0 });

  // Mount portal
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Kich hoat tour khi cac dieu kien san sang
  React.useEffect(() => {
    if (ready && shouldShow && steps.length > 0) {
      setActive(true);
      setIndex(0);
    }
  }, [ready, shouldShow, steps.length]);

  const currentStep = steps[index];

  // Ket thuc tour (skip hoac finish)
  const finish = React.useCallback(
    (isComplete: boolean) => {
      setActive(false);
      markComplete();
      if (isComplete) {
        onComplete?.();
      }
    },
    [markComplete, onComplete],
  );

  const goNext = React.useCallback(() => {
    if (index >= steps.length - 1) {
      finish(true);
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, steps.length, finish]);

  const goBack = React.useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Chay action neu co khi sang step moi
  React.useEffect(() => {
    if (!active || !currentStep) return;
    currentStep.action?.();
  }, [active, currentStep]);

  // Tinh vi tri target element, auto-scroll va re-measure khi resize
  React.useEffect(() => {
    if (!active || !currentStep) return;

    const isCenter = currentStep.placement === 'center';

    function updateViewport() {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    }

    function measure() {
      updateViewport();
      if (isCenter) {
        setRect(null);
        return;
      }
      const el = document.querySelector<HTMLElement>(currentStep.target);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }

    // Scroll target vao viewport truoc khi do
    if (!isCenter) {
      const el = document.querySelector<HTMLElement>(currentStep.target);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }

    const t = window.setTimeout(measure, 300); // cho scroll xong
    measure();

    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, currentStep, index]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, goNext, goBack, finish]);

  if (!mounted || !active || !currentStep) return null;

  const isCenter = currentStep.placement === 'center' || !rect;
  const placement: TourPlacement = isCenter ? 'center' : (currentStep.placement ?? 'bottom');

  // Tinh vi tri tooltip
  const tooltipStyle = computeTooltipStyle(placement, rect, viewport);

  // Highlight box toa do (voi padding)
  const hi = rect
    ? {
        x: Math.max(0, rect.left - PAD),
        y: Math.max(0, rect.top - PAD),
        w: rect.width + PAD * 2,
        h: rect.height + PAD * 2,
      }
    : null;

  const isLast = index === steps.length - 1;
  const isFirst = index === 0;

  const overlay = (
    <div
      className="fixed inset-0 z-[9998] pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      {/* SVG mask khoet lo highlight — backdrop 50% opacity */}
      <svg
        className="absolute inset-0 h-full w-full"
        width="100%"
        height="100%"
        onClick={() => finish(false)}
      >
        <defs>
          <mask id={`onboarding-mask-${storageKey}`}>
            <rect width="100%" height="100%" fill="white" />
            {hi && (
              <rect
                x={hi.x}
                y={hi.y}
                width={hi.w}
                height={hi.h}
                rx={8}
                ry={8}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask={`url(#onboarding-mask-${storageKey})`}
        />
      </svg>

      {/* Vien sang quanh highlight */}
      {hi && (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent transition-all duration-200"
          style={{
            top: hi.y,
            left: hi.x,
            width: hi.w,
            height: hi.h,
          }}
        />
      )}

      {/* Tooltip / popover */}
      <div
        className={cn(
          'absolute w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-2xl',
          'dark:border-gray-800 dark:bg-gray-900',
          'transition-[top,left,transform] duration-200',
        )}
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close (Skip) */}
        <button
          type="button"
          onClick={() => finish(false)}
          className="absolute right-3 top-3 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Bo qua huong dan"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress */}
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
          Buoc {index + 1}/{steps.length}
        </p>

        {/* Title + content */}
        <h3
          id="onboarding-title"
          className="mb-2 pr-6 text-base font-semibold text-gray-900 dark:text-gray-50"
        >
          {currentStep.title}
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {currentStep.content}
        </p>

        {/* Progress bar */}
        <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-blue-600 transition-all duration-300 dark:bg-blue-500"
            style={{ width: `${((index + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => finish(false)}
          >
            Bo qua
          </Button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goBack}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Quay lai
              </Button>
            )}
            <Button type="button" size="sm" onClick={goNext}>
              {isLast ? (
                <>
                  Hoan tat
                  <Check className="ml-1 h-4 w-4" />
                </>
              ) : (
                <>
                  Tiep
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

/**
 * Tinh vi tri tooltip dua vao placement va bounding rect cua target.
 * Dam bao tooltip nam trong viewport.
 */
function computeTooltipStyle(
  placement: TourPlacement,
  rect: Rect | null,
  viewport: { w: number; h: number },
): React.CSSProperties {
  // Center modal khi khong co target
  if (placement === 'center' || !rect) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const tooltipW = Math.min(384, viewport.w - 32); // max-w-sm = 24rem = 384px
  const tooltipH = 240; // uoc tinh
  const margin = 16;

  let top = 0;
  let left = 0;

  switch (placement) {
    case 'top':
      top = rect.top - tooltipH - GAP;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    case 'bottom':
      top = rect.top + rect.height + GAP;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left - tooltipW - GAP;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left + rect.width + GAP;
      break;
  }

  // Clamp vao viewport
  left = Math.max(margin, Math.min(left, viewport.w - tooltipW - margin));
  top = Math.max(margin, Math.min(top, viewport.h - tooltipH - margin));

  return { top, left };
}
