import React from 'react';
import type { Metadata } from 'next';
import { fetchWorkspaceDocumentsAction } from '@/app/actions/documents';
import { getPropertiesList } from '@/lib/dashboard/queries';
import { DocumentsDashboard } from '@/components/dashboard/documents/DocumentsDashboard';

export const metadata: Metadata = {
  title: 'Documents & Files Repository | PropertyLedge',
  description:
    'Centralized repository for all transaction receipts, inspection photos, condition reports, lease agreements, and compliance files stored in Vercel Blob.',
};

export default async function DocumentsPage() {
  const [docsRes, properties] = await Promise.all([
    fetchWorkspaceDocumentsAction(),
    getPropertiesList(),
  ]);

  const initialDocs = docsRes.success && docsRes.data ? docsRes.data : [];
  const initialStats = docsRes.stats || {
    totalFiles: initialDocs.length,
    totalSizeBytes: 0,
    receiptsCount: 0,
    photosCount: 0,
    reportsCount: 0,
    leasesAndAgreementsCount: 0,
    complianceCount: 0,
    otherCount: 0,
  };

  const propOptions = (properties || []).map((p: any) => ({
    id: p.id,
    name: p.name || p.address_line_1 || 'Unnamed Property',
    address: p.address_line_1,
  }));

  return (
    <DocumentsDashboard
      initialDocuments={initialDocs}
      initialStats={initialStats}
      properties={propOptions}
    />
  );
}
