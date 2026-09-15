'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  ArrowRight,
  ShieldCheck,
  LayoutTemplate,
  Layers,
  Printer,
  Download,
  Calendar,
  Sparkles,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, useToast } from '@/components/admin/ui';
import { ListPage } from '@/components/workspace';
import {
  PREDEFINED_LEDGER_TEMPLATES,
  PredefinedLedgerTemplate,
} from '@/modules/finance/domain/constants/report-templates';
import { LedgerReportModal } from '@/components/finance/LedgerReportModal';
import { fetchTransactionsAction, fetchLedgerAction } from '@/app/actions/finance';
import { fetchDashboardProperties } from '@/app/actions/dashboard';
import { TransactionDTO, LedgerEntryDTO } from '@/modules/finance/domain/types';
import { cn } from '@/lib/utils';

export default function LedgerTemplatesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<TransactionDTO[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntryDTO[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('template_executive');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [txs, ledger, props] = await Promise.all([
          fetchTransactionsAction({}),
          fetchLedgerAction({}),
          fetchDashboardProperties(),
        ]);
        setTransactions(txs || []);
        setLedgerEntries(ledger || []);
        setProperties(props || []);
      } catch (err) {
        console.error('Failed to load transactions for template generator:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUseTemplate = (templateId: string) => {
    setActiveTemplateId(templateId);
    setIsReportModalOpen(true);
  };

  return (
    <ListPage
      title="Ledger & Statement Blueprints"
      description="Select and generate Australian tax-compliant financial statements, ATO schedules, and executive cashflow reports."
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Transactions', href: '/dashboard/money' },
        { label: 'Statement Templates' },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/dashboard/money">
            <Button
              variant="outline"
              size="sm"
              className="font-bold border-admin-border hover:bg-admin-surface-subtle text-admin-foreground text-xs"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 text-[#008F83]" />
              All Transactions
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => handleUseTemplate('template_executive')}
            className="h-9 px-4 rounded-xl font-semibold text-xs bg-[#008F83] hover:bg-[#007A70] text-white shadow-xs hover:shadow transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Generate Custom Report
          </button>
        </div>
      }
      summary={
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-admin-surface border border-admin-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Statement Blueprints</p>
              <h3 className="text-lg font-black text-admin-foreground truncate">
                {PREDEFINED_LEDGER_TEMPLATES.length} Standard Blueprints
              </h3>
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#008F83]/10 text-[#008F83] flex items-center justify-center shrink-0 border border-[#008F83]/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Period Flexibility</p>
              <h3 className="text-lg font-black text-admin-foreground truncate">
                Yearly, Quarterly & Custom
              </h3>
            </div>
          </div>

          <div className="bg-admin-surface border border-admin-border rounded-2xl p-4 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-admin-muted uppercase tracking-wider">Compliance Guarantee</p>
              <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 truncate">
                ATO Tax & CPA Ready
              </h3>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex-1 flex flex-col min-h-0 h-full space-y-4">
        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-y-auto flex-1 p-1">
          {PREDEFINED_LEDGER_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-admin-surface border border-admin-border rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:border-[#008F83]/50 hover:shadow-md transition-all group"
            >
              <div className="space-y-4">
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs"
                      style={{ backgroundColor: tmpl.brandColor }}
                    />
                    <span className="text-[11px] font-mono text-admin-muted uppercase tracking-wider">
                      {tmpl.layoutStyle}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-admin-surface-subtle border border-admin-border text-admin-primary">
                    {tmpl.badge}
                  </span>
                </div>

                {/* Template Info */}
                <div>
                  <h3 className="text-base font-bold text-admin-foreground group-hover:text-[#008F83] transition-colors">
                    {tmpl.name}
                  </h3>
                  <p className="text-xs text-admin-muted mt-1.5 leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>

                {/* Feature Highlights */}
                <div className="p-3.5 bg-admin-surface-subtle border border-admin-border rounded-2xl space-y-2 text-xs">
                  {tmpl.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-admin-muted">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tmpl.brandColor }} />
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-admin-muted">
                  <span>Best for: <strong className="text-admin-foreground">{tmpl.bestFor}</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-admin-border/60 mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleUseTemplate(tmpl.id)}
                  className="w-full h-9 px-4 rounded-xl font-bold text-xs bg-[#008F83] hover:bg-[#007A70] text-white transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  Generate Statement <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Report Generator Modal */}
      {isReportModalOpen && (
        <LedgerReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          transactions={transactions}
          ledgerEntries={ledgerEntries}
          properties={properties}
          initialTemplateId={activeTemplateId}
        />
      )}
    </ListPage>
  );
}
