/**
 * Decoupled Application Services Unit Tests.
 * Proves that PropertyService, TenantService, and LeaseService can be fully tested
 * without Supabase, PostgREST, or any database connection using in-memory repositories.
 */

import { test, expect } from '@playwright/test';
import { ok, err } from '@/shared/domain/result';
import { NotFoundError } from '@/shared/domain/errors';
import { Property, PropertyFilters } from '@/modules/properties/domain/entities/property';
import { PropertyRepository, CreatePropertyData, UpdatePropertyData } from '@/modules/properties/domain/repositories/property-repository';
import { PropertyService } from '@/modules/properties/application/services/property-service';

import { Tenant, TenantFilters } from '@/modules/tenants/domain/entities/tenant';
import { TenantRepository, CreateTenantData, UpdateTenantData } from '@/modules/tenants/domain/repositories/tenant-repository';
import { TenantService } from '@/modules/tenants/application/services/tenant-service';

import { Lease, LeaseFilters, LeaseTenantAssignment } from '@/modules/leases/domain/entities/lease';
import { LeaseRepository, CreateLeaseData, UpdateLeaseData } from '@/modules/leases/domain/repositories/lease-repository';
import { LeaseService } from '@/modules/leases/application/services/lease-service';

// --- In-Memory Fakes ---

class InMemoryPropertyRepository implements PropertyRepository {
  public properties: Property[] = [];

  async getById(id: string) {
    const found = this.properties.find((p) => p.id === id);
    if (!found) return err(new NotFoundError('Property', id));
    return ok(found);
  }

  async list(filters: PropertyFilters) {
    let result = [...this.properties];
    if (filters.workspaceId) {
      result = result.filter((p) => p.workspaceId === filters.workspaceId);
    }
    if (filters.status && filters.status !== 'all') {
      result = result.filter((p) => p.status === filters.status);
    }
    return ok(result);
  }

  async countByWorkspace(workspaceId: string) {
    const count = this.properties.filter((p) => p.workspaceId === workspaceId && p.status !== 'archived').length;
    return ok(count);
  }

  async create(data: CreatePropertyData) {
    const prop: Property = {
      id: `prop-${this.properties.length + 1}`,
      workspaceId: data.workspaceId,
      ownerId: 'owner-1',
      name: data.name,
      propertyType: data.propertyType,
      propertyCategory: data.propertyCategory,
      status: 'active',
      address: {
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        suburb: data.suburb,
        state: data.state || 'VIC',
        postalCode: data.postalCode || '3000',
        country: data.country || 'Australia',
      },
      parkingSpaces: data.parkingSpaces,
      imageUrl: data.imageUrl,
      rentAmount: data.rentAmount,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.properties.push(prop);
    return ok(prop);
  }

  async update(id: string, data: UpdatePropertyData) {
    const idx = this.properties.findIndex((p) => p.id === id);
    if (idx === -1) return err(new NotFoundError('Property', id));
    const current = this.properties[idx];
    const updated: Property = {
      ...current,
      name: data.name ?? current.name,
      status: data.status ?? current.status,
      updatedAt: new Date().toISOString(),
    };
    this.properties[idx] = updated;
    return ok(updated);
  }

  async archive(id: string) {
    const idx = this.properties.findIndex((p) => p.id === id);
    if (idx === -1) return err(new NotFoundError('Property', id));
    this.properties[idx].status = 'archived';
    return ok(undefined);
  }

  async restore(id: string) {
    const idx = this.properties.findIndex((p) => p.id === id);
    if (idx === -1) return err(new NotFoundError('Property', id));
    this.properties[idx].status = 'active';
    return ok(this.properties[idx]);
  }

  async delete(id: string) {
    this.properties = this.properties.filter((p) => p.id !== id);
    return ok(undefined);
  }
}

class InMemoryTenantRepository implements TenantRepository {
  public tenants: Tenant[] = [];

  async getById(id: string) {
    const found = this.tenants.find((t) => t.id === id);
    if (!found) return err(new NotFoundError('Tenant', id));
    return ok(found);
  }

  async listByProperty(propertyId: string) {
    return ok(this.tenants.filter((t) => t.propertyId === propertyId));
  }

  async listByWorkspace(_workspaceId: string) {
    return ok([...this.tenants]);
  }

  async list(_filters: TenantFilters) {
    return ok([...this.tenants]);
  }

  async create(data: CreateTenantData) {
    const tenant: Tenant = {
      id: `tenant-${this.tenants.length + 1}`,
      propertyId: data.propertyId,
      userId: data.userId,
      firstName: data.firstName,
      lastName: data.lastName,
      fullName: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      status: data.status || 'active',
      dateOfBirth: data.dateOfBirth,
      emergencyContact: {
        name: data.emergencyContactName,
        phone: data.emergencyContactPhone,
      },
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tenants.push(tenant);
    return ok(tenant);
  }

  async update(id: string, data: UpdateTenantData) {
    const idx = this.tenants.findIndex((t) => t.id === id);
    if (idx === -1) return err(new NotFoundError('Tenant', id));
    const current = this.tenants[idx];
    const updated: Tenant = {
      ...current,
      firstName: data.firstName ?? current.firstName,
      lastName: data.lastName ?? current.lastName,
      fullName: `${data.firstName ?? current.firstName} ${data.lastName ?? current.lastName}`,
      email: data.email ?? current.email,
      status: data.status ?? current.status,
      updatedAt: new Date().toISOString(),
    };
    this.tenants[idx] = updated;
    return ok(updated);
  }

  async archive(id: string) {
    const idx = this.tenants.findIndex((t) => t.id === id);
    if (idx === -1) return err(new NotFoundError('Tenant', id));
    this.tenants[idx].status = 'archived';
    return ok(undefined);
  }

  async restore(id: string) {
    const idx = this.tenants.findIndex((t) => t.id === id);
    if (idx === -1) return err(new NotFoundError('Tenant', id));
    this.tenants[idx].status = 'active';
    return ok(this.tenants[idx]);
  }

  async delete(id: string) {
    this.tenants = this.tenants.filter((t) => t.id !== id);
    return ok(undefined);
  }
}

class InMemoryLeaseRepository implements LeaseRepository {
  public leases: Lease[] = [];

  async getById(id: string) {
    const found = this.leases.find((l) => l.id === id);
    if (!found) return err(new NotFoundError('Lease', id));
    return ok(found);
  }

  async listByProperty(propertyId: string) {
    return ok(this.leases.filter((l) => l.propertyId === propertyId));
  }

  async listByWorkspace(_workspaceId: string) {
    return ok([...this.leases]);
  }

  async list(_filters: LeaseFilters) {
    return ok([...this.leases]);
  }

  async create(data: CreateLeaseData) {
    const lease: Lease = {
      id: `lease-${this.leases.length + 1}`,
      propertyId: data.propertyId,
      unitId: data.unitId,
      status: data.status || 'active',
      startDate: data.startDate,
      endDate: data.endDate,
      rentAmount: data.rentAmount,
      securityDeposit: data.securityDeposit ?? 0,
      paymentDueDay: data.paymentDueDay ?? 1,
      rentFrequency: data.rentFrequency || 'monthly',
      notes: data.notes,
      tenants: (data.tenantAssignments || []).map((t) => ({
        tenantId: t.tenantId,
        role: t.role || 'primary',
        isPrimary: t.isPrimary ?? false,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.leases.push(lease);
    return ok(lease);
  }

  async update(id: string, data: UpdateLeaseData) {
    const idx = this.leases.findIndex((l) => l.id === id);
    if (idx === -1) return err(new NotFoundError('Lease', id));
    const current = this.leases[idx];
    const updated: Lease = {
      ...current,
      rentAmount: data.rentAmount ?? current.rentAmount,
      status: data.status ?? current.status,
      updatedAt: new Date().toISOString(),
    };
    this.leases[idx] = updated;
    return ok(updated);
  }

  async archive(id: string) {
    const idx = this.leases.findIndex((l) => l.id === id);
    if (idx === -1) return err(new NotFoundError('Lease', id));
    this.leases[idx].status = 'terminated';
    return ok(undefined);
  }

  async restore(id: string) {
    const idx = this.leases.findIndex((l) => l.id === id);
    if (idx === -1) return err(new NotFoundError('Lease', id));
    this.leases[idx].status = 'active';
    return ok(this.leases[idx]);
  }

  async delete(id: string) {
    this.leases = this.leases.filter((l) => l.id !== id);
    return ok(undefined);
  }

  async getLeaseTenants(leaseId: string) {
    const found = this.leases.find((l) => l.id === leaseId);
    if (!found) return err(new NotFoundError('Lease', leaseId));
    return ok(found.tenants);
  }
}

// --- Test Suites ---

test.describe('PropertyService (Decoupled with InMemory Repository)', () => {
  const context = { userId: 'user-123', workspaceId: 'ws-456' };

  test('creates, lists, archives, and restores a property successfully without database', async () => {
    const repo = new InMemoryPropertyRepository();
    const service = new PropertyService(repo);

    // Create property
    const createRes = await service.createProperty(
      {
        workspaceId: 'ws-456',
        name: 'Sunnyvale Apartment',
        address: '100 Sunshine Way',
        suburb: 'Toorak',
        rentAmount: 750,
      },
      context
    );
    expect(createRes.success).toBe(true);
    if (!createRes.success) return;
    expect(createRes.data.name).toBe('Sunnyvale Apartment');
    expect(createRes.data.status).toBe('active');

    // List properties
    const listRes = await service.listProperties({ workspaceId: 'ws-456' });
    expect(listRes.success).toBe(true);
    if (!listRes.success) return;
    expect(listRes.data.length).toBe(1);

    // Archive property
    const archiveRes = await service.archiveProperty(createRes.data.id, context);
    expect(archiveRes.success).toBe(true);

    const getArchivedRes = await service.getProperty(createRes.data.id);
    expect(getArchivedRes.success).toBe(true);
    if (!getArchivedRes.success) return;
    expect(getArchivedRes.data.status).toBe('archived');

    // Restore property
    const restoreRes = await service.restoreProperty(createRes.data.id, context);
    expect(restoreRes.success).toBe(true);
    if (!restoreRes.success) return;
    expect(restoreRes.data.status).toBe('active');
  });

  test('validates required fields before persistence', async () => {
    const repo = new InMemoryPropertyRepository();
    const service = new PropertyService(repo);

    const failRes = await service.createProperty(
      {
        workspaceId: '',
        name: '',
        address: '',
      },
      context
    );
    expect(failRes.success).toBe(false);
  });
});

test.describe('TenantService (Decoupled with InMemory Repository)', () => {
  const context = { userId: 'user-123', workspaceId: 'ws-456' };

  test('creates, updates, and retrieves a tenant without database', async () => {
    const repo = new InMemoryTenantRepository();
    const service = new TenantService(repo);

    const createRes = await service.createTenant(
      {
        propertyId: 'prop-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        phone: '0412345678',
      },
      context
    );
    expect(createRes.success).toBe(true);
    if (!createRes.success) return;
    expect(createRes.data.fullName).toBe('Jane Doe');

    const updateRes = await service.updateTenant(
      createRes.data.id,
      { phone: '0499999999' },
      context
    );
    expect(updateRes.success).toBe(true);
  });
});

test.describe('LeaseService (Decoupled with InMemory Repository)', () => {
  const context = { userId: 'user-123', workspaceId: 'ws-456' };

  test('creates and assigns tenants to lease without database', async () => {
    const repo = new InMemoryLeaseRepository();
    const service = new LeaseService(repo);

    const createRes = await service.createLease(
      {
        propertyId: 'prop-1',
        startDate: '2026-09-01',
        rentAmount: 600,
        rentFrequency: 'weekly',
        tenantIds: ['tenant-1'],
      },
      context
    );
    expect(createRes.success).toBe(true);
    if (!createRes.success) return;
    expect(createRes.data.rentAmount).toBe(600);
    expect(createRes.data.tenants.length).toBe(1);
    expect(createRes.data.tenants[0].isPrimary).toBe(true);
  });
});
