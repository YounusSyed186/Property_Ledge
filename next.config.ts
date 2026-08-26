import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      { source: '/admin/organizations', destination: '/admin/workspaces', permanent: false },
      { source: '/admin/organizations/:path*', destination: '/admin/workspaces/:path*', permanent: false },
      { source: '/dashboard/tenants', destination: '/dashboard/people', permanent: false },
      { source: '/dashboard/tenants/:path*', destination: '/dashboard/people/:path*', permanent: false },
      { source: '/dashboard/invoices', destination: '/dashboard/money?tab=invoices', permanent: false },
      { source: '/dashboard/payments', destination: '/dashboard/money?tab=payments', permanent: false },
      { source: '/dashboard/expenses', destination: '/dashboard/money?tab=expenses', permanent: false },
      { source: '/onboarding/profile', destination: '/onboarding/workspace', permanent: false },
      { source: '/onboarding/units', destination: '/dashboard/units', permanent: false },
      { source: '/onboarding/tenants', destination: '/dashboard/people', permanent: false },
      { source: '/onboarding/leases', destination: '/dashboard/leases', permanent: false },
      { source: '/onboarding/team', destination: '/dashboard/team', permanent: false },
    ];
  },
};

export default nextConfig;
