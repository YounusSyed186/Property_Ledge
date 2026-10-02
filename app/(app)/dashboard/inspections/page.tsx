import { redirect } from 'next/navigation';

export default function InspectionsRedirectPage() {
  redirect('/dashboard/condition-reports');
}
