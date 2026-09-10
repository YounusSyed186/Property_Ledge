import { NextRequest } from 'next/server';
import { handleAutomationQueueProcessing } from '@/app/api/cron/evaluate-automations/route';

export async function GET(request: NextRequest) {
  return handleAutomationQueueProcessing(request);
}

export async function POST(request: NextRequest) {
  return handleAutomationQueueProcessing(request);
}
