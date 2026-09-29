import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { actionRegistry } from '@/modules/automation/application/actions/action-registry';
import { SendLeaseAction } from '@/modules/automation/application/actions/send-lease-action';
import { ScheduleCalculator } from '@/modules/automation/domain/services/schedule-calculator';
import { createServerServices } from '@/composition/services';

// Ensure SendLeaseAction is registered
actionRegistry.register(new SendLeaseAction());

export async function GET(request: NextRequest) {
  return handleAutomationQueueProcessing(request);
}

export async function POST(request: NextRequest) {
  return handleAutomationQueueProcessing(request);
}

export async function handleAutomationQueueProcessing(request: NextRequest) {
  const startTime = Date.now();

  // Validate Cron secret if configured or Vercel Cron header
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';

  if (cronSecret && !isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
  }

  try {
    const supabase = await createAdminClient();
    const nowIso = new Date().toISOString();
    const { automationExecutionService } = await createServerServices();

    let totalFound = 0;
    let totalProcessed = 0;
    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    const results: Array<{ automationId: string; status: string; error?: string; nextRunAt?: string | null }> = [];

    const BATCH_SIZE = 50;
    let hasMore = true;
    let page = 0;
    const MAX_PAGES = 10; // Safety cap to avoid function timeouts

    while (hasMore && page < MAX_PAGES) {
      page++;

      // Query active automations due for execution (next_run_at <= nowIso)
      const { data: batch, error: fetchErr } = await (supabase as any)
        .from('automations')
        .select(`
          *,
          lease:leases(*)
        `)
        .eq('status', 'active')
        .lte('next_run_at', nowIso)
        .order('next_run_at', { ascending: true })
        .limit(BATCH_SIZE);

      if (fetchErr) {
        console.error('[AutomationCron] DB Fetch Error:', fetchErr);
        throw new Error(fetchErr.message);
      }

      if (!batch || batch.length === 0) {
        hasMore = false;
        break;
      }

      totalFound += batch.length;

      // 1. Batch pre-fetch all existing executions for this batch
      const batchIds = batch.map((a: any) => a.id);
      const batchDateKeys = batch.map((a: any) => {
        const scheduledFor = a.next_run_at || nowIso;
        return `cron_${a.id}_${new Date(scheduledFor).toISOString().slice(0, 10)}`;
      });

      const { data: existingExecutions } = await (supabase as any)
        .from('automation_executions')
        .select('id, automation_id, idempotency_key, status')
        .in('automation_id', batchIds);

      const existingExecMap = new Map<string, { id: string; status: string }>();
      (existingExecutions || []).forEach((ex: any) => {
        if (ex.idempotency_key) {
          existingExecMap.set(ex.idempotency_key, ex);
        }
      });

      // 2. Process automations in concurrent chunks of 5
      const CHUNK_SIZE = 5;
      for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
        const chunk = batch.slice(i, i + CHUNK_SIZE);
        await Promise.all(
          chunk.map(async (rawAuto: any) => {
            const auto = rawAuto as any;
            const scheduledFor = auto.next_run_at || nowIso;
            const dateKey = new Date(scheduledFor).toISOString().slice(0, 10);
            const idempotencyKey = `cron_${auto.id}_${dateKey}`;

            try {
              const existingExec = existingExecMap.get(idempotencyKey);
              if (existingExec && (existingExec.status === 'completed' || existingExec.status === 'running')) {
                totalSkipped++;
                return;
              }

              totalProcessed++;

              // Execute Automation Workflow
              const execRes = await automationExecutionService.executeAutomation({
                automationId: auto.id,
                triggerSource: 'daily_cron',
                context: {
                  leaseId: auto.lease_id,
                  invoiceTemplateId: auto.invoice_template_id,
                  workspaceId: auto.workspace_id,
                  scheduledFor,
                  ...(auto.metadata || {}),
                },
                idempotencyKey,
                sourceEntityType: auto.automation_type === 'lease' ? 'lease' : 'invoice',
                sourceEntityId: auto.lease_id || auto.id,
              });

              // Calculate Next Run Date (7:00 AM AU on next period)
              const leaseStart = auto.lease?.start_date;
              const leaseEnd = auto.lease?.end_date;

              const nextRunAt = ScheduleCalculator.calculateNextRun(
                auto.schedule_type || 'monthly',
                auto.schedule_config || {},
                leaseStart,
                leaseEnd
              );

              // Update Automation Record
              await (supabase as any)
                .from('automations')
                .update({
                  last_run_at: nowIso,
                  next_run_at: nextRunAt,
                  status: nextRunAt ? 'active' : 'completed',
                  updated_at: nowIso,
                })
                .eq('id', auto.id);

              if (execRes.status === 'completed') {
                totalSent++;
                results.push({
                  automationId: auto.id,
                  status: 'sent',
                  nextRunAt,
                });
              } else {
                totalFailed++;
                results.push({
                  automationId: auto.id,
                  status: 'failed',
                  error: execRes.errorMessage || 'Execution returned non-completed status',
                });
              }
            } catch (itemErr: any) {
              totalFailed++;
              console.error(`[AutomationCron] Error processing automation ${auto.id}:`, itemErr);
              results.push({
                automationId: auto.id,
                status: 'failed',
                error: itemErr.message || String(itemErr),
              });
            }
          })
        );
      }

      if (batch.length < BATCH_SIZE) {
        hasMore = false;
      }

    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: nowIso,
      summary: {
        totalFound,
        totalProcessed,
        totalSent,
        totalFailed,
        totalSkipped,
        durationMs,
      },
      results,
    });
  } catch (err: any) {
    console.error('[AutomationCron] Unhandled Queue Processing Exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal queue processing error',
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
