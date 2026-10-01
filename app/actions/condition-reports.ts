'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/queries';
import { resolveWorkspaceContext } from '@/lib/workspace/context';
import {
  ConditionReport,
  FullConditionReportData,
  CreateConditionReportInput,
  ItemRating,
  RoomStatus,
  DefectSeverity,
  getItemsForRoomType,
  Schedule2StatutoryData,
  InspectionItemDetails,
  parseSchedule2Data,
  serializeSchedule2Data,
  DEFAULT_SCHEDULE_2_DATA,
} from '@/types/condition-report';

/**
 * Fetch condition reports for the active workspace, optionally filtered by propertyId.
 */
export async function fetchConditionReportsAction(
  propertyId?: string
): Promise<{ success: boolean; data?: ConditionReport[]; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId)
      return { success: false, error: 'No active workspace' };

    const supabase = await createClient();

    let query = (supabase as any)
      .from('condition_reports')
      .select(
        `
        *,
        properties (id, name, address_line_1, city, state, postal_code),
        leases (id, start_date, end_date, status),
        inspection_rooms (id, name, status, room_order)
      `
      )
      .eq('workspace_id', context.workspaceId)
      .order('inspection_date', { ascending: false });

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: (data as ConditionReport[]) || [] };
  } catch (err: any) {
    console.error('[FETCH_CONDITION_REPORTS_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to fetch condition reports',
    };
  }
}

/**
 * Fetch a full condition report including rooms, items, defects, photos,
 * Schedule 2 statutory data, and recursively resolves any linked baseline report for historical comparison.
 */
export async function fetchConditionReportDetailAction(
  reportId: string
): Promise<{ success: boolean; data?: FullConditionReportData; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId)
      return { success: false, error: 'No active workspace' };

    const supabase = await createClient();

    // 1. Fetch report header and verify workspace isolation
    const { data: report, error: reportErr } = await (supabase as any)
      .from('condition_reports')
      .select(
        `
        *,
        properties (id, name, address_line_1, city, state, postal_code),
        leases (id, start_date, end_date, status)
      `
      )
      .eq('id', reportId)
      .eq('workspace_id', context.workspaceId)
      .single();

    if (reportErr || !report) {
      return {
        success: false,
        error: reportErr?.message || 'Condition report not found or access denied',
      };
    }

    // 2. Fetch rooms
    const { data: rooms, error: roomsErr } = await (supabase as any)
      .from('inspection_rooms')
      .select('*')
      .eq('report_id', reportId)
      .order('room_order', { ascending: true });

    if (roomsErr) throw roomsErr;

    const roomList = rooms || [];
    const roomIds = roomList.map((r: any) => r.id);

    let items: any[] = [];
    let defects: any[] = [];
    let photos: any[] = [];

    if (roomIds.length > 0) {
      const [itmsRes, dfctsRes, phtsRes] = await Promise.all([
        (supabase as any)
          .from('inspection_items')
          .select('*')
          .in('room_id', roomIds),
        (supabase as any)
          .from('inspection_defects')
          .select('*')
          .in('room_id', roomIds),
        (supabase as any)
          .from('inspection_photos')
          .select('*')
          .in('room_id', roomIds),
      ]);

      items = itmsRes.data || [];
      defects = dfctsRes.data || [];
      photos = phtsRes.data || [];
    }

    // 3. If a baseline report is linked (e.g. for Routine or Outgoing inspections), fetch baseline snapshot
    let baselineReportData: FullConditionReportData | null = null;
    if (report.baseline_report_id) {
      const baselineRes = await (supabase as any)
        .from('condition_reports')
        .select(
          `
          *,
          properties (id, name, address_line_1, city, state, postal_code),
          leases (id, start_date, end_date, status)
        `
        )
        .eq('id', report.baseline_report_id)
        .eq('workspace_id', context.workspaceId)
        .maybeSingle();

      if (baselineRes.data) {
        const { data: baseRooms } = await (supabase as any)
          .from('inspection_rooms')
          .select('*')
          .eq('report_id', report.baseline_report_id)
          .order('room_order', { ascending: true });

        const baseRoomIds = (baseRooms || []).map((r: any) => r.id);
        let baseItems: any[] = [];
        let baseDefects: any[] = [];
        let basePhotos: any[] = [];

        if (baseRoomIds.length > 0) {
          const [bItms, bDfcts, bPhts] = await Promise.all([
            (supabase as any)
              .from('inspection_items')
              .select('*')
              .in('room_id', baseRoomIds),
            (supabase as any)
              .from('inspection_defects')
              .select('*')
              .in('room_id', baseRoomIds),
            (supabase as any)
              .from('inspection_photos')
              .select('*')
              .in('room_id', baseRoomIds),
          ]);
          baseItems = bItms.data || [];
          baseDefects = bDfcts.data || [];
          basePhotos = bPhts.data || [];
        }

        const baseParsed = parseSchedule2Data(baselineRes.data.notes);

        baselineReportData = {
          report: baselineRes.data as ConditionReport,
          rooms: baseRooms || [],
          items: baseItems,
          defects: baseDefects,
          photos: basePhotos,
          schedule2Data: baseParsed.statutory,
        };
      }
    }

    const currentParsed = parseSchedule2Data(report.notes);

    return {
      success: true,
      data: {
        report: report as ConditionReport,
        rooms: roomList,
        items,
        defects,
        photos,
        baselineReport: baselineReportData,
        schedule2Data: currentParsed.statutory,
      },
    };
  } catch (err: any) {
    console.error('[FETCH_CONDITION_REPORT_DETAIL_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to fetch report details',
    };
  }
}

/**
 * Fetch available properties, leases, and prior finalized reports for starting a new condition report.
 */
export async function fetchInspectionPropertiesAndLeasesAction(): Promise<{
  success: boolean;
  properties?: Array<{ id: string; name: string; address_line_1: string }>;
  leases?: Array<{
    id: string;
    property_id: string;
    start_date: string;
    end_date: string | null;
    status: string;
  }>;
  priorReports?: Array<{
    id: string;
    property_id: string;
    type: string;
    inspection_date: string;
    status: string;
  }>;
  inspectorName?: string;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId)
      return { success: false, error: 'No active workspace' };

    const supabase = await createClient();

    const [propsRes, leasesRes, priorReportsRes, profileRes] = await Promise.all([
      (supabase as any)
        .from('properties')
        .select('id, name, address_line_1')
        .eq('workspace_id', context.workspaceId)
        .order('name', { ascending: true }),
      (supabase as any)
        .from('leases')
        .select('id, property_id, start_date, end_date, status')
        .order('start_date', { ascending: false }),
      (supabase as any)
        .from('condition_reports')
        .select('id, property_id, type, inspection_date, status')
        .eq('workspace_id', context.workspaceId)
        .order('inspection_date', { ascending: false }),
      (supabase as any)
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    const inspectorName =
      profileRes.data?.full_name ||
      user.email?.split('@')[0] ||
      'Property Manager';

    return {
      success: true,
      properties: propsRes.data || [],
      leases: leasesRes.data || [],
      priorReports: priorReportsRes.data || [],
      inspectorName,
    };
  } catch (err: any) {
    console.error('[FETCH_INSPECTION_PROPERTIES_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to fetch properties and leases',
    };
  }
}

/**
 * Create a new condition report and batch-generate all rooms and tailored items.
 * Implements "Default Good" UX so that items start in a clean/good condition.
 * If baselineReportId is provided, carries forward baseline condition items cleanly.
 */
export async function createConditionReportAction(
  input: CreateConditionReportInput
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId)
      return { success: false, error: 'No active workspace' };

    const supabase = await createClient();

    // 1. Validate property belongs to the workspace
    const { data: prop, error: propErr } = await (supabase as any)
      .from('properties')
      .select('id')
      .eq('id', input.propertyId)
      .eq('workspace_id', context.workspaceId)
      .single();

    if (propErr || !prop) {
      return { success: false, error: 'Invalid property or access denied' };
    }

    // 2. Format notes with Schedule 2 statutory defaults
    const statutory = input.statutoryData || JSON.parse(JSON.stringify(DEFAULT_SCHEDULE_2_DATA));
    const serializedNotes = serializeSchedule2Data(input.notes || '', statutory);

    // 3. Insert main condition_report header
    const { data: newReport, error: reportErr } = await (supabase as any)
      .from('condition_reports')
      .insert({
        workspace_id: context.workspaceId,
        property_id: input.propertyId,
        lease_id: input.leaseId || null,
        baseline_report_id: input.baselineReportId || null,
        inspector_id: user.id,
        type: input.inspectionType,
        inspection_date: input.inspectionDate,
        inspector_name: input.inspectorName.trim() || 'Inspector',
        status: 'Draft',
        notes: serializedNotes,
      })
      .select()
      .single();

    if (reportErr || !newReport) {
      throw reportErr || new Error('Failed to create condition report header');
    }

    // 4. Generate rooms array based on templates
    const roomsToCreate: Array<{
      report_id: string;
      name: string;
      room_order: number;
    }> = [];
    let order = 0;

    input.roomTemplates.forEach((template) => {
      for (let i = 0; i < template.count; i++) {
        roomsToCreate.push({
          report_id: newReport.id,
          name: template.count > 1 ? `${template.name} ${i + 1}` : template.name,
          room_order: order++,
        });
      }
    });

    if (roomsToCreate.length > 0) {
      // 5. Batch insert rooms
      const { data: createdRooms, error: roomsErr } = await (supabase as any)
        .from('inspection_rooms')
        .insert(roomsToCreate)
        .select();

      if (roomsErr) throw roomsErr;

      // 6. Batch insert items for every room with "Default Good" rating ('Good')
      const itemsToCreate: Array<{
        room_id: string;
        name: string;
        rating: ItemRating;
      }> = [];

      (createdRooms || []).forEach((room: any) => {
        const tailoredItems = getItemsForRoomType(room.name);
        tailoredItems.forEach((itemName) => {
          itemsToCreate.push({
            room_id: room.id,
            name: itemName,
            rating: 'Good', // "Default Good" UX: Everything starts in normal/good condition
          });
        });
      });

      if (itemsToCreate.length > 0) {
        const { error: itemsErr } = await (supabase as any)
          .from('inspection_items')
          .insert(itemsToCreate);

        if (itemsErr) throw itemsErr;
      }
    }

    revalidatePath('/dashboard/inspections');
    revalidatePath('/dashboard/condition-reports');
    return { success: true, reportId: newReport.id };
  } catch (err: any) {
    console.error('[CREATE_CONDITION_REPORT_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to create condition report',
    };
  }
}

/**
 * Save Schedule 2 statutory section answers and item detail metadata.
 */
export async function saveSchedule2DataAction(
  reportId: string,
  statutoryData: Schedule2StatutoryData,
  plainNotes: string = ''
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId)
      return { success: false, error: 'No active workspace' };

    const supabase = await createClient();
    const serialized = serializeSchedule2Data(plainNotes, statutoryData);

    const { error } = await (supabase as any)
      .from('condition_reports')
      .update({
        notes: serialized,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .eq('workspace_id', context.workspaceId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('[SAVE_SCHEDULE_2_DATA_ERROR]', err);
    return { success: false, error: err.message || 'Failed to save statutory data' };
  }
}

/**
 * Autosave single item rating and optional Schedule 2 detail mapping.
 */
export async function updateItemRatingAction(
  itemId: string,
  rating: ItemRating | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from('inspection_items')
      .update({ rating })
      .eq('id', itemId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('[UPDATE_ITEM_RATING_ERROR]', err);
    return { success: false, error: err.message || 'Failed to update rating' };
  }
}

/**
 * Updates item full condition state (Clean, Undamaged, Working, Landlord & Tenant comments)
 * and autosaves in item table + Schedule 2 map.
 */
export async function updateItemFullConditionAction(
  reportId: string,
  itemId: string,
  rating: ItemRating | null,
  details: InspectionItemDetails,
  currentStatutoryData?: Schedule2StatutoryData
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = await createClient();

    // 1. Update rating on item
    await (supabase as any)
      .from('inspection_items')
      .update({ rating })
      .eq('id', itemId);

    // 2. Update itemDetailsMap in report notes if statutory data exists
    if (currentStatutoryData) {
      const updatedStatutory: Schedule2StatutoryData = {
        ...currentStatutoryData,
        itemDetailsMap: {
          ...(currentStatutoryData.itemDetailsMap || {}),
          [itemId]: details,
        },
      };

      const context = await resolveWorkspaceContext();
      if (context?.workspaceId) {
        const serialized = serializeSchedule2Data('', updatedStatutory);
        await (supabase as any)
          .from('condition_reports')
          .update({
            notes: serialized,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reportId)
          .eq('workspace_id', context.workspaceId);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[UPDATE_ITEM_FULL_CONDITION_ERROR]', err);
    return { success: false, error: err.message || 'Failed to update item condition' };
  }
}

/**
 * Quick action: Mark entire room as "Good" and set room status to "Completed".
 */
export async function markRoomGoodAction(
  roomId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = await createClient();

    // 1. Update all items in the room to 'Good'
    const { error: itemsErr } = await (supabase as any)
      .from('inspection_items')
      .update({ rating: 'Good' })
      .eq('room_id', roomId);

    if (itemsErr) throw itemsErr;

    // 2. Mark room status completed
    const { error: roomErr } = await (supabase as any)
      .from('inspection_rooms')
      .update({ status: 'Completed' })
      .eq('id', roomId);

    if (roomErr) throw roomErr;

    return { success: true };
  } catch (err: any) {
    console.error('[MARK_ROOM_GOOD_ERROR]', err);
    return { success: false, error: err.message || 'Failed to mark room good' };
  }
}

/**
 * Update room completion status.
 */
export async function updateRoomStatusAction(
  roomId: string,
  status: RoomStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from('inspection_rooms')
      .update({ status })
      .eq('id', roomId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('[UPDATE_ROOM_STATUS_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Failed to update room status',
    };
  }
}

/**
 * Add a defect/issue to a room, optionally associated with an item.
 */
export async function addDefectAction(
  roomId: string,
  itemName: string | undefined,
  notes: string,
  severity: DefectSeverity
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (!notes.trim()) return { success: false, error: 'Notes are required' };

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('inspection_defects')
      .insert({
        room_id: roomId,
        item_name: itemName?.trim() || null,
        notes: notes.trim(),
        severity,
      })
      .select()
      .single();

    if (error) throw error;

    // Automatically mark room as Completed
    await (supabase as any)
      .from('inspection_rooms')
      .update({ status: 'Completed' })
      .eq('id', roomId);

    return { success: true, data };
  } catch (err: any) {
    console.error('[ADD_DEFECT_ERROR]', err);
    return { success: false, error: err.message || 'Failed to add defect' };
  }
}

/**
 * Delete a defect.
 */
export async function deleteDefectAction(
  defectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from('inspection_defects')
      .delete()
      .eq('id', defectId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('[DELETE_DEFECT_ERROR]', err);
    return { success: false, error: err.message || 'Failed to delete defect' };
  }
}

/**
 * Add an inspection photo to a room, with optional defect or item association.
 */
export async function addPhotoAction(
  roomId: string,
  photoUrl: string,
  defectId?: string | null,
  itemId?: string | null
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (!photoUrl) return { success: false, error: 'Photo URL is required' };

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('inspection_photos')
      .insert({
        room_id: roomId,
        defect_id: defectId || null,
        item_id: itemId || null,
        photo_url: photoUrl,
      })
      .select()
      .single();

    if (error) throw error;

    // Automatically mark room as Completed
    await (supabase as any)
      .from('inspection_rooms')
      .update({ status: 'Completed' })
      .eq('id', roomId);

    return { success: true, data };
  } catch (err: any) {
    console.error('[ADD_PHOTO_ERROR]', err);
    return { success: false, error: err.message || 'Failed to add photo' };
  }
}

/**
 * Add multiple inspection photos in a single batch.
 */
export async function addPhotosBatchAction(
  roomId: string,
  photoUrls: string[],
  defectId?: string | null,
  itemId?: string | null
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (!photoUrls || photoUrls.length === 0) {
      return { success: false, error: 'No photos provided' };
    }

    const supabase = await createClient();
    const records = photoUrls.map((url) => ({
      room_id: roomId,
      defect_id: defectId || null,
      item_id: itemId || null,
      photo_url: url,
    }));

    const { data, error } = await (supabase as any)
      .from('inspection_photos')
      .insert(records)
      .select();

    if (error) throw error;

    // Automatically mark room as Completed
    await (supabase as any)
      .from('inspection_rooms')
      .update({ status: 'Completed' })
      .eq('id', roomId);

    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error('[ADD_PHOTOS_BATCH_ERROR]', err);
    return { success: false, error: err.message || 'Failed to add photos' };
  }
}

/**
 * Delete an inspection photo.
 */
export async function deletePhotoAction(
  photoId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from('inspection_photos')
      .delete()
      .eq('id', photoId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('[DELETE_PHOTO_ERROR]', err);
    return { success: false, error: err.message || 'Failed to delete photo' };
  }
}

/**
 * Finalize report with Manager & Tenant signatures, lock status to 'Completed'.
 */
export async function finalizeConditionReportAction(
  reportId: string,
  signatures: {
    signatureManager: string | null;
    signatureTenant: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId)
      return { success: false, error: 'No active workspace' };

    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from('condition_reports')
      .update({
        signature_manager: signatures.signatureManager,
        signature_tenant: signatures.signatureTenant,
        status: 'Completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .eq('workspace_id', context.workspaceId);

    if (error) throw error;

    revalidatePath('/dashboard/inspections');
    revalidatePath('/dashboard/condition-reports');
    return { success: true };
  } catch (err: any) {
    console.error('[FINALIZE_CONDITION_REPORT_ERROR]', err);
    return { success: false, error: err.message || 'Failed to finalize report' };
  }
}

/**
 * Delete a condition report and cascade to its rooms, items, defects, and photos.
 */
export async function deleteConditionReportAction(
  reportId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const context = await resolveWorkspaceContext();
    if (!context?.workspaceId)
      return { success: false, error: 'No active workspace' };

    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from('condition_reports')
      .delete()
      .eq('id', reportId)
      .eq('workspace_id', context.workspaceId);

    if (error) throw error;

    revalidatePath('/dashboard/inspections');
    revalidatePath('/dashboard/condition-reports');
    return { success: true };
  } catch (err: any) {
    console.error('[DELETE_CONDITION_REPORT_ERROR]', err);
    return { success: false, error: err.message || 'Failed to delete report' };
  }
}
