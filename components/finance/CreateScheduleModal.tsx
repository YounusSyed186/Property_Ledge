'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  DollarSign,
  FileText,
  Building,
  Layers,
  Sparkles,
  Info,
  Clock,
  Plus,
} from 'lucide-react';
import { Button, Input, Select, Textarea, useToast, Drawer } from '@/components/admin/ui';
import { createScheduleAction } from '@/app/actions/schedules';
import { fetchCategoriesAction } from '@/app/actions/finance';
import { fetchDashboardLeases, fetchDashboardProperties } from '@/app/actions/dashboard';
import { getCachedCategories, getCachedProperties } from '@/lib/cache/optionsCache';
import { generateScheduleEntries } from '@/modules/finance/domain/scheduleGenerator';
import { CategoryDTO, ScheduleFrequency, ScheduleType } from '@/modules/finance/domain/types';
import { cn } from '@/lib/utils';

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultPropertyId?: string | null;
}

export function CreateScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  defaultPropertyId,
}: CreateScheduleModalProps) {
  const { toast } = useToast();

  const [scheduleType, setScheduleType] = useState<ScheduleType>('lease');
  const [scheduleName, setScheduleName] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [frequency, setFrequency] = useState<ScheduleFrequency>('monthly');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(defaultPropertyId || '');
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    getCachedCategories('income').then((cats) => {
      setCategories(cats || []);
      const rentCat = (cats || []).find((c) => c.name.toLowerCase().includes('rent'));
      if (rentCat) setSelectedCategoryId(rentCat.id);
    });

    getCachedProperties().then((props) => setProperties(props || []));
    fetchDashboardLeases().then((lData) => setLeases(lData || []));
  }, [isOpen]);

  useEffect(() => {
    if (defaultPropertyId) setSelectedPropertyId(defaultPropertyId);
  }, [defaultPropertyId]);

  const handleLeaseChange = (leaseId: string) => {
    setSelectedLeaseId(leaseId);
    if (!leaseId) return;

    const lease = leases.find((l) => l.id === leaseId);
    if (lease) {
      if (lease.property_id) setSelectedPropertyId(lease.property_id);
      if (lease.rent_amount) setAmount(String(lease.rent_amount));
      if (lease.rent_frequency) setFrequency(lease.rent_frequency as ScheduleFrequency);
      if (lease.start_date) setStartDate(lease.start_date.split('T')[0]);
      if (lease.end_date) setEndDate(lease.end_date.split('T')[0]);

      const tenantName = lease.tenant ? `${lease.tenant.first_name} ${lease.tenant.last_name}` : 'Tenant';
      const propName = lease.property?.name || 'Property';
      setScheduleName(`Rent Schedule - ${propName} (${tenantName})`);
    }
  };

  const previewEntries = useMemo(() => {
    const numAmount = parseFloat(amount);
    if (!scheduleName || !startDate || !endDate || isNaN(numAmount) || numAmount <= 0) return [];
    try {
      return generateScheduleEntries({
        schedule_name: scheduleName,
        schedule_type: scheduleType,
        amount: numAmount,
        frequency,
        start_date: startDate,
        end_date: endDate,
        property_id: selectedPropertyId || null,
        lease_id: scheduleType === 'lease' ? selectedLeaseId || null : null,
        transaction_category_id: selectedCategoryId || null,
        notes,
      });
    } catch {
      return [];
    }
  }, [
    scheduleName,
    scheduleType,
    amount,
    frequency,
    startDate,
    endDate,
    selectedPropertyId,
    selectedLeaseId,
    selectedCategoryId,
    notes,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (!scheduleName.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter a schedule name.', variant: 'destructive' });
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter a valid amount > 0.', variant: 'destructive' });
      return;
    }
    if (scheduleType === 'lease' && !selectedLeaseId) {
      toast({ title: 'Validation Error', description: 'Please select an active lease.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedLease = leases.find((l) => l.id === selectedLeaseId);
      const tenantId = selectedLease?.tenant_id || selectedLease?.tenant?.id || null;

      const res = await createScheduleAction({
        schedule_name: scheduleName,
        schedule_type: scheduleType,
        amount: numAmount,
        frequency,
        start_date: startDate,
        end_date: endDate,
        property_id: selectedPropertyId || null,
        lease_id: scheduleType === 'lease' ? selectedLeaseId || null : null,
        tenant_id: tenantId,
        transaction_category_id: selectedCategoryId || null,
        notes: notes || null,
      });

      if (res.success && res.data) {
        toast({
          title: 'Schedule Created',
          description: `Generated ${res.data.length} expected payment entries!`,
        });
        onSuccess();
        onClose();
      } else {
        toast({ title: 'Error', description: res.error || 'Failed to create schedule', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'An error occurred', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-3 w-full">
      <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        type="button"
        onClick={handleSubmit as any}
        disabled={isSubmitting || previewEntries.length === 0}
        className="bg-[#008F83] hover:bg-[#007A70] text-white"
      >
        {isSubmitting ? 'Generating...' : `Generate Schedule (${previewEntries.length} entries)`}
      </Button>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create Payment Schedule"
      description="Setup recurring lease-based rent schedules or independent expected payments"
      width="lg"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-5 py-2">
        {/* Schedule Type Segment Selector */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              setScheduleType('lease');
              setScheduleName('');
            }}
            className={cn(
              'h-11 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 border',
              scheduleType === 'lease'
                ? 'bg-[#008F83] text-white border-transparent shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
            )}
          >
            <FileText className="h-4 w-4" />
            Lease-Based Schedule
          </button>

          <button
            type="button"
            onClick={() => {
              setScheduleType('independent');
              setSelectedLeaseId('');
              setScheduleName('Recurring Maintenance / Obligation');
            }}
            className={cn(
              'h-11 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 border',
              scheduleType === 'independent'
                ? 'bg-[#008F83] text-white border-transparent shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#008F83]/40'
            )}
          >
            <Layers className="h-4 w-4" />
            Independent Schedule
          </button>
        </div>

        {/* Lease Select (if Lease-Based) */}
        {scheduleType === 'lease' && (
          <Select
            label="Select Lease *"
            value={selectedLeaseId}
            onChange={(e) => handleLeaseChange(e.target.value)}
            options={[
              { value: '', label: '-- Choose Active Lease --' },
              ...leases.map((l) => ({
                value: l.id,
                label: `${l.property?.name || 'Property'} - ${
                  l.tenant ? `${l.tenant.first_name} ${l.tenant.last_name}` : 'Tenant'
                } ($${l.rent_amount || 0}/${l.rent_frequency || 'm'})`,
              })),
            ]}
          />
        )}

        {/* Property & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Associated Property"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            options={[
              { value: '', label: '-- Workspace Level / None --' },
              ...properties.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />

          <Select
            label="Category"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            options={[
              { value: '', label: '-- Select Category --' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>

        {/* Schedule Name & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Schedule Name *"
            placeholder="e.g. Monthly Rent - Unit 4B"
            value={scheduleName}
            onChange={(e) => setScheduleName(e.target.value)}
          />

          <Input
            label="Expected Amount ($) *"
            type="number"
            step="0.01"
            placeholder="1000.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            leftIcon={<DollarSign className="h-4 w-4 text-emerald-500" />}
          />
        </div>

        {/* Frequency & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Frequency *"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'fortnightly', label: 'Fortnightly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'yearly', label: 'Yearly' },
              { value: 'custom', label: 'Custom / One-off' },
            ]}
          />

          <Input
            label="Start Date *"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            label="End Date *"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <Textarea
          label="Schedule Notes"
          placeholder="Optional notes or internal reference..."
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Live Preview Table */}
        {previewEntries.length > 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Info className="h-4 w-4 text-[#008F83]" />
                Generated Schedule Preview
              </span>
              <span className="rounded-full bg-[#008F83]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#008F83]">
                {previewEntries.length} entries to create
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {previewEntries.slice(0, 8).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">{item.schedule_name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 font-mono text-[11px]">Due: {item.due_date}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ${item.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              {previewEntries.length > 8 && (
                <p className="text-[11px] text-center text-slate-500 pt-1">
                  ...and {previewEntries.length - 8} more entries
                </p>
              )}
            </div>
          </div>
        )}
      </form>
    </Drawer>
  );
}
