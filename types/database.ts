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
      platform_admins: {
        Row: {
          user_id: string
          status: 'active' | 'revoked'
          created_at: string
          created_by: string | null
        }
        Insert: {
          user_id: string
          status?: 'active' | 'revoked'
          created_at?: string
          created_by?: string | null
        }
        Update: {
          user_id?: string
          status?: 'active' | 'revoked'
          created_at?: string
          created_by?: string | null
        }
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          status: 'active' | 'archived' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          status?: 'active' | 'archived' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string
          status?: 'active' | 'archived' | 'suspended'
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'manager' | 'agent' | 'staff' | 'viewer'
          status: 'invited' | 'active' | 'suspended' | 'removed'
          invited_by: string | null
          joined_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'manager' | 'agent' | 'staff' | 'viewer'
          status?: 'invited' | 'active' | 'suspended' | 'removed'
          invited_by?: string | null
          joined_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'manager' | 'agent' | 'staff' | 'viewer'
          status?: 'invited' | 'active' | 'suspended' | 'removed'
          invited_by?: string | null
          joined_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          workspace_id: string
          owner_id: string
          name: string
          property_type: string | null
          property_category: 'Residential' | 'Commercial' | null
          status: 'active' | 'archived' | 'maintenance'
          address_line_1: string
          address_line_2: string | null
          city: string
          suburb: string | null
          state: string
          postal_code: string
          postcode: string | null
          country: string
          latitude: number | null
          longitude: number | null
          description: string | null
          image_url: string | null
          bedrooms: number | null
          bathrooms: number | null
          parking_spaces: number | null
          car_spaces: number | null
          rent_amount: number | null
          payment_frequency: string | null
          property_id: string | null
          tenant_name: string | null
          tenant_email: string | null
          lease_start: string | null
          lease_duration: string | null
          square_feet: number | null
          purchase_price: number | null
          purchase_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          owner_id: string
          name: string
          property_type?: string | null
          property_category?: 'Residential' | 'Commercial' | null
          status?: 'active' | 'archived' | 'maintenance'
          address_line_1: string
          address_line_2?: string | null
          city: string
          suburb?: string | null
          state: string
          postal_code: string
          postcode?: string | null
          country?: string
          latitude?: number | null
          longitude?: number | null
          description?: string | null
          image_url?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          parking_spaces?: number | null
          car_spaces?: number | null
          rent_amount?: number | null
          payment_frequency?: string | null
          property_id?: string | null
          tenant_name?: string | null
          tenant_email?: string | null
          lease_start?: string | null
          lease_duration?: string | null
          square_feet?: number | null
          purchase_price?: number | null
          purchase_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          owner_id?: string
          name?: string
          property_type?: string | null
          property_category?: 'Residential' | 'Commercial' | null
          status?: 'active' | 'archived' | 'maintenance'
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          suburb?: string | null
          state?: string
          postal_code?: string
          postcode?: string | null
          country?: string
          latitude?: number | null
          longitude?: number | null
          description?: string | null
          image_url?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          parking_spaces?: number | null
          car_spaces?: number | null
          rent_amount?: number | null
          payment_frequency?: string | null
          property_id?: string | null
          tenant_name?: string | null
          tenant_email?: string | null
          lease_start?: string | null
          lease_duration?: string | null
          square_feet?: number | null
          purchase_price?: number | null
          purchase_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      property_members: {
        Row: {
          id: string
          property_id: string
          user_id: string
          role: 'owner' | 'manager' | 'agent' | 'staff' | 'viewer'
          status: 'invited' | 'active' | 'suspended' | 'removed'
          invited_by: string | null
          joined_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          user_id: string
          role?: 'owner' | 'manager' | 'agent' | 'staff' | 'viewer'
          status?: 'invited' | 'active' | 'suspended' | 'removed'
          invited_by?: string | null
          joined_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          user_id?: string
          role?: 'owner' | 'manager' | 'agent' | 'staff' | 'viewer'
          status?: 'invited' | 'active' | 'suspended' | 'removed'
          invited_by?: string | null
          joined_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      units: {
        Row: {
          id: string
          property_id: string
          name: string
          unit_number: string
          unit_type: string | null
          status: 'vacant' | 'occupied' | 'maintenance' | 'reserved'
          bedrooms: number | null
          bathrooms: number | null
          square_feet: number | null
          rent_amount: number | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          name: string
          unit_number: string
          unit_type?: string | null
          status?: 'vacant' | 'occupied' | 'maintenance' | 'reserved'
          bedrooms?: number | null
          bathrooms?: number | null
          square_feet?: number | null
          rent_amount?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          name?: string
          unit_number?: string
          unit_type?: string | null
          status?: 'vacant' | 'occupied' | 'maintenance' | 'reserved'
          bedrooms?: number | null
          bathrooms?: number | null
          square_feet?: number | null
          rent_amount?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tenants: {
        Row: {
          id: string
          property_id: string
          user_id: string | null
          first_name: string
          last_name: string
          email: string
          phone: string | null
          status: 'active' | 'inactive' | 'archived' | 'prospect'
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          user_id?: string | null
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          status?: 'active' | 'inactive' | 'archived' | 'prospect'
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          user_id?: string | null
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          status?: 'active' | 'inactive' | 'archived' | 'prospect'
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leases: {
        Row: {
          id: string
          property_id: string
          unit_id: string | null
          status: 'draft' | 'pending' | 'active' | 'expired' | 'terminated' | 'cancelled' | 'renewed'
          start_date: string
          end_date: string | null
          rent_amount: number
          security_deposit: number
          payment_due_day: number
          rent_frequency: 'weekly' | 'fortnightly' | 'monthly' | 'yearly'
          notes: string | null
          created_by: string | null
          renewed_from_lease_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          unit_id?: string | null
          status?: 'draft' | 'pending' | 'active' | 'expired' | 'terminated' | 'cancelled' | 'renewed'
          start_date: string
          end_date?: string | null
          rent_amount: number
          security_deposit?: number
          payment_due_day?: number
          rent_frequency?: 'weekly' | 'fortnightly' | 'monthly' | 'yearly'
          notes?: string | null
          created_by?: string | null
          renewed_from_lease_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          unit_id?: string | null
          status?: 'draft' | 'pending' | 'active' | 'expired' | 'terminated' | 'cancelled' | 'renewed'
          start_date?: string
          end_date?: string | null
          rent_amount?: number
          security_deposit?: number
          payment_due_day?: number
          rent_frequency?: 'weekly' | 'fortnightly' | 'monthly' | 'yearly'
          notes?: string | null
          created_by?: string | null
          renewed_from_lease_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      lease_tenants: {
        Row: {
          id: string
          lease_id: string
          tenant_id: string
          property_id: string
          role: 'primary' | 'co-tenant' | 'guarantor'
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          lease_id: string
          tenant_id: string
          property_id: string
          role?: 'primary' | 'co-tenant' | 'guarantor'
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          lease_id?: string
          tenant_id?: string
          property_id?: string
          role?: 'primary' | 'co-tenant' | 'guarantor'
          is_primary?: boolean
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          property_id: string
          unit_id: string | null
          lease_id: string | null
          tenant_id: string | null
          invoice_number: string
          status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'void' | 'cancelled'
          issue_date: string
          due_date: string
          subtotal: number
          tax_amount: number
          total_amount: number
          balance_due: number
          description: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          unit_id?: string | null
          lease_id?: string | null
          tenant_id?: string | null
          invoice_number: string
          status?: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'void' | 'cancelled'
          issue_date?: string
          due_date: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          balance_due?: number
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          unit_id?: string | null
          lease_id?: string | null
          tenant_id?: string | null
          invoice_number?: string
          status?: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'void' | 'cancelled'
          issue_date?: string
          due_date?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          balance_due?: number
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          unit_price: number
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          amount?: number
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          property_id: string
          invoice_id: string | null
          lease_id: string | null
          tenant_id: string | null
          amount: number
          payment_date: string
          payment_method: 'bank_transfer' | 'direct_debit' | 'card' | 'cash' | 'cheque' | 'other'
          status: 'pending' | 'completed' | 'failed' | 'reversed' | 'refunded'
          reference: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          invoice_id?: string | null
          lease_id?: string | null
          tenant_id?: string | null
          amount: number
          payment_date?: string
          payment_method?: 'bank_transfer' | 'direct_debit' | 'card' | 'cash' | 'cheque' | 'other'
          status?: 'pending' | 'completed' | 'failed' | 'reversed' | 'refunded'
          reference?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          invoice_id?: string | null
          lease_id?: string | null
          tenant_id?: string | null
          amount?: number
          payment_date?: string
          payment_method?: 'bank_transfer' | 'direct_debit' | 'card' | 'cash' | 'cheque' | 'other'
          status?: 'pending' | 'completed' | 'failed' | 'reversed' | 'refunded'
          reference?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          property_id: string
          category_id: string | null
          amount: number
          expense_date: string
          vendor_name: string | null
          description: string
          status: 'pending' | 'paid' | 'cancelled'
          receipt_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          category_id?: string | null
          amount: number
          expense_date?: string
          vendor_name?: string | null
          description: string
          status?: 'pending' | 'paid' | 'cancelled'
          receipt_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          category_id?: string | null
          amount?: number
          expense_date?: string
          vendor_name?: string | null
          description?: string
          status?: 'pending' | 'paid' | 'cancelled'
          receipt_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      maintenance_requests: {
        Row: {
          id: string
          property_id: string
          unit_id: string | null
          tenant_id: string | null
          assigned_to: string | null
          title: string
          description: string
          priority: 'low' | 'medium' | 'high' | 'urgent'
          status: 'open' | 'in_progress' | 'scheduled' | 'completed' | 'cancelled'
          category: string | null
          scheduled_at: string | null
          completed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          unit_id?: string | null
          tenant_id?: string | null
          assigned_to?: string | null
          title: string
          description: string
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'open' | 'in_progress' | 'scheduled' | 'completed' | 'cancelled'
          category?: string | null
          scheduled_at?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          unit_id?: string | null
          tenant_id?: string | null
          assigned_to?: string | null
          title?: string
          description?: string
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'open' | 'in_progress' | 'scheduled' | 'completed' | 'cancelled'
          category?: string | null
          scheduled_at?: string | null
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inspections: {
        Row: {
          id: string
          property_id: string
          unit_id: string | null
          inspector_id: string | null
          inspection_type: 'move_in' | 'routine' | 'move_out' | 'damage' | 'final'
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_at: string
          completed_at: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          unit_id?: string | null
          inspector_id?: string | null
          inspection_type?: 'move_in' | 'routine' | 'move_out' | 'damage' | 'final'
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_at: string
          completed_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          unit_id?: string | null
          inspector_id?: string | null
          inspection_type?: 'move_in' | 'routine' | 'move_out' | 'damage' | 'final'
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_at?: string
          completed_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inspection_items: {
        Row: {
          id: string
          inspection_id: string
          category: string
          description: string
          status: 'pending' | 'passed' | 'failed' | 'needs_attention'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          inspection_id: string
          category: string
          description: string
          status?: 'pending' | 'passed' | 'failed' | 'needs_attention'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          inspection_id?: string
          category?: string
          description?: string
          status?: 'pending' | 'passed' | 'failed' | 'needs_attention'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          property_id: string
          unit_id: string | null
          tenant_id: string | null
          lease_id: string | null
          document_type: 'lease_agreement' | 'inspection_report' | 'insurance' | 'council_notice' | 'invoice' | 'receipt' | 'property_document' | 'tenant_document' | 'other'
          name: string
          storage_path: string
          mime_type: string
          file_size: number
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          unit_id?: string | null
          tenant_id?: string | null
          lease_id?: string | null
          document_type: 'lease_agreement' | 'inspection_report' | 'insurance' | 'council_notice' | 'invoice' | 'receipt' | 'property_document' | 'tenant_document' | 'other'
          name: string
          storage_path: string
          mime_type: string
          file_size: number
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          unit_id?: string | null
          tenant_id?: string | null
          lease_id?: string | null
          document_type?: 'lease_agreement' | 'inspection_report' | 'insurance' | 'council_notice' | 'invoice' | 'receipt' | 'property_document' | 'tenant_document' | 'other'
          name?: string
          storage_path?: string
          mime_type?: string
          file_size?: number
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          property_id: string
          assigned_to: string | null
          created_by: string | null
          title: string
          description: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          due_date: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          assigned_to?: string | null
          created_by?: string | null
          title: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          assigned_to?: string | null
          created_by?: string | null
          title?: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          property_id: string | null
          type: string
          title: string
          message: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          property_id?: string | null
          type: string
          title: string
          message: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          property_id?: string | null
          type?: string
          title?: string
          message?: string
          read_at?: string | null
          created_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          workspace_id: string | null
          property_id: string | null
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          property_id?: string | null
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          property_id?: string | null
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          metadata?: Json
          created_at?: string
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
          value_type?: 'boolean' | 'number' | 'string'
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
          status: 'draft' | 'pending_payment' | 'under_review' | 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled' | 'expired'
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
          status?: 'draft' | 'pending_payment' | 'under_review' | 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled' | 'expired'
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
          status?: 'draft' | 'pending_payment' | 'under_review' | 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled' | 'expired'
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
      subscription_payments: {
        Row: {
          id: string
          subscription_id: string
          account_id: string
          reference: string
          expected_amount: number
          submitted_amount: number | null
          currency: string
          payment_date: string | null
          transaction_id: string | null
          status: 'pending' | 'under_review' | 'verified' | 'rejected'
          submitted_at: string | null
          verified_at: string | null
          verified_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          account_id: string
          reference: string
          expected_amount: number
          submitted_amount?: number | null
          currency?: string
          payment_date?: string | null
          transaction_id?: string | null
          status?: 'pending' | 'under_review' | 'verified' | 'rejected'
          submitted_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          account_id?: string
          reference?: string
          expected_amount?: number
          submitted_amount?: number | null
          currency?: string
          payment_date?: string | null
          transaction_id?: string | null
          status?: 'pending' | 'under_review' | 'verified' | 'rejected'
          submitted_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payment_proofs: {
        Row: {
          id: string
          payment_id: string
          storage_path: string
          file_name: string
          mime_type: string
          file_size: number
          file_preview_url: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          payment_id: string
          storage_path: string
          file_name: string
          mime_type: string
          file_size: number
          file_preview_url?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          payment_id?: string
          storage_path?: string
          file_name?: string
          mime_type?: string
          file_size?: number
          file_preview_url?: string | null
          uploaded_at?: string
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
      email_events: {
        Row: {
          id: string
          recipient: string
          subject: string
          template_type: string
          variables: Json
          provider_message_id: string | null
          status: 'pending' | 'sent' | 'failed'
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          recipient: string
          subject: string
          template_type: string
          variables?: Json
          provider_message_id?: string | null
          status?: 'pending' | 'sent' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          recipient?: string
          subject?: string
          template_type?: string
          variables?: Json
          provider_message_id?: string | null
          status?: 'pending' | 'sent' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          transaction_type: 'income' | 'expense'
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transaction_type: 'income' | 'expense'
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transaction_type?: 'income' | 'expense'
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          amount: number
          transaction_type: 'income' | 'expense'
          transaction_category_id: string
          transaction_date: string
          payment_method: string | null
          description: string | null
          reference: string | null
          vendor_name: string | null
          notes: string | null
          status: 'pending' | 'completed' | 'failed' | 'reversed' | 'refunded'
          tenant_id: string | null
          lease_id: string | null
          invoice_id: string | null
          property_id: string
          workspace_id: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          amount: number
          transaction_type: 'income' | 'expense'
          transaction_category_id: string
          transaction_date?: string
          payment_method?: string | null
          description?: string | null
          reference?: string | null
          vendor_name?: string | null
          notes?: string | null
          status?: 'pending' | 'completed' | 'failed' | 'reversed' | 'refunded'
          tenant_id?: string | null
          lease_id?: string | null
          invoice_id?: string | null
          property_id: string
          workspace_id: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          amount?: number
          transaction_type?: 'income' | 'expense'
          transaction_category_id?: string
          transaction_date?: string
          payment_method?: string | null
          description?: string | null
          reference?: string | null
          vendor_name?: string | null
          notes?: string | null
          status?: 'pending' | 'completed' | 'failed' | 'reversed' | 'refunded'
          tenant_id?: string | null
          lease_id?: string | null
          invoice_id?: string | null
          property_id?: string
          workspace_id?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_platform_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      owns_property: {
        Args: { p_property_id: string }
        Returns: boolean
      }
      can_access_property: {
        Args: { p_property_id: string }
        Returns: boolean
      }
      can_access_workspace: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      has_property_permission: {
        Args: { p_property_id: string; p_permission: string; p_user_id?: string }
        Returns: boolean
      }
      get_user_accessible_property_ids: {
        Args: { p_user_id?: string }
        Returns: string
      }
      get_user_accessible_workspace_ids: {
        Args: { p_user_id?: string }
        Returns: string
      }
      prevent_activity_log_modification: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      set_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      update_updated_at_column: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      log_activity: {
        Args: {
          p_action: string
          p_entity_type: string
          p_entity_id?: string
          p_workspace_id?: string
          p_property_id?: string
          p_metadata?: Json
        }
        Returns: string
      }
      generate_user_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      trg_assign_user_code: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}