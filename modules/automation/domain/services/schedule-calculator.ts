import {
  AutomationScheduleType,
  ScheduleConfig,
  MonthlyScheduleConfig,
  AfterStartScheduleConfig,
  LeaseDateScheduleConfig,
} from '../entities/automation';
import {
  createAuDate,
  getAuDateParts,
  DEFAULT_AU_TIMEZONE,
} from '@/lib/format/australian-time';

export class ScheduleCalculator {
  /**
   * Calculates the next ISO execution timestamp for a given schedule configuration.
   * Property Ledge operates on a daily central Vercel Cron evaluating due automations at 7:00 AM Australian Eastern Time (Sydney).
   */
  public static calculateNextRun(
    scheduleType: AutomationScheduleType,
    scheduleConfig: ScheduleConfig,
    leaseStartDate?: string | null,
    leaseEndDate?: string | null,
    referenceDate: Date = new Date()
  ): string | null {
    // Standard central morning execution hour in Australian Eastern Time (7:00 AM)
    const CRON_HOUR_AU = 7;
    const CRON_MINUTE_AU = 0;

    if (scheduleType === 'monthly') {
      const config = scheduleConfig as MonthlyScheduleConfig;
      const day = Math.min(Math.max(config.dayOfMonth || 1, 1), 28);

      const auNow = getAuDateParts(referenceDate, DEFAULT_AU_TIMEZONE);
      let candidateYear = auNow.year;
      let candidateMonth = auNow.month;

      let candidateDate = createAuDate(candidateYear, candidateMonth, day, CRON_HOUR_AU, CRON_MINUTE_AU, DEFAULT_AU_TIMEZONE);

      // If candidate is already in the past, advance to next month
      if (candidateDate.getTime() <= referenceDate.getTime()) {
        candidateMonth += 1;
        if (candidateMonth > 12) {
          candidateMonth = 1;
          candidateYear += 1;
        }
        candidateDate = createAuDate(candidateYear, candidateMonth, day, CRON_HOUR_AU, CRON_MINUTE_AU, DEFAULT_AU_TIMEZONE);
      }

      return candidateDate.toISOString();
    }

    if (scheduleType === 'after_start') {
      const config = scheduleConfig as AfterStartScheduleConfig;
      if (!leaseStartDate) return null;

      const startParts = getAuDateParts(new Date(leaseStartDate), DEFAULT_AU_TIMEZONE);
      const offsetMonths = config.offsetMonths || 12;

      let targetMonth = startParts.month + offsetMonths;
      let targetYear = startParts.year;
      while (targetMonth > 12) {
        targetMonth -= 12;
        targetYear += 1;
      }

      const targetDate = createAuDate(targetYear, targetMonth, startParts.day, CRON_HOUR_AU, CRON_MINUTE_AU, DEFAULT_AU_TIMEZONE);
      return targetDate.toISOString();
    }

    if (scheduleType === 'lease_date') {
      const config = scheduleConfig as LeaseDateScheduleConfig;
      const anchorDateStr = config.anchor === 'end_date' ? leaseEndDate : leaseStartDate;
      if (!anchorDateStr) return null;

      const anchor = new Date(anchorDateStr);
      const offsetDays = config.offsetDays || 0;
      const offsetMonths = config.offsetMonths || 0;
      const multiplier = config.position === 'before' ? -1 : 1;

      const anchorParts = getAuDateParts(anchor, DEFAULT_AU_TIMEZONE);
      let targetYear = anchorParts.year;
      let targetMonth = anchorParts.month + (offsetMonths * multiplier);
      let targetDay = anchorParts.day + (offsetDays * multiplier);

      while (targetMonth < 1) {
        targetMonth += 12;
        targetYear -= 1;
      }
      while (targetMonth > 12) {
        targetMonth -= 12;
        targetYear += 1;
      }

      const target = createAuDate(
        targetYear,
        targetMonth,
        Math.max(1, Math.min(28, targetDay)),
        CRON_HOUR_AU,
        CRON_MINUTE_AU,
        DEFAULT_AU_TIMEZONE
      );
      return target.toISOString();
    }

    return null;
  }

  /**
   * Formats a schedule configuration into human-readable text.
   */
  public static formatHumanSchedule(scheduleType: AutomationScheduleType, scheduleConfig: ScheduleConfig): string {
    if (scheduleType === 'monthly') {
      const config = scheduleConfig as MonthlyScheduleConfig;
      const day = config.dayOfMonth || 1;
      return `Monthly on the ${day}${this.getOrdinalSuffix(day)} (7:00 AM AU)`;
    }

    if (scheduleType === 'after_start') {
      const config = scheduleConfig as AfterStartScheduleConfig;
      const months = config.offsetMonths || 12;
      return `${months} month${months > 1 ? 's' : ''} after lease start (7:00 AM AU)`;
    }

    if (scheduleType === 'lease_date') {
      const config = scheduleConfig as LeaseDateScheduleConfig;
      const anchor = config.anchor === 'end_date' ? 'lease end' : 'lease start';
      const offsetDays = config.offsetDays || 0;
      const pos = config.position || 'before';
      return `${offsetDays} day${offsetDays > 1 ? 's' : ''} ${pos} ${anchor}`;
    }

    return 'Daily Morning Run (7:00 AM AU)';
  }

  private static getOrdinalSuffix(day: number): string {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }
}
