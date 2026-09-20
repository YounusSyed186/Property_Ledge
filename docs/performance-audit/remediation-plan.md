# Prioritized Remediation Plan — PropertyLedge

## 1. Overview
This remediation plan outlines the exact changes, prioritization, effort, risk, and verification criteria for resolving each performance bottleneck identified in the PropertyLedge application.

---

## 2. Prioritized Action Matrix

| Priority | Finding ID | Area | Root Cause | Targeted Fix | Effort | Risk | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P0** | **PERF-001** | Navigation / Middleware | 9–12 database roundtrips per navigation in `middleware.ts` | Streamline middleware to perform fast session verification (`auth.getUser()`) and route protection; eliminate redundant multi-table queries | Low | Low | Playwright routing unit tests (`tests/unit/routing.spec.ts`) + manual route navigation |
| **P1** | **PERF-003** | Database / RLS | Zero foreign key / filter indexes in PostgreSQL schema | Add migration `20260920000000_performance_indexes.sql` with B-tree indexes on `workspace_id`, `property_id`, `user_id`, `status` across tables | Medium | Low | Database migration syntax + typecheck |
| **P1** | **PERF-002** | App Shell / Hydration | Duplicate client fetches in `DashboardShellInner` and `PropertyProvider` | Pass resolved server state directly from `app/(app)/layout.tsx` to `DashboardClientLayout`; prevent unnecessary client `/api/properties/accessible` fetch | Low | Low | Dashboard mount verification |
| **P2** | **PERF-004** | Dashboard Queries | In-memory reductions on large `select('*')` query payloads | Narrow PostgREST column selections and optimize aggregations in `lib/dashboard/queries.ts` | Low | Low | Dashboard overview rendering + TypeScript verification |
| **P2** | **PERF-005** | Forms & Dropdowns | Redundant mount queries in `PropertyCreationWizard` | Use workspace context and pre-warmed options from `useWorkspaceStore` and `optionsCache` | Low | Low | Property Creation Wizard open & submit test |
| **P3** | **PERF-006** | AG Grid Data Tables | ResizeObserver pagination update loop | Guard `syncPaginationFromGrid` in `AdminDataGrid.tsx` against redundant state updates | Low | Low | Data grid interaction and resize test |

---

## 3. Implementation Phasing

### Phase 1 — Middleware & Routing Optimization
- Update [`lib/supabase/middleware.ts`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/lib/supabase/middleware.ts).
- Ensure unauthenticated redirects to `/login` are maintained.
- Ensure pending invitation tokens (`/join/[token]`) and plan params are preserved.
- Ensure route transitions do not block on multi-table database lookups.

### Phase 2 — Database Indexes
- Create [`supabase/migrations/20260920000000_performance_indexes.sql`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/supabase/migrations/20260920000000_performance_indexes.sql).
- Index foreign keys and search filters across:
  - `properties (workspace_id, owner_id, status, created_at)`
  - `tenants (property_id, status, last_name, user_id)`
  - `leases (property_id, status, start_date, end_date)`
  - `lease_tenants (lease_id, tenant_id, is_primary)`
  - `transactions (property_id, workspace_id, transaction_type, status, transaction_date)`
  - `expenses (property_id, workspace_id, status, expense_date)`
  - `invoices (property_id, status, due_date, tenant_id)`
  - `maintenance_requests (property_id, status, priority, created_at)`
  - `activity_logs (workspace_id, property_id, created_at)`
  - `workspace_members (workspace_id, user_id, status)`
  - `property_members (property_id, user_id, status)`

### Phase 3 — App Shell & Hydration
- Optimize [`app/(app)/layout.tsx`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/app/(app)/layout.tsx) and [`components/dashboard/DashboardClientLayout.tsx`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/components/dashboard/DashboardClientLayout.tsx).
- Fix redundant property hydration in [`components/property/PropertyContext.tsx`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/components/property/PropertyContext.tsx).

### Phase 4 — Forms & Grid Polishing
- Update [`components/dashboard/properties/PropertyCreationWizard.tsx`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/components/dashboard/properties/PropertyCreationWizard.tsx).
- Optimize [`components/admin/data-grid/AdminDataGrid.tsx`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/components/admin/data-grid/AdminDataGrid.tsx).
