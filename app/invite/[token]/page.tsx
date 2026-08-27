import { redirect } from 'next/navigation';

interface InviteRedirectProps {
  params: Promise<{ token: string }>;
}

export default async function InviteRedirectPage({ params }: InviteRedirectProps) {
  const { token } = await params;
  redirect(`/join/${token}`);
}
