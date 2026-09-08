/**
 * Supabase Implementation of LeaseRepository.
 */

import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, NotFoundError, ConflictError, toSafeDomainError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { TypedSupabaseClient } from '@/shared/infrastructure/database/supabase';
import { Lease, LeaseFilters, LeaseTenantAssignment } from '../../domain/entities/lease';
import {
  LeaseRepository,
  CreateLeaseData,
  UpdateLeaseData,
  RenewLeaseData,
} from '../../domain/repositories/lease-repository';
import {
  mapLeaseRowToDomain,
  mapCreateLeaseDataToRow,
  mapUpdateLeaseDataToRow,
} from '../mappers/lease-mapper';

export class SupabaseLeaseRepository implements LeaseRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async getById(id: string, _context?: RequestContext): Promise<Result<Lease, DomainError>> {
    try {
      const { data, error } = await this.client
        .from('leases')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return err(toSafeDomainError(error));
      }

      if (!data) {
        return err(new NotFoundError('Lease', id));
      }

      const tenantsRes = await this.getLeaseTenants(id);
      const tenants = tenantsRes.success ? tenantsRes.data : [];

      return ok(mapLeaseRowToDomain(data, tenants));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async listByProperty(propertyId: string, _context?: RequestContext): Promise<Result<Lease[], DomainError>> {
    try {
      const { data, error } = await this.client
        .from('leases')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok((data || []).map((row) => mapLeaseRowToDomain(row, [])));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async listByWorkspace(workspaceId: string, _context?: RequestContext): Promise<Result<Lease[], DomainError>> {
    try {
      const { data, error } = await this.client
        .from('leases')
        .select(`
          *,
          properties!inner (
            id,
            name,
            workspace_id
          )
        `)
        .eq('properties.workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok((data || []).map((row) => mapLeaseRowToDomain(row as never, [])));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async list(filters: LeaseFilters, _context?: RequestContext): Promise<Result<Lease[], DomainError>> {
    try {
      let query = this.client
        .from('leases')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.propertyId) {
        query = query.eq('property_id', filters.propertyId);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok((data || []).map((row) => mapLeaseRowToDomain(row, [])));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async create(data: CreateLeaseData, context: RequestContext): Promise<Result<Lease, DomainError>> {
    try {
      const row = mapCreateLeaseDataToRow(data, context.userId);
      const { data: created, error } = await this.client
        .from('leases')
        .insert(row as never)
        .select()
        .single();

      if (error) {
        return err(toSafeDomainError(error));
      }

      const leaseId = (created as { id: string }).id;

      // Assign tenants if provided
      const tenantAssignments: LeaseTenantAssignment[] = [];
      if (data.tenantAssignments && data.tenantAssignments.length > 0) {
        for (const assign of data.tenantAssignments) {
          await this.client.from('lease_tenants').insert({
            lease_id: leaseId,
            tenant_id: assign.tenantId,
            property_id: data.propertyId,
            role: assign.role || 'primary',
            is_primary: assign.isPrimary ?? false,
          } as never);

          tenantAssignments.push({
            tenantId: assign.tenantId,
            role: assign.role || 'primary',
            isPrimary: assign.isPrimary ?? false,
          });
        }
      }

      return ok(mapLeaseRowToDomain(created, tenantAssignments));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async update(id: string, data: UpdateLeaseData, _context: RequestContext): Promise<Result<Lease, DomainError>> {
    try {
      const row = mapUpdateLeaseDataToRow(data);
      const { data: updated, error } = await this.client
        .from('leases')
        .update(row as never)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return err(toSafeDomainError(error));
      }

      // Update tenant assignments if provided
      if (data.tenantAssignments) {
        await this.client.from('lease_tenants').delete().eq('lease_id', id);
        for (const assign of data.tenantAssignments) {
          await this.client.from('lease_tenants').insert({
            lease_id: id,
            tenant_id: assign.tenantId,
            property_id: (updated as { property_id: string }).property_id,
            role: assign.role || 'primary',
            is_primary: assign.isPrimary ?? false,
          } as never);
        }
      }

      const tenantsRes = await this.getLeaseTenants(id);
      const tenants = tenantsRes.success ? tenantsRes.data : [];

      return ok(mapLeaseRowToDomain(updated, tenants));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async archive(id: string, _context: RequestContext): Promise<Result<void, DomainError>> {
    try {
      const { error } = await this.client
        .from('leases')
        .update({ status: 'terminated', updated_at: new Date().toISOString() } as never)
        .eq('id', id);

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok(undefined);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async restore(id: string, _context: RequestContext): Promise<Result<Lease, DomainError>> {
    try {
      const { data, error } = await this.client
        .from('leases')
        .update({ status: 'active', updated_at: new Date().toISOString() } as never)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return err(toSafeDomainError(error));
      }

      const tenantsRes = await this.getLeaseTenants(id);
      const tenants = tenantsRes.success ? tenantsRes.data : [];

      return ok(mapLeaseRowToDomain(data, tenants));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async delete(id: string, _context: RequestContext): Promise<Result<void, DomainError>> {
    try {
      await this.client.from('lease_tenants').delete().eq('lease_id', id);
      const { error } = await this.client.from('leases').delete().eq('id', id);
      if (error) {
        return err(toSafeDomainError(error));
      }
      return ok(undefined);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async renewLease(
    previousLeaseId: string,
    data: RenewLeaseData,
    context: RequestContext
  ): Promise<Result<Lease, DomainError>> {
    try {
      // 1. Validate previous lease existence and status
      const { data: prevLease, error: prevErr } = await this.client
        .from('leases')
        .select('*')
        .eq('id', previousLeaseId)
        .maybeSingle();

      if (prevErr) {
        return err(toSafeDomainError(prevErr));
      }
      if (!prevLease) {
        return err(new NotFoundError('Previous Lease', previousLeaseId));
      }
      if (prevLease.status === 'renewed') {
        return err(new ConflictError('Lease has already been renewed.'));
      }

      // 2. Idempotency check: verify no active renewal already links to this previous lease
      const { data: existingRenewal, error: existErr } = await this.client
        .from('leases')
        .select('id, status')
        .eq('renewed_from_lease_id', previousLeaseId)
        .in('status', ['active', 'pending', 'draft'])
        .maybeSingle();

      if (existErr) {
        return err(toSafeDomainError(existErr));
      }
      if (existingRenewal) {
        return err(new ConflictError('An active renewal already exists for this lease.'));
      }

      // 3. Create the new lease record
      const newLeaseInsert = {
        property_id: data.propertyId,
        unit_id: data.unitId || null,
        start_date: data.startDate,
        end_date: data.endDate || null,
        rent_amount: data.rentAmount,
        security_deposit: data.securityDeposit ?? 0,
        payment_due_day: data.paymentDueDay ?? 1,
        rent_frequency: data.rentFrequency || 'monthly',
        notes: data.notes || null,
        status: 'active' as const,
        renewed_from_lease_id: previousLeaseId,
        created_by: context.userId,
      };

      const { data: created, error: createErr } = await this.client
        .from('leases')
        .insert(newLeaseInsert as never)
        .select()
        .single();

      if (createErr || !created) {
        return err(toSafeDomainError(createErr || new Error('Failed to create new renewal lease.')));
      }

      const newLeaseId = (created as { id: string }).id;

      // 4. Create new lease_tenants relationships (reusing tenant IDs, old lease_tenants remain intact)
      const tenantAssignments: LeaseTenantAssignment[] = [];
      try {
        if (data.tenantAssignments && data.tenantAssignments.length > 0) {
          for (const assign of data.tenantAssignments) {
            const { error: assignErr } = await this.client.from('lease_tenants').insert({
              lease_id: newLeaseId,
              tenant_id: assign.tenantId,
              property_id: data.propertyId,
              role: assign.role || 'primary',
              is_primary: assign.isPrimary ?? false,
            } as never);

            if (assignErr) {
              throw assignErr;
            }

            tenantAssignments.push({
              tenantId: assign.tenantId,
              role: assign.role || 'primary',
              isPrimary: assign.isPrimary ?? false,
            });
          }
        }

        // 5. Update previous lease status to 'renewed'
        const { error: updatePrevErr } = await this.client
          .from('leases')
          .update({
            status: 'renewed',
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', previousLeaseId);

        if (updatePrevErr) {
          throw updatePrevErr;
        }
      } catch (innerErr) {
        // Rollback created lease on partial failure
        await this.client.from('lease_tenants').delete().eq('lease_id', newLeaseId);
        await this.client.from('leases').delete().eq('id', newLeaseId);
        return err(toSafeDomainError(innerErr));
      }

      return ok(mapLeaseRowToDomain(created, tenantAssignments));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async getRenewalHistory(leaseId: string, _context?: RequestContext): Promise<Result<Lease[], DomainError>> {
    try {
      const { data: current, error: curErr } = await this.client
        .from('leases')
        .select('*')
        .eq('id', leaseId)
        .maybeSingle();

      if (curErr || !current) {
        return err(curErr ? toSafeDomainError(curErr) : new NotFoundError('Lease', leaseId));
      }

      // Fetch all leases for this property to construct the lineage
      const { data: allLeases, error: listErr } = await this.client
        .from('leases')
        .select('*')
        .eq('property_id', (current as { property_id: string }).property_id)
        .order('start_date', { ascending: true });

      if (listErr) {
        return err(toSafeDomainError(listErr));
      }

      const rows = allLeases || [];
      const history: Lease[] = [];

      // Find predecessors
      let currentCheck: any = current;
      const predecessorIds: string[] = [];
      while (currentCheck?.renewed_from_lease_id) {
        predecessorIds.unshift(currentCheck.renewed_from_lease_id);
        currentCheck = rows.find((r: any) => r.id === currentCheck.renewed_from_lease_id);
      }

      // Find successors
      const successorIds: string[] = [];
      let nextId = leaseId;
      while (nextId) {
        const next = rows.find((r: any) => r.renewed_from_lease_id === nextId);
        if (next) {
          successorIds.push((next as { id: string }).id);
          nextId = (next as { id: string }).id;
        } else {
          break;
        }
      }

      const fullChainIds = [...predecessorIds, leaseId, ...successorIds];
      const chainRows = fullChainIds
        .map((id) => rows.find((r: any) => r.id === id))
        .filter(Boolean);

      for (const row of chainRows) {
        const tenantsRes = await this.getLeaseTenants((row as { id: string }).id);
        const tenants = tenantsRes.success ? tenantsRes.data : [];
        history.push(mapLeaseRowToDomain(row as never, tenants));
      }

      return ok(history);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async getLeaseTenants(leaseId: string, _context?: RequestContext): Promise<Result<LeaseTenantAssignment[], DomainError>> {
    try {
      const { data, error } = await this.client
        .from('lease_tenants')
        .select(`
          tenant_id,
          role,
          is_primary,
          tenants (
            first_name,
            last_name,
            email
          )
        `)
        .eq('lease_id', leaseId);

      if (error) {
        return err(toSafeDomainError(error));
      }

      const mapped: LeaseTenantAssignment[] = (data || []).map((row: any) => ({
        tenantId: row.tenant_id,
        role: row.role,
        isPrimary: row.is_primary,
        tenantName: row.tenants ? `${row.tenants.first_name} ${row.tenants.last_name}`.trim() : undefined,
        tenantEmail: row.tenants?.email || undefined,
      }));

      return ok(mapped);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }
}
