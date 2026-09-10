import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    }
  });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function audit() {
  console.log('=== AUDITING SUPABASE DATABASE ===');
  console.log('Supabase URL:', url);

  const candidateTables = [
    'invoices',
    'invoice_items',
    'invoice_templates',
    'invoice_template_items',
    'invoice_documents',
    'invoice_payments',
    'invoice_number_sequences',
    'automations',
    'automation_rules',
    'automation_actions',
    'automation_executions',
    'automation_logs',
    'leases',
    'lease_tenants',
    'tenants',
    'properties',
    'units',
    'workspaces',
    'workspace_members',
    'user_profiles',
    'profiles',
    'emails',
    'email_logs',
    'audit_logs',
  ];

  for (const table of candidateTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(1);

      if (error) {
        console.log(`❌ Table: [${table}] - Error / Not Found:`, error.message);
      } else {
        const columns = data && data.length > 0 ? Object.keys(data[0]) : '(empty table)';
        console.log(`✅ Table: [${table}] - Row Count: ${count}`);
        if (data && data.length > 0) {
          console.log(`   Sample columns:`, columns);
        }
      }
    } catch (e: any) {
      console.log(`⚠️ Table: [${table}] Exception:`, e.message);
    }
  }
}

audit();
