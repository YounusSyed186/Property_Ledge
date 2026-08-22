import React from 'react';
import { getAdminPlans } from '@/lib/admin/queries';
import { createAdminPlan, updateAdminPlan } from '@/lib/admin/service';
import Link from 'next/link';
import { Layers, Plus, Edit3, CheckCircle, Archive, XCircle } from 'lucide-react';
import { redirect } from 'next/navigation';

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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Subscription Plans</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Define and manage subscription tiers available to accounts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Plans Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
                <tr>
                  <th className="px-6 py-3.5">Plan Name / Slug</th>
                  <th className="px-6 py-3.5">Price</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {plans.map((plan: any) => (
                  <tr key={plan.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      <div className="font-bold">{plan.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{plan.slug}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                      {plan.price_cents === 0 ? 'Free' : `$${(plan.price_cents / 100).toFixed(2)}/${plan.billing_interval}`}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                          plan.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {plan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <form action={handleToggleStatusAction} className="inline">
                        <input type="hidden" name="planId" value={plan.id} />
                        <input type="hidden" name="currentStatus" value={plan.status} />
                        <button
                          type="submit"
                          className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        >
                          {plan.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </form>

                      <Link
                        href={`/admin/plans/${plan.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit Entitlements
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Plan Sidebar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Plan</h3>
          </div>

          <form action={handleCreatePlanAction} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Plan Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Enterprise"
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Slug</label>
              <input
                type="text"
                name="slug"
                required
                placeholder="enterprise"
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Price (Cents)</label>
              <input
                type="number"
                name="priceCents"
                defaultValue={0}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Billing Interval</label>
              <select
                name="billingInterval"
                defaultValue="monthly"
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <textarea
                name="description"
                rows={2}
                placeholder="Plan description..."
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              Create Plan
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
