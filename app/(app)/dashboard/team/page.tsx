'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Users, UserCheck } from 'lucide-react';
import { Button, Badge } from '@/components/admin/ui';
import { PropertyRequired } from '@/components/dashboard/PropertyRequired';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { ListPage, CompactKpiCard, SectionPanel } from '@/components/workspace';
import { fetchDashboardTeam } from '@/app/actions/dashboard';

type TeamMember = {
  id: string;
  role: string;
  status: string;
  joined_at: string | null;
  user?: { id: string; full_name: string | null };
};

export default function TeamPage() {
  const { selectedProperty } = usePropertyContext();
  const [workspaceMembers, setWorkspaceMembers] = useState<TeamMember[]>([]);
  const [propertyMembers, setPropertyMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedProperty) return;
    setIsLoading(true);
    fetchDashboardTeam(selectedProperty.propertyId)
      .then((data) => {
        setWorkspaceMembers((data.workspaceMembers || []) as TeamMember[]);
        setPropertyMembers((data.propertyMembers || []) as TeamMember[]);
      })
      .finally(() => setIsLoading(false));
  }, [selectedProperty?.propertyId]);

  const totalMembers = workspaceMembers.length + propertyMembers.length;
  const activeCount = [...workspaceMembers, ...propertyMembers].filter((m) => m.status === 'active').length;

  const MemberRow = ({ member }: { member: TeamMember }) => (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-admin-border p-4">
      <div>
        <p className="font-medium text-admin-foreground">
          {member.user?.full_name || 'Unknown user'}
        </p>
        <p className="text-caption capitalize text-admin-muted">{member.role}</p>
      </div>
      <Badge variant={member.status === 'active' ? 'success' : 'neutral'}>
        {member.status}
      </Badge>
    </div>
  );

  return (
    <PropertyRequired>
      <ListPage
        fill={false}
        title="Team"
        description={`Manage workspace and property access for ${selectedProperty?.propertyName}`}
        summary={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CompactKpiCard label="Total Members" value={totalMembers} icon={Users} accent="blue" />
            <CompactKpiCard label="Active" value={activeCount} icon={UserCheck} accent="teal" />
            <CompactKpiCard label="Property-specific" value={propertyMembers.length} icon={Users} accent="indigo" />
          </div>
        }
        actions={
          <Button size="sm" disabled title="Coming soon">
            <UserPlus className="mr-1.5 h-4 w-4" />
            Invite Member
          </Button>
        }
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-admin-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            <SectionPanel title="Workspace Members">
              {workspaceMembers.length === 0 ? (
                <p className="text-sm text-admin-muted">No workspace members found.</p>
              ) : (
                <div className="space-y-2">
                  {workspaceMembers.map((member) => (
                    <MemberRow key={member.id} member={member} />
                  ))}
                </div>
              )}
            </SectionPanel>
            <SectionPanel title="Property Members">
              {propertyMembers.length === 0 ? (
                <p className="text-sm text-admin-muted">
                  No property-specific members. Workspace members have access by default.
                </p>
              ) : (
                <div className="space-y-2">
                  {propertyMembers.map((member) => (
                    <MemberRow key={member.id} member={member} />
                  ))}
                </div>
              )}
            </SectionPanel>
          </div>
        )}
      </ListPage>
    </PropertyRequired>
  );
}
