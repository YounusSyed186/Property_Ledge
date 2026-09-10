-- Migration 0078: Seed 5 Canonical Fixed Predefined Invoice Templates
-- Ensures fixed templates exist across all workspaces while preserving 100% of historical invoice data.

DO $$
BEGIN
    -- Ensure columns exist for template layout definitions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_templates' AND column_name = 'layout_style') THEN
        ALTER TABLE invoice_templates ADD COLUMN layout_style TEXT NOT NULL DEFAULT 'classic';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_templates' AND column_name = 'brand_color') THEN
        ALTER TABLE invoice_templates ADD COLUMN brand_color TEXT NOT NULL DEFAULT '#22333b';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_templates' AND column_name = 'accent_color') THEN
        ALTER TABLE invoice_templates ADD COLUMN accent_color TEXT NOT NULL DEFAULT '#a9927d';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoice_templates' AND column_name = 'is_system') THEN
        ALTER TABLE invoice_templates ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Seed the 5 canonical templates for each existing workspace
INSERT INTO invoice_templates (
    id,
    workspace_id,
    name,
    description,
    invoice_type,
    status,
    layout_style,
    brand_color,
    accent_color,
    is_default,
    is_system,
    payment_terms_days,
    currency,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    w.id,
    tpl.name,
    tpl.description,
    'rent',
    'active',
    tpl.layout_style,
    tpl.brand_color,
    tpl.accent_color,
    tpl.is_default,
    true,
    14,
    'AUD',
    now(),
    now()
FROM workspaces w
CROSS JOIN (
    VALUES
        ('Classic Standard', 'A traditional, balanced commercial layout with a navy header banner and structured financial summary.', 'classic', '#22333b', '#a9927d', true),
        ('Modern Minimalist', 'Crisp monochrome typography, generous whitespace, and sleek hairline dividers for a modern studio look.', 'minimalist', '#18181b', '#71717a', false),
        ('Corporate Executive', 'Deep royal navy styling with warm amber accents, prominent payment status badge, and robust structure.', 'corporate', '#1e3a8a', '#d97706', false),
        ('Editorial Serif', 'Refined serif typography with warm charcoal tones and elegant borders, ideal for legal and luxury tenancies.', 'elegant', '#292524', '#a16207', false),
        ('Creative Vibrant', 'Dynamic gradient header with cyan and indigo accents, modern rounded badges, and contemporary feel.', 'creative', '#4f46e5', '#06b6d4', false)
) AS tpl(name, description, layout_style, brand_color, accent_color, is_default)
WHERE NOT EXISTS (
    SELECT 1 FROM invoice_templates it
    WHERE it.workspace_id = w.id AND it.name = tpl.name
);
