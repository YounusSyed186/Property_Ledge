import { redirect } from 'next/navigation';

export default function OnboardingUnitsRedirect() {
  redirect('/dashboard/units');
}
