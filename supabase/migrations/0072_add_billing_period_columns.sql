-- Migration 0072: Add missing billing_period_start and billing_period_end columns to invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS billing_period_start DATE,
ADD COLUMN IF NOT EXISTS billing_period_end DATE;
