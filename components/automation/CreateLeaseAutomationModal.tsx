'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Check, Building, FileText, Send } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { fetchAllWorkspaceLeases } from '@/app/actions/dashboard';
import { CreateLeaseAutomationDTO } from '@/app/actions/automations';
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
  const [timeOfDay, setTimeOfDay] = useState<string>('09:00');

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
          timeOfDay,
        };
      } else if (scheduleType === 'after_start') {
        scheduleConfig = {
          offsetMonths: Number(offsetMonths) || 12,
          timeOfDay,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-admin-surface border border-admin-border text-admin-foreground rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-admin-border flex items-center justify-between bg-admin-surface-subtle/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-admin-primary/10 text-admin-primary border border-admin-primary/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-admin-foreground">Create Lease Automation</h2>
              <p className="text-xs text-admin-muted mt-0.5">Schedule automated actions for property leases</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-admin-muted hover:text-admin-foreground p-1.5 rounded-lg hover:bg-admin-surface-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs font-medium">
              {error}
            </div>
          )}

          {/* STEP 1: Select Lease */}
          <div>
            <label className="block text-xs font-bold text-admin-foreground mb-1.5">
              1. Select Target Lease
            </label>
            <select
              value={selectedLeaseId}
              onChange={(e) => setSelectedLeaseId(e.target.value)}
              disabled={Boolean(preselectedLeaseId)}
              className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2.5 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary disabled:opacity-70"
            >
              <option value="">-- Select Lease --</option>
              {leases.map((l) => {
                const tRel = l.lease_tenants?.[0] || l.tenants?.[0];
                const t = tRel?.tenant || tRel;
                const tenantName = t ? `${t.first_name || ''} ${t.last_name || ''}`.trim() : 'Tenant';
                const propName = l.property?.name || 'Property';
                return (
                  <option key={l.id} value={l.id}>
                    {propName} • {tenantName} (Rent: ${l.rent_amount})
                  </option>
                );
              })}
            </select>
          </div>

          {/* STEP 2: Select Action */}
          <div>
            <label className="block text-xs font-bold text-admin-foreground mb-1.5">
              2. What do you want to do?
            </label>
            <div className="p-3.5 bg-admin-surface-subtle border-2 border-admin-primary/40 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-admin-primary/10 text-admin-primary">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-admin-foreground">Send Lease</h4>
                  <p className="text-[11px] text-admin-muted">Generates and emails official Lease Summary PDF</p>
                </div>
              </div>
              <span className="text-xs font-bold text-admin-primary bg-admin-primary/10 px-2.5 py-0.5 rounded-full">
                Active Action
              </span>
            </div>
          </div>

          {/* STEP 3: Select Schedule */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-admin-foreground">
              3. Schedule Options
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScheduleType('monthly')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all flex flex-col gap-1',
                  scheduleType === 'monthly'
                    ? 'border-admin-primary bg-admin-primary/5 text-admin-foreground font-bold'
                    : 'border-admin-border bg-admin-surface text-admin-muted hover:text-admin-foreground'
                )}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Calendar className="w-3.5 h-3.5 text-admin-primary" />
                  Monthly Schedule
                </div>
                <span className="text-[11px] opacity-80 font-normal">Repeats every month on set day</span>
              </button>

              <button
                type="button"
                onClick={() => setScheduleType('after_start')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all flex flex-col gap-1',
                  scheduleType === 'after_start'
                    ? 'border-admin-primary bg-admin-primary/5 text-admin-foreground font-bold'
                    : 'border-admin-border bg-admin-surface text-admin-muted hover:text-admin-foreground'
                )}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-admin-primary" />
                  After Lease Start
                </div>
                <span className="text-[11px] opacity-80 font-normal">Triggers X months after start date</span>
              </button>
            </div>

            {/* Schedule Options Inputs */}
            {scheduleType === 'monthly' && (
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-admin-surface-subtle border border-admin-border rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1">Day of Month</label>
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-admin-foreground"
                  >
                    {[...Array(28)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1">Delivery Time</label>
                  <input
                    type="time"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                    className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-admin-foreground"
                  />
                </div>
              </div>
            )}

            {scheduleType === 'after_start' && (
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-admin-surface-subtle border border-admin-border rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1">Months After Start</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={offsetMonths}
                    onChange={(e) => setOffsetMonths(Number(e.target.value))}
                    className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-admin-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-admin-muted mb-1">Delivery Time</label>
                  <input
                    type="time"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                    className="w-full bg-admin-surface border border-admin-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-admin-foreground"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-admin-border bg-admin-surface-subtle/50 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="text-admin-muted text-xs">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading}
            className="gap-1.5 font-bold shadow-xs text-xs"
          >
            <Check className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Automation'}
          </Button>
        </div>
      </div>
    </div>
  );
}
