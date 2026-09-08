import { test, expect } from '@playwright/test';
import { LeaseService } from '@/modules/leases/application/services/lease-service';
import { LeaseRepository, CreateLeaseData, UpdateLeaseData, RenewLeaseData } from '@/modules/leases/domain/repositories/lease-repository';
import { Lease, LeaseFilters, LeaseTenantAssignment } from '@/modules/leases/domain/entities/lease';
import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, NotFoundError, ConflictError, ForbiddenError, ValidationError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';

class MockLeaseRepository implements LeaseRepository {
  public leases: Map<string, Lease> = new Map();
  public leaseTenants: Map<string, LeaseTenantAssignment[]> = new Map();

  async getById(id: string, _context?: RequestContext): Promise<Result<Lease, DomainError>> {
    const l = this.leases.get(id);
    if (!l) return err(new NotFoundError('Lease', id));
    const tenants = this.leaseTenants.get(id) || [];
    return ok({ ...l, tenants });
  }

  async listByProperty(propertyId: string, _context?: RequestContext): Promise<Result<Lease[], DomainError>> {
    const list = Array.from(this.leases.values()).filter((l) => l.propertyId === propertyId);
    return ok(list);
  }

  async listByWorkspace(_workspaceId: string, _context?: RequestContext): Promise<Result<Lease[], DomainError>> {
    return ok(Array.from(this.leases.values()));
  }

  async list(filters: LeaseFilters, _context?: RequestContext): Promise<Result<Lease[], DomainError>> {
    let list = Array.from(this.leases.values());
    if (filters.propertyId) list = list.filter((l) => l.propertyId === filters.propertyId);
    if (filters.status && filters.status !== 'all') list = list.filter((l) => l.status === filters.status);
    return ok(list);
  }

  async create(data: CreateLeaseData, context: RequestContext): Promise<Result<Lease, DomainError>> {
    const id = `lease-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const tenants: LeaseTenantAssignment[] = (data.tenantAssignments || []).map((t) => ({
      tenantId: t.tenantId,
      role: t.role || 'primary',
      isPrimary: t.isPrimary ?? false,
    }));
    const lease: Lease = {
      id,
      propertyId: data.propertyId,
      unitId: data.unitId || null,
      status: data.status || 'active',
      startDate: data.startDate,
      endDate: data.endDate || null,
      rentAmount: data.rentAmount,
      securityDeposit: data.securityDeposit ?? 0,
      paymentDueDay: data.paymentDueDay ?? 1,
      rentFrequency: data.rentFrequency || 'monthly',
      notes: data.notes || null,
      createdBy: context.userId,
      renewedFromLeaseId: data.renewedFromLeaseId || null,
      tenants,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.leases.set(id, lease);
    this.leaseTenants.set(id, tenants);
    return ok(lease);
  }

  async update(id: string, data: UpdateLeaseData, _context: RequestContext): Promise<Result<Lease, DomainError>> {
    const existing = this.leases.get(id);
    if (!existing) return err(new NotFoundError('Lease', id));
    const updated: Lease = {
      ...existing,
      ...data,
      unitId: data.unitId !== undefined ? data.unitId : existing.unitId,
      endDate: data.endDate !== undefined ? data.endDate : existing.endDate,
      rentAmount: data.rentAmount !== undefined ? data.rentAmount : existing.rentAmount,
      securityDeposit: data.securityDeposit !== undefined ? data.securityDeposit : existing.securityDeposit,
      status: data.status !== undefined ? data.status : existing.status,
      updatedAt: new Date().toISOString(),
    };
    this.leases.set(id, updated);
    return ok(updated);
  }

  async renewLease(previousLeaseId: string, data: RenewLeaseData, context: RequestContext): Promise<Result<Lease, DomainError>> {
    const prev = this.leases.get(previousLeaseId);
    if (!prev) return err(new NotFoundError('Previous Lease', previousLeaseId));
    if (prev.status === 'renewed') return err(new ConflictError('Lease has already been renewed.'));

    // Check idempotency
    const existingRenewal = Array.from(this.leases.values()).find(
      (l) => l.renewedFromLeaseId === previousLeaseId && ['active', 'pending', 'draft'].includes(l.status)
    );
    if (existingRenewal) return err(new ConflictError('An active renewal already exists for this lease.'));

    const newLeaseId = `lease-renewed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const tenantAssignments: LeaseTenantAssignment[] = (data.tenantAssignments || []).map((t) => ({
      tenantId: t.tenantId,
      role: t.role || 'primary',
      isPrimary: t.isPrimary ?? false,
    }));
    const newLease: Lease = {
      id: newLeaseId,
      propertyId: data.propertyId,
      unitId: data.unitId || null,
      status: 'active',
      startDate: data.startDate,
      endDate: data.endDate || null,
      rentAmount: data.rentAmount,
      securityDeposit: data.securityDeposit,
      paymentDueDay: data.paymentDueDay ?? 1,
      rentFrequency: data.rentFrequency || 'monthly',
      notes: data.notes || null,
      createdBy: context.userId,
      renewedFromLeaseId: previousLeaseId,
      tenants: tenantAssignments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update old lease status to 'renewed'
    this.leases.set(previousLeaseId, {
      ...prev,
      status: 'renewed',
      updatedAt: new Date().toISOString(),
    });

    // Save new lease and tenant assignments
    this.leases.set(newLeaseId, newLease);
    this.leaseTenants.set(newLeaseId, tenantAssignments);

    return ok(newLease);
  }

  async getRenewalHistory(leaseId: string, _context?: RequestContext): Promise<Result<Lease[], DomainError>> {
    const current = this.leases.get(leaseId);
    if (!current) return err(new NotFoundError('Lease', leaseId));
    const all = Array.from(this.leases.values());
    return ok(all);
  }

  async archive(id: string, context: RequestContext): Promise<Result<void, DomainError>> {
    const existing = this.leases.get(id);
    if (!existing) return err(new NotFoundError('Lease', id));
    this.leases.set(id, { ...existing, status: 'terminated' });
    return ok(undefined);
  }

  async restore(id: string, _context: RequestContext): Promise<Result<Lease, DomainError>> {
    const existing = this.leases.get(id);
    if (!existing) return err(new NotFoundError('Lease', id));
    const restored = { ...existing, status: 'active' as const };
    this.leases.set(id, restored);
    return ok(restored);
  }

  async delete(id: string, _context: RequestContext): Promise<Result<void, DomainError>> {
    this.leases.delete(id);
    this.leaseTenants.delete(id);
    return ok(undefined);
  }

  async getLeaseTenants(leaseId: string, _context?: RequestContext): Promise<Result<LeaseTenantAssignment[], DomainError>> {
    return ok(this.leaseTenants.get(leaseId) || []);
  }
}

test.describe('Lease Renewal Lifecycle Suite', () => {
  let repo: MockLeaseRepository;
  let service: LeaseService;
  const managerContext: RequestContext = {
    userId: 'user-manager-1',
    roleName: 'manager',
    workspaceId: 'ws-1',
  };

  test.beforeEach(() => {
    repo = new MockLeaseRepository();
    service = new LeaseService(repo);
  });

  test('Scenario 1: Normal Renewal — creates new lease, preserves old lease as historical, reuses tenant IDs', async () => {
    // 1. Create Initial Lease (LS-0001)
    const initialRes = await service.createLease(
      {
        propertyId: 'prop-101',
        startDate: '2025-10-01',
        endDate: '2026-09-30',
        rentAmount: 25000,
        securityDeposit: 50000,
        rentFrequency: 'monthly',
        tenantIds: ['tenant-john', 'tenant-sarah'],
      },
      managerContext
    );
    expect(initialRes.success).toBe(true);
    if (!initialRes.success) return;
    const oldLease = initialRes.data;
    expect(oldLease.status).toBe('active');

    // 2. Perform Renewal (LS-0002)
    const renewRes = await service.renewLease(
      {
        previousLeaseId: oldLease.id,
        propertyId: 'prop-101',
        startDate: '2026-10-01',
        endDate: '2027-09-30',
        rentAmount: 27000,
        securityDeposit: 54000,
        rentFrequency: 'monthly',
        tenantAssignments: [
          { tenantId: 'tenant-john', role: 'primary', isPrimary: true },
          { tenantId: 'tenant-sarah', role: 'co-tenant', isPrimary: false },
        ],
      },
      managerContext
    );

    expect(renewRes.success).toBe(true);
    if (!renewRes.success) return;
    const newLease = renewRes.data;

    // Verify New Lease Properties
    expect(newLease.id).not.toBe(oldLease.id);
    expect(newLease.status).toBe('active');
    expect(newLease.startDate).toBe('2026-10-01');
    expect(newLease.endDate).toBe('2027-09-30');
    expect(newLease.rentAmount).toBe(27000);
    expect(newLease.securityDeposit).toBe(54000);
    expect(newLease.renewedFromLeaseId).toBe(oldLease.id);

    // Verify Tenant Records Reused (Same IDs preserved)
    expect(newLease.tenants.length).toBe(2);
    expect(newLease.tenants[0].tenantId).toBe('tenant-john');
    expect(newLease.tenants[1].tenantId).toBe('tenant-sarah');

    // Verify Old Lease Transitioned to Historical 'renewed'
    const fetchedOld = await repo.getById(oldLease.id);
    expect(fetchedOld.success).toBe(true);
    if (fetchedOld.success) {
      expect(fetchedOld.data.status).toBe('renewed');
      // Historical financial values remain intact
      expect(fetchedOld.data.rentAmount).toBe(25000);
      expect(fetchedOld.data.securityDeposit).toBe(50000);
      expect(fetchedOld.data.startDate).toBe('2025-10-01');
      expect(fetchedOld.data.endDate).toBe('2026-09-30');
    }
  });

  test('Scenario 2: Rent and Deposit Increase — old values remain immutable on historical lease', async () => {
    const initialRes = await service.createLease(
      {
        propertyId: 'prop-101',
        startDate: '2025-10-01',
        endDate: '2026-09-30',
        rentAmount: 25000,
        securityDeposit: 50000,
        tenantIds: ['tenant-john'],
      },
      managerContext
    );
    if (!initialRes.success) throw new Error();
    const oldLeaseId = initialRes.data.id;

    const renewRes = await service.renewLease(
      {
        previousLeaseId: oldLeaseId,
        propertyId: 'prop-101',
        startDate: '2026-10-01',
        endDate: '2027-09-30',
        rentAmount: 28500,
        securityDeposit: 57000,
        tenantAssignments: [{ tenantId: 'tenant-john', role: 'primary', isPrimary: true }],
      },
      managerContext
    );

    expect(renewRes.success).toBe(true);
    if (!renewRes.success) return;
    expect(renewRes.data.rentAmount).toBe(28500);
    expect(renewRes.data.securityDeposit).toBe(57000);

    const oldLeaseRes = await repo.getById(oldLeaseId);
    expect(oldLeaseRes.success).toBe(true);
    if (oldLeaseRes.success) {
      expect(oldLeaseRes.data.rentAmount).toBe(25000);
      expect(oldLeaseRes.data.securityDeposit).toBe(50000);
    }
  });

  test('Scenario 3: Tenant Leaves — Sarah removed on new lease, preserved on old lease', async () => {
    const initialRes = await service.createLease(
      {
        propertyId: 'prop-101',
        startDate: '2025-10-01',
        endDate: '2026-09-30',
        rentAmount: 25000,
        tenantIds: ['tenant-john', 'tenant-sarah'],
      },
      managerContext
    );
    if (!initialRes.success) throw new Error();
    const oldLeaseId = initialRes.data.id;

    // Sarah leaves; only John stays on renewal
    const renewRes = await service.renewLease(
      {
        previousLeaseId: oldLeaseId,
        propertyId: 'prop-101',
        startDate: '2026-10-01',
        endDate: '2027-09-30',
        rentAmount: 26000,
        tenantAssignments: [{ tenantId: 'tenant-john', role: 'primary', isPrimary: true }],
      },
      managerContext
    );

    expect(renewRes.success).toBe(true);
    if (!renewRes.success) return;
    expect(renewRes.data.tenants.length).toBe(1);
    expect(renewRes.data.tenants[0].tenantId).toBe('tenant-john');

    // Old lease still has both John & Sarah
    const oldLeaseRes = await repo.getById(oldLeaseId);
    expect(oldLeaseRes.success).toBe(true);
    if (oldLeaseRes.success) {
      expect(oldLeaseRes.data.tenants.length).toBe(2);
    }
  });

  test('Scenario 4: Tenant Changes — John reused, Mike joins', async () => {
    const initialRes = await service.createLease(
      {
        propertyId: 'prop-101',
        startDate: '2025-10-01',
        endDate: '2026-09-30',
        rentAmount: 25000,
        tenantIds: ['tenant-john', 'tenant-sarah'],
      },
      managerContext
    );
    if (!initialRes.success) throw new Error();
    const oldLeaseId = initialRes.data.id;

    // New tenant Mike joins with John
    const renewRes = await service.renewLease(
      {
        previousLeaseId: oldLeaseId,
        propertyId: 'prop-101',
        startDate: '2026-10-01',
        endDate: '2027-09-30',
        rentAmount: 27000,
        tenantAssignments: [
          { tenantId: 'tenant-john', role: 'primary', isPrimary: true },
          { tenantId: 'tenant-mike', role: 'co-tenant', isPrimary: false },
        ],
      },
      managerContext
    );

    expect(renewRes.success).toBe(true);
    if (!renewRes.success) return;
    expect(renewRes.data.tenants.map((t) => t.tenantId)).toEqual(['tenant-john', 'tenant-mike']);
  });

  test('Scenario 5: Duplicate Renewal Prevention — cannot renew the same lease twice', async () => {
    const initialRes = await service.createLease(
      {
        propertyId: 'prop-101',
        startDate: '2025-10-01',
        endDate: '2026-09-30',
        rentAmount: 25000,
        tenantIds: ['tenant-john'],
      },
      managerContext
    );
    if (!initialRes.success) throw new Error();
    const oldLeaseId = initialRes.data.id;

    // First renewal succeeds
    const firstRenew = await service.renewLease(
      {
        previousLeaseId: oldLeaseId,
        propertyId: 'prop-101',
        startDate: '2026-10-01',
        endDate: '2027-09-30',
        rentAmount: 27000,
        tenantAssignments: [{ tenantId: 'tenant-john', role: 'primary', isPrimary: true }],
      },
      managerContext
    );
    expect(firstRenew.success).toBe(true);

    // Second renewal attempt on same previous lease must fail
    const secondRenew = await service.renewLease(
      {
        previousLeaseId: oldLeaseId,
        propertyId: 'prop-101',
        startDate: '2026-10-01',
        endDate: '2027-09-30',
        rentAmount: 27000,
        tenantAssignments: [{ tenantId: 'tenant-john', role: 'primary', isPrimary: true }],
      },
      managerContext
    );

    expect(secondRenew.success).toBe(false);
    if (!secondRenew.success) {
      expect(secondRenew.error).toBeInstanceOf(ConflictError);
    }
  });

  test('Scenario 6: Authorization — tenant or viewer cannot execute renewal', async () => {
    const initialRes = await service.createLease(
      {
        propertyId: 'prop-101',
        startDate: '2025-10-01',
        endDate: '2026-09-30',
        rentAmount: 25000,
        tenantIds: ['tenant-john'],
      },
      managerContext
    );
    if (!initialRes.success) throw new Error();
    const oldLeaseId = initialRes.data.id;

    const tenantContext: RequestContext = {
      userId: 'tenant-john',
      roleName: 'tenant',
    };

    const unauthorizedRenew = await service.renewLease(
      {
        previousLeaseId: oldLeaseId,
        propertyId: 'prop-101',
        startDate: '2026-10-01',
        endDate: '2027-09-30',
        rentAmount: 27000,
        tenantAssignments: [{ tenantId: 'tenant-john', role: 'primary', isPrimary: true }],
      },
      tenantContext
    );

    expect(unauthorizedRenew.success).toBe(false);
    if (!unauthorizedRenew.success) {
      expect(unauthorizedRenew.error).toBeInstanceOf(ForbiddenError);
    }
  });

  test('Scenario 7: Date Validation — end date before start date is rejected', async () => {
    const initialRes = await service.createLease(
      {
        propertyId: 'prop-101',
        startDate: '2025-10-01',
        endDate: '2026-09-30',
        rentAmount: 25000,
        tenantIds: ['tenant-john'],
      },
      managerContext
    );
    if (!initialRes.success) throw new Error();
    const oldLeaseId = initialRes.data.id;

    const invalidDateRenew = await service.renewLease(
      {
        previousLeaseId: oldLeaseId,
        propertyId: 'prop-101',
        startDate: '2026-10-01',
        endDate: '2026-05-01', // Before start date!
        rentAmount: 27000,
        tenantAssignments: [{ tenantId: 'tenant-john', role: 'primary', isPrimary: true }],
      },
      managerContext
    );

    expect(invalidDateRenew.success).toBe(false);
    if (!invalidDateRenew.success) {
      expect(invalidDateRenew.error).toBeInstanceOf(ValidationError);
    }
  });
});
