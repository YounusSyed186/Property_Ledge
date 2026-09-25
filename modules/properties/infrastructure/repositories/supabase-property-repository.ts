/**
 * Supabase Implementation of PropertyRepository.
 * Fully encapsulates all Supabase database queries and error translation.
 */

import { Result, ok, err } from '@/shared/domain/result';
import { DomainError, NotFoundError, toSafeDomainError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { TypedSupabaseClient } from '@/shared/infrastructure/database/supabase';
import { Property, PropertyFilters } from '../../domain/entities/property';
import {
  PropertyRepository,
  CreatePropertyData,
  UpdatePropertyData,
} from '../../domain/repositories/property-repository';
import {
  mapPropertyRowToDomain,
  mapCreateDataToRow,
  mapUpdateDataToRow,
} from '../mappers/property-mapper';

export class SupabasePropertyRepository implements PropertyRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async getById(id: string, _context?: RequestContext): Promise<Result<Property, DomainError>> {
    try {
      const { data, error } = await this.client
        .from('properties')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return err(toSafeDomainError(error));
      }

      if (!data) {
        return err(new NotFoundError('Property', id));
      }

      return ok(mapPropertyRowToDomain(data));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async list(filters: PropertyFilters, _context?: RequestContext): Promise<Result<Property[], DomainError>> {
    try {
      let query = this.client
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.workspaceId) {
        query = query.eq('workspace_id', filters.workspaceId);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok((data || []).map(mapPropertyRowToDomain));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async countByWorkspace(workspaceId: string, _context?: RequestContext): Promise<Result<number, DomainError>> {
    try {
      const { count, error } = await this.client
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .neq('status', 'archived');

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok(count || 0);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async create(data: CreatePropertyData, context: RequestContext): Promise<Result<Property, DomainError>> {
    try {
      const insertPayload = mapCreateDataToRow(data, context.userId);
      const { data: row, error } = await this.client
        .from('properties')
        .insert(insertPayload as never)
        .select()
        .single();

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok(mapPropertyRowToDomain(row));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async update(id: string, data: UpdatePropertyData, _context: RequestContext): Promise<Result<Property, DomainError>> {
    try {
      const updatePayload = mapUpdateDataToRow(data);
      const { data: row, error } = await this.client
        .from('properties')
        .update(updatePayload as never)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok(mapPropertyRowToDomain(row));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async archive(id: string, _context: RequestContext): Promise<Result<void, DomainError>> {
    try {
      const { error } = await this.client
        .from('properties')
        .update({ status: 'archived', updated_at: new Date().toISOString() } as never)
        .eq('id', id);

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok(undefined);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async restore(id: string, _context: RequestContext): Promise<Result<Property, DomainError>> {
    try {
      const { data, error } = await this.client
        .from('properties')
        .update({ status: 'active', updated_at: new Date().toISOString() } as never)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok(mapPropertyRowToDomain(data));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }

  async delete(id: string, _context: RequestContext): Promise<Result<void, DomainError>> {
    try {
      // Nullify activity_logs.property_id to avoid cascade locks on audit history
      try {
        await this.client.from('activity_logs').update({ property_id: null } as never).eq('property_id', id);
      } catch {}

      // Delete dependent records
      await this.client.from('lease_tenants').delete().eq('property_id', id);
      await this.client.from('leases').delete().eq('property_id', id);
      await this.client.from('tenants').delete().eq('property_id', id);
      await this.client.from('transactions').delete().eq('property_id', id);
      await this.client.from('expected_payment_schedule').delete().eq('property_id', id);
      await this.client.from('maintenance_requests').delete().eq('property_id', id);
      await this.client.from('inspections').delete().eq('property_id', id);
      await this.client.from('documents').delete().eq('property_id', id);
      await this.client.from('tasks').delete().eq('property_id', id);
      await this.client.from('property_members').delete().eq('property_id', id);

      const { error } = await this.client.from('properties').delete().eq('id', id);
      if (error) {
        return err(toSafeDomainError(error));
      }

      return ok(undefined);
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }
}
