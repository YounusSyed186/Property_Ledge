'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Check,
  Palette,
  Sparkles,
} from 'lucide-react';
import { InvoiceLayoutStyle } from '@/modules/invoices';
import { PREDEFINED_INVOICE_TEMPLATES } from '@/modules/invoices/domain/constants/predefined-templates';
import { InvoiceRenderDTO } from '@/modules/invoices/application/dto/invoice-render-dto';
import { renderInvoiceHtml } from '@/modules/invoices/domain/documents/invoice-html-template';
import { formatAuDisplayDate, getAuTodayString } from '@/lib/format/australian-time';
import { Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

export interface LiveInvoiceData {
  invoiceId?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  currencySymbol?: string;
  customerName?: string;
  customerEmail?: string;
  customerAddress?: string;
  issuerName?: string;
  issuerEmail?: string;
  issuerAddress?: string;
  issuerPhone?: string;
  issuerTaxId?: string;
  propertyAddress?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    discount?: number;
  }>;
  taxName?: string;
  notes?: string;
  paymentInstructions?: string;
  headerText?: string;
  footerText?: string;
  brandColor?: string;
  accentColor?: string;
  layoutStyle?: InvoiceLayoutStyle;
  status?: string;
}

interface LiveInvoiceRendererProps {
  data?: LiveInvoiceData;
  renderDto?: InvoiceRenderDTO;
  showThemePicker?: boolean;
  onThemeChange?: (style: InvoiceLayoutStyle) => void;
}

export function LiveInvoiceRenderer({
  data,
  renderDto,
  showThemePicker = false,
  onThemeChange,
}: LiveInvoiceRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeTheme, setActiveTheme] = useState<InvoiceLayoutStyle>(
    renderDto?.layoutStyle as InvoiceLayoutStyle || data?.layoutStyle || 'classic'
  );
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Normalize into canonical InvoiceRenderDTO
  const canonicalDto = useMemo<InvoiceRenderDTO>(() => {
    if (renderDto) {
      return {
        ...renderDto,
        layoutStyle: activeTheme,
      };
    }

    const d = data || { items: [] };
    const currency = d.currency || 'AUD';
    const symbol = d.currencySymbol || (currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$');

    let subtotal = 0;
    let taxAmount = 0;

    const items = (d.items || []).map((item) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.unitPrice) || 0;
      const disc = Number(item.discount) || 0;
      const lineBase = Math.max(0, q * p - disc);
      const taxR = Number(item.taxRate) || 0;
      const tax = (lineBase * taxR) / 100;
      const lineTotal = lineBase + tax;

      subtotal += lineBase;
      taxAmount += tax;

      return {
        description: item.description || 'Item description',
        quantity: q,
        unitPriceFormatted: `${symbol}${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        taxRateFormatted: taxR > 0 ? `${taxR}%` : '0%',
        taxAmountFormatted: `${symbol}${tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        lineTotalFormatted: `${symbol}${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      };
    });

    const total = subtotal + taxAmount;

    return {
      invoiceId: d.invoiceId || 'preview-id',
      invoiceNumber: d.invoiceNumber || 'INV-2026-00124',
      status: d.status || 'draft',
      currencyCode: currency,
      currencySymbol: symbol,
      issueDateFormatted: d.issueDate ? formatAuDisplayDate(d.issueDate) : formatAuDisplayDate(getAuTodayString()),
      dueDateFormatted: d.dueDate ? formatAuDisplayDate(d.dueDate) : 'Upon Receipt',
      billingPeriodFormatted: null,
      billTo: {
        name: d.customerName || 'Valued Resident / Customer',
        email: d.customerEmail || null,
        address: d.customerAddress || null,
      },
      issuer: {
        name: d.issuerName || 'Property Ledge Management',
        email: d.issuerEmail || 'manager@propertyledge.com.au',
        phone: d.issuerPhone || '+61 2 9000 0000',
        address: d.issuerAddress || null,
        taxId: d.issuerTaxId || null,
      },
      propertyAddress: d.propertyAddress || null,
      items,
      subtotalFormatted: `${symbol}${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      taxAmountFormatted: `${symbol}${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalAmountFormatted: `${symbol}${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      amountPaidFormatted: `${symbol}0.00`,
      balanceDueFormatted: `${symbol}${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      notes: d.notes || null,
      paymentInstructions: d.paymentInstructions || null,
      headerText: d.headerText || 'PROPERTY LEDGE',
      footerText: d.footerText || null,
      brandColor: d.brandColor || '#22333b',
      accentColor: d.accentColor || '#a9927d',
      logoUrl: null,
      layoutStyle: activeTheme,
    };
  }, [data, renderDto, activeTheme]);

  // Generate the exact canonical HTML string used for PDF generation
  const htmlContent = useMemo(() => {
    return renderInvoiceHtml(canonicalDto);
  }, [canonicalDto]);

  const handleThemeSelect = (theme: InvoiceLayoutStyle) => {
    setActiveTheme(theme);
    if (onThemeChange) {
      onThemeChange(theme);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };

  const themes = PREDEFINED_INVOICE_TEMPLATES;

  return (
    <div className="flex flex-col space-y-3">
      {/* ─── TOOLBAR (Theme Selector, Zoom, Print) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-admin-surface border border-admin-border rounded-xl shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-admin-primary/10 text-admin-primary border border-admin-primary/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-admin-foreground">A4 Document Preview</h4>
            <p className="text-[10.5px] text-admin-muted">
              100% parity with downloaded PDF & Resend attachment
            </p>
          </div>
        </div>

        {showThemePicker && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeSelect(t.layoutStyle)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border',
                  activeTheme === t.layoutStyle
                    ? 'bg-admin-primary text-white border-admin-primary shadow-xs'
                    : 'bg-admin-surface-subtle text-admin-muted border-admin-border hover:text-admin-foreground'
                )}
                title={`${t.name} (${t.badge})`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/10"
                  style={{ backgroundColor: t.brandColor }}
                />
                {t.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.75, Math.min(1.25, z - 0.1)))}
            className="p-1.5 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded-lg transition-colors border border-admin-border"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-admin-muted px-1">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.75, Math.min(1.25, z + 0.1)))}
            className="p-1.5 text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle rounded-lg transition-colors border border-admin-border"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Print Button */}
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="font-bold border-admin-border text-xs text-admin-foreground hover:bg-admin-surface-subtle ml-1"
          >
            <Printer className="w-3.5 h-3.5 mr-1 text-admin-primary" /> Print
          </Button>
        </div>
      </div>

      {/* ─── AUTHENTIC A4 CANVAS CONTAINER ─── */}
      <div className="bg-zinc-900/60 dark:bg-black/60 p-4 md:p-8 rounded-2xl border border-admin-border flex justify-center items-center overflow-auto shadow-inner min-h-[500px]">
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
            width: '210mm',
            minHeight: '297mm',
          }}
          className="bg-white text-black shadow-2xl rounded-sm overflow-hidden border border-zinc-300"
        >
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            title="Invoice A4 Preview"
            className="w-full border-0"
            style={{
              width: '210mm',
              height: '297mm',
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  );
}
