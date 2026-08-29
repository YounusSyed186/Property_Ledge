'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewPropertyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/properties?new=true');
  }, [router]);

  return (
    <div className="flex items-center justify-center p-12 text-slate-500">
      Loading property creation...
    </div>
  );
}
