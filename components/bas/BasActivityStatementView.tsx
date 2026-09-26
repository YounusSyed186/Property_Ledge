'use client';

import React, { useState, useTransition } from 'react';
import type {
  BasWorksheetDTO,
  BasTransactionDTO,
  BasPeriod,
} from '@/modules/finance/domain/types';
import type { BasPageData } from '@/lib/bas/service';
import { BasWorksheetTab } from './BasWorksheetTab';
import { BasDetailsTab } from './BasDetailsTab';
import { BasGuidanceTab } from './BasGuidanceTab';
import {
  fetchBasPageDataAction,
  generateBasAccountantReportAction,
} from '@/app/actions/bas';
import { Button, useToast } from '@/components/admin/ui';
import { ListPage, ListPageGrid } from '@/components/workspace';
import {
  FileSpreadsheet,
  Download,
  RotateCw,
  Eye,
  EyeOff,
  FileText,
  HelpCircle,
  Building,
  Calendar,
  Layers,
  Loader2,
} from 'lucide-react';

interface BasActivityStatementViewProps {
  initialData: BasPageData;
}

export function BasActivityStatementView({ initialData }: BasActivityStatementViewProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Filter State
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    initialData.worksheet.propertyId || null
  );
  const [selectedYear, setSelectedYear] = useState<number>(initialData.worksheet.financialYear);
  const [selectedPeriod, setSelectedPeriod] = useState<BasPeriod>(initialData.worksheet.period);
  const [showBasCodes, setShowBasCodes] = useState<boolean>(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'worksheet' | 'details' | 'guidance'>('worksheet');
  const [detailsTypeFilter, setDetailsTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  // Active Data State
  const [pageData, setPageData] = useState<BasPageData>(initialData);

  const handleRefresh = (
    propId = selectedPropertyId,
    year = selectedYear,
    period = selectedPeriod
  ) => {
    startTransition(async () => {
      try {
        const newData = await fetchBasPageDataAction({
          propertyId: propId,
          financialYear: year,
          period,
        });
        setPageData(newData);
      } catch (err: any) {
        console.error('Failed to load BAS data:', err);
        toast({
          title: 'Error updating BAS statement',
          description: err?.message || 'Could not fetch updated data.',
          variant: 'destructive',
        });
      }
    });
  };

  const handlePropertyChange = (newPropId: string) => {
    const val = newPropId === 'all' ? null : newPropId;
    setSelectedPropertyId(val);
    handleRefresh(val, selectedYear, selectedPeriod);
  };

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    handleRefresh(selectedPropertyId, newYear, selectedPeriod);
  };

  const handlePeriodChange = (newPeriod: BasPeriod) => {
    setSelectedPeriod(newPeriod);
    handleRefresh(selectedPropertyId, selectedYear, newPeriod);
  };

  const handleSelectCategoryFilter = (type: 'income' | 'expense', categoryId?: string) => {
    setDetailsTypeFilter(type);
    setActiveTab('details');
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await generateBasAccountantReportAction({
        propertyId: selectedPropertyId,
        financialYear: selectedYear,
        period: selectedPeriod,
      });

      if (res.success && res.base64Data) {
        const link = document.createElement('a');
        link.href = res.base64Data;
        link.download = res.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: 'Accountant Report Generated',
          description: 'Official BAS PDF summary and audit ledger downloaded.',
          variant: 'success',
        });
      }
    } catch (err: any) {
      console.error('Failed to generate Accountant PDF report:', err);
      toast({
        title: 'Report generation failed',
        description: err?.message || 'Could not generate PDF report.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Filter Bar Component
  const filterToolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border pb-4 pt-1">
      <div className="flex flex-wrap items-center gap-3">
        {/* Property Selector */}
        <div className="flex items-center gap-2 rounded-xl border border-admin-border bg-admin-surface px-3 py-2 shadow-2xs min-h-[40px]">
          <Building className="h-4 w-4 text-admin-muted" />
          <select
            value={selectedPropertyId || 'all'}
            onChange={(e) => handlePropertyChange(e.target.value)}
            className="bg-transparent text-body-sm font-medium text-admin-foreground focus:outline-none cursor-pointer"
          >
            <option value="all">All Properties (Portfolio)</option>
            {pageData.properties.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.gst_enabled ? '• [GST]' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Financial Year Selector */}
        <div className="flex items-center gap-2 rounded-xl border border-admin-border bg-admin-surface px-3 py-2 shadow-2xs min-h-[40px]">
          <Calendar className="h-4 w-4 text-admin-muted" />
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
            className="bg-transparent text-body-sm font-medium text-admin-foreground focus:outline-none cursor-pointer"
          >
            {pageData.availableYears.map((yr: number) => (
              <option key={yr} value={yr}>
                FY {yr - 1}–{yr}
              </option>
            ))}
          </select>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 rounded-xl border border-admin-border bg-admin-surface px-3 py-2 shadow-2xs min-h-[40px]">
          <Layers className="h-4 w-4 text-admin-muted" />
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value as BasPeriod)}
            className="bg-transparent text-body-sm font-medium text-admin-foreground focus:outline-none cursor-pointer"
          >
            <option value="Q1">Q1 (1 Jul – 30 Sep)</option>
            <option value="Q2">Q2 (1 Oct – 31 Dec)</option>
            <option value="Q3">Q3 (1 Jan – 31 Mar)</option>
            <option value="Q4">Q4 (1 Apr – 30 Jun)</option>
            <option value="FY">Full Year (FY)</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 rounded-xl border border-admin-border bg-admin-surface-subtle p-1 min-h-[42px]">
        <button
          type="button"
          onClick={() => setActiveTab('worksheet')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-body-sm font-semibold transition-all min-h-[36px] ${
            activeTab === 'worksheet'
              ? 'bg-admin-surface text-admin-foreground shadow-2xs border border-admin-border/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-admin-foreground'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4 text-admin-primary" />
          <span>Worksheet</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-body-sm font-semibold transition-all min-h-[36px] ${
            activeTab === 'details'
              ? 'bg-admin-surface text-admin-foreground shadow-2xs border border-admin-border/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-admin-foreground'
          }`}
        >
          <FileText className="h-4 w-4 text-admin-teal" />
          <span>Details</span>
          <span className="ml-0.5 rounded-md bg-admin-surface-subtle px-2 py-0.5 text-xs font-bold text-admin-foreground border border-admin-border">
            {pageData.details.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guidance')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-body-sm font-semibold transition-all min-h-[36px] ${
            activeTab === 'guidance'
              ? 'bg-admin-surface text-admin-foreground shadow-2xs border border-admin-border/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-admin-foreground'
          }`}
        >
          <HelpCircle className="h-4 w-4 text-admin-indigo" />
          <span>ATO Guide</span>
        </button>
      </div>
    </div>
  );

  return (
    <ListPage
      title="BAS Activity Statement"
      description="Australian GST tracking, category classification, and single-source-of-truth BAS reconciliation worksheet."
      breadcrumb={[
        { label: 'Home', href: '/dashboard' },
        { label: 'Finance', href: '/dashboard/money' },
        { label: 'BAS Activity Statement' },
      ]}
      fill={activeTab === 'details'}
      actions={
        <div className="flex items-center gap-2">
          {activeTab === 'worksheet' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBasCodes(!showBasCodes)}
              className="gap-1.5 text-xs"
            >
              {showBasCodes ? (
                <Eye className="h-3.5 w-3.5 text-admin-primary" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-admin-muted" />
              )}
              <span>{showBasCodes ? 'Hide BAS Codes' : 'Show BAS Codes'}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRefresh()}
            disabled={isPending}
            className="gap-1.5 text-xs"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
            className="gap-1.5 text-xs"
          >
            {isGeneratingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>Generate Accountant Report</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {filterToolbar}

        {isPending ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-admin-border bg-admin-surface p-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-admin-primary" />
              <span className="text-xs text-admin-muted">
                Aggregating BAS calculations from ledger...
              </span>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'worksheet' && (
              <BasWorksheetTab
                worksheet={pageData.worksheet}
                showBasCodes={showBasCodes}
                onSelectCategoryFilter={handleSelectCategoryFilter}
                onOpenHowToTab={() => setActiveTab('guidance')}
              />
            )}

            {activeTab === 'details' && (
              <BasDetailsTab
                transactions={pageData.details}
                periodLabel={pageData.worksheet.periodLabel}
                initialTypeFilter={detailsTypeFilter}
              />
            )}

            {activeTab === 'guidance' && (
              <BasGuidanceTab
                guidance={pageData.guidance}
                worksheet={pageData.worksheet}
              />
            )}
          </>
        )}
      </div>
    </ListPage>
  );
}
