'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Input, Select, Textarea, useToast } from '@/components/admin/ui';
import { usePropertyContext } from '@/components/property/PropertyContext';
import {
  fetchDashboardTenants,
  handleCreateLease,
} from '@/app/actions/dashboard';
import { NextActionDialog, type NextAction } from '@/components/dashboard/NextActionDialog';

interface CreateLeaseWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedTenantId?: string;
}

type TenantRow = { id: string; first_name: string; last_name: string; email: string };

const STEPS = ['Tenant', 'Terms', 'Review'];

export function CreateLeaseWizard({
  isOpen,
  onClose,
  onSuccess,
  preselectedTenantId,
}: CreateLeaseWizardProps) {
  const { selectedProperty } = usePropertyContext();
  const { success, error: showError } = useToast();
  const [step, setStep] = useState(0);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNextActions, setShowNextActions] = useState(false);

  const [tenantId, setTenantId] = useState(preselectedTenantId || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [paymentDueDay, setPaymentDueDay] = useState('1');
  const [rentFrequency, setRentFrequency] = useState('monthly');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen || !selectedProperty) return;
    setIsLoading(true);
    fetchDashboardTenants(selectedProperty.propertyId)
      .then((tenantData) => {
        setTenants(tenantData as TenantRow[]);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, selectedProperty?.propertyId]);

  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setTenantId(preselectedTenantId || '');
      setStartDate('');
      setEndDate('');
      setRentAmount('');
      setSecurityDeposit('');
      setPaymentDueDay('1');
      setRentFrequency('monthly');
      setNotes('');
      setShowNextActions(false);
    }
  }, [isOpen, preselectedTenantId]);

  const selectedTenant = tenants.find((t) => t.id === tenantId);

  const canProceed = () => {
    if (step === 0) return !!tenantId;
    if (step === 1) return startDate && endDate && rentAmount;
    return true;
  };

  const handleCreate = async () => {
    if (!selectedProperty) return;
    setIsSaving(true);
    try {
      await handleCreateLease(
        selectedProperty.propertyId,
        {
          start_date: startDate,
          end_date: endDate,
          rent_amount: Number(rentAmount),
          security_deposit: securityDeposit ? Number(securityDeposit) : undefined,
          payment_due_day: Number(paymentDueDay),
          rent_frequency: rentFrequency as 'weekly' | 'fortnightly' | 'monthly' | 'yearly',
          status: 'draft',
          notes: notes || null,
        },
        [tenantId]
      );
      success('Lease created', 'Your lease draft has been created.');
      setShowNextActions(true);
    } catch (err) {
      showError('Create failed', err instanceof Error ? err.message : 'Could not create lease.');
    } finally {
      setIsSaving(false);
    }
  };

  const nextActions: NextAction[] = [
    {
      label: 'Create invoice',
      description: 'Generate the first rent invoice for this lease',
      href: '/dashboard/money?tab=invoices',
    },
    {
      label: 'Upload lease document',
      description: 'Attach the signed lease agreement',
      href: '/dashboard/documents',
    },
    {
      label: 'View lease details',
      description: 'Review and activate the lease',
      href: '/dashboard/leases',
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-admin-surface border border-admin-border rounded-2xl shadow-2xl overflow-hidden z-10">
          <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border">
            <div>
              <h2 className="workspace-page-title">Create Lease</h2>
              <p className="text-sm text-admin-muted">
                Step {step + 1} of {STEPS.length}: {STEPS[step]}
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-admin-surface-elevated">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 min-h-[280px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-admin-primary border-t-transparent animate-spin" />
              </div>
            ) : step === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-admin-muted mb-3">Select the primary tenant for this property.</p>
                {tenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    type="button"
                    onClick={() => setTenantId(tenant.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      tenantId === tenant.id
                        ? 'border-admin-primary bg-admin-primary-soft'
                        : 'border-admin-border hover:border-admin-primary/50'
                    }`}
                  >
                    <p className="font-medium">{tenant.first_name} {tenant.last_name}</p>
                    <p className="text-sm text-admin-muted">{tenant.email}</p>
                  </button>
                ))}
                {tenants.length === 0 && (
                  <p className="text-sm text-admin-muted text-center py-8">No tenants available. Add a tenant first.</p>
                )}
              </div>
            ) : step === 1 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-admin-muted mb-1.5">Start Date</label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-admin-muted mb-1.5">End Date</label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-admin-muted mb-1.5">Rent Amount</label>
                    <Input type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-admin-muted mb-1.5">Security Deposit</label>
                    <Input type="number" value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-admin-muted mb-1.5">Payment Due Day</label>
                    <Input type="number" min={1} max={31} value={paymentDueDay} onChange={(e) => setPaymentDueDay(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-admin-muted mb-1.5">Frequency</label>
                    <Select value={rentFrequency} onChange={(e) => setRentFrequency(e.target.value)}>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-admin-muted mb-1.5">Notes</label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="p-4 rounded-xl bg-admin-surface-subtle border border-admin-border space-y-2">
                  <p><span className="text-admin-muted">Property:</span> {selectedProperty?.propertyName}</p>
                  <p><span className="text-admin-muted">Tenant:</span> {selectedTenant?.first_name} {selectedTenant?.last_name}</p>
                  <p><span className="text-admin-muted">Term:</span> {startDate} → {endDate}</p>
                  <p><span className="text-admin-muted">Rent:</span> ${rentAmount} / {rentFrequency}</p>
                  {securityDeposit && <p><span className="text-admin-muted">Deposit:</span> ${securityDeposit}</p>}
                </div>
                <p className="text-admin-muted">The lease will be created as a draft. You can activate it after review.</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-admin-border">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
              disabled={isSaving}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {step > 0 ? 'Back' : 'Cancel'}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleCreate} disabled={isSaving || !canProceed()}>
                {isSaving ? 'Creating...' : 'Create Lease'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <NextActionDialog
        isOpen={showNextActions}
        onClose={() => {
          setShowNextActions(false);
          onSuccess?.();
          onClose();
        }}
        title="Lease created"
        description="What would you like to do next?"
        actions={nextActions}
      />
    </>
  );
}
