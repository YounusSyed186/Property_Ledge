-- ==============================================================================
-- 0079_performance_indexes.sql
-- Property Ledge High-Impact Performance Composite Indexes
-- ==============================================================================

-- 1. Invoices workspace status & date sorting
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_status ON invoices (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_created_at ON invoices (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_issue_date ON invoices (workspace_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_property_status ON invoices (property_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices (due_date) WHERE status = 'overdue';

-- 2. Leases property status & created lookup
CREATE INDEX IF NOT EXISTS idx_leases_property_status ON leases (property_id, status);
CREATE INDEX IF NOT EXISTS idx_leases_property_created_at ON leases (property_id, created_at DESC);

-- 3. Tenants property status & created lookup
CREATE INDEX IF NOT EXISTS idx_tenants_property_status ON tenants (property_id, status);
CREATE INDEX IF NOT EXISTS idx_tenants_property_created_at ON tenants (property_id, created_at DESC);

-- 4. Properties workspace active lookup
CREATE INDEX IF NOT EXISTS idx_properties_workspace_status ON properties (workspace_id, status);

-- 5. Automations active schedule lookup & evaluations
CREATE INDEX IF NOT EXISTS idx_automations_workspace_status ON automations (workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_automations_next_run_active ON automations (next_run_at) WHERE status = 'active';

-- 6. Automation executions idempotency & automation lookup
CREATE INDEX IF NOT EXISTS idx_automation_executions_auto_created ON automation_executions (automation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_executions_idempotency ON automation_executions (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 7. Activity logs workspace sorting
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_created ON activity_logs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_property_created ON activity_logs (property_id, created_at DESC);
