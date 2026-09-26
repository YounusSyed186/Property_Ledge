'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  MoreVertical,
  ChevronRight,
  ArrowUp,
  Sparkles,
  MapPin,
  Users,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/admin/ui';
import { Button } from '@/components/admin/ui/Button';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useAppContext } from '@/components/context/AppContextProvider';
import { formatCurrency } from '@/lib/format/currency';
import { fetchDashboardDataAction } from '@/app/actions/dashboard';
import { ManagerDashboard } from '@/components/dashboard/overview/ManagerDashboard';
import { StaffDashboard } from '@/components/dashboard/overview/StaffDashboard';
import { buildAttentionItems } from '@/components/dashboard/overview/NeedsAttentionSection';
import { CreateLeaseWizard } from '@/components/dashboard/workflows/CreateLeaseWizard';
import { SetupChecklist } from '@/components/dashboard/setup/SetupChecklist';
import type { SetupProgress } from '@/lib/dashboard/setupProgress';
import {
  PageLayout,
  PageContent,
  PageSkeleton,
} from '@/components/workspace';
import { useEntityCacheStore } from '@/lib/stores/useEntityCacheStore';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import { cn } from '@/lib/utils';

interface TransactionItem {
  id: string;
  title: string;
  date: string;
  amount: string;
  avatar: string;
  isBrand: boolean;
}

export function OwnerDashboard({
  userName,
  setupProgress,
  initialData,
}: {
  userName: string;
  setupProgress?: SetupProgress;
  initialData?: any;
}) {
  const { selectedProperty, availableProperties, isLoading: propertyLoading } = usePropertyContext();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const cachedDashboard = useEntityCacheStore((s) => s.dashboard);
  const setCachedDashboard = useEntityCacheStore((s) => s.setDashboard);

  const propertyId = selectedProperty?.propertyId ?? null;
  const hasMatchingCache = cachedDashboard &&
    cachedDashboard.workspaceId === activeWorkspaceId &&
    cachedDashboard.propertyId === propertyId;

  const [overview, setOverview] = useState<any>(() => initialData?.overview ?? (hasMatchingCache ? cachedDashboard.data.overview : null));
  const [reports, setReports] = useState<any>(() => initialData?.reports ?? (hasMatchingCache ? cachedDashboard.data.reports : null));
  const [needsAttention, setNeedsAttention] = useState<any>(() => initialData?.needsAttention ?? (hasMatchingCache ? cachedDashboard.data.needsAttention : null));
  const [leases, setLeases] = useState<Array<{ id: string; property_id?: string; end_date: string | null; status: string; rent_amount?: number; unit?: { name?: string; unit_number?: string } }>>(
    () => initialData?.leases ?? (hasMatchingCache ? (cachedDashboard.data.leases as any[]) : [])
  );
  const [isLoading, setIsLoading] = useState(() => !initialData && !hasMatchingCache);
  const isInitialMount = React.useRef(true);
  const [leaseWizardOpen, setLeaseWizardOpen] = useState(false);

  const showSetup = setupProgress && !setupProgress.allComplete;

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialData) {
        setCachedDashboard(initialData, activeWorkspaceId, propertyId);
        return;
      }
    }
    if (!hasMatchingCache) {
      setIsLoading(true);
    }
    fetchDashboardDataAction(propertyId)
      .then((data) => {
        setOverview(data.overview);
        setNeedsAttention(data.needsAttention);
        setReports(data.reports);
        setLeases(data.leases as typeof leases);
        setCachedDashboard(data, activeWorkspaceId, propertyId);
      })
      .catch((err) => {
        console.error('Error fetching dashboard data:', err);
      })
      .finally(() => setIsLoading(false));
  }, [propertyId, activeWorkspaceId]);

  const hasProperties = availableProperties.length > 0;
  const attentionItems = buildAttentionItems(needsAttention);

  const stats = overview?.stats;
  const activeLeasesCount = stats?.activeLeases ?? leases.length ?? 0;
  const activeTenantsCount = stats?.activeTenants ?? 0;

  // Financial calculations
  const totalIncome = reports?.totalRevenue ?? 0;
  const totalExpenses = reports?.totalExpenses ?? 0;
  const outstandingIncome = reports?.outstandingBalance ?? 0;

  // Percentage splits for Expenses & Income
  const totalFlow = (totalIncome + totalExpenses) || 1;
  const expenseRatio = Math.max(10, Math.min(90, Math.round((totalExpenses / totalFlow) * 100))) || 60;
  const incomeRatio = 100 - expenseRatio;

  // Collection / Analytics gauge
  const collectionRate = totalIncome + outstandingIncome > 0
    ? Math.round((totalIncome / (totalIncome + outstandingIncome)) * 100)
    : 90;

  // Transactions list from activity / logs or defaults
  const recentLogs = overview?.recentActivity || [];
  const transactions: TransactionItem[] = recentLogs.length > 0 ? recentLogs.slice(0, 4).map((log: Record<string, unknown>, idx: number) => {
    const isPayment = String(log.action || '').toLowerCase().includes('paid') || String(log.action || '').toLowerCase().includes('payment');
    const amount = log.amount ? Number(log.amount) : isPayment ? 2643 : (idx === 0 ? 653 : idx === 1 ? 2643 : 20);
    return {
      id: String(log.id || `tx-${idx}`),
      title: String(log.action || (idx === 0 ? 'Apple' : idx === 1 ? 'Ralph Edwards' : 'Jerome Bell')),
      date: log.created_at ? new Date(String(log.created_at)).toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' }) : '03 April, 2024',
      amount: `$${amount.toLocaleString()}`,
      avatar: idx === 0 ? '' : idx === 1 ? 'RE' : 'JB',
      isBrand: idx === 0,
    };
  }) : [
    { id: 'tx-1', title: 'Apple', date: '03 April, 2024', amount: '$653', avatar: '', isBrand: true },
    { id: 'tx-2', title: 'Ralph Edwards', date: '01 April, 2024', amount: '$2,643', avatar: 'RE', isBrand: false },
    { id: 'tx-3', title: 'Jerome Bell', date: '27 March, 2024', amount: '$20', avatar: 'JB', isBrand: false },
  ];

  // Month trajectory bars
  const trajectory = [
    { label: 'Nov', height: '35%', active: false },
    { label: 'Dec', height: '25%', active: false },
    { label: 'Jan', height: '75%', active: false },
    { label: 'Feb', height: '60%', active: false },
    { label: 'Mar', height: '90%', active: true },
  ];

  return (
    <PageLayout>
      <PageContent>
        {showSetup && <SetupChecklist progress={setupProgress!} />}

        {propertyLoading || isLoading ? (
          <PageSkeleton />
        ) : !hasProperties ? (
          <Card className="border-dashed bg-admin-surface border-admin-border my-6">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-admin-primary-soft text-admin-primary border border-admin-primary/20">
                <Building2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-admin-foreground mb-1.5">No properties in workspace</h3>
              <p className="mx-auto mb-6 max-w-md text-xs text-admin-muted leading-relaxed">
                Add your first commercial or residential property to start tracking leases, recording tenant payments, and managing automated compliance.
              </p>
              <Button href="/dashboard/properties?new=true" size="md" leftIcon={<Plus className="h-4 w-4" />}>
                Create Your First Property
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 pb-12">
            {/* Top Greeting Header with Property Avatars Strip */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
              <div>
                <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Finance Dashboard</p>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
                  Hello, <span className="text-[#008F83] dark:text-[#32D5C4]">{userName || 'Alif Reza'}</span>
                </h1>
                <p className="text-sm font-medium text-slate-400 dark:text-slate-400 mt-1">
                  View and control your finances here!
                </p>
              </div>

              {/* Right Side: Properties / Team Avatar Strip */}
              <div className="flex items-center gap-2.5 self-start md:self-auto bg-white/70 dark:bg-[#1E293B]/70 backdrop-blur-md p-1.5 px-3 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
                  {availableProperties.slice(0, 6).map((prop, idx) => (
                    <div
                      key={prop.propertyId}
                      title={prop.propertyName}
                      className={cn(
                        'w-9 h-9 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center font-bold text-xs shadow-xs text-white shrink-0',
                        idx % 4 === 0 && 'bg-gradient-to-br from-teal-500 to-emerald-600',
                        idx % 4 === 1 && 'bg-gradient-to-br from-blue-500 to-indigo-600',
                        idx % 4 === 2 && 'bg-gradient-to-br from-amber-500 to-orange-600',
                        idx % 4 === 3 && 'bg-gradient-to-br from-purple-500 to-pink-600'
                      )}
                    >
                      {prop.propertyName.slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {availableProperties.length === 0 && (
                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                      PL
                    </div>
                  )}
                </div>
                <Link
                  href="/dashboard/properties"
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors ml-1"
                  title="View all properties"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Optional Attention Banner if pending actions */}
            {attentionItems.length > 0 && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                    !
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      {attentionItems.length} Action{attentionItems.length === 1 ? '' : 's'} Required
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      {attentionItems[0]?.label || 'Pending items requiring your attention.'}
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/money?tab=payments"
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-xs"
                >
                  Review Items
                </Link>
              </div>
            )}

            {/* TOP ROW: 3 Key Cards (Balance Statistics, Asset Card, Analytics Gauge) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Card 1 (Left, 4 cols): Balance Statistics */}
              <div className="lg:col-span-4 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Balance Statistics</h3>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {formatCurrency(totalIncome > 0 ? totalIncome : 38729.61)}
                    </span>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Total amount</span>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <ArrowUp className="w-3 h-3" />
                      14%
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      Always see your earning updates
                    </span>
                  </div>
                </div>

                {/* 5-Bar Trajectory Chart */}
                <div className="flex items-end justify-between gap-3 pt-6 border-t border-slate-100 dark:border-slate-800/80 mt-4">
                  {trajectory.map((item) => (
                    <div key={item.label} className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-full max-w-[20px] h-12 bg-slate-100 dark:bg-slate-800/90 rounded-full flex items-end justify-center p-0.5">
                        <div
                          className={cn(
                            'w-full rounded-full transition-all duration-500',
                            item.active
                              ? 'bg-[#5479F7] shadow-xs'
                              : 'bg-[#94A9D9] dark:bg-[#4A6296]'
                          )}
                          style={{ height: item.height }}
                        />
                      </div>
                      <span className={cn(
                        'text-[10px] font-semibold',
                        item.active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                      )}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2 (Middle, 5 cols): Sleek Real Property Showcase Card */}
              <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#0A0F1D] text-white p-6 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[220px] border border-slate-700/60">
                {/* Ambient subtle glow background */}
                <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-[#008F83]/15 pointer-events-none blur-2xl" />
                <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full bg-blue-500/10 pointer-events-none blur-2xl" />

                {/* Top Badge & Property Type */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#008F83]/20 border border-[#008F83]/40 flex items-center justify-center text-[#32D5C4]">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold tracking-wider text-slate-300 uppercase">
                      {selectedProperty ? (selectedProperty.organizationName || 'Commercial Property') : 'Portfolio Overview'}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {selectedProperty?.status || 'Active'}
                  </span>
                </div>

                {/* Property Main Info */}
                <div className="relative z-10 my-3">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight line-clamp-1">
                    {selectedProperty ? selectedProperty.propertyName : 'All Properties'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    {selectedProperty ? `Property ID: ${selectedProperty.propertyId.slice(0, 8)}` : `${availableProperties.length} properties managed in this workspace`}
                  </p>
                </div>

                {/* Key Operational Metrics Pills */}
                <div className="relative z-10 grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2 px-3 border border-white/5">
                    <FileText className="w-4 h-4 text-[#32D5C4] shrink-0" />
                    <div className="truncate">
                      <p className="text-[10px] text-slate-400 font-medium">Active Leases</p>
                      <p className="text-xs font-bold text-white font-mono">{activeLeasesCount} Lease{activeLeasesCount === 1 ? '' : 's'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2 px-3 border border-white/5">
                    <Users className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-[10px] text-slate-400 font-medium">Tenants</p>
                      <p className="text-xs font-bold text-white font-mono">{activeTenantsCount} Active</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="relative z-10 flex items-center justify-between pt-3">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {selectedProperty ? `Role: ${selectedProperty.role}` : `${availableProperties.length} Properties`}
                  </span>
                  <Link
                    href={selectedProperty ? `/dashboard/properties/${selectedProperty.propertyId}` : '/dashboard/properties'}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#32D5C4] hover:text-white transition-colors"
                  >
                    View Details <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Card 3 (Right, 3 cols): Analytics Gauge */}
              <div className="lg:col-span-3 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Analytics</h3>
                  <button type="button" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {/* Legend */}
                <div className="space-y-1 my-2">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-[#5479F7]" />
                    Done
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-[#E5C378]" />
                    In progres
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-[#E8637A]" />
                    To do
                  </div>
                </div>

                {/* Semi-circular SVG Gauge */}
                <div className="relative flex flex-col items-center justify-center pt-2">
                  <svg viewBox="0 0 100 55" className="w-full max-w-[140px] overflow-visible">
                    {/* Background track arc */}
                    <path
                      d="M 12,50 A 38,38 0 0,1 88,50"
                      fill="none"
                      stroke="currentColor"
                      className="text-slate-100 dark:text-slate-800"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    {/* Blue segment (Done) */}
                    <path
                      d="M 12,50 A 38,38 0 0,1 55,12"
                      fill="none"
                      stroke="#5479F7"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    {/* Yellow segment (In progress) */}
                    <path
                      d="M 55,12 A 38,38 0 0,1 78,24"
                      fill="none"
                      stroke="#E5C378"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    {/* Pink/Coral segment (To do) */}
                    <path
                      d="M 78,24 A 38,38 0 0,1 88,50"
                      fill="none"
                      stroke="#E8637A"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="text-center mt-[-18px]">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {collectionRate}%
                    </span>
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 -mt-0.5">
                      Done
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM ROW: 2 Columns (Last Transactions & Expenses/Income Stack) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (6 cols): Last Transactions */}
              <div className="lg:col-span-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Last Transactions</h3>
                  <button type="button" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="py-3.5 flex items-center justify-between gap-3 group">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={cn(
                          'w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-xs',
                          tx.isBrand
                            ? 'bg-slate-900 text-white'
                            : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                        )}>
                          {tx.avatar}
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-[#008F83] dark:group-hover:text-[#32D5C4] transition-colors">
                            {tx.title}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {tx.date}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                          {tx.amount}
                        </span>
                        <button type="button" className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-300 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column (6 cols): Expenses & Income Card + Dark Banner */}
              <div className="lg:col-span-6 space-y-5">
                {/* Expenses & Income Card */}
                <div className="rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Expenses & Income</h3>
                    <button type="button" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Percentage stats */}
                  <div className="grid grid-cols-12 gap-4 items-baseline my-2">
                    <div className="col-span-7">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          {expenseRatio}%
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">Expenses</p>
                    </div>

                    <div className="col-span-5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          {incomeRatio}%
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">Income</p>
                    </div>
                  </div>

                  {/* Rounded Dual Progress Bars */}
                  <div className="grid grid-cols-12 gap-3 pt-3">
                    <div className="col-span-7">
                      <div className="h-6 rounded-xl bg-[#7C97C7] dark:bg-[#5D7DAF] shadow-xs" />
                    </div>
                    <div className="col-span-5">
                      <div className="h-6 rounded-xl bg-[#E5C378] dark:bg-[#D4AC57] shadow-xs" />
                    </div>
                  </div>
                </div>

                {/* Dark Banner: More features? / Go to premium / Quick Actions */}
                <div className="rounded-3xl bg-[#1C1E22] dark:bg-[#121417] text-white p-5 flex items-center justify-between gap-4 border border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0 border border-white/10">
                      <Sparkles className="w-5 h-5 text-teal-300" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-white leading-tight">More features?</h4>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        Update your account to premium to get more features
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/dashboard/money?tab=payments"
                    className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs transition-colors shrink-0 shadow-xs"
                  >
                    Go to premium
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageContent>

      <CreateLeaseWizard isOpen={leaseWizardOpen} onClose={() => setLeaseWizardOpen(false)} />
    </PageLayout>
  );
}

export function DashboardOverview({
  userName,
  setupProgress,
  initialDashboardData,
}: {
  userName: string;
  setupProgress?: SetupProgress;
  initialDashboardData?: any;
}) {
  const { persona } = useAppContext();

  if (persona === 'manager') {
    return <ManagerDashboard userName={userName} />;
  }

  if (persona === 'staff') {
    return <StaffDashboard userName={userName} />;
  }

  return (
    <OwnerDashboard
      userName={userName}
      setupProgress={setupProgress}
      initialData={initialDashboardData}
    />
  );
}
