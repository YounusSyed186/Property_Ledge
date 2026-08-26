export type WorkspacePhase = 'expanded' | 'collapsing' | 'compact' | 'restoring';

const COLLAPSE_THRESHOLD = 80;
const RESTORE_THRESHOLD = 30;
const MAX_EFFECTIVE = 100;

export interface WorkspaceSnapshot {
  bodyScrollTop: number;
  wheelAccumulator: number;
  effectiveScroll: number;
  progress: number;
  phase: WorkspacePhase;
  isCompact: boolean;
}

function computeEffectiveScroll(bodyScrollTop: number, wheelAccumulator: number): number {
  return Math.min(MAX_EFFECTIVE, bodyScrollTop + wheelAccumulator);
}

function computeProgress(effective: number): number {
  return Math.min(1, Math.max(0, effective / MAX_EFFECTIVE));
}

function computePhase(
  effective: number,
  latchedCompact: boolean
): { phase: WorkspacePhase; latchedCompact: boolean } {
  if (latchedCompact) {
    if (effective < RESTORE_THRESHOLD) {
      return {
        phase: effective <= 0 ? 'expanded' : 'restoring',
        latchedCompact: false,
      };
    }
    return { phase: 'compact', latchedCompact: true };
  }

  if (effective <= 0) return { phase: 'expanded', latchedCompact: false };
  if (effective >= COLLAPSE_THRESHOLD) return { phase: 'compact', latchedCompact: true };
  if (effective < RESTORE_THRESHOLD) return { phase: 'expanded', latchedCompact: false };
  return { phase: 'collapsing', latchedCompact: false };
}

function buildSnapshot(
  bodyScrollTop: number,
  wheelAccumulator: number,
  latchedCompact: boolean
): { snapshot: WorkspaceSnapshot; latchedCompact: boolean } {
  const effectiveScroll = computeEffectiveScroll(bodyScrollTop, wheelAccumulator);
  const { phase, latchedCompact: nextLatched } = computePhase(effectiveScroll, latchedCompact);
  const progress = nextLatched
    ? Math.max(computeProgress(effectiveScroll), computeProgress(COLLAPSE_THRESHOLD))
    : computeProgress(effectiveScroll);
  return {
    latchedCompact: nextLatched,
    snapshot: {
      bodyScrollTop,
      wheelAccumulator,
      effectiveScroll,
      progress,
      phase,
      isCompact: phase === 'compact' || (phase === 'collapsing' && progress > 0.6),
    },
  };
}

const DISABLED_SNAPSHOT: WorkspaceSnapshot = {
  bodyScrollTop: 0,
  wheelAccumulator: 0,
  effectiveScroll: 0,
  progress: 0,
  phase: 'expanded',
  isCompact: false,
};

function snapshotsEqual(a: WorkspaceSnapshot, b: WorkspaceSnapshot): boolean {
  return (
    a.bodyScrollTop === b.bodyScrollTop &&
    a.wheelAccumulator === b.wheelAccumulator &&
    a.effectiveScroll === b.effectiveScroll &&
    a.progress === b.progress &&
    a.phase === b.phase &&
    a.isCompact === b.isCompact
  );
}

export function createCollapsibleWorkspaceStore(enabled: boolean) {
  let bodyScrollTop = 0;
  let wheelAccumulator = 0;
  let latchedCompact = false;
  let cachedSnapshot: WorkspaceSnapshot = enabled
    ? buildSnapshot(0, 0, false).snapshot
    : DISABLED_SNAPSHOT;
  const listeners = new Set<() => void>();

  const notify = () => {
    listeners.forEach((l) => l());
  };

  const getSnapshot = (): WorkspaceSnapshot => {
    if (!enabled) return DISABLED_SNAPSHOT;
    return cachedSnapshot;
  };

  const commitValues = (nextScrollTop: number, nextWheel: number) => {
    const built = buildSnapshot(nextScrollTop, nextWheel, latchedCompact);
    latchedCompact = built.latchedCompact;
    const next = built.snapshot;
    if (snapshotsEqual(cachedSnapshot, next)) return;
    bodyScrollTop = next.bodyScrollTop;
    wheelAccumulator = next.wheelAccumulator;
    cachedSnapshot = next;
    notify();
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot,
    reportBodyScroll(scrollTop: number) {
      if (!enabled) return;
      const nextScrollTop = Math.max(0, scrollTop);
      let nextWheel = wheelAccumulator;

      // With pagination, scrollTop is often 0 — only clear wheel when not latched compact.
      if (nextScrollTop === 0 && nextWheel < 5 && !latchedCompact) {
        nextWheel = 0;
      }

      // Real body scroll past threshold should latch compact; at top restores when unlatched.
      if (nextScrollTop === 0 && latchedCompact && nextWheel === 0) {
        latchedCompact = false;
      }

      commitValues(nextScrollTop, nextWheel);
    },
    reportWheelDelta(deltaY: number) {
      if (!enabled) return;
      let nextWheel = wheelAccumulator;
      if (deltaY > 0) {
        nextWheel = Math.min(MAX_EFFECTIVE, nextWheel + deltaY * 0.35);
      } else if (deltaY < 0) {
        nextWheel = Math.max(0, nextWheel + deltaY * 0.35);
      }
      commitValues(bodyScrollTop, nextWheel);
    },
    reset() {
      latchedCompact = false;
      commitValues(0, 0);
    },
  };
}

export type CollapsibleWorkspaceStore = ReturnType<typeof createCollapsibleWorkspaceStore>;
