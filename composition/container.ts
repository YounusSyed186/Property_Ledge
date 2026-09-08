/**
 * Lightweight Service Container.
 * Supports service resolution and test mock overrides without heavy external frameworks.
 */

import { PropertyService } from '@/modules/properties/application/services/property-service';
import { TenantService } from '@/modules/tenants/application/services/tenant-service';
import { LeaseService } from '@/modules/leases/application/services/lease-service';
import { WorkspaceService } from '@/modules/workspaces/application/services/workspace-service';
import { AuthService } from '@/modules/auth/application/services/auth-service';
import { InvoiceService } from '@/modules/invoices/application/services/invoice-service';
import { InvoiceDocumentService } from '@/modules/invoices/application/services/invoice-document-service';
import { AutomationService } from '@/modules/automation/application/services/automation-service';
import { AutomationExecutionService } from '@/modules/automation/application/services/automation-execution-service';
import { createServerServices } from './services';

type ServiceMap = {
  propertyService: PropertyService;
  tenantService: TenantService;
  leaseService: LeaseService;
  workspaceService: WorkspaceService;
  authService: AuthService;
  invoiceService: InvoiceService;
  invoiceDocumentService: InvoiceDocumentService;
  automationService: AutomationService;
  automationExecutionService: AutomationExecutionService;
};

class Container {
  private overrides = new Map<keyof ServiceMap, ServiceMap[keyof ServiceMap]>();

  public set<K extends keyof ServiceMap>(key: K, instance: ServiceMap[K]): void {
    this.overrides.set(key, instance);
  }

  public clearOverrides(): void {
    this.overrides.clear();
  }

  public async resolve<K extends keyof ServiceMap>(key: K): Promise<ServiceMap[K]> {
    if (this.overrides.has(key)) {
      return this.overrides.get(key) as ServiceMap[K];
    }
    const services = await createServerServices();
    return services[key];
  }

  public async getServices(): Promise<ServiceMap> {
    const defaultServices = await createServerServices();
    const result = { ...defaultServices };
    for (const [key, instance] of this.overrides.entries()) {
      (result as any)[key] = instance;
    }
    return result;
  }
}

export const container = new Container();
