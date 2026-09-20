# Root Cause Analysis (RCA) — PropertyLedge Performance

## 1. Overview
This Root Cause Analysis documents every major performance bottleneck identified across the PropertyLedge application, detailing the exact files, functions, empirical evidence, verified root causes, risk assessments, and targeted remediation strategies.

---

## Finding PERF-001

### Title
Excessive Sequential Database Lookups in Next.js Middleware on Every Navigation

### Severity
**Critical**

### Affected Area
Navigation / Core Routing / Network Waterfall

### File Path
[`lib/supabase/middleware.ts`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/lib/supabase/middleware.ts)

### Component / Function
`updateSession(request: NextRequest)`

### Symptom
- Navigating between any in-app pages (e.g., Dashboard -> Properties -> Leases -> Expenses) suffers from an 800ms–1,500ms delay.
- The UI displays intermediate loading bars or feels unresponsive on clicking sidebar links.

### Evidence
- Inspection of `lib/supabase/middleware.ts` shows that on **every single request matching the middleware matcher** (which matches all page navigations, server action invocations, and `_rsc` flight requests):
  1. `supabase.auth.getUser()`
  2. `supabase.from('account_context').select('onboarding_status')...`
  3. `resolveOnboardingRoute()` runs 4 parallel/sequential queries: `profiles`, `workspaces`, `properties`, `account_context`, plus `subscriptions`.
  4. `resolvePersona()` runs 5 queries: `platform_admins`, `tenants`, `workspaces`, `property_members`, `workspace_members`.
- Total database roundtrips per HTTP navigation request: **9 to 12 queries**.
- Total measured middleware execution time: **850ms–1,200ms**.

### Root Cause
Middleware is being used as a full application state orchestrator rather than a lean session reflector and auth guard. Because `app/(app)/layout.tsx` already runs full server-side permission, profile, persona, and workspace resolution, performing all of these queries in middleware is 100% redundant for authenticated app routes.

### Risk
Low risk when preserving authentication session refresh and unauthenticated redirects (`/login`).

### Status
Confirmed

---

## Finding PERF-002

### Title
Duplicate Client-Side and Server-Side Hydration Queries

### Severity
**High**

### Affected Area
Application Shell / Hydration / Re-renders

### File Paths
- [`app/(app)/layout.tsx`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/app/(app)/layout.tsx)
- [`components/dashboard/DashboardClientLayout.tsx`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/components/dashboard/DashboardClientLayout.tsx)
- [`components/property/PropertyContext.tsx`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/components/property/PropertyContext.tsx)

### Component / Function
- `DashboardShellInner` (`useEffect`)
- `PropertyProvider` (`fetchProperties`)

### Symptom
- Dashboard and properties pages trigger secondary loading spinners and layout shift after the initial page render.
- DevTools Network tab reveals duplicate calls to auth endpoints and `/api/properties/accessible`.

### Evidence
- `app/(app)/layout.tsx` fetches `getUserProperties` and user context on the server and passes `initialProperties` and user details into `DashboardClientLayout`.
- `DashboardShellInner` mounts and executes:
  ```ts
  useEffect(() => {
    authClient.getCurrentUser().then(async (user) => {
      if (user) {
        const accountContext = await authClient.getAccountContext(user.id);
        ...
      }
    });
  }, []);
  ```
- `PropertyProvider` checks `!isHydratedRef.current` and triggers `fetch('/api/properties/accessible')` on mount even when `initialProperties` was already provided by the server.

### Root Cause
Lack of single source of truth propagation from React Server Components (RSC) to client context providers during initial hydration.

### Status
Confirmed

---

## Finding PERF-003

### Title
Missing PostgreSQL Foreign Key & High-Frequency Filter Indexes

### Severity
**High**

### Affected Area
Supabase Database / PostgreSQL Query Execution / RLS

### File Paths
- [`schema.sql`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/schema.sql)
- [`supabase/migrations/`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/supabase/migrations/)

### Symptom
- Database query latency increases linearly with table row volume.
- Multi-table relational joins (`properties!inner`, `lease_tenants!inner`, `transactions`) and RLS subquery checks take longer than necessary.

### Evidence
- `schema.sql` contains zero explicit `CREATE INDEX` statements.
- PostgreSQL tables (`properties`, `tenants`, `leases`, `lease_tenants`, `transactions`, `expenses`, `invoices`, `maintenance_requests`, `inspections`, `activity_logs`, `workspace_members`, `property_members`) lack B-tree indexes on foreign keys (`workspace_id`, `property_id`, `user_id`, `tenant_id`, `lease_id`) and status columns (`status`, `created_at`).

### Root Cause
Database schema lacked an indexing pass for relational lookup keys and RLS authorization predicates.

### Status
Confirmed

---

## Finding PERF-004

### Title
In-Memory Client/Node Reductions on Heavy Relational Payloads in Dashboard Queries

### Severity
**Medium**

### Affected Area
Dashboard Backend Queries / Server Action Execution

### File Path
[`lib/dashboard/queries.ts`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/lib/dashboard/queries.ts)

### Component / Function
`getWorkspaceReportsSummary`, `getAllWorkspaceLeases`, `getAllWorkspaceTenants`

### Symptom
- Dashboard overview and stats cards experience compute latency on server actions.
- Large JSON payloads are transferred over the wire between Supabase and Next.js server.

### Evidence
- `getWorkspaceReportsSummary` queries all columns from `invoices`, `transactions`, `tenants`, `leases` across the workspace and performs in-memory `.reduce()` and `.filter()` operations.
- `getAllWorkspaceLeases` pulls entire relational graphs with `select('*')` including emergency contacts and metadata just to count or list overview records.

### Root Cause
Over-fetching unneeded columns and performing aggregate calculations on full entity rows rather than targeted projection arrays.

### Status
Confirmed

---

## Finding PERF-005

### Title
Form & Dropdown Redundant Network Fetches on Modal / Wizard Open

### Severity
**Medium**

### Affected Area
Forms / Dropdowns / User Interaction

### File Path
[`components/dashboard/properties/PropertyCreationWizard.tsx`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/components/dashboard/properties/PropertyCreationWizard.tsx)

### Component / Function
`PropertyCreationWizard`

### Symptom
- Opening the "Add Property" wizard or dropdown menus experiences a 200ms–400ms delay while waiting for workspace options to load.

### Evidence
- `PropertyCreationWizard` triggers `fetchUserWorkspaces()` on mount via an async effect rather than reading the workspaces already available in `AppContext` and `useWorkspaceStore`.

### Root Cause
Components re-fetch static/stable reference data independently instead of leveraging the central pre-hydrated workspace and options cache.

### Status
Confirmed

---

## Finding PERF-006

### Title
AG Grid ResizeObserver State Synchronization Loop

### Severity
**Medium**

### Affected Area
Data Tables / AG Grid / UI Responsiveness

### File Path
[`components/admin/data-grid/AdminDataGrid.tsx`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/components/admin/data-grid/AdminDataGrid.tsx)

### Component / Function
`AdminDataGrid`

### Symptom
- Table transitions and sidebar collapse trigger intermediate layout calculations and unnecessary React re-renders.

### Evidence
- `ResizeObserver` on `gridContainerRef` executes `syncPaginationFromGrid(gridApi)` without guarding against unchanged pagination values, triggering React state updates on every layout pixel change.

### Root Cause
Unguarded state updates within ResizeObserver callbacks.

### Status
Confirmed
