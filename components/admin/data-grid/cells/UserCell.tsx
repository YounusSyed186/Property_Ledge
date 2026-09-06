'use client';

import React from 'react';
import { CustomCellRendererProps } from 'ag-grid-react';
import { PersonIdentity } from '@/components/ui/avatar/PersonIdentity';

export function UserCell(props: CustomCellRendererProps) {
  const value = props.value;
  const data = props.data || {};
  const name =
    typeof value === 'string'
      ? value
      : (data.name || data.userName || data.full_name || data.fullName || value || 'Unknown');
  const userId = data.id || data.userId || data.user_id || data.email || name;
  const initialAvatarUrl = data.avatar_url || data.avatarUrl || data.image;
  const subtitle = data.email || data.role || data.subheading;

  const [avatarUrl, setAvatarUrl] = React.useState<string | undefined>(initialAvatarUrl);

  React.useEffect(() => {
    setAvatarUrl(data.avatar_url || data.avatarUrl || data.image);
  }, [data.avatar_url, data.avatarUrl, data.image]);

  React.useEffect(() => {
    function handleAvatarUpdated(e: Event) {
      const customEvent = e as CustomEvent<{ avatarUrl?: string }>;
      if (customEvent.detail?.avatarUrl !== undefined) {
        setAvatarUrl(customEvent.detail.avatarUrl);
      }
    }
    window.addEventListener('user-avatar-updated', handleAvatarUpdated);
    return () => window.removeEventListener('user-avatar-updated', handleAvatarUpdated);
  }, []);

  return (
    <PersonIdentity
      seed={String(userId)}
      avatarUrl={avatarUrl ? String(avatarUrl) : undefined}
      name={String(name)}
      subtitle={subtitle ? String(subtitle) : undefined}
      size="sm"
    />
  );
}

