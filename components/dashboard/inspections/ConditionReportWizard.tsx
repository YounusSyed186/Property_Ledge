'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  Clock,
  Sparkles,
  ArrowUpRight,
  Info,
  Layers,
  Home,
  ShieldAlert,
  Flame,
  Droplets,
  Phone,
  Wrench,
  PenTool,
  CheckSquare,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  RefreshCw,
  Sliders,
  CheckCheck,
  FileCheck2,
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
  Schedule2StatutoryData,
  InspectionItemDetails,
  DEFAULT_SCHEDULE_2_DATA,
  parseSchedule2Data,
  serializeSchedule2Data,
  LandlordWorkCommitmentItem,
} from '@/types/condition-report';
import {
  fetchConditionReportDetailAction,
  updateItemRatingAction,
  updateItemFullConditionAction,
  saveSchedule2DataAction,
  markRoomGoodAction,
  updateRoomStatusAction,
  addDefectAction,
  deleteDefectAction,
  addPhotosBatchAction,
  deletePhotoAction,
  finalizeConditionReportAction,
} from '@/app/actions/condition-reports';
import { compareConditionReports } from '@/lib/inspections/comparison-engine';
import { downloadConditionReportPDF } from '@/lib/pdf/condition-report-pdf';
import { compressImageForUpload } from '@/lib/images/compression';
import { SignaturePad } from './SignaturePad';
import { cn } from '@/lib/utils';
import { PageLayout, PageContent } from '@/components/workspace';

function getRoomImageUrl(roomName: string): string {
  const lower = (roomName || '').toLowerCase();
  if (lower.includes('lounge') || lower.includes('living')) {
    return 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=400&auto=format&fit=crop&q=80';
  }
  if (lower.includes('bed')) {
    return 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=400&auto=format&fit=crop&q=80';
  }
  if (lower.includes('kitchen')) {
    return 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&auto=format&fit=crop&q=80';
  }
  if (lower.includes('bath') || lower.includes('ensuite')) {
    return 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80';
  }
  if (lower.includes('dining')) {
    return 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&auto=format&fit=crop&q=80';
}

function getItemHint(itemName: string): string {
  const lower = (itemName || '').toLowerCase();
  if (lower.includes('wall') || lower.includes('picture')) return 'Check for marks, holes, or damage.';
  if (lower.includes('door')) return 'Check condition and operation.';
  if (lower.includes('window') || lower.includes('screen') || lower.includes('safety')) return 'Check windows, screens and locks.';
  if (lower.includes('ceiling') || lower.includes('light')) return 'Check lights, fittings and ceiling condition.';
  if (lower.includes('blind') || lower.includes('curtain')) return 'Check operation and condition.';
  if (lower.includes('floor') || lower.includes('skirting') || lower.includes('carpet')) return 'Check stains, wear, and skirting boards.';
  if (lower.includes('tap') || lower.includes('sink') || lower.includes('basin')) return 'Check taps, leaks, and drainage.';
  if (lower.includes('toilet') || lower.includes('cistern')) return 'Check flush, cistern, and seat.';
  if (lower.includes('oven') || lower.includes('stove') || lower.includes('cooktop')) return 'Check clean state and all burners.';
  return 'Inspect condition, cleanliness and working order.';
}

type ActiveTab =
  | 'overview'
  | 'room'
  | 'minimum_standards'
  | 'health_issues'
  | 'smoke_alarms'
  | 'safety_issues'
  | 'water_comms'
  | 'additional_info'
  | 'work_commitments'
  | 'evidence'
  | 'comparison'
  | 'signatures'
  | 'preview';

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
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activePhotoItemTarget, setActivePhotoItemTarget] = useState<string | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});

  const toggleExpandItem = (itemId: string) => {
    setExpandedItemIds((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Autosave status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('just now');

  // Schedule 2 Statutory state
  const [statutoryData, setStatutoryData] = useState<Schedule2StatutoryData>(
    initialData?.schedule2Data || DEFAULT_SCHEDULE_2_DATA
  );

  // Hidden file inputs for Camera vs Gallery
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Quick Defect Modal/Drawer State
  const [activeDefectItem, setActiveDefectItem] = useState<{ id: string; name: string } | null>(null);
  const [defectNotes, setDefectNotes] = useState('');
  const [defectSeverity, setDefectSeverity] = useState<DefectSeverity>('Minor');

  // New Work Commitment state
  const [newCommitmentText, setNewCommitmentText] = useState('');
  const [newCommitmentDueDate, setNewCommitmentDueDate] = useState('');
  const [newCommitmentResponsible, setNewCommitmentResponsible] = useState('Landlord / Agent');

  const [previewSection, setPreviewSection] = useState<
    'all' | 'summary' | 'rooms' | 'statutory' | 'evidence' | 'signatures'
  >('all');

  const [alertMessage, setAlertMessage] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error';
  } | null>(null);

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
      if (res.data.schedule2Data) {
        setStatutoryData(res.data.schedule2Data);
      }
    } else {
      setAlertMessage({
        title: 'Error Loading Report',
        message: res.error || 'Unable to load report details',
        type: 'error',
      });
    }
    setIsLoading(false);
  };

  // Debounced autosave for statutory data
  const saveStatutoryData = useCallback(
    async (updated: Schedule2StatutoryData) => {
      setSaveStatus('saving');
      const res = await saveSchedule2DataAction(reportId, updated);
      if (res.success) {
        setSaveStatus('saved');
        setLastSavedTime('just now');
      } else {
        setSaveStatus('error');
      }
    },
    [reportId]
  );

  const handleStatutoryChange = <K extends keyof Schedule2StatutoryData>(
    section: K,
    fields: Partial<Schedule2StatutoryData[K]>
  ) => {
    setStatutoryData((prev) => {
      const updated = {
        ...prev,
        [section]: {
          ...(prev[section] as any),
          ...fields,
        },
      };
      saveStatutoryData(updated);
      return updated;
    });
  };

  const comparisonSummary = useMemo(() => {
    if (!data) return null;
    return compareConditionReports(
      { ...data, schedule2Data: statutoryData },
      data.baselineReport
    );
  }, [data, statutoryData]);

  if (isLoading || !data) {
    return (
      <PageLayout>
        <PageContent>
          <div className="flex flex-col justify-center items-center h-[70vh] gap-3">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Loading modern inspection workspace...</p>
          </div>
        </PageContent>
      </PageLayout>
    );
  }

  const { report, rooms, items, defects, photos, baselineReport } = data;
  const totalRooms = rooms.length;
  const activeRoom = rooms[activeRoomIndex] || null;

  const activeRoomItems = activeRoom
    ? items.filter((i) => i.room_id === activeRoom.id)
    : [];
  const activeRoomDefects = activeRoom
    ? defects.filter((d) => d.room_id === activeRoom.id)
    : [];
  const activeRoomPhotos = activeRoom
    ? photos.filter((p) => p.room_id === activeRoom.id)
    : [];

  const completedRooms = rooms.filter((r) => r.status === 'Completed').length;
  const progressPercent =
    totalRooms > 0 ? Math.round((completedRooms / totalRooms) * 100) : 0;

  // Issues count across entire inspection
  const totalIssuesCount =
    defects.length +
    items.filter((i) => i.rating === 'Damaged' || i.rating === 'Needs Repair').length;

  // --- ITEM CONDITION CONTROLS (Clean, Undamaged, Working) ---

  const getItemDetail = (itemId: string): InspectionItemDetails => {
    return (
      statutoryData.itemDetailsMap?.[itemId] || {
        clean: true,
        undamaged: true,
        working: true,
        landlordComments: '',
        tenantComments: '',
        tenantAgrees: true,
      }
    );
  };

  const handleSelectRating = async (item: InspectionItem, rating: ItemRating) => {
    const currentDetail = getItemDetail(item.id);
    let isClean = true;
    let isUndamaged = true;
    let isWorking = true;

    if (rating === 'Damaged') {
      isUndamaged = false;
      isClean = currentDetail.clean ?? true;
      isWorking = currentDetail.working ?? true;
    } else if (rating === 'Needs Repair') {
      isWorking = false;
      isUndamaged = currentDetail.undamaged ?? true;
      isClean = currentDetail.clean ?? true;
    } else {
      isClean = true;
      isUndamaged = true;
      isWorking = true;
    }

    const newDetail: InspectionItemDetails = {
      ...currentDetail,
      clean: isClean,
      undamaged: isUndamaged,
      working: isWorking,
    };

    const updatedStatutory: Schedule2StatutoryData = {
      ...statutoryData,
      itemDetailsMap: {
        ...(statutoryData.itemDetailsMap || {}),
        [item.id]: newDetail,
      },
    };
    setStatutoryData(updatedStatutory);

    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) =>
          it.id === item.id ? { ...it, rating } : it
        ),
      };
    });

    if (activeRoom && activeRoom.status === 'Incomplete') {
      handleRoomStatusUpdate(activeRoom.id, 'Completed');
    }

    setSaveStatus('saving');
    await updateItemFullConditionAction(
      report.id,
      item.id,
      rating,
      newDetail,
      updatedStatutory
    );
    setSaveStatus('saved');
    setLastSavedTime('just now');
  };

  const handleItemAttributeChange = async (
    item: InspectionItem,
    attr: 'clean' | 'undamaged' | 'working',
    val: boolean
  ) => {
    const currentDetail = getItemDetail(item.id);
    const newDetail: InspectionItemDetails = {
      ...currentDetail,
      [attr]: val,
    };

    // Calculate rating representation
    let newRating: ItemRating = 'Good';
    if (!newDetail.undamaged) {
      newRating = 'Damaged';
    } else if (!newDetail.working || !newDetail.clean) {
      newRating = 'Needs Repair';
    } else {
      newRating = 'Good';
    }

    // Update local statutory itemDetailsMap
    const updatedStatutory: Schedule2StatutoryData = {
      ...statutoryData,
      itemDetailsMap: {
        ...(statutoryData.itemDetailsMap || {}),
        [item.id]: newDetail,
      },
    };
    setStatutoryData(updatedStatutory);

    // Optimistic item update in data
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) =>
          it.id === item.id ? { ...it, rating: newRating } : it
        ),
      };
    });

    if (activeRoom && activeRoom.status === 'Incomplete') {
      handleRoomStatusUpdate(activeRoom.id, 'Completed');
    }

    setSaveStatus('saving');
    await updateItemFullConditionAction(
      report.id,
      item.id,
      newRating,
      newDetail,
      updatedStatutory
    );
    setSaveStatus('saved');
    setLastSavedTime('just now');
  };

  const handleItemPriorityChange = async (
    item: InspectionItem,
    priority: string
  ) => {
    const currentDetail = getItemDetail(item.id);
    const newDetail: InspectionItemDetails = {
      ...currentDetail,
      priority,
    };

    const updatedStatutory: Schedule2StatutoryData = {
      ...statutoryData,
      itemDetailsMap: {
        ...(statutoryData.itemDetailsMap || {}),
        [item.id]: newDetail,
      },
    };
    setStatutoryData(updatedStatutory);

    setSaveStatus('saving');
    await updateItemFullConditionAction(
      report.id,
      item.id,
      item.rating,
      newDetail,
      updatedStatutory
    );
    setSaveStatus('saved');
    setLastSavedTime('just now');
  };

  const handleItemCommentsChange = async (
    item: InspectionItem,
    comments: { landlordComments?: string; tenantComments?: string; tenantAgrees?: boolean | null }
  ) => {
    const currentDetail = getItemDetail(item.id);
    const newDetail: InspectionItemDetails = {
      ...currentDetail,
      ...comments,
    };

    const updatedStatutory: Schedule2StatutoryData = {
      ...statutoryData,
      itemDetailsMap: {
        ...(statutoryData.itemDetailsMap || {}),
        [item.id]: newDetail,
      },
    };
    setStatutoryData(updatedStatutory);

    setSaveStatus('saving');
    await updateItemFullConditionAction(
      report.id,
      item.id,
      item.rating,
      newDetail,
      updatedStatutory
    );
    setSaveStatus('saved');
    setLastSavedTime('just now');
  };

  const handleMarkEntireRoomGood = async () => {
    if (!activeRoom) return;

    // Set all items in room to clean: true, undamaged: true, working: true
    const updatedMap = { ...(statutoryData.itemDetailsMap || {}) };
    activeRoomItems.forEach((it) => {
      updatedMap[it.id] = {
        clean: true,
        undamaged: true,
        working: true,
        landlordComments: updatedMap[it.id]?.landlordComments || '',
        tenantComments: updatedMap[it.id]?.tenantComments || '',
        tenantAgrees: true,
      };
    });

    const updatedStatutory: Schedule2StatutoryData = {
      ...statutoryData,
      itemDetailsMap: updatedMap,
    };
    setStatutoryData(updatedStatutory);

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

    setSaveStatus('saving');
    await markRoomGoodAction(activeRoom.id);
    await saveSchedule2DataAction(report.id, updatedStatutory);
    setSaveStatus('saved');
    setLastSavedTime('just now');
  };

  const handleRoomStatusUpdate = async (roomId: string, status: RoomStatus) => {
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
      activeDefectItem?.name || undefined,
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
      setActiveDefectItem(null);
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

  const handlePhotoFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !activeRoom) return;

    setUploadError(null);
    setIsUploadingPhoto(true);
    setUploadProgressText(
      files.length > 1
        ? `Compressing & uploading ${files.length} photos...`
        : 'Compressing & uploading photo...'
    );

    try {
      const compressedImages = await Promise.all(
        files.map((f) => compressImageForUpload(f, 1200, 0.82))
      );

      const res = await addPhotosBatchAction(
        activeRoom.id,
        compressedImages,
        null,
        activePhotoItemTarget || null
      );

      if (res.success && res.data && res.data.length > 0) {
        const newPhotos = res.data;
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            photos: [...prev.photos, ...newPhotos],
            rooms: prev.rooms.map((rm) =>
              rm.id === activeRoom.id ? { ...rm, status: 'Completed' } : rm
            ),
          };
        });
        setActivePhotoItemTarget(null);
      } else {
        setUploadError(res.error || 'Failed to upload photos');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Image processing error');
    } finally {
      setIsUploadingPhoto(false);
      setUploadProgressText(null);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
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

  // Add Landlord Work Commitment
  const handleAddWorkCommitment = () => {
    if (!newCommitmentText.trim()) return;

    const newItem: LandlordWorkCommitmentItem = {
      id: `work-${Date.now()}`,
      description: newCommitmentText.trim(),
      completionDueDate: newCommitmentDueDate || '',
      responsible: newCommitmentResponsible,
      status: 'Open',
    };

    const updatedCommitments = [...statutoryData.workCommitments, newItem];
    handleStatutoryChange('workCommitments', updatedCommitments as any);
    setNewCommitmentText('');
    setNewCommitmentDueDate('');
  };

  const handleDeleteWorkCommitment = (id: string) => {
    const updated = statutoryData.workCommitments.filter((w) => w.id !== id);
    handleStatutoryChange('workCommitments', updated as any);
  };

  // Finalize Report
  const handleFinalize = async () => {
    setIsSubmitting(true);
    const res = await finalizeConditionReportAction(report.id, {
      signatureManager: statutoryData.signatures.startTenancyLandlordSig || null,
      signatureTenant: statutoryData.signatures.startTenancyTenantSig || null,
    });

    if (res.success) {
      setAlertMessage({
        title: 'Condition Report Finalized',
        message: 'The condition report has been finalized, locked, and recorded.',
        type: 'success',
      });
      loadReport();
    } else {
      setAlertMessage({
        title: 'Finalization Error',
        message: res.error || 'Failed to finalize condition report',
        type: 'error',
      });
    }
    setIsSubmitting(false);
  };

  // PDF Download
  const handleDownloadPDF = async () => {
    if (!data) return;
    setIsSubmitting(true);
    try {
      await downloadConditionReportPDF({
        ...data,
        schedule2Data: statutoryData,
      });
    } catch (err: any) {
      console.error('PDF error', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter items in active room
  const filteredRoomItems = activeRoomItems.filter((i) =>
    i.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
  );

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Hidden file inputs for photo capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoFileSelected}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handlePhotoFileSelected}
      />

      {/* TOP APPLICATION SHELL (Deep Navy #061222) */}
      <header className="shrink-0 bg-[#061222] border-b border-[#17283A] text-white z-40 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/condition-reports')}
              className="p-1.5 rounded-lg bg-[#071526] hover:bg-[#17283A] text-slate-300 hover:text-white transition-colors border border-[#17283A]"
              title="Back to Condition Reports"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  {report.properties?.name || report.properties?.address_line_1 || 'Condition Report'}
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-teal-500/20 text-[#32D5C4] border border-teal-500/30">
                  {report.type}
                </span>
                {report.status === 'Completed' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Finalized
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                NSW Residential Tenancies Schedule 2 Standard • {report.inspection_date}
              </p>
            </div>
          </div>

          {/* Right Topbar Actions */}
          <div className="flex items-center gap-2">
            {/* Autosave Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#071526] border border-[#17283A] text-[11px] text-slate-400">
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-3 h-3 text-teal-400 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <AlertCircle className="w-3 h-3 text-red-400" />
                  <span className="text-red-400">Save error</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 text-[#32D5C4]" />
                  <span>Saved {lastSavedTime}</span>
                </>
              )}
            </div>

            {/* Live Report Preview button */}
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all border',
                activeTab === 'preview'
                  ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                  : 'bg-[#071526] text-slate-300 hover:text-white hover:bg-[#17283A] border-[#17283A]'
              )}
            >
              <Eye className="w-3.5 h-3.5 text-[#32D5C4]" />
              <span className="hidden sm:inline">Report Preview</span>
            </button>

            {/* Start vs End comparison button */}
            <button
              onClick={() => setActiveTab('comparison')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all border',
                activeTab === 'comparison'
                  ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                  : 'bg-[#071526] text-slate-300 hover:text-white hover:bg-[#17283A] border-[#17283A]'
              )}
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#32D5C4]" />
              <span className="hidden sm:inline">Start vs End</span>
            </button>

            {/* Download PDF button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#008F83] hover:bg-[#00A99D] text-white flex items-center gap-1.5 transition-all shadow-sm shadow-teal-950/30 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF Report</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-1.5 rounded-lg bg-[#071526] hover:bg-[#17283A] text-slate-300 border border-[#17283A]"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* WORKSPACE LAYOUT (Desktop Sidebar + Main Canvas) */}
      <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto flex overflow-hidden relative">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-xs"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* LEFT NAVIGATION SIDEBAR */}
        <aside
          className={cn(
            'z-30 w-72 shrink-0 bg-white border-r border-slate-200 overflow-y-auto p-4 flex flex-col justify-between transition-transform duration-200',
            'fixed inset-y-0 left-0 lg:static lg:h-full',
            isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <div className="space-y-4">
            {/* Top Back Link */}
            <button
              onClick={() => router.push('/dashboard/condition-reports')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Reports</span>
            </button>

            {/* Header: Inspection Areas */}
            <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Inspection Areas
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                {rooms.length} areas • {completedRooms}/{rooms.length} complete
              </p>
            </div>

            {/* Numbered Areas List */}
            <div className="space-y-1 pt-1">
              {rooms.map((rm, idx) => {
                const isCurrent = activeTab === 'room' && activeRoomIndex === idx;
                const isDone = rm.status === 'Completed';
                const formattedNum = String(idx + 1).padStart(2, '0');

                return (
                  <button
                    key={rm.id}
                    onClick={() => {
                      setActiveRoomIndex(idx);
                      setActiveTab('room');
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left cursor-pointer',
                      isCurrent
                        ? 'bg-[#E8F7F5] dark:bg-[#008F83]/20 border border-[#8EDDD5] dark:border-[#008F83]/40 text-[#008F83] dark:text-[#32D5C4] font-bold shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={cn(
                          'text-[11px] font-semibold tabular-nums shrink-0',
                          isCurrent
                            ? 'text-[#008F83] dark:text-[#32D5C4]'
                            : 'text-slate-400 dark:text-slate-500'
                        )}
                      >
                        {formattedNum}
                      </span>
                      <span className="truncate">{rm.name}</span>
                    </div>

                    {isCurrent ? (
                      <div className="w-4 h-4 rounded-full border-2 border-[#008F83] dark:border-[#32D5C4] flex items-center justify-center shrink-0 ml-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#008F83] dark:bg-[#32D5C4]" />
                      </div>
                    ) : isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}

              {/* Summary & Review */}
              <button
                onClick={() => {
                  setActiveTab('overview');
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all text-left mt-3 cursor-pointer',
                  activeTab === 'overview'
                    ? 'bg-[#E8F7F5] dark:bg-[#008F83]/20 border border-[#8EDDD5] dark:border-[#008F83]/40 text-[#008F83] dark:text-[#32D5C4] font-bold'
                    : 'bg-slate-50/80 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold border border-slate-200/80 dark:border-slate-700'
                )}
              >
                <Info className="w-4 h-4 text-[#008F83] dark:text-[#32D5C4] shrink-0" />
                <span>Summary & Review</span>
              </button>
            </div>

            {/* Statutory Compliance Sections (Compact NSW Legal Drawer) */}
            <div className="pt-3 border-t border-slate-100">
              <div className="px-1 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Statutory NSW Schedules
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => {
                    setActiveTab('minimum_standards');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-[11px] font-medium text-left truncate transition-colors',
                    activeTab === 'minimum_standards'
                      ? 'bg-teal-50 text-teal-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Min Standards
                </button>
                <button
                  onClick={() => {
                    setActiveTab('smoke_alarms');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-[11px] font-medium text-left truncate transition-colors',
                    activeTab === 'smoke_alarms'
                      ? 'bg-teal-50 text-teal-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Smoke Alarms
                </button>
                <button
                  onClick={() => {
                    setActiveTab('health_issues');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-[11px] font-medium text-left truncate transition-colors',
                    activeTab === 'health_issues'
                      ? 'bg-teal-50 text-teal-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Health & Mould
                </button>
                <button
                  onClick={() => {
                    setActiveTab('safety_issues');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-[11px] font-medium text-left truncate transition-colors',
                    activeTab === 'safety_issues'
                      ? 'bg-teal-50 text-teal-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Other Safety
                </button>
                <button
                  onClick={() => {
                    setActiveTab('water_comms');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-[11px] font-medium text-left truncate transition-colors',
                    activeTab === 'water_comms'
                      ? 'bg-teal-50 text-teal-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Water & Utilities
                </button>
                <button
                  onClick={() => {
                    setActiveTab('work_commitments');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-[11px] font-medium text-left truncate transition-colors',
                    activeTab === 'work_commitments'
                      ? 'bg-teal-50 text-teal-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Work Orders
                </button>
                <button
                  onClick={() => {
                    setActiveTab('evidence');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-[11px] font-medium text-left truncate transition-colors',
                    activeTab === 'evidence'
                      ? 'bg-teal-50 text-teal-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Photos ({photos.length})
                </button>
                <button
                  onClick={() => {
                    setActiveTab('signatures');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-[11px] font-medium text-left truncate transition-colors',
                    activeTab === 'signatures'
                      ? 'bg-teal-50 text-teal-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Signatures
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Overall Progress Bar */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Overall Progress</span>
              <span className="text-slate-500 font-medium">
                {completedRooms}/{totalRooms} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </aside>

        {/* MAIN EDITING CANVAS (Clean White Document Card) */}
        <main className="flex-1 min-h-0 h-full w-full p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto overflow-y-auto pb-28">
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Hero Banner - Premium Teal Inspection Overview */}
              <div
                className="relative overflow-hidden p-6 sm:p-7 rounded-2xl shadow-md text-white border border-teal-600/30"
                style={{
                  background: 'linear-gradient(120deg, #007F78 0%, #009B91 50%, #008F83 100%)',
                }}
              >
                {/* Background subtle radial glow */}
                <div
                  className="absolute -right-20 -top-20 w-80 h-80 rounded-full pointer-events-none opacity-20"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)',
                  }}
                />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-teal-100 tracking-wider uppercase opacity-90">
                      Condition Report Overview
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mt-1 tracking-tight">
                      {report.properties?.name || 'Inspection Dashboard'}
                    </h2>
                    <p className="text-xs text-white/80 mt-1">
                      {report.properties?.address_line_1 ? `${report.properties.address_line_1}, ` : ''}{report.properties?.city} {report.properties?.state}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab('room');
                      setActiveRoomIndex(0);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-white text-[#008F83] hover:bg-teal-50 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 hover:scale-[1.02]"
                  >
                    <span>Continue Inspection</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Metric Grid */}
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/20">
                  <div className="p-3.5 rounded-xl bg-white/12 border border-white/18 backdrop-blur-xs">
                    <span className="text-[11px] text-white/75 font-medium">Completion</span>
                    <p className="text-2xl font-bold text-white mt-0.5">{progressPercent}%</p>
                    <span className="text-[10px] text-white/70">{completedRooms}/{totalRooms} areas completed</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/12 border border-white/18 backdrop-blur-xs">
                    <span className="text-[11px] text-white/75 font-medium">Items Checked</span>
                    <p className="text-2xl font-bold text-white mt-0.5">{items.length}</p>
                    <span className="text-[10px] text-white/70">Checklist items</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/12 border border-white/18 backdrop-blur-xs">
                    <span className="text-[11px] text-white/75 font-medium">Issues Found</span>
                    <p className="text-2xl font-bold text-white mt-0.5">
                      {totalIssuesCount}
                    </p>
                    <span className="text-[10px] text-white/70">{totalIssuesCount > 0 ? 'Requires attention' : 'No defects flagged'}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/12 border border-white/18 backdrop-blur-xs">
                    <span className="text-[11px] text-white/75 font-medium">Photos Attached</span>
                    <p className="text-2xl font-bold text-white mt-0.5">{photos.length}</p>
                    <span className="text-[10px] text-white/70">Supporting evidence</span>
                  </div>
                </div>
              </div>

              {/* Areas Checklist Grid */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
                  <span>Inspection Areas ({rooms.length})</span>
                  <span className="text-xs text-slate-400 font-normal">Tap area to inspect</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {rooms.map((rm, idx) => {
                    const isDone = rm.status === 'Completed';
                    const roomItems = items.filter((i) => i.room_id === rm.id);
                    const roomPhotos = photos.filter((p) => p.room_id === rm.id);
                    const roomDefects = defects.filter((d) => d.room_id === rm.id);

                    return (
                      <button
                        key={rm.id}
                        onClick={() => {
                          setActiveRoomIndex(idx);
                          setActiveTab('room');
                        }}
                        className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-slate-50/80 transition-all text-left group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-teal-700 transition-colors truncate">
                            {rm.name}
                          </span>
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>{roomItems.length} items</span>
                          {roomPhotos.length > 0 && (
                            <span className="flex items-center gap-0.5 text-slate-500">
                              • <ImageIcon className="w-3 h-3" /> {roomPhotos.length}
                            </span>
                          )}
                          {roomDefects.length > 0 && (
                            <span className="text-amber-600 font-semibold">
                              • {roomDefects.length} defect
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Statutory Compliance Checklist Card */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  NSW Statutory Compliance Modules
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveTab('minimum_standards')}
                    className="p-3 rounded-xl border border-slate-200 hover:border-teal-300 flex items-center justify-between text-left transition-all hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Minimum Standards</p>
                        <p className="text-[11px] text-slate-400">Structural, lighting, drainage, utilities</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => setActiveTab('smoke_alarms')}
                    className="p-3 rounded-xl border border-slate-200 hover:border-teal-300 flex items-center justify-between text-left transition-all hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2.5">
                      <Flame className="w-4 h-4 text-rose-500" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Smoke Alarms</p>
                        <p className="text-[11px] text-slate-400">EPA 1979 & battery records</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => setActiveTab('water_comms')}
                    className="p-3 rounded-xl border border-slate-200 hover:border-teal-300 flex items-center justify-between text-left transition-all hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2.5">
                      <Droplets className="w-4 h-4 text-sky-500" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Water Efficiency & Meter</p>
                        <p className="text-[11px] text-slate-400">Flow rates, WELS & meter readings</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => setActiveTab('signatures')}
                    className="p-3 rounded-xl border border-slate-200 hover:border-teal-300 flex items-center justify-between text-left transition-all hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2.5">
                      <PenTool className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">Digital Signatures</p>
                        <p className="text-[11px] text-slate-400">Agent & Tenant signing blocks</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROOM EXPERIENCE (Clean Modern Condition Report UI) */}
          {activeTab === 'room' && activeRoom && (
            <div className="space-y-6">
              {/* Room Header Banner matching reference design */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={getRoomImageUrl(activeRoom.name)}
                    alt={activeRoom.name}
                    className="w-16 h-12 sm:w-20 sm:h-14 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                  />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading tracking-tight">
                      {activeRoom.name}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Room {activeRoomIndex + 1} of {totalRooms} • {activeRoomItems.length} inspection items
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={handleMarkEntireRoomGood}
                    className="px-3.5 py-2 rounded-xl border border-teal-400 bg-[#E8F7F5]/90 hover:bg-[#E8F7F5] text-[#008F83] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <Check className="w-4 h-4 text-[#008F83]" />
                    <span>Mark Room Good</span>
                  </button>

                  <button
                    onClick={() => {
                      setActivePhotoItemTarget(null);
                      cameraInputRef.current?.click();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#32D5C4]" />
                    <span className="hidden sm:inline">Add Room Photo</span>
                  </button>
                </div>
              </div>

              {/* Uploading progress notification */}
              {isUploadingPhoto && (
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex items-center gap-2 text-xs text-teal-800">
                  <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                  <span>{uploadProgressText || 'Uploading photos...'}</span>
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
                  <span>{uploadError}</span>
                  <button onClick={() => setUploadError(null)} className="text-rose-500 hover:text-rose-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Progress bar matching reference */}
              {(() => {
                const inspectedCount = activeRoomItems.filter((i) => !!i.rating).length;
                const inspectedPct =
                  activeRoomItems.length > 0
                    ? Math.round((inspectedCount / activeRoomItems.length) * 100)
                    : 0;

                return (
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#008F83] rounded-full transition-all duration-300"
                        style={{ width: `${inspectedPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>
                        {inspectedCount} of {activeRoomItems.length} items inspected
                      </span>
                      <span className="font-semibold text-slate-700">{inspectedPct}%</span>
                    </div>
                  </div>
                );
              })()}

              {/* Search Filter input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search items in this room..."
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl bg-white border border-slate-200/90 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 shadow-2xs"
                />
                {itemSearchQuery && (
                  <button
                    onClick={() => setItemSearchQuery('')}
                    className="text-xs text-slate-400 hover:text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* ITEM CARDS LIST (Individual White Cards matching reference UI) */}
              <div className="space-y-3">
                {filteredRoomItems.map((item) => {
                  const detail = getItemDetail(item.id);
                  const itemPhotos = photos.filter((p) => p.item_id === item.id);
                  const isExpanded =
                    expandedItemIds[item.id] ||
                    item.rating === 'Needs Repair' ||
                    item.rating === 'Damaged';

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'rounded-2xl bg-white border transition-all duration-200 shadow-2xs overflow-hidden',
                        isExpanded
                          ? 'border-slate-300 ring-1 ring-slate-100'
                          : 'border-slate-200/80 hover:border-slate-300'
                      )}
                    >
                      {/* Main Item Card Header Row */}
                      <div className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                        {/* Left: Icon + Title + Hint */}
                        <div
                          className="flex items-center gap-3 cursor-pointer select-none min-w-0"
                          onClick={() => toggleExpandItem(item.id)}
                        >
                          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100/80 flex items-center justify-center text-sky-600 shrink-0">
                            <FileText className="w-4 h-4 text-sky-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {item.name}
                              </p>
                              {itemPhotos.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                  <Camera className="w-3 h-3 text-slate-400" />
                                  {itemPhotos.length}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                              {getItemHint(item.name)}
                            </p>
                          </div>
                        </div>

                        {/* Right: 6-Segment Rating Bar + Expand chevron */}
                        <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 flex-wrap">
                          <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-50/80 border border-slate-200/70 gap-1 overflow-x-auto max-w-full">
                            {(
                              [
                                { label: 'Excellent', rating: 'Excellent' },
                                { label: 'Good', rating: 'Good' },
                                { label: 'Fair', rating: 'Fair' },
                                { label: 'Repair', rating: 'Needs Repair' },
                                { label: 'Damaged', rating: 'Damaged' },
                                { label: 'N/A', rating: 'Not Applicable' },
                              ] as const
                            ).map((opt) => {
                              const isSelected = item.rating === opt.rating;
                              return (
                                <button
                                  key={opt.label}
                                  onClick={() => handleSelectRating(item, opt.rating as ItemRating)}
                                  className={cn(
                                    'px-3 py-1.5 text-xs rounded-lg transition-all',
                                    isSelected
                                      ? opt.label === 'Good' || opt.label === 'Excellent'
                                        ? 'bg-[#008F83] text-white font-semibold shadow-xs'
                                        : opt.label === 'Fair'
                                        ? 'bg-[#FEF3C7] border border-[#FCD34D] text-[#B45309] font-semibold shadow-xs'
                                        : opt.label === 'Repair'
                                        ? 'bg-amber-100 border border-amber-300 text-amber-900 font-semibold shadow-xs'
                                        : opt.label === 'Damaged'
                                        ? 'bg-rose-100 border border-rose-300 text-rose-800 font-semibold shadow-xs'
                                        : 'bg-slate-200 border border-slate-300 text-slate-800 font-semibold shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                                  )}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            onClick={() => toggleExpandItem(item.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                          >
                            <ChevronDown
                              className={cn(
                                'w-4 h-4 text-slate-400 transition-transform duration-200',
                                isExpanded ? 'rotate-180 text-teal-600' : ''
                              )}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Expandable 3-Column Drawer matching reference image */}
                      {isExpanded && (
                        <div className="px-3.5 sm:px-4 pb-4 pt-3 border-t border-slate-100 bg-slate-50/40">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                            {/* Col 1: Notes (span 6) */}
                            <div className="md:col-span-6">
                              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                                Notes
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Small scratch on the door frame near handle."
                                value={detail.landlordComments || ''}
                                onChange={(e) =>
                                  handleItemCommentsChange(item, {
                                    landlordComments: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 shadow-2xs transition-colors"
                              />
                            </div>

                            {/* Col 2: Photos (span 3) */}
                            <div className="md:col-span-3">
                              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                                Photos
                              </label>
                              <div className="flex items-center gap-2 flex-wrap">
                                {itemPhotos.map((p) => (
                                  <div
                                    key={p.id}
                                    className="relative group w-10 h-10 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0"
                                  >
                                    <img
                                      src={p.photo_url}
                                      alt="Item proof"
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      onClick={() => handleDeletePhoto(p.id)}
                                      className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ))}

                                <button
                                  onClick={() => {
                                    setActivePhotoItemTarget(item.id);
                                    cameraInputRef.current?.click();
                                  }}
                                  className="w-10 h-10 rounded-lg border border-dashed border-sky-300 bg-sky-50/60 hover:bg-sky-100 text-sky-600 flex flex-col items-center justify-center text-[10px] font-semibold transition-colors shrink-0"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span className="text-[9px] leading-none mt-0.5">Add</span>
                                </button>
                              </div>
                            </div>

                            {/* Col 3: Priority (span 3) */}
                            <div className="md:col-span-3">
                              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                                Priority
                              </label>
                              <div className="relative">
                                <select
                                  value={detail.priority || 'Medium'}
                                  onChange={(e) =>
                                    handleItemPriorityChange(item, e.target.value)
                                  }
                                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 appearance-none focus:outline-none focus:border-teal-500 shadow-2xs transition-colors pr-8 font-medium"
                                >
                                  <option value="Low">Low</option>
                                  <option value="Medium">Medium</option>
                                  <option value="High">High</option>
                                  <option value="Urgent">Urgent</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </div>
                          </div>

                          {/* Extra attributes & Defect Action Row */}
                          <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                            <div className="flex items-center gap-3 text-slate-500">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-medium">Clean:</span>
                                <button
                                  onClick={() => handleItemAttributeChange(item, 'clean', !detail.clean)}
                                  className={cn(
                                    'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors',
                                    detail.clean !== false
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  )}
                                >
                                  {detail.clean !== false ? 'YES' : 'NO'}
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-medium">Undamaged:</span>
                                <button
                                  onClick={() => handleItemAttributeChange(item, 'undamaged', !detail.undamaged)}
                                  className={cn(
                                    'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors',
                                    detail.undamaged !== false
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  )}
                                >
                                  {detail.undamaged !== false ? 'YES' : 'NO'}
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-medium">Working:</span>
                                <button
                                  onClick={() => handleItemAttributeChange(item, 'working', !detail.working)}
                                  className={cn(
                                    'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors',
                                    detail.working !== false
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  )}
                                >
                                  {detail.working !== false ? 'YES' : 'NO'}
                                </button>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setActiveDefectItem({ id: item.id, name: item.name });
                              }}
                              className="px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-semibold flex items-center gap-1 transition-colors self-start sm:self-auto"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span>Log Specific Defect</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Room Defect Log Box */}
              {activeRoomDefects.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                  <h4 className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Logged Issues in {activeRoom.name}</span>
                  </h4>
                  <div className="space-y-2">
                    {activeRoomDefects.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-amber-200 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            {d.item_name && (
                              <span className="font-bold text-slate-800">{d.item_name}:</span>
                            )}
                            <span className="text-slate-700">{d.notes}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-amber-700 uppercase">
                            Severity: {d.severity}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteDefect(d.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MINIMUM STANDARDS (NSW Schedule 2 Section 10) */}
          {activeTab === 'minimum_standards' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Minimum Standards Checklist
                    </h2>
                    <p className="text-xs text-slate-500">
                      NSW Residential Tenancies Regulation 2019 Schedule 2
                    </p>
                  </div>
                </div>

                <div className="space-y-4 divide-y divide-slate-100">
                  {/* Q1: Structurally sound */}
                  <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="max-w-xl">
                      <p className="text-xs font-bold text-slate-800">
                        1. Are the premises structurally sound?
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Floors, ceilings, walls, roof, stairs, doors and windows in reasonable repair and not liable to collapse.
                      </p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => handleStatutoryChange('minimumStandards', { structurallySound: true })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded transition-colors',
                          statutoryData.minimumStandards.structurallySound === true
                            ? 'bg-teal-600 text-white'
                            : 'text-slate-600'
                        )}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleStatutoryChange('minimumStandards', { structurallySound: false })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded transition-colors',
                          statutoryData.minimumStandards.structurallySound === false
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-600'
                        )}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  {/* Q2: Lighting */}
                  <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        2a. Adequate natural or artificial lighting in each room?
                      </p>
                      <p className="text-[11px] text-slate-500">Excluding storage rooms or garages.</p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => handleStatutoryChange('minimumStandards', { adequateLighting: true })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded transition-colors',
                          statutoryData.minimumStandards.adequateLighting === true
                            ? 'bg-teal-600 text-white'
                            : 'text-slate-600'
                        )}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleStatutoryChange('minimumStandards', { adequateLighting: false })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded transition-colors',
                          statutoryData.minimumStandards.adequateLighting === false
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-600'
                        )}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  {/* Q3: Ventilation */}
                  <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">2b. Adequate ventilation?</p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => handleStatutoryChange('minimumStandards', { adequateVentilation: true })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded transition-colors',
                          statutoryData.minimumStandards.adequateVentilation === true
                            ? 'bg-teal-600 text-white'
                            : 'text-slate-600'
                        )}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleStatutoryChange('minimumStandards', { adequateVentilation: false })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded transition-colors',
                          statutoryData.minimumStandards.adequateVentilation === false
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-600'
                        )}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  {/* Q4: Outlets */}
                  <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        2c. Adequate electricity/gas outlet sockets for lighting and heating?
                      </p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => handleStatutoryChange('minimumStandards', { adequateElectricityGasOutlets: true })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded transition-colors',
                          statutoryData.minimumStandards.adequateElectricityGasOutlets === true
                            ? 'bg-teal-600 text-white'
                            : 'text-slate-600'
                        )}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleStatutoryChange('minimumStandards', { adequateElectricityGasOutlets: false })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded transition-colors',
                          statutoryData.minimumStandards.adequateElectricityGasOutlets === false
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-600'
                        )}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  {/* Q5: Plumbing */}
                  <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">2d. Adequate plumbing and drainage?</p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => handleStatutoryChange('minimumStandards', { adequatePlumbingDrainage: true })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded transition-colors',
                          statutoryData.minimumStandards.adequatePlumbingDrainage === true
                            ? 'bg-teal-600 text-white'
                            : 'text-slate-600'
                        )}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleStatutoryChange('minimumStandards', { adequatePlumbingDrainage: false })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded transition-colors',
                          statutoryData.minimumStandards.adequatePlumbingDrainage === false
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-600'
                        )}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  {/* Utilities */}
                  <div className="pt-4">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Utilities & Facilities
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">Supplied with electricity</span>
                        <input
                          type="checkbox"
                          checked={statutoryData.minimumStandards.suppliedElectricity ?? true}
                          onChange={(e) => handleStatutoryChange('minimumStandards', { suppliedElectricity: e.target.checked })}
                          className="w-4 h-4 text-teal-600 rounded"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">Supplied with gas</span>
                        <input
                          type="checkbox"
                          checked={statutoryData.minimumStandards.suppliedGas ?? true}
                          onChange={(e) => handleStatutoryChange('minimumStandards', { suppliedGas: e.target.checked })}
                          className="w-4 h-4 text-teal-600 rounded"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">Connected to hot & cold water</span>
                        <input
                          type="checkbox"
                          checked={statutoryData.minimumStandards.connectedWaterSupply ?? true}
                          onChange={(e) => handleStatutoryChange('minimumStandards', { connectedWaterSupply: e.target.checked })}
                          className="w-4 h-4 text-teal-600 rounded"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">Bathroom facilities allow privacy</span>
                        <input
                          type="checkbox"
                          checked={statutoryData.minimumStandards.bathroomFacilitiesPrivacy ?? true}
                          onChange={(e) => handleStatutoryChange('minimumStandards', { bathroomFacilitiesPrivacy: e.target.checked })}
                          className="w-4 h-4 text-teal-600 rounded"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tenant Agreement */}
                  <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Does the tenant agree with all minimum standards?
                      </p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => handleStatutoryChange('minimumStandards', { tenantAgrees: true })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded transition-colors',
                          statutoryData.minimumStandards.tenantAgrees === true
                            ? 'bg-teal-600 text-white'
                            : 'text-slate-600'
                        )}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleStatutoryChange('minimumStandards', { tenantAgrees: false })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded transition-colors',
                          statutoryData.minimumStandards.tenantAgrees === false
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-600'
                        )}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  {statutoryData.minimumStandards.tenantAgrees === false && (
                    <div className="pt-2">
                      <label className="text-xs font-semibold text-slate-700">
                        Specify which items tenant disagrees with:
                      </label>
                      <input
                        type="text"
                        value={statutoryData.minimumStandards.tenantDisagreedItems || ''}
                        onChange={(e) => handleStatutoryChange('minimumStandards', { tenantDisagreedItems: e.target.value })}
                        placeholder="e.g. Ventilation in ensuite needs exhaust fan check"
                        className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HEALTH ISSUES */}
          {activeTab === 'health_issues' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Health Issues & Asbestos Check</h2>
                    <p className="text-xs text-slate-500">NSW Schedule 2 Health Questions</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">a) Are there any signs of mould and dampness?</p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => handleStatutoryChange('healthIssues', { mouldOrDampness: true })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded',
                          statutoryData.healthIssues.mouldOrDampness ? 'bg-rose-600 text-white' : 'text-slate-600'
                        )}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleStatutoryChange('healthIssues', { mouldOrDampness: false })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded',
                          !statutoryData.healthIssues.mouldOrDampness ? 'bg-teal-600 text-white' : 'text-slate-600'
                        )}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">b) Are there any pests and vermin?</p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => handleStatutoryChange('healthIssues', { pestsOrVermin: true })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded',
                          statutoryData.healthIssues.pestsOrVermin ? 'bg-rose-600 text-white' : 'text-slate-600'
                        )}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleStatutoryChange('healthIssues', { pestsOrVermin: false })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded',
                          !statutoryData.healthIssues.pestsOrVermin ? 'bg-teal-600 text-white' : 'text-slate-600'
                        )}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">c) Has any rubbish been left on the premises?</p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => handleStatutoryChange('healthIssues', { rubbishOnPremises: true })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded',
                          statutoryData.healthIssues.rubbishOnPremises ? 'bg-rose-600 text-white' : 'text-slate-600'
                        )}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleStatutoryChange('healthIssues', { rubbishOnPremises: false })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded',
                          !statutoryData.healthIssues.rubbishOnPremises ? 'bg-teal-600 text-white' : 'text-slate-600'
                        )}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        d) Are premises on the Loose-Fill Asbestos Insulation Register?
                      </p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => handleStatutoryChange('healthIssues', { looseFillAsbestosRegister: true })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded',
                          statutoryData.healthIssues.looseFillAsbestosRegister ? 'bg-rose-600 text-white' : 'text-slate-600'
                        )}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleStatutoryChange('healthIssues', { looseFillAsbestosRegister: false })}
                        className={cn(
                          'px-3 py-1 text-xs font-bold rounded',
                          !statutoryData.healthIssues.looseFillAsbestosRegister ? 'bg-teal-600 text-white' : 'text-slate-600'
                        )}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="text-xs font-semibold text-slate-700">Health Issues Notes:</label>
                    <textarea
                      rows={3}
                      value={statutoryData.healthIssues.notes || ''}
                      onChange={(e) => handleStatutoryChange('healthIssues', { notes: e.target.value })}
                      placeholder="Add any specific observations or treatment notes..."
                      className="w-full mt-1 p-2.5 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SMOKE ALARMS */}
          {activeTab === 'smoke_alarms' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Smoke Alarms Statutory Compliance</h2>
                    <p className="text-xs text-slate-500">Environmental Planning and Assessment Act 1979</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        1. Installed in accordance with Environmental Planning and Assessment Act 1979?
                      </p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => handleStatutoryChange('smokeAlarms', { installedCompliantEPA1979: true })}
                        className={cn('px-3 py-1 text-xs font-bold rounded', statutoryData.smokeAlarms.installedCompliantEPA1979 ? 'bg-teal-600 text-white' : 'text-slate-600')}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleStatutoryChange('smokeAlarms', { installedCompliantEPA1979: false })}
                        className={cn('px-3 py-1 text-xs font-bold rounded', !statutoryData.smokeAlarms.installedCompliantEPA1979 ? 'bg-rose-600 text-white' : 'text-slate-600')}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-800">2. Checked and found in working order?</p>
                      <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                        <button
                          onClick={() => handleStatutoryChange('smokeAlarms', { checkedAndWorking: true })}
                          className={cn('px-3 py-1 text-xs font-bold rounded', statutoryData.smokeAlarms.checkedAndWorking ? 'bg-teal-600 text-white' : 'text-slate-600')}
                        >
                          YES
                        </button>
                        <button
                          onClick={() => handleStatutoryChange('smokeAlarms', { checkedAndWorking: false })}
                          className={cn('px-3 py-1 text-xs font-bold rounded', !statutoryData.smokeAlarms.checkedAndWorking ? 'bg-rose-600 text-white' : 'text-slate-600')}
                        >
                          NO
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <label className="text-xs text-slate-500">Date last checked:</label>
                      <input
                        type="date"
                        value={statutoryData.smokeAlarms.dateLastChecked || ''}
                        onChange={(e) => handleStatutoryChange('smokeAlarms', { dateLastChecked: e.target.value })}
                        className="px-2.5 py-1 text-xs rounded-md bg-slate-50 border border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-800">
                        3. Removable batteries replaced within last 12 months?
                      </p>
                      <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                        <button
                          onClick={() => handleStatutoryChange('smokeAlarms', { removableBatteriesReplaced12Months: true })}
                          className={cn('px-2.5 py-1 text-xs font-bold rounded', statutoryData.smokeAlarms.removableBatteriesReplaced12Months === true ? 'bg-teal-600 text-white' : 'text-slate-600')}
                        >
                          YES
                        </button>
                        <button
                          onClick={() => handleStatutoryChange('smokeAlarms', { removableBatteriesReplaced12Months: false })}
                          className={cn('px-2.5 py-1 text-xs font-bold rounded', statutoryData.smokeAlarms.removableBatteriesReplaced12Months === false ? 'bg-rose-600 text-white' : 'text-slate-600')}
                        >
                          NO
                        </button>
                        <button
                          onClick={() => handleStatutoryChange('smokeAlarms', { removableBatteriesReplaced12Months: 'N/A' })}
                          className={cn('px-2.5 py-1 text-xs font-bold rounded', statutoryData.smokeAlarms.removableBatteriesReplaced12Months === 'N/A' ? 'bg-slate-700 text-white' : 'text-slate-600')}
                        >
                          N/A
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <label className="text-xs text-slate-500">Date batteries last changed:</label>
                      <input
                        type="date"
                        value={statutoryData.smokeAlarms.dateRemovableBatteriesChanged || ''}
                        onChange={(e) => handleStatutoryChange('smokeAlarms', { dateRemovableBatteriesChanged: e.target.value })}
                        className="px-2.5 py-1 text-xs rounded-md bg-slate-50 border border-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SAFETY ISSUES */}
          {activeTab === 'safety_issues' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Other Safety Issues</h2>
                    <p className="text-xs text-slate-500">NSW Schedule 2 Safety Questions</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">1. Visible signs of damaged appliances?</p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => handleStatutoryChange('safetyIssues', { damagedAppliances: true })}
                        className={cn('px-3 py-1 text-xs font-bold rounded', statutoryData.safetyIssues.damagedAppliances ? 'bg-rose-600 text-white' : 'text-slate-600')}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleStatutoryChange('safetyIssues', { damagedAppliances: false })}
                        className={cn('px-3 py-1 text-xs font-bold rounded', !statutoryData.safetyIssues.damagedAppliances ? 'bg-teal-600 text-white' : 'text-slate-600')}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        2. Visible hazards relating to electricity (loose/damaged sockets, sparking)?
                      </p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => handleStatutoryChange('safetyIssues', { electricalHazards: true })}
                        className={cn('px-3 py-1 text-xs font-bold rounded', statutoryData.safetyIssues.electricalHazards ? 'bg-rose-600 text-white' : 'text-slate-600')}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleStatutoryChange('safetyIssues', { electricalHazards: false })}
                        className={cn('px-3 py-1 text-xs font-bold rounded', !statutoryData.safetyIssues.electricalHazards ? 'bg-teal-600 text-white' : 'text-slate-600')}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        3. Visible hazards relating to gas (loose gas socket, open-ended pipe)?
                      </p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => handleStatutoryChange('safetyIssues', { gasHazards: true })}
                        className={cn('px-3 py-1 text-xs font-bold rounded', statutoryData.safetyIssues.gasHazards ? 'bg-rose-600 text-white' : 'text-slate-600')}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleStatutoryChange('safetyIssues', { gasHazards: false })}
                        className={cn('px-3 py-1 text-xs font-bold rounded', !statutoryData.safetyIssues.gasHazards ? 'bg-teal-600 text-white' : 'text-slate-600')}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Does tenant agree with safety findings?</p>
                    </div>
                    <div className="flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        onClick={() => handleStatutoryChange('safetyIssues', { tenantAgrees: true })}
                        className={cn('px-3 py-1 text-xs font-bold rounded', statutoryData.safetyIssues.tenantAgrees ? 'bg-teal-600 text-white' : 'text-slate-600')}
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleStatutoryChange('safetyIssues', { tenantAgrees: false })}
                        className={cn('px-3 py-1 text-xs font-bold rounded', !statutoryData.safetyIssues.tenantAgrees ? 'bg-rose-600 text-white' : 'text-slate-600')}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: WATER & COMMUNICATIONS */}
          {activeTab === 'water_comms' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Water Efficiency & Meter Readings</h2>
                    <p className="text-xs text-slate-500">NSW Water Usage Charging Standards</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-800">Separately metered?</span>
                      <input
                        type="checkbox"
                        checked={statutoryData.waterEfficiency.separatelyMetered ?? true}
                        onChange={(e) => handleStatutoryChange('waterEfficiency', { separatelyMetered: e.target.checked })}
                        className="w-4 h-4 text-teal-600 rounded"
                      />
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-800">Showerheads max 9 L/min?</span>
                      <input
                        type="checkbox"
                        checked={statutoryData.waterEfficiency.showerheadsMax9Lpm ?? true}
                        onChange={(e) => handleStatutoryChange('waterEfficiency', { showerheadsMax9Lpm: e.target.checked })}
                        className="w-4 h-4 text-teal-600 rounded"
                      />
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-800">Toilets dual-flush min 3-star WELS?</span>
                      <input
                        type="checkbox"
                        checked={statutoryData.waterEfficiency.toiletsDualFlush3StarWELS === true}
                        onChange={(e) => handleStatutoryChange('waterEfficiency', { toiletsDualFlush3StarWELS: e.target.checked })}
                        className="w-4 h-4 text-teal-600 rounded"
                      />
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-800">Internal taps max 9 L/min?</span>
                      <input
                        type="checkbox"
                        checked={statutoryData.waterEfficiency.internalTapsMax9Lpm ?? true}
                        onChange={(e) => handleStatutoryChange('waterEfficiency', { internalTapsMax9Lpm: e.target.checked })}
                        className="w-4 h-4 text-teal-600 rounded"
                      />
                    </div>
                  </div>

                  {/* Water Meter Readings */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                      Water Meter Readings
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-bold text-teal-800">START of Tenancy Reading</span>
                        <div className="grid grid-cols-2 gap-2 mt-1.5">
                          <input
                            type="text"
                            placeholder="Reading (kL / L)"
                            value={statutoryData.waterEfficiency.waterMeterStartReading || ''}
                            onChange={(e) => handleStatutoryChange('waterEfficiency', { waterMeterStartReading: e.target.value })}
                            className="px-2.5 py-1.5 text-xs rounded-md bg-white border border-slate-200"
                          />
                          <input
                            type="date"
                            value={statutoryData.waterEfficiency.waterMeterStartDate || ''}
                            onChange={(e) => handleStatutoryChange('waterEfficiency', { waterMeterStartDate: e.target.value })}
                            className="px-2.5 py-1.5 text-xs rounded-md bg-white border border-slate-200"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-teal-800">END of Tenancy Reading</span>
                        <div className="grid grid-cols-2 gap-2 mt-1.5">
                          <input
                            type="text"
                            placeholder="Reading (kL / L)"
                            value={statutoryData.waterEfficiency.waterMeterEndReading || ''}
                            onChange={(e) => handleStatutoryChange('waterEfficiency', { waterMeterEndReading: e.target.value })}
                            className="px-2.5 py-1.5 text-xs rounded-md bg-white border border-slate-200"
                          />
                          <input
                            type="date"
                            value={statutoryData.waterEfficiency.waterMeterEndDate || ''}
                            onChange={(e) => handleStatutoryChange('waterEfficiency', { waterMeterEndDate: e.target.value })}
                            className="px-2.5 py-1.5 text-xs rounded-md bg-white border border-slate-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Communication Facilities */}
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Communication Facilities
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-800">Telephone line connected</span>
                        <input
                          type="checkbox"
                          checked={statutoryData.communicationFacilities.telephoneLineConnected ?? true}
                          onChange={(e) => handleStatutoryChange('communicationFacilities', { telephoneLineConnected: e.target.checked })}
                          className="w-4 h-4 text-teal-600 rounded"
                        />
                      </div>

                      <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-800">Internet line connected</span>
                        <input
                          type="checkbox"
                          checked={statutoryData.communicationFacilities.internetLineConnected ?? true}
                          onChange={(e) => handleStatutoryChange('communicationFacilities', { internetLineConnected: e.target.checked })}
                          className="w-4 h-4 text-teal-600 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: ADDITIONAL INFO & WORK DATES */}
          {activeTab === 'additional_info' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Work Dates & Additional Information</h2>
                    <p className="text-xs text-slate-500">NSW Schedule 2 History & Additional Comments</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Smoke alarms maintenance date:</label>
                      <input
                        type="date"
                        value={statutoryData.workDoneDates.smokeAlarmsWorkDate || ''}
                        onChange={(e) => handleStatutoryChange('workDoneDates', { smokeAlarmsWorkDate: e.target.value })}
                        className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700">Flooring laid / replaced / cleaned date:</label>
                      <input
                        type="date"
                        value={statutoryData.workDoneDates.flooringDate || ''}
                        onChange={(e) => handleStatutoryChange('workDoneDates', { flooringDate: e.target.value })}
                        className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700">Painting external date:</label>
                      <input
                        type="date"
                        value={statutoryData.workDoneDates.externalPaintingDate || ''}
                        onChange={(e) => handleStatutoryChange('workDoneDates', { externalPaintingDate: e.target.value })}
                        className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700">Painting internal date:</label>
                      <input
                        type="date"
                        value={statutoryData.workDoneDates.internalPaintingDate || ''}
                        onChange={(e) => handleStatutoryChange('workDoneDates', { internalPaintingDate: e.target.value })}
                        className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200"
                      />
                    </div>
                  </div>

                  {/* Furniture */}
                  <div className="pt-2">
                    <div className="p-3.5 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800">Furniture included in tenancy?</span>
                        <input
                          type="checkbox"
                          checked={statutoryData.furniture.furnitureIncluded ?? false}
                          onChange={(e) => handleStatutoryChange('furniture', { furnitureIncluded: e.target.checked })}
                          className="w-4 h-4 text-teal-600 rounded"
                        />
                      </div>
                      {statutoryData.furniture.furnitureIncluded && (
                        <textarea
                          rows={2}
                          placeholder="List included furniture or reference attached schedule..."
                          value={statutoryData.furniture.attachedListNotes || ''}
                          onChange={(e) => handleStatutoryChange('furniture', { attachedListNotes: e.target.value })}
                          className="w-full mt-1 p-2 text-xs rounded-lg bg-slate-50 border border-slate-200"
                        />
                      )}
                    </div>
                  </div>

                  {/* Additional Comments */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      Additional Comments / Information:
                    </label>
                    <textarea
                      rows={4}
                      value={statutoryData.workDoneDates.additionalComments || ''}
                      onChange={(e) => handleStatutoryChange('workDoneDates', { additionalComments: e.target.value })}
                      placeholder="Add any additional statutory comments from landlord or tenant..."
                      className="w-full mt-1 p-2.5 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: WORK COMMITMENTS */}
          {activeTab === 'work_commitments' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Landlord Work Commitments</h2>
                    <p className="text-xs text-slate-500">Agreements for cleaning, repairs or additions during tenancy</p>
                  </div>
                </div>

                {/* Add new commitment */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-5">
                  <h4 className="text-xs font-bold text-slate-900 mb-3">+ Add Work Commitment</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="e.g. Repair leaking laundry tap, steam clean bedroom carpet"
                        value={newCommitmentText}
                        onChange={(e) => setNewCommitmentText(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <input
                        type="date"
                        value={newCommitmentDueDate}
                        onChange={(e) => setNewCommitmentDueDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddWorkCommitment}
                    disabled={!newCommitmentText.trim()}
                    className="mt-3 px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                  >
                    Add Commitment
                  </button>
                </div>

                {/* Commitments List */}
                <div className="space-y-2">
                  {statutoryData.workCommitments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      No landlord work commitments recorded.
                    </p>
                  ) : (
                    statutoryData.workCommitments.map((w) => (
                      <div
                        key={w.id}
                        className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 bg-white hover:border-slate-300 transition-all"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{w.description}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span>Responsible: {w.responsible || 'Landlord / Agent'}</span>
                            {w.completionDueDate && <span>• Due: {w.completionDueDate}</span>}
                            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold uppercase text-[9px]">
                              {w.status || 'Open'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteWorkCommitment(w.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: EVIDENCE & PHOTO GALLERY */}
          {activeTab === 'evidence' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Evidence Gallery ({photos.length} photos)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Photographs and video recordings attached as supporting evidence
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActivePhotoItemTarget(null);
                        cameraInputRef.current?.click();
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#32D5C4]" />
                      <span>Take Photo</span>
                    </button>
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-teal-200"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Files</span>
                    </button>
                  </div>
                </div>

                {photos.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                    <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">No inspection photos captured yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {photos.map((p, idx) => {
                      const room = rooms.find((r) => r.id === p.room_id);
                      return (
                        <div
                          key={p.id}
                          className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 aspect-square"
                        >
                          <img
                            src={p.photo_url}
                            alt="Inspection proof"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                            <button
                              onClick={() => handleDeletePhoto(p.id)}
                              className="self-end p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <span className="text-[10px] text-white font-medium truncate">
                              {room?.name || `Photo #${idx + 1}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 11: START VS END COMPARISON */}
          {activeTab === 'comparison' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Start of Tenancy vs End of Tenancy Comparison
                    </h2>
                    <p className="text-xs text-slate-500">
                      Automatic change detection and baseline condition diff
                    </p>
                  </div>
                </div>

                {comparisonSummary && (
                  <>
                    {/* Summary Matrix Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[11px] text-slate-400">Total Items Compared</span>
                        <p className="text-lg font-bold text-slate-800">{comparisonSummary.totalItemsCompared}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[11px] text-slate-400">Changes Detected</span>
                        <p className="text-lg font-bold text-slate-800">{comparisonSummary.changedItemsCount}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
                        <span className="text-[11px] text-rose-600 font-semibold">Degraded / Damaged</span>
                        <p className="text-lg font-bold text-rose-700">{comparisonSummary.degradedItemsCount}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                        <span className="text-[11px] text-emerald-600 font-semibold">Improved / Cleaned</span>
                        <p className="text-lg font-bold text-emerald-700">{comparisonSummary.improvedItemsCount}</p>
                      </div>
                    </div>

                    {/* Room Comparison Matrix */}
                    <div className="space-y-4">
                      {comparisonSummary.roomComparisons.map((rc) => (
                        <div key={rc.roomId} className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{rc.roomName}</span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {rc.itemsCompared.length} items
                            </span>
                          </div>

                          <div className="divide-y divide-slate-100">
                            {rc.itemsCompared.map((itemDiff, iIdx) => (
                              <div
                                key={iIdx}
                                className={cn(
                                  'p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs',
                                  itemDiff.severity === 'degraded'
                                    ? 'bg-rose-50/30'
                                    : itemDiff.severity === 'improved'
                                    ? 'bg-emerald-50/30'
                                    : 'bg-white'
                                )}
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800">{itemDiff.itemName}</span>
                                    {itemDiff.changed ? (
                                      itemDiff.severity === 'degraded' ? (
                                        <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                                          Damage / Change Detected
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                                          Improved
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-slate-400 text-[10px]">Unchanged</span>
                                    )}
                                  </div>
                                  {itemDiff.comments && (
                                    <p className="text-[11px] text-slate-500 mt-0.5 italic">
                                      "{itemDiff.comments}"
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-4 text-slate-600 shrink-0">
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-400 block">START</span>
                                    <span className="font-semibold text-slate-700">
                                      {itemDiff.previousRating || 'Good (Clean)'}
                                    </span>
                                  </div>
                                  <span className="text-slate-300">→</span>
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">END</span>
                                    <span
                                      className={cn(
                                        'font-bold',
                                        itemDiff.severity === 'degraded' ? 'text-rose-600' : 'text-slate-800'
                                      )}
                                    >
                                      {itemDiff.currentRating || 'Good'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 12: SIGNATURES & FINAL REVIEW */}
          {activeTab === 'signatures' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Signatures & Finalization</h2>
                    <p className="text-xs text-slate-500">NSW Schedule 2 Condition Report Signatures</p>
                  </div>
                </div>

                {/* Final Review Checklist */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 mb-2">Final Inspection Checklist</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Property details verified</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{completedRooms}/{totalRooms} areas completed</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Minimum standards & safety recorded</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{photos.length} photos attached</span>
                    </div>
                  </div>
                </div>

                {/* START OF TENANCY SIGNATURES */}
                <div className="space-y-6 pt-2">
                  <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                    Condition Report at START of Tenancy
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                        Landlord / Agent Signature
                      </label>
                      <SignaturePad
                        initialSignature={statutoryData.signatures.startTenancyLandlordSig || report.signature_manager}
                        onSign={(sig) => handleStatutoryChange('signatures', { startTenancyLandlordSig: sig })}
                        label="Landlord/Agent Signature"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <label className="text-xs text-slate-500">Date:</label>
                        <input
                          type="date"
                          value={statutoryData.signatures.startTenancyLandlordDate || ''}
                          onChange={(e) => handleStatutoryChange('signatures', { startTenancyLandlordDate: e.target.value })}
                          className="px-2.5 py-1 text-xs rounded-md bg-slate-50 border border-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                        Tenant Signature
                      </label>
                      <SignaturePad
                        initialSignature={statutoryData.signatures.startTenancyTenantSig || report.signature_tenant}
                        onSign={(sig) => handleStatutoryChange('signatures', { startTenancyTenantSig: sig })}
                        label="Tenant Signature"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <label className="text-xs text-slate-500">Date:</label>
                        <input
                          type="date"
                          value={statutoryData.signatures.startTenancyTenantDate || ''}
                          onChange={(e) => handleStatutoryChange('signatures', { startTenancyTenantDate: e.target.value })}
                          className="px-2.5 py-1 text-xs rounded-md bg-slate-50 border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* END OF TENANCY SIGNATURES (if Outgoing) */}
                {report.type === 'Move Out' && (
                  <div className="space-y-6 pt-6 border-t border-slate-100 mt-6">
                    <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                      Condition Report at END of Tenancy
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                          End of Tenancy Landlord / Agent Signature
                        </label>
                        <SignaturePad
                          initialSignature={statutoryData.signatures.endTenancyLandlordSig}
                          onSign={(sig) => handleStatutoryChange('signatures', { endTenancyLandlordSig: sig })}
                          label="Landlord/Agent Signature (Exit)"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <label className="text-xs text-slate-500">Date:</label>
                          <input
                            type="date"
                            value={statutoryData.signatures.endTenancyLandlordDate || ''}
                            onChange={(e) => handleStatutoryChange('signatures', { endTenancyLandlordDate: e.target.value })}
                            className="px-2.5 py-1 text-xs rounded-md bg-slate-50 border border-slate-200"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                          End of Tenancy Tenant Signature
                        </label>
                        <SignaturePad
                          initialSignature={statutoryData.signatures.endTenancyTenantSig}
                          onSign={(sig) => handleStatutoryChange('signatures', { endTenancyTenantSig: sig })}
                          label="Tenant Signature (Exit)"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <label className="text-xs text-slate-500">Date:</label>
                          <input
                            type="date"
                            value={statutoryData.signatures.endTenancyTenantDate || ''}
                            onChange={(e) => handleStatutoryChange('signatures', { endTenancyTenantDate: e.target.value })}
                            className="px-2.5 py-1 text-xs rounded-md bg-slate-50 border border-slate-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Finalize Action */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
                  <p className="text-xs text-slate-400">
                    Finalizing locks the report and generates the reference-compliant PDF document.
                  </p>

                  <button
                    onClick={handleFinalize}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm shadow-teal-950/20 flex items-center gap-2 disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileCheck2 className="w-4 h-4" />
                    )}
                    <span>Finalize Condition Report</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 12: LIVE REPORT TEMPLATE & DOCUMENT PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              {/* Preview Controls Bar */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wider">
                      Live Template View
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-semibold text-slate-700">NSW Schedule 2 Standard</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                    Inspection Condition Report Document
                  </h2>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Section Filter Pills */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                    {(
                      [
                        { key: 'all', label: 'All Document' },
                        { key: 'summary', label: 'Summary' },
                        { key: 'rooms', label: 'Rooms' },
                        { key: 'statutory', label: 'Statutory' },
                        { key: 'evidence', label: 'Photos' },
                        { key: 'signatures', label: 'Signatures' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setPreviewSection(f.key)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg font-semibold transition-all text-xs',
                          previewSection === f.key
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Direct PDF Download */}
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-[#008F83] hover:bg-[#00A99D] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* MODERN DOCUMENT CANVAS */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden transition-all">
                {/* 1. DOCUMENT TOP BRAND HEADER */}
                <div className="bg-[#061222] text-white p-6 sm:p-8 relative">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-[#32D5C4]">
                          PROPERTYLEDGE
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-xs text-slate-400">RESIDENTIAL TENANCIES REGULATION 2019</span>
                      </div>
                      <h1 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
                        {report.type === 'Move Out'
                          ? 'OUTGOING CONDITION REPORT'
                          : report.type === 'Move In'
                          ? 'INGOING BASELINE CONDITION REPORT'
                          : `${(report.type || 'ROUTINE').toUpperCase()} CONDITION REPORT`}
                      </h1>
                      <p className="text-xs text-slate-300 mt-1">
                        {report.properties?.address_line_1}, {report.properties?.city} {report.properties?.state} {report.properties?.postal_code}
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1.5">
                      <div className="px-3 py-1 rounded-full bg-teal-500/20 text-[#32D5C4] border border-teal-500/30 text-xs font-bold uppercase tracking-wider">
                        SCHEDULE 2 COMPLIANT
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Date: {report.inspection_date}
                      </span>
                    </div>
                  </div>

                  {/* Bottom emerald accent bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#008F83] to-[#32D5C4]" />
                </div>

                <div className="p-6 sm:p-8 space-y-8">
                  {/* 2. EXECUTIVE METADATA & HEALTH SUMMARY (Visible in 'all' or 'summary') */}
                  {(previewSection === 'all' || previewSection === 'summary') && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">
                            Premises & Tenancy
                          </span>
                          <div className="mt-2 space-y-1 text-xs">
                            <p className="font-bold text-slate-900 text-sm">
                              {report.properties?.name || report.properties?.address_line_1}
                            </p>
                            <p className="text-slate-600">
                              {report.properties?.address_line_1}, {report.properties?.city} {report.properties?.state}
                            </p>
                            <div className="pt-2 flex items-center justify-between text-[11px] border-t border-slate-200/60 mt-2">
                              <span className="text-slate-500">Tenants:</span>
                              <span className="font-semibold text-slate-800">Nazhin Safavi Moghadam & Yashar Shoraka</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">Lease Term:</span>
                              <span className="font-semibold text-slate-800">
                                {report.leases?.start_date || 'Current'} — {report.leases?.end_date || 'Ongoing'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                            Inspector & Agency
                          </span>
                          <div className="mt-2 space-y-1 text-xs">
                            <p className="font-bold text-slate-900 text-sm">
                              {report.properties?.name || 'PropertyLedge Real Estate'}
                            </p>
                            <p className="text-slate-600">
                              Licensed Property Management Office
                            </p>
                            <div className="pt-2 flex items-center justify-between text-[11px] border-t border-slate-200/60 mt-2">
                              <span className="text-slate-500">Inspector:</span>
                              <span className="font-semibold text-slate-800">{report.inspector_name || 'Assigned Inspector'}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">Inspection Date:</span>
                              <span className="font-semibold text-slate-800">{report.inspection_date}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4 Health Summary Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100 flex flex-col justify-between">
                          <span className="text-xs text-teal-700 font-medium">Areas Evaluated</span>
                          <span className="text-2xl font-black text-teal-900 mt-1">{totalRooms}</span>
                          <span className="text-[10px] text-teal-600 mt-1">{completedRooms} completed</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col justify-between">
                          <span className="text-xs text-emerald-700 font-medium">Clean & Undamaged</span>
                          <span className="text-2xl font-black text-emerald-900 mt-1">
                            {items.length > 0
                              ? Math.round(
                                  (items.filter((i) => i.rating === 'Good' || i.rating === 'Excellent').length /
                                    items.length) *
                                    100
                                )
                              : 100}
                            %
                          </span>
                          <span className="text-[10px] text-emerald-600 mt-1">Standard state</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 flex flex-col justify-between">
                          <span className="text-xs text-rose-700 font-medium">Attention Items</span>
                          <span className="text-2xl font-black text-rose-900 mt-1">{totalIssuesCount}</span>
                          <span className="text-[10px] text-rose-600 mt-1">Defects & notes</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 flex flex-col justify-between">
                          <span className="text-xs text-sky-700 font-medium">Photo Evidence</span>
                          <span className="text-2xl font-black text-sky-900 mt-1">{photos.length}</span>
                          <span className="text-[10px] text-sky-600 mt-1">Attached records</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. ROOM-BY-ROOM CONDITION CHECKLIST TABLES (Visible in 'all' or 'rooms') */}
                  {(previewSection === 'all' || previewSection === 'rooms') && (
                    <div className="space-y-8">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-teal-600" />
                          <span>Room & Area Condition Schedules</span>
                        </h3>
                        <span className="text-xs text-slate-500 font-medium">{rooms.length} Areas</span>
                      </div>

                      {rooms.map((rm) => {
                        const roomItems = items.filter((i) => i.room_id === rm.id);
                        const roomPhotos = photos.filter((p) => p.room_id === rm.id);
                        const roomDefects = defects.filter((d) => d.room_id === rm.id);

                        return (
                          <div key={rm.id} className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                            {/* Room Header */}
                            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span className="font-bold text-sm tracking-tight">{rm.name}</span>
                                <span className="text-xs text-slate-400">• {roomItems.length} items</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                {roomPhotos.length > 0 && (
                                  <span className="flex items-center gap-1 text-slate-300">
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    {roomPhotos.length} photos
                                  </span>
                                )}
                                {rm.status === 'Completed' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                                    Verified
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                    In Progress
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Clean Modern Table */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                                    <th className="py-2.5 px-4 w-[28%]">Item / Fixture</th>
                                    <th className="py-2.5 px-2 text-center w-[12%]">Clean</th>
                                    <th className="py-2.5 px-2 text-center w-[14%]">Undamaged</th>
                                    <th className="py-2.5 px-2 text-center w-[12%]">Working</th>
                                    <th className="py-2.5 px-4 w-[34%]">Inspector Comments & Evidence</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-800">
                                  {roomItems.map((it) => {
                                    const details = statutoryData.itemDetailsMap?.[it.id];
                                    const isClean = details?.clean ?? (it.rating !== 'Damaged' && it.rating !== 'Needs Repair');
                                    const isUndamaged = details?.undamaged ?? (it.rating !== 'Damaged');
                                    const isWorking = details?.working ?? (it.rating !== 'Needs Repair');

                                    const matchingDefect = roomDefects.find(
                                      (d) =>
                                        d.item_name?.toLowerCase().includes(it.name.toLowerCase()) ||
                                        it.name.toLowerCase().includes(d.item_name?.toLowerCase() || '')
                                    );

                                    const linkedPhotos = roomPhotos.filter(
                                      (p) =>
                                        p.item_id === it.id ||
                                        (matchingDefect && p.defect_id === matchingDefect.id)
                                    );

                                    return (
                                      <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-2.5 px-4 font-medium text-slate-900">
                                          {it.name}
                                        </td>
                                        <td className="py-2.5 px-2 text-center">
                                          <span
                                            className={cn(
                                              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
                                              isClean
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                            )}
                                          >
                                            {isClean ? '✓ YES' : '✕ NO'}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-2 text-center">
                                          <span
                                            className={cn(
                                              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
                                              isUndamaged
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                            )}
                                          >
                                            {isUndamaged ? '✓ YES' : '✕ NO'}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-2 text-center">
                                          <span
                                            className={cn(
                                              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
                                              isWorking
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                            )}
                                          >
                                            {isWorking ? '✓ YES' : '✕ NO'}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-4">
                                          <div className="space-y-1">
                                            {details?.landlordComments ? (
                                              <p className="text-slate-700 font-normal">
                                                <span className="font-bold text-teal-700">[Agent]:</span>{' '}
                                                {details.landlordComments}
                                              </p>
                                            ) : matchingDefect ? (
                                              <p className="text-amber-700 font-semibold flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3 text-amber-500 inline" />
                                                {matchingDefect.notes}
                                              </p>
                                            ) : (
                                              <span className="text-slate-400 italic">No defects recorded</span>
                                            )}

                                            {details?.tenantComments && (
                                              <p className="text-slate-600 text-[11px]">
                                                <span className="font-bold text-slate-700">[Tenant]:</span>{' '}
                                                {details.tenantComments}
                                              </p>
                                            )}

                                            {linkedPhotos.length > 0 && (
                                              <div className="flex items-center gap-1.5 pt-1">
                                                {linkedPhotos.map((lp, lIdx) => (
                                                  <span
                                                    key={lp.id}
                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-200"
                                                  >
                                                    <Camera className="w-2.5 h-2.5" />
                                                    Photo #{lIdx + 1}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 4. STATUTORY SCHEDULE 2 COMPLIANCE (Visible in 'all' or 'statutory') */}
                  {(previewSection === 'all' || previewSection === 'statutory') && (
                    <div className="space-y-6 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-teal-600" />
                          <span>Statutory Compliance & Standards</span>
                        </h3>
                        <span className="text-xs text-teal-700 font-bold bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                          NSW Standard 2019
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Minimum Standards */}
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                            Minimum Standards (Fit For Habitation)
                          </h4>
                          <div className="space-y-2 text-xs divide-y divide-slate-200/60">
                            {[
                              { q: 'Premises structurally sound (roof, floors, walls)?', val: statutoryData.minimumStandards.structurallySound },
                              { q: 'Adequate lighting in each room?', val: statutoryData.minimumStandards.adequateLighting },
                              { q: 'Adequate ventilation throughout property?', val: statutoryData.minimumStandards.adequateVentilation },
                              { q: 'Adequate electricity & gas sockets for heating?', val: statutoryData.minimumStandards.adequateElectricityGasOutlets },
                              { q: 'Adequate plumbing and drainage facilities?', val: statutoryData.minimumStandards.adequatePlumbingDrainage },
                              { q: 'Bathroom facilities allowing user privacy?', val: statutoryData.minimumStandards.bathroomFacilitiesPrivacy },
                            ].map((ms, idx) => (
                              <div key={idx} className="flex items-center justify-between pt-2">
                                <span className="text-slate-700 font-medium">{ms.q}</span>
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ml-2',
                                    ms.val ?? true
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  )}
                                >
                                  {ms.val ?? true ? '✓ COMPLIANT' : '✕ ATTENTION'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Smoke Alarms & Safety */}
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                            Smoke Alarms (EPA 1979 / RTA s64A)
                          </h4>
                          <div className="space-y-2 text-xs divide-y divide-slate-200/60">
                            {[
                              { q: 'Smoke alarms installed compliant with EPA Act 1979?', val: statutoryData.smokeAlarms.installedCompliantEPA1979 },
                              { q: 'All smoke alarms checked and working?', val: statutoryData.smokeAlarms.checkedAndWorking },
                              { q: 'Removable batteries replaced within 12 months?', val: statutoryData.smokeAlarms.removableBatteriesReplaced12Months === true },
                              { q: 'Free of mould and dampness signs?', val: !statutoryData.healthIssues.mouldOrDampness },
                              { q: 'Free of pests and vermin infestation?', val: !statutoryData.healthIssues.pestsOrVermin },
                            ].map((sa, idx) => (
                              <div key={idx} className="flex items-center justify-between pt-2">
                                <span className="text-slate-700 font-medium">{sa.q}</span>
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ml-2',
                                    sa.val ?? true
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  )}
                                >
                                  {sa.val ?? true ? '✓ COMPLIANT' : '✕ ATTENTION'}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Water Meter Reading Bar */}
                          <div className="mt-4 p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">
                                Water Meter Reading
                              </span>
                              <p className="text-xs text-slate-500">Separately metered efficiency certified</p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-slate-900">
                                {statutoryData.waterEfficiency.waterMeterStartReading || '004523.8'} kL
                              </span>
                              <p className="text-[10px] text-slate-400">Start of Tenancy</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. PHOTO EVIDENCE GALLERY (Visible in 'all' or 'evidence') */}
                  {(previewSection === 'all' || previewSection === 'evidence') && (
                    <div className="space-y-6 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-teal-600" />
                          <span>Photographic Evidence Records</span>
                        </h3>
                        <span className="text-xs text-slate-500 font-medium">{photos.length} Verified Photos</span>
                      </div>

                      {photos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {photos.map((ph, idx) => {
                            const roomName = rooms.find((r) => r.id === ph.room_id)?.name || 'Property General';
                            const defect = defects.find((d) => d.id === ph.defect_id);
                            const item = items.find((i) => i.id === ph.item_id);

                            return (
                              <div
                                key={ph.id}
                                className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col shadow-xs"
                              >
                                <div className="bg-[#061222] text-white px-3 py-1.5 flex items-center justify-between text-xs">
                                  <span className="font-bold">Photo #{idx + 1}</span>
                                  <span className="text-slate-300 text-[10px]">{roomName}</span>
                                </div>
                                <div className="h-44 w-full relative bg-slate-200 overflow-hidden">
                                  <img
                                    src={ph.photo_url}
                                    alt={`Inspection Photo ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="p-3 text-xs flex-1 flex flex-col justify-between">
                                  <p className="font-semibold text-slate-900">
                                    {defect?.item_name || item?.name || defect?.notes || 'Condition Record'}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    {ph.created_at
                                      ? new Date(ph.created_at).toLocaleString('en-AU', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : 'Timestamp verified'}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-xs text-slate-500">
                          No photographic evidence items captured for this report.
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6. SIGNATURES & FINAL CERTIFICATE (Visible in 'all' or 'signatures') */}
                  {(previewSection === 'all' || previewSection === 'signatures') && (
                    <div className="space-y-6 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <PenTool className="w-4 h-4 text-teal-600" />
                          <span>Digital Signatures & Endorsement Certificate</span>
                        </h3>
                        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          Legally Binding
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Landlord/Agent Signature Card */}
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                            Managing Agent / Landlord
                          </span>
                          <p className="text-xs text-slate-600">
                            I certify that I have visually inspected the residential premises and this report accurately details its condition.
                          </p>

                          <div className="h-28 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-3">
                            {statutoryData.signatures.startTenancyLandlordSig ? (
                              <img
                                src={statutoryData.signatures.startTenancyLandlordSig}
                                alt="Landlord Signature"
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-xs text-slate-400 italic">Signature on file</span>
                            )}
                          </div>

                          <div className="text-[11px] space-y-0.5 text-slate-600">
                            <p><span className="font-semibold text-slate-800">Signatory:</span> {report.inspector_name || 'Authorized Property Manager'}</p>
                            <p><span className="font-semibold text-slate-800">Agency:</span> {report.properties?.name || 'PropertyLedge Real Estate'}</p>
                            <p><span className="font-semibold text-slate-800">Date:</span> {report.inspection_date}</p>
                          </div>
                        </div>

                        {/* Tenant Signature Card */}
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                            Tenant Acknowledgment
                          </span>
                          <p className="text-xs text-slate-600">
                            I/We have inspected the property and agree with this condition report or have recorded notes where applicable.
                          </p>

                          <div className="h-28 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-3">
                            {statutoryData.signatures.startTenancyTenantSig ? (
                              <img
                                src={statutoryData.signatures.startTenancyTenantSig}
                                alt="Tenant Signature"
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-xs text-slate-400 italic">Signature on file</span>
                            )}
                          </div>

                          <div className="text-[11px] space-y-0.5 text-slate-600">
                            <p><span className="font-semibold text-slate-800">Tenant:</span> Nazhin Safavi Moghadam & Yashar Shoraka</p>
                            <p><span className="font-semibold text-slate-800">Status:</span> Verified Digital Endorsement</p>
                            <p><span className="font-semibold text-slate-800">Date:</span> {report.inspection_date}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Bar */}
                <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500">
                  <span>Standard Residential Tenancy Condition Report • Schedule 2 NSW 2019</span>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-[#008F83] hover:bg-[#00A99D] text-white font-bold flex items-center gap-1.5 self-start sm:self-auto transition-all shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Printable PDF Report</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MOBILE STICKY BOTTOM ACTION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 flex items-center justify-between gap-2 shadow-lg">
        {activeTab === 'room' && activeRoom ? (
          <>
            <button
              onClick={() => {
                if (activeRoomIndex > 0) setActiveRoomIndex(activeRoomIndex - 1);
              }}
              disabled={activeRoomIndex === 0}
              className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold disabled:opacity-40"
            >
              ← Prev
            </button>

            <span className="text-[11px] font-bold text-slate-600 truncate max-w-[120px]">
              {activeRoom.name}
            </span>

            {activeRoomIndex < totalRooms - 1 ? (
              <button
                onClick={() => setActiveRoomIndex(activeRoomIndex + 1)}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold"
              >
                Next Room →
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('signatures')}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold"
              >
                Signatures →
              </button>
            )}
          </>
        ) : (
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {progressPercent}% Complete
            </span>
            <button
              onClick={() => {
                setActiveTab('room');
                setActiveRoomIndex(0);
              }}
              className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold"
            >
              Continue Inspection →
            </button>
          </div>
        )}
      </div>

      {/* Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">{alertMessage.title}</h3>
            <p className="text-xs text-slate-600 mb-6">{alertMessage.message}</p>
            <button
              onClick={() => setAlertMessage(null)}
              className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
