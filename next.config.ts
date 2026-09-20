import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@playwright/test', 'playwright', 'playwright-core', 'pdf-lib'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      { source: '/admin/organizations', destination: '/admin', permanent: false },
      { source: '/admin/organizations/:path*', destination: '/admin', permanent: false },
      { source: '/admin/workspaces', destination: '/admin', permanent: false },
      { source: '/admin/workspaces/:path*', destination: '/admin', permanent: false },
      { source: '/admin/properties', destination: '/admin', permanent: false },
      { source: '/admin/properties/:path*', destination: '/admin', permanent: false },
      { source: '/dashboard/tenants', destination: '/dashboard/people', permanent: false },
      { source: '/dashboard/tenants/:path*', destination: '/dashboard/people/:path*', permanent: false },
      { source: '/dashboard/payments', destination: '/dashboard/money?tab=payments', permanent: false },
      { source: '/dashboard/payments/:path*', destination: '/dashboard/money/:path*', permanent: false },
      { source: '/dashboard/financials', destination: '/dashboard/money', permanent: false },
      { source: '/dashboard/overview', destination: '/dashboard', permanent: false },

      { source: '/onboarding/profile', destination: '/onboarding/workspace', permanent: false },
      { source: '/onboarding/units', destination: '/dashboard/units', permanent: false },
      { source: '/onboarding/tenants', destination: '/dashboard/people', permanent: false },
      { source: '/onboarding/leases', destination: '/dashboard/leases', permanent: false },
      { source: '/onboarding/team', destination: '/dashboard/team', permanent: false },
      { source: '/leases', destination: '/dashboard/leases', permanent: false },
      { source: '/leases/:path*', destination: '/dashboard/leases/:path*', permanent: false },
      { source: '/properties', destination: '/dashboard/properties', permanent: false },
      { source: '/properties/:path*', destination: '/dashboard/properties/:path*', permanent: false },
      { source: '/expenses', destination: '/dashboard/expenses', permanent: false },
      { source: '/expenses/:path*', destination: '/dashboard/expenses/:path*', permanent: false },
      { source: '/settings', destination: '/dashboard/settings', permanent: false },
      { source: '/team', destination: '/dashboard/team', permanent: false },
    ];
  },
};

export default nextConfig;
