import {
  AutomationScheduleType,
  ScheduleConfig,
  MonthlyScheduleConfig,
  AfterStartScheduleConfig,
  LeaseDateScheduleConfig,
} from '../entities/automation';

export class ScheduleCalculator {
  /**
   * Calculates the next ISO execution timestamp for a given schedule configuration.
   */
  public static calculateNextRun(
    scheduleType: AutomationScheduleType,
    scheduleConfig: ScheduleConfig,
    leaseStartDate?: string | null,
    leaseEndDate?: string | null,
    referenceDate: Date = new Date()
  ): string | null {
    if (scheduleType === 'monthly') {
      const config = scheduleConfig as MonthlyScheduleConfig;
      const day = Math.min(Math.max(config.dayOfMonth || 1, 1), 28);
      const [hoursStr, minutesStr] = (config.timeOfDay || '09:00').split(':');
      const hours = parseInt(hoursStr, 10) || 9;
      const minutes = parseInt(minutesStr, 10) || 0;

      const next = new Date(referenceDate);
      next.setHours(hours, minutes, 0, 0);

      // Set to candidate day in current month
      next.setDate(day);

      // If current candidate is in the past, roll forward to next month
      if (next <= referenceDate) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(day);
      }

      return next.toISOString();
    }

    if (scheduleType === 'after_start') {
      const config = scheduleConfig as AfterStartScheduleConfig;
      if (!leaseStartDate) return null;

      const base = new Date(leaseStartDate);
      const offsetMonths = config.offsetMonths || 12;
      const [hoursStr, minutesStr] = (config.timeOfDay || '09:00').split(':');
      const hours = parseInt(hoursStr, 10) || 9;
      const minutes = parseInt(minutesStr, 10) || 0;

      base.setMonth(base.getMonth() + offsetMonths);
      base.setHours(hours, minutes, 0, 0);

      return base.toISOString();
    }

    if (scheduleType === 'lease_date') {
      const config = scheduleConfig as LeaseDateScheduleConfig;
      const anchorDateStr = config.anchor === 'end_date' ? leaseEndDate : leaseStartDate;
      if (!anchorDateStr) return null;

      const target = new Date(anchorDateStr);
      const [hoursStr, minutesStr] = (config.timeOfDay || '09:00').split(':');
      const hours = parseInt(hoursStr, 10) || 9;
      const minutes = parseInt(minutesStr, 10) || 0;

      const offsetDays = config.offsetDays || 0;
      const offsetMonths = config.offsetMonths || 0;
      const multiplier = config.position === 'before' ? -1 : 1;

      if (offsetMonths !== 0) {
        target.setMonth(target.getMonth() + offsetMonths * multiplier);
      }
      if (offsetDays !== 0) {
        target.setDate(target.getDate() + offsetDays * multiplier);
      }
      target.setHours(hours, minutes, 0, 0);

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
      const time = config.timeOfDay || '09:00';
      return `Every month on the ${day}${this.getOrdinalSuffix(day)} at ${time}`;
    }

    if (scheduleType === 'after_start') {
      const config = scheduleConfig as AfterStartScheduleConfig;
      const months = config.offsetMonths || 12;
      const time = config.timeOfDay || '09:00';
      return `${months} month${months > 1 ? 's' : ''} after lease start at ${time}`;
    }

    if (scheduleType === 'lease_date') {
      const config = scheduleConfig as LeaseDateScheduleConfig;
      const anchor = config.anchor === 'end_date' ? 'lease end' : 'lease start';
      const offsetDays = config.offsetDays || 0;
      const pos = config.position || 'before';
      return `${offsetDays} day${offsetDays > 1 ? 's' : ''} ${pos} ${anchor}`;
    }

    return 'Custom Schedule';
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
