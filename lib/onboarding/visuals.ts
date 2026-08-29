import type { OnboardingStage } from './state';

export interface OnboardingVisualAsset {
  light: string;
  dark: string;
  alt: string;
  title: string;
}

export const ONBOARDING_ASSETS: Record<OnboardingStage, OnboardingVisualAsset> = {
  welcome: {
    light: '/onboarding/step1_light.png',
    dark: '/onboarding/step1_dark.png',
    alt: 'PropertyLedge workspace portfolio preview',
    title: 'Workspace Architecture',
  },
  workspace: {
    light: '/onboarding/step1_light.png',
    dark: '/onboarding/step1_dark.png',
    alt: 'PropertyLedge workspace setup and configuration',
    title: 'Workspace Setup',
  },
  subscription: {
    light: '/onboarding/step2_light.png',
    dark: '/onboarding/step2_dark.png',
    alt: 'PropertyLedge portfolio scale and subscription plans',
    title: 'Portfolio Scale',
  },
  property: {
    light: '/onboarding/step3_light.png',
    dark: '/onboarding/step3_dark.png',
    alt: 'PropertyLedge property and portfolio management',
    title: 'Property Management',
  },
  ready: {
    light: '/onboarding/step4_light.png',
    dark: '/onboarding/step4_dark.png',
    alt: 'PropertyLedge workspace launch and portfolio operations',
    title: 'Ready to Launch',
  },
};

export const ONBOARDING_STEP_ORDER: OnboardingStage[] = [
  'workspace',
  'subscription',
  'property',
  'ready',
];

export function getNextStepStage(currentStage: OnboardingStage): OnboardingStage | null {
  const index = ONBOARDING_STEP_ORDER.indexOf(currentStage);
  if (index >= 0 && index < ONBOARDING_STEP_ORDER.length - 1) {
    return ONBOARDING_STEP_ORDER[index + 1];
  }
  return null;
}
