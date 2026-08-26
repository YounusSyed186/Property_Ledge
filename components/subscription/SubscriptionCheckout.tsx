'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  UploadCloud,
  FileText,
  X,
  ShieldCheck,
  Clock,
  Building2,
  User,
  CreditCard,
} from 'lucide-react';
import { BANK_DETAILS } from '@/lib/billing/types';
import { handleCreateManualCheckoutSession, handleSubmitManualPayment } from '@/app/actions/billing';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface CheckoutProps {
  initialPlanSlug?: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
}

export function SubscriptionCheckout({
  initialPlanSlug = 'landlord',
  userEmail = '',
  userName = '',
  userPhone = '',
}: CheckoutProps) {
  const router = useRouter();

  // Step 1: Plan, Step 2: Details, Step 3: Payment, Step 4: Confirmation
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>(
    initialPlanSlug === 'pro' ? 'landlord' : initialPlanSlug === 'business' ? 'manager' : initialPlanSlug
  );
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  // Checkout session state
  const [checkoutSession, setCheckoutSession] = useState<{
    subscriptionId: string;
    paymentId: string;
    reference: string;
    expectedAmount: number;
  } | null>(null);

  // Step 2 Form State
  const [accountType, setAccountType] = useState<'individual' | 'business'>('individual');
  const [fullName, setFullName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [phone, setPhone] = useState(userPhone);
  const [businessName, setBusinessName] = useState('');
  const [abn, setAbn] = useState('');
  const [address, setAddress] = useState('14 Collins Street');
  const [suburb, setSuburb] = useState('Melbourne');
  const [state, setState] = useState('VIC');
  const [postcode, setPostcode] = useState('3000');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stepError, setStepError] = useState<string>('');

  // Step 3 Payment Form State
  const [copySuccess, setCopySuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl: string;
  } | null>(null);
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const PLANS: Record<string, { id: string; name: string; price: number; features: string[] }> = {
    landlord: {
      id: 'landlord',
      name: 'Landlord',
      price: 29,
      features: ['Up to 5 properties', 'Rent collection & tracking', 'Basic financial reporting', 'Email support'],
    },
    manager: {
      id: 'manager',
      name: 'Property Manager',
      price: 79,
      features: ['Up to 50 properties', 'Advanced reporting & analytics', 'Inspections & lease tracking', 'Priority support'],
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      price: 29,
      features: ['Up to 25 properties', 'Standard & advanced reports', 'AI insights & exports', 'Up to 5 team seats'],
    },
    business: {
      id: 'business',
      name: 'Business',
      price: 99,
      features: ['Up to 500 properties', 'All advanced reports', 'Dedicated support', 'Up to 50 team seats'],
    },
  };

  const plan = PLANS[selectedPlanSlug] || PLANS.landlord;
  const expectedAmount = billingInterval === 'yearly' ? plan.price * 10 : plan.price;

  // Step 1 -> Step 2
  const handleProceedToDetails = async () => {
    setIsSubmitting(true);
    setStepError('');
    try {
      const session = await handleCreateManualCheckoutSession(selectedPlanSlug, billingInterval);
      if (session) {
        setCheckoutSession(session);
        setCurrentStep(2);
      }
    } catch (err: any) {
      console.error('Failed to create manual checkout session:', err);
      setStepError(err.message || 'Unable to connect to billing session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = 'Please enter a valid email address.';
    if (!phone.trim()) errs.phone = 'Phone number is required.';
    if (accountType === 'business') {
      if (!businessName.trim()) errs.businessName = 'Business name is required.';
      if (!abn.trim() || abn.replace(/\s/g, '').length !== 11) {
        errs.abn = 'Please enter a valid 11-digit ABN.';
      }
    }
    if (!address.trim()) errs.address = 'Street address is required.';
    if (!suburb.trim()) errs.suburb = 'Suburb is required.';
    if (!postcode.trim()) errs.postcode = 'Postcode is required.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setCurrentStep(3);
  };

  // Copy Reference Button
  const handleCopyReference = () => {
    if (!checkoutSession?.reference) return;
    navigator.clipboard.writeText(checkoutSession.reference);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('Invalid format. Please upload a PDF, PNG, or JPG document.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('File is too large. Maximum allowed size is 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFileError('');
  };

  // Final Payment Submission
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) {
      setFileError('Please attach payment proof (PDF or screenshot receipt) to continue.');
      return;
    }

    if (!checkoutSession) {
      setFileError('No active checkout session found. Please refresh and try again.');
      return;
    }

    setIsSubmitting(true);
    setFileError('');

    try {
      await handleSubmitManualPayment(checkoutSession.paymentId, {
        submittedAmount: expectedAmount,
        paymentDate,
        transactionId,
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        mimeType: uploadedFile.type,
        storagePath: `${checkoutSession.paymentId}/${uploadedFile.name}`,
        filePreviewUrl: uploadedFile.dataUrl,
      });

      setCurrentStep(4);
    } catch (err: any) {
      console.error('Failed to submit payment:', err);
      setFileError(err.message || 'Failed to record payment submission in database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-accent selection:text-white">
      {/* CHECKOUT HEADER */}
      <header className="border-b border-border bg-surface/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105">
              <img src="/logo_Light.png" alt="PropertyLedge" className="w-full h-full object-contain dark:hidden" />
              <img src="/logo_Dark.png" alt="PropertyLedge" className="w-full h-full object-contain hidden dark:block" />
            </div>
            <span className="font-heading font-bold text-lg tracking-tight">
              PropertyLedge<span className="text-accent text-xs font-normal">.com.au</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted font-medium bg-surface-subtle/40 px-3 py-1.5 rounded-full border border-border/50">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>Secure Subscription Setup</span>
            </div>
            <Link
              href="/pricing"
              className="text-xs font-semibold text-muted hover:text-foreground transition-colors flex items-center gap-1 px-3 py-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Pricing</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* PROGRESS INDICATOR */}
      <div className="border-b border-border/60 bg-surface/30 py-4">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="md:hidden flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-accent font-heading">
              STEP {currentStep} OF 4
            </span>
            <span className="text-xs font-semibold text-foreground">
              {currentStep === 1 && 'Plan Selection'}
              {currentStep === 2 && 'Billing Details'}
              {currentStep === 3 && 'Manual Payment'}
              {currentStep === 4 && 'Verification Status'}
            </span>
          </div>

          <div className="hidden md:flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2 z-0" />

            {[
              { num: 1, label: 'Plan' },
              { num: 2, label: 'Details' },
              { num: 3, label: 'Payment' },
              { num: 4, label: 'Confirmation' },
            ].map((step) => {
              const isDone = currentStep > step.num;
              const isCurrent = currentStep === step.num;

              return (
                <div key={step.num} className="relative z-10 flex items-center gap-2 bg-background px-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-heading transition-all ${
                      isDone
                        ? 'bg-accent text-white'
                        : isCurrent
                        ? 'bg-foreground text-background ring-4 ring-accent/20'
                        : 'bg-surface-subtle border border-border text-muted'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : `0${step.num}`}
                  </div>
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      isCurrent ? 'text-foreground font-bold' : isDone ? 'text-foreground' : 'text-muted opacity-70'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN CHECKOUT BODY */}
      <main className="flex-1 max-w-[1440px] mx-auto px-5 sm:px-8 py-8 md:py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT COLUMN: ACTIVE STEP FORM */}
          <div className="lg:col-span-7 space-y-8">
            {stepError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-medium">
                {stepError}
              </div>
            )}

            {/* STEP 1: PLAN REVIEW */}
            {currentStep === 1 && (
              <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 space-y-6 shadow-subtle-card">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-accent font-heading">
                    01. SELECT SUBSCRIPTION PLAN
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-bold font-heading uppercase text-foreground tracking-tight mt-1">
                    Review Your Selected Plan
                  </h1>
                </div>

                {/* Billing Interval Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-subtle/50 border border-border">
                  <span className="text-xs font-medium text-muted">Billing Cycle</span>
                  <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border/80">
                    <button
                      type="button"
                      onClick={() => setBillingInterval('monthly')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        billingInterval === 'monthly'
                          ? 'bg-foreground text-background shadow-xs'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingInterval('yearly')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        billingInterval === 'yearly'
                          ? 'bg-foreground text-background shadow-xs'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      <span>Yearly</span>
                      <span className="bg-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                        2 Mos Free
                      </span>
                    </button>
                  </div>
                </div>

                {/* Plan Selection Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(['landlord', 'manager'] as const).map((pId) => {
                    const p = PLANS[pId];
                    const isSelected = selectedPlanSlug === pId;
                    const priceDisplay = billingInterval === 'yearly' ? `$${p.price * 10}` : `$${p.price}`;

                    return (
                      <button
                        key={pId}
                        type="button"
                        onClick={() => setSelectedPlanSlug(pId)}
                        className={`text-left rounded-xl p-5 border transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-accent bg-accent/5 ring-2 ring-accent/30'
                            : 'border-border bg-surface hover:border-accent/50'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <div className="space-y-2">
                          <h3 className="font-heading font-bold text-lg text-foreground">{p.name}</h3>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-extrabold font-heading text-foreground">{priceDisplay}</span>
                            <span className="text-xs text-muted">AUD / {billingInterval === 'yearly' ? 'yr' : 'mo'}</span>
                          </div>
                        </div>

                        <ul className="space-y-2 mt-4 pt-3 border-t border-border/50">
                          {p.features.map((feat, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border">
                  <div className="text-xs text-muted">
                    No hidden setup fees. Subscriptions are billed per portfolio.
                  </div>
                  <button
                    type="button"
                    onClick={handleProceedToDetails}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-foreground text-background font-semibold text-xs flex items-center justify-center gap-2 hover:bg-foreground/90 transition-all shadow-sm disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Initializing...' : 'Continue to Details'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-accent" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: BILLING DETAILS */}
            {currentStep === 2 && (
              <form onSubmit={handleProceedToPayment} className="bg-surface rounded-2xl border border-border p-6 sm:p-8 space-y-6 shadow-subtle-card">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-accent font-heading">
                    02. OWNER & BILLING INFORMATION
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold font-heading uppercase text-foreground tracking-tight mt-1">
                    Enter Account Information
                  </h2>
                </div>

                {/* Account Type Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted tracking-wider">Account Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAccountType('individual')}
                      className={`p-3 rounded-xl border flex items-center gap-3 text-xs font-semibold transition-all ${
                        accountType === 'individual'
                          ? 'border-accent bg-accent/5 text-foreground ring-1 ring-accent'
                          : 'border-border bg-surface text-muted hover:border-accent/40'
                      }`}
                    >
                      <User className="w-4 h-4 text-accent" />
                      <span>Individual Owner</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType('business')}
                      className={`p-3 rounded-xl border flex items-center gap-3 text-xs font-semibold transition-all ${
                        accountType === 'business'
                          ? 'border-accent bg-accent/5 text-foreground ring-1 ring-accent'
                          : 'border-border bg-surface text-muted hover:border-accent/40'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-accent" />
                      <span>Business Entity</span>
                    </button>
                  </div>
                </div>

                {/* Contact Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="fullName" className="text-xs font-semibold text-foreground">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Sarah Williams"
                      className={`w-full px-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                        errors.fullName ? 'border-red-500' : 'border-border'
                      }`}
                    />
                    {errors.fullName && <p className="text-[11px] text-red-500 font-medium">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-semibold text-foreground">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sarah@example.com.au"
                      className={`w-full px-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                        errors.email ? 'border-red-500' : 'border-border'
                      }`}
                    />
                    {errors.email && <p className="text-[11px] text-red-500 font-medium">{errors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="text-xs font-semibold text-foreground">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+61 400 000 000"
                      className={`w-full px-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                        errors.phone ? 'border-red-500' : 'border-border'
                      }`}
                    />
                    {errors.phone && <p className="text-[11px] text-red-500 font-medium">{errors.phone}</p>}
                  </div>
                </div>

                {/* Conditional Business Fields */}
                {accountType === 'business' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-subtle/30 border border-border">
                    <div className="space-y-1.5">
                      <label htmlFor="businessName" className="text-xs font-semibold text-foreground">
                        Business / Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="businessName"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Property Holdings Pty Ltd"
                        className={`w-full px-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                          errors.businessName ? 'border-red-500' : 'border-border'
                        }`}
                      />
                      {errors.businessName && <p className="text-[11px] text-red-500 font-medium">{errors.businessName}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="abn" className="text-xs font-semibold text-foreground">
                        Australian Business Number (ABN) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="abn"
                        value={abn}
                        onChange={(e) => setAbn(e.target.value)}
                        placeholder="11 222 333 444"
                        className={`w-full px-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                          errors.abn ? 'border-red-500' : 'border-border'
                        }`}
                      />
                      {errors.abn && <p className="text-[11px] text-red-500 font-medium">{errors.abn}</p>}
                    </div>
                  </div>
                )}

                {/* Address Fields */}
                <div className="space-y-4 pt-2 border-t border-border/60">
                  <h3 className="text-xs font-semibold uppercase text-muted tracking-wider">Billing Address</h3>

                  <div className="space-y-1.5">
                    <label htmlFor="address" className="text-xs font-semibold text-foreground">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="14 Collins Street"
                      className={`w-full px-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                        errors.address ? 'border-red-500' : 'border-border'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <label htmlFor="suburb" className="text-xs font-semibold text-foreground">Suburb</label>
                      <input
                        type="text"
                        id="suburb"
                        value={suburb}
                        onChange={(e) => setSuburb(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="state" className="text-xs font-semibold text-foreground">State</label>
                      <input
                        type="text"
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="postcode" className="text-xs font-semibold text-foreground">Postcode</label>
                      <input
                        type="text"
                        id="postcode"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-border">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs font-semibold text-muted hover:text-foreground flex items-center gap-1 px-2 py-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    className="px-8 py-3.5 rounded-xl bg-foreground text-background font-semibold text-xs flex items-center gap-2 hover:bg-foreground/90 transition-all shadow-sm"
                  >
                    <span>Proceed to Payment Instructions</span>
                    <ArrowRight className="w-3.5 h-3.5 text-accent" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: MANUAL PAYMENT & RECEIPT UPLOAD */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 space-y-3 shadow-subtle-card">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-accent font-heading">
                    03. MANUAL BANK TRANSFER
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold font-heading uppercase text-foreground tracking-tight">
                    Complete Your Payment
                  </h2>
                  <p className="text-xs text-muted leading-relaxed">
                    PropertyLedge subscriptions are activated after payment has been manually verified by our team. Please transfer the exact amount using your payment reference below.
                  </p>
                </div>

                {/* BANK TRANSFER CARD */}
                <div className="bg-surface rounded-2xl border-2 border-accent/40 p-6 sm:p-8 space-y-6 shadow-mockup relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-accent" />
                      <h3 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider">
                        Bank Payment Details
                      </h3>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                      Direct Deposit
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-muted font-medium">Account Name</span>
                      <p className="font-bold text-foreground">{BANK_DETAILS.accountName}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted font-medium">Bank</span>
                      <p className="font-bold text-foreground">{BANK_DETAILS.bankName}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted font-medium">BSB Number</span>
                      <p className="font-mono font-bold text-foreground text-sm tracking-wider">{BANK_DETAILS.bsb}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted font-medium">Account Number</span>
                      <p className="font-mono font-bold text-foreground text-sm tracking-wider">{BANK_DETAILS.accountNumber}</p>
                    </div>
                  </div>

                  {/* Payment Reference & Amount Box */}
                  <div className="p-4 rounded-xl bg-surface-subtle/50 border border-border space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted tracking-wider">
                          Payment Reference Number
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-extrabold text-lg text-foreground tracking-wider">
                            {checkoutSession?.reference || 'PL-2026-10482'}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyReference}
                            className="px-2.5 py-1 rounded-md bg-surface border border-border text-foreground hover:border-accent text-[11px] font-semibold flex items-center gap-1 transition-all"
                          >
                            {copySuccess ? (
                              <>
                                <Check className="w-3 h-3 text-green-500" />
                                <span className="text-green-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-accent" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-muted tracking-wider">
                          Amount to Pay
                        </span>
                        <p className="font-heading font-extrabold text-2xl text-foreground">
                          ${expectedAmount.toFixed(2)} <span className="text-xs font-normal text-muted">AUD</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 text-xs text-muted border-t border-border/60">
                    <div className="font-semibold text-foreground">Transfer Instructions:</div>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>Open your bank's mobile app or online banking.</li>
                      <li>Transfer the exact amount (${expectedAmount.toFixed(2)} AUD) to the BSB and Account above.</li>
                      <li>
                        Include <strong className="text-foreground font-mono">{checkoutSession?.reference}</strong> in your payment reference.
                      </li>
                      <li>Upload your receipt below to submit for manual verification.</li>
                    </ol>
                  </div>
                </div>

                {/* PAYMENT PROOF FORM */}
                <form onSubmit={handleSubmitPayment} className="bg-surface rounded-2xl border border-border p-6 sm:p-8 space-y-6 shadow-subtle-card">
                  <div>
                    <h3 className="font-heading font-bold text-base text-foreground uppercase tracking-tight">
                      Submit Payment Proof
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Upload your bank transfer receipt (PDF, PNG, JPG max 5MB).
                    </p>
                  </div>

                  {fileError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-medium">
                      {fileError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Payment Date</label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Transaction Ref <span className="text-muted font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="e.g. N1094827"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">
                      Upload Receipt <span className="text-red-500">*</span>
                    </label>

                    {!uploadedFile ? (
                      <label className="border-2 border-dashed border-border hover:border-accent/80 rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-surface-subtle/30 transition-all hover:bg-surface-subtle/60">
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-semibold text-foreground">
                            Click to upload <span className="font-normal text-muted">or drag and drop</span>
                          </p>
                          <p className="text-[11px] text-muted mt-1">PDF, PNG, JPG (max 5MB)</p>
                        </div>
                      </label>
                    ) : (
                      <div className="p-4 rounded-xl bg-surface-subtle border border-border flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{uploadedFile.name}</p>
                            <p className="text-[11px] text-muted">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-border">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs font-semibold text-muted hover:text-foreground flex items-center gap-1 px-2 py-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Details</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-3.5 rounded-xl bg-accent text-white font-semibold text-xs flex items-center gap-2 hover:bg-accent/90 transition-all shadow-md disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Submitting Payment Proof...</span>
                      ) : (
                        <>
                          <span>Submit Payment Proof</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 4: VERIFICATION CONFIRMATION */}
            {currentStep === 4 && (
              <div className="bg-surface rounded-2xl border border-border p-8 sm:p-12 text-center space-y-6 shadow-subtle-card">
                <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent/30 text-accent flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8" />
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500 font-heading">
                    STATUS: UNDER REVIEW
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold font-heading uppercase text-foreground tracking-tight">
                    Payment Proof Submitted
                  </h2>
                  <p className="text-xs text-muted leading-relaxed">
                    Thank you! Your payment receipt has been submitted for manual verification. Our team will review your transfer against reference{' '}
                    <strong className="font-mono text-foreground">{checkoutSession?.reference}</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface-subtle/50 border border-border max-w-md mx-auto text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between text-muted">
                    <span>Selected Plan:</span>
                    <span className="font-bold text-foreground">{plan.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>Payment Reference:</span>
                    <span className="font-mono font-bold text-foreground">{checkoutSession?.reference}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>Verification Time:</span>
                    <span className="font-semibold text-foreground">Usually 1-4 business hours</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/subscription"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-foreground text-background font-semibold text-xs hover:bg-foreground/90 transition-all shadow-sm"
                  >
                    View Subscription Status
                  </Link>
                  <Link
                    href="/"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-surface-subtle border border-border text-foreground font-semibold text-xs hover:bg-surface-elevated transition-all"
                  >
                    Return to Dashboard
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: ORDER SUMMARY SIDEBAR */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-6 shadow-subtle-card">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider">
                  Order Summary
                </h3>
                <span className="text-[11px] font-semibold text-accent capitalize">{billingInterval} Billing</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-heading font-bold text-base text-foreground">{plan.name} Plan</h4>
                    <p className="text-xs text-muted mt-0.5">{plan.features[0]}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-heading font-bold text-lg text-foreground">
                      ${plan.price}
                    </span>
                    <span className="text-[11px] text-muted block">AUD / mo</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between text-muted">
                    <span>Billing Interval</span>
                    <span className="font-semibold text-foreground capitalize">{billingInterval}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>GST (Included)</span>
                    <span className="font-semibold text-foreground">$0.00 AUD</span>
                  </div>
                  {billingInterval === 'yearly' && (
                    <div className="flex items-center justify-between text-green-500 font-semibold">
                      <span>Annual Discount</span>
                      <span>2 Months Free</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t-2 border-border flex items-baseline justify-between">
                  <span className="font-heading font-bold text-sm uppercase text-foreground">Total Due</span>
                  <div className="text-right">
                    <span className="font-heading font-extrabold text-2xl text-foreground">
                      ${expectedAmount.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-muted uppercase tracking-wider block">AUD</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-subtle/50 border border-border space-y-2 text-[11px] text-muted">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <span>PropertyLedge Subscription Contract</span>
                </div>
                <p className="leading-relaxed">
                  Your manual payment will be verified by PropertyLedge administration. An official tax invoice and approval notification will be emailed to your account upon verification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
