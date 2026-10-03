# PropertyLedge CRUD and User Journey Audit

**Date:** 2026-10-03  
**Status:** Partial audit; live database and authenticated browser verification remain outstanding.

## Executive Summary

The active Next.js application contains 90 page routes, 8 API routes, 20 server-action modules, 9 application services, and 12 current Supabase migrations. The repository has 274 unit tests and 25 E2E specs. This pass traced and fixed high-risk property, automation, and financial workspace boundaries, and ran the full unit suite, application typecheck, and targeted lint.

This is not a complete production CRUD sign-off. No Supabase environment variables or E2E account configuration were available, so database writes, deployed RLS behavior, multi-user isolation, file storage, email delivery, and authenticated E2E journeys could not be exercised. The local browser verified the public landing page and that an unauthenticated request for `/dashboard/properties` redirects to login.

## Feature Coverage

| Feature | Create | Read | Update | Delete/archive | Validation/RBAC/data | Status |
|---|---|---|---|---|---|---|
| Properties | Source traced; UI wizard and drawer exist | List, detail, and archived filter traced | Source traced; immutable scope fields now stripped | UI removal now archives | Existing service lifecycle unit test; update-security regression added; no DB run | Partially verified; fix applied |
| Transactions and expenses | Source traced; property/workspace consistency enforced | Workspace filters and ID reads bound to active context | ID updates bound to active context | ID deletes bound to active context; service-role fallback removed | Finance domain suite and workspace-mismatch regression pass | Partially verified; fixes applied |
| Automations and execution history | Source traced; permission required | View permission enforced | Update permission enforced | Update permission enforced | Lease/template workspace references checked; RLS migration added | Source/typecheck verified; migration not applied here |
| BAS and financial reporting | Existing calculation/export code and tests | `propertyId = null` aggregation covered by unit tests | Transaction edit path traced | Transaction delete path traced | Calculation tests pass; no persisted-data reconciliation run | Unit-level only |
| Leases, tenants, invoices | Routes, actions, and services discovered | Route and relationship surfaces identified | Not exhaustively traced | Not exhaustively traced | Existing unit/E2E specs found; no authenticated run | Not audited end-to-end |
| Documents, receipts, inspections, condition reports | Upload/create surfaces discovered | Read/download surfaces discovered | Metadata/update surfaces discovered | Delete surfaces discovered | Validation/unit specs exist; no Blob or database run | Not audited end-to-end |
| Maintenance, tasks, schedules | Routes and action surfaces discovered | Not exhaustively traced | Not exhaustively traced | Not exhaustively traced | No live state-transition checks | Not audited end-to-end |
| Team, roles, permissions, workspace settings | Routes and server actions discovered | Permission/navigation tests run | RBAC navigation regression added for automations | Role paths not exhaustively traced | No multi-user role matrix or RLS execution test | Partially source-reviewed |
| Auth, onboarding, tenant portal, admin, billing | Routes discovered | Unauthenticated dashboard redirect verified in browser | Not exhaustively traced | Not exhaustively traced | E2E credentials/config absent | Not audited end-to-end |

## Critical Bugs and Fixes

### Property removal destroyed history

**Reproduction:** From the property drawer, confirm Delete Property.  
**Expected:** Preserve financial and tenancy history under the supported archive lifecycle.  
**Actual:** The active server helper deleted leases, tenants, invoices, transactions, maintenance, documents, tasks, and memberships before deleting the property.  
**Root cause:** The dashboard action called the hard-delete helper despite an existing archive/restore model and archived list filter.  
**Fix applied:** The active removal action now archives the property, records an `archived` activity event, and invalidates user/workspace caches. The confirmation and success messages describe archive behavior.  
**Verification:** Existing property archive/restore unit test passes; no live database journey was possible.

### Property updates accepted ownership and workspace changes

**Reproduction:** Invoke the property update server action with a valid property ID and forged `workspace_id` or `owner_id`.  
**Expected:** A property edit must not transfer ownership or workspace scope.  
**Actual:** The service-role update spread caller input after authorizing only access to the original property.  
**Root cause:** Mutable fields were not separated from database identity and scope fields.  
**Fix applied:** `id`, `workspace_id`, `owner_id`, `created_at`, and `updated_at` are removed at the persistence boundary.  
**Verification:** New regression test passes; typecheck passes.

### Automation server actions bypassed feature permission checks

**Reproduction:** Call automation server actions directly as a workspace member without settings permissions.  
**Expected:** Automation reads require workspace settings view permission; mutations require settings update permission.  
**Actual:** Actions checked login/workspace context, then used a service-role client; RLS policies granted CRUD to every workspace member. Lease and template IDs were not consistently workspace-bound.  
**Root cause:** UI navigation permissions and database membership policies were not enforced by the privileged action path.  
**Fix applied:** Added permission checks, workspace-scoped lease and invoice-template resolution, removed an unscoped lease fallback, aligned navigation metadata, and added `20261003000000_automation_workspace_permissions.sql` to restrict RLS reads/writes.  
**Verification:** Navigation RBAC regression and typecheck pass. The migration must be applied and tested against Supabase before claiming database enforcement.

### Financial records could have inconsistent workspace/property scope

**Reproduction:** As a user who belongs to two workspaces, submit a transaction with a property from one workspace and a caller-supplied workspace ID for the other.  
**Expected:** The record's workspace must be derived from the selected property and match the active server workspace.  
**Actual:** Income and expense creation trusted caller-provided `workspace_id`; RLS checked access to workspace and property independently. Batch allocations also trusted lease/property pairs.  
**Fix applied:** Create actions now use the active server workspace; both services resolve the property's workspace and reject mismatches; batch allocations validate lease/property/workspace consistency. Financial list filters and record-ID actions are bound to active context. RLS-denied expense reads/deletes no longer retry with service-role access.  
**Verification:** Financial domain regression and full unit suite pass; no multi-workspace database test was available.

## CRUD and Journey Gaps

- The full Property Owner journey (property → tenant → lease → invoice/transaction → BAS) has not been executed against persisted data.
- Invoice numbering/concurrency, lease/tenant relationship integrity, maintenance state transitions, inspection attachments, document Blob lifecycle, automation execution/idempotency, and team invitation acceptance remain unverified end-to-end.
- Search, filtering, sorting, pagination, refresh behavior, modal keyboard behavior, network failures, stale concurrent edits, and property switching have not been systematically exercised across every grid/form.
- RLS policies have been inspected selectively, not exhaustively enumerated or executed under multiple roles.
- The automation RLS migration is new and has not been applied to a local or hosted Supabase instance.

## Verification Results

- `pnpm run test:unit`: **274 passed**.
- `pnpm run typecheck`: **passed**.
- ESLint on all changed TypeScript files: **passed**.
- Full `pnpm run lint`: **failed** with 27 errors and 83 warnings across the repository; examples include existing restricted infrastructure imports in application modules and `prefer-const` / `require()` violations. The focused lint of changed files passes.
- Authenticated `pnpm run test:e2e`: **not run**. No Supabase/test-account environment was configured; default E2E credentials are placeholders.
- Browser: public landing page rendered; unauthenticated `/dashboard/properties` redirected to `/login?redirectTo=%2Fdashboard%2Fproperties`.

## Recommended Next Steps

### P0 — Security and data integrity

- Apply the automation permission migration to the target Supabase project and verify the resulting policies with unauthorized and authorized roles.
- Add database-backed tests for workspace/property mismatches, property archive retention, and direct server-action authorization.

### P1 — Complete core journeys

- Configure a disposable local Supabase project and test accounts, then run property, finance, BAS, lease/tenant/invoice, team/RBAC, and document/receipt E2E workflows with database assertions and cleanup.
- Audit remaining service-role mutations in invoices, workspace administration, documents, and onboarding for active-workspace binding and permission enforcement.

### P2 — UX and reliability

- Run the full table/form matrix for search, filtering, sorting, pagination, reload, loading, validation, duplicate submission, modal keyboard behavior, and error recovery.
- Add two-tab stale-write tests and verify cache refresh after workspace/property changes.

### P3 — Repository quality

- Resolve the repository-wide lint errors and warnings in a separate scoped cleanup; they are outside the fixes in this audit.