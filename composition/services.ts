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
import { InvoiceService } from '@/modules/invoices/application/services/invoice-service';
import { InvoiceDocumentService } from '@/modules/invoices/application/services/invoice-document-service';
import { InvoiceStorageService } from '@/modules/invoices/infrastructure/storage/invoice-storage-service';
import { getSupabaseAdminClient } from '@/shared/infrastructure/database/supabase';
import { invoiceEmailAdapter } from '@/modules/invoices/infrastructure/email/invoice-email-adapter';
import { AutomationService } from '@/modules/automation/application/services/automation-service';
import { AutomationExecutionService } from '@/modules/automation/application/services/automation-execution-service';
import { actionRegistry } from '@/modules/automation/application/actions/action-registry';
import { CreateInvoiceAction } from '@/modules/automation/application/actions/create-invoice-action';
import { SendInvoiceAction } from '@/modules/automation/application/actions/send-invoice-action';
import { SendEmailAction } from '@/modules/automation/application/actions/send-email-action';
import { SendNotificationAction } from '@/modules/automation/application/actions/send-notification-action';
import { GenerateDocumentAction } from '@/modules/automation/application/actions/generate-document-action';
import { CreateTaskAction } from '@/modules/automation/application/actions/create-task-action';
import { GenerateAndSendInvoiceAction } from '@/modules/automation/application/actions/generate-and-send-invoice-action';
import { createServerRepositories } from './repositories';

let actionsInitialized = false;

function initializeActions(invoiceService: InvoiceService, invoiceDocService: InvoiceDocumentService) {
  if (actionsInitialized) return;
  actionRegistry.register(new CreateInvoiceAction(invoiceService));
  actionRegistry.register(new SendInvoiceAction(invoiceService, invoiceDocService, invoiceEmailAdapter));
  actionRegistry.register(new GenerateAndSendInvoiceAction(invoiceService, invoiceDocService, invoiceEmailAdapter));
  actionRegistry.register(new SendEmailAction());
  actionRegistry.register(new SendNotificationAction());
  actionRegistry.register(new GenerateDocumentAction(invoiceDocService));
  actionRegistry.register(new CreateTaskAction());
  actionsInitialized = true;
}

export async function createServerServices() {
  const repos = await createServerRepositories();

  const propertyService = new PropertyService(repos.propertyRepository);
  const tenantService = new TenantService(repos.tenantRepository);
  const leaseService = new LeaseService(repos.leaseRepository);
  const workspaceService = new WorkspaceService(repos.workspaceRepository);
  const authService = new AuthService(repos.authRepository);

  const invoiceService = new InvoiceService(
    repos.invoiceRepository,
    repos.invoiceTemplateRepository
  );

  const adminClient = await getSupabaseAdminClient();
  const invoiceStorage = new InvoiceStorageService(adminClient);

  const invoiceDocumentService = new InvoiceDocumentService(
    repos.invoiceRepository,
    repos.invoiceTemplateRepository,
    invoiceStorage,
    adminClient
  );

  const automationService = new AutomationService(repos.automationRepository);
  const automationExecutionService = new AutomationExecutionService(
    repos.automationRepository,
    repos.automationExecutionRepository
  );

  initializeActions(invoiceService, invoiceDocumentService);

  return {
    propertyService,
    tenantService,
    leaseService,
    workspaceService,
    authService,
    invoiceService,
    invoiceDocumentService,
    automationService,
    automationExecutionService,
  };
}
