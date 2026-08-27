'use client';

import React from 'react';
import { Drawer } from '@/components/admin/ui';

export type HowItWorksTopic = 'entitlements' | 'platform_roles' | 'team_roles';

const CONTENT: Record<HowItWorksTopic, { title: string; steps: string[]; diagram?: string }> = {
  entitlements: {
    title: 'How entitlements work',
    steps: [
      'Subscription plans define what customers receive.',
      'Each plan assigns values to entitlements (features and limits).',
      'Entitlements describe what PropertyLedge can control.',
      'The application reads plan values to enforce capabilities and limits.',
    ],
    diagram: `Professional Plan → Maximum Team Members → 25

Professional Plan → Advanced Analytics → Enabled`,
  },
  platform_roles: {
    title: 'How platform roles work',
    steps: [
      'Platform administrators are assigned a platform role.',
      'Each role grants a set of platform permissions.',
      'Permissions control what admin actions are allowed.',
      'Changes to a role affect all administrators assigned to it.',
    ],
  },
  team_roles: {
    title: 'How team roles work',
    steps: [
      'Each workspace has members with a team role.',
      'System roles are standard roles available to all workspaces.',
      'Custom roles are created per workspace for specialized duties.',
      'Team permissions control access to workspace resources.',
    ],
  },
};

interface HowItWorksDrawerProps {
  topic: HowItWorksTopic;
  isOpen: boolean;
  onClose: () => void;
}

export function HowItWorksDrawer({ topic, isOpen, onClose }: HowItWorksDrawerProps) {
  const { title, steps, diagram } = CONTENT[topic];

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={title} width="sm">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-admin-primary/15 text-xs font-semibold text-admin-primary">
                {i + 1}
              </span>
              <p className="text-sm text-admin-muted pt-0.5">{step}</p>
            </div>
          ))}
        </div>
        {diagram && (
          <div className="rounded-lg border border-admin-border bg-admin-sidebar/40 p-3 text-xs text-admin-muted whitespace-pre-line">
            {diagram}
          </div>
        )}
        {!diagram && topic === 'platform_roles' && (
          <div className="rounded-lg border border-admin-border bg-admin-sidebar/40 p-3 text-xs text-admin-muted font-mono">
            User → Role → Permissions → Allowed actions
          </div>
        )}
        {topic === 'team_roles' && (
          <div className="rounded-lg border border-admin-border bg-admin-sidebar/40 p-3 text-xs text-admin-muted font-mono">
            Workspace → Member → Team Role → Resource access
          </div>
        )}
      </div>
    </Drawer>
  );
}
