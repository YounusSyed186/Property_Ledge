-- Migration 0077: Update automation_executions status check constraint
-- Supports both 'completed' and 'succeeded' statuses seamlessly

ALTER TABLE public.automation_executions DROP CONSTRAINT IF EXISTS automation_executions_status_check;
ALTER TABLE public.automation_executions ADD CONSTRAINT automation_executions_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'succeeded', 'failed', 'skipped'));
