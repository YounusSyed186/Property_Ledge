'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt, Building, Tag, DollarSign, Calendar, FileText, User, ShieldCheck } from 'lucide-react';
import { Input, Select, Textarea, useToast } from '@/components/admin/ui';
import {
  ExpenseDTO,
  CategoryDTO,
  PaymentMethod,
  CreateExpenseInput,
  UpdateExpenseInput,
  ReceiptAttachment as ReceiptAttachmentType,
} from '@/modules/finance/domain/types';
import {
  createExpenseAction,
  updateExpenseAction,
} from '@/app/actions/expenses';
import {
  getCachedDropdownOptionsSync,
  getDropdownOptions,
} from '@/lib/cache/optionsCache';
import { ReceiptAttachment } from './ReceiptAttachment';

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

  // Initialize immediately from synchronous in-memory cache
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
  const [notes, setNotes] = useState('');

  // GST & Tax Classification State (Exclusive only / GST-Free)
  const [gstTreatment, setGstTreatment] = useState<'exclusive' | 'none'>('exclusive');
  const [gstInclusive, setGstInclusive] = useState(false);
  const [gstAmount, setGstAmount] = useState('');
  const [taxClassificationId, setTaxClassificationId] = useState('');

  // Options State
  const [categories, setCategories] = useState<CategoryDTO[]>(initialExpenseCats);
  const [properties, setProperties] = useState<any[]>(syncCache.properties || []);
  const [leases, setLeases] = useState<any[]>(syncCache.leases || []);
  const [taxClassifications, setTaxClassifications] = useState<any[]>(syncCache.taxClassifications || []);
  const [selectedReceiptFile, setSelectedReceiptFile] = useState<File | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<ReceiptAttachmentType | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Body scroll lock on open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

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
      setTaxClassifications(opts.taxClassifications || []);
      if (!categoryId && expCats.length > 0 && !isEdit) {
        setCategoryId(expCats[0].id);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, categoryId, isEdit]);

  // Populate on Edit or Open
  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setAmount(String(expenseToEdit.amount));
        setCategoryId(expenseToEdit.transaction_category_id || '');
        setExpenseDate(expenseToEdit.transaction_date || expenseToEdit.expense_date || new Date().toISOString().split('T')[0]);
        setPropertyId(expenseToEdit.property_id);
        setLeaseId(expenseToEdit.lease_id || '');
        setVendorName(expenseToEdit.vendor_name || '');
        setDescription(expenseToEdit.description || '');
        setReference(expenseToEdit.reference || '');
        setPaymentMethod((expenseToEdit.payment_method as PaymentMethod) || 'bank_transfer');
        setNotes(expenseToEdit.notes || '');

        const hasGst = Number(expenseToEdit.gst_amount || 0) > 0;
        setGstInclusive(false);
        setGstTreatment(hasGst ? 'exclusive' : 'none');
        setGstAmount(expenseToEdit.gst_amount !== undefined && expenseToEdit.gst_amount !== null ? String(expenseToEdit.gst_amount) : '');
        setTaxClassificationId(expenseToEdit.tax_classification_id || '');

        if (expenseToEdit.receipt_url) {
          setExistingReceipt({
            url: expenseToEdit.receipt_url,
            blobPath: expenseToEdit.receipt_blob_path || '',
            fileName: expenseToEdit.receipt_file_name || 'Receipt.pdf',
            fileSize: expenseToEdit.receipt_file_size || 0,
            mimeType: expenseToEdit.receipt_mime_type || 'application/pdf',
            uploadedAt: expenseToEdit.receipt_uploaded_at || expenseToEdit.created_at || new Date().toISOString(),
          });
        } else {
          setExistingReceipt(null);
        }
        setSelectedReceiptFile(null);
      } else {
        setAmount('');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setPropertyId(defaultPropertyId || '');
        setLeaseId('');
        setVendorName('');
        setDescription('');
        setReference('');
        setPaymentMethod('bank_transfer');
        setExistingReceipt(null);
        setSelectedReceiptFile(null);
        setNotes('');
        setGstTreatment('exclusive');
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

  // Auto-calculate GST when amount or treatment changes
  const handleAmountOrGstChange = (
    newAmount: string,
    treatment: 'exclusive' | 'none' = gstTreatment
  ) => {
    setAmount(newAmount);
    setGstTreatment(treatment);
    setGstInclusive(false);

    const val = parseFloat(newAmount);
    if (!isNaN(val) && val > 0) {
      if (treatment === 'exclusive') {
        const calculatedGst = (val * 0.1).toFixed(2);
        setGstAmount(calculatedGst);
      } else {
        setGstAmount('0.00');
      }
    } else {
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
      const parsedGst = gstTreatment !== 'none' && gstAmount ? Math.round(parseFloat(gstAmount) * 100) / 100 : 0;

      if (isEdit && expenseToEdit) {
        const updatePayload: UpdateExpenseInput = {
          property_id: propertyId,
          lease_id: leaseId || null,
          transaction_category_id: categoryId || null,
          amount: parsedAmount,
          transaction_date: expenseDate,
          vendor_name: vendorName.trim() || null,
          description: description.trim() || null,
          reference: reference.trim() || null,
          payment_method: paymentMethod,
          notes: notes.trim() || null,
          status: 'completed',
          gst_inclusive: false,
          gst_amount: parsedGst,
          tax_classification_id: taxClassificationId || null,
          receipt_url: existingReceipt?.url || null,
          receipt_blob_path: existingReceipt?.blobPath || null,
          receipt_file_name: existingReceipt?.fileName || null,
          receipt_file_size: existingReceipt?.fileSize || null,
          receipt_mime_type: existingReceipt?.mimeType || null,
          receipt_uploaded_at: existingReceipt?.uploadedAt || null,
        };

        const res = await updateExpenseAction(expenseToEdit.id, updatePayload);
        if (!res.success || !res.data) {
          throw new Error(res.error || 'Failed to update expense');
        }

        toast({
          title: 'Expense Updated',
          description: 'The operating expense transaction was updated successfully.',
          variant: 'success',
        });
        onSuccess?.(res.data);
        onClose();
      } else {
        const createPayload: CreateExpenseInput = {
          property_id: propertyId,
          lease_id: leaseId || null,
          transaction_category_id: categoryId || null,
          amount: parsedAmount,
          transaction_date: expenseDate,
          vendor_name: vendorName.trim() || null,
          description: description.trim() || null,
          reference: reference.trim() || null,
          payment_method: paymentMethod,
          notes: notes.trim() || null,
          status: 'completed',
          gst_inclusive: false,
          gst_amount: parsedGst,
          tax_classification_id: taxClassificationId || null,
          receipt_url: existingReceipt?.url || null,
          receipt_blob_path: existingReceipt?.blobPath || null,
          receipt_file_name: existingReceipt?.fileName || null,
          receipt_file_size: existingReceipt?.fileSize || null,
          receipt_mime_type: existingReceipt?.mimeType || null,
          receipt_uploaded_at: existingReceipt?.uploadedAt || null,
        };

        const res = await createExpenseAction(createPayload);
        if (!res.success || !res.data) {
          throw new Error(res.error || 'Failed to record expense');
        }

        toast({
          title: 'Expense Recorded',
          description: 'Operating expense recorded directly in the financial ledger.',
          variant: 'success',
        });
        onSuccess?.(res.data);
        onClose();
      }
    } catch (err: any) {
      console.error('Submit expense error:', err);
      toast({
        title: 'Error Saving Expense',
        description: err.message || 'Could not save expense transaction.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] z-10 p-6 sm:p-8 my-auto"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#008F83]/30"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content Container */}
            <div className="w-full max-w-xl mx-auto font-sans text-slate-900 dark:text-slate-100">
              {/* Centered Header */}
              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-slate-900 dark:text-white">
                  {isEdit ? 'Edit Operating Expense' : 'Record Operating Expense'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Actual expense transaction saved directly into the financial ledger.
                </p>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="space-y-4 px-0.5 py-1">
                {/* SECTION 1 — PROPERTY CONTEXT */}
                <div>
                  <Select
                    label="Property *"
                    name="propertyId"
                    value={propertyId}
                    onChange={(e) => handlePropertyChange(e.target.value)}
                    error={formErrors.propertyId}
                    options={[
                      { value: '', label: '-- Select Property --' },
                      ...properties.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                  />
                </div>

                {/* Associated Lease (Optional) */}
                <div>
                  <Select
                    label="Associated Lease (Optional)"
                    name="leaseId"
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

                {/* SECTION 2 — EXPENSE DETAILS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Expense Amount ($) *"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        const newAmt = e.target.value;
                        handleAmountOrGstChange(newAmt, gstTreatment);
                        if (formErrors.amount) setFormErrors((prev) => ({ ...prev, amount: '' }));
                      }}
                      error={formErrors.amount}
                      leftIcon={<span className="text-xs font-bold text-slate-400 dark:text-slate-500">$</span>}
                    />
                  </div>

                  <div>
                    <Select
                      label="Expense Category *"
                      name="categoryId"
                      value={categoryId}
                      onChange={(e) => {
                        const newCatId = e.target.value;
                        setCategoryId(newCatId);
                        const cat = categories.find((c) => c.id === newCatId);
                        if (cat?.default_tax_classification_id) {
                          setTaxClassificationId(cat.default_tax_classification_id);
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
                </div>

                {/* SECTION 3 — AUSTRALIAN GST & TAX CLASSIFICATION */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#008F83]" />
                      Australian Tax & GST Treatment
                    </span>
                    {isGstEnabledOnProperty && (
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Property GST Registered
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* GST Treatment Options */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        GST Calculation
                      </label>
                      <select
                        aria-label="GST Calculation"
                        value={gstTreatment}
                        onChange={(e) => handleAmountOrGstChange(amount, e.target.value as any)}
                        className="w-full h-10 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83]/30"
                      >
                        <option value="exclusive">GST Exclusive (+10%)</option>
                        <option value="none">GST-Free / Non-Taxable (0%)</option>
                      </select>
                    </div>

                    {/* Calculated GST Amount */}
                    <div>
                      <Input
                        label="GST Component ($)"
                        name="gstAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={gstAmount}
                        onChange={(e) => setGstAmount(e.target.value)}
                        disabled={gstTreatment === 'none'}
                        leftIcon={<span className="text-xs font-bold text-slate-400">$</span>}
                      />
                    </div>

                    {/* Tax Classification */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        BAS Tax Classification
                      </label>
                      <select
                        aria-label="BAS Tax Classification"
                        value={taxClassificationId}
                        onChange={(e) => setTaxClassificationId(e.target.value)}
                        className="w-full h-10 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#008F83]/30"
                      >
                        <option value="">-- Standard (Auto) --</option>
                        {filteredTaxClassifications.map((tc: any) => (
                          <option key={tc.id} value={tc.id}>
                            {tc.name} {tc.bas_code ? `(${tc.bas_code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Expense Date & Payee / Vendor Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Expense Date *"
                      name="expenseDate"
                      type="date"
                      value={expenseDate}
                      onChange={(e) => {
                        setExpenseDate(e.target.value);
                        if (formErrors.expenseDate) setFormErrors((prev) => ({ ...prev, expenseDate: '' }));
                      }}
                      error={formErrors.expenseDate}
                    />
                  </div>

                  <div>
                    <Input
                      label="Payee / Vendor Name"
                      name="vendorName"
                      placeholder="e.g. Apex Plumbing, Council Rates, AGL Energy"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Payment Method & Invoice Reference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Select
                      label="Payment Method"
                      name="paymentMethod"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      options={[
                        { value: 'bank_transfer', label: 'Bank Transfer (EFT)' },
                        { value: 'card', label: 'Credit / Debit Card' },
                        { value: 'bpay', label: 'BPAY' },
                        { value: 'direct_debit', label: 'Direct Debit' },
                        { value: 'cash', label: 'Cash' },
                        { value: 'cheque', label: 'Cheque' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </div>

                  <div>
                    <Input
                      label="Invoice # / Reference"
                      name="reference"
                      placeholder="e.g. INV-2026-981"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Input
                    label="Description / Purpose"
                    name="description"
                    placeholder="e.g. Hot water system replacement"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* SECTION 4 — NOTES */}
                <div>
                  <Textarea
                    label="Internal Notes & Memo"
                    name="notes"
                    placeholder="Optional private notes regarding this expense..."
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* SECTION 5 — RECEIPT ATTACHMENT */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Receipt Attachment
                    </label>
                    <span className="text-[11px] text-slate-500">Optional</span>
                  </div>
                  <ReceiptAttachment
                    receipt={existingReceipt}
                    selectedFile={selectedReceiptFile}
                    onFileSelect={setSelectedReceiptFile}
                    onReceiptUploaded={(uploaded) => setExistingReceipt(uploaded)}
                    onReceiptRemoved={() => {
                      setExistingReceipt(null);
                      setSelectedReceiptFile(null);
                    }}
                    editable={true}
                  />
                </div>

                {/* Footer Actions */}
                <div className="flex items-center gap-3 mt-6 pt-2">
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
                    {isSubmitting
                      ? isEdit
                        ? 'Saving changes...'
                        : 'Saving expense...'
                      : isEdit
                      ? 'Save Changes'
                      : 'Record Expense'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
