'use server';

import { revalidatePath } from 'next/cache';
import {
  createAdminEntitlement,
  updateAdminEntitlement,
  deleteAdminEntitlement,
  createPlatformRole,
  updatePlatformRole,
  deletePlatformRole,
  updateSystemTeamRole,
} from '@/lib/admin/service';
import {
  getAdminEntitlementsWithUsage,
  getAdminEntitlementDetail,
  getAdminPlatformRolesWithStats,
  getAdminPlatformRoleDetail,
  getAdminSystemTeamRolesWithStats,
  getAdminSystemTeamRoleDetail,
  getPlatformPermissionsCatalog,
  getTeamPermissionsCatalog,
  getAdminPlatformRolesMatrixData,
  getAdminSystemTeamRolesMatrixData,
} from '@/lib/admin/queries';
import { requireAdmin } from '@/lib/admin/authorization';

const ENTITLEMENT_KEY_REGEX = /^[a-z][a-z0-9_.]*$/;

export async function fetchAdminEntitlementsWithUsage() {
  await requireAdmin();
  return getAdminEntitlementsWithUsage();
}

export async function fetchAdminEntitlementDetail(id: string) {
  await requireAdmin();
  return getAdminEntitlementDetail(id);
}

export async function handleCreateEntitlement(input: {
  key: string;
  name: string;
  description?: string;
  value_type: 'boolean' | 'number';
}) {
  await requireAdmin();
  if (!input.name.trim()) throw new Error('Display name is required.');
  if (!input.key.trim()) throw new Error('Machine key is required.');
  if (!ENTITLEMENT_KEY_REGEX.test(input.key)) {
    throw new Error('Machine key must be lowercase, use dot notation, and contain no spaces.');
  }
  const result = await createAdminEntitlement(input);
  revalidatePath('/admin/entitlements');
  return result;
}

export async function handleUpdateEntitlement(
  id: string,
  input: { name: string; description?: string }
) {
  await requireAdmin();
  if (!input.name.trim()) throw new Error('Display name is required.');
  const result = await updateAdminEntitlement(id, input);
  revalidatePath('/admin/entitlements');
  return result;
}

export async function handleDeleteEntitlement(id: string) {
  await requireAdmin();
  await deleteAdminEntitlement(id);
  revalidatePath('/admin/entitlements');
}

export async function fetchAdminPlatformRoles() {
  await requireAdmin();
  return getAdminPlatformRolesWithStats();
}

export async function fetchAdminPlatformRoleDetail(id: string) {
  await requireAdmin();
  return getAdminPlatformRoleDetail(id);
}

export async function fetchAdminPlatformRolesMatrixData() {
  await requireAdmin();
  return getAdminPlatformRolesMatrixData();
}

export async function fetchPlatformPermissions() {
  await requireAdmin();
  return getPlatformPermissionsCatalog();
}

export async function fetchTeamPermissionsCatalog() {
  await requireAdmin();
  return getTeamPermissionsCatalog();
}

export async function handleCreatePlatformRole(input: {
  name: string;
  description: string;
  permissionKeys: string[];
}) {
  await requireAdmin();
  if (!input.name.trim()) throw new Error('Role name is required.');
  const id = await createPlatformRole(input.name, input.description, input.permissionKeys);
  revalidatePath('/admin/platform-roles');
  return id;
}

export async function handleUpdatePlatformRole(input: {
  id: string;
  name: string;
  description: string;
  permissionKeys: string[];
}) {
  await requireAdmin();
  if (!input.name.trim()) throw new Error('Role name is required.');
  await updatePlatformRole(input.id, input.name, input.description, input.permissionKeys);
  revalidatePath('/admin/platform-roles');
}

export async function handleBatchUpdatePlatformRolePermissions(
  updates: Array<{ roleId: string; name: string; description: string; permissionKeys: string[] }>
) {
  await requireAdmin();
  for (const update of updates) {
    await updatePlatformRole(update.roleId, update.name, update.description, update.permissionKeys);
  }
  revalidatePath('/admin/platform-roles');
}

export async function handleDeletePlatformRole(id: string) {
  await requireAdmin();
  await deletePlatformRole(id);
  revalidatePath('/admin/platform-roles');
}

export async function fetchAdminSystemTeamRoles() {
  await requireAdmin();
  return getAdminSystemTeamRolesWithStats();
}

export async function fetchAdminSystemTeamRoleDetail(id: string) {
  await requireAdmin();
  return getAdminSystemTeamRoleDetail(id);
}

export async function fetchAdminSystemTeamRolesMatrixData() {
  await requireAdmin();
  return getAdminSystemTeamRolesMatrixData();
}

export async function handleUpdateSystemTeamRole(input: {
  id: string;
  description: string;
  permissionKeys: string[];
}) {
  await requireAdmin();
  await updateSystemTeamRole(input.id, input.description, input.permissionKeys);
  revalidatePath('/admin/team-roles');
}

export async function handleBatchUpdateSystemTeamRolePermissions(
  updates: Array<{ roleId: string; description: string; permissionKeys: string[] }>
) {
  await requireAdmin();
  for (const update of updates) {
    await updateSystemTeamRole(update.roleId, update.description, update.permissionKeys);
  }
  revalidatePath('/admin/team-roles');
}

