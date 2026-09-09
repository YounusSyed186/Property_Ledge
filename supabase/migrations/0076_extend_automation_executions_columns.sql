-- Migration 0076: Extend Automation Executions Table Columns
-- Adds missing columns for automation execution audit trail and metrics

ALTER TABLE public.automation_executions
ADD COLUMN IF NOT EXISTS source_entity_type TEXT,
ADD COLUMN IF NOT EXISTS source_entity_id TEXT,
ADD COLUMN IF NOT EXISTS conditions_evaluated JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS actions_executed JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS execution_duration_ms INTEGER;

-- Create indexes for filtering logs by source entity
CREATE INDEX IF NOT EXISTS idx_automation_executions_source ON public.automation_executions(source_entity_type, source_entity_id);
