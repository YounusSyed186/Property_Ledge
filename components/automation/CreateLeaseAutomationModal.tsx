'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Check, Building, FileText, Send, Mail } from 'lucide-react';
import { Button, Input, Select } from '@/components/admin/ui';

import { fetchAllWorkspaceLeases } from '@/app/actions/dashboard';
import { CreateLeaseAutomationDTO, sendAutomationTestEmailAction } from '@/app/actions/automations';
import { AutomationScheduleType } from '@/modules/automation';
import { cn } from '@/lib/utils';

interface CreateLeaseAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateLeaseAutomationDTO) => Promise<void>;
  preselectedLeaseId?: string;
}

export function CreateLeaseAutomationModal({
  isOpen,
  onClose,
  onSubmit,
  preselectedLeaseId,
}: CreateLeaseAutomationModalProps) {
  const [leases, setLeases] = useState<any[]>([]);
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>(preselectedLeaseId || '');
  const [actionType, setActionType] = useState<string>('send_lease');
  const [scheduleType, setScheduleType] = useState<AutomationScheduleType>('monthly');

  // Schedule parameters
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [offsetMonths, setOffsetMonths] = useState<number>(12);

  // Test email state
  const [testRecipient, setTestRecipient] = useState<string>('');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAllWorkspaceLeases().then((res: any) => {
        let list: any[] = [];
        if (Array.isArray(res)) list = res;
        else if (res?.success && res?.data) list = res.data;
        setLeases(list);
        if (preselectedLeaseId) {
          setSelectedLeaseId(preselectedLeaseId);
        } else if (list.length > 0 && !selectedLeaseId) {
          setSelectedLeaseId(list[0].id);
        }
      });
    }
  }, [isOpen, preselectedLeaseId]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError(null);
    if (!selectedLeaseId) {
      setError('Please select a lease.');
      return;
    }

    setLoading(true);
    try {
      let scheduleConfig: any = {};
      if (scheduleType === 'monthly') {
        scheduleConfig = {
          dayOfMonth: Number(dayOfMonth) || 1,
        };
      } else if (scheduleType === 'after_start') {
        scheduleConfig = {
          offsetMonths: Number(offsetMonths) || 12,
        };
      }

      await onSubmit({
        leaseId: selectedLeaseId,
        actionType,
        scheduleType,
        scheduleConfig,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create lease automation');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!selectedLeaseId) {
      setError('Please select a lease first to send test email.');
      return;
    }
    setIsSendingTest(true);
    setError(null);
    setTestSuccess(null);
    try {
      const res = await sendAutomationTestEmailAction({
        automationType: 'lease',
        leaseId: selectedLeaseId,
        leaseActionType: actionType,
        testRecipient,
      });

      if (!res.success) throw new Error(res.error || 'Failed to send test email');
      setTestSuccess(`Test email dispatched to ${res.recipient || testRecipient || 'your inbox'}!`);
      setTimeout(() => setTestSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-xl sm:max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh] z-10 p-6 sm:p-8 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200">
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
            Create Lease Automation
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Schedule automated actions and document deliveries for property leases.
          </p>
        </div>

        {/* Stepper Navigation */}
        <nav aria-label="Lease Automation Setup Progress" className="mb-6">
          <div className="flex items-center justify-center max-w-xs mx-auto relative">
            {/* Connecting line track */}
            <div className="absolute top-3 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
            <div
              className="absolute top-3 left-6 h-0.5 bg-[#008F83] -z-0 transition-all duration-300"
              style={{ width: '50%' }}
            />

            <div className="w-full flex items-center justify-between z-10 px-1">
              {[
                { id: 1, name: 'Target Lease', completed: true },
                { id: 2, name: 'Schedule', current: true },
                { id: 3, name: 'Review' },
              ].map((s) => (
                <div key={s.id} className="flex flex-col items-center group">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 cursor-pointer focus:outline-none',
                      s.current
                        ? 'bg-[#008F83] text-white shadow-xs ring-3 ring-[#008F83]/20 scale-105'
                        : s.completed
                        ? 'bg-[#008F83] text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                    )}
                  >
                    {s.completed ? <Check className="w-3 h-3 stroke-[2.5]" /> : s.id}
                  </div>
                  <span
                    className={cn(
                      'mt-1 text-[10px] font-medium transition-colors text-center',
                      s.current
                        ? 'text-[#008F83] font-bold'
                        : s.completed
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-500'
                    )}
                  >
                    {s.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* Form Body */}
        <div className="space-y-4 text-sm">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* STEP 1: Select Lease */}
          <div>
            <Select
              label="Target Lease *"
              value={selectedLeaseId}
              onChange={(e) => setSelectedLeaseId(e.target.value)}
              disabled={Boolean(preselectedLeaseId)}
              className="bg-white dark:bg-slate-800"
              options={[
                { value: '', label: '-- Select Lease --' },
                ...leases.map((l) => {
                  const tRel = l.lease_tenants?.[0] || l.tenants?.[0];
                  const t = tRel?.tenant || tRel;
                  const tenantName = t ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : 'Tenant';
                  const propName = l.property?.name || 'Property';
                  return {
                    value: l.id,
                    label: `${propName} • ${tenantName} (Rent: $${l.rent_amount})`,
                  };
                }),
              ]}
            />
          </div>

          {/* STEP 2: Select Action */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Automation Action
            </label>
            <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-2 border-[#008F83]/40 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#008F83]/10 text-[#008F83]">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Send Lease</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Generates and emails official Lease Summary PDF</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#008F83] bg-[#008F83]/10 px-3 py-1 rounded-full border border-[#008F83]/20">
                Active Action
              </span>
            </div>
          </div>

          {/* STEP 3: Select Schedule */}
          <div className="space-y-3">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Schedule Type
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScheduleType('monthly')}
                className={cn(
                  'p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1',
                  scheduleType === 'monthly'
                    ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 text-slate-900 dark:text-white font-bold ring-2 ring-[#008F83]/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#008F83]">
                  <Calendar className="w-4 h-4 text-[#008F83]" />
                  Monthly Schedule
                </div>
                <span className="text-xs opacity-80 font-normal">Repeats every month on set day</span>
              </button>

              <button
                type="button"
                onClick={() => setScheduleType('after_start')}
                className={cn(
                  'p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1',
                  scheduleType === 'after_start'
                    ? 'border-[#008F83] bg-[#008F83]/5 dark:bg-[#008F83]/10 text-slate-900 dark:text-white font-bold ring-2 ring-[#008F83]/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#008F83]">
                  <Clock className="w-4 h-4 text-[#008F83]" />
                  After Lease Start
                </div>
                <span className="text-xs opacity-80 font-normal">Triggers X months after start date</span>
              </button>
            </div>

            {/* Schedule Options Inputs */}
            {scheduleType === 'monthly' && (
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5">
                <Select
                  label="Day of Month"
                  value={String(dayOfMonth)}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  className="bg-white dark:bg-slate-800 font-bold"
                  options={[...Array(28)].map((_, i) => ({
                    value: String(i + 1),
                    label: `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} of every month`,
                  }))}
                />
                <div className="p-3 bg-[#008F83]/10 border border-[#008F83]/20 rounded-xl text-[#008F83] text-xs leading-relaxed flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Evaluated and dispatched automatically in the <strong>7:00 AM AU</strong> daily morning queue.</span>
                </div>
              </div>
            )}

            {scheduleType === 'after_start' && (
              <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5">
                <Input
                  label="Months After Lease Start"
                  type="number"
                  min={1}
                  max={60}
                  value={offsetMonths}
                  onChange={(e) => setOffsetMonths(Number(e.target.value))}
                  className="bg-white dark:bg-slate-800 font-bold"
                />
                <div className="p-3 bg-[#008F83]/10 border border-[#008F83]/20 rounded-xl text-[#008F83] text-xs leading-relaxed flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Evaluated and dispatched automatically in the <strong>7:00 AM AU</strong> daily morning queue.</span>
                </div>
              </div>
            )}

            {/* Test Email Section */}
            <div className="p-4 bg-[#008F83]/5 dark:bg-[#008F83]/10 border border-[#008F83]/20 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#008F83]">
                  <Mail className="w-4 h-4" />
                  <span>Send Test Email Before Creating</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Simulated Sandbox</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    label="Test Recipient Email"
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="Defaults to logged-in user"
                    className="bg-white dark:bg-slate-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest || loading}
                  className="h-12 mt-2.5 px-4 rounded-xl text-xs font-bold border border-[#008F83]/30 text-[#008F83] hover:bg-[#008F83]/10 transition-colors shrink-0 disabled:opacity-50"
                >
                  {isSendingTest ? 'Sending...' : 'Send Test'}
                </button>
              </div>
              {testSuccess && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> {testSuccess}
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 mt-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 h-12 rounded-xl bg-[#008F83] hover:bg-[#007A70] text-white font-semibold text-sm shadow-md transition-all duration-150 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#008F83]/25 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Automation'}
          </button>
        </div>
      </div>
    </div>
  );
}

