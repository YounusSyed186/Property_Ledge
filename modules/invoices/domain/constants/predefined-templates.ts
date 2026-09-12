/**
 * Authoritative Canonical Definition for the 8 Predefined Fixed Invoice Templates.
 * Recreated from the authentic PropertyLedge V1 design system.
 */

import { InvoiceLayoutStyle } from '../entities/invoice-template';

export interface PredefinedInvoiceTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  layoutStyle: InvoiceLayoutStyle;
  brandColor: string;
  accentColor: string;
  fontFamily: string;
  isDefault?: boolean;
}

export const PREDEFINED_INVOICE_TEMPLATES: PredefinedInvoiceTemplate[] = [
  {
    id: 'template_classic',
    name: 'Classic Clean',
    badge: 'Popular & Versatile',
    description: 'A balanced commercial layout with 2-column details, soft gray metadata box, and signature blue highlights.',
    layoutStyle: 'classic',
    brandColor: '#22333b',
    accentColor: '#2962ff',
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    isDefault: true,
  },
  {
    id: 'template_modern',
    name: 'Modern Slate',
    badge: 'Tech & Contemporary',
    description: 'Full-bleed dark slate banner with electric blue vertical accent stripe and high-contrast KPI metric cards.',
    layoutStyle: 'modern',
    brandColor: '#22333b',
    accentColor: '#3b82f6',
    fontFamily: "'Outfit', 'Inter', sans-serif",
  },
  {
    id: 'template_minimalist',
    name: 'Minimalist Line',
    badge: 'Clean & Editorial',
    description: 'Swiss editorial style with wide letter-spacing, elegant hairline dividers, and generous architectural whitespace.',
    layoutStyle: 'minimalist',
    brandColor: '#18181b',
    accentColor: '#71717a',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'template_corporate',
    name: 'Corporate Blue',
    badge: 'Enterprise Grade',
    description: 'Deep navy header banner with structured address grid, slate table styling, and prominent corporate billing block.',
    layoutStyle: 'corporate',
    brandColor: '#0f172a',
    accentColor: '#1e40af',
    fontFamily: "'Inter', sans-serif",
  },
  {
    id: 'template_creative',
    name: 'Creative Studio',
    badge: 'Bold Agency',
    description: 'Giant typography with warm orange radial ambient gradients, bold table accents, and dynamic agency pricing.',
    layoutStyle: 'creative',
    brandColor: '#0f172a',
    accentColor: '#f97316',
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
  },
  {
    id: 'template_elegant',
    name: 'Elegant Serif',
    badge: 'Luxury & Legal',
    description: 'Opulent serif typography with warm charcoal tones, delicate gold divider bars, and legal-grade editorial hierarchy.',
    layoutStyle: 'elegant',
    brandColor: '#1c1917',
    accentColor: '#c0a060',
    fontFamily: "Georgia, 'Times New Roman', Times, serif",
  },
  {
    id: 'template_google',
    name: 'Google Material',
    badge: 'Modular & Playful',
    description: 'Material card layout with multi-color dot accents, rounded floating containers, and friendly clean typography.',
    layoutStyle: 'google',
    brandColor: '#202124',
    accentColor: '#4285f4',
    fontFamily: "'Roboto', -apple-system, sans-serif",
  },
  {
    id: 'template_monochrome',
    name: 'Monochrome Dark',
    badge: 'Neo-Brutalist',
    description: 'Bold neo-brutalist 12px black frame with monospace type, inverted solid black badges, and 4px structural borders.',
    layoutStyle: 'monochrome',
    brandColor: '#000000',
    accentColor: '#000000',
    fontFamily: "'Courier New', Courier, monospace",
  },
];

export function getPredefinedTemplateById(idOrStyle?: string | null): PredefinedInvoiceTemplate {
  if (!idOrStyle) return PREDEFINED_INVOICE_TEMPLATES[0];
  const found = PREDEFINED_INVOICE_TEMPLATES.find(
    (t) => t.id === idOrStyle || t.layoutStyle === idOrStyle
  );
  return found || PREDEFINED_INVOICE_TEMPLATES[0];
}
