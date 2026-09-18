'use client';

import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Lock, AlertTriangle } from 'lucide-react';
import { Button, Input, Select, Textarea, useToast, Drawer } from '@/components/admin/ui';
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

  const footer = (
    <div className="flex items-center justify-between w-full">
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
        className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
          hasAllocations ? 'text-slate-400 cursor-not-allowed' : 'text-rose-600 hover:text-rose-700'
        }`}
      >
        <Trash2 className="h-4 w-4" />
        Delete Entry
      </button>

      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleUpdate as any}
          disabled={isSubmitting}
          className="bg-[#008F83] hover:bg-[#007A70] text-white"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Expected Payment Entry"
      description="Modify expected entry details or update status"
      width="md"
      footer={footer}
    >
      <form onSubmit={handleUpdate} className="space-y-4 py-2">
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
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Expected Amount ($) *"
            type="number"
            step="0.01"
            disabled={hasAllocations}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <Input
            label="Due Date *"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
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
      </form>
    </Drawer>
  );
}
