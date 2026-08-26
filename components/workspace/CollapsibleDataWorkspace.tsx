'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { PageLayout, PageContent, WORKSPACE_PAGE_X } from './layout';
import { CollapsiblePageHeader } from './CollapsiblePageHeader';
import {
  CollapsibleWorkspaceProvider,
  useCollapsibleWorkspaceSnapshot,
} from './CollapsibleWorkspaceContext';

interface CollapsibleDataWorkspaceProps {
  title: string;
  description?: string;
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  summary?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  collapseEnabled?: boolean;
}

function CollapsibleSummary({ summary }: { summary: React.ReactNode }) {
  const snapshot = useCollapsibleWorkspaceSnapshot();
  const progress = snapshot?.progress ?? 0;

  return (
    <div
      className="shrink-0 overflow-hidden transition-all duration-250 ease-out"
      style={{
        maxHeight: progress > 0.85 ? 0 : 400,
        opacity: 1 - progress,
        marginBottom: progress > 0.85 ? 0 : undefined,
      }}
      aria-hidden={progress > 0.9}
    >
      {summary}
    </div>
  );
}

function WorkspaceInner({
  title,
  description,
  breadcrumb,
  actions,
  summary,
  children,
  className,
  collapseEnabled,
}: CollapsibleDataWorkspaceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const snapshot = useCollapsibleWorkspaceSnapshot();

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !snapshot) return;
    el.style.setProperty('--workspace-collapse-progress', String(snapshot.progress));
    el.dataset.workspacePhase = snapshot.phase;
  }, [snapshot]);

  return (
    <PageLayout ref={rootRef} className={cn('collapsible-workspace', className)}>
      <div className={cn(WORKSPACE_PAGE_X, 'shrink-0')}>
        <CollapsiblePageHeader
          title={title}
          description={description}
          breadcrumb={breadcrumb}
          actions={actions}
          collapseEnabled={collapseEnabled}
        />
      </div>
      <PageContent fill>
        {summary && <CollapsibleSummary summary={summary} />}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </PageContent>
    </PageLayout>
  );
}

export function CollapsibleDataWorkspace(props: CollapsibleDataWorkspaceProps) {
  const collapseEnabled = props.collapseEnabled !== false;

  return (
    <CollapsibleWorkspaceProvider enabled={collapseEnabled}>
      <WorkspaceInner {...props} collapseEnabled={collapseEnabled} />
    </CollapsibleWorkspaceProvider>
  );
}
