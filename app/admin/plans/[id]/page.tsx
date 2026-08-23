import React from 'react';
import { getAdminPlanById, getAdminEntitlements } from '@/lib/admin/queries';
import { updateAdminPlan, setPlanEntitlement, removePlanEntitlement } from '@/lib/admin/service';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Key, Plus, Trash2, Save } from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  Input,
  Select,
  EmptyState,
} from '@/components/admin/ui';

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminPlanDetailPage({ params }: PageProps) {
  const { id } = await params;
  const plan = await getAdminPlanById(id);

  if (!plan) {
    notFound();
  }

  const allEntitlements = await getAdminEntitlements();
  const currentPlanEntitlements = plan.plan_entitlements || [];

  async function handleSetEntitlementAction(formData: FormData) {
    'use server';
    const entitlementId = formData.get('entitlementId') as string;
    const rawVal = formData.get('value') as string;

    const entDef = allEntitlements.find((e: any) => e.id === entitlementId);
    let parsedVal: any = rawVal;

    if (entDef?.value_type === 'boolean') {
      parsedVal = rawVal === 'true' || rawVal === '1';
    } else if (entDef?.value_type === 'number') {
      parsedVal = Number(rawVal) || 0;
    }

    await setPlanEntitlement(id, entitlementId, parsedVal);
    redirect(`/admin/plans/${id}?updated=true`);
  }

  async function handleRemoveEntitlementAction(formData: FormData) {
    'use server';
    const entitlementId = formData.get('entitlementId') as string;
    await removePlanEntitlement(id, entitlementId);
    redirect(`/admin/plans/${id}?updated=true`);
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between gap-4 mb-4">
        <Link
          href="/admin/plans"
          className="inline-flex items-center gap-2 text-caption font-semibold text-admin-muted hover:text-admin-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Plans</span>
        </Link>
        <Badge variant="primary">{plan.name}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Entitlements assigned to this plan */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Assigned Entitlements"
              description="Capabilities and limits for this plan"
              icon={<Key className="w-5 h-5" />}
            />
            <CardContent>
              {currentPlanEntitlements.length === 0 ? (
                <EmptyState
                  icon={<Key className="w-6 h-6" />}
                  title="No entitlements assigned"
                  description="Assign entitlements to this plan to define its capabilities."
                />
              ) : (
                <div className="divide-y divide-admin-divider/60">
                  {currentPlanEntitlements.map((pe: any) => {
                    const ent = pe.entitlements;
                    return (
                      <div key={pe.id} className="py-4 flex items-center justify-between gap-4">
                        <div>
                          <span className="font-semibold text-admin-foreground">{ent?.name}</span>
                          <div className="text-metadata font-mono text-admin-muted">{ent?.key}</div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant="primary">{String(pe.value)}</Badge>

                          <form action={handleRemoveEntitlementAction}>
                            <input type="hidden" name="entitlementId" value={ent?.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="text-admin-danger hover:text-admin-danger hover:bg-admin-danger-soft"
                              aria-label={`Remove ${ent?.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add/Update Entitlement Form */}
        <Card className="h-fit">
          <CardHeader
            title="Set Entitlement Value"
            description="Assign a capability to this plan"
            icon={<Plus className="w-5 h-5" />}
          />
          <CardContent>
            <form action={handleSetEntitlementAction} className="space-y-4">
              <Select name="entitlementId" label="Select Entitlement" required>
                {allEntitlements.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.key})
                  </option>
                ))}
              </Select>

              <Input
                name="value"
                label="Value"
                required
                placeholder="e.g. 10 or true or standard"
                helpText="Enter number (10), boolean (true/false), or text string."
              />

              <Button type="submit" className="w-full" size="lg">
                Set Entitlement
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}