'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Eye,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ALLOWED_RECEIPT_EXTENSIONS,
  MAX_RECEIPT_FILE_SIZE,
  validateReceiptFile,
} from '@/modules/finance/domain/validation';
import { ReceiptAttachment as ReceiptAttachmentType } from '@/modules/finance/domain/types';
import {
  uploadTransactionReceiptAction,
  removeTransactionReceiptAction,
} from '@/app/actions/finance';

export interface ReceiptAttachmentProps {
  receipt?: ReceiptAttachmentType | null;
  selectedFile?: File | null;
  onFileSelect?: (file: File | null) => void;
  onReceiptUploaded?: (receipt: ReceiptAttachmentType) => void;
  onReceiptRemoved?: () => void;
  transactionId?: string;
  editable?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Format bytes to human-readable string (e.g., 842 KB, 1.4 MB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function ReceiptAttachment({
  receipt,
  selectedFile,
  onFileSelect,
  onReceiptUploaded,
  onReceiptRemoved,
  transactionId,
  editable = true,
  disabled = false,
  className,
}: ReceiptAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localFile, setLocalFile] = useState<File | null>(selectedFile || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  // Sync selectedFile with parent
  useEffect(() => {
    if (selectedFile !== undefined) {
      setLocalFile(selectedFile);
    }
  }, [selectedFile]);

  // Generate thumbnail preview for local image files
  useEffect(() => {
    if (localFile && localFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(localFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [localFile]);

  const handleFileChosen = (file: File | null) => {
    setErrorMessage(null);
    if (!file) {
      setLocalFile(null);
      onFileSelect?.(null);
      return;
    }

    const validation = validateReceiptFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLocalFile(file);
    onFileSelect?.(file);

    // If transactionId is provided (e.g. in Edit mode), immediately upload the replacement
    if (transactionId) {
      handleDirectUpload(file);
    }
  };

  const handleDirectUpload = async (fileToUpload: File) => {
    if (!transactionId) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('transactionId', transactionId);
      formData.append('receipt', fileToUpload);

      const res = await uploadTransactionReceiptAction(formData);

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to upload receipt');
      }

      onReceiptUploaded?.(res.data);
      setLocalFile(null);
      onFileSelect?.(null);
    } catch (err: any) {
      console.error('Upload receipt failed:', err);
      setErrorMessage(err.message || 'We could not upload the receipt. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveReceipt = async () => {
    setShowConfirmRemove(false);

    // If only a local un-uploaded file is selected, simply clear it
    if (localFile && !receipt) {
      setLocalFile(null);
      onFileSelect?.(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!transactionId) {
      onReceiptRemoved?.();
      return;
    }

    setIsRemoving(true);
    setErrorMessage(null);

    try {
      const res = await removeTransactionReceiptAction(transactionId);
      if (!res.success) {
        throw new Error(res.error || 'Failed to remove receipt');
      }

      onReceiptRemoved?.();
      setLocalFile(null);
      onFileSelect?.(null);
    } catch (err: any) {
      console.error('Remove receipt failed:', err);
      setErrorMessage(err.message || 'Failed to remove receipt.');
    } finally {
      setIsRemoving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && editable) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || !editable) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChosen(e.dataTransfer.files[0]);
    }
  };

  const activeReceiptUrl = receipt?.url;
  const isImageReceipt =
    Boolean(activeReceiptUrl && (receipt?.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(receipt.fileName || ''))) ||
    Boolean(previewUrl);

  const displayName = localFile?.name || receipt?.fileName || 'receipt';
  const displaySize = localFile ? formatFileSize(localFile.size) : receipt?.fileSize ? formatFileSize(receipt.fileSize) : '';

  return (
    <div className={cn('space-y-3', className)}>
      {/* Hidden native accessible file input */}
      <input
        ref={fileInputRef}
        id="receipt-file-input"
        type="file"
        accept={ALLOWED_RECEIPT_EXTENSIONS.join(',')}
        className="sr-only"
        disabled={disabled || !editable || isUploading || isRemoving}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileChosen(e.target.files[0]);
          }
        }}
      />

      {/* ERROR ALERT */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="flex-1 font-medium">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 rounded"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* CONFIRMATION MODAL / BANNER FOR REMOVING */}
      {showConfirmRemove && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">Remove receipt?</p>
              <p className="text-amber-700 dark:text-amber-300">
                This will remove the attached receipt from this expense.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowConfirmRemove(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRemoveReceipt}
              className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
            >
              Remove Receipt
            </button>
          </div>
        </div>
      )}

      {/* STATE 1: ACTIVE RECEIPT (Either Uploaded in Supabase or Selected locally in Form) */}
      {(receipt || localFile) ? (
        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm space-y-3 transition-all">
          <div className="flex items-center gap-3">
            {/* Thumbnail or File Icon */}
            {isImageReceipt && (previewUrl || activeReceiptUrl) ? (
              <div
                onClick={() => setShowLightbox(true)}
                className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer relative group flex items-center justify-center"
                title="Click to view full receipt"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl || activeReceiptUrl || ''}
                  alt={displayName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Eye className="w-4 h-4 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center justify-center shrink-0 text-sky-600 dark:text-sky-400">
                <FileText className="w-6 h-6" />
              </div>
            )}

            {/* Meta info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate" title={displayName}>
                  {displayName}
                </p>
                {receipt && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3" /> Attached
                  </span>
                )}
                {localFile && !receipt && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    Ready to save
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {displaySize}
                {receipt?.uploadedAt && (
                  <span>
                    {' '}• Uploaded {new Date(receipt.uploadedAt).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            <div className="flex items-center gap-2">
              {/* View Button */}
              {(activeReceiptUrl || previewUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeReceiptUrl) {
                      window.open(activeReceiptUrl, '_blank', 'noopener,noreferrer');
                    } else if (previewUrl) {
                      setShowLightbox(true);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  View
                </button>
              )}

              {/* Replace Button */}
              {editable && !disabled && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isRemoving}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  {isUploading ? 'Uploading...' : 'Replace'}
                </button>
              )}
            </div>

            {/* Remove Button */}
            {editable && !disabled && (
              <button
                type="button"
                onClick={() => {
                  if (receipt) {
                    setShowConfirmRemove(true);
                  } else {
                    handleRemoveReceipt();
                  }
                }}
                disabled={isUploading || isRemoving}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors disabled:opacity-50"
              >
                {isRemoving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {isRemoving ? 'Removing...' : 'Remove'}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* STATE 2: EMPTY DROPZONE / UPLOAD TRIGGER */
        editable && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!disabled && !isUploading) fileInputRef.current?.click();
            }}
            className={cn(
              'group relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2',
              isDragging
                ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/30'
                : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:border-sky-400 hover:bg-sky-50/30 dark:hover:bg-slate-800/80',
              disabled && 'opacity-60 pointer-events-none'
            )}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            aria-label="Upload receipt for this expense"
          >
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 group-hover:scale-110 transition-all shadow-sm">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                Upload receipt
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                PDF, JPG, PNG or WebP • Max 10 MB
              </p>
            </div>
          </div>
        )
      )}

      {/* LIGHTBOX MODAL FOR IMAGE PREVIEWS */}
      {showLightbox && (previewUrl || activeReceiptUrl) && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2 border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-md">
                {displayName}
              </span>
              <button
                type="button"
                onClick={() => setShowLightbox(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[75vh] overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl || activeReceiptUrl || ''}
                alt={displayName}
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
