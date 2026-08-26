import React from 'react';
import { redirect } from 'next/navigation';
import { FileText } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/queries';
import { getTenantRecordForUser, getTenantDocuments } from '@/lib/tenant/queries';
import { PageContainer, Card, CardContent } from '@/components/admin/ui';

export const revalidate = 0;

export default async function TenantDocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const tenant = await getTenantRecordForUser(user.id);
  if (!tenant) redirect('/tenant');

  const documents = await getTenantDocuments(
    (tenant as { id: string }).id,
    (tenant as { property_id: string }).property_id
  );

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-admin-foreground">Documents</h2>
          <p className="text-sm text-admin-muted mt-1">Lease agreements and shared property documents.</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {documents.length === 0 ? (
              <p className="p-6 text-sm text-admin-muted">No documents available yet.</p>
            ) : (
              <div className="divide-y divide-admin-border">
                {documents.map((doc) => {
                  const row = doc as {
                    id: string;
                    name: string;
                    document_type?: string | null;
                    storage_path?: string | null;
                    created_at: string;
                  };
                  return (
                    <div key={row.id} className="flex items-center justify-between gap-4 px-6 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-admin-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-admin-foreground truncate">{row.name}</p>
                          <p className="text-xs text-admin-muted capitalize">
                            {row.document_type || 'document'} ·{' '}
                            {new Date(row.created_at).toLocaleDateString('en-AU')}
                          </p>
                        </div>
                      </div>
                      {row.storage_path && (
                        <span className="text-sm text-admin-muted shrink-0 truncate max-w-[120px]">
                          {row.storage_path.split('/').pop()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
