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
  Receipt,
  Percent,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button, Input, Select, Textarea, useToast, Drawer } from '@/components/admin/ui';
import { createScheduleAction } from '@/app/actions/schedules';
import { getDropdownOptions } from '@/lib/cache/optionsCache';
import { generateScheduleEntries } from '@/modules/finance/domain/scheduleGenerator';
import { resolveScheduleTaxContext } from '@/modules/finance/domain/taxContext';
import { calculateGstPortion } from '@/modules/finance/domain/bas-calculations';
import {
  CategoryDTO,
  TaxClassificationDTO,
  ScheduleFrequency,
  ScheduleType,
} from '@/modules/finance/domain/types';
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

  // Tax & GST State
  const [gstInclusive, setGstInclusive] = useState<boolean>(false);
  const [gstAmount, setGstAmount] = useState<string>('0.00');
  const [taxClassificationId, setTaxClassificationId] = useState<string>('');
  const [originExplanation, setOriginExplanation] = useState<string>('');
  const [showAdvancedTax, setShowAdvancedTax] = useState<boolean>(false);
  const [hasManualTaxOverride, setHasManualTaxOverride] = useState<boolean>(false);

  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [taxClassifications, setTaxClassifications] = useState<TaxClassificationDTO[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    getDropdownOptions().then((opts) => {
      setCategories(opts.categories || []);
      setProperties(opts.properties || []);
      setLeases(opts.leases || []);
      setTaxClassifications(opts.taxClassifications || []);

      const rentCat = (opts.categories || []).find((c) => c.name.toLowerCase().includes('rent'));
      if (rentCat && !selectedCategoryId) {
        setSelectedCategoryId(rentCat.id);
      }
    });
  }, [isOpen]);

  useEffect(() => {
    if (defaultPropertyId) setSelectedPropertyId(defaultPropertyId);
  }, [defaultPropertyId]);

  const getLeaseTenant = (lease: any) => {
    if (!lease) return null;
    if (lease.tenant) return lease.tenant;
    const primaryLt = lease.lease_tenants?.find((lt: any) => lt.is_primary)?.tenant;
    if (primaryLt) return primaryLt;
    const fallbackLt = lease.lease_tenants?.[0]?.tenant;
    if (fallbackLt) return fallbackLt;
    return null;
  };

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

      const tenant = getLeaseTenant(lease);
      const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Tenant';
      const propName = lease.property?.name || 'Property';
      setScheduleName(`Rent Schedule - ${propName} (${tenantName})`);
    }
  };

  // Amount Change Handler to dynamically recompute GST when amount changes
  const handleAmountChange = (newAmount: string) => {
    setAmount(newAmount);
    if (hasManualTaxOverride) {
      if (gstInclusive) {
        const num = parseFloat(newAmount) || 0;
        setGstAmount(num > 0 ? (num / 11).toFixed(2) : '0.00');
      } else {
        setGstAmount('0.00');
      }
    }
  };

  // Automatic Tax Context Resolution
  useEffect(() => {
    const numAmount = parseFloat(amount) || 0;

    if (hasManualTaxOverride) {
      if (gstInclusive) {
        setGstAmount(numAmount > 0 ? (numAmount / 11).toFixed(2) : '0.00');
      } else {
        setGstAmount('0.00');
      }
      return;
    }

    const prop = properties.find((p) => p.id === selectedPropertyId);
    const cat = categories.find((c) => c.id === selectedCategoryId);

    const resolution = resolveScheduleTaxContext({
      amount: numAmount,
      scheduleType,
      property: prop,
      category: cat,
      taxClassifications,
    });

    setGstInclusive(resolution.gst_inclusive);
    setGstAmount(resolution.gst_amount.toFixed(2));
    setTaxClassificationId(resolution.tax_classification_id || '');
    setOriginExplanation(resolution.originExplanation);
  }, [
    amount,
    selectedPropertyId,
    selectedCategoryId,
    scheduleType,
    properties,
    categories,
    taxClassifications,
    hasManualTaxOverride,
    gstInclusive,
  ]);

  const handleGstToggle = (isInc: boolean) => {
    setHasManualTaxOverride(true);
    setGstInclusive(isInc);
    const numAmount = parseFloat(amount) || 0;
    const { gst } = calculateGstPortion(numAmount, isInc);
    setGstAmount(isInc ? gst.toFixed(2) : '0.00');
    setOriginExplanation('Manually overridden by user');
  };

  const handleTaxClassChange = (classId: string) => {
    setHasManualTaxOverride(true);
    setTaxClassificationId(classId);
    setOriginExplanation('Manually overridden by user');
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
        gst_inclusive: gstInclusive,
        gst_amount: parseFloat(gstAmount) || 0,
        tax_classification_id: taxClassificationId || null,
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
    gstInclusive,
    gstAmount,
    taxClassificationId,
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
      const tenant = getLeaseTenant(selectedLease);
      const tenantId =
        selectedLease?.tenant_id ||
        tenant?.id ||
        selectedLease?.lease_tenants?.find((lt: any) => lt.is_primary)?.tenant_id ||
        selectedLease?.lease_tenants?.[0]?.tenant_id ||
        null;

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
        gst_inclusive: gstInclusive,
        gst_amount: parseFloat(gstAmount) || 0,
        tax_classification_id: taxClassificationId || null,
      });

      if (res.success && res.data) {
        toast({
          title: 'Schedule Created',
          description: `Generated ${res.data.length} expected payment entries with tax classification!`,
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
        className="bg-[#008F83] hover:bg-[#007A70] text-white font-bold"
      >
        {isSubmitting ? 'Generating...' : `Generate Schedule (${previewEntries.length} entries)`}
      </Button>
    </div>
  );

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const selectedTaxClass = taxClassifications.find((t) => t.id === taxClassificationId);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create Payment Schedule"
      description="Setup recurring rent schedules or independent obligations with full tax classification & BAS tracking"
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
              setHasManualTaxOverride(false);
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
              setHasManualTaxOverride(false);
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
              ...leases.map((l) => {
                const tenant = getLeaseTenant(l);
                const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Tenant';
                return {
                  value: l.id,
                  label: `${l.property?.name || 'Property'} - ${tenantName} ($${l.rent_amount || 0}/${l.rent_frequency || 'm'})`,
                };
              }),
            ]}
          />
        )}

        {/* Property & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Associated Property"
            value={selectedPropertyId}
            onChange={(e) => {
              setSelectedPropertyId(e.target.value);
              setHasManualTaxOverride(false);
            }}
            options={[
              { value: '', label: '-- Workspace Level / None --' },
              ...properties.map((p) => ({
                value: p.id,
                label: `${p.name}${p.gst_enabled ? ' (GST Registered)' : ''}`,
              })),
            ]}
          />

          <Select
            label="Category"
            value={selectedCategoryId}
            onChange={(e) => {
              setSelectedCategoryId(e.target.value);
              setHasManualTaxOverride(false);
            }}
            options={[
              { value: '', label: '-- Select Category --' },
              ...categories.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.transaction_type})`,
              })),
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
            onChange={(e) => handleAmountChange(e.target.value)}
            leftIcon={<DollarSign className="h-4 w-4 text-emerald-500" />}
          />
        </div>

        {/* GST & Tax Treatment Financial Context Panel */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[#008F83]" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                GST Treatment & Tax Classification
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvancedTax(!showAdvancedTax)}
              className="text-[11px] text-[#008F83] hover:underline flex items-center gap-1 font-semibold"
            >
              {showAdvancedTax ? 'Hide Details' : 'Advanced Tax Settings'}
              {showAdvancedTax ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-bold border',
                gstInclusive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              )}
            >
              {gstInclusive ? `Taxable (${gstAmount ? `$${gstAmount} GST` : '10% GST'})` : 'GST-Free / Input Taxed ($0 GST)'}
            </span>

            {selectedTaxClass && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#008F83]/10 text-[#008F83] border border-[#008F83]/20">
                BAS: {selectedTaxClass.bas_code || 'G1'} — {selectedTaxClass.name}
              </span>
            )}
          </div>

          {originExplanation && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-[#008F83]" />
              {originExplanation}
            </p>
          )}

          {showAdvancedTax && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">GST Registration</label>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="gstInclusiveToggle"
                    checked={gstInclusive}
                    onChange={(e) => handleGstToggle(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#008F83] focus:ring-[#008F83]"
                  />
                  <label htmlFor="gstInclusiveToggle" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    Amount includes GST
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">GST Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  disabled={!gstInclusive}
                  value={gstAmount}
                  onChange={(e) => {
                    setHasManualTaxOverride(true);
                    setGstAmount(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">BAS Classification</label>
                <select
                  value={taxClassificationId}
                  onChange={(e) => handleTaxClassChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="">-- Auto-resolve / None --</option>
                  {taxClassifications.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.bas_code ? `[${t.bas_code}] ` : ''}{t.name} ({t.applies_to})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
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
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{item.schedule_name}</span>
                    {item.gst_inclusive && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                        GST: ${item.gst_amount?.toFixed(2)}
                      </span>
                    )}
                  </div>
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

