'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Layers, X } from 'lucide-react';
import { handleCreatePlan } from '@/app/actions/admin';
import { Input, Select, Textarea } from '@/components/admin/ui';

interface CreatePlanDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePlanDrawer({ isOpen, onClose }: CreatePlanDrawerProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(isOpen);
  const [animateIn, setAnimateIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let animFrame: number;

    if (isOpen) {
      setMounted(true);
      setAnimateIn(false);
      setError(null);
      animFrame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    } else {
      setAnimateIn(false);
      timer = setTimeout(() => setMounted(false), 280);
    }

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animFrame);
    };
  }, [isOpen]);

  if (!mounted) return null;

  async function handleSubmit(formData: FormData) {
    setError(null);
    const name = formData.get('name') as string;
    const slug = formData.get('slug') as string;
    const description = (formData.get('description') as string) || undefined;
    const priceCents = parseInt((formData.get('priceCents') as string) || '0', 10);
    const billingInterval = formData.get('billingInterval') as 'monthly' | 'yearly';

    startTransition(async () => {
      try {
        await handleCreatePlan({
          name,
          slug,
          description,
          price_cents: priceCents,
          billing_interval: billingInterval,
          status: 'active',
        });
        onClose();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create plan');
      }
    });
  }

  return (
    <div className="absolute inset-0 z-40 overflow-hidden font-sans rounded-xl lg:rounded-2xl">
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          animateIn ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 z-10">
        <div
          className={`w-full sm:w-[500px] md:w-[540px] max-w-full bg-admin-surface border-l border-admin-border text-admin-foreground flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-out ${
            animateIn ? 'translate-x-0' : 'translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-plan-title"
        >
          <div className="p-6 border-b border-admin-border bg-admin-sidebar/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-admin-primary/15 border border-admin-primary/30 flex items-center justify-center text-admin-primary">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-admin-primary">
                  New Subscription Tier
                </span>
                <h2 id="create-plan-title" className="text-base font-bold font-heading text-white">
                  Create Plan
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-admin-border text-admin-muted hover:text-white hover:bg-admin-border/50 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form
            className="flex flex-1 flex-col min-h-0"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit(new FormData(event.currentTarget));
            }}
          >
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {error ? (
                <div className="p-3 rounded-lg bg-admin-danger/10 border border-admin-danger/30 text-admin-danger text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <div className="bg-admin-sidebar-surface/60 rounded-xl border border-admin-border p-4 space-y-4">
                <Input name="name" label="Plan Name" required placeholder="Enterprise" />
                <Input name="slug" label="Slug" required placeholder="enterprise" />
                <Input name="priceCents" label="Price (Cents)" type="number" defaultValue={0} />
                <Select name="billingInterval" label="Billing Interval" defaultValue="monthly">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </Select>
                <Textarea
                  name="description"
                  label="Description"
                  rows={3}
                  placeholder="Plan description..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-admin-border bg-admin-sidebar/60 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-admin-border text-xs text-admin-muted hover:text-white transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 rounded-lg bg-admin-primary text-black hover:bg-admin-primary/90 text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {isPending ? 'Creating...' : 'Create Plan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
