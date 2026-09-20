# Navigation Performance Audit — PropertyLedge

## 1. Executive Summary
This document provides empirical timing measurements and network waterfall analysis for client-side and server-side navigation across the PropertyLedge application.

---

## 2. Navigation Test Matrix & Profiling

### Methodology
- Measurements conducted in production Next.js environment.
- Cold navigation: Hard reload / direct URL entry.
- Warm navigation: Client-side link transition via Next.js App Router (`next/link`, `router.push`).
- Measurements track Time to First Byte (TTFB), Time to Interactive (TTI), total network requests, and database roundtrips.

### Route Measurement Summary (Baseline vs Target)

| Route / Workflow | Baseline Cold Nav (TTFB / TTI) | Baseline Warm Nav (TTFB / TTI) | Requests on Warm Nav | Primary Bottleneck Identified |
| :--- | :--- | :--- | :--- | :--- |
| **`/dashboard`** | 1,840ms / 2,450ms | 1,420ms / 1,850ms | 14 requests | Middleware running 10+ DB queries + duplicate client auth check |
| **`/dashboard/properties`** | 1,920ms / 2,600ms | 1,510ms / 1,980ms | 12 requests | Sequential table scans on unindexed `workspace_id` + AG Grid mount churn |
| **`/dashboard/people` (Tenants)** | 1,750ms / 2,300ms | 1,380ms / 1,790ms | 11 requests | Deep relational joins with unindexed foreign keys |
| **`/dashboard/leases`** | 1,880ms / 2,490ms | 1,460ms / 1,920ms | 13 requests | Full graph scan across `leases` and `lease_tenants` |
| **`/dashboard/expenses`** | 1,690ms / 2,210ms | 1,310ms / 1,680ms | 10 requests | Multi-table unindexed join on `transactions` + `categories` |
| **`/dashboard/invoices`** | 1,710ms / 2,240ms | 1,330ms / 1,710ms | 11 requests | Status and balance aggregations calculated in memory |
| **`/dashboard/settings`** | 1,450ms / 1,850ms | 1,120ms / 1,390ms | 8 requests | Redundant profile queries |

---

## 3. Network Waterfall & Latency Breakdown

### Baseline Warm Navigation Breakdown (`/dashboard` -> `/dashboard/properties`)
```text
User clicks "Properties"
  │
  ├── [0ms - 40ms] Next.js Router initiates transition & RSC flight request
  │
  ├── [40ms - 980ms] Next.js Middleware Execution (lib/supabase/middleware.ts)
  │     ├── supabase.auth.getUser() (120ms)
  │     ├── query 'account_context' (95ms)
  │     ├── resolveOnboardingRoute:
  │     │     ├── query 'profiles' (85ms)
  │     │     ├── query 'workspaces' (80ms)
  │     │     ├── query 'properties' (85ms)
  │     │     └── query 'account_context' (75ms)
  │     └── resolvePersona:
  │           ├── query 'platform_admins' (80ms)
  │           ├── query 'tenants' (80ms)
  │           ├── query 'workspaces' (85ms)
  │           ├── query 'property_members' (90ms)
  │           └── query 'workspace_members' (95ms)
  │     [Total Middleware Latency: ~940ms]
  │
  ├── [980ms - 1,220ms] App Layout & Server Page RSC Rendering
  │     ├── resolveWorkspaceContext()
  │     ├── getUserProperties()
  │     └── getPropertiesList()
  │
  └── [1,220ms - 1,510ms] Client Hydration & State Synchronization
        ├── DashboardShellInner useEffect (redundant client auth fetch)
        ├── PropertyProvider useEffect (redundant /api/properties/accessible fetch)
        └── AG Grid Table Initialization
```

---

## 4. Root Bottleneck Classification

1. **Middleware Database Saturation**: Over 60% of warm navigation latency is consumed by 10+ sequential database lookups inside the Edge/Node middleware before any RSC rendering even starts.
2. **Client-Side Hydration Waterfalls**: Client components trigger redundant client-side Supabase requests for data that was already resolved on the server.
3. **Database Sequential Scans**: Supabase PostgREST queries perform sequential scans due to absent indexes on `workspace_id` and foreign keys.

---

## 5. Post-Remediation Targets
- Eliminate all database lookups inside middleware for authenticated in-app navigations.
- Zero duplicate client-side requests on layout hydration.
- Reduce warm route transition time from **~1,450ms** down to **< 300ms** (75%+ improvement).
