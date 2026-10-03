# PropertyLedge — Routing Architecture Audit & Codebase Discovery Report

**Author:** Senior Next.js 15 Architect, Supabase Security Engineer, Full-Stack Performance Specialist  
**Date:** September 20, 2026  
**Status:** Completed & Empirically Verified against Codebase

---

## 1. Executive Summary & Verification Matrix

This audit verifies the actual routing, authentication, multi-tenant workspace isolation, property context, and navigation systems in the PropertyLedge SaaS platform (Next.js 15 App Router, React 19, TypeScript, Supabase PostgreSQL with RLS, Zustand, and AG Grid).

### Verification of Proposed Architecture Claims against Codebase

| Claim / Component | Status in Codebase | Actual Implementation Details & Evidence |
| :--- | :--- | :--- |
| **`pl_active_workspace` Cookie** | **Confirmed** | Defined in [`lib/auth/authorization.ts`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/lib/auth/authorization.ts) (`WORKSPACE_COOKIE = 'pl_active_workspace'`) with `SameSite=Lax`, `Path=/`, `Max-Age=30 days`. |
| **`resolveWorkspaceContext()`** | **Confirmed** | Implemented in [`lib/workspace/context.ts`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/lib/workspace/context.ts). Validates active workspace against user's owned workspaces and `workspace_members` table on the server. |
| **`useWorkspaceStore`** | **Confirmed** | Implemented in [`lib/stores/useWorkspaceStore.ts`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/lib/stores/useWorkspaceStore.ts) using Zustand for client-side workspace state, switching state, and permissions. |
| **`usePropertyContext`** | **Confirmed** | Implemented in [`components/property/PropertyContext.tsx`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/components/property/PropertyContext.tsx). Supports `selectedPropertyId:<workspaceId>` in localStorage, fallback to `null` (**All Properties**). |
| **`resolveUserDestination.ts`** | **Confirmed** | Implemented in [`lib/routing/resolveUserDestination.ts`](file:///c:/Projects/Austalia/PropertyLedge/Property_Ledge/lib/routing/resolveUserDestination.ts). Handles onboarding state machines, persona redirection (`platform_admin` -> `/admin`, `tenant` -> `/tenant`), and safe relative redirect validation. |
| **Application-Level Routes (`/dashboard/*`)** | **Confirmed** | All 19 core features reside under `app/(app)/dashboard/*` with shared server layout resolving context once per request. |
| **Dedicated Financial Routes** | **Confirmed** | `/dashboard/expenses` (operating bills), `/dashboard/money` (ledger transactions), `/dashboard/schedules` (rent schedules), and `/dashboard/invoices` (billing statements). |

---

## 2. Complete Route Inventory

| Route Path | File Location | Route Type | Auth Required | Workspace Required | Property Context | Permissions Checked | Canonical / Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `app/(marketing)/page.tsx` | Marketing | No | No | None | None | Public landing page |
| `/pricing` | `app/(marketing)/pricing/page.tsx` | Marketing | No | No | None | None | Public subscription plans |
| `/login` | `app/(auth)/login/page.tsx` | Auth | No (Anon) | No | None | None | User authentication & redirect |
| `/signup` | `app/(auth)/signup/page.tsx` | Auth | No (Anon) | No | None | None | New user registration |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | Auth | No (Anon) | No | None | None | Password reset request |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | Auth | Partial (Token) | No | None | None | Password reset confirmation |
| `/onboarding` | `app/onboarding/page.tsx` | Onboarding | Yes | Partial | None | None | Onboarding welcome & profile |
| `/onboarding/workspace`| `app/onboarding/workspace/page.tsx` | Onboarding | Yes | Creating | None | None | Workspace creation |
| `/onboarding/subscription`| `app/onboarding/subscription/page.tsx` | Onboarding | Yes | Yes | None | None | Plan selection / trial activation |
| `/onboarding/property` | `app/onboarding/property/page.tsx` | Onboarding | Yes | Yes | Creating | None | Initial property setup |
| `/onboarding/complete` | `app/onboarding/complete/page.tsx` | Onboarding | Yes | Yes | Yes | None | Onboarding summary |
| `/dashboard` | `app/(app)/dashboard/page.tsx` | Workspace-wide | Yes | Yes | Optional (`null` = All) | `workspace.view` | Portfolio Overview KPI metrics |
| `/dashboard/properties`| `app/(app)/dashboard/properties/page.tsx` | Workspace-wide | Yes | Yes | Optional | `property.view` | Property portfolio grid & creation |
| `/dashboard/properties/[id]` | `app/(app)/dashboard/properties/[propertyId]/page.tsx` | Property-scoped | Yes | Yes | Scoped | `property.view` | Single property detail & units |
| `/dashboard/people` | `app/(app)/dashboard/people/page.tsx` | Workspace-wide | Yes | Yes | Optional | `tenant.view` | Resident & tenant directory |
| `/dashboard/tenants` | `app/(app)/dashboard/tenants/page.tsx` | Legacy Alias | Yes | Yes | Optional | `tenant.view` | Aliases `/dashboard/people` |
| `/dashboard/leases` | `app/(app)/dashboard/leases/page.tsx` | Workspace-wide | Yes | Yes | Optional | `lease.view` | Leases & renewal management |
| `/dashboard/leases/[id]`| `app/(app)/dashboard/leases/[leaseId]/page.tsx` | Property-scoped | Yes | Yes | Scoped | `lease.view` | Single lease agreement detail |
| `/dashboard/expenses` | `app/(app)/dashboard/expenses/page.tsx` | Workspace-wide | Yes | Yes | Optional | `financial.view` | Operating expenses & vendor bills |
| `/dashboard/money` | `app/(app)/dashboard/money/page.tsx` | Workspace-wide | Yes | Yes | Optional | `financial.view` | Bank transactions & ledger |
| `/dashboard/payments` | `app/(app)/dashboard/payments/page.tsx` | Legacy Alias | Yes | Yes | Optional | `financial.view` | Aliases `/dashboard/money` |
| `/dashboard/schedules`| `app/(app)/dashboard/schedules/page.tsx` | Workspace-wide | Yes | Yes | Optional | `financial.view` | Expected rent payment schedules |
| `/dashboard/invoices` | `app/(app)/dashboard/invoices/page.tsx` | Workspace-wide | Yes | Yes | Optional | `financial.view` | Invoices & customer statements |
| `/dashboard/maintenance`| `app/(app)/dashboard/maintenance/page.tsx` | Workspace-wide | Yes | Yes | Optional | `maintenance.view` | Maintenance requests & work orders |
| `/dashboard/inspections`| `app/(app)/dashboard/inspections/page.tsx` | Workspace-wide | Yes | Yes | Optional | `inspection.view` | Property routine inspection reports |
| `/dashboard/documents` | `app/(app)/dashboard/documents/page.tsx` | Workspace-wide | Yes | Yes | Optional | `document.view` | Document vault & file storage |
| `/dashboard/tasks` | `app/(app)/dashboard/tasks/page.tsx` | Workspace-wide | Yes | Yes | Optional | `task.view` | Workspace task board & actions |
| `/dashboard/team` | `app/(app)/dashboard/team/page.tsx` | Workspace-wide | Yes | Yes | None | `team.member.view` | Team members, roles & seats |
| `/dashboard/activity` | `app/(app)/dashboard/activity/page.tsx` | Workspace-wide | Yes | Yes | Optional | `activity.view` | Audit log & system activity trail |
| `/dashboard/automations`| `app/(app)/dashboard/automations/page.tsx`| Workspace-wide | Yes | Yes | None | `team.settings.view` | Automated notification triggers |
| `/dashboard/reports` | `app/(app)/dashboard/reports/page.tsx` | Workspace-wide | Yes | Yes | Optional | `financial.view` | Tax, yield & financial reports |
| `/dashboard/settings` | `app/(app)/dashboard/settings/page.tsx` | Workspace-wide | Yes | Yes | None | `workspace.edit` | Workspace profile & banking |
| `/subscription` | `app/(app)/subscription/page.tsx` | Workspace-wide | Yes | Yes | None | `subscription.view`| Billing plans & seat add-ons |
| `/admin/*` | `app/admin/*/page.tsx` | Admin Portal | Yes | No (Global) | None | `platform_admin` | Multi-tenant platform admin |
| `/tenant/*` | `app/tenant/*/page.tsx` | Tenant Portal | Yes | No (Tenant) | Scoped | `tenant_persona` | Resident self-service portal |
| `/join/[token]` | `app/join/[token]/page.tsx` | Invitation | Yes/No | Pending | None | None | Team & tenant invitation onboarding |

---

## 3. Architecture & Context Analysis

### 3.1 Workspace Context Model
- **Membership Validation**: Evaluated on the server by inspecting `workspaces.owner_id = user.id` OR `workspace_members.user_id = user.id AND workspace_members.status = 'active'`.
- **Active Workspace Resolution**:
  1. The client sends the `pl_active_workspace` cookie containing the desired `workspaceId`.
  2. The server function `resolveWorkspaceContext()` verifies whether the user is authorized for that `workspaceId`.
  3. If valid, context is granted; if invalid or missing, it defaults to the user's primary owned workspace or first active membership.
  4. The client is never trusted unconditionally; tampering with the cookie simply falls back to the user's legitimate workspace.
- **Client Synchronization**: Server layout hydrates `useWorkspaceStore` with `{ activeWorkspaceId, workspaceName, roleName, permissions, entitlements, workspaces }`.

### 3.2 Property Context Model
- **Workspace Scoping**: Properties strictly belong to a workspace (`properties.workspace_id`).
- **All Properties Aggregation**: When `propertyId = null`, all queries execute scoped to `workspace_id = context.workspaceId` without a `property_id` filter, providing unified portfolio metrics.
- **Single Property Drilldown**: When `propertyId` is provided (via URL search param `?propertyId=...` or client context), queries append `.eq('property_id', propertyId)`.
- **Cross-Workspace Safety**: If a user switches workspaces, `PropertyContext` detects the change (`prevWorkspaceId !== activeWorkspaceId`) and immediately clears stale property state to prevent cross-workspace data contamination.

---

## 4. Security & Performance Audit Findings

1. **Zero Client-Only Authorization**: Every Server Action and API Route invokes `getAuthContext()` or `resolveWorkspaceContext()` directly on the server to re-verify tenancy and session before executing database queries.
2. **Safe Redirect Defense**: All incoming redirect parameters (`redirectTo`, `returnUrl`) pass through `safeRedirectPath()`, rejecting external hostnames, protocol-relative URLs (`//evil.com`), control characters, and CRLF injections.
3. **Optimized Middleware**: `middleware.ts` runs on a tight matcher, bypassing static assets and images, and utilizes cached session checks to prevent redundant database waterfalls during in-app page transitions.
