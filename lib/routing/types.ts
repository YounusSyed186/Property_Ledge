export type UserDestination =
  | 'AUTH'
  | 'ONBOARDING'
  | 'SUBSCRIPTION'
  | 'WORKSPACE_SELECT'
  | 'DASHBOARD'
  | 'INVITATION'
  | 'ADMIN'
  | 'TENANT';

export interface RouteResolutionInput {
  isAuthenticated: boolean;
  pathname: string;
  onboardingStatus?: string | null;
  onboardingRoute?: string | null;
  persona?: string | null;
  pendingInvitationToken?: string | null;
  redirectTo?: string | null;
  planParam?: string | null;
}

export interface RouteResolution {
  destination: UserDestination;
  path: string;
  reason?: string;
}
