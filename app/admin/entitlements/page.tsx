import React from 'react';
import { getAdminEntitlements } from '@/lib/admin/queries';
import { createAdminEntitlement } from '@/lib/admin/service';
import { Key, Plus, Hash, ToggleLeft, Type } from 'lucide-react';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function AdminEntitlementsPage() {
  const entitlements = await getAdminEntitlements();

  async function handleCreateEntitlementAction(formData: FormData) {
    'use server';
    const key = formData.get('key') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const valueType = formData.get('valueType') as 'boolean' | 'number' | 'string';

    await createAdminEntitlement({
      key,
      name,
      description,
      value_type: valueType,
    });

    redirect('/admin/entitlements?created=true');
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Entitlements Registry</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Define system capabilities and limits that can be assigned to subscription plans.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Entitlements Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
                <tr>
                  <th className="px-6 py-3.5">Key / Name</th>
                  <th className="px-6 py-3.5">Value Type</th>
                  <th className="px-6 py-3.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {entitlements.map((ent: any) => (
                  <tr key={ent.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      <div className="font-bold">{ent.name}</div>
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">{ent.key}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {ent.value_type === 'boolean' && <ToggleLeft className="h-3.5 w-3.5" />}
                        {ent.value_type === 'number' && <Hash className="h-3.5 w-3.5" />}
                        {ent.value_type === 'string' && <Type className="h-3.5 w-3.5" />}
                        {ent.value_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{ent.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Entitlement Sidebar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Entitlement</h3>
          </div>

          <form action={handleCreateEntitlementAction} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Key (Machine Name)</label>
              <input
                type="text"
                name="key"
                required
                placeholder="storage.max_gb"
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Display Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Maximum Storage (GB)"
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Value Type</label>
              <select
                name="valueType"
                defaultValue="boolean"
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="boolean">Boolean (True / False)</option>
                <option value="number">Number (Limit)</option>
                <option value="string">String (Tier)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <textarea
                name="description"
                rows={2}
                placeholder="Description..."
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              Create Entitlement
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
