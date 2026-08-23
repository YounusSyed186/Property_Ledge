import React from 'react';
import { getAdminPlans } from '@/lib/admin/queries';
import { createAdminPlan, updateAdminPlan } from '@/lib/admin/service';
import Link from 'next/link';
import { Layers, Plus, Edit3, CheckCircle, Archive, XCircle } from 'lucide-react';
import { redirect } from 'next/navigation';
import {
  PageContainer,
  PageHeader,
  Card,
  CardHeader,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  Input,
  Select,
  Textarea,
  EmptyState,
} from '@/components/admin/ui';

export const revalidate = 0;

export default async function AdminPlansPage() {
  const plans = await getAdminPlans();

  async function handleCreatePlanAction(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = formData.get('description') as string;
    const priceCents = parseInt(formData.get('priceCents') as string || '0', 10);
    const billingInterval = formData.get('billingInterval') as 'monthly' | 'yearly';
    const status = formData.get('status') as 'active' | 'inactive' | 'archived';

    await createAdminPlan({
      name,
      slug,
      description,
      price_cents: priceCents,
      billing_interval: billingInterval,
      status,
    });

    redirect('/admin/plans?created=true');
  }

  async function handleToggleStatusAction(formData: FormData) {
    'use server';
    const planId = formData.get('planId') as string;
    const currentStatus = formData.get('currentStatus') as string;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    await updateAdminPlan(planId, { status: newStatus as any });
    redirect('/admin/plans?updated=true');
  }

  return (
    <PageContainer>
      <PageHeader
        title="Plans & Pricing"
        description="Define and manage subscription tiers available to accounts."
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-caption text-admin-muted">
            <span>Business</span>
            <span aria-hidden="true" className="text-admin-muted/50">/</span>
            <span className="text-admin-foreground font-medium">Plans</span>
          </nav>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Plans Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader
              title="Subscription Plans"
              description="Active and inactive platform tiers"
              icon={<Layers className="w-5 h-5" />}
            />
            {plans.length === 0 ? (
              <EmptyState
                icon={<Layers className="w-6 h-6" />}
                title="No plans yet"
                description="Create your first subscription plan to begin offering tiers."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name / Slug</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan: any) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-admin-foreground">{plan.name}</p>
                          <p className="text-metadata text-admin-muted font-mono">{plan.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-admin-foreground">
                          {plan.price_cents === 0 ? 'Free' : `$${(plan.price_cents / 100).toFixed(2)}/${plan.billing_interval}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={plan.status === 'active' ? 'success' : 'neutral'} dot>
                          {plan.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <form action={handleToggleStatusAction}>
                            <input type="hidden" name="planId" value={plan.id} />
                            <input type="hidden" name="currentStatus" value={plan.status} />
                            <Button variant="ghost" size="sm" type="submit">
                              {plan.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Button>
                          </form>
                          <Link href={`/admin/plans/${plan.id}`}>
                            <Button variant="secondary" size="sm" leftIcon={<Edit3 className="w-3.5 h-3.5" />}>
                              Entitlements
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        {/* Create Plan Sidebar */}
        <Card className="h-fit">
          <CardHeader
            title="Create New Plan"
            description="Add a new subscription tier"
            icon={<Plus className="w-5 h-5" />}
          />
          <CardContent>
            <form action={handleCreatePlanAction} className="space-y-4">
              <Input
                name="name"
                label="Plan Name"
                required
                placeholder="Enterprise"
              />
              <Input
                name="slug"
                label="Slug"
                required
                placeholder="enterprise"
              />
              <Input
                name="priceCents"
                label="Price (Cents)"
                type="number"
                defaultValue={0}
              />
              <Select name="billingInterval" label="Billing Interval" defaultValue="monthly">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
              <Textarea
                name="description"
                label="Description"
                rows={2}
                placeholder="Plan description..."
              />
              <Button type="submit" className="w-full" size="lg">
                Create Plan
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}