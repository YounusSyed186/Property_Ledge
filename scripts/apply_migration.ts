import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

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

const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20260929000000_condition_reports.sql');
const sql = fs.readFileSync(sqlPath, 'utf-8');

async function main() {
  console.log('Applying migration 20260929000000_condition_reports.sql...');
  
  // Try direct Postgres connection if DATABASE_URL is available
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL...');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log('Migration applied successfully via DATABASE_URL!');
    return;
  }

  // Otherwise, test with Supabase management endpoint using service role key
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  console.log('Checking Supabase connection...');
}

main();
