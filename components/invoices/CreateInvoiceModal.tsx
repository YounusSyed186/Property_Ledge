'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, Check, AlertCircle, Building, User, FileText } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { CreateInvoiceDTO, UpdateInvoiceDTO, InvoiceDTO } from '@/modules/invoices';
import { formatCurrency, SUPPORTED_CURRENCIES } from '@/modules/invoices/domain/value-objects/currency';
import { fetchDashboardProperties, fetchAllWorkspaceLeases } from '@/app/actions/dashboard';
import { cn } from '@/lib/utils';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateInvoiceDTO, issueImmediately?: boolean) => Promise<void>;
  invoiceToEdit?: InvoiceDTO | null;
  onUpdate?: (id: string, dto: UpdateInvoiceDTO) => Promise<void>;
}

export function CreateInvoiceModal({ isOpen, onClose, onSubmit, invoiceToEdit, onUpdate }: CreateInvoiceModalProps) {
  const isEditMode = Boolean(invoiceToEdit);
  const [invoiceType, setInvoiceType] = useState<'standalone' | 'lease'>('standalone');
  const [status, setStatus] = useState<string>('draft');
  const [currency, setCurrency] = useState('AUD');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>('');
  const [properties, setProperties] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);

  const [items, setItems] = useState<Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>>([
    { description: 'Consulting / Professional Services', quantity: 1, unitPrice: 150, taxRate: 10 },
  ]);

  const [notes, setNotes] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState(
    'Please transfer payment to BSB: 012-345 Account: 67890123. Reference invoice number.'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDashboardProperties().then((res: any) => {
        if (Array.isArray(res)) setProperties(res);
        else if (res?.success && res?.data) setProperties(res.data);
      });
      fetchAllWorkspaceLeases().then((res: any) => {
        if (Array.isArray(res)) setLeases(res);
        else if (res?.success && res?.data) setLeases(res.data);
      });

      if (invoiceToEdit) {
        setInvoiceType(invoiceToEdit.leaseId ? 'lease' : 'standalone');
        setStatus(invoiceToEdit.status || 'draft');
        setCurrency(invoiceToEdit.currency || 'AUD');
        setRecipientName(invoiceToEdit.customerName || (invoiceToEdit as any).recipientName || '');
        setRecipientEmail(invoiceToEdit.customerEmail || (invoiceToEdit as any).recipientEmail || '');
        setRecipientAddress(invoiceToEdit.customerAddress || (invoiceToEdit as any).recipientAddress || '');
        setRecipientPhone((invoiceToEdit as any).recipientPhone || '');
        setIssueDate(invoiceToEdit.issueDate ? new Date(invoiceToEdit.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setDueDate(invoiceToEdit.dueDate ? new Date(invoiceToEdit.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setSelectedPropertyId(invoiceToEdit.propertyId || '');
        setSelectedLeaseId(invoiceToEdit.leaseId || '');
        if (invoiceToEdit.items && invoiceToEdit.items.length > 0) {
          setItems(
            invoiceToEdit.items.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              taxRate: i.taxRate,
            }))
          );
        }
        setNotes(invoiceToEdit.notes || '');
        setPaymentInstructions(invoiceToEdit.paymentInstructions || '');
      } else {
        setInvoiceType('standalone');
        setStatus('draft');
        setCurrency('AUD');
        setRecipientName('');
        setRecipientEmail('');
        setRecipientPhone('');
        setRecipientAddress('');
        setIssueDate(new Date().toISOString().split('T')[0]);
        const d = new Date();
        d.setDate(d.getDate() + 14);
        setDueDate(d.toISOString().split('T')[0]);
        setSelectedPropertyId('');
        setSelectedLeaseId('');
        setItems([{ description: 'Consulting / Professional Services', quantity: 1, unitPrice: 150, taxRate: 10 }]);
        setNotes('');
        setPaymentInstructions('Please transfer payment to BSB: 012-345 Account: 67890123. Reference invoice number.');
      }
    }
  }, [isOpen, invoiceToEdit]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0, taxRate: 10 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const taxTotal = items.reduce(
    (sum, item) =>
      sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) * (Number(item.taxRate) || 0)) / 100,
    0
  );
  const total = subtotal + taxTotal;

  // Handle Lease auto-fill
  const handleLeaseSelect = (leaseId: string) => {
    setSelectedLeaseId(leaseId);
    const found = leases.find((l) => l.id === leaseId);
    if (found) {
      setSelectedPropertyId(found.property_id || found.propertyId || '');
      const tenantRel = found.lease_tenants?.[0] || found.tenants?.[0];
      const t = tenantRel?.tenant || tenantRel;
      if (t) {
        const name = `${t.first_name || t.firstName || ''} ${t.last_name || t.lastName || ''}`.trim() || t.name || '';
        if (name) setRecipientName(name);
        if (t.email) setRecipientEmail(t.email);
        if (t.phone) setRecipientPhone(t.phone);
      }
      const rentAmt = Number(found.rent_amount || found.rentAmount || 0);
      setItems([
        {
          description: `Rent - ${found.rent_frequency || found.rentFrequency || 'Monthly'} (${dueDate})`,
          quantity: 1,
          unitPrice: rentAmt,
          taxRate: 0,
        },
      ]);
    }
  };

  const handleSubmitForm = async (issueImmediately: boolean) => {
    setError(null);
    if (!recipientName.trim()) {
      setError('Recipient Name is required.');
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      setError('All line items must have a valid description.');
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && invoiceToEdit && onUpdate) {
        const updateDto: UpdateInvoiceDTO = {
          status: status as any,
          propertyId: invoiceType === 'lease' && selectedPropertyId ? selectedPropertyId : undefined,
          leaseId: invoiceType === 'lease' && selectedLeaseId ? selectedLeaseId : undefined,
          customerName: recipientName.trim(),
          customerEmail: recipientEmail.trim() || undefined,
          customerAddress: recipientAddress.trim() || undefined,
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim() || undefined,
          recipientAddress: recipientAddress.trim() || undefined,
          issueDate,
          dueDate,
          currency,
          items: items.map((i) => ({
            description: i.description,
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unitPrice) || 0,
            taxRate: Number(i.taxRate) || 0,
          })),
          notes: notes.trim() || undefined,
          paymentInstructions: paymentInstructions.trim() || undefined,
        };
        await onUpdate(invoiceToEdit.id, updateDto);
      } else {
        const dto: CreateInvoiceDTO = {
          propertyId: invoiceType === 'lease' && selectedPropertyId ? selectedPropertyId : undefined,
          leaseId: invoiceType === 'lease' && selectedLeaseId ? selectedLeaseId : undefined,
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim() || undefined,
          recipientPhone: recipientPhone.trim() || undefined,
          recipientAddress: recipientAddress.trim() || undefined,
          issueDate,
          dueDate,
          currency,
          items: items.map((i) => ({
            description: i.description,
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unitPrice) || 0,
            taxRate: Number(i.taxRate) || 0,
          })),
          notes: notes.trim() || undefined,
          paymentInstructions: paymentInstructions.trim() || undefined,
        };
        await onSubmit(dto, issueImmediately);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || (isEditMode ? 'Failed to update invoice' : 'Failed to create invoice'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-admin-surface border border-admin-border text-admin-foreground rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-admin-border flex items-center justify-between bg-admin-surface-subtle/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-admin-primary/10 text-admin-primary border border-admin-primary/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-admin-foreground">
                {isEditMode ? `Edit Invoice ${invoiceToEdit?.invoiceNumber}` : 'Create New Invoice'}
              </h2>
              <p className="text-xs text-admin-muted mt-0.5">
                {isEditMode ? 'Update recipient information, line items, and payment terms' : 'Generate independent customer invoices or property lease invoices'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-admin-muted hover:text-admin-foreground p-1.5 rounded-lg hover:bg-admin-surface-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-500 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Invoice Type Mode Switcher */}
          <div className="flex bg-admin-surface-subtle p-1 rounded-xl border border-admin-border">
            <button
              type="button"
              onClick={() => setInvoiceType('standalone')}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2',
                invoiceType === 'standalone'
                  ? 'bg-admin-surface text-admin-foreground shadow-xs border border-admin-border'
                  : 'text-admin-muted hover:text-admin-foreground'
              )}
            >
              <User className="w-3.5 h-3.5" />
              Independent Customer Invoice (No Lease Required)
            </button>
            <button
              type="button"
              onClick={() => setInvoiceType('lease')}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2',
                invoiceType === 'lease'
                  ? 'bg-admin-surface text-admin-foreground shadow-xs border border-admin-border'
                  : 'text-admin-muted hover:text-admin-foreground'
              )}
            >
              <Building className="w-3.5 h-3.5" />
              Property Lease Rent Invoice
            </button>
          </div>

          {/* Status Dropdown (Edit Mode) */}
          {isEditMode && (
            <div className="p-3 bg-admin-surface-subtle border border-admin-border rounded-xl flex items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-admin-foreground">Invoice Status</label>
                <p className="text-[11px] text-admin-muted">Manually change the current lifecycle status of this invoice</p>
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-admin-surface border border-admin-border rounded-xl px-3 py-1.5 text-admin-foreground text-xs font-bold capitalize focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
              >
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}

          {/* Lease Selector if in lease mode */}
          {invoiceType === 'lease' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-admin-surface-subtle border border-admin-border rounded-xl">
              <div>
                <label className="block text-xs font-bold text-admin-foreground mb-1.5">Select Lease</label>
                <select
                  value={selectedLeaseId}
                  onChange={(e) => handleLeaseSelect(e.target.value)}
                  className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
                >
                  <option value="">-- Choose active lease --</option>
                  {leases.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.property?.name || 'Property'} • Rent: ${l.rent_amount} ({l.rent_frequency})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-admin-foreground mb-1.5">Property</label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
                >
                  <option value="">-- Standalone (None) --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Primary Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-admin-muted mb-1.5">Recipient Name *</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. John Doe / Acme Corp"
                className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm placeholder:text-admin-muted/60 focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-admin-muted mb-1.5">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="billing@customer.com"
                className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm placeholder:text-admin-muted/60 focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-admin-muted mb-1.5">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
              >
                {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-admin-muted mb-1.5">Recipient Phone</label>
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="+61 400 000 000"
                className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm placeholder:text-admin-muted/60 focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-admin-muted mb-1.5">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-admin-muted mb-1.5">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-admin-foreground text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-admin-primary" /> Invoice Line Items
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="font-bold border-admin-border hover:bg-admin-surface-subtle text-admin-foreground text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-admin-primary" /> Add Line
              </Button>
            </div>

            <div className="border border-admin-border rounded-xl overflow-hidden bg-admin-surface shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-admin-surface-subtle border-b border-admin-border text-admin-muted text-xs uppercase font-bold">
                    <th className="p-3">Description</th>
                    <th className="p-3 w-24 text-center">Qty</th>
                    <th className="p-3 w-32 text-right">Unit Price</th>
                    <th className="p-3 w-28 text-center">Tax %</th>
                    <th className="p-3 w-32 text-right">Total</th>
                    <th className="p-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border text-sm">
                  {items.map((item, idx) => {
                    const lineTotal = (item.quantity * item.unitPrice * (1 + item.taxRate / 100));
                    return (
                      <tr key={idx} className="hover:bg-admin-surface-subtle/50 transition-colors">
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            placeholder="Description"
                            className="w-full bg-transparent border border-transparent hover:border-admin-border focus:border-admin-primary text-admin-foreground rounded-lg px-2 py-1 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                            className="w-full bg-transparent border border-transparent hover:border-admin-border focus:border-admin-primary text-admin-foreground text-center rounded-lg px-1 py-1 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                            className="w-full bg-transparent border border-transparent hover:border-admin-border focus:border-admin-primary text-admin-foreground text-right rounded-lg px-2 py-1 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={item.taxRate}
                            onChange={(e) => handleItemChange(idx, 'taxRate', Number(e.target.value))}
                            className="w-full bg-transparent border border-transparent hover:border-admin-border focus:border-admin-primary text-admin-foreground text-center rounded-lg px-1 py-1 text-sm focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-right font-bold text-admin-foreground">
                          {formatCurrency(lineTotal, currency)}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length <= 1}
                            className="text-admin-muted hover:text-rose-500 disabled:opacity-20 transition-colors p-1 rounded hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Calculations Summary Box */}
            <div className="flex justify-end pt-2">
              <div className="w-full md:w-80 bg-admin-surface-subtle border border-admin-border rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-admin-muted text-xs">
                  <span>Subtotal:</span>
                  <span className="text-admin-foreground font-semibold">{formatCurrency(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between text-admin-muted text-xs">
                  <span>Estimated Tax:</span>
                  <span className="text-admin-foreground font-semibold">{formatCurrency(taxTotal, currency)}</span>
                </div>
                <div className="border-t border-admin-border pt-2 flex justify-between text-base font-bold">
                  <span className="text-admin-foreground">Invoice Total:</span>
                  <span className="text-admin-primary">{formatCurrency(total, currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Payment Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-admin-muted mb-1.5">Notes / Terms</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Net 14 days payment terms apply."
                className="w-full bg-admin-surface border border-admin-border rounded-xl p-3 text-admin-foreground text-xs placeholder:text-admin-muted/60 focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-admin-muted mb-1.5">Payment Instructions</label>
              <textarea
                rows={2}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                className="w-full bg-admin-surface border border-admin-border rounded-xl p-3 text-admin-foreground text-xs placeholder:text-admin-muted/60 focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-admin-border bg-admin-surface-subtle/50 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="text-admin-muted hover:text-admin-foreground">
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            {isEditMode ? (
              <Button
                variant="primary"
                onClick={() => handleSubmitForm(false)}
                disabled={loading}
                className="gap-1.5 font-bold shadow-xs"
              >
                <Check className="w-4 h-4" />
                Save Changes
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSubmitForm(false)}
                  disabled={loading}
                  className="font-bold border-admin-border hover:bg-admin-surface text-admin-foreground"
                >
                  Save as Draft
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleSubmitForm(true)}
                  disabled={loading}
                  className="gap-1.5 font-bold shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  Issue Invoice
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
