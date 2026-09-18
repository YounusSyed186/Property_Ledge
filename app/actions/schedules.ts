'use me';
'use server';

import { authClient } from '@/modules/auth';
import {
  getExpectedPaymentSchedules,
  getExpectedPaymentScheduleById,
  createPaymentSchedule,
  updateExpectedPaymentEntry,
  deleteExpectedPaymentEntry,
  getEligibleTransactionsForExpectedPayment,
  allocateTransactionToExpectedPayment,
  recordTransactionForExpectedPayment,
  allocateTransactionAcrossMultiple,
  unlinkAllocation,
} from '@/lib/finance/scheduleService';
import {
  CreateExpectedScheduleInput,
  UpdateExpectedScheduleInput,
  ExpectedScheduleFilterParams,
  AllocateTransactionInput,
  RecordTransactionFromExpectedInput,
} from '@/modules/finance/domain/types';
import { revalidatePath } from 'next/cache';

export async function fetchExpectedSchedulesAction(filters: ExpectedScheduleFilterParams = {}) {
  try {
    const data = await getExpectedPaymentSchedules(filters);
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch schedules';
    return { success: false, error: message };
  }
}

export async function createScheduleAction(input: CreateExpectedScheduleInput) {
  try {
    const user = await authClient.getCurrentUser();
    const data = await createPaymentSchedule(input, user?.id);
    revalidatePath('/dashboard/schedules');
    revalidatePath('/dashboard/money');
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create schedule';
    return { success: false, error: message };
  }
}

export async function updateExpectedEntryAction(id: string, input: UpdateExpectedScheduleInput) {
  try {
    const user = await authClient.getCurrentUser();
    const data = await updateExpectedPaymentEntry(id, input, user?.id);
    revalidatePath('/dashboard/schedules');
    revalidatePath('/dashboard/money');
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update entry';
    return { success: false, error: message };
  }
}

export async function deleteExpectedEntryAction(id: string) {
  try {
    const user = await authClient.getCurrentUser();
    await deleteExpectedPaymentEntry(id, user?.id);
    revalidatePath('/dashboard/schedules');
    revalidatePath('/dashboard/money');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete entry';
    return { success: false, error: message };
  }
}

export async function getEligibleTransactionsAction(expectedPaymentId: string) {
  try {
    const data = await getEligibleTransactionsForExpectedPayment(expectedPaymentId);
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch eligible transactions';
    return { success: false, error: message };
  }
}

export async function linkTransactionAction(input: AllocateTransactionInput) {
  try {
    const user = await authClient.getCurrentUser();
    const data = await allocateTransactionToExpectedPayment(input, user?.id);
    revalidatePath('/dashboard/schedules');
    revalidatePath('/dashboard/money');
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to link transaction';
    return { success: false, error: message };
  }
}

export async function recordAndLinkTransactionAction(input: RecordTransactionFromExpectedInput) {
  try {
    const user = await authClient.getCurrentUser();
    const data = await recordTransactionForExpectedPayment(input, user?.id);
    revalidatePath('/dashboard/schedules');
    revalidatePath('/dashboard/money');
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record transaction';
    return { success: false, error: message };
  }
}

export async function allocateMultiTransactionsAction(
  transactionId: string,
  allocations: Array<{ expected_payment_id: string; allocated_amount: number }>
) {
  try {
    const user = await authClient.getCurrentUser();
    const data = await allocateTransactionAcrossMultiple(transactionId, allocations, user?.id);
    revalidatePath('/dashboard/schedules');
    revalidatePath('/dashboard/money');
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to allocate transaction';
    return { success: false, error: message };
  }
}

export async function unlinkAllocationAction(allocationId: string) {
  try {
    const user = await authClient.getCurrentUser();
    await unlinkAllocation(allocationId, user?.id);
    revalidatePath('/dashboard/schedules');
    revalidatePath('/dashboard/money');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to unlink allocation';
    return { success: false, error: message };
  }
}
