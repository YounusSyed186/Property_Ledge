'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building,
  User,
  FileText,
  Receipt,
  Calendar,
  CreditCard,
  Tag,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { Button, Input, Select, Textarea, useToast } from '@/components/admin/ui';
import {
  TransactionDTO,
  CategoryDTO,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  CreateTransactionInput,
  UpdateTransactionInput,
  AllocationStrategy,
} from '@/modules/finance/domain/types';
import { calculateAutoAllocation, ActiveLeaseForAllocation } from '@/modules/finance/domain/auto-allocate';
import { formatCurrency } from '@/lib/format/currency';
import { createTransactionAction, updateTransactionAction, createBatchAutoAllocatedTransactionsAction } from '@/app/actions/finance';
import { fetchInvoicesAction } from '@/app/actions/invoices';
import { getCachedDropdownOptionsSync, getDropdownOptions } from '@/lib/cache/optionsCache';
import { Loader2, Zap, SlidersHorizontal, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (transaction: TransactionDTO) => void;
  transactionToEdit?: TransactionDTO | null;
  defaultType?: TransactionType;
  defaultPropertyId?: string;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSuccess,
  transactionToEdit,
  defaultType = 'income',
  defaultPropertyId,
}: TransactionModalProps) {
  const isEdit = Boolean(transactionToEdit);
  const { toast } = useToast();

  const syncCache = getCachedDropdownOptionsSync();

  // Form State
  const [transactionType, setTransactionType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [propertyId, setPropertyId] = useState(defaultPropertyId || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<TransactionStatus>('completed');

  // Optional Context Linkages
  const [tenantId, setTenantId] = useState('');
  const [leaseId, setLeaseId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');

  // Loaded Options (Instantly available from synchronous cache)
  const [categories, setCategories] = useState<CategoryDTO[]>(syncCache.categories || []);
  const [properties, setProperties] = useState<any[]>(syncCache.properties || []);
  const [tenants, setTenants] = useState<any[]>(syncCache.tenants || []);
  const [leases, setLeases] = useState<any[]>(syncCache.leases || []);
  const [invoices, setInvoices] = useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fast single-roundtrip sync on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    getDropdownOptions().then((opts) => {
      if (!isMounted) return;
      setCategories(opts.categories || []);
      setProperties(opts.properties || []);
      setTenants(opts.tenants || []);
      setLeases(opts.leases || []);
    });

    fetchInvoicesAction({ limit: 100 })
      .then((res) => {
        if (isMounted) setInvoices(res.items || []);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Populate on Edit / Open
  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setTransactionType(transactionToEdit.transaction_type);
        setAmount(String(transactionToEdit.amount));
        setCategoryId(transactionToEdit.transaction_category_id);
        setTransactionDate(transactionToEdit.transaction_date);
        setPropertyId(transactionToEdit.property_id);
        setPaymentMethod((transactionToEdit.payment_method as PaymentMethod) || 'bank_transfer');
        setDescription(transactionToEdit.description || '');
        setReference(transactionToEdit.reference || '');
        setVendorName(transactionToEdit.vendor_name || '');
        setNotes(transactionToEdit.notes || '');
        setStatus(transactionToEdit.status);
        setTenantId(transactionToEdit.tenant_id || '');
        setLeaseId(transactionToEdit.lease_id || '');
        setInvoiceId(transactionToEdit.invoice_id || '');
      } else {
        setTransactionType(defaultType);
        setAmount('');
        setCategoryId('');
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setPropertyId(defaultPropertyId || '');
        setPaymentMethod('bank_transfer');
        setDescription('');
        setReference('');
        setVendorName('');
        setNotes('');
        setStatus('completed');
        setTenantId('');
        setLeaseId('');
        setInvoiceId('');
      }
      setFormErrors({});
    }
  }, [transactionToEdit, defaultType, defaultPropertyId, isOpen]);

  // Auto-Allocate Lump Sum Payment States
  const [isAutoAllocateMode, setIsAutoAllocateMode] = useState(false);
  const [allocationStrategy, setAllocationStrategy] = useState<AllocationStrategy>('equal_obligation');

  // Filter Categories by currently selected transaction type
  const availableCategories = useMemo(() => {
    return categories.filter((cat) => cat.transaction_type === transactionType);
  }, [categories, transactionType]);

  // Active Leases for Auto Allocation
  const activeLeasesForAllocation = useMemo<ActiveLeaseForAllocation[]>(() => {
    let list = leases.length > 0 ? leases : properties;

    // Filter by selected property if user selected a specific target property
    if (propertyId) {
      list = list.filter((l: any) => l.property_id === propertyId || l.id === propertyId);
    }

    return list.map((l: any) => {
      const propId = l.property_id || l.id;
      const prop = properties.find((p: any) => p.id === propId) || l;
      const propName = prop?.name || prop?.address_line_1 || prop?.address || `Property #${String(propId).slice(0, 6)}`;
      const tenantObj = tenants.find((t: any) => t.id === l.tenant_id || t.property_id === propId);
      const tenantName = tenantObj ? `${tenantObj.first_name || ''} ${tenantObj.last_name || ''}`.trim() : l.tenant_name || null;
      const rentAmt = Number(l.rent_amount || prop?.rent_amount || 200);

      return {
        id: l.id || propId,
        property_id: propId,
        property_name: propName,
        tenant_id: l.tenant_id || tenantObj?.id || null,
        tenant_name: tenantName,
        rent_amount: rentAmt,
      };
    });
  }, [leases, properties, tenants, propertyId]);


  // Calculated Auto Allocation Result
  const autoAllocationResult = useMemo(() => {
    const parsedAmt = parseFloat(amount) || 0;
    return calculateAutoAllocation(parsedAmt, activeLeasesForAllocation, allocationStrategy);
  }, [amount, activeLeasesForAllocation, allocationStrategy]);

  // Filter Tenants & Leases by selected Property
  const filteredTenants = useMemo(() => {
    if (!propertyId) return tenants;
    return tenants.filter((t: any) => t.property_id === propertyId || !t.property_id);
  }, [tenants, propertyId]);

  const filteredLeases = useMemo(() => {
    if (!propertyId) return leases;
    return leases.filter((l: any) => l.property_id === propertyId);
  }, [leases, propertyId]);

  const filteredInvoices = useMemo(() => {
    if (!propertyId) return invoices;
    return invoices.filter((i: any) => i.propertyId === propertyId);
  }, [invoices, propertyId]);

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.amount = 'Please enter a valid positive amount';
    }

    if (!categoryId) {
      errors.categoryId = `Please select an ${transactionType} category`;
    }

    if (!isAutoAllocateMode && !propertyId) {
      errors.propertyId = 'Property is required';
    }

    if (!transactionDate) {
      errors.transactionDate = 'Date is required';
    }

    if (isAutoAllocateMode && activeLeasesForAllocation.length === 0) {
      errors.autoAllocate = 'No active leases found for auto-allocation';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (isAutoAllocateMode && transactionType === 'income' && !isEdit) {
        // Execute Batch Auto-Allocation
        const validAllocations = autoAllocationResult.allocations.filter((a) => a.allocated_amount > 0);
        if (validAllocations.length === 0) {
          throw new Error('No allocations were computed. Please enter a valid lump sum amount.');
        }

        const batchRes = await createBatchAutoAllocatedTransactionsAction({
          totalAmount: parseFloat(amount),
          transaction_category_id: categoryId,
          transaction_date: transactionDate,
          payment_method: paymentMethod || 'bank_transfer',
          description: description.trim() || 'Auto-Allocated Rent Payment',
          notes: notes.trim() || `Auto-allocated $${amount} lump-sum payment across ${validAllocations.length} active leases.`,
          allocations: validAllocations.map((item) => ({
            lease_id: item.lease_id,
            property_id: item.property_id,
            tenant_id: item.tenant_id,
            allocated_amount: item.allocated_amount,
            property_name: item.property_name,
          })),
        });

        if (!batchRes.success || !batchRes.data) {
          throw new Error(batchRes.error || 'Failed to complete auto-allocation batch');
        }

        toast({
          title: '⚡ Payments Auto-Allocated',
          description: `Successfully allocated ${formatCurrency(parseFloat(amount))} across ${validAllocations.length} active lease(s).`,
          variant: 'success',
        });

        if (batchRes.data.length > 0) {
          onSuccess?.(batchRes.data[0]);
        }
        onClose();
        return;
      }

      if (isEdit && transactionToEdit) {
        const updateInput: UpdateTransactionInput = {
          amount: parseFloat(amount),
          transaction_type: transactionType,
          transaction_category_id: categoryId,
          transaction_date: transactionDate,
          property_id: propertyId,
          payment_method: paymentMethod || undefined,
          description: description.trim() || undefined,
          reference: reference.trim() || undefined,
          vendor_name: transactionType === 'expense' ? vendorName.trim() || undefined : undefined,
          notes: notes.trim() || undefined,
          status,
          tenant_id: transactionType === 'income' && tenantId ? tenantId : undefined,
          lease_id: leaseId || undefined,
          invoice_id: transactionType === 'income' && invoiceId ? invoiceId : undefined,
        };

        const res = await updateTransactionAction(transactionToEdit.id, updateInput);
        if (!res.success || !res.data) {
          throw new Error(res.error || 'Failed to update transaction');
        }

        toast({
          title: 'Transaction Updated',
          description: `Updated ${transactionType} record of ${formatCurrency(res.data.amount)}.`,
          variant: 'success',
        });

        onSuccess?.(res.data);
        onClose();
      } else {
        const createInput: CreateTransactionInput = {
          amount: parseFloat(amount),
          transaction_type: transactionType,
          transaction_category_id: categoryId,
          transaction_date: transactionDate,
          property_id: propertyId,
          payment_method: paymentMethod || undefined,
          description: description.trim() || undefined,
          reference: reference.trim() || undefined,
          vendor_name: transactionType === 'expense' ? vendorName.trim() || undefined : undefined,
          notes: notes.trim() || undefined,
          status,
          tenant_id: transactionType === 'income' && tenantId ? tenantId : undefined,
          lease_id: leaseId || undefined,
          invoice_id: transactionType === 'income' && invoiceId ? invoiceId : undefined,
        };

        const res = await createTransactionAction(createInput);
        if (!res.success || !res.data) {
          throw new Error(res.error || 'Failed to record transaction');
        }

        toast({
          title: 'Transaction Recorded',
          description: `Recorded ${transactionType} of ${formatCurrency(res.data.amount)}.`,
          variant: 'success',
        });

        onSuccess?.(res.data);
        onClose();
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      toast({
        title: isEdit ? 'Update Failed' : 'Recording Failed',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={onClose} />

      {/* Modal Dialog Card (Matching Add Property Form Layout) */}
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl z-10 p-6 sm:p-8">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Centered Header (Add Property Style) */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">
              {isEdit
                ? `Edit ${transactionType === 'income' ? 'Income' : 'Expense'}`
                : `Record ${transactionType === 'income' ? 'Income' : 'Expense'}`}
            </h2>
            <span
              className={cn(
                'text-[10.5px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border',
                transactionType === 'income'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
              )}
            >
              {transactionType === 'income' ? 'Money In' : 'Money Out'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {transactionType === 'income'
              ? 'Log incoming rental payments, security deposits, or sundry revenue.'
              : 'Log property repairs, maintenance, rates, or operating expenses.'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 px-0.5 py-1 text-sm">

          {/* Row 1: Amount & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={isAutoAllocateMode ? "Total Lump Sum Amount ($ AUD) *" : "Amount ($ AUD) *"}
              type="number"
              step="0.01"
              min="0.01"
              placeholder={isAutoAllocateMode ? "1000.00" : "0.00"}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (formErrors.amount) setFormErrors((p) => ({ ...p, amount: '' }));
              }}
              error={formErrors.amount}
              className="bg-white dark:bg-slate-800 font-semibold"
            />

            <Select
              label="Category *"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                if (formErrors.categoryId) setFormErrors((p) => ({ ...p, categoryId: '' }));
              }}
              error={formErrors.categoryId}
              className="bg-white dark:bg-slate-800"
            >
              <option value="">
                {`Select ${transactionType === 'income' ? 'Income' : 'Expense'} Category`}
              </option>
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Auto-Allocate Strategy & Live Preview Card */}
          {isAutoAllocateMode && (
            <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-slate-50 dark:bg-slate-800/40 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Auto-Allocation Breakdown</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Rent Obligation Capped
                </span>
              </div>


              {/* Live Allocation Preview Table */}
              <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden bg-white dark:bg-slate-900 text-xs">
                <div className="grid grid-cols-12 bg-slate-100 dark:bg-slate-800 p-2 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  <div className="col-span-5">Property & Tenant</div>
                  <div className="col-span-3 text-right">Rent Oblig.</div>
                  <div className="col-span-4 text-right">Allocated ($)</div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                  {autoAllocationResult.allocations.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-xs">
                      Enter a total amount above to view active lease allocations.
                    </div>
                  ) : (
                    autoAllocationResult.allocations.map((item, idx) => (
                      <div key={item.lease_id || idx} className="grid grid-cols-12 p-2.5 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <div className="col-span-5 font-semibold truncate text-slate-800 dark:text-slate-200">
                          <div>{item.property_name}</div>
                          <div className="text-[10px] text-slate-400 font-normal truncate">
                            {item.tenant_name || 'Active Lease'}
                          </div>
                        </div>
                        <div className="col-span-3 text-right text-slate-500 font-mono">
                          {formatCurrency(item.monthly_rent)}
                        </div>
                        <div className="col-span-4 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatCurrency(item.allocated_amount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Summary Bar */}
                <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">
                    Allocated: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(autoAllocationResult.total_allocated)}</strong> / {formatCurrency(autoAllocationResult.total_payment)}
                  </span>
                  {autoAllocationResult.remaining_unallocated > 0 && (
                    <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono text-[11px]">
                      Surplus: {formatCurrency(autoAllocationResult.remaining_unallocated)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Row 2: Property & Transaction Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={isAutoAllocateMode ? 'Target Property (Optional)' : 'Property *'}
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setTenantId('');
                setLeaseId('');
                setInvoiceId('');
                if (formErrors.propertyId) setFormErrors((p) => ({ ...p, propertyId: '' }));
              }}
              error={formErrors.propertyId}
              className="bg-white dark:bg-slate-800"
            >
              <option value="">
                {isAutoAllocateMode
                  ? 'All Active Leases (Workspace-wide)'
                  : 'Select Property'}
              </option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.address_line_1}
                </option>
              ))}
            </Select>

            <Input
              label="Transaction Date *"
              type="date"
              value={transactionDate}
              onChange={(e) => {
                setTransactionDate(e.target.value);
                if (formErrors.transactionDate)
                  setFormErrors((p) => ({ ...p, transactionDate: '' }));
              }}
              error={formErrors.transactionDate}
              className="bg-white dark:bg-slate-800"
            />
          </div>


          {/* Row 3: Description & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Description / Memo"
              placeholder={
                transactionType === 'income'
                  ? 'e.g. Rent payment for April'
                  : 'e.g. Plumbing emergency repair'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white dark:bg-slate-800"
            />

            <Input
              label="Reference / Invoice #"
              placeholder="e.g. REF-98421 or INV-004"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="bg-white dark:bg-slate-800 font-mono text-xs"
            />
          </div>

          {/* Row 4: Payment Method & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="bg-white dark:bg-slate-800"
            >
              <option value="bank_transfer">Direct Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="stripe">Stripe Portal</option>
              <option value="other">Other Method</option>
            </Select>

            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TransactionStatus)}
              className="bg-white dark:bg-slate-800"
            >
              <option value="completed">Completed (Cleared)</option>
              <option value="pending">Pending Reconciliation</option>
              <option value="reversed">Reversed / Void</option>
              <option value="failed">Failed</option>
            </Select>
          </div>

          {/* Context Fields: Expense (Vendor & Optional Lease) vs Income (Tenant, Lease, Invoice) */}
          {transactionType === 'expense' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Vendor / Payee Name (Optional)"
                placeholder="e.g. Apex Plumbing Services Pty Ltd"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="bg-white dark:bg-slate-800"
              />
              <Select
                label="Associated Lease (Optional)"
                value={leaseId}
                onChange={(e) => setLeaseId(e.target.value)}
                className="bg-white dark:bg-slate-800 text-xs"
                disabled={!propertyId || filteredLeases.length === 0}
              >
                <option value="">No Lease (General Expense)</option>
                {filteredLeases.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    Lease #{l.id.slice(0, 8)}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            !isAutoAllocateMode && (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Associated Tenancy Context (Optional)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Tenant"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="bg-white dark:bg-slate-800 text-xs"
                    labelBg="bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="">None / Property Level</option>
                    {filteredTenants.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name}
                      </option>
                    ))}
                  </Select>

                  <Select
                    label="Lease"
                    value={leaseId}
                    onChange={(e) => setLeaseId(e.target.value)}
                    className="bg-white dark:bg-slate-800 text-xs"
                    labelBg="bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="">None / Property Level</option>
                    {filteredLeases.map((l: any) => (
                      <option key={l.id} value={l.id}>
                        Lease #{l.id.slice(0, 8)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            )
          )}

          {/* Notes */}
          <Textarea
            label="Internal Notes (Optional)"
            placeholder="Additional internal audit notes or transaction breakdown..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="bg-white dark:bg-slate-800 resize-none text-xs"
          />

          {/* Action Footer (Add Property Style) */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "font-bold text-xs shadow-xs",
                isAutoAllocateMode
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-admin-primary hover:bg-admin-primary/90 text-white"
              )}
            >
              {isSubmitting
                ? 'Processing...'
                : isAutoAllocateMode
                ? '⚡ Record Auto-Allocated Payments'
                : isEdit
                ? 'Save Changes'
                : `Record ${transactionType === 'income' ? 'Income' : 'Expense'}`}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
