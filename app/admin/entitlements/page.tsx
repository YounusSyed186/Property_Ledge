import React from 'react';
import { getAdminEntitlements } from '@/lib/admin/queries';
import { createAdminEntitlement } from '@/lib/admin/service';
import { Key, Plus } from 'lucide-react';
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
import { AdminEntitlementsGridView } from '@/components/admin/data-grid/views/AdminEntitlementsGridView';

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
    <PageContainer>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Entitlements DataGrid */}
        <div className="lg:col-span-2 space-y-4">
          <AdminEntitlementsGridView entitlements={entitlements} />
        </div>

        {/* Create Entitlement Sidebar */}
        <Card className="h-fit">
          <CardHeader
            title="Create Entitlement"
            description="Add a new system capability"
            icon={<Plus className="w-5 h-5" />}
          />
          <CardContent>
            <form action={handleCreateEntitlementAction} className="space-y-4">
              <Input
                name="key"
                label="Key (Machine Name)"
                required
                placeholder="storage.max_gb"
                className="font-mono text-xs"
              />
              <Input
                name="name"
                label="Display Name"
                required
                placeholder="Maximum Storage (GB)"
              />
              <Select name="valueType" label="Value Type" defaultValue="boolean">
                <option value="boolean">Boolean (True / False)</option>
                <option value="number">Number (Limit)</option>
                <option value="string">String (Tier)</option>
              </Select>
              <Textarea
                name="description"
                label="Description"
                rows={2}
                placeholder="Description..."
              />
              <Button type="submit" className="w-full" size="lg">
                Create Entitlement
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}