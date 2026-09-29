import { redirect } from 'next/navigation';

export default function ConditionReportsRedirectPage() {
  redirect('/dashboard/inspections');
}
