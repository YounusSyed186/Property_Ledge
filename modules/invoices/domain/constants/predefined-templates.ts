/**
 * Authoritative Canonical Definition for the 5 Predefined Fixed Invoice Templates.
 * Templates are strictly application-controlled; users cannot customize colors, fonts, or layouts.
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
    name: 'Classic Standard',
    badge: 'Popular & Versatile',
    description: 'A traditional, balanced commercial layout with a navy header banner and structured financial summary.',
    layoutStyle: 'classic',
    brandColor: '#22333b',
    accentColor: '#a9927d',
    fontFamily: "'Inter', sans-serif",
    isDefault: true,
  },
  {
    id: 'template_minimalist',
    name: 'Modern Minimalist',
    badge: 'Clean & Editorial',
    description: 'Crisp monochrome typography, generous whitespace, and sleek hairline dividers for a modern studio look.',
    layoutStyle: 'minimalist',
    brandColor: '#18181b',
    accentColor: '#71717a',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: 'template_corporate',
    name: 'Corporate Executive',
    badge: 'Enterprise Grade',
    description: 'Deep royal navy styling with warm amber accents, prominent payment status badge, and robust structure.',
    layoutStyle: 'corporate',
    brandColor: '#1e3a8a',
    accentColor: '#d97706',
    fontFamily: "'Inter', sans-serif",
  },
  {
    id: 'template_elegant',
    name: 'Editorial Serif',
    badge: 'Luxury & Legal',
    description: 'Refined serif typography with warm charcoal tones and elegant borders, ideal for legal and luxury tenancies.',
    layoutStyle: 'elegant',
    brandColor: '#292524',
    accentColor: '#a16207',
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  {
    id: 'template_creative',
    name: 'Creative Vibrant',
    badge: 'Modern Tech',
    description: 'Dynamic gradient header with cyan and indigo accents, modern rounded badges, and contemporary feel.',
    layoutStyle: 'creative',
    brandColor: '#4f46e5',
    accentColor: '#06b6d4',
    fontFamily: "'Inter', sans-serif",
  },
];

export function getPredefinedTemplateById(idOrStyle?: string | null): PredefinedInvoiceTemplate {
  if (!idOrStyle) return PREDEFINED_INVOICE_TEMPLATES[0];
  const found = PREDEFINED_INVOICE_TEMPLATES.find(
    (t) => t.id === idOrStyle || t.layoutStyle === idOrStyle
  );
  return found || PREDEFINED_INVOICE_TEMPLATES[0];
}
