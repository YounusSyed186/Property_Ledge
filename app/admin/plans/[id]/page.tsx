import React from 'react';
import { getAdminPlanById, getAdminEntitlements } from '@/lib/admin/queries';
import { updateAdminPlan, setPlanEntitlement, removePlanEntitlement } from '@/lib/admin/service';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Key, Plus, Trash2, Save } from 'lucide-react';

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
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/plans"
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Plan: {plan.name}</h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">slug: {plan.slug}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Entitlements assigned to this plan */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Assigned Entitlements</h3>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentPlanEntitlements.length === 0 ? (
                <p className="py-4 text-sm text-slate-500">No entitlements assigned to this plan yet.</p>
              ) : (
                currentPlanEntitlements.map((pe: any) => {
                  const ent = pe.entitlements;
                  return (
                    <div key={pe.id} className="py-4 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">{ent?.name}</span>
                        <div className="text-xs font-mono text-slate-400">{ent?.key}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-slate-900 dark:text-white">
                          {String(pe.value)}
                        </span>

                        <form action={handleRemoveEntitlementAction}>
                          <input type="hidden" name="entitlementId" value={ent?.id} />
                          <button
                            type="submit"
                            className="text-rose-600 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Add/Update Entitlement Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Set Entitlement Value</h3>
          </div>

          <form action={handleSetEntitlementAction} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Entitlement</label>
              <select
                name="entitlementId"
                required
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                {allEntitlements.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.key})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Value</label>
              <input
                type="text"
                name="value"
                required
                placeholder="e.g. 10 or true or standard"
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-400 mt-1">Enter number (10), boolean (true/false), or text string.</p>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              Set Entitlement
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
