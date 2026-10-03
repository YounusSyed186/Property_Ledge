'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import {
  UnifiedDocument,
  DocumentStats,
  CreateDocumentInput,
  DocumentCategory,
} from '@/types/documents';
import { uploadDocumentToBlob, deleteDocumentFromBlob } from '@/lib/documents/storage';

/**
 * Fetch and aggregate all documents, receipts, inspection photos, and condition reports
 * across the active workspace into a unified document collection.
 */
export async function fetchWorkspaceDocumentsAction(filters?: {
  propertyId?: string;
  category?: DocumentCategory;
}): Promise<{
  success: boolean;
  data?: UnifiedDocument[];
  stats?: DocumentStats;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId)
      return { success: false, error: 'No active workspace' };

    const supabase = await createClient();
    const workspaceId = context.workspaceId;

    const unifiedList: UnifiedDocument[] = [];

    // 1. Fetch General Documents from public.documents
    try {
      let docQuery = (supabase as any)
        .from('documents')
        .select(
          `
          id,
          title,
          document_type,
          file_name,
          file_url,
          blob_path,
          file_size,
          mime_type,
          description,
          tags,
          created_at,
          property_id,
          properties (id, name, address_line_1)
        `
        )
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (filters?.propertyId) {
        docQuery = docQuery.eq('property_id', filters.propertyId);
      }

      const { data: docData, error: docError } = await docQuery;
      if (!docError && Array.isArray(docData)) {
        for (const doc of docData) {
          let cat: DocumentCategory = 'other';
          if (doc.document_type === 'receipt') cat = 'receipt';
          else if (doc.document_type === 'lease_agreement') cat = 'lease_agreement';
          else if (
            doc.document_type === 'insurance_policy' ||
            doc.document_type === 'compliance_certificate'
          )
            cat = 'compliance_insurance';
          else if (
            doc.document_type === 'strata_notice' ||
            doc.document_type === 'council_notice'
          )
            cat = 'strata_council';
          else if (doc.document_type === 'photo') cat = 'inspection_photo';
          else if (doc.document_type === 'condition_report') cat = 'condition_report';

          unifiedList.push({
            id: `doc-${doc.id}`,
            title: doc.title || doc.file_name,
            fileName: doc.file_name,
            fileUrl: doc.file_url,
            blobPath: doc.blob_path,
            fileSize: doc.file_size ? Number(doc.file_size) : null,
            mimeType: doc.mime_type || 'application/pdf',
            category: cat,
            propertyId: doc.property_id,
            propertyName: doc.properties?.name || null,
            propertyAddress: doc.properties?.address_line_1 || null,
            linkedEntityId: doc.id,
            linkedEntityType: 'custom',
            linkedEntityLabel: doc.document_type.replace(/_/g, ' '),
            uploadedAt: doc.created_at,
            notes: doc.description,
            source: 'database_document',
            tags: doc.tags || [],
            isVercelBlob: Boolean(
              doc.file_url?.includes('vercel-storage.com') || doc.blob_path
            ),
          });
        }
      }
    } catch (e) {
      console.warn('[DOCUMENTS_FETCH_DOCS_TABLE_WARN]', e);
    }

    // 2. Fetch Transaction Receipts (from public.transactions)
    try {
      let txQuery = (supabase as any)
        .from('transactions')
        .select(
          `
          id,
          description,
          amount,
          date,
          receipt_url,
          receipt_file_name,
          receipt_file_size,
          receipt_mime_type,
          receipt_uploaded_at,
          property_id,
          properties (id, name, address_line_1),
          categories (id, name)
        `
        )
        .eq('workspace_id', workspaceId)
        .not('receipt_url', 'is', null)
        .order('date', { ascending: false });

      if (filters?.propertyId) {
        txQuery = txQuery.eq('property_id', filters.propertyId);
      }

      const { data: txData, error: txError } = await txQuery;
      if (!txError && Array.isArray(txData)) {
        for (const tx of txData) {
          if (!tx.receipt_url) continue;
          const propName = tx.properties?.name || 'General Workspace';
          const catName = tx.categories?.name || 'Expense';
          const formattedAmount = `$${Number(tx.amount || 0).toFixed(2)}`;

          unifiedList.push({
            id: `receipt-tx-${tx.id}`,
            title: `Receipt: ${tx.description || catName}`,
            fileName: tx.receipt_file_name || 'receipt.pdf',
            fileUrl: tx.receipt_url,
            blobPath: null,
            fileSize: tx.receipt_file_size ? Number(tx.receipt_file_size) : null,
            mimeType: tx.receipt_mime_type || 'application/pdf',
            category: 'receipt',
            propertyId: tx.property_id,
            propertyName: propName,
            propertyAddress: tx.properties?.address_line_1 || null,
            linkedEntityId: tx.id,
            linkedEntityType: 'transaction',
            linkedEntityLabel: `${formattedAmount} - ${catName}`,
            uploadedAt: tx.receipt_uploaded_at || tx.date || new Date().toISOString(),
            notes: tx.description,
            source: 'transaction_receipt',
            tags: ['Receipt', catName],
            isVercelBlob: Boolean(tx.receipt_url?.includes('vercel-storage.com')),
          });
        }
      }
    } catch (e) {
      console.warn('[DOCUMENTS_FETCH_TX_RECEIPTS_WARN]', e);
    }

    // 3. Fetch Transaction Attachments (from public.transaction_attachments)
    try {
      let attQuery = (supabase as any)
        .from('transaction_attachments')
        .select(
          `
          id,
          transaction_id,
          blob_url,
          blob_path,
          file_name,
          mime_type,
          file_size,
          created_at,
          transactions!inner (
            id,
            property_id,
            description,
            amount,
            properties (id, name, address_line_1)
          )
        `
        )
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (filters?.propertyId) {
        attQuery = attQuery.eq('transactions.property_id', filters.propertyId);
      }

      const { data: attData, error: attError } = await attQuery;
      if (!attError && Array.isArray(attData)) {
        for (const att of attData) {
          const tx = att.transactions;
          // Avoid duplicate entry if same as primary receipt_url
          if (unifiedList.some((item) => item.fileUrl === att.blob_url)) continue;

          unifiedList.push({
            id: `att-${att.id}`,
            title: `Attachment: ${att.file_name}`,
            fileName: att.file_name,
            fileUrl: att.blob_url,
            blobPath: att.blob_path,
            fileSize: att.file_size ? Number(att.file_size) : null,
            mimeType: att.mime_type || 'application/octet-stream',
            category: 'receipt',
            propertyId: tx?.property_id,
            propertyName: tx?.properties?.name || 'General Workspace',
            propertyAddress: tx?.properties?.address_line_1 || null,
            linkedEntityId: att.transaction_id,
            linkedEntityType: 'transaction',
            linkedEntityLabel: tx?.description || 'Transaction Attachment',
            uploadedAt: att.created_at,
            notes: null,
            source: 'transaction_receipt',
            tags: ['Attachment', 'Expense'],
            isVercelBlob: Boolean(att.blob_url?.includes('vercel-storage.com')),
          });
        }
      }
    } catch (e) {
      // Table might not have records yet, gracefully ignore
    }

    // 4. Fetch Inspection Photos (from public.inspection_photos)
    try {
      let photoQuery = (supabase as any)
        .from('inspection_photos')
        .select(
          `
          id,
          photo_url,
          caption,
          file_name,
          file_size,
          mime_type,
          created_at,
          inspection_rooms!inner (
            id,
            name,
            report_id,
            condition_reports!inner (
              id,
              workspace_id,
              property_id,
              inspection_type,
              inspection_date,
              properties (id, name, address_line_1)
            )
          )
        `
        )
        .eq('inspection_rooms.condition_reports.workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (filters?.propertyId) {
        photoQuery = photoQuery.eq(
          'inspection_rooms.condition_reports.property_id',
          filters.propertyId
        );
      }

      const { data: photoData, error: photoError } = await photoQuery;
      if (!photoError && Array.isArray(photoData)) {
        for (const p of photoData) {
          const report = p.inspection_rooms?.condition_reports;
          const roomName = p.inspection_rooms?.name || 'Room';
          const propName = report?.properties?.name || 'Property';

          unifiedList.push({
            id: `photo-${p.id}`,
            title: p.caption ? `${roomName}: ${p.caption}` : `${roomName} Photo`,
            fileName: p.file_name || `${roomName.toLowerCase().replace(/\s+/g, '-')}-photo.jpg`,
            fileUrl: p.photo_url,
            blobPath: null,
            fileSize: p.file_size ? Number(p.file_size) : null,
            mimeType: p.mime_type || 'image/jpeg',
            category: 'inspection_photo',
            propertyId: report?.property_id,
            propertyName: propName,
            propertyAddress: report?.properties?.address_line_1 || null,
            linkedEntityId: report?.id,
            linkedEntityType: 'inspection',
            linkedEntityLabel: `${roomName} — ${report?.inspection_type || 'Inspection'}`,
            uploadedAt: p.created_at,
            notes: p.caption,
            source: 'inspection_photo',
            tags: ['Inspection Photo', roomName],
            isVercelBlob: Boolean(p.photo_url?.includes('vercel-storage.com')),
          });
        }
      }
    } catch (e) {
      console.warn('[DOCUMENTS_FETCH_INSPECTION_PHOTOS_WARN]', e);
    }

    // 5. Fetch Completed Condition Reports as official Document entries
    try {
      let repQuery = (supabase as any)
        .from('condition_reports')
        .select(
          `
          id,
          inspection_type,
          inspection_date,
          status,
          inspector_name,
          created_at,
          property_id,
          properties (id, name, address_line_1)
        `
        )
        .eq('workspace_id', workspaceId)
        .order('inspection_date', { ascending: false });

      if (filters?.propertyId) {
        repQuery = repQuery.eq('property_id', filters.propertyId);
      }

      const { data: repData, error: repError } = await repQuery;
      if (!repError && Array.isArray(repData)) {
        for (const rep of repData) {
          const propName = rep.properties?.name || 'Property';
          const title = `${rep.inspection_type} Condition Report — ${propName}`;
          const dateStr = rep.inspection_date || rep.created_at;

          unifiedList.push({
            id: `report-${rep.id}`,
            title,
            fileName: `Condition-Report-${propName.replace(/[^a-zA-Z0-9]/g, '-')}-${rep.inspection_type}.pdf`,
            fileUrl: `/dashboard/inspections/${rep.id}`, // Navigates to report & PDF download
            blobPath: null,
            fileSize: null,
            mimeType: 'application/pdf',
            category: 'condition_report',
            propertyId: rep.property_id,
            propertyName: propName,
            propertyAddress: rep.properties?.address_line_1 || null,
            linkedEntityId: rep.id,
            linkedEntityType: 'inspection',
            linkedEntityLabel: `${rep.status} (${rep.inspector_name || 'Inspector'})`,
            uploadedAt: dateStr,
            notes: `Status: ${rep.status}`,
            source: 'condition_report_pdf',
            tags: ['Condition Report', rep.status],
            isVercelBlob: false,
          });
        }
      }
    } catch (e) {
      console.warn('[DOCUMENTS_FETCH_REPORTS_WARN]', e);
    }

    // Sort all items newest first
    unifiedList.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    // Compute Summary Stats
    let totalSizeBytes = 0;
    let receiptsCount = 0;
    let photosCount = 0;
    let reportsCount = 0;
    let leasesAndAgreementsCount = 0;
    let complianceCount = 0;
    let otherCount = 0;

    for (const item of unifiedList) {
      if (item.fileSize) totalSizeBytes += item.fileSize;
      if (item.category === 'receipt') receiptsCount++;
      else if (item.category === 'inspection_photo') photosCount++;
      else if (item.category === 'condition_report') reportsCount++;
      else if (item.category === 'lease_agreement') leasesAndAgreementsCount++;
      else if (
        item.category === 'compliance_insurance' ||
        item.category === 'strata_council'
      )
        complianceCount++;
      else otherCount++;
    }

    const stats: DocumentStats = {
      totalFiles: unifiedList.length,
      totalSizeBytes,
      receiptsCount,
      photosCount,
      reportsCount,
      leasesAndAgreementsCount,
      complianceCount,
      otherCount,
    };

    // Filter if category requested
    let finalData = unifiedList;
    if (filters?.category && filters.category !== 'all') {
      finalData = unifiedList.filter((item) => item.category === filters.category);
    }

    return {
      success: true,
      data: finalData,
      stats,
    };
  } catch (err: any) {
    console.error('[FETCH_WORKSPACE_DOCUMENTS_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to fetch workspace documents',
    };
  }
}

/**
 * Upload a new file (e.g. Lease Agreement, Insurance, Compliance Cert, Strata Notice)
 * directly into Vercel Blob and register it in the public.documents repository.
 */
export async function uploadWorkspaceDocumentAction(
  formData: FormData
): Promise<{ success: boolean; data?: UnifiedDocument; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId)
      return { success: false, error: 'No active workspace' };

    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const documentType = (formData.get('documentType') as string) || 'other';
    const propertyId = formData.get('propertyId') as string | null;
    const description = formData.get('description') as string | null;

    if (!file || !title) {
      return { success: false, error: 'File and Title are required' };
    }

    // 1. Upload to Vercel Blob
    const blobResult = await uploadDocumentToBlob({
      workspaceId: context.workspaceId,
      folder: documentType,
      file,
      fileName: file.name,
      mimeType: file.type,
    });

    const supabase = await createClient();

    // 2. Insert into public.documents table
    const { data: inserted, error: insertError } = await (supabase as any)
      .from('documents')
      .insert({
        workspace_id: context.workspaceId,
        property_id: propertyId && propertyId.trim() !== '' ? propertyId : null,
        title: title.trim(),
        document_type: documentType,
        file_name: blobResult.fileName,
        file_url: blobResult.url,
        blob_path: blobResult.blobPath,
        file_size: blobResult.fileSize,
        mime_type: blobResult.mimeType,
        description: description ? description.trim() : null,
        tags: [documentType.replace(/_/g, ' ')],
        uploaded_by: user.id,
      })
      .select('*, properties(id, name, address_line_1)')
      .single();

    if (insertError) {
      console.error('[INSERT_DOCUMENT_ERROR]', insertError);
      try {
        await deleteDocumentFromBlob(blobResult.blobPath);
      } catch (cleanupError) {
        console.error('[DOCUMENT_BLOB_CLEANUP_ERROR]', cleanupError);
      }
      throw insertError;
    }

    // 3. Log activity
    try {
      await (supabase as any).from('activity_logs').insert({
        workspace_id: context.workspaceId,
        property_id: propertyId && propertyId.trim() !== '' ? propertyId : null,
        user_id: user.id,
        action: 'DOCUMENT_UPLOADED',
        entity_type: 'DOCUMENT',
        entity_id: inserted.id,
      });
    } catch (e) {
      // Activity log is non-blocking
    }

    revalidatePath('/dashboard/documents');

    return {
      success: true,
      data: {
        id: `doc-${inserted.id}`,
        title: inserted.title,
        fileName: inserted.file_name,
        fileUrl: inserted.file_url,
        blobPath: inserted.blob_path,
        fileSize: inserted.file_size ? Number(inserted.file_size) : null,
        mimeType: inserted.mime_type,
        category: (documentType as DocumentCategory) || 'other',
        propertyId: inserted.property_id,
        propertyName: inserted.properties?.name || null,
        propertyAddress: inserted.properties?.address_line_1 || null,
        linkedEntityId: inserted.id,
        linkedEntityType: 'custom',
        linkedEntityLabel: documentType.replace(/_/g, ' '),
        uploadedAt: inserted.created_at,
        notes: inserted.description,
        source: 'database_document',
        tags: inserted.tags || [],
        isVercelBlob: true,
      },
    };
  } catch (err: any) {
    console.error('[UPLOAD_DOCUMENT_ACTION_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to upload document',
    };
  }
}

/**
 * Delete a document from the repository and Vercel Blob.
 */
export async function deleteWorkspaceDocumentAction(
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId)
      return { success: false, error: 'No active workspace' };

    const supabase = await createClient();

    // If it's a general document
    if (documentId.startsWith('doc-')) {
      const actualId = documentId.replace('doc-', '');
      const { data: doc } = await (supabase as any)
        .from('documents')
        .select('id, blob_path, file_url')
        .eq('id', actualId)
        .eq('workspace_id', context.workspaceId)
        .single();

      if (doc) {
        if (doc.blob_path || doc.file_url) {
          await deleteDocumentFromBlob(doc.blob_path || doc.file_url);
        }
        await (supabase as any)
          .from('documents')
          .delete()
          .eq('id', actualId)
          .eq('workspace_id', context.workspaceId);
      }
    } else if (documentId.startsWith('receipt-tx-')) {
      // Transaction receipt
      const txId = documentId.replace('receipt-tx-', '');
      const { data: tx } = await (supabase as any)
        .from('transactions')
        .select('id, receipt_url')
        .eq('id', txId)
        .eq('workspace_id', context.workspaceId)
        .single();

      if (tx?.receipt_url) {
        await deleteDocumentFromBlob(tx.receipt_url);
        await (supabase as any)
          .from('transactions')
          .update({
            receipt_url: null,
            receipt_file_name: null,
            receipt_file_size: null,
            receipt_mime_type: null,
            receipt_uploaded_at: null,
          })
          .eq('id', txId)
          .eq('workspace_id', context.workspaceId);
      }
    } else if (documentId.startsWith('photo-')) {
      // Inspection photo
      const photoId = documentId.replace('photo-', '');
      const { data: photo } = await (supabase as any)
        .from('inspection_photos')
        .select('id, photo_url')
        .eq('id', photoId)
        .single();

      if (photo?.photo_url) {
        await deleteDocumentFromBlob(photo.photo_url);
        await (supabase as any)
          .from('inspection_photos')
          .delete()
          .eq('id', photoId);
      }
    }

    revalidatePath('/dashboard/documents');
    return { success: true };
  } catch (err: any) {
    console.error('[DELETE_DOCUMENT_ACTION_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to delete document',
    };
  }
}
