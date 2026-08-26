'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, X, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/admin/ui';
import { dismissSetupChecklist } from '@/app/actions/onboarding';
import type { SetupProgress } from '@/lib/dashboard/setupProgress';
import { cn } from '@/lib/utils';

interface SetupChecklistProps {
  progress: SetupProgress;
}

export function SetupChecklist({ progress }: SetupChecklistProps) {
  const [dismissed, setDismissed] = React.useState(progress.dismissed);

  if (dismissed || progress.allComplete) return null;

  const handleDismiss = async () => {
    setDismissed(true);
    await dismissSetupChecklist();
  };

  return (
    <Card className="border-admin-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-admin-foreground">Complete your workspace setup</h3>
            <p className="text-xs text-admin-muted">
              You&apos;ve got the basics ready. Finish these steps whenever you&apos;re ready.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg p-1 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle transition-colors"
            aria-label="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-admin-muted">
            <span>{progress.percent}% complete</span>
            <span>
              {progress.completedCount} / {progress.totalCount}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-admin-surface-subtle">
            <div
              className="h-full rounded-full bg-admin-success transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        <ul className="mt-4 space-y-1">
          {progress.tasks.map((task) => (
            <li key={task.id}>
              {task.completed ? (
                <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-admin-muted">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-admin-success text-white">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="line-through">{task.label}</span>
                </div>
              ) : (
                <Link
                  href={task.href}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    'hover:bg-admin-surface-subtle group'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-admin-border" />
                    <div className="min-w-0">
                      <p className="font-medium text-admin-foreground group-hover:text-admin-success transition-colors">
                        {task.label}
                      </p>
                      <p className="text-xs text-admin-muted truncate">{task.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-admin-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
