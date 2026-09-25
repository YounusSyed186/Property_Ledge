'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  FolderUp,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Upload,
  X,
  Building,
  Calendar,
  DollarSign,
  Tag,
  Eye,
  Check,
  RefreshCw,
  Layers,
  ChevronRight,
  HelpCircle,
  FileSpreadsheet,
  Clock,
  CreditCard,
} from 'lucide-react';
import { Button, useToast, ConfirmDialog } from '@/components/admin/ui';
import { usePropertyContext } from '@/components/property/PropertyContext';
import { useWorkspaceStore } from '@/lib/stores/useWorkspaceStore';
import { getDropdownOptions } from '@/lib/cache/optionsCache';
import { CategoryDTO, TaxClassificationDTO } from '@/modules/finance/domain/types';
import {
  ExpenseImportItemDTO,
  BulkImportPayload,
  BulkExpenseDraft,
  ExtractionSource,
} from '@/modules/finance/domain/bulk-expense-types';
import {
  parseRawFileToImportItem,
  normalizeFolderName,
} from '@/modules/finance/domain/bulk-expense-parser';
import {
  uploadExpenseBlobAction,
  importBulkExpensesAction,
  deleteExpenseBlobsAction,
} from '@/app/actions/bulk-expense';
import { formatCurrency } from '@/lib/format/currency';
import { getFinancialYear, getAvailableFinancialYears, isDateInFinancialYear, getFinancialYearRange } from '@/lib/format/financial-year';
import { cn } from '@/lib/utils';

interface BulkExpenseUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultPropertyId?: string;
}

type WorkflowStep = 'SETUP' | 'PROCESSING' | 'REVIEW' | 'CONFIRM' | 'IMPORTING' | 'SUCCESS';

export function BulkExpenseUploadModal({
  isOpen,
  onClose,
  onSuccess,
  defaultPropertyId,
}: BulkExpenseUploadModalProps) {
  const { toast } = useToast();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { availableProperties, selectedProperty } = usePropertyContext();

  // Workflow State
  const [step, setStep] = useState<WorkflowStep>('SETUP');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [processedCount, setProcessedCount] = useState(0);
  const [totalFilesToProcess, setTotalFilesToProcess] = useState(0);

  // Setup Selections
  const [selectedFinancialYear, setSelectedFinancialYear] = useState<string>(getFinancialYear(new Date()));
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    defaultPropertyId || selectedProperty?.propertyId || ''
  );
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>('');
  const [selectedOptionalCategoryId, setSelectedOptionalCategoryId] = useState<string>('');
  const [defaultPaymentStatus, setDefaultPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [defaultTaxClassId, setDefaultTaxClassId] = useState<string>('');
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [skippedItemIds, setSkippedItemIds] = useState<Set<string>>(new Set());

  // Dropdown Cache Options
  const [properties, setProperties] = useState<any[]>(availableProperties || []);
  const [leases, setLeases] = useState<any[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [taxClassifications, setTaxClassifications] = useState<TaxClassificationDTO[]>([]);

  // Pure Client-Side Draft State (NO database staging tables)
  const [items, setItems] = useState<ExpenseImportItemDTO[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<
    'ALL' | 'READY' | 'NEEDS_ATTENTION' | 'MISSING_AMOUNT' | 'CONFLICTS' | 'PAID' | 'UNPAID'
  >('ALL');
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // Preview Drawer State
  const [previewItem, setPreviewItem] = useState<ExpenseImportItemDTO | null>(null);

  // Bulk Edit Bar State
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkTaxClass, setBulkTaxClass] = useState('');
  const [bulkPaymentStatus, setBulkPaymentStatus] = useState<'' | 'paid' | 'unpaid'>('');

  // File Input Refs for multi-file and folder upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Load Dropdown Options
  useEffect(() => {
    if (isOpen) {
      getDropdownOptions().then((opts) => {
        setCategories(opts.categories || []);
        const loadedProps = opts.properties && opts.properties.length > 0 ? opts.properties : availableProperties || [];
        setProperties(loadedProps);
        setLeases(opts.leases || []);
        setTaxClassifications(opts.taxClassifications || []);

        if (!selectedPropertyId && loadedProps.length > 0) {
          if (defaultPropertyId) {
            setSelectedPropertyId(defaultPropertyId);
          } else if (selectedProperty?.propertyId) {
            setSelectedPropertyId(selectedProperty.propertyId);
          }
        }
      });
      if (defaultPropertyId) {
        setSelectedPropertyId(defaultPropertyId);
      } else if (selectedProperty?.propertyId) {
        setSelectedPropertyId(selectedProperty.propertyId);
      }
    } else {
      // Reset state when closed
      setStep('SETUP');
      setItems([]);
      setSelectedItemIds([]);
      setPreviewItem(null);
    }
  }, [isOpen, defaultPropertyId, selectedProperty, availableProperties]);

  // Filtered leases based on selected property
  const propertyLeases = useMemo(() => {
    if (!selectedPropertyId) return [];
    return leases.filter((l) => l.property_id === selectedPropertyId || l.property?.id === selectedPropertyId);
  }, [leases, selectedPropertyId]);

  // Auto-select lease if property has exactly 1 active lease
  useEffect(() => {
    if (propertyLeases.length === 1 && !selectedLeaseId) {
      setSelectedLeaseId(propertyLeases[0].id);
    }
  }, [propertyLeases, selectedLeaseId]);

  // Filtered Properties for Setup Search
  const filteredProperties = useMemo(() => {
    if (!propertySearchQuery.trim()) return properties;
    const q = propertySearchQuery.toLowerCase();
    return properties.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.address_line_1 && p.address_line_1.toLowerCase().includes(q)) ||
        (p.suburb && p.suburb.toLowerCase().includes(q))
    );
  }, [properties, propertySearchQuery]);

  // Combines DB categories with any newly detected folder categories from staged items
  const allCategories = useMemo(() => {
    const list = [...categories];
    for (const it of items) {
      if (it.category_id && it.category_id.startsWith('new:')) {
        const catName = it.category_name || (it.folder_name ? normalizeFolderName(it.folder_name) : it.category_id.replace('new:', ''));
        if (catName && !list.some((c) => c.id === it.category_id || c.name.toLowerCase() === catName.toLowerCase())) {
          list.push({
            id: it.category_id,
            name: catName,
            transaction_type: 'expense',
            description: `Folder Category: ${catName}`,
            is_active: true,
            category_group_id: null,
            default_tax_classification_id: null,
            created_at: '',
            updated_at: '',
          });
        }
      }
    }
    return list;
  }, [categories, items]);

  // Read Files or Directory from inputs or drag-and-drop
  const handleFolderSelected = async (fileList: FileList | File[] | null) => {
    if (!fileList || (Array.isArray(fileList) ? fileList.length === 0 : fileList.length === 0)) return;
    if (!selectedPropertyId) {
      toast({
        title: 'Property Required',
        description: 'Please select a Property before uploading files or a folder.',
        variant: 'destructive',
      });
      return;
    }

    const filesArray: File[] = Array.isArray(fileList) ? fileList : Array.from(fileList);
    const validFiles = filesArray.filter((f) => {
      const ext = f.name.toLowerCase().split('.').pop() || '';
      return ['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext);
    });

    if (validFiles.length === 0) {
      toast({
        title: 'No Supported Files Found',
        description: 'Please upload a folder containing PDF, JPG, PNG, or WebP expense documents.',
        variant: 'destructive',
      });
      return;
    }

    setStep('PROCESSING');
    setIsProcessing(true);
    setTotalFilesToProcess(validFiles.length);
    setProcessedCount(0);
    setProgressText(`Scanning and parsing ${validFiles.length} files...`);

    try {
      // 1. Parse all files in client memory using directory paths and filenames with duplicate fingerprinting
      const stagedDrafts: ExpenseImportItemDTO[] = [];
      const seenFileHashes = new Set<string>();

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const relativePath = (file as any).webkitRelativePath || (file as any).path || file.name;
        const fileFingerprint = `${file.name.toLowerCase().trim()}_${file.size}`;
        const isDuplicate = seenFileHashes.has(fileFingerprint);
        seenFileHashes.add(fileFingerprint);

        const parsed = parseRawFileToImportItem(
          {
            relativePath,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            propertyId: selectedPropertyId,
            leaseId: selectedLeaseId || null,
            categories,
            taxClassifications,
            defaultPaymentStatus,
          },
          `draft-batch-${Date.now()}`,
          activeWorkspaceId || ''
        );

        const isUnpaid = defaultPaymentStatus === 'unpaid';
        const assignedTaxClassId = isUnpaid
          ? null
          : (defaultTaxClassId || parsed.tax_classification_id || null);
        const assignedTaxClassName = assignedTaxClassId
          ? taxClassifications.find((t) => t.id === assignedTaxClassId)?.name
          : undefined;
        const assignedGstAmt = isUnpaid ? 0 : (parsed.gst_amount || 0);

        // Fallback to optional setup category if parsed has no category
        const finalCategoryId = parsed.category_id || selectedOptionalCategoryId || null;
        const finalCategoryName = finalCategoryId
          ? (categories.find((c) => c.id === finalCategoryId)?.name || parsed.extraction_metadata?.normalized_folder_name)
          : undefined;

        let conflictType = parsed.conflict_type || null;
        let conflictMessage = parsed.conflict_message || null;
        let validationStatus = parsed.validation_status || 'READY';

        if (isDuplicate) {
          conflictType = 'DUPLICATE_FILE';
          conflictMessage = 'Duplicate file detected: This file has already been uploaded or is duplicated in this batch. No changes will be made.';
          validationStatus = 'NEEDS_ATTENTION';
        } else if (parsed.transaction_date && !isDateInFinancialYear(parsed.transaction_date, selectedFinancialYear)) {
          conflictType = 'MISSING_DATE';
          const fileFy = getFinancialYear(parsed.transaction_date);
          conflictMessage = `Financial year mismatch: Selected ${selectedFinancialYear}, but document date (${parsed.transaction_date}) belongs to ${fileFy}.`;
          validationStatus = 'NEEDS_ATTENTION';
        }

        const draftItem: ExpenseImportItemDTO = {
          ...parsed,
          id: `draft-item-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
          category_id: finalCategoryId,
          categoryId: finalCategoryId,
          category_name: finalCategoryName,
          categoryName: finalCategoryName,
          paymentStatus: defaultPaymentStatus,
          payment_status: defaultPaymentStatus,
          taxClassificationId: assignedTaxClassId,
          tax_classification_id: assignedTaxClassId,
          taxClassificationName: assignedTaxClassName,
          tax_classification_name: assignedTaxClassName,
          gstAmount: assignedGstAmt,
          gst_amount: assignedGstAmt,
          gstTreatment: isUnpaid ? 'none' : (parsed.gst_treatment || 'none'),
          gst_treatment: isUnpaid ? 'none' : (parsed.gst_treatment || 'none'),
          conflict_type: conflictType,
          conflictType: conflictType,
          conflict_message: conflictMessage,
          conflictMessage: conflictMessage,
          validation_status: validationStatus,
          status: validationStatus,
          file: {
            name: file.name,
            relativePath,
            mimeType: file.type || 'application/pdf',
            size: file.size,
            fileObject: file,
          },
          propertyName: properties.find((p) => p.id === selectedPropertyId)?.name || 'Selected Property',
          leaseName: leases.find((l) => l.id === selectedLeaseId)?.lease_number || (selectedLeaseId ? 'Selected Lease' : undefined),
        };

        stagedDrafts.push(draftItem);
        setProcessedCount(i + 1);
        if (i % 5 === 0) {
          setProgressText(`Parsed ${i + 1} of ${validFiles.length} documents...`);
        }
      }

      // Immediately display items in client-side Review Table
      setItems(stagedDrafts);
      setStep('REVIEW');
      setIsProcessing(false);

      // 2. Asynchronously upload files to Vercel Blob in background
      (async () => {
        for (const item of stagedDrafts) {
          const matchedFile = item.file?.fileObject || validFiles.find((f) => f.name === item.file_name);
          if (matchedFile) {
            try {
              const fd = new FormData();
              fd.append('file', matchedFile);
              fd.append('tempId', item.id);
              const blobRes = await uploadExpenseBlobAction(fd);
              if (blobRes.success && blobRes.blobUrl) {
                setItems((prev) =>
                  prev.map((it) =>
                    it.id === item.id
                      ? {
                          ...it,
                          blob_url: blobRes.blobUrl,
                          blob_path: blobRes.blobPath || blobRes.blobUrl,
                          file: {
                            ...it.file,
                            blobUrl: blobRes.blobUrl,
                            blobPath: blobRes.blobPath || blobRes.blobUrl,
                          },
                        }
                      : it
                  )
                );
              }
            } catch (blobErr) {
              console.warn('Background blob upload warning:', item.file_name, blobErr);
            }
          }
        }
      })();
    } catch (err: any) {
      console.error('Error during client-side folder processing:', err);
      toast({
        title: 'Folder Parsing Failed',
        description: err.message || 'An error occurred while reading the folder.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setStep('SETUP');
    }
  };

  // Re-evaluates validation status and conflicts for an updated item in memory
  const revalidateItem = (item: ExpenseImportItemDTO): ExpenseImportItemDTO => {
    let validation_status: 'READY' | 'NEEDS_ATTENTION' | 'INVALID' = 'READY';
    let conflict_type: any = null;
    let conflict_message: string | null = null;
    const conflicts: any[] = [];

    if (item.document_type === 'EXPENSE') {
      if (item.amount === null || item.amount === undefined || Number(item.amount) <= 0 || isNaN(Number(item.amount))) {
        validation_status = 'NEEDS_ATTENTION';
        conflict_type = 'MISSING_AMOUNT';
        conflict_message = 'Amount could not be detected from the filename or document.';
        conflicts.push({ field: 'amount', message: conflict_message });
      } else if (
        item.extraction_metadata?.filename_amount !== null &&
        item.extraction_metadata?.document_amount !== null &&
        item.extraction_metadata?.filename_amount !== undefined &&
        item.extraction_metadata?.document_amount !== undefined &&
        Math.abs(item.extraction_metadata.filename_amount - item.extraction_metadata.document_amount) > 0.01 &&
        item.amount !== item.extraction_metadata.filename_amount &&
        item.amount !== item.extraction_metadata.document_amount
      ) {
        validation_status = 'NEEDS_ATTENTION';
        conflict_type = 'AMOUNT_CONFLICT';
        conflict_message = `Filename amount ($${item.extraction_metadata.filename_amount}) differs from document ($${item.extraction_metadata.document_amount}).`;
        conflicts.push({ field: 'amount', message: conflict_message });
      }

      if (!item.category_id && !item.category_name) {
        validation_status = 'NEEDS_ATTENTION';
        conflict_type = 'UNKNOWN_CATEGORY';
        conflict_message = 'Category is required before importing.';
        conflicts.push({ field: 'category', message: conflict_message });
      }
    }

    return {
      ...item,
      validation_status,
      status: validation_status,
      conflict_type,
      conflict_message,
      conflicts,
    };
  };

  // Inline Field Update in Memory
  const handleInlineItemUpdate = (itemId: string, updates: Partial<ExpenseImportItemDTO>) => {
    const userSource: ExtractionSource = 'USER';
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;

        const effectiveUpdates = { ...updates };

        // If toggling to UNPAID, clear GST and Tax Classification
        if (effectiveUpdates.payment_status === 'unpaid' || effectiveUpdates.paymentStatus === 'unpaid') {
          effectiveUpdates.payment_status = 'unpaid';
          effectiveUpdates.paymentStatus = 'unpaid';
          effectiveUpdates.tax_classification_id = null;
          effectiveUpdates.taxClassificationId = null;
          effectiveUpdates.tax_classification_name = undefined;
          effectiveUpdates.taxClassificationName = undefined;
          effectiveUpdates.gst_amount = 0;
          effectiveUpdates.gstAmount = 0;
          effectiveUpdates.gst_treatment = 'none';
          effectiveUpdates.gstTreatment = 'none';
          effectiveUpdates.gst_inclusive = false;
          effectiveUpdates.gstInclusive = false;
        }

        // If toggling to PAID and no tax classification was set, match a default
        if (
          (effectiveUpdates.payment_status === 'paid' || effectiveUpdates.paymentStatus === 'paid') &&
          !it.tax_classification_id &&
          !effectiveUpdates.tax_classification_id
        ) {
          effectiveUpdates.payment_status = 'paid';
          effectiveUpdates.paymentStatus = 'paid';
          const defaultTc =
            taxClassifications.find((t) => t.name.toLowerCase().includes('operating') || t.bas_code?.includes('G11')) ||
            taxClassifications[0];
          if (defaultTc) {
            effectiveUpdates.tax_classification_id = defaultTc.id;
            effectiveUpdates.taxClassificationId = defaultTc.id;
            effectiveUpdates.tax_classification_name = defaultTc.name;
            effectiveUpdates.taxClassificationName = defaultTc.name;
            const isGstFree = defaultTc.name.toLowerCase().includes('free') || defaultTc.bas_code?.includes('G3');
            effectiveUpdates.gst_treatment = isGstFree ? 'none' : 'exclusive';
            const amt = effectiveUpdates.amount !== undefined ? Number(effectiveUpdates.amount) : Number(it.amount || 0);
            effectiveUpdates.gst_amount = isGstFree ? 0 : (amt ? Math.round((amt * 0.1) * 100) / 100 : 0);
          }
        }

        // If tax classification is explicitly changed
        if (effectiveUpdates.tax_classification_id !== undefined && effectiveUpdates.tax_classification_id !== null) {
          const tc = taxClassifications.find((t) => t.id === effectiveUpdates.tax_classification_id);
          if (tc) {
            effectiveUpdates.tax_classification_name = tc.name;
            effectiveUpdates.taxClassificationName = tc.name;
            const isGstFree = tc.name.toLowerCase().includes('free') || tc.bas_code?.includes('G3');
            effectiveUpdates.gst_treatment = isGstFree ? 'none' : 'exclusive';
            const amt = effectiveUpdates.amount !== undefined ? Number(effectiveUpdates.amount) : Number(it.amount || 0);
            effectiveUpdates.gst_amount = isGstFree ? 0 : (amt ? Math.round((amt * 0.1) * 100) / 100 : 0);
          }
        }

        const updated: ExpenseImportItemDTO = {
          ...it,
          ...effectiveUpdates,
          extraction_metadata: {
            ...it.extraction_metadata,
            ...(effectiveUpdates.amount !== undefined ? { amount_source: userSource } : {}),
            ...(effectiveUpdates.category_id !== undefined ? { category_source: userSource } : {}),
            ...(effectiveUpdates.description !== undefined ? { description_source: userSource } : {}),
            ...(effectiveUpdates.supplier !== undefined ? { supplier_source: userSource } : {}),
          },
        };
        return revalidateItem(updated);
      })
    );

    if (previewItem && previewItem.id === itemId) {
      setPreviewItem((prev) => (prev ? revalidateItem({ ...prev, ...updates }) : null));
    }
  };

  // Bulk Field Update in Memory
  const handleBulkApply = () => {
    if (selectedItemIds.length === 0) return;

    setItems((prev) =>
      prev.map((it) => {
        if (!selectedItemIds.includes(it.id)) return it;
        const updates: Partial<ExpenseImportItemDTO> = {};
        if (bulkCategory) {
          updates.category_id = bulkCategory;
          updates.category_name = categories.find((c) => c.id === bulkCategory)?.name;
        }
        if (bulkPaymentStatus) {
          updates.payment_status = bulkPaymentStatus;
          updates.paymentStatus = bulkPaymentStatus;
          if (bulkPaymentStatus === 'unpaid') {
            updates.tax_classification_id = null;
            updates.taxClassificationId = null;
            updates.tax_classification_name = undefined;
            updates.taxClassificationName = undefined;
            updates.gst_amount = 0;
            updates.gstAmount = 0;
            updates.gst_treatment = 'none';
          }
        }
        if (bulkTaxClass && (updates.payment_status || it.payment_status || it.paymentStatus) !== 'unpaid') {
          updates.tax_classification_id = bulkTaxClass;
          const tc = taxClassifications.find((t) => t.id === bulkTaxClass);
          updates.tax_classification_name = tc?.name;
          updates.taxClassificationName = tc?.name;
          const isGstFree = tc?.name.toLowerCase().includes('free') || tc?.bas_code?.includes('G3');
          updates.gst_treatment = isGstFree ? 'none' : 'exclusive';
          const amt = Number(it.amount || 0);
          updates.gst_amount = isGstFree ? 0 : (amt ? Math.round((amt * 0.1) * 100) / 100 : 0);
        }
        return revalidateItem({ ...it, ...updates });
      })
    );

    setIsBulkEditOpen(false);
    setBulkCategory('');
    setBulkTaxClass('');
    setBulkPaymentStatus('');
    toast({
      title: 'Bulk Update Applied',
      description: `Updated ${selectedItemIds.length} items.`,
    });
  };

  // Delete Item from Draft List
  const handleDeleteDraftItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    setSelectedItemIds((prev) => prev.filter((id) => id !== itemId));
    if (previewItem?.id === itemId) setPreviewItem(null);
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selectedItemIds.length === 0) return;
    setItems((prev) => prev.filter((it) => !selectedItemIds.includes(it.id)));
    setSelectedItemIds([]);
    setIsBulkEditOpen(false);
  };

  // Row Selection Helpers
  const toggleSelectRow = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.length === filteredItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredItems.map((i) => i.id));
    }
  };

  // Filtered & Searched Items for Review Table
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Status Filter
      if (selectedFilter === 'READY' && item.validation_status !== 'READY') return false;
      if (selectedFilter === 'NEEDS_ATTENTION' && item.validation_status === 'READY') return false;
      if (selectedFilter === 'MISSING_AMOUNT' && (item.amount !== null && item.amount !== undefined && Number(item.amount) > 0)) return false;
      if (selectedFilter === 'CONFLICTS' && item.conflict_type !== 'AMOUNT_CONFLICT') return false;
      if (selectedFilter === 'PAID' && (item.payment_status || item.paymentStatus) === 'unpaid') return false;
      if (selectedFilter === 'UNPAID' && (item.payment_status || item.paymentStatus) !== 'unpaid') return false;

      // Text Search Query
      if (itemSearchQuery.trim()) {
        const q = itemSearchQuery.toLowerCase();
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesFile = item.file_name.toLowerCase().includes(q);
        const matchesSupplier = item.supplier?.toLowerCase().includes(q);
        const matchesFolder = item.folder_name?.toLowerCase().includes(q);
        if (!matchesDesc && !matchesFile && !matchesSupplier && !matchesFolder) return false;
      }

      return true;
    });
  }, [items, selectedFilter, itemSearchQuery]);

  const toggleSkipItem = (id: string) => {
    setSkippedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // KPI Metrics Calculation (excluding skipped items from blocking import)
  const kpis = useMemo(() => {
    const total = items.length;
    let ready = 0;
    let attention = 0;
    let totalAmt = 0;
    let totalGst = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let paidAmt = 0;
    let unpaidAmt = 0;

    for (const it of items) {
      const isSkipped = skippedItemIds.has(it.id);
      if (!isSkipped) {
        if (it.validation_status === 'READY') {
          ready++;
        } else {
          attention++;
        }
      }

      const itemPaid = (it.payment_status || it.paymentStatus) !== 'unpaid';
      if (itemPaid) {
        paidCount++;
      } else {
        unpaidCount++;
      }

      if (it.amount && it.document_type === 'EXPENSE' && !isSkipped) {
        const amt = Number(it.amount);
        totalAmt += amt;
        if (itemPaid) {
          paidAmt += amt;
        } else {
          unpaidAmt += amt;
        }
      }
      if (it.gst_amount && it.document_type === 'EXPENSE' && !isSkipped) {
        totalGst += Number(it.gst_amount);
      }
    }

    const activeCount = total - skippedItemIds.size;

    return {
      total,
      ready,
      attention,
      skippedCount: skippedItemIds.size,
      totalAmount: totalAmt,
      totalGst: totalGst,
      paidCount,
      unpaidCount,
      paidAmount: paidAmt,
      unpaidAmount: unpaidAmt,
      canImport: activeCount > 0 && attention === 0,
    };
  }, [items, skippedItemIds]);

  // Execute Final Atomic Import
  const handleExecuteImport = async () => {
    if (kpis.attention > 0) {
      toast({
        title: 'Action Required',
        description: `Please resolve the ${kpis.attention} item(s) needing attention before importing.`,
        variant: 'destructive',
      });
      return;
    }

    setStep('IMPORTING');
    setIsProcessing(true);
    setProgressText(`Preparing receipts and validating expenses...`);

    try {
      const fallbackCatId = categories.find((c) => c.name?.toLowerCase().includes('other'))?.id || categories[0]?.id || '';
      const today = new Date().toISOString().split('T')[0];

      // 1. Ensure all receipts with file objects are uploaded to Blob storage before creating transactions
      const resolvedItems = [...items];
      for (let idx = 0; idx < resolvedItems.length; idx++) {
        const item = resolvedItems[idx];
        if (!item.blob_url && item.file?.fileObject) {
          setProgressText(`Uploading receipt ${idx + 1} of ${resolvedItems.length} (${item.file_name})...`);
          try {
            const fd = new FormData();
            fd.append('file', item.file.fileObject);
            fd.append('tempId', item.id);
            const blobRes = await uploadExpenseBlobAction(fd);
            if (blobRes.success && blobRes.blobUrl) {
              resolvedItems[idx] = {
                ...item,
                blob_url: blobRes.blobUrl,
                blob_path: blobRes.blobPath || blobRes.blobUrl,
              };
            }
          } catch (uploadErr) {
            console.warn('Could not upload receipt for', item.file_name, uploadErr);
          }
        }
      }

      const activeItemsToImport = resolvedItems.filter(
        (it) => it.document_type === 'EXPENSE' && !skippedItemIds.has(it.id)
      );

      setProgressText(`Importing ${activeItemsToImport.length} expenses to database...`);

      const importPayload: BulkImportPayload = {
        propertyId: selectedPropertyId,
        leaseId: selectedLeaseId || null,
        expenses: activeItemsToImport.map((it) => ({
            id: it.id,
            description: it.description || it.file_name,
            supplier: it.supplier || null,
            amount: Number(it.amount),
            transactionDate: it.transaction_date || today,
            paymentStatus: (it.payment_status || it.paymentStatus || defaultPaymentStatus) === 'unpaid' ? 'unpaid' : 'paid',
            gstInclusive: it.gst_inclusive ?? false,
            gstTreatment: it.gst_treatment || 'none',
            gstAmount: Number(it.gst_amount || 0),
            taxClassificationId: it.tax_classification_id || null,
            categoryId: it.category_id || fallbackCatId,
            categoryName: it.category_name || (it.folder_name ? normalizeFolderName(it.folder_name) : undefined),
            propertyId: it.property_id || selectedPropertyId,
            leaseId: it.lease_id || selectedLeaseId || null,
            attachment: it.blob_url
              ? {
                  blobUrl: it.blob_url,
                  blobPath: it.blob_path || it.blob_url,
                  fileName: it.file_name,
                  mimeType: it.file_type || 'application/pdf',
                  fileSize: it.file_size || 0,
                  sourcePath: it.source_path || it.file_name,
                }
              : null,
          })),
      };

      const result = await importBulkExpensesAction(importPayload);

      if (!result.success) {
        throw new Error(result.error || 'Failed to import expenses');
      }

      setStep('SUCCESS');
      setIsProcessing(false);
      toast({
        title: 'Bulk Import Successful',
        description: `Successfully imported ${result.importedCount} expenses totaling ${formatCurrency(result.totalAmount)}.`,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error executing bulk import:', err);
      toast({
        title: 'Import Failed',
        description: err.message || 'An unexpected error occurred during import.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setStep('REVIEW');
    }
  };

  // Cancel Confirmation State
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // Execute cancel and cleanup
  const executeCancelDiscard = async () => {
    setIsCancelConfirmOpen(false);
    const blobUrls = items.map((i) => i.blob_url).filter(Boolean) as string[];
    if (blobUrls.length > 0) {
      deleteExpenseBlobsAction(blobUrls).catch(console.warn);
    }
    onClose();
  };

  // Cancel Import trigger
  const handleCancel = () => {
    if (items.length > 0 && (step === 'REVIEW' || step === 'CONFIRM')) {
      setIsCancelConfirmOpen(true);
    } else {
      executeCancelDiscard();
    }
  };
  // Helper to recursively read all files from dropped folders or files
  const extractFilesFromDataTransfer = async (dataTransfer: DataTransfer): Promise<File[]> => {
    const files: File[] = [];

    if (dataTransfer.items && dataTransfer.items.length > 0) {
      const entries: { entry: any; basePath: string }[] = [];
      for (let i = 0; i < dataTransfer.items.length; i++) {
        const item = dataTransfer.items[i];
        if (item.kind === 'file') {
          const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
          if (entry) {
            entries.push({ entry, basePath: '' });
          } else {
            const f = item.getAsFile();
            if (f) files.push(f);
          }
        }
      }

      const readEntryRecursively = async (entry: any, currentPath: string) => {
        if (entry.isFile) {
          await new Promise<void>((resolve) => {
            entry.file(
              (file: File) => {
                const relPath = `${currentPath}${file.name}`;
                Object.defineProperty(file, 'webkitRelativePath', {
                  value: relPath,
                  writable: true,
                  configurable: true,
                });
                files.push(file);
                resolve();
              },
              () => resolve()
            );
          });
        } else if (entry.isDirectory) {
          const reader = entry.createReader();
          const readBatch = (): Promise<any[]> =>
            new Promise((resolve, reject) => reader.readEntries(resolve, reject));

          let dirEntries: any[] = [];
          let batch: any[] = [];
          try {
            do {
              batch = await readBatch();
              dirEntries = dirEntries.concat(batch);
            } while (batch.length > 0);
          } catch (e) {
            console.warn('Error reading directory entries:', e);
          }

          for (const subEntry of dirEntries) {
            await readEntryRecursively(subEntry, `${currentPath}${entry.name}/`);
          }
        }
      };

      for (const { entry, basePath } of entries) {
        await readEntryRecursively(entry, basePath);
      }
    } else if (dataTransfer.files && dataTransfer.files.length > 0) {
      files.push(...Array.from(dataTransfer.files));
    }

    return files;
  };

  // Helper to open file or folder picker
  const triggerFolderPicker = () => {
    if (!selectedPropertyId) {
      toast({
        title: 'Select Property First',
        description: 'Please pick a Property from the dropdown before uploading documents.',
        variant: 'destructive',
      });
      return;
    }
    folderInputRef.current?.click();
  };

  const triggerFilePicker = () => {
    if (!selectedPropertyId) {
      toast({
        title: 'Select Property First',
        description: 'Please pick a Property from the dropdown before uploading documents.',
        variant: 'destructive',
      });
      return;
    }
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[98vw] 2xl:max-w-[1720px] h-[94vh] bg-white dark:bg-[#0b1320] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* =========================================================================
            HEADER BAR
           ========================================================================= */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-[#0f1a2d]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-500/20">
              <FolderUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Bulk Expense Upload
                {step === 'REVIEW' && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                    Review Staged Items ({items.length})
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload a folder of expense documents, verify extracted amounts and classifications, then import to ledger.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step === 'REVIEW' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 border-slate-300 dark:border-slate-700"
              >
                Cancel Batch
              </Button>
            )}
            <button
              onClick={handleCancel}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            BODY CONTENT (BASED ON STEP)
           ========================================================================= */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-[#0b1320]">
          {/* -----------------------------------------------------------------------
              STEP 1: SETUP & FOLDER UPLOAD
             ----------------------------------------------------------------------- */}
          {step === 'SETUP' && (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-4xl mx-auto w-full flex flex-col justify-center gap-8">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Select Property & Upload Expense Folder
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-medium">
                  Select the default Property and Lease relationship for this batch, then choose or drag your folder of invoices and receipts.
                </p>
              </div>

              {/* Property, Lease, Payment Status & Tax Classification Selection Card */}
              <div className="p-6 bg-slate-50/90 dark:bg-[#131d2e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Financial Year Selector (MANDATORY) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      Financial Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      data-testid="bulk-financial-year-select"
                      value={selectedFinancialYear}
                      onChange={(e) => setSelectedFinancialYear(e.target.value)}
                      className="w-full text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18263e] px-3.5 py-2.5 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    >
                      {getAvailableFinancialYears().map((fy) => (
                        <option key={fy.value} value={fy.value}>
                          {fy.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Property Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      Property <span className="text-red-500">*</span>
                    </label>
                    <select
                      data-testid="bulk-property-select"
                      value={selectedPropertyId}
                      onChange={(e) => {
                        setSelectedPropertyId(e.target.value);
                        setSelectedLeaseId('');
                      }}
                      className="w-full text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18263e] px-3.5 py-2.5 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    >
                      <option value="">Select Property ▼</option>
                      {filteredProperties.map((p, idx) => {
                        const pId = p.id || p.propertyId || p.property_id || `prop-${idx}`;
                        const pName = p.name || p.propertyName || p.address_line_1 || 'Property';
                        return (
                          <option key={pId} value={pId}>
                            {pName} {p.suburb ? `(${p.suburb})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Lease Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      Lease Relationship
                    </label>
                    <select
                      data-testid="bulk-lease-select"
                      value={selectedLeaseId}
                      onChange={(e) => setSelectedLeaseId(e.target.value)}
                      disabled={!selectedPropertyId || propertyLeases.length === 0}
                      className="w-full text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18263e] px-3.5 py-2.5 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-[#131d2e]"
                    >
                      {propertyLeases.length === 0 ? (
                        <option value="">No active lease for this property</option>
                      ) : (
                        <>
                          <option value="">Select Lease ▼</option>
                          {propertyLeases.map((l, idx) => {
                            const lId = l.id || `lease-${idx}`;
                            return (
                              <option key={lId} value={lId}>
                                Lease #{l.lease_number || lId.substring(0, 8)} ({l.status || 'Active'})
                              </option>
                            );
                          })}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Category Selector (OPTIONAL) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      Category <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <select
                      data-testid="bulk-optional-category-select"
                      value={selectedOptionalCategoryId}
                      onChange={(e) => setSelectedOptionalCategoryId(e.target.value)}
                      className="w-full text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18263e] px-3.5 py-2.5 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    >
                      <option value="">Auto-detect from folder / Unassigned</option>
                      {categories.filter((c) => c.transaction_type === 'expense').map((cat, idx) => (
                        <option key={cat.id || `cat-${idx}`} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Default Payment Status Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      Payment Status
                    </label>
                    <select
                      data-testid="bulk-payment-status-select"
                      value={defaultPaymentStatus}
                      onChange={(e) => setDefaultPaymentStatus(e.target.value as 'paid' | 'unpaid')}
                      className="w-full text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18263e] px-3.5 py-2.5 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    >
                      <option value="paid">✓ Paid (Complete)</option>
                      <option value="unpaid">⏳ Unpaid (Pending Bill)</option>
                    </select>
                  </div>

                  {/* Default Tax Classification Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      Tax Classification
                    </label>
                    <select
                      data-testid="bulk-default-tax-class-select"
                      value={defaultTaxClassId}
                      disabled={defaultPaymentStatus === 'unpaid'}
                      onChange={(e) => setDefaultTaxClassId(e.target.value)}
                      className="w-full text-sm font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18263e] px-3.5 py-2.5 text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-[#131d2e]"
                    >
                      {defaultPaymentStatus === 'unpaid' ? (
                        <option value="">No GST (Unpaid / Pending)</option>
                      ) : (
                        <>
                          <option value="">Auto-detect from Folder</option>
                          {taxClassifications.map((t, idx) => (
                            <option key={t.id || `tax-${idx}`} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* File & Folder Upload Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  if (!selectedPropertyId) {
                    toast({
                      title: 'Select Property First',
                      description: 'Please pick a Property from the dropdown before uploading documents.',
                      variant: 'destructive',
                    });
                    return;
                  }
                  if (e.dataTransfer) {
                    const extractedFiles = await extractFilesFromDataTransfer(e.dataTransfer);
                    if (extractedFiles.length > 0) {
                      handleFolderSelected(extractedFiles);
                    }
                  }
                }}
                className={cn(
                  'relative border-2 border-dashed rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center text-center transition-all duration-200',
                  selectedPropertyId
                    ? 'border-teal-500/60 bg-teal-500/[0.03] dark:bg-teal-500/[0.05] shadow-sm'
                    : 'border-slate-300 dark:border-slate-700/80 bg-slate-50/50 dark:bg-[#121c2e]/50 opacity-70'
                )}
              >
                {/* Standard multi-file input (bypasses browser folder alert) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  data-testid="bulk-file-input"
                  className="hidden"
                  onChange={(e) => handleFolderSelected(e.target.files)}
                />

                {/* Directory / Folder input */}
                <input
                  ref={folderInputRef}
                  type="file"
                  /* @ts-ignore */
                  webkitdirectory=""
                  directory=""
                  multiple
                  data-testid="bulk-folder-input"
                  className="hidden"
                  onChange={(e) => handleFolderSelected(e.target.files)}
                />

                <div className="p-4 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl mb-4 shadow-sm border border-teal-500/20">
                  <FolderUp className="w-9 h-9" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                  Upload Expense Folder or Documents
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mb-6 font-medium leading-relaxed">
                  Select an entire folder of organized expenses or select multiple invoice receipts directly. Drag-and-drop folders or files anytime.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="button"
                    size="md"
                    disabled={!selectedPropertyId}
                    onClick={triggerFolderPicker}
                    className="rounded-xl px-6 font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-md gap-2"
                  >
                    <FolderUp className="w-4 h-4" />
                    Choose Entire Folder
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    disabled={!selectedPropertyId}
                    onClick={triggerFilePicker}
                    className="rounded-xl px-5 font-semibold border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Select Files Directly
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------------------
              STEP 2: SCANNING & PROCESSING PROGRESS
             ----------------------------------------------------------------------- */}
          {step === 'PROCESSING' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-sm animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Scanning & Parsing Folder Structure...
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{progressText}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full space-y-2">
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700">
                  <div
                    className="bg-teal-600 h-full transition-all duration-300 rounded-full"
                    style={{
                      width: totalFilesToProcess > 0 ? `${(processedCount / totalFilesToProcess) * 100}%` : '20%',
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                  <span>Processing Files</span>
                  <span>
                    {processedCount} / {totalFilesToProcess}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------------------
              STEP 3: INTERACTIVE REVIEW TABLE (PRIMARY WORKFLOW UI)
             ----------------------------------------------------------------------- */}
          {step === 'REVIEW' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0b1320]">
              {/* KPI Summary Cards Bar */}
              <div className="px-6 py-3.5 bg-slate-50 dark:bg-[#0f1a2d] border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="px-4 py-2.5 bg-white dark:bg-[#142033] rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-200">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Documents</div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">{kpis.total}</div>
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-white dark:bg-[#142033] rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Ready to Import</div>
                    <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{kpis.ready}</div>
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-white dark:bg-[#142033] rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      kpis.attention > 0
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    )}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Need Attention</div>
                    <div
                      className={cn(
                        'text-sm font-extrabold',
                        kpis.attention > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                      )}
                    >
                      {kpis.attention}
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-white dark:bg-[#142033] rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Paid / Unpaid</div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="text-emerald-600 dark:text-emerald-400">{kpis.paidCount} Paid</span>
                      <span className="text-slate-300 dark:text-slate-600">/</span>
                      <span className="text-amber-600 dark:text-amber-400">{kpis.unpaidCount} Unpaid</span>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-white dark:bg-[#142033] rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center gap-3">
                  <div className="p-2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Detected Total</div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(kpis.totalAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Toolbar & Filters */}
              <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0b1320]">
                {/* Status Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {(
                    [
                      { id: 'ALL', label: `All (${items.length})` },
                      { id: 'READY', label: `✓ Ready (${kpis.ready})` },
                      { id: 'NEEDS_ATTENTION', label: `⚠ Needs Attention (${kpis.attention})` },
                      { id: 'PAID', label: `✓ Paid (${kpis.paidCount})` },
                      { id: 'UNPAID', label: `⏳ Unpaid (${kpis.unpaidCount})` },
                      { id: 'MISSING_AMOUNT', label: 'Missing Amount' },
                      { id: 'CONFLICTS', label: 'Conflicts' },
                    ] as const
                  ).map((filterOption) => (
                    <button
                      key={filterOption.id}
                      onClick={() => setSelectedFilter(filterOption.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
                        selectedFilter === filterOption.id
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-[#152238] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1b2b46]'
                      )}
                    >
                      {filterOption.label}
                    </button>
                  ))}
                </div>

                {/* Search Bar & Bulk Actions */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search items, files, folders..."
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                      className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-900 dark:text-slate-100 w-48 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    />
                  </div>

                  {selectedItemIds.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30 px-3 py-1 rounded-lg text-xs font-bold animate-in fade-in">
                      <span>{selectedItemIds.length} selected</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsBulkEditOpen(true)}
                        className="h-6 px-2 text-xs text-teal-700 dark:text-teal-300 hover:bg-teal-500/20"
                      >
                        Bulk Edit
                      </Button>
                      <button
                        onClick={handleBulkDelete}
                        className="text-red-600 dark:text-red-400 hover:opacity-80 p-0.5"
                        title="Delete selected"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bulk Edit Drawer/Bar */}
              {isBulkEditOpen && (
                <div className="px-6 py-3 bg-teal-500/5 dark:bg-teal-500/10 border-b border-teal-500/20 flex items-center justify-between gap-4 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                      Bulk Edit {selectedItemIds.length} Items:
                    </span>
                    <select
                      value={bulkCategory}
                      onChange={(e) => setBulkCategory(e.target.value)}
                      className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] px-2.5 py-1 text-slate-900 dark:text-slate-100 font-medium"
                    >
                      <option value="">Set Category...</option>
                      {allCategories.map((c, idx) => (
                        <option key={c.id || `bulk-cat-${idx}`} value={c.id}>
                          {c.id?.startsWith('new:') ? `✦ ${c.name} (New)` : c.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={bulkTaxClass}
                      onChange={(e) => setBulkTaxClass(e.target.value)}
                      className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] px-2.5 py-1 text-slate-900 dark:text-slate-100 font-medium"
                    >
                      <option value="">Set Tax Classification...</option>
                      {taxClassifications.map((t, idx) => (
                        <option key={t.id || `bulk-tax-${idx}`} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={bulkPaymentStatus}
                      onChange={(e) => setBulkPaymentStatus(e.target.value as '' | 'paid' | 'unpaid')}
                      className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] px-2.5 py-1 text-slate-900 dark:text-slate-100 font-medium"
                    >
                      <option value="">Set Payment Status...</option>
                      <option value="paid">✓ Paid (Complete Transaction)</option>
                      <option value="unpaid">⏳ Unpaid (Pending Bill)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleBulkApply} className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                      Apply to Selected
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsBulkEditOpen(false)}
                      className="h-7 text-xs border-slate-300 dark:border-slate-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Review Table Layout - Breathable & Horizontally Scrollable */}
              <div className="flex-1 overflow-auto flex">
                <div className="flex-1 overflow-x-auto overflow-y-auto">
                  <table className="min-w-[1600px] w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100/95 dark:bg-[#121c2e]/95 backdrop-blur z-10 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold">
                      <tr>
                        <th className="py-3 px-3.5 w-10">
                          <input
                            type="checkbox"
                            checked={
                              filteredItems.length > 0 &&
                              selectedItemIds.length === filteredItems.length
                            }
                            onChange={toggleSelectAll}
                            className="rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500/20"
                          />
                        </th>
                        <th className="py-3 px-3.5 w-36 min-w-[130px]">Status</th>
                        <th className="py-3 px-3.5 w-32 min-w-[110px]">Payment</th>
                        <th className="py-3 px-3.5 min-w-[210px] max-w-[240px]">Document & Folder</th>
                        <th className="py-3 px-3.5 min-w-[190px]">Description</th>
                        <th className="py-3 px-3.5 min-w-[160px]">Supplier</th>
                        <th className="py-3 px-3.5 min-w-[145px]">Date</th>
                        <th className="py-3 px-3.5 min-w-[135px]">Amount ($)</th>
                        <th className="py-3 px-3.5 min-w-[210px]">Tax Classification</th>
                        <th className="py-3 px-3.5 min-w-[115px]">GST ($)</th>
                        <th className="py-3 px-3.5 min-w-[210px]">Category</th>
                        <th className="py-3 px-3.5 w-20 min-w-[80px] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-[#0b1320]">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="text-center py-16 text-slate-500 dark:text-slate-400 font-medium">
                            No items found matching the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item) => {
                          const isSelected = selectedItemIds.includes(item.id);
                          const isReady = item.validation_status === 'READY';
                          const isMissingAmt =
                            item.amount === null || item.amount === undefined || Number(item.amount) <= 0;
                          const isSkipped = skippedItemIds.has(item.id);
                          const isItemPaid = (item.payment_status || item.paymentStatus) !== 'unpaid';

                          return (
                            <tr
                              key={item.id}
                              className={cn(
                                'hover:bg-slate-50/80 dark:hover:bg-[#142033] transition-colors group',
                                isSelected && 'bg-teal-500/[0.04] dark:bg-teal-500/[0.08]',
                                !isReady && 'bg-amber-500/[0.03] dark:bg-amber-500/[0.05]',
                                isSkipped && 'opacity-40 line-through bg-slate-100/80 dark:bg-slate-900/60'
                              )}
                            >
                              {/* Checkbox */}
                              <td className="py-3 px-3.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectRow(item.id)}
                                  className="rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500/20"
                                />
                              </td>

                              {/* Validation Status Badge */}
                              <td className="py-3 px-3.5">
                                {isReady ? (
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Ready
                                  </span>
                                ) : item.conflict_type === 'DUPLICATE_FILE' ? (
                                  <div className="flex flex-col gap-1 items-start">
                                    <span
                                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 cursor-pointer"
                                      title={item.conflict_message || 'Duplicate file detected'}
                                      onClick={() => setPreviewItem(item)}
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      Duplicate
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => toggleSkipItem(item.id)}
                                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline pl-1"
                                    >
                                      {skippedItemIds.has(item.id) ? 'Include' : 'Skip'}
                                    </button>
                                  </div>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 cursor-pointer"
                                    title={item.conflict_message || 'Needs attention'}
                                    onClick={() => setPreviewItem(item)}
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {item.conflict_type === 'MISSING_AMOUNT'
                                      ? 'Missing Price'
                                      : item.conflict_type === 'AMOUNT_CONFLICT'
                                      ? 'Price Conflict'
                                      : item.conflict_type === 'MISSING_DATE'
                                      ? 'FY Mismatch'
                                      : 'Attention'}
                                  </span>
                                )}
                              </td>

                              {/* Payment Status Toggle / Selector */}
                              <td className="py-3 px-3.5">
                                <select
                                  value={isItemPaid ? 'paid' : 'unpaid'}
                                  onChange={(e) => {
                                    const newStatus = e.target.value as 'paid' | 'unpaid';
                                    handleInlineItemUpdate(item.id, {
                                      payment_status: newStatus,
                                      paymentStatus: newStatus,
                                    });
                                  }}
                                  className={cn(
                                    'text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-colors',
                                    isItemPaid
                                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                  )}
                                >
                                  <option value="paid" className="bg-white dark:bg-[#152238] text-slate-900 dark:text-white font-medium">✓ Paid</option>
                                  <option value="unpaid" className="bg-white dark:bg-[#152238] text-slate-900 dark:text-white font-medium">⏳ Unpaid</option>
                                </select>
                              </td>

                              {/* Document & Folder Context */}
                              <td className="py-3 px-3.5">
                                <div className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[230px]" title={item.file_name}>
                                  {item.file_name}
                                </div>
                                {item.folder_name && (
                                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate max-w-[230px] mt-0.5">
                                    <FolderUp className="w-3 h-3 opacity-70 shrink-0 text-teal-600 dark:text-teal-400" />
                                    <span className="truncate">{normalizeFolderName(item.folder_name)}</span>
                                  </div>
                                )}
                              </td>

                              {/* Description (Inline Editable) */}
                              <td className="py-3 px-3.5">
                                <input
                                  type="text"
                                  value={item.description || ''}
                                  onChange={(e) =>
                                    handleInlineItemUpdate(item.id, { description: e.target.value })
                                  }
                                  placeholder="Enter description..."
                                  className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 shadow-2xs transition-all"
                                />
                              </td>

                              {/* Supplier (Inline Editable) */}
                              <td className="py-3 px-3.5">
                                <input
                                  type="text"
                                  value={item.supplier || ''}
                                  onChange={(e) =>
                                    handleInlineItemUpdate(item.id, { supplier: e.target.value })
                                  }
                                  placeholder="Supplier name..."
                                  className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 shadow-2xs transition-all"
                                />
                              </td>

                              {/* Date (Inline Editable) */}
                              <td className="py-3 px-3.5">
                                <input
                                  type="date"
                                  value={item.transaction_date || ''}
                                  onChange={(e) =>
                                    handleInlineItemUpdate(item.id, { transaction_date: e.target.value })
                                  }
                                  className="w-full text-xs font-mono font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 shadow-2xs transition-all"
                                />
                              </td>

                              {/* Amount ($) (Inline Editable & Validated) */}
                              <td className="py-3 px-3.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.amount !== null && item.amount !== undefined ? item.amount : ''}
                                  onChange={(e) => {
                                    const val = e.target.value ? parseFloat(e.target.value) : null;
                                    const isGstFree = item.tax_classification_name?.toLowerCase().includes('free') || item.gst_treatment === 'none';
                                    const gstAmt = val && isItemPaid && !isGstFree
                                      ? Math.round((val * 0.1) * 100) / 100
                                      : 0;
                                    handleInlineItemUpdate(item.id, { amount: val, gst_amount: gstAmt });
                                  }}
                                  placeholder="0.00"
                                  className={cn(
                                    'w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border transition-all shadow-2xs focus:outline-none focus:ring-2',
                                    isMissingAmt
                                      ? 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-200 focus:ring-amber-500/40'
                                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-900 dark:text-white focus:border-teal-500 focus:ring-teal-500/40'
                                  )}
                                />
                              </td>

                              {/* Tax Classification (Editable for Paid, disabled/no-gst for Unpaid) */}
                              <td className="py-3 px-3.5">
                                {isItemPaid ? (
                                  <select
                                    value={item.tax_classification_id || ''}
                                    onChange={(e) => {
                                      handleInlineItemUpdate(item.id, {
                                        tax_classification_id: e.target.value || null,
                                      });
                                    }}
                                    className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 shadow-2xs"
                                  >
                                    <option value="">Auto / Standard Taxable</option>
                                    {taxClassifications.map((t, idx) => (
                                      <option key={t.id || `row-tax-${idx}`} value={t.id}>
                                        {t.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500 italic px-2 py-1.5 font-medium block">
                                    No GST (Unpaid)
                                  </span>
                                )}
                              </td>

                              {/* GST ($) (Inline Editable if Paid, 0.00 if Unpaid) */}
                              <td className="py-3 px-3.5">
                                {isItemPaid ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.gst_amount !== null && item.gst_amount !== undefined ? item.gst_amount : ''}
                                    onChange={(e) =>
                                      handleInlineItemUpdate(item.id, {
                                        gst_amount: e.target.value ? parseFloat(e.target.value) : 0,
                                      })
                                    }
                                    placeholder="0.00"
                                    className="w-full text-xs font-mono font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 shadow-2xs"
                                  />
                                ) : (
                                  <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 px-2 py-1.5 block">$0.00</span>
                                )}
                              </td>

                              {/* Category (Dropdown) */}
                              <td className="py-3 px-3.5">
                                <select
                                  value={item.category_id || ''}
                                  onChange={(e) => {
                                    const catId = e.target.value;
                                    const catName = allCategories.find((c) => c.id === catId)?.name;
                                    handleInlineItemUpdate(item.id, {
                                      category_id: catId,
                                      category_name: catName,
                                    });
                                  }}
                                  className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#152238] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 shadow-2xs"
                                >
                                  <option value="">Select Category...</option>
                                  {allCategories.map((c, idx) => (
                                    <option key={c.id || `row-cat-${idx}`} value={c.id}>
                                      {c.id?.startsWith('new:') ? `✦ ${c.name} (New)` : c.name}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setPreviewItem(item)}
                                    className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="View Document & Extraction"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDraftItem(item.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Delete row"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ===================================================================
                    DOCUMENT PREVIEW DRAWER (SPLIT SCREEN)
                   =================================================================== */}
                {previewItem && (
                  <div className="w-96 border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f1a2d] p-5 flex flex-col gap-4 overflow-y-auto animate-in slide-in-from-right-4 duration-200 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                          {previewItem.file_name}
                        </span>
                      </div>
                      <button
                        onClick={() => setPreviewItem(null)}
                        className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Payment Status in Drawer */}
                    <div className="p-3 bg-white dark:bg-[#131d2e] rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Payment Status</span>
                        <span className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                          (previewItem.payment_status || previewItem.paymentStatus) !== 'unpaid'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        )}>
                          {(previewItem.payment_status || previewItem.paymentStatus) !== 'unpaid' ? '✓ Paid' : '⏳ Unpaid'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => {
                            handleInlineItemUpdate(previewItem.id, {
                              payment_status: 'paid',
                              paymentStatus: 'paid',
                            });
                          }}
                          className={cn(
                            'py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center',
                            (previewItem.payment_status || previewItem.paymentStatus) !== 'unpaid'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          )}
                        >
                          ✓ Paid
                        </button>
                        <button
                          onClick={() => {
                            handleInlineItemUpdate(previewItem.id, {
                              payment_status: 'unpaid',
                              paymentStatus: 'unpaid',
                            });
                          }}
                          className={cn(
                            'py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center',
                            (previewItem.payment_status || previewItem.paymentStatus) === 'unpaid'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          )}
                        >
                          ⏳ Unpaid (Pending)
                        </button>
                      </div>
                    </div>

                    {/* Conflict Resolution Box if any */}
                    {previewItem.conflict_type === 'AMOUNT_CONFLICT' && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                        <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Amount Conflict Detected
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          Filename specifies <span className="font-bold text-slate-900 dark:text-white">${previewItem.extraction_metadata?.filename_amount}</span> whereas document indicates <span className="font-bold text-slate-900 dark:text-white">${previewItem.extraction_metadata?.document_amount}</span>.
                        </p>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2 font-semibold"
                            onClick={() =>
                              handleInlineItemUpdate(previewItem.id, {
                                amount: previewItem.extraction_metadata?.filename_amount,
                              })
                            }
                          >
                            Use ${previewItem.extraction_metadata?.filename_amount}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2 font-semibold"
                            onClick={() =>
                              handleInlineItemUpdate(previewItem.id, {
                                amount: previewItem.extraction_metadata?.document_amount,
                              })
                            }
                          >
                            Use ${previewItem.extraction_metadata?.document_amount}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Source Metadata & Extraction Indicators */}
                    <div className="space-y-3.5 text-xs">
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Description</div>
                        <div className="font-bold text-slate-900 dark:text-white">{previewItem.description || '—'}</div>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          Source: {previewItem.extraction_metadata?.description_source || 'FILENAME'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Amount & Tax</div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {previewItem.amount ? formatCurrency(previewItem.amount) : 'Missing'}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                          {(previewItem.payment_status || previewItem.paymentStatus) !== 'unpaid' ? (
                            <span>
                              GST: <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(previewItem.gst_amount || 0)}</span> ({previewItem.tax_classification_name || 'Taxable Operating'})
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold italic">No GST (Unpaid Expense)</span>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          Source: {previewItem.extraction_metadata?.amount_source || 'FILENAME'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Category Context</div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {previewItem.category_name || normalizeFolderName(previewItem.folder_name) || 'Other Expense'}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          Source: {previewItem.extraction_metadata?.category_source || 'FOLDER'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Relative Folder Path</div>
                        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800/70 p-2 rounded break-all font-medium">
                          {previewItem.source_path}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------------------
              STEP 4: FINAL CONFIRMATION SUMMARY
             ----------------------------------------------------------------------- */}
          {step === 'CONFIRM' && (
            <div className="flex-1 overflow-y-auto p-8 max-w-xl mx-auto w-full flex flex-col justify-center space-y-6 bg-white dark:bg-[#0b1320]">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center border border-teal-500/20 shadow-sm">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Ready to Import Expenses
                </h3>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Review the summary below before creating the permanent ledger transaction records.
                </p>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-[#131d2e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Total Expenses</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{items.length} records</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Assigned Property</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {properties.find((p) => (p.id || p.propertyId) === selectedPropertyId)?.name || 'Selected Property'}
                  </span>
                </div>
                {selectedLeaseId && (
                  <div className="py-2.5 flex justify-between">
                    <span className="font-medium text-slate-500 dark:text-slate-400">Assigned Lease</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Lease #{leases.find((l) => l.id === selectedLeaseId)?.lease_number || selectedLeaseId.substring(0, 8)}
                    </span>
                  </div>
                )}
                <div className="py-2.5 flex justify-between">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Payment Breakdown</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{kpis.paidCount} Paid</span> ({formatCurrency(kpis.paidAmount)})
                    {' · '}
                    <span className="text-amber-600 dark:text-amber-400 font-extrabold">{kpis.unpaidCount} Unpaid</span> ({formatCurrency(kpis.unpaidAmount)})
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Total Detected Amount</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {formatCurrency(kpis.totalAmount)}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Total GST</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {formatCurrency(kpis.totalGst)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('REVIEW')}
                  className="flex-1 rounded-xl font-semibold border-slate-300 dark:border-slate-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Review
                </Button>
                <Button
                  onClick={handleExecuteImport}
                  className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md"
                >
                  Import {items.length} Expenses
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------------------
              STEP 5: IMPORTING IN PROGRESS
             ----------------------------------------------------------------------- */}
          {step === 'IMPORTING' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center space-y-6 bg-white dark:bg-[#0b1320]">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-sm animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Importing Transactions...</h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Creating ledger records and permanent attachment references in Supabase.
                </p>
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------------------
              STEP 6: SUCCESS SUMMARY
             ----------------------------------------------------------------------- */}
          {step === 'SUCCESS' && (
            <div className="flex-1 overflow-y-auto p-8 max-w-md mx-auto w-full flex flex-col justify-center text-center space-y-6 bg-white dark:bg-[#0b1320]">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Import Completed Successfully!
                </h3>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {items.length} expenses have been created as normal transactions and linked to the selected property.
                </p>
              </div>

              <div className="p-5 bg-slate-50 dark:bg-[#131d2e] border border-slate-200 dark:border-slate-800 rounded-2xl text-xs space-y-2.5 text-left shadow-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Property:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {properties.find((p) => (p.id || p.propertyId) === selectedPropertyId)?.name || 'Selected Property'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500 dark:text-slate-400">Imported Total:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(kpis.totalAmount)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    onClose();
                    if (onSuccess) onSuccess();
                  }}
                  className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md"
                >
                  View Expenses
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            FOOTER ACTION BAR (FOR REVIEW STEP)
           ========================================================================= */}
        {step === 'REVIEW' && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f1a2d] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs font-medium">
              {kpis.attention > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    {kpis.attention} row(s) need attention before importing
                  </span>
                  {selectedFilter !== 'NEEDS_ATTENTION' && (
                    <button
                      type="button"
                      onClick={() => setSelectedFilter('NEEDS_ATTENTION')}
                      className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-bold transition-colors"
                    >
                      Focus Attention Items
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  All {items.length} rows valid and ready to import
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleCancel} className="rounded-xl text-xs font-semibold border-slate-300 dark:border-slate-700">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!kpis.canImport || isProcessing}
                onClick={() => setStep('CONFIRM')}
                className="rounded-xl text-xs font-bold px-5 bg-teal-600 hover:bg-teal-700 text-white shadow-md disabled:opacity-50"
              >
                Proceed to Import ({items.length})
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Discard Batch Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        title="Discard Staged Import?"
        description={`You have ${items.length} processed expense item(s). If you cancel now, these staged items will be discarded.`}
        confirmLabel="Yes, Discard Batch"
        cancelLabel="Keep Reviewing"
        variant="danger"
        onConfirm={executeCancelDiscard}
        onClose={() => setIsCancelConfirmOpen(false)}
      />
    </div>
  );
}
