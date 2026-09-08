/**
 * Server-side Repository Composition Root.
 * Wires concrete infrastructure repositories with database clients.
 */

import { getSupabaseServerClient, getSupabaseAdminClient } from '@/shared/infrastructure/database/supabase';
import { SupabasePropertyRepository } from '@/modules/properties/infrastructure/repositories/supabase-property-repository';
import { SupabaseTenantRepository } from '@/modules/tenants/infrastructure/repositories/supabase-tenant-repository';
import { SupabaseLeaseRepository } from '@/modules/leases/infrastructure/repositories/supabase-lease-repository';
import { SupabaseWorkspaceRepository } from '@/modules/workspaces/infrastructure/repositories/supabase-workspace-repository';
import { SupabaseAuthRepository } from '@/modules/auth/infrastructure/repositories/supabase-auth-repository';
import { SupabaseInvoiceRepository } from '@/modules/invoices/infrastructure/repositories/supabase-invoice-repository';
import { SupabaseInvoiceTemplateRepository } from '@/modules/invoices/infrastructure/repositories/supabase-invoice-template-repository';
import { SupabaseAutomationRepository } from '@/modules/automation/infrastructure/repositories/supabase-automation-repository';
import { SupabaseAutomationExecutionRepository } from '@/modules/automation/infrastructure/repositories/supabase-automation-execution-repository';

export async function createServerRepositories() {
  const client = await getSupabaseServerClient();
  const adminClient = await getSupabaseAdminClient();

  return {
    propertyRepository: new SupabasePropertyRepository(adminClient),
    tenantRepository: new SupabaseTenantRepository(adminClient),
    leaseRepository: new SupabaseLeaseRepository(adminClient),
    workspaceRepository: new SupabaseWorkspaceRepository(client),
    authRepository: new SupabaseAuthRepository(client),
    invoiceRepository: new SupabaseInvoiceRepository(adminClient),
    invoiceTemplateRepository: new SupabaseInvoiceTemplateRepository(adminClient),
    automationRepository: new SupabaseAutomationRepository(adminClient),
    automationExecutionRepository: new SupabaseAutomationExecutionRepository(adminClient),
  };
}
