'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/admin/ui';
import { fetchUserWorkspaces } from '@/app/actions/dashboard';

export default function WorkspaceSettingsPage() {
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string; status?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserWorkspaces()
      .then((data) => setWorkspaces(data as Array<{ id: string; name: string; status?: string }>))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="workspace-page-title mb-1">Workspace</h2>
        <p className="text-caption text-admin-muted">Your organization workspace details.</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-admin-primary border-t-transparent" />
        </div>
      ) : workspaces.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-admin-muted">No workspace found.</CardContent>
        </Card>
      ) : (
        workspaces.map((ws) => (
          <Card key={ws.id}>
            <CardContent className="space-y-1 p-5">
              <p className="font-medium text-admin-foreground">{ws.name}</p>
              <p className="text-sm text-admin-muted">Status: {ws.status || 'active'}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
