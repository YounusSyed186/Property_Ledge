import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { actionRegistry } from '@/modules/automation/application/actions/action-registry';
import { SendLeaseAction } from '@/modules/automation/application/actions/send-lease-action';
import { ScheduleCalculator } from '@/modules/automation/domain/services/schedule-calculator';
import { createServerServices } from '@/composition/services';

// Ensure SendLeaseAction is registered
actionRegistry.register(new SendLeaseAction());

export async function GET(request: NextRequest) {
  return handleCronEvaluation(request);
}

export async function POST(request: NextRequest) {
  return handleCronEvaluation(request);
}

async function handleCronEvaluation(request: NextRequest) {
  // Validate Cron secret if configured
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
  }

  try {
    const supabase = await createAdminClient();
    const nowIso = new Date().toISOString();

    // Query active automations due for execution (bounded batch of 100)
    const { data: dueAutomations, error: fetchErr } = await (supabase as any)
      .from('automations')
      .select(`
        *,
        lease:leases(*)
      `)
      .eq('status', 'active')
      .lte('next_run_at', nowIso)
      .limit(100);

    if (fetchErr) {
      console.error('[CronEvaluation] DB Fetch Error:', fetchErr);
      return NextResponse.json({ success: false, error: fetchErr.message }, { status: 500 });
    }

    if (!dueAutomations || dueAutomations.length === 0) {
      return NextResponse.json({
        success: true,
        evaluated: 0,
        message: 'No automations due for execution',
      });
    }

    const { automationExecutionService } = await createServerServices();
    const results = [];

    for (const rawAuto of dueAutomations) {
      const auto = rawAuto as any;
      const scheduledFor = auto.next_run_at || nowIso;
      const idempotencyKey = `cron_${auto.id}_${new Date(scheduledFor).getTime()}`;

      try {
        // Idempotency check: see if execution record exists
        const { data: existingExec } = await (supabase as any)
          .from('automation_executions')
          .select('id')
          .eq('automation_id', auto.id)
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();

        if (existingExec) {
          console.log(`[CronEvaluation] Skipping already claimed execution for automation ${auto.id}`);
          continue;
        }

        // Execute automation
        const execRes = await automationExecutionService.executeAutomation({
          automationId: auto.id,
          triggerSource: 'scheduled',
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

        // Calculate next run time
        const leaseStart = auto.lease?.start_date;
        const leaseEnd = auto.lease?.end_date;

        const nextRunAt = ScheduleCalculator.calculateNextRun(
          auto.schedule_type || 'monthly',
          auto.schedule_config || {},
          leaseStart,
          leaseEnd
        );

        // Update automation record
        await (supabase as any)
          .from('automations')
          .update({
            last_run_at: nowIso,
            next_run_at: nextRunAt,
            status: nextRunAt ? 'active' : 'completed',
            updated_at: nowIso,
          })
          .eq('id', auto.id);

        results.push({
          automationId: auto.id,
          status: execRes.status,
          nextRunAt,
        });
      } catch (err: any) {
        console.error(`[CronEvaluation] Failed automation ${auto.id}:`, err);
        results.push({
          automationId: auto.id,
          status: 'failed',
          error: err.message || String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      evaluated: dueAutomations.length,
      results,
    });
  } catch (err: any) {
    console.error('[CronEvaluation] Unhandled Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
  }
}
