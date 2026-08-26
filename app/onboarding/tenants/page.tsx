import { redirect } from 'next/navigation';

export default function OnboardingTenantsRedirect() {
  redirect('/dashboard/people');
}
