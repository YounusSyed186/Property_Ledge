'use client';

import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Lock, AlertTriangle, X } from 'lucide-react';
import { Button, Input, Select, Textarea, useToast } from '@/components/admin/ui';
import { updateExpectedEntryAction, deleteExpectedEntryAction } from '@/app/actions/schedules';
import { ExpectedPaymentScheduleDTO } from '@/modules/finance/domain/types';

interface EditScheduleModalProps {
  isOpen: boolean;
  expectedPayment: ExpectedPaymentScheduleDTO | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditScheduleModal({
  isOpen,
  expectedPayment,
  onClose,
  onSuccess,
}: EditScheduleModalProps) {
  const { toast } = useToast();

  const [scheduleName, setScheduleName] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<string>('pending');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isOpen || !expectedPayment) return;

    setScheduleName(expectedPayment.schedule_name);
    setAmount(String(expectedPayment.amount));
    setDueDate(expectedPayment.due_date);
    setNotes(expectedPayment.notes || '');
    setStatus(expectedPayment.status);
    setShowConfirmDelete(false);
  }, [isOpen, expectedPayment]);

  if (!isOpen || !expectedPayment) return null;

  const hasAllocations = expectedPayment.allocations && expectedPayment.allocations.length > 0;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!scheduleName.trim()) {
      toast({ title: 'Validation Error', description: 'Schedule name cannot be empty.', variant: 'destructive' });
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter a valid amount.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateExpectedEntryAction(expectedPayment.id, {
        schedule_name: scheduleName,
        amount: numAmount,
        due_date: dueDate,
        notes,
        status: status as any,
      });

      if (res.success) {
        toast({ title: 'Success', description: 'Expected payment entry updated.' });
        onSuccess();
        onClose();
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to update entry', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update entry', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteExpectedEntryAction(expectedPayment.id);
      if (res.success) {
        toast({ title: 'Deleted', description: 'Expected payment entry removed.' });
        onSuccess();
        onClose();
      } else {
        toast({ title: 'Delete Restricted', description: res.error || 'Failed to delete entry', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Delete Restricted', description: err.message || 'Failed to delete entry', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans text-slate-900 dark:text-slate-100"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl z-10 p-6 sm:p-8">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Centered Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">
            Edit Expected Payment Entry
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Modify expected entry details or update payment status.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto space-y-4 px-0.5 py-1">
          {/* Protection Warning Banner (Journey 8) */}
          {hasAllocations && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 flex items-start gap-3 text-xs text-amber-600 dark:text-amber-400">
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Referential Integrity Protection Active</p>
                <p className="text-[11px] opacity-90">
                  This entry has {expectedPayment.allocations?.length} linked actual transaction allocation(s). Amount
                  modification and deletion are locked to preserve financial history integrity.
                </p>
              </div>
            </div>
          )}

          <Input
            label="Schedule Name *"
            value={scheduleName}
            onChange={(e) => setScheduleName(e.target.value)}
            className="bg-white dark:bg-slate-800"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Expected Amount ($) *"
              type="number"
              step="0.01"
              disabled={hasAllocations}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-white dark:bg-slate-800"
            />

            <Input
              label="Due Date *"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-white dark:bg-slate-800"
            />
          </div>

          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-white dark:bg-slate-800"
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'partially_paid', label: 'Partially Paid' },
              { value: 'paid', label: 'Paid' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />

          <Textarea
            label="Notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-white dark:bg-slate-800"
          />

          {showConfirmDelete && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-3">
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Are you sure you want to delete this expected payment entry?
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowConfirmDelete(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center gap-3 mt-6 pt-2">
            <button
              type="button"
              onClick={() => {
                if (hasAllocations) {
                  toast({
                    title: 'Delete Blocked',
                    description: 'Entries with linked financial transactions cannot be deleted.',
                    variant: 'destructive',
                  });
                } else {
                  setShowConfirmDelete(true);
                }
              }}
              disabled={isSubmitting || isDeleting}
              className={`h-12 px-4 rounded-xl border font-semibold text-xs transition-colors flex items-center gap-1.5 focus:outline-none ${
                hasAllocations
                  ? 'border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                  : 'border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
              title="Delete Entry"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl bg-[#008F83] hover:bg-[#007A70] text-white font-semibold text-sm shadow-md transition-all duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#008F83]/25 active:scale-[0.99]"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
