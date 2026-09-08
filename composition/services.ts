/**
 * Application Services Composition Root.
 * Wires Application Services with injected repositories.
 * Pure dependency injection - zero direct Supabase dependencies in services.
 */

import { PropertyService } from '@/modules/properties/application/services/property-service';
import { TenantService } from '@/modules/tenants/application/services/tenant-service';
import { LeaseService } from '@/modules/leases/application/services/lease-service';
import { WorkspaceService } from '@/modules/workspaces/application/services/workspace-service';
import { AuthService } from '@/modules/auth/application/services/auth-service';
import { createServerRepositories } from './repositories';

export async function createServerServices() {
  const repos = await createServerRepositories();

  return {
    propertyService: new PropertyService(repos.propertyRepository),
    tenantService: new TenantService(repos.tenantRepository),
    leaseService: new LeaseService(repos.leaseRepository),
    workspaceService: new WorkspaceService(repos.workspaceRepository),
    authService: new AuthService(repos.authRepository),
  };
}
