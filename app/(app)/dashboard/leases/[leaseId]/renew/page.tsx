'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button, useToast } from '@/components/admin/ui';
import { RenewLeaseModal } from '@/components/dashboard/leases/RenewLeaseModal';
import { fetchAllWorkspaceLeases } from '@/app/actions/dashboard';
import { routes } from '@/lib/routes';

export default function LeaseRenewPage({
  params,
}: {
  params: Promise<{ leaseId: string }>;
}) {
  const { leaseId } = use(params);
  const router = useRouter();
  const { error: showError } = useToast();

  const [lease, setLease] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetchAllWorkspaceLeases(null)
      .then((leases) => {
        const found = (leases as any[]).find((l) => l.id === leaseId);
        if (found) {
          setLease(found);
        } else {
          showError('Lease Not Found', 'The requested lease could not be found.');
          router.push(routes.leases.list());
        }
      })
      .catch((err) => {
        console.error('Error fetching lease for renewal:', err);
        showError('Error', err.message || 'Could not fetch lease details.');
        router.push(routes.leases.list());
      })
      .finally(() => setIsLoading(false));
  }, [leaseId, router, showError]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-admin-primary" />
        <p className="text-sm font-medium text-admin-muted">Loading lease details for renewal...</p>
      </div>
    );
  }

  if (!lease) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <Button
        variant="soft"
        size="sm"
        onClick={() => router.push(routes.leases.detail(leaseId))}
        className="gap-2 text-xs font-semibold"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Lease
      </Button>

      <RenewLeaseModal
        isOpen={true}
        onClose={() => router.push(routes.leases.detail(leaseId))}
        onSuccess={() => router.push(routes.leases.list())}
        previousLease={lease}
      />
    </div>
  );
}
