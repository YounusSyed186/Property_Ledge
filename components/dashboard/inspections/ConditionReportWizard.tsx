'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Camera,
  AlertTriangle,
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  Menu,
  Download,
  ShieldCheck,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  Info,
} from 'lucide-react';
import {
  ConditionReport,
  InspectionRoom,
  InspectionItem,
  InspectionDefect,
  InspectionPhoto,
  ItemRating,
  RoomStatus,
  DefectSeverity,
  FullConditionReportData,
} from '@/types/condition-report';
import {
  fetchConditionReportDetailAction,
  updateItemRatingAction,
  markRoomGoodAction,
  updateRoomStatusAction,
  addDefectAction,
  deleteDefectAction,
  addPhotoAction,
  deletePhotoAction,
  finalizeConditionReportAction,
} from '@/app/actions/condition-reports';
import { compareConditionReports } from '@/lib/inspections/comparison-engine';
import { downloadConditionReportPDF } from '@/lib/pdf/condition-report-pdf';
import { compressImageForUpload } from '@/lib/images/compression';
import { SignaturePad } from './SignaturePad';
import { cn } from '@/lib/utils';
import { PageLayout, PageContent } from '@/components/workspace';

interface ConditionReportWizardProps {
  reportId: string;
  initialData?: FullConditionReportData;
}

export function ConditionReportWizard({
  reportId,
  initialData,
}: ConditionReportWizardProps) {
  const router = useRouter();

  const [data, setData] = useState<FullConditionReportData | null>(
    initialData || null
  );
  const [isLoading, setIsLoading] = useState(!initialData);
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showGuidance, setShowGuidance] = useState(false);
  const [activeDefectTarget, setActiveDefectTarget] = useState<string | null>(null);

  const [alertMessage, setAlertMessage] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Hidden file inputs for Camera vs Gallery
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Signatures
  const [signatureManager, setSignatureManager] = useState<string | null>(
    initialData?.report.signature_manager || null
  );
  const [signatureTenant, setSignatureTenant] = useState<string | null>(
    initialData?.report.signature_tenant || null
  );

  // Defect form inputs
  const [defectNotes, setDefectNotes] = useState('');
  const [defectSeverity, setDefectSeverity] = useState<DefectSeverity>('Minor');
  const [defectItemName, setDefectItemName] = useState('');

  useEffect(() => {
    if (!initialData) {
      loadReport();
    }
  }, [reportId]);

  const loadReport = async () => {
    setIsLoading(true);
    const res = await fetchConditionReportDetailAction(reportId);
    if (res.success && res.data) {
      setData(res.data);
      setSignatureManager(res.data.report.signature_manager || null);
      setSignatureTenant(res.data.report.signature_tenant || null);
    } else {
      setAlertMessage({
        title: 'Error Loading Report',
        message: res.error || 'Unable to load report details',
        type: 'error',
      });
    }
    setIsLoading(false);
  };

  const comparisonSummary = useMemo(() => {
    if (!data) return null;
    return compareConditionReports(data, data.baselineReport);
  }, [data]);

  if (isLoading || !data) {
    return (
      <PageLayout>
        <PageContent>
          <div className="flex flex-col justify-center items-center h-[70vh] gap-3">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Loading inspection workspace...</p>
          </div>
        </PageContent>
      </PageLayout>
    );
  }

  const { report, rooms, items, defects, photos, baselineReport } = data;
  const totalRooms = rooms.length;
  const isSummaryPage = activeRoomIndex === totalRooms;
  const activeRoom = rooms[activeRoomIndex] || null;

  const activeRoomItems = items.filter((i) => i.room_id === activeRoom?.id);
  const activeRoomDefects = defects.filter((d) => d.room_id === activeRoom?.id);
  const activeRoomPhotos = photos.filter((p) => p.room_id === activeRoom?.id);

  // Find corresponding baseline room if available
  const activeBaselineRoom = baselineReport?.rooms.find(
    (r) => r.name.trim().toLowerCase() === activeRoom?.name.trim().toLowerCase()
  );
  const activeBaselineItems = activeBaselineRoom
    ? baselineReport?.items.filter((i) => i.room_id === activeBaselineRoom.id) || []
    : [];

  const completedRooms = rooms.filter((r) => r.status === 'Completed').length;
  const incompleteRooms = rooms.filter((r) => r.status !== 'Completed');
  const progressPercent =
    totalRooms > 0 ? Math.round((completedRooms / totalRooms) * 100) : 0;

  // --- ACTIONS ---

  const handleRatingChange = async (
    itemId: string,
    rating: ItemRating | null
  ) => {
    // Optimistic local update
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) =>
          it.id === itemId ? { ...it, rating } : it
        ),
      };
    });

    if (activeRoom && activeRoom.status === 'Incomplete') {
      handleRoomStatusUpdate(activeRoom.id, 'Completed');
    }

    await updateItemRatingAction(itemId, rating);
  };

  const handleMarkEntireRoomGood = async () => {
    if (!activeRoom) return;

    // Optimistic local update
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) =>
          it.room_id === activeRoom.id ? { ...it, rating: 'Good' } : it
        ),
        rooms: prev.rooms.map((rm) =>
          rm.id === activeRoom.id ? { ...rm, status: 'Completed' } : rm
        ),
      };
    });

    await markRoomGoodAction(activeRoom.id);
  };

  const handleRoomStatusUpdate = async (
    roomId: string,
    status: RoomStatus
  ) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map((rm) =>
          rm.id === roomId ? { ...rm, status } : rm
        ),
      };
    });
    await updateRoomStatusAction(roomId, status);
  };

  const handleAddDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !defectNotes.trim()) return;

    const res = await addDefectAction(
      activeRoom.id,
      defectItemName || undefined,
      defectNotes,
      defectSeverity
    );

    if (res.success && res.data) {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          defects: [...prev.defects, res.data],
          rooms: prev.rooms.map((rm) =>
            rm.id === activeRoom.id ? { ...rm, status: 'Completed' } : rm
          ),
        };
      });
      setDefectNotes('');
      setDefectItemName('');
      setDefectSeverity('Minor');
    }
  };

  const handleDeleteDefect = async (defectId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        defects: prev.defects.filter((d) => d.id !== defectId),
      };
    });
    await deleteDefectAction(defectId);
  };

  const handlePhotoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeRoom) return;

    setUploadError(null);
    setIsUploadingPhoto(true);

    try {
      // 1. Fast mobile client-side image compression
      const compressedBase64 = await compressImageForUpload(file, 1200, 0.82);

      // 2. Upload photo action
      const res = await addPhotoAction(
        activeRoom.id,
        compressedBase64,
        activeDefectTarget || null,
        null
      );

      if (res.success && res.data) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            photos: [...prev.photos, res.data],
            rooms: prev.rooms.map((rm) =>
              rm.id === activeRoom.id ? { ...rm, status: 'Completed' } : rm
            ),
          };
        });
      } else {
        setUploadError(res.error || 'Failed to upload photo. Please retry.');
      }
    } catch (err: any) {
      console.error('Photo upload error:', err);
      setUploadError(err.message || 'Error processing photo. Please retry.');
    } finally {
      setIsUploadingPhoto(false);
      setActiveDefectTarget(null);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        photos: prev.photos.filter((p) => p.id !== photoId),
      };
    });
    await deletePhotoAction(photoId);
  };

  const handleFinalizeReport = async () => {
    if (!signatureManager) {
      setAlertMessage({
        title: 'Signature Required',
        message: 'Please add the Property Manager / Inspector signature before finalizing.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    const res = await finalizeConditionReportAction(report.id, {
      signatureManager,
      signatureTenant,
    });

    if (res.success) {
      const updatedReport: ConditionReport = {
        ...report,
        status: 'Completed',
        completed_at: new Date().toISOString(),
        signature_manager: signatureManager,
        signature_tenant: signatureTenant,
      };

      setData((prev) => (prev ? { ...prev, report: updatedReport } : prev));

      // Trigger automatic PDF download
      downloadConditionReportPDF({
        ...data,
        report: updatedReport,
      });

      setAlertMessage({
        title: 'Report Finalized & Downloaded',
        message:
          'The condition report is now locked and the official PDF document has been downloaded successfully.',
        type: 'success',
      });
    } else {
      setAlertMessage({
        title: 'Finalization Error',
        message: res.error || 'Failed to finalize report',
        type: 'error',
      });
    }
    setIsSubmitting(false);
  };

  const handleDownloadPDFOnly = () => {
    if (!data) return;
    downloadConditionReportPDF({
      ...data,
      report: {
        ...data.report,
        signature_manager: signatureManager,
        signature_tenant: signatureTenant,
      },
    });
  };

  const getRatingBadgeStyle = (rating: ItemRating | null, isSelected: boolean) => {
    if (!isSelected) {
      return 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white border-transparent';
    }
    switch (rating) {
      case 'Excellent':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-xs font-bold';
      case 'Good':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-300 dark:border-green-700 shadow-xs font-bold';
      case 'Fair':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-xs font-bold';
      case 'Needs Repair':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-xs font-bold';
      case 'Damaged':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300 dark:border-red-700 shadow-xs font-bold';
      case 'Not Applicable':
        return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 shadow-xs font-bold';
      default:
        return 'border-transparent';
    }
  };

  const propertyDisplay =
    report.properties?.name ||
    report.properties?.address_line_1 ||
    'Property';

  const typeLabel =
    report.type === 'Move In'
      ? 'Incoming (Baseline)'
      : report.type === 'Move Out'
      ? 'Outgoing (Exit Comparison)'
      : report.type === 'Routine'
      ? 'Routine Inspection'
      : 'Custom Inspection';

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Room Drawer Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 lg:static z-50 w-72 sm:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => router.push('/dashboard/inspections')}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" /> All Reports
            </button>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900"
            >
              ✕
            </button>
          </div>

          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-white truncate">
              {propertyDisplay}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                {typeLabel}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[10px] text-slate-400 font-medium">
                {report.inspection_date}
              </span>
            </div>
          </div>

          {/* Inspection Guidance Trigger */}
          <button
            type="button"
            onClick={() => setShowGuidance(!showGuidance)}
            className="w-full text-left p-2.5 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 rounded-xl text-xs font-semibold text-teal-900 dark:text-teal-200 flex items-center justify-between transition-colors hover:bg-teal-100/60"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Inspector Walkthrough Guide
            </span>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
              {showGuidance ? 'Hide' : 'View'}
            </span>
          </button>

          {showGuidance && (
            <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 space-y-2 animate-in fade-in">
              <p className="font-bold text-slate-900 dark:text-white">
                Recommended 10-Step Workflow:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400 leading-relaxed">
                <li>Walk through property & capture overall room photos.</li>
                <li>All items start in <strong>Normal / Good</strong> state.</li>
                <li>Change only exceptions (Needs Repair / Damaged).</li>
                <li>Attach photos directly to problematic items or defects.</li>
                <li>Review historical baseline diffs (for Outgoing/Routine).</li>
                <li>Capture Inspector & Tenant digital signatures.</li>
                <li>Finalize to lock and download official PDF.</li>
              </ol>
            </div>
          )}

          {/* Rooms Navigation List */}
          <div className="space-y-1">
            {rooms.map((room, index) => {
              const roomDefectsCount = defects.filter(
                (d) => d.room_id === room.id
              ).length;
              const roomPhotosCount = photos.filter(
                (p) => p.room_id === room.id
              ).length;
              const isActive = activeRoomIndex === index;

              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => {
                    setActiveRoomIndex(index);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-3.5 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer min-h-[44px]',
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-teal-600 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <span className="truncate">{room.name}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    {roomPhotosCount > 0 && (
                      <span className="text-[10px] opacity-75">
                        📷 {roomPhotosCount}
                      </span>
                    )}
                    {roomDefectsCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-[9px] font-black">
                        {roomDefectsCount} issues
                      </span>
                    )}
                    {room.status === 'Completed' ? (
                      <Check
                        className={cn(
                          'w-4 h-4',
                          isActive
                            ? 'text-white'
                            : 'text-emerald-500 dark:text-emerald-400'
                        )}
                      />
                    ) : (
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          isActive ? 'bg-white' : 'bg-slate-300 dark:bg-slate-600'
                        )}
                      />
                    )}
                  </span>
                </button>
              );
            })}

            {/* Summary Review Item */}
            <button
              type="button"
              onClick={() => {
                setActiveRoomIndex(totalRooms);
                setIsSidebarOpen(false);
              }}
              className={cn(
                'w-full text-left px-3.5 py-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer mt-2 border-t border-slate-100 dark:border-slate-800 pt-3 min-h-[44px]',
                isSummaryPage
                  ? 'bg-slate-900 text-white dark:bg-teal-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <span className="font-bold">Review & Sign-Off</span>
              <CheckCircle2
                className={cn(
                  'w-4 h-4',
                  isSummaryPage
                    ? 'text-white'
                    : 'text-teal-600 dark:text-teal-400'
                )}
              />
            </button>
          </div>
        </div>

        {/* Progress Section */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
            <span>Overall Progress</span>
            <span>
              {completedRooms}/{totalRooms} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 pb-24 sm:pb-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Notification Alert */}
          {alertMessage && (
            <div
              className={cn(
                'p-4 rounded-xl border text-xs flex items-center justify-between animate-in fade-in',
                alertMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              )}
            >
              <div className="space-y-0.5">
                <p className="font-bold">{alertMessage.title}</p>
                <p className="opacity-90">{alertMessage.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setAlertMessage(null)}
                className="text-current opacity-70 hover:opacity-100 p-1"
              >
                ✕
              </button>
            </div>
          )}

          {!isSummaryPage && activeRoom ? (
            /* --- ROOM INSPECTION VIEW ("DEFAULT GOOD" UX) --- */
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Active Room Header */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(true)}
                      className="lg:hidden p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer"
                      aria-label="Open rooms drawer"
                    >
                      <Menu className="w-4 h-4" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {activeRoom.name}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Area {activeRoomIndex + 1} of {totalRooms} · Items start in normal state. Mark exceptions, capture proof, or record defects.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <button
                    type="button"
                    onClick={handleMarkEntireRoomGood}
                    className="flex-1 sm:flex-none bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs min-h-[44px]"
                  >
                    <Check className="w-4 h-4" /> Mark Room Good
                  </button>
                </div>
              </div>

              {/* Room Checklist Items */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                {activeRoomItems.map((item) => {
                  const baselineItem = activeBaselineItems.find(
                    (bi) => bi.name.trim().toLowerCase() === item.name.trim().toLowerCase()
                  );

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.name}
                          </span>
                          {baselineItem && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded font-medium">
                              Baseline: {baselineItem.rating || 'Good'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Segmented rating buttons with large mobile touch targets */}
                      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl overflow-x-auto max-w-full border border-slate-200 dark:border-slate-700/60">
                        {(
                          [
                            'Excellent',
                            'Good',
                            'Fair',
                            'Needs Repair',
                            'Damaged',
                            'Not Applicable',
                          ] as const
                        ).map((rate) => {
                          const isSelected = item.rating === rate;
                          return (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => {
                                handleRatingChange(item.id, rate);
                                if (rate === 'Needs Repair' || rate === 'Damaged') {
                                  setDefectItemName(item.name);
                                }
                              }}
                              className={cn(
                                'px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap cursor-pointer border min-h-[36px]',
                                getRatingBadgeStyle(rate, isSelected)
                              )}
                            >
                              {rate === 'Not Applicable'
                                ? 'N/A'
                                : rate === 'Needs Repair'
                                ? 'Repair'
                                : rate}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Photos & Visual Proof Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    Photos & Visual Proof
                  </h3>
                  <span className="text-xs text-slate-400">
                    {activeRoomPhotos.length} Photos
                  </span>
                </div>

                {uploadError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {activeRoomPhotos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {activeRoomPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                      >
                        <img
                          src={photo.photo_url}
                          alt="Inspection proof"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-1.5 right-1.5 bg-red-600/90 text-white rounded-full p-1.5 shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                          aria-label="Delete photo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mobile Camera & Gallery Photo Upload Action Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Option 1: Direct Mobile Camera Capture */}
                  <button
                    type="button"
                    disabled={isUploadingPhoto}
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-3.5 px-4 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-800 rounded-xl text-teal-800 dark:text-teal-200 font-bold text-xs transition-colors cursor-pointer min-h-[48px] disabled:opacity-50"
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    )}
                    <span>{isUploadingPhoto ? 'Uploading Photo...' : 'Take Photo (Camera)'}</span>
                  </button>

                  {/* Option 2: Gallery Picker */}
                  <button
                    type="button"
                    disabled={isUploadingPhoto}
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer min-h-[48px] disabled:opacity-50"
                  >
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    <span>Choose from Gallery</span>
                  </button>

                  {/* Hidden inputs */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoFileSelected}
                    className="hidden"
                  />
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileSelected}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Log Issues & Defects Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Log Issues & Defects
                  </h3>
                  <span className="text-xs text-slate-400">
                    {activeRoomDefects.length} Logged
                  </span>
                </div>

                {activeRoomDefects.length > 0 && (
                  <div className="space-y-2">
                    {activeRoomDefects.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-3 bg-red-50/50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/60 rounded-xl"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className={cn(
                                'inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider',
                                d.severity === 'Urgent'
                                  ? 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-200'
                                  : d.severity === 'Major'
                                  ? 'bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-200'
                                  : d.severity === 'Moderate'
                                  ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                              )}
                            >
                              {d.severity}
                            </span>
                            {d.item_name && (
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                ({d.item_name})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                            {d.notes}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteDefect(d.id)}
                          className="text-slate-400 hover:text-red-600 p-2 transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleAddDefect} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <select
                      value={defectItemName}
                      onChange={(e) => setDefectItemName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none min-h-[44px]"
                    >
                      <option value="">-- Specific Item (Optional) --</option>
                      {activeRoomItems.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      {(['Minor', 'Moderate', 'Major', 'Urgent'] as const).map(
                        (sev) => (
                          <button
                            key={sev}
                            type="button"
                            onClick={() => setDefectSeverity(sev)}
                            className={cn(
                              'flex-1 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer min-h-[40px]',
                              defectSeverity === sev
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                            )}
                          >
                            {sev}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Describe the defect or required repair (e.g., crack on wall plaster, leaking tap)..."
                    value={defectNotes}
                    onChange={(e) => setDefectNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!defectNotes.trim()}
                      className="bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer min-h-[44px]"
                    >
                      + Add Defect
                    </button>
                  </div>
                </form>
              </div>

              {/* Bottom Navigation */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setActiveRoomIndex((prev) => Math.max(0, prev - 1))
                  }
                  disabled={activeRoomIndex === 0}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-3 rounded-xl text-xs font-bold hover:border-slate-400 transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer min-h-[44px]"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveRoomIndex((prev) =>
                      Math.min(totalRooms, prev + 1)
                    )
                  }
                  className="bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[44px]"
                >
                  {activeRoomIndex === totalRooms - 1
                    ? 'Review & Sign-Off'
                    : 'Next Area'}{' '}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* --- SUMMARY, HISTORICAL COMPARISON & SIGNATURES VIEW --- */
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Inspection Summary & Sign-Off
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Review all inspected areas, historical differences, captured proof, and captured signatures.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-bold self-start sm:self-auto">
                    {typeLabel}
                  </span>
                </div>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Rooms
                  </span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {completedRooms} / {totalRooms}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Defects
                  </span>
                  <span className="text-lg font-black text-red-600 dark:text-red-400">
                    {defects.length}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Photos
                  </span>
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                    {photos.length}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Status
                  </span>
                  <span
                    className={cn(
                      'text-lg font-black',
                      report.status === 'Completed'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    )}
                  >
                    {report.status}
                  </span>
                </div>
              </div>

              {/* Historical Tenancy Comparison Card (if baseline or Routine/Move-Out) */}
              {comparisonSummary && (baselineReport || report.type === 'Move Out' || report.type === 'Routine') && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      Historical Condition Diff & Exceptions
                    </h3>
                    <span className="text-xs text-slate-400">
                      Baseline: {comparisonSummary.baselineDate || 'Move-In Baseline'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">
                        Changed Items
                      </span>
                      <span className="text-base font-black text-slate-800 dark:text-white">
                        {comparisonSummary.changedItemsCount}
                      </span>
                    </div>
                    <div className="p-3 bg-red-50/50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-red-700 dark:text-red-300 block mb-1">
                        Degraded / Issues
                      </span>
                      <span className="text-base font-black text-red-600 dark:text-red-400">
                        {comparisonSummary.degradedItemsCount}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-center col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block mb-1">
                        New Defects Logged
                      </span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        {comparisonSummary.newDefectsCount}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Incomplete Rooms Warning (if any) */}
              {incompleteRooms.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{incompleteRooms.length} area(s) still incomplete:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {incompleteRooms.map((room) => {
                      const idx = rooms.findIndex((r) => r.id === room.id);
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setActiveRoomIndex(idx)}
                          className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 rounded-lg text-xs font-semibold hover:bg-amber-200 cursor-pointer"
                        >
                          → {room.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Room Breakdown Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                {rooms.map((room, idx) => {
                  const roomDefectsCount = defects.filter(
                    (d) => d.room_id === room.id
                  ).length;
                  const roomPhotosCount = photos.filter(
                    (p) => p.room_id === room.id
                  ).length;

                  return (
                    <div
                      key={room.id}
                      onClick={() => setActiveRoomIndex(idx)}
                      className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {room.name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{roomPhotosCount} Photos</span>
                          <span>•</span>
                          <span>{roomDefectsCount} Defects</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {roomDefectsCount > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-[10px] font-bold">
                            {roomDefectsCount} defects
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            All Clean
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Signatures Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    Digital Sign-Off
                  </h3>
                  <span className="text-xs text-slate-400">
                    Dual signature acknowledgment
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Property Manager Signature */}
                  <SignaturePad
                    label={`Inspector (${report.inspector_name || 'Manager'})`}
                    initialSignature={signatureManager}
                    onSign={(sig) => setSignatureManager(sig)}
                  />

                  {/* Tenant Signature */}
                  <SignaturePad
                    label="Tenant Acknowledgment"
                    initialSignature={signatureTenant}
                    onSign={(sig) => setSignatureTenant(sig)}
                  />
                </div>
              </div>

              {/* Final Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveRoomIndex(totalRooms - 1)}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 py-3.5 rounded-xl text-xs font-bold hover:border-slate-400 transition-all cursor-pointer text-center min-h-[48px]"
                >
                  ← Back to Inspection
                </button>

                {report.status === 'Completed' ? (
                  <button
                    type="button"
                    onClick={handleDownloadPDFOnly}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white py-3.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm min-h-[48px]"
                  >
                    <Download className="w-4 h-4" /> Download Official PDF
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinalizeReport}
                    disabled={isSubmitting || !signatureManager}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white py-3.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-sm min-h-[48px]"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {isSubmitting ? 'Finalizing...' : 'Finalize & Download PDF'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
