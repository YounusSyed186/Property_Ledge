'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { PageLayout, PageContent, ListPageHeader, WORKSPACE_PAGE_HEADER } from './layout';
import { CollapsibleDataWorkspace } from './CollapsibleDataWorkspace';

interface ListPageProps {
  title: string;
  description?: string;
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  summary?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** When true (default), page fills viewport and grid scrolls internally. Set false for scrollable non-grid pages. */
  fill?: boolean;
}

export function ListPage({
  title,
  description,
  breadcrumb,
  actions,
  summary,
  children,
  className,
  fill = true,
}: ListPageProps) {
  if (fill) {
    return (
      <CollapsibleDataWorkspace
        title={title}
        description={description}
        breadcrumb={breadcrumb}
        actions={actions}
        summary={summary}
        className={className}
        collapseEnabled
      >
        {children}
      </CollapsibleDataWorkspace>
    );
  }

  return (
    <PageLayout className={className}>
      <div className={cn('shrink-0', WORKSPACE_PAGE_HEADER)}>
        <ListPageHeader
          title={title}
          description={description}
          breadcrumb={breadcrumb}
          actions={actions}
        />
      </div>
      <PageContent fill={false}>
        {summary && <div className="shrink-0">{summary}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">{children}</div>
      </PageContent>
    </PageLayout>
  );
}
