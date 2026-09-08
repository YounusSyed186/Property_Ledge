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

export async function createServerRepositories() {
  const client = await getSupabaseServerClient();
  const adminClient = await getSupabaseAdminClient();

  return {
    propertyRepository: new SupabasePropertyRepository(adminClient),
    tenantRepository: new SupabaseTenantRepository(adminClient),
    leaseRepository: new SupabaseLeaseRepository(adminClient),
    workspaceRepository: new SupabaseWorkspaceRepository(client),
    authRepository: new SupabaseAuthRepository(client),
  };
}
