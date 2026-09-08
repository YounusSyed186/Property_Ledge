'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Button, useToast } from '@/components/admin/ui';
import { AutomationExecutionDTO } from '@/modules/automation';
import {
  fetchExecutionHistoryAction,
  retryExecutionAction,
} from '@/app/actions/automations';

interface ExecutionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  automationId?: string;
}

export function ExecutionHistoryModal({
  isOpen,
  onClose,
  automationId,
}: ExecutionHistoryModalProps) {
  const { toast } = useToast();
  const [executions, setExecutions] = useState<AutomationExecutionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetchExecutionHistoryAction({
        automationId,
        limit: 50,
      });
      setExecutions(res.items);
    } catch (err: any) {
      toast({
        title: 'Error loading execution history',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, automationId]);

  if (!isOpen) return null;

  const handleRetry = async (executionId: string) => {
    setRetryingId(executionId);
    try {
      const res = await retryExecutionAction(executionId);
      if (!res.success) {
        toast({ title: 'Retry Failed', description: res.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Retry Executed', description: `Execution completed with status: ${res.execution?.status}` });
      loadHistory();
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case 'skipped':
        return (
          <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
            <AlertTriangle className="w-3 h-3" /> Skipped
          </span>
        );
      case 'running':
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold">
            <Clock className="w-3 h-3" /> Running
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-admin-surface border border-admin-border text-admin-foreground rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-admin-border flex items-center justify-between bg-admin-surface-subtle/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-admin-primary/10 text-admin-primary rounded-xl border border-admin-primary/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-admin-foreground">Automation Execution Logs</h2>
              <p className="text-xs text-admin-muted mt-0.5">
                Audit trail, trigger payloads, and action execution results
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              disabled={loading}
              className="gap-1.5 text-xs text-admin-foreground border-admin-border hover:bg-admin-surface-subtle"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <button
              onClick={onClose}
              className="text-admin-muted hover:text-admin-foreground p-1.5 rounded-lg hover:bg-admin-surface-subtle transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm">
          {loading ? (
            <div className="p-12 text-center text-admin-muted flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-admin-primary" />
              <span className="text-xs">Loading execution history...</span>
            </div>
          ) : executions.length === 0 ? (
            <div className="p-16 text-center text-admin-muted space-y-2">
              <History className="w-10 h-10 mx-auto text-admin-muted/40" />
              <div className="text-sm font-semibold text-admin-foreground">No Executions Recorded</div>
              <div className="text-xs text-admin-muted">
                When automations are triggered by events or cron schedules, logs will appear here.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map((exec) => {
                const isExpanded = expandedId === exec.id;
                return (
                  <div
                    key={exec.id}
                    className="bg-admin-surface-subtle border border-admin-border rounded-xl overflow-hidden transition-colors"
                  >
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : exec.id)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-admin-surface-subtle/80"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-admin-muted" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-admin-muted" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-admin-foreground font-bold">{exec.triggerSource}</span>
                            {getStatusBadge(exec.status)}
                          </div>
                          <div className="text-[11px] text-admin-muted mt-0.5">
                            {new Date(exec.createdAt).toLocaleString()} • Duration: {exec.executionDurationMs || 0}ms
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(exec.id)}
                          disabled={retryingId === exec.id}
                          className="text-xs gap-1 py-1 h-7 text-admin-primary border-admin-primary/30 hover:bg-admin-primary/10"
                        >
                          <RotateCw className={`w-3 h-3 ${retryingId === exec.id ? 'animate-spin' : ''}`} />
                          Retry
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-admin-surface border-t border-admin-border space-y-3 text-xs">
                        {exec.errorMessage && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-500 font-medium">
                            <strong>Error:</strong> {exec.errorMessage}
                          </div>
                        )}

                        <div>
                          <div className="font-bold text-admin-muted uppercase tracking-wider mb-1">
                            Actions Executed ({exec.actionsExecuted?.length || 0})
                          </div>
                          <div className="space-y-1.5">
                            {exec.actionsExecuted && exec.actionsExecuted.length > 0 ? (
                              exec.actionsExecuted.map((act, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-admin-surface-subtle border border-admin-border rounded-lg flex items-center justify-between"
                                >
                                  <div>
                                    <span className="font-mono text-admin-foreground font-semibold">{act.actionType}</span>
                                    {act.error && <div className="text-rose-500 text-[11px] mt-0.5">{act.error}</div>}
                                  </div>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                      act.success ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'
                                    }`}
                                  >
                                    {act.success ? 'SUCCESS' : 'FAILED'}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="text-admin-muted italic">No actions executed (condition was skipped or failed).</div>
                            )}
                          </div>
                        </div>

                        {exec.conditionsEvaluated && Object.keys(exec.conditionsEvaluated).length > 0 && (
                          <div>
                            <div className="font-bold text-admin-muted uppercase tracking-wider mb-1">
                              Conditions Evaluated
                            </div>
                            <pre className="p-2.5 bg-admin-surface-subtle border border-admin-border rounded-lg text-admin-foreground font-mono text-[11px] overflow-x-auto">
                              {JSON.stringify(exec.conditionsEvaluated, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-admin-border bg-admin-surface-subtle/50 flex items-center justify-end">
          <Button variant="ghost" onClick={onClose} className="text-admin-muted hover:text-admin-foreground">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
