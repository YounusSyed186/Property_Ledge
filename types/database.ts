export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      account_context: {
        Row: {
          user_id: string
          status: 'active' | 'suspended' | 'deactivated'
          onboarding_status: 'not_started' | 'in_progress' | 'completed'
          first_login_at: string | null
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          status?: 'active' | 'suspended' | 'deactivated'
          onboarding_status?: 'not_started' | 'in_progress' | 'completed'
          first_login_at?: string | null
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          status?: 'active' | 'suspended' | 'deactivated'
          onboarding_status?: 'not_started' | 'in_progress' | 'completed'
          first_login_at?: string | null
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          status: 'active' | 'inactive' | 'archived'
          display_order: number
          price_cents: number
          billing_interval: 'monthly' | 'yearly'
          provider_price_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          status?: 'active' | 'inactive' | 'archived'
          display_order?: number
          price_cents?: number
          billing_interval?: 'monthly' | 'yearly'
          provider_price_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          status?: 'active' | 'inactive' | 'archived'
          display_order?: number
          price_cents?: number
          billing_interval?: 'monthly' | 'yearly'
          provider_price_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      entitlements: {
        Row: {
          id: string
          key: string
          name: string
          description: string | null
          value_type: 'boolean' | 'number' | 'string'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          name: string
          description?: string | null
          value_type: 'boolean' | 'number' | 'string'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          name?: string
          description?: string | null
          value_type?: 'boolean' | 'number' | 'string'
          created_at?: string
          updated_at?: string
        }
      }
      plan_entitlements: {
        Row: {
          id: string
          plan_id: string
          entitlement_id: string
          value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          entitlement_id: string
          value: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          entitlement_id?: string
          value?: Json
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          account_id: string
          plan_id: string
          status: 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled' | 'expired'
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          trial_start: string | null
          trial_end: string | null
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          plan_id: string
          status?: 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled' | 'expired'
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          plan_id?: string
          status?: 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled' | 'expired'
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      subscription_events: {
        Row: {
          id: string
          account_id: string | null
          provider: string
          provider_event_id: string
          event_type: string
          payload: Json
          status: 'received' | 'processed' | 'failed'
          processed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          account_id?: string | null
          provider?: string
          provider_event_id: string
          event_type: string
          payload: Json
          status?: 'received' | 'processed' | 'failed'
          processed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string | null
          provider?: string
          provider_event_id?: string
          event_type?: string
          payload?: Json
          status?: 'received' | 'processed' | 'failed'
          processed_at?: string
          created_at?: string
        }
      }
      admin_audit_logs: {
        Row: {
          id: string
          admin_user_id: string
          action: string
          target_type: string
          target_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          action: string
          target_type: string
          target_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string
          action?: string
          target_type?: string
          target_id?: string | null
          metadata?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
