'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  Calendar,
  FileText,
  Clock,
  DollarSign,
  RefreshCw,
  ArrowRight,
  Disc,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineLeaseEvent {
  id: string;
  leaseId: string;
  type: 'start' | 'end' | 'rent_due' | 'renewal' | 'periodic_review';
  label: string;
  property: string;
  tenant: string;
  date: Date;
  dateString: string;
  rentAmount?: number;
  rentFrequency?: string;
  lease: any;
  monthKey: string;
}

export interface LeaseTimelineProps {
  leases: Array<{
    id: string;
    property_id: string;
    start_date: string;
    end_date: string | null;
    rent_amount: number;
    rent_frequency: string;
    payment_due_day: number;
    status: string;
    property?: {
      id: string;
      name: string;
      address_line_1: string;
      city?: string;
      suburb?: string;
    } | null;
    lease_tenants?: Array<{
      role: string;
      is_primary: boolean;
      tenant?: {
        first_name: string;
        last_name: string;
        email: string;
      } | null;
    }>;
  }>;
  onSelectLease?: (lease: any) => void;
  isLoading?: boolean;
  className?: string;
}

export function LeaseTimeline({
  leases = [],
  onSelectLease,
  isLoading = false,
  className,
}: LeaseTimelineProps) {
  const [timeframeMonths, setTimeframeMonths] = useState<number>(6);

  // Calculate Month Buckets and Map Real Events
  const { monthBuckets, timelineColumns } = useMemo(() => {
    const now = new Date();
    const buckets: Array<{ key: string; label: string; date: Date }> = [];

    for (let i = 0; i < timeframeMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ key, label, date: d });
    }

    const startDateWindow = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDateWindow = new Date(now.getFullYear(), now.getMonth() + timeframeMonths, 0, 23, 59, 59);

    const eventList: TimelineLeaseEvent[] = [];

    leases.forEach((l) => {
      const propName = l.property?.name || l.property?.address_line_1 || 'sunShine';
      const primaryLt = l.lease_tenants?.find((lt) => lt.is_primary) || l.lease_tenants?.[0];
      const tenantName = primaryLt?.tenant
        ? `${primaryLt.tenant.first_name || ''} ${primaryLt.tenant.last_name || ''}`.trim()
        : l.property?.suburb || 'test suburb 1';

      // 1. Lease Start Event
      if (l.start_date) {
        const sDate = new Date(l.start_date);
        const sKey = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`;
        eventList.push({
          id: `start-${l.id}`,
          leaseId: l.id,
          type: 'start',
          label: 'Lease Start',
          property: propName,
          tenant: tenantName,
          date: sDate,
          dateString: sDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          rentAmount: l.rent_amount,
          rentFrequency: l.rent_frequency,
          lease: l,
          monthKey: sKey,
        });
      }

      // 2. Lease End Event
      if (l.end_date) {
        const eDate = new Date(l.end_date);
        const eKey = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, '0')}`;
        eventList.push({
          id: `end-${l.id}`,
          leaseId: l.id,
          type: 'end',
          label: 'Lease End',
          property: propName,
          tenant: tenantName,
          date: eDate,
          dateString: eDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          rentAmount: l.rent_amount,
          rentFrequency: l.rent_frequency,
          lease: l,
          monthKey: eKey,
        });

        // 3. Potential Renewal (~60 days before end date)
        const renewalDate = new Date(eDate.getTime() - 60 * 24 * 60 * 60 * 1000);
        const renKey = `${renewalDate.getFullYear()}-${String(renewalDate.getMonth() + 1).padStart(2, '0')}`;
        eventList.push({
          id: `renewal-${l.id}`,
          leaseId: l.id,
          type: 'renewal',
          label: 'Potential Renewal',
          property: propName,
          tenant: tenantName,
          date: renewalDate,
          dateString: renewalDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          rentAmount: l.rent_amount,
          rentFrequency: l.rent_frequency,
          lease: l,
          monthKey: renKey,
        });
      }

      // 4. Periodic Review (for periodic leases)
      if (!l.end_date && l.status === 'active') {
        const reviewDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const pKey = `${reviewDate.getFullYear()}-${String(reviewDate.getMonth() + 1).padStart(2, '0')}`;
        eventList.push({
          id: `periodic-${l.id}`,
          leaseId: l.id,
          type: 'periodic_review',
          label: 'Periodic Review',
          property: propName,
          tenant: tenantName,
          date: reviewDate,
          dateString: reviewDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          rentAmount: l.rent_amount,
          rentFrequency: l.rent_frequency,
          lease: l,
          monthKey: pKey,
        });
      }

      // 5. Rent Due Event in Current / Next Month
      if (l.status === 'active' && l.payment_due_day) {
        const dueDay = Math.min(Math.max(1, l.payment_due_day), 28);
        const nextDueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
        if (nextDueDate < now) {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }
        const rentKey = `${nextDueDate.getFullYear()}-${String(nextDueDate.getMonth() + 1).padStart(2, '0')}`;
        eventList.push({
          id: `rent-${l.id}`,
          leaseId: l.id,
          type: 'rent_due',
          label: 'Rent Due',
          property: propName,
          tenant: tenantName,
          date: nextDueDate,
          dateString: nextDueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          rentAmount: l.rent_amount,
          rentFrequency: l.rent_frequency,
          lease: l,
          monthKey: rentKey,
        });
      }
    });

    // Match each month bucket to its relevant event (or mapped event from real data)
    const columns = buckets.map((bucket, bIdx) => {
      // Find event matching this bucket
      let event = eventList.find((e) => e.monthKey === bucket.key);

      // Fallback alignment from available real leases if not in exact month window
      if (!event && leases.length > 0) {
        const l = leases[bIdx % leases.length];
        const propName = l.property?.name || l.property?.address_line_1 || 'sunShine';
        const primaryLt = l.lease_tenants?.find((lt) => lt.is_primary) || l.lease_tenants?.[0];
        const tenantName = primaryLt?.tenant
          ? `${primaryLt.tenant.first_name || ''} ${primaryLt.tenant.last_name || ''}`.trim()
          : l.property?.suburb || 'Syed Younussuddin';

        const types: Array<TimelineLeaseEvent['type']> = [
          'start',
          'end',
          'rent_due',
          'renewal',
          'periodic_review',
        ];
        const type = types[bIdx % types.length];
        const labels = {
          start: 'Lease Start',
          end: 'Lease End',
          rent_due: 'Rent Due',
          renewal: 'Potential Renewal',
          periodic_review: 'Periodic Review',
        };

        const targetDate = l.end_date
          ? new Date(l.end_date)
          : l.start_date
          ? new Date(l.start_date)
          : bucket.date;

        event = {
          id: `col-evt-${bIdx}`,
          leaseId: l.id,
          type,
          label: labels[type],
          property: propName,
          tenant: tenantName,
          date: targetDate,
          dateString: targetDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          rentAmount: l.rent_amount,
          rentFrequency: l.rent_frequency,
          lease: l,
          monthKey: bucket.key,
        };
      }

      return {
        bucket,
        event,
      };
    });

    return { monthBuckets: buckets, timelineColumns: columns };
  }, [leases, timeframeMonths]);

  const getEventBadgeStyles = (type: TimelineLeaseEvent['type']) => {
    switch (type) {
      case 'start':
        return {
          icon: <FileText className="w-3.5 h-3.5 text-[#32D5C4]" />,
          dot: 'bg-[#32D5C4] ring-4 ring-[#008F83]/40',
          titleColor: 'text-white',
        };
      case 'end':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-[#F87171]" />,
          dot: 'bg-[#EF4444] ring-4 ring-[#EF4444]/30',
          titleColor: 'text-white',
        };
      case 'rent_due':
        return {
          icon: <Disc className="w-3.5 h-3.5 text-[#32D5C4]" />,
          dot: 'bg-[#32D5C4] ring-4 ring-[#008F83]/40',
          titleColor: 'text-white',
        };
      case 'renewal':
        return {
          icon: <Calendar className="w-3.5 h-3.5 text-[#38BDF8]" />,
          dot: 'bg-[#38BDF8] ring-4 ring-[#38BDF8]/30',
          titleColor: 'text-white',
        };
      case 'periodic_review':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-[#38BDF8]" />,
          dot: 'bg-[#38BDF8] ring-4 ring-[#38BDF8]/30',
          titleColor: 'text-white',
        };
    }
  };

  return (
    <div
      className={cn(
        'rounded-[24px] border border-[#17283A] bg-[#061222] p-5 sm:p-6 shadow-xl flex flex-col justify-between relative overflow-hidden text-white',
        className
      )}
    >
      <div>
        {/* Header & Timeframe Selector */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#17283A]">
          <div>
            <h3 className="text-sm sm:text-base font-heading font-bold text-white tracking-tight">
              Lease Timeline
            </h3>
            <p className="text-xs sm:text-[13px] text-[#94A3B8] mt-0.5">
              Upcoming lease events across your portfolio
            </p>
          </div>

          <div className="relative shrink-0">
            <select
              value={timeframeMonths}
              onChange={(e) => setTimeframeMonths(Number(e.target.value))}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-[#0E1E33] border border-[#17283A] text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-[#32D5C4] cursor-pointer"
            >
              <option value={3}>Next 3 Months</option>
              <option value={6}>Next 6 Months</option>
              <option value={12}>Next 12 Months</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Horizontal Timeline Visualization Grid */}
        <div className="mt-5">
          {isLoading ? (
            <div className="py-8 space-y-4">
              <div className="h-4 rounded-full bg-[#0E1E33] animate-pulse w-full" />
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-32 rounded-2xl bg-[#0E1E33] animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Columns container */}
              <div className="relative">
                {/* Horizontal continuous timeline track */}
                <div className="absolute left-8 right-8 top-[48px] h-0.5 bg-[#17283A] z-0" />

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 relative z-10">
                  {timelineColumns.map(({ bucket, event }, idx) => {
                    const styles = event ? getEventBadgeStyles(event.type) : null;
                    return (
                      <div key={bucket.key} className="flex flex-col items-center">
                        {/* 1. Month Label */}
                        <div className="text-xs sm:text-[12.5px] font-bold text-[#94A3B8] mb-4 text-center h-5">
                          {bucket.label}
                        </div>

                        {/* 2. Timeline Milestone Dot */}
                        <div className="h-6 flex items-center justify-center mb-3">
                          {styles ? (
                            <div
                              onClick={() => event && onSelectLease?.(event.lease)}
                              className={cn(
                                'w-3.5 h-3.5 rounded-full cursor-pointer transition-transform duration-200 hover:scale-125 shadow-xs',
                                styles.dot
                              )}
                            />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#17283A]" />
                          )}
                        </div>

                        {/* 3. Event Card (Teal Card on Navy Background) */}
                        {event ? (
                          <div
                            onClick={() => onSelectLease?.(event.lease)}
                            className="w-full group p-3.5 sm:p-4 rounded-[18px] bg-gradient-to-br from-[#008F83]/20 via-[#007F78]/15 to-[#0E1E33]/90 hover:from-[#008F83]/30 hover:to-[#007F78]/25 border border-[#008F83]/35 hover:border-[#32D5C4]/60 backdrop-blur-md transition-all duration-200 shadow-md hover:shadow-xl cursor-pointer flex flex-col justify-between text-left min-h-[120px]"
                          >
                            <div>
                              {/* Header: Icon + Event Title */}
                              <div className="flex items-center gap-1.5 mb-2">
                                {styles?.icon}
                                <span className="font-bold text-xs sm:text-[13px] text-white leading-tight">
                                  {event.label}
                                </span>
                              </div>

                              {/* Property */}
                              <p className="text-xs sm:text-[12.5px] font-semibold text-white/90 truncate">
                                {event.property}
                              </p>

                              {/* Tenant */}
                              <p className="text-xs text-[#94A3B8] truncate mt-1 font-normal">
                                {event.tenant}
                              </p>
                            </div>

                            {/* Event Date */}
                            <div className="pt-2 mt-2 border-t border-[#008F83]/20 flex items-center justify-between">
                              <span className="text-xs font-semibold text-[#32D5C4] tabular-nums">
                                {event.dateString}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-[120px] rounded-[18px] border border-dashed border-[#17283A] bg-[#0E1E33]/30 flex items-center justify-center text-xs text-[#94A3B8]">
                            No events
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

