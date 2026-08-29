-- RBAC Seed: permissions, system roles, migrate workspace_members, migrate pending invites

-- -----------------------------------------------------------------------------
-- Seed PLATFORM permissions
-- -----------------------------------------------------------------------------
INSERT INTO public.permissions (key, name, description, scope, resource, action) VALUES
  ('user.view', 'View Users', 'View platform users', 'PLATFORM', 'user', 'view'),
  ('user.create', 'Create Users', 'Create platform users', 'PLATFORM', 'user', 'create'),
  ('user.update', 'Update Users', 'Update platform users', 'PLATFORM', 'user', 'update'),
  ('user.delete', 'Delete Users', 'Delete platform users', 'PLATFORM', 'user', 'delete'),
  ('platform_role.view', 'View Platform Roles', 'View platform roles', 'PLATFORM', 'platform_role', 'view'),
  ('platform_role.create', 'Create Platform Roles', 'Create platform roles', 'PLATFORM', 'platform_role', 'create'),
  ('platform_role.update', 'Update Platform Roles', 'Update platform roles', 'PLATFORM', 'platform_role', 'update'),
  ('platform_role.delete', 'Delete Platform Roles', 'Delete platform roles', 'PLATFORM', 'platform_role', 'delete'),
  ('team.view', 'View Teams', 'View workspaces/teams', 'PLATFORM', 'team', 'view'),
  ('team.create', 'Create Teams', 'Create workspaces/teams', 'PLATFORM', 'team', 'create'),
  ('team.update', 'Update Teams', 'Update workspaces/teams', 'PLATFORM', 'team', 'update'),
  ('team.delete', 'Delete Teams', 'Delete workspaces/teams', 'PLATFORM', 'team', 'delete'),
  ('team_role.view', 'View Team Roles', 'View team role definitions', 'PLATFORM', 'team_role', 'view'),
  ('team_role.create', 'Create Team Roles', 'Create system team roles', 'PLATFORM', 'team_role', 'create'),
  ('team_role.update', 'Update Team Roles', 'Update team role definitions', 'PLATFORM', 'team_role', 'update'),
  ('team_role.delete', 'Delete Team Roles', 'Delete team roles', 'PLATFORM', 'team_role', 'delete'),
  ('team_role.assign', 'Assign Team Roles', 'Assign team roles platform-wide', 'PLATFORM', 'team_role', 'assign'),
  ('subscription.view', 'View Subscriptions', 'View subscriptions', 'PLATFORM', 'subscription', 'view'),
  ('subscription.manage', 'Manage Subscriptions', 'Manage subscriptions', 'PLATFORM', 'subscription', 'manage'),
  ('billing.view', 'View Billing', 'View billing', 'PLATFORM', 'billing', 'view'),
  ('billing.manage', 'Manage Billing', 'Manage billing', 'PLATFORM', 'billing', 'manage'),
  ('audit.view', 'View Audit Logs', 'View audit logs', 'PLATFORM', 'audit', 'view'),
  ('platform.settings.view', 'View Platform Settings', 'View platform settings', 'PLATFORM', 'platform.settings', 'view'),
  ('platform.settings.update', 'Update Platform Settings', 'Update platform settings', 'PLATFORM', 'platform.settings', 'update'),
  ('team.admin_access', 'Team Admin Access', 'Administrative access to workspaces', 'PLATFORM', 'team', 'admin_access'),
  ('team.data.view', 'View Team Data', 'View workspace data as admin', 'PLATFORM', 'team', 'data.view'),
  ('team.data.manage', 'Manage Team Data', 'Manage workspace data as admin', 'PLATFORM', 'team', 'data.manage'),
  ('team.impersonate', 'Impersonate Users', 'Impersonate workspace users', 'PLATFORM', 'team', 'impersonate')
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Seed TEAM permissions
-- -----------------------------------------------------------------------------
INSERT INTO public.permissions (key, name, description, scope, resource, action) VALUES
  ('property.view', 'View Properties', 'View properties', 'TEAM', 'property', 'view'),
  ('property.create', 'Create Properties', 'Create properties', 'TEAM', 'property', 'create'),
  ('property.update', 'Update Properties', 'Update properties', 'TEAM', 'property', 'update'),
  ('property.delete', 'Delete Properties', 'Delete properties', 'TEAM', 'property', 'delete'),
  ('tenant.view', 'View Tenants', 'View tenants', 'TEAM', 'tenant', 'view'),
  ('tenant.create', 'Create Tenants', 'Create tenants', 'TEAM', 'tenant', 'create'),
  ('tenant.update', 'Update Tenants', 'Update tenants', 'TEAM', 'tenant', 'update'),
  ('tenant.delete', 'Delete Tenants', 'Delete tenants', 'TEAM', 'tenant', 'delete'),
  ('lease.view', 'View Leases', 'View leases', 'TEAM', 'lease', 'view'),
  ('lease.create', 'Create Leases', 'Create leases', 'TEAM', 'lease', 'create'),
  ('lease.update', 'Update Leases', 'Update leases', 'TEAM', 'lease', 'update'),
  ('lease.delete', 'Delete Leases', 'Delete leases', 'TEAM', 'lease', 'delete'),
  ('invoice.view', 'View Invoices', 'View invoices', 'TEAM', 'invoice', 'view'),
  ('invoice.create', 'Create Invoices', 'Create invoices', 'TEAM', 'invoice', 'create'),
  ('invoice.update', 'Update Invoices', 'Update invoices', 'TEAM', 'invoice', 'update'),
  ('invoice.delete', 'Delete Invoices', 'Delete invoices', 'TEAM', 'invoice', 'delete'),
  ('payment.view', 'View Payments', 'View payments', 'TEAM', 'payment', 'view'),
  ('payment.create', 'Create Payments', 'Create payments', 'TEAM', 'payment', 'create'),
  ('payment.update', 'Update Payments', 'Update payments', 'TEAM', 'payment', 'update'),
  ('payment.delete', 'Delete Payments', 'Delete payments', 'TEAM', 'payment', 'delete'),
  ('expense.view', 'View Expenses', 'View expenses', 'TEAM', 'expense', 'view'),
  ('expense.create', 'Create Expenses', 'Create expenses', 'TEAM', 'expense', 'create'),
  ('expense.update', 'Update Expenses', 'Update expenses', 'TEAM', 'expense', 'update'),
  ('expense.delete', 'Delete Expenses', 'Delete expenses', 'TEAM', 'expense', 'delete'),
  ('maintenance.view', 'View Maintenance', 'View maintenance requests', 'TEAM', 'maintenance', 'view'),
  ('maintenance.create', 'Create Maintenance', 'Create maintenance requests', 'TEAM', 'maintenance', 'create'),
  ('maintenance.update', 'Update Maintenance', 'Update maintenance requests', 'TEAM', 'maintenance', 'update'),
  ('maintenance.delete', 'Delete Maintenance', 'Delete maintenance requests', 'TEAM', 'maintenance', 'delete'),
  ('maintenance.assign', 'Assign Maintenance', 'Assign maintenance requests', 'TEAM', 'maintenance', 'assign'),
  ('inspection.view', 'View Inspections', 'View inspections', 'TEAM', 'inspection', 'view'),
  ('inspection.create', 'Create Inspections', 'Create inspections', 'TEAM', 'inspection', 'create'),
  ('inspection.update', 'Update Inspections', 'Update inspections', 'TEAM', 'inspection', 'update'),
  ('inspection.delete', 'Delete Inspections', 'Delete inspections', 'TEAM', 'inspection', 'delete'),
  ('document.view', 'View Documents', 'View documents', 'TEAM', 'document', 'view'),
  ('document.create', 'Create Documents', 'Create documents', 'TEAM', 'document', 'create'),
  ('document.update', 'Update Documents', 'Update documents', 'TEAM', 'document', 'update'),
  ('document.delete', 'Delete Documents', 'Delete documents', 'TEAM', 'document', 'delete'),
  ('task.view', 'View Tasks', 'View tasks', 'TEAM', 'task', 'view'),
  ('task.create', 'Create Tasks', 'Create tasks', 'TEAM', 'task', 'create'),
  ('task.update', 'Update Tasks', 'Update tasks', 'TEAM', 'task', 'update'),
  ('task.delete', 'Delete Tasks', 'Delete tasks', 'TEAM', 'task', 'delete'),
  ('team.member.view', 'View Members', 'View team members', 'TEAM', 'team.member', 'view'),
  ('team.member.invite', 'Invite Members', 'Invite team members', 'TEAM', 'team.member', 'invite'),
  ('team.member.update', 'Update Members', 'Update team members', 'TEAM', 'team.member', 'update'),
  ('team.member.remove', 'Remove Members', 'Remove team members', 'TEAM', 'team.member', 'remove'),
  ('team.settings.view', 'View Settings', 'View workspace settings', 'TEAM', 'team.settings', 'view'),
  ('team.settings.update', 'Update Settings', 'Update workspace settings', 'TEAM', 'team.settings', 'update'),
  ('team.role.view', 'View Roles', 'View team roles', 'TEAM', 'team.role', 'view'),
  ('team.role.assign', 'Assign Roles', 'Assign team roles', 'TEAM', 'team.role', 'assign'),
  ('team.role.create', 'Create Roles', 'Create custom team roles', 'TEAM', 'team.role', 'create'),
  ('team.role.update', 'Update Roles', 'Update custom team roles', 'TEAM', 'team.role', 'update'),
  ('team.role.delete', 'Delete Roles', 'Delete custom team roles', 'TEAM', 'team.role', 'delete')
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Seed platform roles
-- -----------------------------------------------------------------------------
INSERT INTO public.platform_roles (name, description, is_system_role) VALUES
  ('Super Admin', 'Full platform access', true),
  ('Support Admin', 'Customer support operations', true),
  ('Billing Admin', 'Billing and subscription management', true)
ON CONFLICT (name) DO NOTHING;

-- Super Admin gets all PLATFORM permissions
INSERT INTO public.platform_role_permissions (role_id, permission_id)
SELECT pr.id, p.id
FROM public.platform_roles pr
CROSS JOIN public.permissions p
WHERE pr.name = 'Super Admin' AND p.scope = 'PLATFORM'
ON CONFLICT DO NOTHING;

-- Support Admin subset
INSERT INTO public.platform_role_permissions (role_id, permission_id)
SELECT pr.id, p.id
FROM public.platform_roles pr
CROSS JOIN public.permissions p
WHERE pr.name = 'Support Admin'
  AND p.key IN ('user.view', 'team.view', 'team.admin_access', 'team.data.view', 'audit.view')
ON CONFLICT DO NOTHING;

-- Billing Admin subset
INSERT INTO public.platform_role_permissions (role_id, permission_id)
SELECT pr.id, p.id
FROM public.platform_roles pr
CROSS JOIN public.permissions p
WHERE pr.name = 'Billing Admin'
  AND p.key IN ('subscription.view', 'subscription.manage', 'billing.view', 'billing.manage', 'audit.view')
ON CONFLICT DO NOTHING;

-- Migrate platform_admins to Super Admin role
INSERT INTO public.platform_user_roles (user_id, role_id)
SELECT pa.user_id, pr.id
FROM public.platform_admins pa
CROSS JOIN public.platform_roles pr
WHERE pa.status = 'active' AND pr.name = 'Super Admin'
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Seed system team roles
-- -----------------------------------------------------------------------------
INSERT INTO public.team_roles (workspace_id, name, description, is_system_role)
SELECT v.workspace_id, v.name, v.description, v.is_system_role
FROM (VALUES
  (NULL::UUID, 'Owner', 'Full workspace control', true),
  (NULL::UUID, 'Admin', 'Administrative workspace access', true),
  (NULL::UUID, 'Manager', 'Operational management', true),
  (NULL::UUID, 'Viewer', 'Read-only workspace access', true),
  (NULL::UUID, 'Landlord', 'Property owner access', true),
  (NULL::UUID, 'Leasing Agent', 'Leasing and tenant operations', true),
  (NULL::UUID, 'Staff', 'Maintenance and task operations', true)
) AS v(workspace_id, name, description, is_system_role)
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_roles tr
  WHERE tr.workspace_id IS NULL AND lower(tr.name) = lower(v.name)
);

-- Helper to attach permissions to a system role by name
CREATE OR REPLACE FUNCTION public._seed_team_role_perms(p_role_name TEXT, p_perm_keys TEXT[])
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_role_id UUID;
  v_key TEXT;
  v_perm_id UUID;
BEGIN
  SELECT id INTO v_role_id FROM public.team_roles
  WHERE lower(name) = lower(p_role_name) AND workspace_id IS NULL;
  IF v_role_id IS NULL THEN RETURN; END IF;
  FOREACH v_key IN ARRAY p_perm_keys LOOP
    SELECT id INTO v_perm_id FROM public.permissions WHERE key = v_key AND scope = 'TEAM';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO public.team_role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Owner: all TEAM permissions
INSERT INTO public.team_role_permissions (role_id, permission_id)
SELECT tr.id, p.id
FROM public.team_roles tr
CROSS JOIN public.permissions p
WHERE tr.name = 'Owner' AND tr.workspace_id IS NULL AND p.scope = 'TEAM'
ON CONFLICT DO NOTHING;

-- Admin: all except team.role.create/delete on system (same as owner for V1 workspace ops)
INSERT INTO public.team_role_permissions (role_id, permission_id)
SELECT tr.id, p.id
FROM public.team_roles tr
CROSS JOIN public.permissions p
WHERE tr.name = 'Admin' AND tr.workspace_id IS NULL AND p.scope = 'TEAM'
  AND p.key NOT IN ('team.role.create', 'team.role.delete')
ON CONFLICT DO NOTHING;

-- Manager permissions
SELECT public._seed_team_role_perms('Manager', ARRAY[
  'property.view','property.create','property.update',
  'tenant.view','tenant.create','tenant.update',
  'lease.view','lease.create','lease.update',
  'invoice.view','invoice.create','invoice.update',
  'payment.view','payment.create','payment.update',
  'expense.view','expense.create','expense.update',
  'maintenance.view','maintenance.create','maintenance.update','maintenance.assign',
  'inspection.view','inspection.create','inspection.update',
  'document.view','document.create','document.update',
  'task.view','task.create','task.update',
  'team.member.view','team.member.invite','team.member.update',
  'team.settings.view','team.role.view','team.role.assign'
]);

-- Viewer permissions (read-only)
INSERT INTO public.team_role_permissions (role_id, permission_id)
SELECT tr.id, p.id
FROM public.team_roles tr
CROSS JOIN public.permissions p
WHERE tr.name = 'Viewer' AND tr.workspace_id IS NULL AND p.scope = 'TEAM'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- Landlord permissions (similar to manager + property.delete)
SELECT public._seed_team_role_perms('Landlord', ARRAY[
  'property.view','property.create','property.update','property.delete',
  'tenant.view','tenant.create','tenant.update',
  'lease.view','lease.create','lease.update',
  'invoice.view','payment.view','expense.view',
  'maintenance.view','inspection.view','document.view','task.view',
  'team.member.view','team.settings.view'
]);

-- Leasing Agent
SELECT public._seed_team_role_perms('Leasing Agent', ARRAY[
  'property.view','tenant.view','tenant.create','tenant.update',
  'lease.view','lease.create','lease.update',
  'document.view','document.create','task.view','task.create',
  'team.member.view'
]);

-- Staff
SELECT public._seed_team_role_perms('Staff', ARRAY[
  'property.view','maintenance.view','maintenance.create','maintenance.update',
  'task.view','task.create','task.update','document.view','team.member.view'
]);

DROP FUNCTION IF EXISTS public._seed_team_role_perms(TEXT, TEXT[]);

-- -----------------------------------------------------------------------------
-- Map workspace_members.role TEXT -> role_id
-- -----------------------------------------------------------------------------
UPDATE public.workspace_members wm
SET role_id = tr.id
FROM public.team_roles tr
WHERE tr.workspace_id IS NULL
  AND wm.role_id IS NULL
  AND (
    (wm.role = 'owner' AND lower(tr.name) = 'owner') OR
    (wm.role = 'admin' AND lower(tr.name) = 'admin') OR
    (wm.role = 'manager' AND lower(tr.name) = 'manager') OR
    (wm.role = 'agent' AND lower(tr.name) = 'leasing agent') OR
    (wm.role = 'staff' AND lower(tr.name) = 'staff') OR
    (wm.role = 'viewer' AND lower(tr.name) = 'viewer')
  );

-- Ensure workspace owners have Owner role_id on active membership
UPDATE public.workspace_members wm
SET role_id = (SELECT id FROM public.team_roles WHERE lower(name) = 'owner' AND workspace_id IS NULL LIMIT 1)
FROM public.workspaces w
WHERE w.id = wm.workspace_id
  AND w.owner_id = wm.user_id
  AND wm.status = 'active'
  AND wm.role_id IS NULL;

-- Fallback unmapped to Viewer
UPDATE public.workspace_members
SET role_id = (SELECT id FROM public.team_roles WHERE lower(name) = 'viewer' AND workspace_id IS NULL LIMIT 1)
WHERE role_id IS NULL;

-- -----------------------------------------------------------------------------
-- Migrate pending invited workspace_members to workspace_invitations
-- -----------------------------------------------------------------------------
INSERT INTO public.workspace_invitations (
  workspace_id, invited_by, profile_id, role_id, invite_type, status, expires_at, created_at
)
SELECT
  wm.workspace_id,
  COALESCE(wm.invited_by, w.owner_id),
  wm.user_id,
  wm.role_id,
  'LINK',
  'pending',
  NOW() + INTERVAL '7 days',
  wm.created_at
FROM public.workspace_members wm
JOIN public.workspaces w ON w.id = wm.workspace_id
WHERE wm.status = 'invited'
  AND NOT EXISTS (
    SELECT 1 FROM public.workspace_invitations wi
    WHERE wi.workspace_id = wm.workspace_id
      AND wi.profile_id = wm.user_id
      AND wi.status = 'pending'
  );

-- Remove invited placeholder member rows (invitation is now separate)
DELETE FROM public.workspace_members WHERE status = 'invited';
