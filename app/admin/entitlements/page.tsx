import React from 'react';
import { getAdminEntitlements } from '@/lib/admin/queries';
import { createAdminEntitlement } from '@/lib/admin/service';
import { Key, Plus, Hash, ToggleLeft, Type } from 'lucide-react';
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

  const getValueTypeIcon = (type: string) => {
    if (type === 'boolean') return <ToggleLeft className="w-3.5 h-3.5" />;
    if (type === 'number') return <Hash className="w-3.5 h-3.5" />;
    return <Type className="w-3.5 h-3.5" />;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Entitlements"
        description="Define system capabilities and limits that can be assigned to subscription plans."
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-caption text-admin-muted">
            <span>Business</span>
            <span aria-hidden="true" className="text-admin-muted/50">/</span>
            <span className="text-admin-foreground font-medium">Entitlements</span>
          </nav>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Entitlements Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader
              title="Entitlements Registry"
              description="System capabilities and limits"
              icon={<Key className="w-5 h-5" />}
            />
            {entitlements.length === 0 ? (
              <EmptyState
                icon={<Key className="w-6 h-6" />}
                title="No entitlements yet"
                description="Create your first entitlement to define system capabilities."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key / Name</TableHead>
                    <TableHead>Value Type</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entitlements.map((ent: any) => (
                    <TableRow key={ent.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-admin-foreground">{ent.name}</p>
                          <p className="text-metadata text-admin-primary font-mono">{ent.key}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">
                          <span className="flex items-center gap-1.5">
                            {getValueTypeIcon(ent.value_type)}
                            {ent.value_type}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-body-sm text-admin-muted">{ent.description || '—'}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
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