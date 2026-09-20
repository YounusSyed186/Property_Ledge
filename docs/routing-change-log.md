# PropertyLedge — Routing Architecture Change Log

**Author:** Senior Next.js 15 Architect, Supabase Security Engineer, Full-Stack Performance Specialist  
**Date:** September 20, 2026  
**Status:** Executed & Verified

---

## 1. Summary of Changes

This log documents all source code and configuration files modified or created during the routing architecture audit, standardization, and hardening.

---

## 2. Modified & Created Files

### 1. [`next.config.ts`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/next.config.ts)
- **Type of Change**: Configuration Update
- **Description**: Added declarative 1-hop redirects for all legacy shortcuts and aliases:
  - `/dashboard/tenants` -> `/dashboard/people`
  - `/dashboard/payments` -> `/dashboard/money`
  - `/dashboard/financials` -> `/dashboard/money`
  - `/dashboard/overview` -> `/dashboard`
  - `/properties` -> `/dashboard/properties`
  - `/expenses` -> `/dashboard/expenses`
  - `/settings` -> `/dashboard/settings`
  - `/team` -> `/dashboard/team`
- **Security Impact**: Neutral / Hardened (eliminates ambiguous routing endpoints).
- **Performance Impact**: Direct edge-level redirects without Next.js layout waterfalls.
- **Migration Impact**: 100% backward compatibility for existing bookmarks and email links.

---

### 2. [`lib/routing/navigation.ts`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/lib/routing/navigation.ts)
- **Type of Change**: New TypeScript Module
- **Description**: Created a centralized, typed navigation registry `CANONICAL_ROUTES` defining route paths, group hierarchies, required RBAC permissions, exact-match flags, and property filter capability.
- **Security Impact**: Ensures client navigation visibility strictly matches server-side RBAC permissions (`workspace.view`, `tenant.view`, `financial.view`, `property.view`, etc.).
- **Performance Impact**: Replaces ad-hoc route string parsing with single-pass memory lookups.
- **Migration Impact**: Standardizes internal navigation links across all components.

---

### 3. [`components/admin/data-grid/AdminDataGrid.tsx`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/components/admin/data-grid/AdminDataGrid.tsx) & [`AdminDataGridToolbar.tsx`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/components/admin/data-grid/AdminDataGridToolbar.tsx) & [`QuickFilterBar.tsx`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/components/admin/data-grid/filters/QuickFilterBar.tsx)
- **Type of Change**: UI / Performance Enhancement
- **Description**: Moved the table loading indicator from an intrusive center-table overlay to a non-blocking indicator on the left toolbar and active filter tab.
- **Security Impact**: None.
- **Performance Impact**: Prevents visual layout jarring and allows users to read table records while updates happen asynchronously.
- **Migration Impact**: Consistent across all list views (`/dashboard/expenses`, `/dashboard/people`, `/dashboard/properties`, `/dashboard/money`, etc.).

---

### 4. [`supabase/migrations/20260920000000_performance_indexes.sql`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/supabase/migrations/20260920000000_performance_indexes.sql)
- **Type of Change**: SQL DDL Migration Hardening
- **Description**: Wrapped all conditional index creation statements in dynamic SQL (`EXECUTE '...'`) inside `IF to_regclass(...) IS NOT NULL` blocks to prevent PostgreSQL compile-time 42P01 errors.
- **Security Impact**: Safe and idempotent execution against any database schema state.
- **Performance Impact**: Accelerates foreign key and RLS lookup queries across `workspaces`, `properties`, `tenants`, `leases`, `invoices`, `transactions`, and `expenses`.
- **Migration Impact**: Safe to run in Supabase SQL editor at any time.

---

### 5. Documentation Deliverables
- [`docs/routing-architecture-audit.md`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/docs/routing-architecture-audit.md)
- [`docs/routing-architecture-recommendation.md`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/docs/routing-architecture-recommendation.md)
- [`docs/routing-migration-plan.md`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/docs/routing-migration-plan.md)
- [`docs/routing-test-report.md`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/docs/routing-test-report.md)
- [`docs/routing-change-log.md`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/docs/routing-change-log.md)
