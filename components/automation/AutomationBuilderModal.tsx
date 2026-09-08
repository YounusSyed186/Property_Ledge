'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Zap,
  Check,
  Calendar,
  Bell,
  Mail,
  FileText,
  Sliders,
  CheckSquare,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';
import {
  CreateAutomationDTO,
  TriggerType,
  ActionType,
  ActionDefinition,
  ConditionRule,
  ConditionOperator,
} from '@/modules/automation';

interface AutomationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateAutomationDTO) => Promise<void>;
}

export function AutomationBuilderModal({ isOpen, onClose, onSubmit }: AutomationBuilderModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('event');

  // Trigger config states
  const [eventName, setEventName] = useState('invoice.issued');
  const [cronExpression, setCronExpression] = useState('0 9 1 * *');

  // Conditions
  const [rules, setRules] = useState<ConditionRule[]>([
    { field: 'invoice.balance', operator: 'greater_than', value: 0 },
  ]);

  // Actions
  const [actions, setActions] = useState<ActionDefinition[]>([
    {
      type: 'send_invoice',
      params: {
        customMessage: 'Thank you for your business. Please find your invoice attached.',
      },
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Condition Handlers
  const handleAddRule = () => {
    setRules((prev) => [...prev, { field: 'source.amount', operator: 'greater_than', value: 0 }]);
  };

  const handleRemoveRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, field: keyof ConditionRule, val: any) => {
    setRules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Action Handlers
  const handleAddAction = (type: ActionType) => {
    let defaultParams: Record<string, any> = {};
    if (type === 'send_email') {
      defaultParams = { to: '{{recipientEmail}}', subject: 'Notice: Invoice {{invoice.invoiceNumber}}', body: 'Hello {{recipientName}}, please review your invoice.' };
    } else if (type === 'send_invoice') {
      defaultParams = { customMessage: 'Please find your invoice attached.' };
    } else if (type === 'create_invoice') {
      defaultParams = { recipientName: '{{lease.tenantName}}', amount: 500, description: 'Recurring Charge' };
    } else if (type === 'create_task') {
      defaultParams = { title: 'Follow-up on {{invoice.invoiceNumber}}', priority: 'medium' };
    } else if (type === 'generate_document') {
      defaultParams = { format: 'pdf' };
    } else if (type === 'send_notification') {
      defaultParams = { title: 'Payment Reminder', message: 'Invoice balance is outstanding' };
    }
    setActions((prev) => [...prev, { type, params: defaultParams }]);
  };

  const handleRemoveAction = (index: number) => {
    if (actions.length <= 1) return;
    setActions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleActionParamChange = (actionIndex: number, paramKey: string, value: any) => {
    setActions((prev) => {
      const next = [...prev];
      next[actionIndex] = {
        ...next[actionIndex],
        params: { ...next[actionIndex].params, [paramKey]: value },
      };
      return next;
    });
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Automation Name is required.');
      return;
    }

    setLoading(true);
    try {
      const triggerConfig: Record<string, any> = {};
      if (triggerType === 'event') {
        triggerConfig.eventName = eventName;
      } else if (triggerType === 'schedule') {
        triggerConfig.cron = cronExpression;
      }

      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        triggerType,
        triggerConfig,
        conditions: rules.length > 0 ? { operator: 'AND', rules } : { operator: 'AND', rules: [] },
        actions,
        isActive: true,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save automation rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-admin-surface border border-admin-border text-admin-foreground rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-admin-border flex items-center justify-between bg-admin-surface-subtle/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-admin-primary/10 text-admin-primary rounded-xl border border-admin-primary/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-admin-foreground">Create Automation Rule</h2>
              <p className="text-xs text-admin-muted mt-0.5">Build trigger-condition-action workflow chains</p>
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs flex items-center gap-2.5 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-admin-muted mb-1.5">Automation Rule Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Email Tenant When Invoice Is Issued"
                className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm placeholder:text-admin-muted/60 focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-admin-muted mb-1.5">Description (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Dispatches PDF attachment and notifies tenant"
                className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm placeholder:text-admin-muted/60 focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
              />
            </div>
          </div>

          {/* SECTION 1: WHEN (Trigger) */}
          <div className="p-4 bg-admin-surface-subtle border border-admin-border rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-admin-primary uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-admin-primary/15 text-admin-primary flex items-center justify-center text-[10px] font-bold">
                1
              </span>
              WHEN (Trigger Event or Schedule)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTriggerType('event')}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition-all',
                  triggerType === 'event'
                    ? 'bg-admin-surface border-admin-primary text-admin-foreground shadow-xs ring-1 ring-admin-primary'
                    : 'bg-admin-surface/50 border-admin-border text-admin-muted hover:text-admin-foreground hover:bg-admin-surface'
                )}
              >
                <div className="font-bold text-xs text-admin-foreground">Domain Event</div>
                <div className="text-[11px] text-admin-muted mt-1">Triggers when an entity status changes</div>
              </button>

              <button
                type="button"
                onClick={() => setTriggerType('schedule')}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition-all',
                  triggerType === 'schedule'
                    ? 'bg-admin-surface border-admin-primary text-admin-foreground shadow-xs ring-1 ring-admin-primary'
                    : 'bg-admin-surface/50 border-admin-border text-admin-muted hover:text-admin-foreground hover:bg-admin-surface'
                )}
              >
                <div className="font-bold text-xs text-admin-foreground">Recurring Schedule</div>
                <div className="text-[11px] text-admin-muted mt-1">Runs periodically via cron timer</div>
              </button>

              <button
                type="button"
                onClick={() => setTriggerType('manual')}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition-all',
                  triggerType === 'manual'
                    ? 'bg-admin-surface border-admin-primary text-admin-foreground shadow-xs ring-1 ring-admin-primary'
                    : 'bg-admin-surface/50 border-admin-border text-admin-muted hover:text-admin-foreground hover:bg-admin-surface'
                )}
              >
                <div className="font-bold text-xs text-admin-foreground">On-Demand / Manual</div>
                <div className="text-[11px] text-admin-muted mt-1">Triggered by button click or API</div>
              </button>
            </div>

            {triggerType === 'event' && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-admin-muted mb-1.5">Select Event Type</label>
                <select
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
                >
                  <option value="invoice.issued">Invoice Issued (invoice.issued)</option>
                  <option value="invoice.paid">Invoice Fully Paid (invoice.paid)</option>
                  <option value="invoice.overdue">Invoice Overdue (invoice.overdue)</option>
                  <option value="lease.rent_due">Lease Rent Due Date (lease.rent_due)</option>
                  <option value="payment.recorded">Payment Recorded (payment.recorded)</option>
                </select>
              </div>
            )}

            {triggerType === 'schedule' && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-admin-muted mb-1.5">Cron Expression</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    placeholder="0 9 1 * *"
                    className="flex-1 bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm font-mono focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
                  />
                  <select
                    onChange={(e) => setCronExpression(e.target.value)}
                    className="bg-admin-surface border border-admin-border rounded-xl px-3 py-2 text-admin-foreground text-sm focus:outline-none focus:border-admin-primary focus:ring-1 focus:ring-admin-primary"
                  >
                    <option value="0 9 1 * *">1st of Month at 9am</option>
                    <option value="0 9 * * 1">Every Monday at 9am</option>
                    <option value="0 0 * * *">Daily at Midnight</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: IF (Conditions) */}
          <div className="p-4 bg-admin-surface-subtle border border-admin-border rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-admin-primary uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-admin-primary/15 text-admin-primary flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                IF (Conditions Must Match)
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddRule}
                className="text-xs gap-1 font-bold border-admin-border hover:bg-admin-surface text-admin-foreground"
              >
                <Plus className="w-3.5 h-3.5 text-admin-primary" /> Add Rule
              </Button>
            </div>

            {rules.length === 0 ? (
              <p className="text-xs text-admin-muted italic">No conditions configured (Always runs when triggered).</p>
            ) : (
              <div className="space-y-2">
                {rules.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-admin-surface p-2.5 rounded-xl border border-admin-border shadow-xs">
                    <input
                      type="text"
                      value={r.field}
                      onChange={(e) => handleRuleChange(idx, 'field', e.target.value)}
                      placeholder="e.g. invoice.balance"
                      className="w-1/3 bg-admin-surface-subtle border border-admin-border rounded-lg px-2.5 py-1.5 text-admin-foreground text-xs font-mono focus:outline-none focus:border-admin-primary"
                    />
                    <select
                      value={r.operator}
                      onChange={(e) => handleRuleChange(idx, 'operator', e.target.value as ConditionOperator)}
                      className="w-1/4 bg-admin-surface-subtle border border-admin-border rounded-lg px-2.5 py-1.5 text-admin-foreground text-xs focus:outline-none focus:border-admin-primary"
                    >
                      <option value="equals">equals</option>
                      <option value="not_equals">not equals</option>
                      <option value="greater_than">&gt; greater than</option>
                      <option value="less_than">&lt; less than</option>
                      <option value="greater_than_or_equal">&gt;= greater or equal</option>
                      <option value="less_than_or_equal">&lt;= less or equal</option>
                      <option value="contains">contains</option>
                      <option value="is_not_empty">is not empty</option>
                    </select>
                    <input
                      type="text"
                      value={r.value !== undefined ? String(r.value) : ''}
                      onChange={(e) => handleRuleChange(idx, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 bg-admin-surface-subtle border border-admin-border rounded-lg px-2.5 py-1.5 text-admin-foreground text-xs focus:outline-none focus:border-admin-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(idx)}
                      className="text-admin-muted hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Remove condition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: THEN (Actions) */}
          <div className="p-4 bg-admin-surface-subtle border border-admin-border rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-admin-primary uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-admin-primary/15 text-admin-primary flex items-center justify-center text-[10px] font-bold">
                  3
                </span>
                THEN (Execute Sequential Actions)
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  id="addActionSelect"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddAction(e.target.value as ActionType);
                      e.target.value = '';
                    }
                  }}
                  className="bg-admin-surface border border-admin-border text-admin-primary text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-admin-primary shadow-xs"
                >
                  <option value="" disabled>+ Add Action...</option>
                  <option value="send_invoice">Send Invoice Email (with PDF)</option>
                  <option value="send_email">Send Custom Email</option>
                  <option value="create_invoice">Create Invoice</option>
                  <option value="generate_document">Generate Document (PDF/DOCX)</option>
                  <option value="create_task">Create Task / Reminder</option>
                  <option value="send_notification">Send In-App Notification</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {actions.map((act, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-admin-surface border border-admin-border rounded-xl space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-admin-foreground capitalize bg-admin-surface-subtle px-3 py-1 rounded-full border border-admin-border">
                        Step {idx + 1}: {act.type.replace('_', ' ')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAction(idx)}
                      disabled={actions.length <= 1}
                      className="text-admin-muted hover:text-rose-500 disabled:opacity-20 p-1 rounded hover:bg-rose-500/10 transition-colors"
                      title="Remove action"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dynamic Action Parameters Form */}
                  {act.type === 'send_invoice' && (
                    <div>
                      <label className="text-xs font-bold text-admin-muted block mb-1">Email Message</label>
                      <input
                        type="text"
                        value={act.params.customMessage || ''}
                        onChange={(e) => handleActionParamChange(idx, 'customMessage', e.target.value)}
                        placeholder="Please find your invoice attached."
                        className="w-full bg-admin-surface-subtle border border-admin-border rounded-lg px-3 py-1.5 text-xs text-admin-foreground focus:outline-none focus:border-admin-primary"
                      />
                    </div>
                  )}

                  {act.type === 'send_email' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-bold text-admin-muted block mb-1">Recipient (&quot;to&quot;)</label>
                          <input
                            type="text"
                            value={act.params.to || ''}
                            onChange={(e) => handleActionParamChange(idx, 'to', e.target.value)}
                            placeholder="{{recipientEmail}}"
                            className="w-full bg-admin-surface-subtle border border-admin-border rounded-lg px-3 py-1.5 text-xs text-admin-foreground focus:outline-none focus:border-admin-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-admin-muted block mb-1">Subject</label>
                          <input
                            type="text"
                            value={act.params.subject || ''}
                            onChange={(e) => handleActionParamChange(idx, 'subject', e.target.value)}
                            placeholder="Notice: {{invoice.invoiceNumber}}"
                            className="w-full bg-admin-surface-subtle border border-admin-border rounded-lg px-3 py-1.5 text-xs text-admin-foreground focus:outline-none focus:border-admin-primary"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-admin-muted block mb-1">Body Text (Supports placeholders like &#123;&#123;invoice.total&#125;&#125;)</label>
                        <textarea
                          rows={2}
                          value={act.params.body || ''}
                          onChange={(e) => handleActionParamChange(idx, 'body', e.target.value)}
                          className="w-full bg-admin-surface-subtle border border-admin-border rounded-lg p-2.5 text-xs text-admin-foreground focus:outline-none focus:border-admin-primary"
                        />
                      </div>
                    </div>
                  )}

                  {act.type === 'create_task' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-admin-muted block mb-1">Task Title</label>
                        <input
                          type="text"
                          value={act.params.title || ''}
                          onChange={(e) => handleActionParamChange(idx, 'title', e.target.value)}
                          placeholder="Follow-up on {{invoice.invoiceNumber}}"
                          className="w-full bg-admin-surface-subtle border border-admin-border rounded-lg px-3 py-1.5 text-xs text-admin-foreground focus:outline-none focus:border-admin-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-admin-muted block mb-1">Priority</label>
                        <select
                          value={act.params.priority || 'medium'}
                          onChange={(e) => handleActionParamChange(idx, 'priority', e.target.value)}
                          className="w-full bg-admin-surface-subtle border border-admin-border rounded-lg px-3 py-1.5 text-xs text-admin-foreground focus:outline-none focus:border-admin-primary"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {act.type === 'generate_document' && (
                    <div>
                      <label className="text-xs font-bold text-admin-muted block mb-1">Format</label>
                      <select
                        value={act.params.format || 'pdf'}
                        onChange={(e) => handleActionParamChange(idx, 'format', e.target.value)}
                        className="w-full bg-admin-surface-subtle border border-admin-border rounded-lg px-3 py-1.5 text-xs text-admin-foreground focus:outline-none focus:border-admin-primary"
                      >
                        <option value="pdf">PDF Document (.pdf)</option>
                        <option value="docx">Word Document (.docx)</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-admin-border bg-admin-surface-subtle/50 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="text-admin-muted hover:text-admin-foreground">
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading}
            className="gap-2 font-bold shadow-xs"
          >
            <Check className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Automation Rule'}
          </Button>
        </div>
      </div>
    </div>
  );
}
