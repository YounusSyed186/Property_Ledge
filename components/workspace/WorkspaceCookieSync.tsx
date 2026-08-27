'use client';

import { useEffect, useRef } from 'react';
import { switchWorkspace } from '@/app/actions/workspace-team';

interface WorkspaceCookieSyncProps {
  workspaceId: string | null;
}

/** Persists the active workspace cookie via server action (safe outside RSC render). */
export function WorkspaceCookieSync({ workspaceId }: WorkspaceCookieSyncProps) {
  const synced = useRef<string | null>(null);

  useEffect(() => {
    if (!workspaceId || synced.current === workspaceId) return;
    synced.current = workspaceId;
    switchWorkspace(workspaceId).catch(() => {
      synced.current = null;
    });
  }, [workspaceId]);

  return null;
}
