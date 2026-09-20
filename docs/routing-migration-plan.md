# PropertyLedge — Routing Migration & Backward Compatibility Plan

**Author:** Senior Next.js 15 Architect, Supabase Security Engineer, Full-Stack Performance Specialist  
**Date:** September 20, 2026  
**Status:** Approved Migration Plan

---

## 1. Objectives

This plan governs the transition from legacy, aliased, or ambiguous URLs to the canonical PropertyLedge route architecture, ensuring:
- Zero broken bookmarks or external links.
- Direct 1-hop redirects without chained latency (`/a` -> `/b`, never `/a` -> `/b` -> `/c`).
- Safe query parameter preservation (`?propertyId=...`, `?status=...`).
- Zero cross-workspace data bleed.

---

## 2. Legacy Route & Alias Mapping Matrix

| Legacy / Alias Route | Canonical Route | Redirect Type | Query Parameter Handling | Compatibility Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/dashboard/tenants` | `/dashboard/people` | Next.js Server Redirect (308) | Preserve `?propertyId=...` & filters | Active Alias | Unified resident & tenant directory |
| `/dashboard/tenants/[id]` | `/dashboard/people/[id]` | Next.js Server Redirect (308) | Preserve all params | Active Alias | Single resident detail view |
| `/dashboard/payments` | `/dashboard/money` | Next.js Server Redirect (308) | Preserve `?type=...` & `?propertyId=...` | Active Alias | Ledger transactions & payments |
| `/dashboard/financials` | `/dashboard/money` | Next.js Server Redirect (308) | Preserve all params | Backward Compatibility | Redirect to financial ledger |
| `/dashboard/overview` | `/dashboard` | Next.js Server Redirect (308) | Preserve all params | Backward Compatibility | Portfolio overview |
| `/settings` | `/dashboard/settings` | Server Action / Middleware Redirect | Preserve `?tab=...` | Backward Compatibility | Workspace settings |
| `/team` | `/dashboard/team` | Server Action / Middleware Redirect | Preserve all params | Backward Compatibility | Team seats & members |

---

## 3. Migration Implementation Strategy

### 3.1 Next.js Configuration Redirects ([`next.config.ts`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/next.config.ts))
Direct rewrite/redirect rules in `next.config.ts` ensure incoming requests from old links or bookmarks are redirected at the edge before hitting layout rendering:

```typescript
// next.config.ts
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard/tenants',
        destination: '/dashboard/people',
        permanent: true,
      },
      {
        source: '/dashboard/tenants/:path*',
        destination: '/dashboard/people/:path*',
        permanent: true,
      },
      {
        source: '/dashboard/payments',
        destination: '/dashboard/money',
        permanent: true,
      },
      {
        source: '/dashboard/payments/:path*',
        destination: '/dashboard/money/:path*',
        permanent: true,
      },
      {
        source: '/dashboard/financials',
        destination: '/dashboard/money',
        permanent: true,
      },
      {
        source: '/dashboard/overview',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
};
```

---

## 4. Rollback & Fail-Safe Strategy

1. **Atomic Configurations**: All route alias rules are declarative in `next.config.ts` and `lib/routing/resolveUserDestination.ts`.
2. **Instant Reversion**: If any legacy consumer requires the old route directly, the redirect can be switched from a 308 permanent redirect to an internal page rewrite with 0 downtime.
3. **No Database Alterations Required**: The routing migration requires zero PostgreSQL DDL changes, ensuring immediate rollback capability via Git.
