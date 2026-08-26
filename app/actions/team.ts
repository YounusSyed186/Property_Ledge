'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAuthenticatedUser } from '@/lib/dashboard/authorization';
import { emailService } from '@/lib/email/service';
import type { Database } from '@/types/database';

type WorkspaceRole = Database['public']['Tables']['workspace_members']['Insert']['role'];
type PropertyRole = Database['public']['Tables']['property_members']['Insert']['role'];

export type InvitationScope = 'workspace' | 'property';

export interface InvitationDetails {
  scope: InvitationScope;
  memberId: string;
  email: string;
  role: string;
  status: string;
  workspaceName?: string;
  propertyName?: string;
}

function buildInviteToken(scope: InvitationScope, memberId: string) {
  return `${scope === 'workspace' ? 'ws' : 'prop'}_${memberId}`;
}

function parseInviteToken(token: string): { scope: InvitationScope; memberId: string } | null {
  if (token.startsWith('ws_')) {
    return { scope: 'workspace', memberId: token.slice(3) };
  }
  if (token.startsWith('prop_')) {
    return { scope: 'property', memberId: token.slice(5) };
  }
  return null;
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = await createAdminClient();
  const normalized = email.trim().toLowerCase();

  let page = 1;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);

    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return match.id;

    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}

async function resolveOrInviteUserId(email: string): Promise<string> {
  const existing = await findUserIdByEmail(email);
  if (existing) return existing;

  const admin = await createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase());
  if (error || !data.user) {
    throw new Error(error?.message || 'Failed to invite user');
  }
  return data.user.id;
}

async function requireWorkspaceInvitePermission(workspaceId: string, userId: string) {
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single();

  if ((workspace as { owner_id?: string } | null)?.owner_id === userId) return;

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role, status')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  const role = (membership as { role?: string } | null)?.role;
  if (!role || !['owner', 'admin', 'manager'].includes(role)) {
    throw new Error('Forbidden: missing permission team.invite');
  }
}

async function sendTeamInviteEmail(params: {
  email: string;
  token: string;
  scope: InvitationScope;
  role: string;
  inviterName: string;
  targetName: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  await emailService.sendEmail({
    to: params.email,
    subject: `You've been invited to ${params.targetName} on PropertyLedge`,
    templateType: 'team-invite',
    variables: {
      title: 'Team Invitation',
      body: `${params.inviterName} invited you as ${params.role} to ${params.targetName}.`,
      inviteUrl: `${appUrl}/invite/${params.token}`,
      scope: params.scope,
    },
  });
}

export async function inviteWorkspaceMember(workspaceId: string, email: string, role: WorkspaceRole = 'viewer') {
  const user = await requireAuthenticatedUser();
  await requireWorkspaceInvitePermission(workspaceId, user.id);

  const inviteeId = await resolveOrInviteUserId(email);
  const supabase = await createClient();

  const { data: workspace } = await supabase.from('workspaces').select('name').eq('id', workspaceId).single();
  const workspaceName = (workspace as { name?: string } | null)?.name || 'a workspace';

  const { data: member, error } = await supabase
    .from('workspace_members')
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: inviteeId,
        role,
        status: 'invited',
        invited_by: user.id,
      } as never,
      { onConflict: 'workspace_id,user_id' }
    )
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  const memberRow = member as { id: string };
  const token = buildInviteToken('workspace', memberRow.id);
  await sendTeamInviteEmail({
    email,
    token,
    scope: 'workspace',
    role: role || 'viewer',
    inviterName: user.email || 'A team member',
    targetName: workspaceName,
  });

  revalidatePath('/dashboard/team');
  return { success: true, token, memberId: memberRow.id };
}

export async function invitePropertyMember(propertyId: string, email: string, role: PropertyRole = 'viewer') {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();
  const { data: canInvite, error: permError } = await supabase.rpc(
    'has_property_permission' as never,
    { p_property_id: propertyId, p_permission: 'team.invite' } as never
  );
  if (permError || !canInvite) {
    throw new Error('Forbidden: missing permission team.invite');
  }

  const inviteeId = await resolveOrInviteUserId(email);

  const { data: property } = await supabase.from('properties').select('name').eq('id', propertyId).single();
  const propertyName = (property as { name?: string } | null)?.name || 'a property';

  const { data: member, error } = await supabase
    .from('property_members')
    .upsert(
      {
        property_id: propertyId,
        user_id: inviteeId,
        role,
        status: 'invited',
        invited_by: user.id,
      } as never,
      { onConflict: 'property_id,user_id' }
    )
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  const memberRow = member as { id: string };
  const token = buildInviteToken('property', memberRow.id);
  await sendTeamInviteEmail({
    email,
    token,
    scope: 'property',
    role: role || 'viewer',
    inviterName: user.email || 'A team member',
    targetName: propertyName,
  });

  revalidatePath('/dashboard/team');
  return { success: true, token, memberId: memberRow.id };
}

export async function getInvitationByToken(token: string): Promise<InvitationDetails | null> {
  const parsed = parseInviteToken(token);
  if (!parsed) return null;

  const supabase = await createClient();
  const admin = await createAdminClient();

  if (parsed.scope === 'workspace') {
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id, role, status, user_id, workspace:workspaces(name)')
      .eq('id', parsed.memberId)
      .maybeSingle();

    if (!member) return null;
    const { data: authUser } = await admin.auth.admin.getUserById((member as { user_id: string }).user_id);

    return {
      scope: 'workspace',
      memberId: (member as { id: string }).id,
      email: authUser.user?.email || '',
      role: (member as { role: string }).role,
      status: (member as { status: string }).status,
      workspaceName: (member as { workspace?: { name?: string } }).workspace?.name,
    };
  }

  const { data: member } = await supabase
    .from('property_members')
    .select('id, role, status, user_id, property:properties(name)')
    .eq('id', parsed.memberId)
    .maybeSingle();

  if (!member) return null;
  const { data: authUser } = await admin.auth.admin.getUserById((member as { user_id: string }).user_id);

  return {
    scope: 'property',
    memberId: (member as { id: string }).id,
    email: authUser.user?.email || '',
    role: (member as { role: string }).role,
    status: (member as { status: string }).status,
    propertyName: (member as { property?: { name?: string } }).property?.name,
  };
}

export async function acceptInvitation(token: string) {
  const user = await requireAuthenticatedUser();
  const parsed = parseInviteToken(token);
  if (!parsed) {
    throw new Error('Invalid invitation token');
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  if (parsed.scope === 'workspace') {
    const { data: member, error: fetchError } = await supabase
      .from('workspace_members')
      .select('id, user_id, status')
      .eq('id', parsed.memberId)
      .single();

    if (fetchError || !member) throw new Error('Invitation not found');
    if ((member as { user_id: string }).user_id !== user.id) {
      throw new Error('This invitation was sent to a different account');
    }
    if ((member as { status: string }).status === 'active') {
      return { success: true, scope: 'workspace', alreadyAccepted: true };
    }

    const { error } = await supabase
      .from('workspace_members')
      .update({ status: 'active', joined_at: now, updated_at: now } as never)
      .eq('id', parsed.memberId);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard');
    return { success: true, scope: 'workspace' };
  }

  const { data: member, error: fetchError } = await supabase
    .from('property_members')
    .select('id, user_id, status')
    .eq('id', parsed.memberId)
    .single();

  if (fetchError || !member) throw new Error('Invitation not found');
  if ((member as { user_id: string }).user_id !== user.id) {
    throw new Error('This invitation was sent to a different account');
  }
  if ((member as { status: string }).status === 'active') {
    return { success: true, scope: 'property', alreadyAccepted: true };
  }

  const { error } = await supabase
    .from('property_members')
    .update({ status: 'active', joined_at: now, updated_at: now } as never)
    .eq('id', parsed.memberId);

  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
  return { success: true, scope: 'property' };
}
