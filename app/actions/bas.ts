'use server';

import { getCurrentUser } from '@/lib/auth/queries';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import { createClient } from '@/lib/supabase/server';
import { BasPeriod } from '@/modules/finance/domain/types';
import * as basService from '@/lib/bas/service';
import { PdfBasReportAdapter } from '@/lib/pdf/pdf-bas-report-adapter';
import { revalidatePath } from 'next/cache';

async function getAuthContext() {
  const [user, context] = await Promise.all([
    getCurrentUser(),
    resolveWorkspaceContext(),
  ]);

  if (!user || !context) {
    throw new Error('Unauthorized or no active workspace');
  }

  return { user, context };
}

/**
 * Single-roundtrip server action to load the complete BAS page state.
 */
export async function fetchBasPageDataAction(params?: {
  propertyId?: string | null;
  financialYear?: number;
  period?: BasPeriod;
}) {
  const { context } = await getAuthContext();

  const currentCalYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const defaultFY = currentMonth >= 7 ? currentCalYear + 1 : currentCalYear;

  const financialYear = params?.financialYear || defaultFY;
  const period = params?.period || 'Q1';
  const propertyId = params?.propertyId || null;

  return basService.getBasPageData({
    workspaceId: context.workspaceId,
    propertyId,
    financialYear,
    period,
  });
}

/**
 * Generates an Accountant BAS PDF Report and returns base64 data for immediate client download.
 */
export async function generateBasAccountantReportAction(params: {
  propertyId?: string | null;
  financialYear: number;
  period: BasPeriod;
  customDetails?: import('@/lib/pdf/pdf-bas-report-adapter').BasReportCustomDetails;
}) {
  const { context } = await getAuthContext();

  const pageData = await basService.getBasPageData({
    workspaceId: context.workspaceId,
    propertyId: params.propertyId || null,
    financialYear: params.financialYear,
    period: params.period,
  });

  const pdfBytes = await PdfBasReportAdapter.generate({
    worksheet: pageData.worksheet,
    transactions: pageData.details,
    workspaceName: context.workspaceName || 'PropertyLedge',
    customDetails: params.customDetails,
  });

  const base64Pdf = Buffer.from(pdfBytes).toString('base64');
  const filename = `BAS_Report_${pageData.worksheet.propertyName.replace(/[^a-zA-Z0-9]/g, '_')}_${params.period}_FY${params.financialYear}.pdf`;

  return {
    success: true,
    filename,
    base64Data: `data:application/pdf;base64,${base64Pdf}`,
  };
}

/**
 * Toggles or updates the GST tracking status on a specific property.
 */
export async function updatePropertyGstSettingAction(propertyId: string, gstEnabled: boolean) {
  const { context } = await getAuthContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from('properties')
    .update({ gst_enabled: gstEnabled } as never)
    .eq('id', propertyId)
    .eq('workspace_id', context.workspaceId);

  if (error) {
    console.error('Error updating property GST setting:', error);
    throw new Error(`Failed to update GST setting: ${error.message}`);
  }

  revalidatePath('/dashboard/bas');
  revalidatePath('/dashboard/properties');
  revalidatePath('/dashboard/money');

  return { success: true, gstEnabled };
}
