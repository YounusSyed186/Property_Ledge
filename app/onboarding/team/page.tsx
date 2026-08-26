import { redirect } from 'next/navigation';

export default function OnboardingTeamRedirect() {
  redirect('/dashboard/team');
}
