# PropertyLedge — Routing Architecture Recommendation & Target Design

**Author:** Senior Next.js 15 Architect, Supabase Security Engineer, Full-Stack Performance Specialist  
**Date:** September 20, 2026  
**Status:** Recommended Target Architecture (Option B+)

---

## 1. Context & Architectural Problem Statement

PropertyLedge manages commercial and residential real estate portfolios where users can own or collaborate across multiple workspaces and manage multiple properties per workspace.

We evaluated three URL routing paradigms:
1. **Option A: Workspace Slug in URL** (`/[workspaceSlug]/dashboard`, `/[workspaceSlug]/properties`)
2. **Option B+ (Recommended): Application-Level URLs with State/Cookie Context & Search Params** (`/dashboard/properties`, `?propertyId=123`)
3. **Option C: Deeply Nested Slug & Property IDs** (`/[workspaceSlug]/properties/[propertyId]/transactions`)

---

## 2. Evaluation Matrix & Tradeoff Analysis

| Criteria | Option A (`/[slug]/...`) | Option B+ (`/dashboard/...`) | Option C (`/[slug]/props/[id]/...`) |
| :--- | :--- | :--- | :--- |
| **Multi-Workspace Switching** | Forces full URL replacement & layout unmount | Fast cookie/store update with zero route churn | Forces complete URL rebuild |
| **"All Properties" Aggregation** | Requires `/all/` pseudo-path segment | Native (`propertyId = null` or omitted param) | Highly awkward URL workarounds |
| **Deep Linking & Bookmark Stability**| Fragile (breaks on workspace slug edits) | Resilient across user sessions | Fragile (breaks if property or slug changes) |
| **Server-Side Security & RLS** | RLS verified on user session | RLS verified on user session | RLS verified on user session |
| **Middleware & Routing Overhead** | High regex parsing & slug validation | Minimal overhead; route-level resolution | Very high parsing overhead |
| **Navigation & Tab Performance** | Re-mounts entire tree on slug change | Smooth transitions with cached layout | Full tree remounts |
| **Migration & Breaking Change Risk** | **Extreme** (breaks 100% of links & bookmarks) | **Low** (preserves existing URLs, hardens state)| **Extreme** (breaks 100% of links & bookmarks) |

---

## 3. Recommended Architecture: Option B+

### 3.1 Workspace Context Strategy
- **Persistence**: Stored in a secure, `SameSite=Lax` cookie (`pl_active_workspace`).
- **Server Resolution**: Resolved once per request in `app/(app)/layout.tsx` via `resolveWorkspaceContext()`, verifying that `user.id` is the workspace owner or an active member.
- **Client Distribution**: Propagated via `useWorkspaceStore` to top navigation, sidebar, and workspace switchers.

### 3.2 Property Context Strategy
- **URL Parameter**: Query parameter `?propertyId=<uuid>` is supported on all list and financial views (`/dashboard/properties`, `/dashboard/expenses`, `/dashboard/money`, `/dashboard/schedules`).
- **Precedence Rules**:
  1. **Explicit URL Parameter (`?propertyId=...`)**: If present in URL, overrides stored selection.
  2. **Persisted Selection (`selectedPropertyId:<workspaceId>` in localStorage)**: Used if no URL parameter is provided.
  3. **All Properties (`null`)**: Default fallback when no property is selected or when "All Properties" is clicked.
- **Cross-Workspace Invalidation**: When switching workspaces, `PropertyContext` resets selected property to `null` to avoid cross-tenant data leaks.

### 3.3 Canonical Financial Resource Architecture
Rather than collapsing distinct financial domains into a single overloaded page, PropertyLedge maintains purpose-built financial modules:
- **`/dashboard/expenses`**: Operating bills, utility invoices, contractor fees, rates, and multi-expense transaction allocations.
- **`/dashboard/money`**: Ledger transactions, bank feeds, payment reconciliations, and cashflow monitoring.
- **`/dashboard/schedules`**: Recurring rent schedules, lease expected payments, and due-date tracking.
- **`/dashboard/invoices`**: Formal rental invoices, arrears notices, and PDF statements.

---

## 4. Standardized Layout & Navigation Hierarchy

```text
Root Layout (app/layout.tsx)
  ├── Marketing Layout (app/(marketing)/layout.tsx)
  ├── Auth Layout (app/(auth)/layout.tsx)
  ├── Admin Layout (app/admin/layout.tsx)
  └── Application Layout (app/(app)/layout.tsx)
        ├── Context Providers (PropertyProvider, WorkspaceBootstrap)
        ├── Sidebar & Top Navigation
        └── Feature Routes (app/(app)/dashboard/[feature]/page.tsx)
```

---

## 5. Summary of Architectural Guarantees
1. **Strict Multi-Tenancy**: Zero client-side trust; all workspace and property access is checked on the server against Supabase RLS.
2. **Smooth Developer & User Experience**: Direct, clean URLs without slug fragmentation.
3. **High Performance**: Layouts remain mounted during workspace and property switching without unnecessary full-page refreshes.
