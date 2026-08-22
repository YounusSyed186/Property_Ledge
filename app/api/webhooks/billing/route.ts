import { NextRequest, NextResponse } from 'next/server';
import { processWebhookEvent } from '@/lib/billing/service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature') || req.headers.get('x-webhook-signature') || 'test';
    const secret = process.env.STRIPE_WEBHOOK_SECRET || 'test';

    const result = await processWebhookEvent(rawBody, signature, secret);
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err: any) {
    const isInvalidSig = err.message?.includes('WEBHOOK_INVALID_SIGNATURE');
    const status = isInvalidSig ? 400 : 500;
    return NextResponse.json(
      { success: false, error: err.message || 'Webhook processing failed' },
      { status }
    );
  }
}
