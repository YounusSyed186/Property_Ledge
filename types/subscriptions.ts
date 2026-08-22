import { Database } from './database';

export type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type SubscriptionPayment = Database['public']['Tables']['subscription_payments']['Row'];
export type PaymentProof = Database['public']['Tables']['payment_proofs']['Row'];
export type Entitlement = Database['public']['Tables']['entitlements']['Row'];
export type PlanEntitlement = Database['public']['Tables']['plan_entitlements']['Row'];
export type SubscriptionEvent = Database['public']['Tables']['subscription_events']['Row'];
export type AdminAuditLog = Database['public']['Tables']['admin_audit_logs']['Row'];

export type SubscriptionStatus = Subscription['status'];
export type PaymentStatus = SubscriptionPayment['status'];
export type PlanStatus = SubscriptionPlan['status'];
export type EntitlementValueType = Entitlement['value_type'];

export type EntitlementValue = boolean | number | string;

export type EntitlementMap = Record<string, EntitlementValue>;

export interface ActiveSubscriptionWithPlan extends Subscription {
  subscription_plans: SubscriptionPlan;
}

export interface PlanWithEntitlements extends SubscriptionPlan {
  plan_entitlements: (PlanEntitlement & { entitlements: Entitlement })[];
}

export interface LimitCheckResult {
  allowed: boolean;
  limit: number;
  currentUsage: number;
  remaining: number;
}
