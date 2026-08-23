import React from 'react';
import { getAdminPlans } from '@/lib/admin/queries';
import { createAdminPlan, updateAdminPlan } from '@/lib/admin/service';
import { Layers, Plus } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  PageContainer,
  PageHeader,
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  Select,
  Textarea,
} from '@/components/admin/ui';
import { AdminPlansGridView } from '@/components/admin/data-grid/views/AdminPlansGridView';

export const revalidate = 0;

export default async function AdminPlansPage() {
  const plans = await getAdminPlans();

  async function handleCreatePlanAction(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = formData.get('description') as string;
    const priceCents = parseInt((formData.get('priceCents') as string) || '0', 10);
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

  async function handleToggleStatus(planId: string, currentStatus: string) {
    'use server';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await updateAdminPlan(planId, { status: newStatus as any });
    revalidatePath('/admin/plans');
  }

  return (
    <PageContainer>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Plans DataGrid */}
        <div className="lg:col-span-2 space-y-4">
          <AdminPlansGridView plans={plans} onToggleStatus={handleToggleStatus} />
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