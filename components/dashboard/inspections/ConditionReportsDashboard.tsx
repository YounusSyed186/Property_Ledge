'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  Plus,
  Building,
  Building2,
  Search,
  Calendar,
  User,
  Trash2,
  Check,
  X,
  Settings,
  AlertCircle,
  FileCheck,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Sparkles,
  SlidersHorizontal,
  Home,
  FileText,
  MoreHorizontal,
  MapPin,
} from 'lucide-react';
import {
  ConditionReport,
  RoomTemplateConfig,
  DEFAULT_ROOM_TEMPLATES,
  ConditionReportType,
  getItemsForRoomType,
} from '@/types/condition-report';
import {
  fetchConditionReportsAction,
  fetchInspectionPropertiesAndLeasesAction,
  createConditionReportAction,
  deleteConditionReportAction,
} from '@/app/actions/condition-reports';
import { cn } from '@/lib/utils';
import { PageLayout, PageContent } from '@/components/workspace';
import { Button } from '@/components/admin/ui';

interface ConditionReportsDashboardProps {
  initialReports?: ConditionReport[];
  propertyFilterId?: string;
}

const PROPERTY_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&auto=format&fit=crop&q=80',
];

export function ConditionReportsDashboard({
  initialReports = [],
  propertyFilterId,
}: ConditionReportsDashboardProps) {
  const router = useRouter();
  const [reports, setReports] = useState<ConditionReport[]>(initialReports);
  const [isLoading, setIsLoading] = useState(initialReports.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Completed'>('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalProperties, setModalProperties] = useState<
    Array<{ id: string; name: string; address_line_1: string }>
  >([]);
  const [modalLeases, setModalLeases] = useState<
    Array<{
      id: string;
      property_id: string;
      start_date: string;
      end_date: string | null;
      status: string;
    }>
  >([]);
  const [modalPriorReports, setModalPriorReports] = useState<
    Array<{
      id: string;
      property_id: string;
      type: string;
      inspection_date: string;
      status: string;
    }>
  >([]);

  const [selectedPropertyId, setSelectedPropertyId] = useState(
    propertyFilterId || ''
  );
  const [selectedLeaseId, setSelectedLeaseId] = useState('');
  const [selectedBaselineReportId, setSelectedBaselineReportId] = useState('');
  const [inspectionType, setInspectionType] =
    useState<ConditionReportType>('Move In');
  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [inspectorName, setInspectorName] = useState('');
  const [notes, setNotes] = useState('');
  const [roomTemplates, setRoomTemplates] = useState<RoomTemplateConfig[]>(
    DEFAULT_ROOM_TEMPLATES
  );

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    loadReports();
    loadModalData();
  }, [propertyFilterId]);

  const loadReports = async () => {
    setIsLoading(true);
    const res = await fetchConditionReportsAction(propertyFilterId);
    if (res.success && res.data) {
      setReports(res.data);
    }
    setIsLoading(false);
  };

  const loadModalData = async () => {
    const res = await fetchInspectionPropertiesAndLeasesAction();
    if (res.success) {
      setModalProperties(res.properties || []);
      setModalLeases(res.leases || []);
      setModalPriorReports(res.priorReports || []);
      if (res.inspectorName) {
        setInspectorName(res.inspectorName);
      }
      if (!selectedPropertyId && res.properties && res.properties.length > 0) {
        setSelectedPropertyId(res.properties[0].id);
      }
    }
  };

  // Autoload active lease and prior baseline report when property or inspection type changes
  useEffect(() => {
    if (selectedPropertyId) {
      const activeLease =
        modalLeases.find(
          (l) => l.property_id === selectedPropertyId && l.status === 'active'
        ) || modalLeases.find((l) => l.property_id === selectedPropertyId);
      setSelectedLeaseId(activeLease?.id || '');

      // Autoselect latest baseline report for this property if doing Routine or Move Out
      const propertyReports = modalPriorReports.filter(
        (r) => r.property_id === selectedPropertyId && r.status === 'Completed'
      );
      if (propertyReports.length > 0) {
        const moveInBaseline = propertyReports.find((r) => r.type === 'Move In');
        setSelectedBaselineReportId(moveInBaseline ? moveInBaseline.id : propertyReports[0].id);
      } else {
        setSelectedBaselineReportId('');
      }
    } else {
      setSelectedLeaseId('');
      setSelectedBaselineReportId('');
    }
  }, [selectedPropertyId, modalLeases, modalPriorReports, inspectionType]);

  const handleUpdateRoomCount = (name: string, increment: boolean) => {
    setRoomTemplates((prev) =>
      prev.map((t) => {
        if (t.name === name) {
          const val = increment ? t.count + 1 : Math.max(0, t.count - 1);
          return { ...t, count: val };
        }
        return t;
      })
    );
  };

  const handleResetTemplates = () => {
    setRoomTemplates(DEFAULT_ROOM_TEMPLATES);
  };

  const handleCreateReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPropertyId) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await createConditionReportAction({
      propertyId: selectedPropertyId,
      leaseId: selectedLeaseId || null,
      baselineReportId: selectedBaselineReportId || null,
      inspectionType,
      inspectionDate,
      inspectorName: inspectorName.trim() || 'Inspector',
      notes,
      roomTemplates,
    });

    if (res.success && res.reportId) {
      setIsCreateModalOpen(false);
      router.push(`/dashboard/condition-reports/${res.reportId}`);
    } else {
      setErrorMessage(res.error || 'Failed to create condition report');
      setIsSubmitting(false);
    }
  };

  const confirmDeleteReport = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    const res = await deleteConditionReportAction(deleteConfirmId);
    if (res.success) {
      setReports((prev) => prev.filter((r) => r.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } else {
      setErrorMessage(res.error || 'Failed to delete report');
    }
    setIsDeleting(false);
  };

  // Filtered & Sorted reports
  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => {
        if (statusFilter !== 'All' && r.status !== statusFilter) return false;
        const address = (
          r.properties?.name ||
          r.properties?.address_line_1 ||
          ''
        ).toLowerCase();
        const inspector = (r.inspector_name || '').toLowerCase();
        const type = (r.type || '').toLowerCase();
        const q = searchQuery.toLowerCase();
        return (
          address.includes(q) || inspector.includes(q) || type.includes(q)
        );
      })
      .sort((a, b) => {
        const dateA = new Date(a.inspection_date || a.created_at).getTime();
        const dateB = new Date(b.inspection_date || b.created_at).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [reports, searchQuery, statusFilter, sortOrder]);

  // Metric aggregates
  const totalReportsCount = reports.length;
  const draftReportsCount = reports.filter((r) => r.status === 'Draft').length;
  const completedReportsCount = reports.filter((r) => r.status === 'Completed').length;
  const draftPct = totalReportsCount > 0 ? Math.round((draftReportsCount / totalReportsCount) * 100) : 0;
  const completedPct = totalReportsCount > 0 ? Math.round((completedReportsCount / totalReportsCount) * 100) : 0;

  // Calculate total issues / defects across reports
  const issuesFoundCount = useMemo(() => {
    return reports.reduce((acc, r) => {
      const roomDefects = (r as unknown as { inspection_defects?: unknown[] }).inspection_defects?.length || 0;
      return acc + roomDefects;
    }, 0);
  }, [reports]);

  // Circular progress calculation
  const circleRadius = 34;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeOffset = circleCircumference - (completedPct / 100) * circleCircumference;

  const totalConfiguredRooms = roomTemplates.reduce((sum, t) => sum + t.count, 0);

  return (
    <PageLayout>
      <PageContent>
        <div className="space-y-6 pb-16">
          {/* 1. Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-[32px] font-heading font-bold tracking-tight text-slate-900 dark:text-white">
                Condition Reports
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1 max-w-2xl">
                Perform digital condition inspections, capture evidence, and export official PDFs.
              </p>
            </div>

            <Button
              onClick={() => {
                setModalStep(1);
                setIsCreateModalOpen(true);
              }}
              className="font-bold text-xs sm:text-sm rounded-xl bg-[#008F83] hover:bg-[#007F78] text-white shadow-none px-4 py-2.5 h-[44px] shrink-0"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              + Start New Report
            </Button>
          </div>

          {/* 2. INSPECTION OVERVIEW HERO (Teal Hero Section matching Prompt) */}
          <div
            className="rounded-2xl p-6 sm:p-7 shadow-md text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(120deg, #007F78 0%, #009B91 50%, #008F83 100%)',
            }}
          >
            {/* Subtle background glow */}
            <div
              className="absolute -right-20 -top-20 w-80 h-80 rounded-full pointer-events-none opacity-15"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)',
              }}
            />

            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 relative z-10">
              {/* Zone 1: Left Illustration + Zone 2: Title & 4 KPIs */}
              <div className="flex-1 flex flex-col md:flex-row md:items-center gap-6 min-w-0">
                {/* Zone 1: Document Illustration in translucent container */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 relative">
                  {/* Document sheet inside translucent container */}
                  <div className="w-14 h-18 sm:w-16 sm:h-20 bg-white/95 rounded-xl p-2 shadow-xs flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="w-6 h-1 bg-[#008F83] rounded-full" />
                      <div className="w-9 h-0.5 bg-slate-200 rounded-full" />
                      <div className="w-7 h-0.5 bg-slate-200 rounded-full" />
                    </div>
                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                      <FileCheck className="w-3.5 h-3.5 text-[#008F83]" />
                      <div className="w-4 h-0.5 bg-slate-300 rounded-full" />
                    </div>
                  </div>

                  {/* Circular Check badge */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white text-[#008F83] flex items-center justify-center shadow-md border border-white/50">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                {/* Zone 2: Title + 4 KPIs */}
                <div className="flex-1 min-w-0">
                  <div>
                    <h2 className="text-xl sm:text-[22px] font-heading font-bold text-white tracking-tight leading-tight">
                      Inspection Overview
                    </h2>
                    <p className="text-xs sm:text-[13px] text-white/75 mt-0.5 font-normal">
                      Track and manage your condition reports.
                    </p>
                  </div>

                  {/* 4 KPIs with subtle vertical separators */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-5 divide-y sm:divide-y-0 sm:divide-x divide-white/15">
                    {/* 1. Total Reports */}
                    <div className="min-w-0 sm:pr-3">
                      <p className="font-heading text-2xl sm:text-[26px] font-bold tabular-nums text-white leading-none">
                        {isLoading ? '—' : totalReportsCount}
                      </p>
                      <span className="text-xs sm:text-[13px] font-bold text-white block mt-1 truncate">
                        Total Reports
                      </span>
                      <span className="text-[10.5px] text-white/70 block mt-0.5 truncate">
                        Across all properties
                      </span>
                    </div>

                    {/* 2. In Progress */}
                    <div className="min-w-0 pt-2 sm:pt-0 sm:px-3">
                      <p className="font-heading text-2xl sm:text-[26px] font-bold tabular-nums text-white leading-none">
                        {isLoading ? '—' : draftReportsCount}
                      </p>
                      <span className="text-xs sm:text-[13px] font-bold text-white block mt-1 truncate">
                        In Progress
                      </span>
                      <span className="text-[10.5px] text-white/70 block mt-0.5 truncate">
                        {draftPct}% of reports
                      </span>
                    </div>

                    {/* 3. Completed */}
                    <div className="min-w-0 pt-2 sm:pt-0 sm:px-3">
                      <p className="font-heading text-2xl sm:text-[26px] font-bold tabular-nums text-white leading-none">
                        {isLoading ? '—' : completedReportsCount}
                      </p>
                      <span className="text-xs sm:text-[13px] font-bold text-white block mt-1 truncate">
                        Completed
                      </span>
                      <span className="text-[10.5px] text-white/70 block mt-0.5 truncate">
                        {completedPct}% of reports
                      </span>
                    </div>

                    {/* 4. Issues */}
                    <div className="min-w-0 pt-2 sm:pt-0 sm:pl-3">
                      <p className="font-heading text-2xl sm:text-[26px] font-bold tabular-nums text-white leading-none">
                        {isLoading ? '—' : issuesFoundCount}
                      </p>
                      <span className="text-xs sm:text-[13px] font-bold text-white block mt-1 truncate">
                        Issues
                      </span>
                      <span className="text-[10.5px] text-white/70 block mt-0.5 truncate">
                        Requires attention
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Zone 3: Right Circular Completion Gauge */}
              <div className="w-full lg:w-48 shrink-0 flex flex-col items-center justify-center text-center lg:border-l lg:border-white/15 lg:pl-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/15">
                <div className="relative w-22 h-22 sm:w-24 sm:h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r={circleRadius}
                      className="text-white/20"
                      strokeWidth="6"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r={circleRadius}
                      stroke="#FFFFFF"
                      strokeWidth="6"
                      strokeDasharray={circleCircumference}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-heading text-2xl sm:text-[24px] font-bold tabular-nums text-white leading-none">
                      {completedPct}%
                    </span>
                  </div>
                </div>

                <div className="mt-2">
                  <span className="text-xs sm:text-[13px] font-bold text-white block">
                    Completion Rate
                  </span>
                  <span className="text-[11px] text-white/75 block mt-0.5">
                    {completedReportsCount} of {totalReportsCount} completed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. REPORT CONTROL & FILTER BAR */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#07111F] p-3 sm:p-4 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter('All')}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs',
                    statusFilter === 'All'
                      ? 'bg-[#E8F7F5] dark:bg-[#008F83]/25 text-[#008F83] dark:text-[#32D5C4] font-bold border border-[#8EDDD5] dark:border-[#008F83]/35'
                      : 'text-slate-600 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white font-medium hover:bg-slate-50'
                  )}
                >
                  All ({totalReportsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('Draft')}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs',
                    statusFilter === 'Draft'
                      ? 'bg-[#E8F7F5] dark:bg-[#008F83]/25 text-[#008F83] dark:text-[#32D5C4] font-bold border border-[#8EDDD5] dark:border-[#008F83]/35'
                      : 'text-slate-600 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white font-medium hover:bg-slate-50'
                  )}
                >
                  Draft ({draftReportsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('Completed')}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs',
                    statusFilter === 'Completed'
                      ? 'bg-[#E8F7F5] dark:bg-[#008F83]/25 text-[#008F83] dark:text-[#32D5C4] font-bold border border-[#8EDDD5] dark:border-[#008F83]/35'
                      : 'text-slate-600 dark:text-[#7F8B99] hover:text-slate-900 dark:hover:text-white font-medium hover:bg-slate-50'
                  )}
                >
                  Completed ({completedReportsCount})
                </button>
              </div>

              {/* Search & Sort */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:max-w-xl justify-end">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-[#7F8B99]" />
                  <input
                    type="text"
                    placeholder="Search reports by property, address, inspector, or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 min-h-[40px] h-10 bg-slate-50/70 dark:bg-[#0E1E33]/60 border border-slate-200 dark:border-[#17283A] rounded-xl text-[13px] focus:ring-2 focus:ring-[#008F83]/20 focus:border-[#008F83] outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-[#7F8B99] text-slate-900 dark:text-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center shrink-0">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                    className="px-3 py-2 h-10 rounded-xl bg-slate-50 dark:bg-[#0E1E33] border border-slate-200 dark:border-[#17283A] text-[13px] font-semibold text-slate-700 dark:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#008F83] cursor-pointer"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message Notification */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center justify-between text-xs text-red-700 dark:text-red-300">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                {errorMessage}
              </span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-500 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          )}

          {/* 4. REPORT CARDS GRID (2 Columns on Desktop) */}
          {isLoading ? (
            <div className="flex justify-center items-center py-24">
              <div className="w-8 h-8 border-3 border-[#008F83] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#07111F] border border-slate-200 dark:border-[#17283A] rounded-2xl p-8 shadow-xs">
              <div className="w-14 h-14 bg-slate-50 dark:bg-[#0E1E33] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#008F83] dark:text-[#32D5C4] border border-[#008F83]/20">
                <ClipboardList className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                No Condition Reports Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#7F8B99] max-w-md mx-auto mb-6 leading-relaxed">
                {searchQuery || statusFilter !== 'All'
                  ? 'No condition reports matched your filter criteria.'
                  : 'Start your first digital condition inspection. Configure property layout and inspect room-by-room on your mobile device or tablet.'}
              </p>
              <Button
                onClick={() => {
                  setModalStep(1);
                  setIsCreateModalOpen(true);
                }}
                className="font-bold text-xs rounded-xl bg-[#008F83] hover:bg-[#007F78] text-white shadow-none px-5 py-2.5"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                + Start New Report
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              {filteredReports.map((r, idx) => {
                const totalRooms = r.inspection_rooms?.length || 12;
                const completedRooms =
                  r.inspection_rooms?.filter((rm) => rm.status === 'Completed').length ||
                  (r.status === 'Completed' ? totalRooms : 0);
                const pct =
                  totalRooms > 0
                    ? Math.round((completedRooms / totalRooms) * 100)
                    : r.status === 'Completed' ? 100 : 0;

                const propertyTitle =
                  r.properties?.name ||
                  r.properties?.address_line_1 ||
                  'newTestProperty';
                const propertyAddressLine1 =
                  r.properties?.address_line_1 || '3rd Floor, Plot No. 60, Ayyappa Society';
                const propertySubtitle = [
                  r.properties?.city || 'testSuburb',
                  r.properties?.state || 'TAS',
                ]
                  .filter(Boolean)
                  .join(', ');

                const fallbackImage = PROPERTY_FALLBACK_IMAGES[idx % PROPERTY_FALLBACK_IMAGES.length];

                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#07111F] p-5 shadow-xs hover:shadow-md hover:border-[#008F83]/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Thumbnail + Property Details & Status */}
                      <div className="flex items-start gap-3.5">
                        {/* Property Image Thumbnail */}
                        <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800 shadow-2xs">
                          <img
                            src={fallbackImage}
                            alt={propertyTitle}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Title, Address & Status */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-[15px] sm:text-base text-slate-900 dark:text-white leading-snug truncate">
                              {propertyTitle}
                            </h4>

                            <span
                              className={cn(
                                'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 border',
                                r.status === 'Completed'
                                  ? 'bg-[#E8F7F5] text-[#008F83] border-[#8EDDD5] dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                                  : 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A] dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                              )}
                            >
                              {r.status}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 truncate">
                            {propertyAddressLine1}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-[#7F8B99] mt-0.5 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{propertySubtitle}</span>
                          </p>
                        </div>
                      </div>

                      {/* Middle Metadata Row: Inspection Type & Date / Inspector */}
                      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>{r.type || 'Move-In'} Inspection</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#7F8B99] text-xs">
                          {r.status === 'Completed' && r.inspector_name ? (
                            <>
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{r.inspector_name}</span>
                            </>
                          ) : (
                            <>
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{r.inspection_date || '02 Oct 2026'}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Unified Progress Section */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                            INSPECTION PROGRESS
                          </span>
                          <span className="text-slate-500 dark:text-[#7F8B99] font-medium text-[11px]">
                            {completedRooms} / {totalRooms} areas
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full bg-[#E8EEF2] dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#00A99D] rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Bottom Row */}
                    <div className="flex items-center justify-between pt-4 mt-3">
                      {r.status === 'Completed' ? (
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/condition-reports/${r.id}`)}
                          className="px-4 py-2 rounded-xl border border-teal-300 bg-[#E8F7F5] hover:bg-teal-100 text-[#008F83] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                          <span>View Report</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/condition-reports/${r.id}`)}
                          className="px-4 py-2 rounded-xl bg-[#008F83] hover:bg-[#007F78] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                          <span>Continue</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(r.id);
                          }}
                          className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-600 flex items-center justify-center transition-all cursor-pointer"
                          title="Delete Report"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/condition-reports/${r.id}`)}
                          className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#0E1E33] text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. START NEW REPORT GUIDED MODAL */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#07111F] border border-slate-200 dark:border-[#17283A] rounded-[20px] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-6 py-4.5 border-b border-slate-100 dark:border-[#17283A] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white">
                    New Condition Report
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                    Set up the inspection details and layout before you begin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0E1E33] hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step indicator pills */}
              <div className="px-6 py-2.5 bg-slate-50/80 dark:bg-[#0E1E33]/40 border-b border-slate-100 dark:border-[#17283A] flex items-center gap-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setModalStep(1)}
                  className={cn(
                    'flex items-center gap-1.5 transition-colors',
                    modalStep === 1
                      ? 'text-[#008F83] font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-[#7F8B99]'
                  )}
                >
                  <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10.5px]', modalStep === 1 ? 'bg-[#008F83] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300')}>1</span>
                  <span>Property & Lease</span>
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />

                <button
                  type="button"
                  onClick={() => setModalStep(2)}
                  className={cn(
                    'flex items-center gap-1.5 transition-colors',
                    modalStep === 2
                      ? 'text-[#008F83] font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-[#7F8B99]'
                  )}
                >
                  <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10.5px]', modalStep === 2 ? 'bg-[#008F83] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300')}>2</span>
                  <span>Inspection Details</span>
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />

                <button
                  type="button"
                  onClick={() => setModalStep(3)}
                  className={cn(
                    'flex items-center gap-1.5 transition-colors',
                    modalStep === 3
                      ? 'text-[#008F83] font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:text-[#7F8B99]'
                  )}
                >
                  <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10.5px]', modalStep === 3 ? 'bg-[#008F83] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300')}>3</span>
                  <span>Inspection Areas</span>
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCreateReport} className="flex-1 overflow-y-auto p-6 space-y-5">
                {modalStep === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Select Property */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#008F83]" />
                        Property *
                      </label>
                      <select
                        required
                        value={selectedPropertyId}
                        onChange={(e) => setSelectedPropertyId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0E1E33] border border-slate-200 dark:border-[#17283A] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008F83]/20 focus:border-[#008F83] outline-none transition-all cursor-pointer font-medium"
                      >
                        <option value="">-- Choose Property --</option>
                        {modalProperties.map((p) => (
                          <option key={p.id} value={p.id}>
                            🏢 {p.name} ({p.address_line_1})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Lease Reference (Optional) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <FileCheck className="w-3.5 h-3.5 text-[#008F83]" />
                          Lease Reference
                        </label>
                        <span className="text-[11px] text-slate-400 font-normal">Optional</span>
                      </div>
                      <select
                        value={selectedLeaseId}
                        onChange={(e) => setSelectedLeaseId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0E1E33] border border-slate-200 dark:border-[#17283A] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008F83]/20 focus:border-[#008F83] outline-none transition-all cursor-pointer font-medium"
                      >
                        <option value="">-- No Active Lease Reference / Standalone --</option>
                        {modalLeases
                          .filter((l) => l.property_id === selectedPropertyId)
                          .map((l) => (
                            <option key={l.id} value={l.id}>
                              📄 {l.status.toUpperCase()} — {l.start_date} → {l.end_date || 'Ongoing'}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}

                {modalStep === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Inspection Type */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Inspection Type *
                        </label>
                        <select
                          value={inspectionType}
                          onChange={(e) => setInspectionType(e.target.value as ConditionReportType)}
                          className="w-full bg-slate-50 dark:bg-[#0E1E33] border border-slate-200 dark:border-[#17283A] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008F83]/20 focus:border-[#008F83] outline-none transition-all cursor-pointer font-medium"
                        >
                          <option value="Move In">Incoming (Move-In Baseline)</option>
                          <option value="Routine">Routine (Periodic Inspection)</option>
                          <option value="Move Out">Outgoing (Move-Out Comparison)</option>
                          <option value="Custom">Custom Condition Report</option>
                        </select>
                      </div>

                      {/* Date */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#008F83]" />
                          Inspection Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={inspectionDate}
                          onChange={(e) => setInspectionDate(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#0E1E33] border border-slate-200 dark:border-[#17283A] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008F83]/20 focus:border-[#008F83] outline-none transition-all font-medium"
                        />
                      </div>
                    </div>

                    {/* Baseline Reference Report (if Routine or Move Out) */}
                    {(inspectionType === 'Routine' || inspectionType === 'Move Out') && (
                      <div className="space-y-1.5 p-3.5 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800 rounded-xl">
                        <label className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center justify-between">
                          <span>Baseline / Prior Condition Report</span>
                          <span className="text-[10.5px] font-normal text-teal-700 dark:text-teal-400">
                            Used for historical comparison
                          </span>
                        </label>
                        <select
                          value={selectedBaselineReportId}
                          onChange={(e) => setSelectedBaselineReportId(e.target.value)}
                          className="w-full bg-white dark:bg-[#0E1E33] border border-teal-200 dark:border-teal-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008F83]/20 outline-none cursor-pointer"
                        >
                          <option value="">-- No Prior Baseline (Create Standalone) --</option>
                          {modalPriorReports
                            .filter((r) => r.property_id === selectedPropertyId && r.status === 'Completed')
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.type} Inspection ({r.inspection_date})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Inspector Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#008F83]" />
                        Inspector Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={inspectorName}
                        onChange={(e) => setInspectorName(e.target.value)}
                        placeholder="e.g. Sarah Jenkins (Property Manager)"
                        className="w-full bg-slate-50 dark:bg-[#0E1E33] border border-slate-200 dark:border-[#17283A] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008F83]/20 focus:border-[#008F83] outline-none transition-all font-medium"
                      />
                    </div>
                  </div>
                )}

                {modalStep === 3 && (
                  <div className="space-y-3.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-1">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          INSPECTION AREAS ({totalConfiguredRooms} selected)
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-[#7F8B99]">
                          Select and configure the areas to include in this report.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleResetTemplates}
                        className="text-xs font-bold text-[#008F83] dark:text-[#32D5C4] hover:underline"
                      >
                        Use Standard Template
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {roomTemplates.map((t) => {
                        const isSelected = t.count > 0;
                        return (
                          <div
                            key={t.name}
                            className={cn(
                              'flex flex-col rounded-xl p-3 items-center justify-between border transition-all text-center',
                              isSelected
                                ? 'bg-[#E8F7F5] dark:bg-[#008F83]/15 border-[#8EDDD5] dark:border-[#008F83]/40 shadow-2xs'
                                : 'bg-slate-50 dark:bg-[#0E1E33]/40 border-slate-200 dark:border-[#17283A]'
                            )}
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#008F83] shrink-0" />}
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {t.name}
                              </span>
                            </div>

                            <span className="text-[10px] text-slate-500 dark:text-[#7F8B99] mb-2 font-medium">
                              {getItemsForRoomType(t.name).length} checklist items
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateRoomCount(t.name, false)}
                                className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-slate-400 flex items-center justify-center text-xs font-bold text-slate-800 dark:text-white transition-all cursor-pointer"
                              >
                                -
                              </button>
                              <span className="text-xs font-bold text-slate-900 dark:text-white min-w-[16px] text-center">
                                {t.count}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateRoomCount(t.name, true)}
                                className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-slate-400 flex items-center justify-center text-xs font-bold text-slate-800 dark:text-white transition-all cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer Navigation Buttons */}
                <div className="pt-4 border-t border-slate-100 dark:border-[#17283A] flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (modalStep > 1) {
                        setModalStep((prev) => (prev - 1) as any);
                      } else {
                        setIsCreateModalOpen(false);
                      }
                    }}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-[#0E1E33] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {modalStep === 1 ? 'Cancel' : 'Back'}
                  </button>

                  {modalStep < 3 ? (
                    <Button
                      type="button"
                      onClick={() => setModalStep((prev) => (prev + 1) as any)}
                      disabled={modalStep === 1 && !selectedPropertyId}
                      className="bg-[#008F83] hover:bg-[#007F78] text-white py-2.5 px-5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-none"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={!selectedPropertyId || isSubmitting || totalConfiguredRooms === 0}
                      className="bg-[#008F83] hover:bg-[#007F78] text-white py-2.5 px-5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-none"
                    >
                      {isSubmitting ? 'Starting Inspection...' : 'Start Inspection →'}
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#07111F] border border-slate-200 dark:border-[#17283A] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 dark:bg-red-950/50 text-red-600 border border-red-200 dark:border-red-900/40">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Condition Report?
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#7F8B99] leading-relaxed">
                  Are you sure you want to delete this condition report? All associated rooms, checklist ratings, logged defects, and inspection photos will be permanently removed.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-[#0E1E33] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteReport}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
}

