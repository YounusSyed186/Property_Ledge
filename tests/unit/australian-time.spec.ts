import { test, expect } from '@playwright/test';
import {
  getAuDateParts,
  createAuDate,
  getAuTodayString,
  getAuMonthBillingPeriod,
  formatAuDisplayDate,
  formatAuDisplayDateTime,
  DEFAULT_AU_TIMEZONE,
} from '../../lib/format/australian-time';
import { ScheduleCalculator } from '../../modules/automation/domain/services/schedule-calculator';

test.describe('Australian Time & Date Utility Suite', () => {
  test('accurately parses date parts in Australia/Sydney timezone', () => {
    // 2026-10-01 00:00:00 UTC is 2026-10-01 10:00:00 (or 11:00 with DST) in Sydney
    const utcDate = new Date('2026-10-01T00:00:00Z');
    const parts = getAuDateParts(utcDate, DEFAULT_AU_TIMEZONE);
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(10);
    expect(parts.day).toBe(1);
    expect(parts.hour).toBeGreaterThanOrEqual(10);
  });

  test('creates correct UTC date for Australian local schedule times', () => {
    const auDate = createAuDate(2026, 10, 1, 9, 0, DEFAULT_AU_TIMEZONE);
    const parts = getAuDateParts(auDate, DEFAULT_AU_TIMEZONE);
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(10);
    expect(parts.day).toBe(1);
    expect(parts.hour).toBe(9);
    expect(parts.minute).toBe(0);
  });

  test('formats Australian display dates correctly', () => {
    const date = new Date('2026-10-01T00:00:00Z');
    const formattedMedium = formatAuDisplayDate(date, 'medium', DEFAULT_AU_TIMEZONE);
    expect(formattedMedium).toContain('2026');
    expect(formattedMedium).toContain('Oct');

    const formattedShort = formatAuDisplayDate(date, 'short', DEFAULT_AU_TIMEZONE);
    expect(formattedShort).toBe('01/10/2026');
  });

  test('ScheduleCalculator computes next monthly run at 7:00 AM Australian Time', () => {
    const refDate = new Date('2026-09-10T00:00:00Z');
    const nextRun = ScheduleCalculator.calculateNextRun(
      'monthly',
      { dayOfMonth: 1 },
      undefined,
      undefined,
      refDate
    );

    expect(nextRun).not.toBeNull();
    const parts = getAuDateParts(new Date(nextRun!), DEFAULT_AU_TIMEZONE);
    expect(parts.day).toBe(1);
    expect(parts.month).toBe(10);
    expect(parts.hour).toBe(7);
    expect(parts.minute).toBe(0);
  });
});
