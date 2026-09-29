'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  Plus,
  Building,
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
} from 'lucide-react';
import {
  ConditionReport,
  RoomTemplateConfig,
  DEFAULT_ROOM_TEMPLATES,
  ConditionReportType,
} from '@/types/condition-report';
import {
  fetchConditionReportsAction,
  fetchInspectionPropertiesAndLeasesAction,
  createConditionReportAction,
  deleteConditionReportAction,
} from '@/app/actions/condition-reports';
import { cn } from '@/lib/utils';
import {
  PageLayout,
  PageContent,
  CompactKpiCard,
  SectionPanel,
} from '@/components/workspace';

interface ConditionReportsDashboardProps {
  initialReports?: ConditionReport[];
  propertyFilterId?: string;
}

export function ConditionReportsDashboard({
  initialReports = [],
  propertyFilterId,
}: ConditionReportsDashboardProps) {
  const router = useRouter();
  const [reports, setReports] = useState<ConditionReport[]>(initialReports);
  const [isLoading, setIsLoading] = useState(initialReports.length === 0);
  const [searchQuery, setSearchQuery] = useState('');

  // Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
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
      router.push(`/dashboard/inspections/${res.reportId}`);
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

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
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
    });
  }, [reports, searchQuery]);

  const totalReportsCount = reports.length;
  const draftReportsCount = reports.filter((r) => r.status === 'Draft').length;
  const completedReportsCount = reports.filter(
    (r) => r.status === 'Completed'
  ).length;

  return (
    <PageLayout>
      <PageContent>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Condition Reports
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Perform mobile-first digital condition inspections, log defects, capture signatures, and export official PDFs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-teal-600 dark:hover:bg-teal-500 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Start New Report
            </button>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CompactKpiCard
              label="Total Reports"
              value={totalReportsCount}
              icon={ClipboardList}
              accent="indigo"
            />
            <CompactKpiCard
              label="Draft Inspections"
              value={draftReportsCount}
              icon={Settings}
              accent="amber"
            />
            <CompactKpiCard
              label="Completed & Locked"
              value={completedReportsCount}
              icon={Check}
              accent="teal"
            />
          </div>

          {/* Search & Filters */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by property name, address, inspector, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-teal-500/20 focus:border-slate-400 dark:focus:border-slate-700 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-white shadow-xs"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center justify-between text-xs text-red-700 dark:text-red-300">
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

          {/* Reports Grid */}
          {isLoading ? (
            <div className="flex justify-center items-center py-24">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xs">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <ClipboardList className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                No Condition Reports Found
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                Start your first digital condition inspection. Configure property layout and inspect room-by-room on your mobile device or tablet.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Start New Report
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredReports.map((r) => {
                const totalRooms = r.inspection_rooms?.length || 0;
                const completedRooms =
                  r.inspection_rooms?.filter((rm) => rm.status === 'Completed')
                    .length || 0;
                const pct =
                  totalRooms > 0
                    ? Math.round((completedRooms / totalRooms) * 100)
                    : 0;

                const propertyTitle =
                  r.properties?.name ||
                  r.properties?.address_line_1 ||
                  'Property';
                const propertySubtitle = [
                  r.properties?.city,
                  r.properties?.state,
                ]
                  .filter(Boolean)
                  .join(', ');

                return (
                  <div
                    key={r.id}
                    onClick={() =>
                      router.push(`/dashboard/inspections/${r.id}`)
                    }
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded-2xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                            r.status === 'Completed'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          )}
                        >
                          {r.status}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(r.id);
                          }}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="font-bold text-base text-slate-900 dark:text-white truncate mb-0.5">
                        {propertyTitle}
                      </h3>
                      {propertySubtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-3">
                          {propertySubtitle}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mb-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold',
                            r.type === 'Move In'
                              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900'
                              : r.type === 'Routine'
                              ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900'
                              : r.type === 'Move Out'
                              ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-900'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          )}
                        >
                          {r.type} Condition Report
                        </span>
                      </div>

                      {/* Progress Bar */}
                      {totalRooms > 0 && (
                        <div className="mt-3 mb-4 space-y-1.5">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <span>Progress</span>
                            <span>
                              {completedRooms}/{totalRooms} Rooms ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-300',
                                pct === 100
                                  ? 'bg-emerald-500'
                                  : 'bg-teal-600 dark:bg-teal-400'
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5" /> {r.inspection_date}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium capitalize">
                        <User className="w-3.5 h-3.5" /> {r.inspector_name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Start New Report Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    New Condition Report
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure inspection scope, property, and layout template.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={handleCreateReport}
                className="flex-1 overflow-y-auto p-6 space-y-5"
              >
                {/* Select Property */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    Property *
                  </label>
                  <select
                    required
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-slate-400 outline-none transition-all"
                  >
                    <option value="">-- Choose Property --</option>
                    {modalProperties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.address_line_1})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lease Reference (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                    Lease Reference (Optional)
                  </label>
                  <select
                    value={selectedLeaseId}
                    onChange={(e) => setSelectedLeaseId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-slate-400 outline-none transition-all"
                  >
                    <option value="">-- No Active Lease / Historic --</option>
                    {modalLeases
                      .filter((l) => l.property_id === selectedPropertyId)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.status.toUpperCase()} — {l.start_date} →{' '}
                          {l.end_date || 'Ongoing'}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Inspection Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Inspection Type *
                    </label>
                    <select
                      value={inspectionType}
                      onChange={(e) =>
                        setInspectionType(e.target.value as ConditionReportType)
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-slate-400 outline-none transition-all"
                    >
                      <option value="Move In">Incoming (Move-In Baseline)</option>
                      <option value="Routine">Routine (Periodic Inspection)</option>
                      <option value="Move Out">Outgoing (Move-Out Comparison)</option>
                      <option value="Custom">Custom Condition Report</option>
                    </select>
                  </div>

                  {/* Baseline Reference Report (if Routine or Move Out) */}
                  {(inspectionType === 'Routine' || inspectionType === 'Move Out') && (
                    <div className="sm:col-span-2 space-y-1.5 p-3 bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl animate-in fade-in">
                      <label className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center justify-between">
                        <span>Baseline / Prior Condition Report</span>
                        <span className="text-[10px] font-normal text-teal-700 dark:text-teal-400">
                          Used for historical comparison & differences
                        </span>
                      </label>
                      <select
                        value={selectedBaselineReportId}
                        onChange={(e) => setSelectedBaselineReportId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 outline-none"
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

                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Inspection Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={inspectionDate}
                      onChange={(e) => setInspectionDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-slate-400 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Inspector Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Inspector Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins (Property Manager)"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/20 focus:border-slate-400 outline-none transition-all"
                  />
                </div>

                {/* Layout Definer */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      Configure Property Layout
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      V1 Standard Template
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {roomTemplates.map((t) => (
                      <div
                        key={t.name}
                        className="flex flex-col bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 items-center justify-between"
                      >
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          {t.name}
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
                    ))}
                  </div>
                </div>

                {/* Submit & Cancel */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedPropertyId || isSubmitting}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? 'Generating...' : 'Start Inspection'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-950/50 text-red-600">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Condition Report?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to delete this condition report? All associated rooms, checklist ratings, logged defects, and inspection photos will be permanently removed.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
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
