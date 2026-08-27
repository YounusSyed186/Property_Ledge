'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { handleCreateEntitlement } from '@/app/actions/admin-config';
import { Input, Textarea, Button, SegmentedControl } from '@/components/admin/ui';
import { CapabilityCatalogStep } from './create/CapabilityCatalogStep';
import { EntitlementReviewStep } from './create/EntitlementReviewStep';
import {
  type SupportedEntitlementDefinition,
  suggestMachineKeyFromName,
  validateMachineKey,
  getControlDescription,
  getKindLabel,
  getTypeDisplayLabel,
} from '@/lib/entitlements/capability-catalog';
import type { AdminEntitlementRow } from '@/lib/admin/types';

interface CreateEntitlementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  existingEntitlements: AdminEntitlementRow[];
  onViewExisting?: (row: AdminEntitlementRow) => void;
  onCreated?: (name: string) => void;
}

type Step = 'catalog' | 'configure' | 'review' | 'custom' | 'custom-review';

export function CreateEntitlementDrawer({
  isOpen,
  onClose,
  existingEntitlements,
  onViewExisting,
  onCreated,
}: CreateEntitlementDrawerProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(isOpen);
  const [animateIn, setAnimateIn] = useState(false);
  const [step, setStep] = useState<Step>('catalog');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [capability, setCapability] = useState<SupportedEntitlementDefinition | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [key, setKey] = useState('');
  const [valueType, setValueType] = useState<'boolean' | 'number'>('number');
  const [isCustom, setIsCustom] = useState(false);

  const existingKeys = new Set(existingEntitlements.map((e) => e.key));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let animFrame: number;
    if (isOpen) {
      setMounted(true);
      setAnimateIn(false);
      setStep('catalog');
      setError(null);
      setCapability(null);
      setName('');
      setDescription('');
      setKey('');
      setValueType('number');
      setIsCustom(false);
      setShowAdvanced(false);
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

  function selectCapability(cap: SupportedEntitlementDefinition) {
    if (existingKeys.has(cap.key)) {
      setError('An entitlement with this capability already exists.');
      return;
    }
    setCapability(cap);
    setName(cap.displayName);
    setDescription(cap.defaultDescription);
    setKey(cap.key);
    setValueType(cap.valueType === 'boolean' ? 'boolean' : 'number');
    setIsCustom(false);
    setError(null);
    setStep('configure');
  }

  function startCustom() {
    setCapability(null);
    setName('');
    setDescription('');
    setKey('');
    setValueType('number');
    setIsCustom(true);
    setError(null);
    setStep('custom');
  }

  function generateKeyFromName() {
    const suggested = suggestMachineKeyFromName(name);
    if (suggested) setKey(suggested);
  }

  function validateCustom(): string | null {
    if (!name.trim()) return 'Display name is required.';
    const keyErr = validateMachineKey(key);
    if (keyErr) return keyErr;
    if (existingKeys.has(key.trim())) {
      return 'An entitlement with this internal identifier already exists.';
    }
    return null;
  }

  function handleReview() {
    if (isCustom) {
      const err = validateCustom();
      if (err) { setError(err); return; }
      setStep('custom-review');
    } else {
      if (!name.trim()) { setError('Display name is required.'); return; }
      setStep('review');
    }
    setError(null);
  }

  function handleCreate() {
    const err = isCustom ? validateCustom() : null;
    if (err) { setError(err); return; }
    setError(null);
    startTransition(async () => {
      try {
        await handleCreateEntitlement({
          key: key.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          value_type: valueType,
        });
        onCreated?.(name.trim());
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create entitlement');
      }
    });
  }

  function handleBack() {
    setError(null);
    if (step === 'configure') setStep('catalog');
    else if (step === 'review') setStep('configure');
    else if (step === 'custom') setStep('catalog');
    else if (step === 'custom-review') setStep('custom');
  }

  const stepTitle =
    step === 'catalog' ? 'Create entitlement' :
    step === 'configure' ? capability?.displayName || 'Configure' :
    step === 'review' || step === 'custom-review' ? 'Review entitlement' :
    'Create custom entitlement';

  const stepSubtitle =
    step === 'catalog' ? 'Choose a capability or limit that subscription plans can control.' :
    step === 'configure' ? capability?.shortDescription :
    step === 'custom' ? 'For advanced platform configuration.' :
    undefined;

  return (
    <div className="absolute inset-0 z-40 overflow-hidden font-sans rounded-xl lg:rounded-2xl">
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${animateIn ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 z-10">
        <div
          className={`w-full sm:w-[520px] md:w-[560px] max-w-full bg-admin-surface border-l border-admin-border text-admin-foreground flex flex-col shadow-2xl transition-transform duration-300 ease-out ${animateIn ? 'translate-x-0' : 'translate-x-full'}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-entitlement-title"
        >
          <div className="p-6 border-b border-admin-border bg-admin-sidebar/50 flex items-center justify-between shrink-0">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-admin-primary">Configuration</p>
              <h2 id="create-entitlement-title" className="text-base font-bold text-white truncate">{stepTitle}</h2>
              {stepSubtitle && <p className="text-xs text-admin-muted mt-0.5">{stepSubtitle}</p>}
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg border border-admin-border text-admin-muted hover:text-white shrink-0" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-admin-danger/10 border border-admin-danger/30 text-admin-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === 'catalog' && (
              <CapabilityCatalogStep
                existingEntitlements={existingEntitlements}
                onSelect={selectCapability}
                onCustom={startCustom}
                onViewExisting={(row) => {
                  onClose();
                  onViewExisting?.(row);
                }}
              />
            )}

            {step === 'configure' && capability && (
              <div className="space-y-4">
                <div className="rounded-xl border border-admin-border p-4 space-y-4">
                  <p className="text-xs font-medium text-admin-muted uppercase tracking-wide">Configuration</p>
                  <Input label="Display name" value={name} onChange={(e) => setName(e.target.value)} required />
                  <Textarea
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    helpText={getControlDescription(capability)}
                  />
                  <div className="rounded-lg bg-admin-muted/10 px-3 py-2 text-xs text-admin-muted">
                    <span className="font-medium text-admin-foreground">{getKindLabel(capability.kind)}</span>
                    {' · '}
                    {getTypeDisplayLabel(capability.valueType)}
                    <p className="mt-1">Type is determined automatically for supported capabilities.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-xs text-admin-muted hover:text-admin-foreground"
                >
                  {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  Advanced settings
                </button>
                {showAdvanced && (
                  <div className="rounded-xl border border-admin-border p-4 space-y-3">
                    <div>
                      <Input label="Machine key" value={key} disabled className="font-mono text-xs opacity-70" />
                      <p className="text-[10px] text-admin-muted mt-1">
                        Internal identifier used by PropertyLedge. Generated automatically and should not be changed.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(step === 'review' || step === 'custom-review') && (
              <EntitlementReviewStep
                name={name}
                description={description}
                key={key}
                valueType={valueType}
                capability={capability}
                isCustom={isCustom}
              />
            )}

            {step === 'custom' && (
              <div className="space-y-4">
                <Input
                  label="Display name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Maximum Team Members"
                  required
                />
                <div>
                  <div className="flex items-end justify-between gap-2 mb-1">
                    <label className="text-caption font-medium text-admin-foreground">Internal identifier</label>
                    <button type="button" className="text-xs text-admin-primary hover:underline" onClick={generateKeyFromName}>
                      Generate from name
                    </button>
                  </div>
                  <Input
                    value={key}
                    onChange={(e) => setKey(e.target.value.toLowerCase())}
                    placeholder="team_members.max"
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-admin-muted mt-1">
                    Used internally by PropertyLedge. Lowercase, dots to separate groups, no spaces.
                  </p>
                  <p className="text-[10px] text-admin-muted/70 mt-0.5 font-mono">e.g. properties.max, reports.enabled</p>
                </div>
                <div>
                  <p className="text-caption font-medium text-admin-foreground mb-2">What does this control?</p>
                  <SegmentedControl
                    value={valueType === 'boolean' ? 'feature' : 'limit'}
                    onChange={(v) => setValueType(v === 'feature' ? 'boolean' : 'number')}
                    options={[
                      { value: 'feature', label: 'Feature (Enabled / Disabled)' },
                      { value: 'limit', label: 'Limit (Numeric value)' },
                    ]}
                  />
                </div>
                <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
            )}
          </div>

          <div className="p-4 border-t border-admin-border bg-admin-sidebar/60 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={step === 'catalog' ? onClose : handleBack}
              className="px-4 py-2 rounded-lg border border-admin-border text-xs text-admin-muted hover:text-white"
            >
              {step === 'catalog' ? 'Cancel' : 'Back'}
            </button>
            {step === 'catalog' ? null : step === 'review' || step === 'custom-review' ? (
              <Button size="sm" onClick={handleCreate} disabled={isPending}>
                {isPending ? 'Creating...' : 'Create entitlement'}
              </Button>
            ) : (
              <Button size="sm" onClick={handleReview}>
                Review
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
