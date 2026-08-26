export const ONBOARDING_STAGES = [
  { id: 'welcome', path: '/onboarding', label: 'Welcome' },
  { id: 'workspace', path: '/onboarding/workspace', label: 'Workspace' },
  { id: 'subscription', path: '/onboarding/subscription', label: 'Subscription' },
  { id: 'property', path: '/onboarding/property', label: 'Property' },
  { id: 'ready', path: '/onboarding/complete', label: 'Ready' },
] as const;

export type OnboardingStage = (typeof ONBOARDING_STAGES)[number]['id'];

/** Internal sub-routes not shown in the 4-stage rail */
export const ONBOARDING_SUB_ROUTES = {
  plans: '/onboarding/plans',
  payment: '/onboarding/payment',
} as const;

export interface OnboardingProgress {
  currentStage: OnboardingStage;
  completedStages: OnboardingStage[];
  data: Record<string, unknown>;
}

export const DEFAULT_ONBOARDING_PROGRESS: OnboardingProgress = {
  currentStage: 'welcome',
  completedStages: [],
  data: {},
};

export type BusinessType = 'property_management' | 'property_owner' | 'real_estate_operations';

export type StartMode = 'explore' | 'trial' | 'paid' | 'free';

export function getStageIndex(stage: OnboardingStage): number {
  return ONBOARDING_STAGES.findIndex((s) => s.id === stage);
}

export function getStageByPath(pathname: string) {
  if (pathname.startsWith('/onboarding/plans')) {
    return { id: 'subscription' as OnboardingStage, path: '/onboarding/plans', label: 'Plans' };
  }
  if (pathname.startsWith('/onboarding/payment')) {
    return { id: 'subscription' as OnboardingStage, path: '/onboarding/payment', label: 'Payment' };
  }
  return ONBOARDING_STAGES.find((s) => s.path === pathname) ?? ONBOARDING_STAGES[0];
}

/** Progress steps exclude welcome — user sees 4 meaningful stages */
export const PROGRESS_STAGES = ONBOARDING_STAGES.filter((s) => s.id !== 'welcome');

export function getProgressStepFromPath(pathname: string): {
  current: number;
  total: number;
  label: string;
  stageId: OnboardingStage;
} {
  const stage = getStageByPath(pathname);
  const stageId = stage.id;

  if (stageId === 'welcome') {
    return { current: 0, total: PROGRESS_STAGES.length, label: 'Welcome', stageId };
  }

  const index = PROGRESS_STAGES.findIndex((s) => s.id === stageId);
  const current = index >= 0 ? index + 1 : 1;

  let label: string = PROGRESS_STAGES[index]?.label ?? stage.label;
  if (pathname.startsWith('/onboarding/plans')) label = 'Choose plan';
  if (pathname.startsWith('/onboarding/payment')) label = 'Payment';

  return {
    current,
    total: PROGRESS_STAGES.length,
    label,
    stageId,
  };
}

export function getStagePath(stage: OnboardingStage): string {
  return ONBOARDING_STAGES.find((s) => s.id === stage)?.path ?? '/onboarding';
}

export function getNextStage(stage: OnboardingStage): OnboardingStage | null {
  const index = getStageIndex(stage);
  if (index < 0 || index >= ONBOARDING_STAGES.length - 1) return null;
  return ONBOARDING_STAGES[index + 1].id;
}

export function getPrevStage(stage: OnboardingStage): OnboardingStage | null {
  const index = getStageIndex(stage);
  if (index <= 0) return null;
  return ONBOARDING_STAGES[index - 1].id;
}

export function advanceStage(
  progress: OnboardingProgress,
  completedStage: OnboardingStage,
  data?: Record<string, unknown>
): OnboardingProgress {
  const completedStages = progress.completedStages.includes(completedStage)
    ? progress.completedStages
    : [...progress.completedStages, completedStage];
  const nextStage = getNextStage(completedStage) ?? completedStage;

  return {
    currentStage: nextStage,
    completedStages,
    data: data ? { ...progress.data, ...data } : progress.data,
  };
}

export function parseOnboardingProgress(raw: unknown): OnboardingProgress {
  if (!raw || typeof raw !== 'object') return DEFAULT_ONBOARDING_PROGRESS;
  const obj = raw as Partial<OnboardingProgress & { currentStep?: string; completedSteps?: string[] }>;
  const validStageIds = new Set(ONBOARDING_STAGES.map((s) => s.id));

  const legacyStageMap: Record<string, OnboardingStage> = {
    welcome: 'welcome',
    profile: 'workspace',
    workspace: 'workspace',
    subscription: 'subscription',
    plans: 'subscription',
    payment: 'subscription',
    property: 'property',
    units: 'property',
    tenants: 'property',
    leases: 'property',
    team: 'property',
    complete: 'ready',
  };

  let currentStage: OnboardingStage = 'welcome';
  if (obj.currentStage && validStageIds.has(obj.currentStage)) {
    currentStage = obj.currentStage;
  } else if (obj.currentStep && legacyStageMap[obj.currentStep]) {
    currentStage = legacyStageMap[obj.currentStep];
  }

  const rawCompleted = obj.completedStages ?? obj.completedSteps ?? [];
  const completedStages = Array.isArray(rawCompleted)
    ? rawCompleted
        .map((s) => {
          if (validStageIds.has(s as OnboardingStage)) return s as OnboardingStage;
          return legacyStageMap[s as string];
        })
        .filter((s): s is OnboardingStage => !!s && validStageIds.has(s as OnboardingStage))
    : [];

  const data = obj.data && typeof obj.data === 'object' ? (obj.data as Record<string, unknown>) : {};
  return { currentStage, completedStages, data };
}

// Legacy aliases for gradual migration
export type OnboardingStepId = OnboardingStage;
export const getStepPath = getStagePath;
