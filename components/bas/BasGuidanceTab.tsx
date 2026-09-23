'use client';

import React from 'react';
import { BasGuidanceItem, BasWorksheetDTO } from '@/modules/finance/domain/types';
import { formatCurrency } from '@/lib/format/currency';
import { SectionPanel } from '@/components/workspace/layout';
import {
  ExternalLink,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface BasGuidanceTabProps {
  guidance: BasGuidanceItem[];
  worksheet: BasWorksheetDTO;
}

export function BasGuidanceTab({ guidance, worksheet }: BasGuidanceTabProps) {
  return (
    <div className="space-y-6 pb-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-admin-border bg-admin-surface p-5 shadow-2xs md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-admin-primary">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Simpler BAS Reporting Reference</span>
          </div>
          <h3 className="font-heading text-base font-bold text-admin-foreground">
            How to Complete Your Activity Statement
          </h3>
          <p className="text-xs text-admin-muted">
            Transfer the reconciled figures below directly into your ATO Business Portal or MyGov lodgement form.
          </p>
        </div>

        <a
          href="https://www.ato.gov.au/business/business-activity-statements-bas/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-admin-border bg-admin-surface-subtle px-3 py-1.5 text-xs font-semibold text-admin-foreground hover:bg-admin-surface transition-colors shadow-2xs shrink-0"
        >
          <span>Visit ATO Portal</span>
          <ExternalLink className="h-3.5 w-3.5 text-admin-muted" />
        </a>
      </div>

      {/* Field Mapping Table */}
      <SectionPanel
        title={`Official ATO Form Box Mapping (${worksheet.periodLabel})`}
        action={
          <span className="text-xs font-medium text-admin-muted">
            {worksheet.propertyName}
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-admin-border text-admin-muted font-medium">
                <th className="pb-2.5 font-medium">ATO Form Box</th>
                <th className="pb-2.5 font-medium">PropertyLedge Line</th>
                <th className="pb-2.5 text-right font-medium">Amount</th>
                <th className="pb-2.5 pl-4 font-medium">ATO Lodgement Instructions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border/50">
              {guidance.map((item, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-admin-surface-subtle transition-colors"
                >
                  <td className="py-3 pr-3">
                    <span className="inline-flex items-center rounded-md bg-admin-primary/10 border border-admin-primary/20 px-2 py-0.5 font-mono text-xs font-bold text-admin-primary">
                      {item.basField}
                    </span>
                  </td>
                  <td className="py-3 pr-3 font-semibold text-admin-foreground">
                    {item.ledgeLabel}
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-admin-foreground">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="py-3 pl-4 text-xs text-admin-muted leading-relaxed">
                    {item.explanation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Practical ATO Lodgement Notes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-admin-border bg-admin-surface p-4 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-admin-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Accounting Method: Cash vs Accruals</span>
          </div>
          <p className="text-xs text-admin-muted leading-relaxed">
            Under Simpler BAS, small business property owners report on a cash basis. Transactions in PropertyLedge are reconciled by their recorded payment / received date in your ledger.
          </p>
        </div>

        <div className="rounded-xl border border-admin-border bg-admin-surface p-4 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-admin-foreground">
            <ShieldCheck className="h-4 w-4 text-admin-teal" />
            <span>Audit Trail & Records Retention</span>
          </div>
          <p className="text-xs text-admin-muted leading-relaxed">
            The ATO requires property investors to maintain tax invoices and ledger records for 5 years. Use the <strong>Generate Accountant Report</strong> button to save full audit records for each quarter.
          </p>
        </div>
      </div>
    </div>
  );
}
