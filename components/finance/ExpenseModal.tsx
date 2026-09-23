'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingDown,
  Building,
  Calendar,
  CreditCard,
  Tag,
  AlertCircle,
  FileText,
  User,
  Receipt,
  CheckCircle2,
  Zap,
  Info,
  Layers,
} from 'lucide-react';
import { Button, Input, Select, Textarea, useToast, Drawer } from '@/components/admin/ui';
import {
  ExpenseDTO,
  CategoryDTO,
  ExpenseStatus,
  PaymentMethod,
  CreateExpenseInput,
  UpdateExpenseInput,
} from '@/modules/finance/domain/types';
import { formatCurrency } from '@/lib/format/currency';
import {
  createExpenseAction,
  updateExpenseAction,
} from '@/app/actions/expenses';
import {
  getCachedDropdownOptionsSync,
  getDropdownOptions,
} from '@/lib/cache/optionsCache';
import { cn } from '@/lib/utils';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (expense: ExpenseDTO) => void;
  expenseToEdit?: ExpenseDTO | null;
  defaultPropertyId?: string;
}

export function ExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  expenseToEdit,
  defaultPropertyId,
}: ExpenseModalProps) {
  const isEdit = Boolean(expenseToEdit);
  const { toast } = useToast();

  // Initialize immediately from synchronous in-memory cache for 0ms dropdown delays
  const syncCache = getCachedDropdownOptionsSync();
  const initialExpenseCats = (syncCache.categories || []).filter((c) => c.transaction_type === 'expense');

  // Form State
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(() => (initialExpenseCats.length > 0 ? initialExpenseCats[0].id : ''));
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [propertyId, setPropertyId] = useState(defaultPropertyId || '');
  const [leaseId, setLeaseId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [createTransaction, setCreateTransaction] = useState(true);
  const [status, setStatus] = useState<ExpenseStatus>('pending');
  const [notes, setNotes] = useState('');

  // GST & Tax Classification State
  const [gstInclusive, setGstInclusive] = useState(false);
  const [gstAmount, setGstAmount] = useState('');
  const [taxClassificationId, setTaxClassificationId] = useState('');

  // Options State (instantly populated)
  const [categories, setCategories] = useState<CategoryDTO[]>(initialExpenseCats);
  const [properties, setProperties] = useState<any[]>(syncCache.properties || []);
  const [leases, setLeases] = useState<any[]>(syncCache.leases || []);
  const [tenants, setTenants] = useState<any[]>(syncCache.tenants || []);
  const [taxClassifications, setTaxClassifications] = useState<any[]>(syncCache.taxClassifications || []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fast single-roundtrip sync on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    getDropdownOptions().then((opts) => {
      if (!isMounted) return;
      const expCats = (opts.categories || []).filter((c) => c.transaction_type === 'expense');
      setCategories(expCats);
      setProperties(opts.properties || []);
      setLeases(opts.leases || []);
      setTenants(opts.tenants || []);
      setTaxClassifications(opts.taxClassifications || []);
      if (!categoryId && expCats.length > 0 && !isEdit) {
        setCategoryId(expCats[0].id);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Populate on Edit or Open
  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setAmount(String(expenseToEdit.amount));
        setCategoryId(expenseToEdit.transaction_category_id || '');
        setExpenseDate(expenseToEdit.expense_date);
        setPropertyId(expenseToEdit.property_id);
        setLeaseId(expenseToEdit.lease_id || '');
        setVendorName(expenseToEdit.vendor_name || '');
        setDescription(expenseToEdit.description || '');
        setReference(expenseToEdit.reference || '');
        setStatus(expenseToEdit.status || 'pending');
        setNotes(expenseToEdit.notes || '');
        setCreateTransaction(false);
        setGstInclusive(Boolean(expenseToEdit.gst_inclusive));
        setGstAmount(expenseToEdit.gst_amount !== undefined && expenseToEdit.gst_amount !== null ? String(expenseToEdit.gst_amount) : '');
        setTaxClassificationId(expenseToEdit.tax_classification_id || '');
      } else {
        setAmount('');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setPropertyId(defaultPropertyId || '');
        setLeaseId('');
        setVendorName('');
        setDescription('');
        setReference('');
        setPaymentMethod('bank_transfer');
        setCreateTransaction(true);
        setStatus('pending');
        setNotes('');
        setGstInclusive(false);
        setGstAmount('');
        setTaxClassificationId('');
      }
      setFormErrors({});
    }
  }, [isOpen, expenseToEdit, defaultPropertyId]);

  // Selected property GST tracking capability
  const selectedProperty = useMemo(() => {
    return properties.find((p: any) => p.id === propertyId);
  }, [properties, propertyId]);

  const isGstEnabledOnProperty = Boolean(selectedProperty?.gst_enabled);

  // Filter Tax Classifications for expenses
  const filteredTaxClassifications = useMemo(() => {
    return taxClassifications.filter(
      (tc: any) => !tc.applies_to || tc.applies_to === 'both' || tc.applies_to === 'expense'
    );
  }, [taxClassifications]);

  // Auto-calculate 1/11th GST when amount or inclusive toggle changes
  const handleAmountOrGstChange = (newAmount: string, isInc: boolean) => {
    setAmount(newAmount);
    setGstInclusive(isInc);
    if (isInc && newAmount && !isNaN(parseFloat(newAmount))) {
      const val = parseFloat(newAmount);
      const calculatedGst = (val / 11).toFixed(2);
      setGstAmount(calculatedGst);
    } else if (!isInc) {
      setGstAmount('0.00');
    }
  };

  // Available Leases filtered by selected Property
  const availableLeases = useMemo(() => {
    if (!propertyId) return leases;
    return leases.filter((l) => l.property_id === propertyId);
  }, [leases, propertyId]);

  // Handle Property Change: Reset lease if no longer matches
  const handlePropertyChange = (newPropId: string) => {
    setPropertyId(newPropId);
    if (leaseId) {
      const isLeaseValid = leases.some((l) => l.id === leaseId && l.property_id === newPropId);
      if (!isLeaseValid) {
        setLeaseId('');
      }
    }
    const prop = properties.find((p: any) => p.id === newPropId);
    if (prop?.gst_enabled && !gstInclusive) {
      handleAmountOrGstChange(amount, true);
    }
    if (formErrors.propertyId) {
      setFormErrors((prev) => ({ ...prev, propertyId: '' }));
    }
  };

  // Handle Lease Change: Auto-set property if lease has one
  const handleLeaseChange = (newLeaseId: string) => {
    setLeaseId(newLeaseId);
    if (newLeaseId) {
      const selected = leases.find((l) => l.id === newLeaseId);
      if (selected && selected.property_id && selected.property_id !== propertyId) {
        setPropertyId(selected.property_id);
      }
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    const parsedAmount = parseFloat(amount);

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.amount = 'Please enter a valid expense amount greater than $0';
    }
    if (!propertyId) {
      errors.propertyId = 'Property is required for expenses';
    }
    if (!categoryId) {
      errors.categoryId = 'Please select an expense category';
    }
    if (!expenseDate) {
      errors.expenseDate = 'Expense date is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const parsedAmount = Math.round(parseFloat(amount) * 100) / 100;
      const parsedGst = gstInclusive && gstAmount ? Math.round(parseFloat(gstAmount) * 100) / 100 : 0;

      if (isEdit && expenseToEdit) {
        const updatePayload: UpdateExpenseInput = {
          property_id: propertyId,
          lease_id: leaseId || null,
          transaction_category_id: categoryId,
          amount: parsedAmount,
          expense_date: expenseDate,
          vendor_name: vendorName.trim() || null,
          description: description.trim() || null,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
          status: status,
          gst_inclusive: gstInclusive,
          gst_amount: parsedGst,
          tax_classification_id: taxClassificationId || null,
        };

        const res = await updateExpenseAction(expenseToEdit.id, updatePayload);
        if (!res.success || !res.data) {
          throw new Error(res.error || 'Failed to update expense');
        }

        toast({
          title: 'Expense Updated',
          description: 'The operating expense record was updated successfully.',
          variant: 'success',
        });
        onSuccess?.(res.data);
        onClose();
      } else {
        const createPayload: CreateExpenseInput = {
          property_id: propertyId,
          lease_id: leaseId || null,
          transaction_category_id: categoryId,
          amount: parsedAmount,
          expense_date: expenseDate,
          vendor_name: vendorName.trim() || null,
          description: description.trim() || null,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
          record_transaction: false,
          create_transaction: false,
          status: 'pending',
          gst_inclusive: gstInclusive,
          gst_amount: parsedGst,
          tax_classification_id: taxClassificationId || null,
        };

        const res = await createExpenseAction(createPayload);
        if (!res.success || !res.data) {
          throw new Error(res.error || 'Failed to record expense bill');
        }

        toast({
          title: 'Expense Bill Recorded',
          description: 'Unpaid operating expense bill recorded successfully. You can process and settle it anytime from the actions column.',
          variant: 'success',
        });
        onSuccess?.(res.data);
        onClose();
      }
    } catch (err: any) {
      console.error('Submit expense error:', err);
      toast({
        title: 'Error Saving Expense',
        description: err.message || 'Could not save expense record.',
        variant: 'destructive',
      });
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
        disabled={isSubmitting}
        className="bg-[#008F83] hover:bg-[#007A70] text-white font-bold"
      >
        {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Record Unpaid Bill'}
      </Button>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Operating Expense' : 'Record Operating Expense'}
      description="Record an unpaid operating expense or vendor bill. You can process and settle payment once received."
      width="lg"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-5 py-2">
        {/* Property & Optional Lease Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Property *"
            value={propertyId}
            onChange={(e) => handlePropertyChange(e.target.value)}
            error={formErrors.propertyId}
            options={[
              { value: '', label: '-- Select Mandatory Property --' },
              ...properties.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />

          <Select
            label="Associated Lease (Optional)"
            value={leaseId}
            onChange={(e) => handleLeaseChange(e.target.value)}
            options={[
              { value: '', label: '-- No Lease / Vacant Property --' },
              ...availableLeases.map((l) => {
                const tenantName = l.tenant ? `${l.tenant.first_name} ${l.tenant.last_name}` : 'Tenant';
                const propName = l.property?.name || 'Property';
                return {
                  value: l.id,
                  label: `${propName} - ${tenantName} (${l.start_date || 'Start'} to ${l.end_date || 'End'})`,
                };
              }),
            ]}
          />
        </div>

        {/* Amount & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Expense Amount ($) *"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              const newAmt = e.target.value;
              handleAmountOrGstChange(newAmt, gstInclusive);
              if (formErrors.amount) setFormErrors((prev) => ({ ...prev, amount: '' }));
            }}
            error={formErrors.amount}
            leftIcon={<DollarSign className="h-4 w-4 text-emerald-500" />}
          />

          <Select
            label="Expense Category *"
            value={categoryId}
            onChange={(e) => {
              const newCatId = e.target.value;
              setCategoryId(newCatId);
              const cat = categories.find((c) => c.id === newCatId);
              if (cat?.default_tax_classification_id) {
                setTaxClassificationId(cat.default_tax_classification_id);
                const tc = taxClassifications.find((t) => t.id === cat.default_tax_classification_id);
                const isTaxable = tc?.bas_code === '1B' || tc?.bas_code === 'G10' || tc?.bas_code === 'G1';
                if (isTaxable && !gstInclusive) {
                  handleAmountOrGstChange(amount, true);
                }
              }
              if (formErrors.categoryId) setFormErrors((prev) => ({ ...prev, categoryId: '' }));
            }}
            error={formErrors.categoryId}
            options={[
              { value: '', label: '-- Select Expense Category --' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>

        {/* Australian GST & Tax Classification Panel */}
        {isGstEnabledOnProperty ? (
          <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-900 dark:text-sky-300">
                🇦🇺 Australian GST & BAS Classification
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={gstInclusive}
                  onChange={(e) => handleAmountOrGstChange(amount, e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                />
                <span>Amount includes 10% GST</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="GST Portion ($)"
                type="number"
                step="0.01"
                value={gstAmount}
                onChange={(e) => setGstAmount(e.target.value)}
                placeholder="0.00"
                className="bg-white dark:bg-slate-800 text-xs font-mono"
              />

              <Select
                label="Tax Classification (for BAS)"
                value={taxClassificationId}
                onChange={(e) => setTaxClassificationId(e.target.value)}
                options={[
                  { value: '', label: 'Default Operating Expense [G11]' },
                  ...filteredTaxClassifications.map((tc: any) => ({
                    value: tc.id,
                    label: `${tc.name} ${tc.bas_code ? `[${tc.bas_code}]` : ''}`,
                  })),
                ]}
              />
            </div>
          </div>
        ) : propertyId ? (
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Property is not registered for GST. Expenses are recorded as GST-Free / Input-Taxed.</span>
          </div>
        ) : null}

        {/* Expense Date & Payee / Vendor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Expense Date *"
            type="date"
            value={expenseDate}
            onChange={(e) => {
              setExpenseDate(e.target.value);
              if (formErrors.expenseDate) setFormErrors((prev) => ({ ...prev, expenseDate: '' }));
            }}
            error={formErrors.expenseDate}
          />

          <Input
            label="Payee / Vendor Name"
            placeholder="e.g. Apex Plumbing, Council Rates, AGL Energy"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
          />
        </div>

        {/* Description & Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Description / Purpose"
            placeholder="e.g. Hot water system replacement"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Input
            label="Invoice # / Reference"
            placeholder="e.g. INV-2026-981"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>

        {/* Status (if editing) */}
        {isEdit && (
          <Select
            label="Expense Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
            options={[
              { value: 'pending', label: 'Pending / Unpaid' },
              { value: 'partially_paid', label: 'Partially Paid' },
              { value: 'paid', label: 'Paid & Settled' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        )}

        {/* Notes & Memo */}
        <Textarea
          label="Internal Notes & Memo"
          placeholder="Optional private notes regarding this expense..."
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Live Preview Summary */}
        {amount && parseFloat(amount) > 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Info className="h-4 w-4 text-[#008F83]" />
                Expense Bill Summary
              </span>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                Unpaid / Pending Bill
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs text-slate-500">Bill Amount Due:</span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {formatCurrency(parseFloat(amount))}
              </span>
            </div>
          </div>
        )}
      </form>
    </Drawer>
  );
}

