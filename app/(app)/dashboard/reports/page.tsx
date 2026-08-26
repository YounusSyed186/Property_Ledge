'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Home, Users, FileText, TrendingUp, AlertTriangle } from 'lucide-react';
import { PageContainer, Card, CardContent } from '@/components/admin/ui';
import { PropertyRequired } from '@/components/dashboard/PropertyRequired';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { fetchDashboardReports } from '@/app/actions/dashboard';

interface ReportSummary {
  totalRevenue: number;
  outstandingBalance: number;
  totalExpenses: number;
  occupiedUnits: number;
  vacantUnits: number;
  activeTenants: number;
  activeLeases: number;
  monthlyRent: number;
  overdueInvoices: number;
}

function StatBox({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-admin-muted mb-1">{label}</p>
            <p className="text-display font-heading text-admin-foreground tabular-nums">{value}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-admin-primary-soft flex items-center justify-center">
            <Icon className="w-5 h-5 text-admin-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { selectedProperty } = usePropertyContext();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedProperty) return;
    setIsLoading(true);
    fetchDashboardReports(selectedProperty.propertyId)
      .then(setSummary)
      .finally(() => setIsLoading(false));
  }, [selectedProperty?.propertyId]);

  return (
    <PropertyRequired>
      <PageContainer>
        <div className="mb-6">
          <h2 className="workspace-page-title">Reports</h2>
          <p className="text-caption text-admin-muted">Financial and operational summary for {selectedProperty?.propertyName}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-admin-primary border-t-transparent animate-spin" />
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatBox label="Total Revenue" value={`$${summary.totalRevenue.toLocaleString()}`} icon={DollarSign} />
            <StatBox label="Outstanding Balance" value={`$${summary.outstandingBalance.toLocaleString()}`} icon={AlertTriangle} />
            <StatBox label="Total Expenses" value={`$${summary.totalExpenses.toLocaleString()}`} icon={TrendingUp} />
            <StatBox label="Occupied Units" value={summary.occupiedUnits} icon={Home} />
            <StatBox label="Vacant Units" value={summary.vacantUnits} icon={Home} />
            <StatBox label="Active Tenants" value={summary.activeTenants} icon={Users} />
            <StatBox label="Active Leases" value={summary.activeLeases} icon={FileText} />
            <StatBox label="Monthly Rent" value={`$${summary.monthlyRent.toLocaleString()}`} icon={DollarSign} />
            <StatBox label="Overdue Invoices" value={summary.overdueInvoices} icon={AlertTriangle} />
          </div>
        ) : null}
      </PageContainer>
    </PropertyRequired>
  );
}
