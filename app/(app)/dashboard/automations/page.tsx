import React from 'react';
import { AutomationList } from '@/components/automation/AutomationList';

export const metadata = {
  title: 'Automations | PropertyLedge',
  description: 'Generic workflow automation engine for invoices, emails, notifications, and tasks.',
};

export default function AutomationsPage() {
  return <AutomationList />;
}

