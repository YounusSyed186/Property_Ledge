import React from 'react';
import { TeamPageClient } from '@/components/team/TeamPageClient';
import { getActiveWorkspaceId } from '@/lib/auth/authorization';
import { fetchTeamPageData } from '@/app/actions/workspace-team';

export const metadata = {
  title: 'Team | PropertyLedge',
  description: 'Manage members, permissions, and workspace access.',
};

export default async function TeamPage() {
  const workspaceId = await getActiveWorkspaceId();
  let teamData = null;

  if (workspaceId) {
    try {
      teamData = await fetchTeamPageData(workspaceId);
    } catch {
      teamData = null;
    }
  }

  return (
    <TeamPageClient
      initialMembers={teamData?.members}
      initialInvitations={teamData?.invitations}
      initialSeats={teamData?.seats}
    />
  );
}
