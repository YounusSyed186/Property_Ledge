import { addDays, addWeeks, addMonths, addYears, isAfter, format, parseISO } from 'date-fns';
import { CreateExpectedScheduleInput, ScheduleFrequency } from './types';

export interface GeneratedScheduleItem {
  schedule_name: string;
  schedule_type: 'lease' | 'independent';
  amount: number;
  due_date: string;
  frequency: ScheduleFrequency;
  status: 'pending';
  start_date: string;
  end_date: string;
  workspace_id?: string;
  property_id?: string | null;
  lease_id?: string | null;
  tenant_id?: string | null;
  transaction_category_id?: string | null;
  notes?: string | null;
  gst_inclusive?: boolean;
  gst_amount?: number;
  tax_classification_id?: string | null;
}

/**
 * Calculates due dates and builds expected payment entries for lease-based or independent schedules.
 */
export function generateScheduleEntries(input: CreateExpectedScheduleInput): GeneratedScheduleItem[] {
  const {
    schedule_name,
    schedule_type,
    amount,
    start_date,
    end_date,
    frequency,
    property_id,
    lease_id,
    tenant_id,
    transaction_category_id,
    workspace_id,
    notes,
    gst_inclusive,
    gst_amount,
    tax_classification_id,
  } = input;

  if (!start_date || !end_date) {
    throw new Error('Start date and end date are required to generate payment schedule entries.');
  }

  const startDateObj = parseISO(start_date);
  const endDateObj = parseISO(end_date);

  if (isAfter(startDateObj, endDateObj)) {
    throw new Error('Start date must be before or equal to end date.');
  }

  const entries: GeneratedScheduleItem[] = [];
  let currentDate = startDateObj;
  let entryIndex = 1;

  while (!isAfter(currentDate, endDateObj)) {
    const formattedDueDate = format(currentDate, 'yyyy-MM-dd');

    entries.push({
      schedule_name: schedule_name,
      schedule_type,
      amount,
      due_date: formattedDueDate,
      frequency,
      status: 'pending',
      start_date,
      end_date,
      workspace_id,
      property_id: property_id || null,
      lease_id: lease_id || null,
      tenant_id: tenant_id || null,
      transaction_category_id: transaction_category_id || null,
      notes: notes || null,
      gst_inclusive: gst_inclusive || false,
      gst_amount: gst_amount || 0,
      tax_classification_id: tax_classification_id || null,
    });

    entryIndex++;

    // Increment date based on frequency
    switch (frequency) {
      case 'weekly':
        currentDate = addWeeks(currentDate, 1);
        break;
      case 'fortnightly':
        currentDate = addWeeks(currentDate, 2);
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, 1);
        break;
      case 'quarterly':
        currentDate = addMonths(currentDate, 3);
        break;
      case 'yearly':
        currentDate = addYears(currentDate, 1);
        break;
      case 'custom':
      default:
        // For custom or one-off, default to monthly step
        currentDate = addMonths(currentDate, 1);
        break;
    }

    // Safety brake to prevent infinite loop
    if (entryIndex > 500) {
      break;
    }
  }

  return entries;
}
