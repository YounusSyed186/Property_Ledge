'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import {
  FolderOpen,
  FileText,
  Image as ImageIcon,
  Receipt,
  Camera,
  ClipboardList,
  ShieldCheck,
  Building,
  Download,
  Eye,
  Trash2,
  Plus,
  Search,
  RefreshCw,
  Upload,
  X,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  File,
  AlertCircle,
  LayoutGrid,
  List,
  Link2,
  Cloud,
} from 'lucide-react';
import {
  UnifiedDocument,
  DocumentStats,
  DocumentCategory,
} from '@/types/documents';
import { formatDocumentSize, getFileTypeGroup } from '@/lib/documents/storage';
import {
  fetchWorkspaceDocumentsAction,
  uploadWorkspaceDocumentAction,
  deleteWorkspaceDocumentAction,
} from '@/app/actions/documents';
import {
  PageLayout,
  PageContent,
  ListPageHeader,
  CompactKpiCard,
} from '@/components/workspace';
import { cn } from '@/lib/utils';

interface PropertyOption {
  id: string;
  name: string;
  address?: string | null;
}

interface DocumentsDashboardProps {
  initialDocuments: UnifiedDocument[];
  initialStats: DocumentStats;
  properties: PropertyOption[];
}

export function DocumentsDashboard({
  initialDocuments,
  initialStats,
  properties,
}: DocumentsDashboardProps) {
  const [documents, setDocuments] = useState<UnifiedDocument[]>(initialDocuments);
  const [stats, setStats] = useState<DocumentStats>(initialStats);
  const [activeCategory, setActiveCategory] = useState<DocumentCategory>('all');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'pdf' | 'image' | 'spreadsheet' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<UnifiedDocument | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form State for Upload Modal
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<string>('lease_agreement');
  const [uploadPropertyId, setUploadPropertyId] = useState<string>('');
  const [uploadDescription, setUploadDescription] = useState('');

  const refreshData = () => {
    startTransition(async () => {
      setActionError(null);
      const res = await fetchWorkspaceDocumentsAction();
      if (res.success && res.data) {
        setDocuments(res.data);
        if (res.stats) setStats(res.stats);
      } else {
        setActionError(res.error || 'Failed to refresh documents');
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadFile(file);
      if (!uploadTitle) {
        const cleanName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setUploadTitle(cleanName);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle) {
      setActionError('Please provide a file and a title');
      return;
    }

    setIsUploading(true);
    setActionError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);
      formData.append('documentType', uploadCategory);
      formData.append('propertyId', uploadPropertyId);
      formData.append('description', uploadDescription);

      const res = await uploadWorkspaceDocumentAction(formData);

      if (res.success && res.data) {
        setDocuments((prev) => [res.data!, ...prev]);
        setUploadModalOpen(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadDescription('');
        setUploadPropertyId('');
        setActionSuccess('Document uploaded successfully to Vercel Blob.');
        setTimeout(() => setActionSuccess(null), 4000);
        refreshData();
      } else {
        setActionError(res.error || 'Failed to upload document');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error uploading document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    startTransition(async () => {
      setActionError(null);
      const res = await deleteWorkspaceDocumentAction(docId);
      if (res.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        setDeleteConfirmId(null);
        if (previewDoc?.id === docId) setPreviewDoc(null);
        setActionSuccess('Document removed successfully.');
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        setActionError(res.error || 'Failed to delete document');
      }
    });
  };

  // Filter Logic
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (activeCategory !== 'all' && doc.category !== activeCategory) {
        return false;
      }
      if (selectedPropertyId !== 'all' && doc.propertyId !== selectedPropertyId) {
        return false;
      }
      if (fileTypeFilter !== 'all') {
        const typeGroup = getFileTypeGroup(doc.mimeType, doc.fileName);
        if (typeGroup !== fileTypeFilter) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(query);
        const matchesFileName = doc.fileName.toLowerCase().includes(query);
        const matchesProp = (doc.propertyName || '').toLowerCase().includes(query);
        const matchesLabel = (doc.linkedEntityLabel || '').toLowerCase().includes(query);
        const matchesNotes = (doc.notes || '').toLowerCase().includes(query);
        const matchesTags = (doc.tags || []).some((t) => t.toLowerCase().includes(query));

        return matchesTitle || matchesFileName || matchesProp || matchesLabel || matchesNotes || matchesTags;
      }
      return true;
    });
  }, [documents, activeCategory, selectedPropertyId, fileTypeFilter, searchQuery]);

  const getCategoryIcon = (category: DocumentCategory) => {
    switch (category) {
      case 'receipt':
        return <Receipt className="w-3.5 h-3.5" />;
      case 'inspection_photo':
        return <Camera className="w-3.5 h-3.5" />;
      case 'condition_report':
        return <ClipboardList className="w-3.5 h-3.5" />;
      case 'lease_agreement':
        return <FileText className="w-3.5 h-3.5" />;
      case 'compliance_insurance':
        return <ShieldCheck className="w-3.5 h-3.5" />;
      default:
        return <File className="w-3.5 h-3.5" />;
    }
  };

  const getCategoryBadgeClass = (category: DocumentCategory) => {
    switch (category) {
      case 'receipt':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25';
      case 'inspection_photo':
        return 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25';
      case 'condition_report':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25';
      case 'lease_agreement':
        return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25';
      case 'compliance_insurance':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25';
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25';
    }
  };

  const getCategoryLabel = (category: DocumentCategory) => {
    switch (category) {
      case 'receipt':
        return 'Expense Receipt';
      case 'inspection_photo':
        return 'Inspection Photo';
      case 'condition_report':
        return 'Condition Report';
      case 'lease_agreement':
        return 'Lease Agreement';
      case 'compliance_insurance':
        return 'Compliance & Insurance';
      case 'strata_council':
        return 'Strata & Council';
      default:
        return 'General Document';
    }
  };

  const getFileIcon = (mimeType?: string | null, fileName?: string | null) => {
    const group = getFileTypeGroup(mimeType, fileName);
    if (group === 'image') return <ImageIcon className="w-5 h-5 text-sky-500" />;
    if (group === 'pdf') return <FileText className="w-5 h-5 text-rose-500" />;
    if (group === 'spreadsheet') return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    return <File className="w-5 h-5 text-slate-500" />;
  };

  return (
    <PageLayout>
      <PageContent>
        {/* Notifications */}
        {actionError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-rose-600 dark:text-rose-400 hover:opacity-75"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:opacity-75"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* List Page Header */}
        <ListPageHeader
          title="Documents & Files Repository"
          description="Centralized storage for all receipts, inspection photos, condition reports, leases, and Vercel blobs."
          actions={
            <div className="flex items-center gap-2.5">
              <button
                onClick={refreshData}
                disabled={isPending}
                className="h-10 px-3.5 rounded-lg border border-admin-border bg-admin-surface text-admin-foreground hover:bg-admin-surface-subtle transition flex items-center gap-2 text-sm font-medium shadow-2xs disabled:opacity-50"
                title="Refresh documents list"
              >
                <RefreshCw className={cn('w-4 h-4', isPending && 'animate-spin')} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="h-10 px-4 rounded-lg bg-admin-primary hover:bg-admin-primary-hover text-white font-medium text-sm flex items-center gap-2 shadow-sm transition"
              >
                <Upload className="w-4 h-4" />
                Upload Document
              </button>
            </div>
          }
        />

        {/* 5 Compact KPI Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <CompactKpiCard
            label="Total Files"
            value={stats.totalFiles}
            hint={formatDocumentSize(stats.totalSizeBytes)}
            icon={FolderOpen}
            accent="teal"
          />
          <CompactKpiCard
            label="Receipts & Invoices"
            value={stats.receiptsCount}
            hint="Expense receipts"
            icon={Receipt}
            accent="amber"
          />
          <CompactKpiCard
            label="Inspection Photos"
            value={stats.photosCount}
            hint="Condition photos"
            icon={Camera}
            accent="blue"
          />
          <CompactKpiCard
            label="Condition Reports"
            value={stats.reportsCount}
            hint="Inspection PDFs"
            icon={ClipboardList}
            accent="emerald"
          />
          <CompactKpiCard
            label="Leases & Compliance"
            value={stats.leasesAndAgreementsCount + stats.complianceCount}
            hint="Agreements & certs"
            icon={ShieldCheck}
            accent="indigo"
          />
        </div>

        {/* Filter Toolbar Container */}
        <div className="rounded-xl border border-admin-border bg-admin-surface p-4 shadow-xs space-y-3.5">
          {/* Top Row: Search & Dropdowns */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by file name, property, room, or tag..."
                className="w-full pl-9 pr-8 py-2 rounded-lg bg-admin-surface-subtle/70 border border-admin-border text-sm text-admin-foreground placeholder:text-admin-muted focus:outline-none focus:border-admin-primary transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-admin-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selects & View Mode */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="h-9 px-3 rounded-lg bg-admin-surface-subtle/70 border border-admin-border text-xs text-admin-foreground focus:outline-none focus:border-admin-primary transition"
              >
                <option value="all">All Properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                value={fileTypeFilter}
                onChange={(e) => setFileTypeFilter(e.target.value as any)}
                className="h-9 px-3 rounded-lg bg-admin-surface-subtle/70 border border-admin-border text-xs text-admin-foreground focus:outline-none focus:border-admin-primary transition"
              >
                <option value="all">All File Types</option>
                <option value="pdf">PDFs</option>
                <option value="image">Images</option>
                <option value="spreadsheet">Spreadsheets</option>
                <option value="other">Other</option>
              </select>

              <div className="flex items-center p-0.5 rounded-lg bg-admin-surface-subtle border border-admin-border">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-1.5 rounded-md transition',
                    viewMode === 'grid'
                      ? 'bg-admin-surface text-admin-primary shadow-xs font-semibold'
                      : 'text-admin-muted hover:text-admin-foreground'
                  )}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'p-1.5 rounded-md transition',
                    viewMode === 'table'
                      ? 'bg-admin-surface text-admin-primary shadow-xs font-semibold'
                      : 'text-admin-muted hover:text-admin-foreground'
                  )}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
            {[
              { id: 'all', label: 'All Files', count: stats.totalFiles },
              { id: 'receipt', label: 'Receipts & Invoices', count: stats.receiptsCount },
              { id: 'inspection_photo', label: 'Inspection Photos', count: stats.photosCount },
              { id: 'condition_report', label: 'Condition Reports', count: stats.reportsCount },
              { id: 'lease_agreement', label: 'Leases & Agreements', count: stats.leasesAndAgreementsCount },
              { id: 'compliance_insurance', label: 'Compliance & Insurance', count: stats.complianceCount },
              { id: 'strata_council', label: 'Strata & Council', count: stats.otherCount },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as DocumentCategory)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1.5 min-h-[32px]',
                  activeCategory === cat.id
                    ? 'bg-admin-primary text-white font-semibold shadow-xs'
                    : 'bg-admin-surface-subtle text-slate-600 dark:text-slate-400 hover:text-admin-foreground border border-admin-border/70'
                )}
              >
                <span>{cat.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                    activeCategory === cat.id
                      ? 'bg-white/20 text-white font-bold'
                      : 'bg-admin-surface border border-admin-border/80 text-admin-muted'
                  )}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Section */}
        {filteredDocuments.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-admin-border bg-admin-surface text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-4 rounded-full bg-admin-primary-soft text-admin-primary">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-admin-foreground">No documents found</h3>
            <p className="text-xs text-admin-muted max-w-md">
              {searchQuery || activeCategory !== 'all' || selectedPropertyId !== 'all'
                ? 'No files match your active filters. Try adjusting your search query or selecting a different category.'
                : 'Your workspace repository is empty. Upload leases, compliance certificates, or create condition reports and expense transactions to populate files.'}
            </p>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-lg bg-admin-primary hover:bg-admin-primary-hover text-white text-xs font-medium flex items-center gap-2 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Upload First Document
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDocuments.map((doc) => {
              const isImage = getFileTypeGroup(doc.mimeType, doc.fileName) === 'image';
              const isDeleting = deleteConfirmId === doc.id;

              return (
                <div
                  key={doc.id}
                  className="group relative flex flex-col justify-between rounded-xl border border-admin-border bg-admin-surface hover:border-admin-primary/40 hover:shadow-md transition overflow-hidden shadow-xs"
                >
                  {/* Thumbnail / Header Area */}
                  <div
                    onClick={() => setPreviewDoc(doc)}
                    className="cursor-pointer relative h-36 bg-admin-surface-subtle/80 border-b border-admin-border flex items-center justify-center overflow-hidden"
                  >
                    {isImage && doc.fileUrl && !doc.fileUrl.startsWith('/dashboard') ? (
                      <img
                        src={doc.fileUrl}
                        alt={doc.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="p-4 rounded-xl bg-admin-surface border border-admin-border group-hover:border-admin-primary/40 transition flex flex-col items-center gap-1.5 text-admin-muted shadow-2xs">
                        {getFileIcon(doc.mimeType, doc.fileName)}
                        <span className="text-[10px] uppercase font-mono tracking-wider text-admin-muted">
                          {doc.fileName.split('.').pop() || 'FILE'}
                        </span>
                      </div>
                    )}

                    {/* Category Badge */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[10.5px] font-semibold border flex items-center gap-1 backdrop-blur-md shadow-2xs',
                          getCategoryBadgeClass(doc.category)
                        )}
                      >
                        {getCategoryIcon(doc.category)}
                        {getCategoryLabel(doc.category)}
                      </span>
                    </div>

                    {/* Vercel Blob Indicator */}
                    {doc.isVercelBlob && (
                      <div
                        className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-md text-[10px] bg-admin-surface/90 border border-admin-border text-admin-muted flex items-center gap-1 backdrop-blur-md font-medium"
                        title="Stored securely on Vercel Blob"
                      >
                        <Cloud className="w-3 h-3 text-admin-primary" />
                        <span>Blob</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h4
                        onClick={() => setPreviewDoc(doc)}
                        className="cursor-pointer font-semibold text-sm text-admin-foreground line-clamp-1 hover:text-admin-primary transition"
                        title={doc.title}
                      >
                        {doc.title}
                      </h4>

                      {doc.propertyName && (
                        <div className="flex items-center gap-1.5 text-xs text-admin-muted">
                          <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{doc.propertyName}</span>
                        </div>
                      )}

                      {doc.linkedEntityLabel && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate bg-admin-surface-subtle/80 px-2 py-1 rounded-md border border-admin-border/60 flex items-center gap-1">
                          <Link2 className="w-3 h-3 text-admin-muted flex-shrink-0" />
                          <span className="truncate">{doc.linkedEntityLabel}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer Row */}
                    <div className="pt-2 border-t border-admin-border/70 flex items-center justify-between text-[11px] text-admin-muted">
                      <span className="font-mono">{formatDocumentSize(doc.fileSize)}</span>
                      <span>
                        {new Date(doc.uploadedAt).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="px-4 py-2 bg-admin-surface-subtle/50 border-t border-admin-border flex items-center justify-between">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="p-1.5 rounded-lg text-admin-muted hover:text-admin-foreground hover:bg-admin-surface transition"
                      title="Quick Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={doc.fileName}
                      className="p-1.5 rounded-lg text-admin-muted hover:text-admin-foreground hover:bg-admin-surface transition"
                      title="Download / Open File"
                    >
                      <Download className="w-4 h-4" />
                    </a>

                    {doc.source === 'database_document' && (
                      <div>
                        {isDeleting ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-600 hover:bg-rose-500 text-white transition"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-admin-surface border border-admin-border text-admin-muted hover:text-admin-foreground transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(doc.id)}
                            className="p-1.5 rounded-lg text-admin-muted hover:text-rose-600 hover:bg-rose-500/10 transition"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="rounded-xl border border-admin-border bg-admin-surface overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-admin-foreground">
                <thead className="bg-admin-surface-subtle/80 border-b border-admin-border text-xs uppercase font-medium text-admin-muted">
                  <tr>
                    <th className="py-3 px-4">Document / File</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4">Linked Context</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border/60">
                  {filteredDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-admin-surface-subtle/40 transition group"
                    >
                      <td className="py-3 px-4">
                        <div
                          onClick={() => setPreviewDoc(doc)}
                          className="cursor-pointer flex items-center gap-2.5"
                        >
                          <div className="p-2 rounded-lg bg-admin-surface-subtle border border-admin-border text-admin-muted">
                            {getFileIcon(doc.mimeType, doc.fileName)}
                          </div>
                          <div>
                            <p className="font-semibold text-admin-foreground hover:text-admin-primary transition truncate max-w-xs">
                              {doc.title}
                            </p>
                            <p className="text-[11px] text-admin-muted font-mono truncate max-w-xs">
                              {doc.fileName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border',
                            getCategoryBadgeClass(doc.category)
                          )}
                        >
                          {getCategoryIcon(doc.category)}
                          {getCategoryLabel(doc.category)}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-admin-muted">
                        {doc.propertyName ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span>{doc.propertyName}</span>
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-admin-muted">
                        {doc.linkedEntityLabel || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-admin-muted">
                        {formatDocumentSize(doc.fileSize)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-admin-muted">
                        {new Date(doc.uploadedAt).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="p-1.5 rounded-lg text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle transition"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={doc.fileName}
                            className="p-1.5 rounded-lg text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle transition"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          {doc.source === 'database_document' && (
                            <button
                              onClick={() => setDeleteConfirmId(doc.id)}
                              className="p-1.5 rounded-lg text-admin-muted hover:text-rose-600 hover:bg-rose-500/10 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PREVIEW MODAL */}
        {previewDoc && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-admin-surface border border-admin-border rounded-2xl overflow-hidden flex flex-col shadow-2xl">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-admin-border flex items-center justify-between bg-admin-surface-subtle/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-admin-surface border border-admin-border shadow-2xs">
                    {getFileIcon(previewDoc.mimeType, previewDoc.fileName)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-admin-foreground text-base">
                      {previewDoc.title}
                    </h3>
                    <p className="text-xs text-admin-muted font-mono">
                      {previewDoc.fileName} • {formatDocumentSize(previewDoc.fileSize)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={previewDoc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={previewDoc.fileName}
                    className="px-3 py-1.5 rounded-lg bg-admin-surface border border-admin-border hover:bg-admin-surface-subtle text-admin-foreground text-xs font-medium flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="p-1.5 rounded-lg text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Media Preview Box */}
                <div className="md:col-span-2 flex items-center justify-center bg-admin-surface-subtle/80 rounded-xl border border-admin-border p-4 min-h-[320px]">
                  {getFileTypeGroup(previewDoc.mimeType, previewDoc.fileName) === 'image' ? (
                    <img
                      src={previewDoc.fileUrl}
                      alt={previewDoc.title}
                      className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
                    />
                  ) : getFileTypeGroup(previewDoc.mimeType, previewDoc.fileName) === 'pdf' ? (
                    previewDoc.fileUrl.startsWith('/dashboard') ? (
                      <div className="text-center space-y-3">
                        <ClipboardList className="w-12 h-12 text-admin-primary mx-auto" />
                        <p className="text-sm text-admin-foreground font-semibold">Condition Report Ready</p>
                        <Link
                          href={previewDoc.fileUrl}
                          className="px-4 py-2 rounded-lg bg-admin-primary hover:bg-admin-primary-hover text-white font-medium text-xs inline-flex items-center gap-1.5 transition shadow-sm"
                        >
                          <Eye className="w-4 h-4" />
                          View Report & Generate PDF
                        </Link>
                      </div>
                    ) : (
                      <iframe
                        src={previewDoc.fileUrl}
                        className="w-full h-[55vh] rounded-lg border border-admin-border"
                        title={previewDoc.title}
                      />
                    )
                  ) : (
                    <div className="text-center space-y-3">
                      <FileText className="w-12 h-12 text-admin-muted mx-auto" />
                      <p className="text-sm text-admin-muted">Document Preview Not Available in Browser</p>
                      <a
                        href={previewDoc.fileUrl}
                        download={previewDoc.fileName}
                        className="px-4 py-2 rounded-lg bg-admin-surface border border-admin-border hover:bg-admin-surface-subtle text-admin-foreground text-xs inline-flex items-center gap-1.5 transition shadow-2xs"
                      >
                        <Download className="w-4 h-4" />
                        Download File
                      </a>
                    </div>
                  )}
                </div>

                {/* Metadata Sidebar */}
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-admin-surface-subtle/70 border border-admin-border space-y-3">
                    <h4 className="font-semibold text-admin-foreground uppercase tracking-wider text-[11px]">
                      Document Information
                    </h4>

                    <div className="space-y-2 text-admin-muted">
                      <div>
                        <span className="text-slate-400 block">Category:</span>
                        <span className="font-medium text-admin-foreground capitalize">
                          {getCategoryLabel(previewDoc.category)}
                        </span>
                      </div>

                      {previewDoc.propertyName && (
                        <div>
                          <span className="text-slate-400 block">Property:</span>
                          <span className="font-medium text-admin-foreground">
                            {previewDoc.propertyName}
                          </span>
                        </div>
                      )}

                      {previewDoc.linkedEntityLabel && (
                        <div>
                          <span className="text-slate-400 block">Linked Context:</span>
                          <span className="font-medium text-admin-foreground">
                            {previewDoc.linkedEntityLabel}
                          </span>
                        </div>
                      )}

                      <div>
                        <span className="text-slate-400 block">Uploaded Date:</span>
                        <span className="font-medium text-admin-foreground">
                          {new Date(previewDoc.uploadedAt).toLocaleString('en-AU')}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block">MIME Type:</span>
                        <span className="font-mono text-admin-foreground">{previewDoc.mimeType || 'Unknown'}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block">Storage Provider:</span>
                        <span className="font-medium text-admin-foreground flex items-center gap-1 mt-0.5">
                          <Cloud className="w-3.5 h-3.5 text-admin-primary" />
                          {previewDoc.isVercelBlob ? 'Vercel Blob Storage' : 'Cloud Storage'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {previewDoc.notes && (
                    <div className="p-4 rounded-xl bg-admin-surface-subtle/70 border border-admin-border space-y-1.5">
                      <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                        Notes / Description
                      </h4>
                      <p className="text-admin-foreground leading-relaxed">{previewDoc.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* UPLOAD DOCUMENT MODAL */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="relative w-full max-w-lg bg-admin-surface border border-admin-border rounded-2xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="px-6 py-4 border-b border-admin-border flex items-center justify-between bg-admin-surface-subtle/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-admin-primary-soft text-admin-primary border border-admin-primary-border">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-admin-foreground text-base">
                      Upload Document
                    </h3>
                    <p className="text-xs text-admin-muted">
                      Upload leases, compliance certificates, rate notices, or custom files.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setUploadModalOpen(false)}
                  className="p-1.5 rounded-lg text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
                {/* File Dropzone */}
                <div>
                  <label className="block text-xs font-semibold text-admin-foreground mb-1.5">
                    Select File <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative border-2 border-dashed border-admin-border hover:border-admin-primary/60 rounded-xl p-6 text-center bg-admin-surface-subtle/40 transition">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.docx"
                      required
                    />
                    {uploadFile ? (
                      <div className="space-y-1">
                        <FileText className="w-8 h-8 text-admin-primary mx-auto" />
                        <p className="text-xs font-semibold text-admin-foreground">{uploadFile.name}</p>
                        <p className="text-[11px] text-admin-muted font-mono">
                          {formatDocumentSize(uploadFile.size)}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-admin-muted">
                        <Cloud className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-xs font-medium text-admin-foreground">
                          Drag and drop file here, or click to browse
                        </p>
                        <p className="text-[11px] text-admin-muted">
                          Supports PDF, PNG, JPG, CSV, DOCX up to 25MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-admin-foreground mb-1.5">
                    Document Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Residential Tenancy Agreement 2026"
                    required
                    className="w-full px-3.5 py-2 rounded-lg bg-admin-surface border border-admin-border text-sm text-admin-foreground placeholder:text-admin-muted focus:outline-none focus:border-admin-primary transition"
                  />
                </div>

                {/* Category & Property Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-admin-foreground mb-1.5">
                      Document Category
                    </label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-admin-surface border border-admin-border text-xs text-admin-foreground focus:outline-none focus:border-admin-primary transition"
                    >
                      <option value="lease_agreement">Lease Agreement</option>
                      <option value="insurance_policy">Insurance Policy</option>
                      <option value="compliance_certificate">Compliance Certificate</option>
                      <option value="strata_notice">Strata / Body Corp Notice</option>
                      <option value="council_notice">Council / Water Notice</option>
                      <option value="receipt">Expense Receipt / Invoice</option>
                      <option value="photo">Inspection Photo</option>
                      <option value="other">Other Document</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-admin-foreground mb-1.5">
                      Associated Property
                    </label>
                    <select
                      value={uploadPropertyId}
                      onChange={(e) => setUploadPropertyId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-admin-surface border border-admin-border text-xs text-admin-foreground focus:outline-none focus:border-admin-primary transition"
                    >
                      <option value="">General Workspace</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description / Notes */}
                <div>
                  <label className="block text-xs font-semibold text-admin-foreground mb-1.5">
                    Description / Notes (Optional)
                  </label>
                  <textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    rows={2}
                    placeholder="Add any relevant notes, reference numbers, or policy details..."
                    className="w-full px-3.5 py-2 rounded-lg bg-admin-surface border border-admin-border text-xs text-admin-foreground placeholder:text-admin-muted focus:outline-none focus:border-admin-primary transition"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(false)}
                    disabled={isUploading}
                    className="px-4 py-2 rounded-lg border border-admin-border bg-admin-surface text-admin-muted hover:text-admin-foreground text-xs font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !uploadFile || !uploadTitle}
                    className="px-5 py-2 rounded-lg bg-admin-primary hover:bg-admin-primary-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Uploading to Blob...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        Upload to Vercel Blob
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
}
