/**
 * PropertyLedge Premium Radial Theme Reveal Transition
 *
 * Smooth 60fps radial expansion originating from the clicked toggle button
 * using the View Transitions API with CSS transition suppression to eliminate jitter.
 */

export type ThemeMode = "light" | "dark" | "full-light" | "full-dark";

export interface ThemeTransitionOptions {
  originElement?: HTMLElement | null;
  targetMode?: ThemeMode;
  targetDark?: boolean;
  onComplete?: () => void;
}

let isTransitioning = false;

export function isThemeTransitionActive(): boolean {
  return isTransitioning;
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") return;

  // Set the data attribute on html element
  document.documentElement.setAttribute("data-theme-mode", mode);
  localStorage.setItem("propertyledge_theme", mode);

  // Determine if main content is dark (dark or full-dark)
  const isMainDark = mode === "dark" || mode === "full-dark";
  if (isMainDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export async function executeThemeTransition({
  originElement,
  targetMode,
  targetDark,
  onComplete,
}: ThemeTransitionOptions): Promise<void> {
  if (isTransitioning) return;

  const resolvedMode: ThemeMode = targetMode || (targetDark ? "dark" : "light");

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Fallback for SSR or environments without View Transitions or with reduced motion
  if (
    typeof document === "undefined" ||
    prefersReducedMotion ||
    !(document as any).startViewTransition
  ) {
    applyThemeMode(resolvedMode);
    window.dispatchEvent(new Event("theme-change"));
    onComplete?.();
    return;
  }

  isTransitioning = true;
  // Suppress all intermediate CSS color transitions so the browser captures pristine snapshots
  document.documentElement.classList.add("theme-transitioning");

  try {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (originElement) {
      const rect = originElement.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Start View Transition
    const transition = (document as any).startViewTransition(() => {
      applyThemeMode(resolvedMode);
    });

    await transition.ready;

    // Animate the incoming view transition element with an expanding circular clip path
    const clipPathKeyframes = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ];

    const animation = document.documentElement.animate(
      {
        clipPath: clipPathKeyframes,
      },
      {
        duration: 650,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
        pseudoElement: "::view-transition-new(root)",
      }
    );

    await animation.finished;
    await transition.finished;
  } catch {
    // If any error occurs in the transition animation, ensure theme is still applied
    applyThemeMode(resolvedMode);
  } finally {
    document.documentElement.classList.remove("theme-transitioning");
    isTransitioning = false;
    window.dispatchEvent(new Event("theme-change"));
    onComplete?.();
  }
}
