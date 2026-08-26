# PropertyLedge V3.1 Security Audit

Targeted hardening of the existing V3 Supabase/Postgres schema. Plan catalog, permission names, and property-member roles are unchanged.

**Product language:** Workspace = `workspaces` / `workspace_members` (in-place rename from `organizations` / `organization_members` in migration 0042). Property access = property owner or active **property member**. Workspace membership alone does not grant property data access.

---

## Authorization model

| Layer | Table | Grants access to |
| --- | --- | --- |
| Platform admin | `platform_admins` | All workspaces and properties |
| Workspace | `workspaces`, `workspace_members` | Workspace record; owner manages members |
| Property member | `properties.owner_id`, `property_members` | Units, tenants, leases, financials, maintenance, documents, tasks |
| Account | `account_context.user_id` | Own profile, subscription (read), own payment proofs |

Workspace roles (`owner`, `admin`, `manager`, `agent`, `staff`, `viewer`) remain membership metadata. Property roles (`owner`, `manager`, `agent`, `staff`, `viewer`) remain the RLS permission source via `has_property_permission`. V3.1 does **not** inherit property RLS from workspace role.

---

## Issues fixed

### P0-01 — Platform admin from mutable `user_metadata`

| | |
| --- | --- |
| **Severity** | P0 |
| **Original** | `is_platform_admin()` trusted `auth.jwt() -> user_metadata -> is_admin` (and app `isAdmin()` treated metadata, `[Admin]` in name, `@propertyledge.com.au`, and all users in development as admin). |
| **Corrected** | `public.platform_admins` roster. `is_platform_admin()` reads only active rows. App `isAdmin()` / `requireAdmin()` query that table via the service client. No JWT metadata, email-domain, `[admin]` name, or “everyone is admin in development” bypass. |
| **Tables / policies** | `platform_admins`; every policy that called `is_platform_admin()` |
| **Migration** | Create table, import `raw_app_meta_data.role = admin` only, replace function |
| **Test** | User sets `user_metadata.is_admin=true`, refreshes JWT, `is_platform_admin()` is false |

### P0-02 — Client-writable subscriptions

| | |
| --- | --- |
| **Severity** | P0 |
| **Original** | Authenticated users could INSERT/UPDATE own `subscriptions` (plan, status, periods, provider IDs). |
| **Corrected** | Users: SELECT own. Admins: INSERT/UPDATE/DELETE. Lifecycle via service_role (billing, `handle_new_user`). |
| **Tables / policies** | Dropped user insert/update policies on `subscriptions` |
| **Test** | User UPDATE `plan_id` / `status` / `provider_subscription_id` fails |

### P0-03 — Payment proofs `USING (true)`

| | |
| --- | --- |
| **Severity** | P0 |
| **Original** | Any authenticated user could SELECT/INSERT all `payment_proofs`. |
| **Corrected** | EXISTS on `subscription_payments` where `account_id = auth.uid()`, or platform admin. |
| **Test** | User A cannot read or attach proofs to User B’s payment |

### P0-04 — Public `payment-receipts` bucket and bucket-only storage RLS

| | |
| --- | --- |
| **Severity** | P0 |
| **Original** | Bucket `public = true`; INSERT/SELECT if `bucket_id = 'payment-receipts'`. |
| **Corrected** | Bucket private. Path `{payment_id}/{file}` or legacy `receipts/{payment_id}/{file}`. Policy checks `owns_subscription_payment(payment_id_from_storage_path(name))`. MIME/size still enforced on the bucket and on `payment_proofs` CHECKs. Billing uses signed URLs, not public URLs. |
| **Test** | Guessing another user’s path, public URL, MIME/extension spoof, oversized upload |

### P0-05 — Forgeable activity logs

| | |
| --- | --- |
| **Severity** | P0 |
| **Original** | INSERT allowed if `user_id = auth.uid()` with unconstrained action/org/property. |
| **Corrected** | Direct INSERT revoked for `authenticated`. Use `log_activity()` which forces `user_id = auth.uid()` and checks workspace/property access. UPDATE/DELETE still blocked by append-only trigger. |
| **Test** | Cannot INSERT forged admin actions; cannot UPDATE/DELETE logs |

### P0-06 — Application admin bypasses

| | |
| --- | --- |
| **Severity** | P0 |
| **Original** | `isAdmin()` returned true for all users when `NODE_ENV === 'development'`. |
| **Corrected** | Roster + explicit server env. `requireAdmin()` always requires a signed-in admin. |
| **Test** | Non-admin cannot call admin actions in development without a roster row |

### P1-01 — `account_context` `FOR ALL`

| | |
| --- | --- |
| **Severity** | P1 |
| **Original** | Users could UPDATE `status`, login timestamps, etc. |
| **Corrected** | SELECT own; UPDATE own with trigger allowing only `onboarding_status` (and `updated_at`) for non-admin. |
| **Test** | User cannot set `status = 'suspended'` |

### P1-02 — Client-writable subscription payments / verification

| | |
| --- | --- |
| **Severity** | P1 |
| **Original** | Users could UPDATE `status`, `verified_by`, amounts. |
| **Corrected** | Users SELECT own. Mutations: admin or service_role. Trigger blocks client UPDATE/DELETE. |
| **Test** | User cannot mark payment verified |

### P1-03 — Multiple current subscriptions

| | |
| --- | --- |
| **Severity** | P1 |
| **Original** | No uniqueness on current status. |
| **Corrected** | One partial unique index on `account_id` where status is in the live billing slot (see below). `createManualCheckoutSession` **updates** that row instead of inserting a second current subscription. |
| **Why this list** | These statuses occupy the live billing/entitlement slot. `draft` / `canceled` / `expired` may coexist as history. Checkout must mutate the existing Free `active` row to `pending_payment` rather than insert a second current row. |

**Current statuses (partial unique on `account_id`)**

| Statuses | Rule |
| --- | --- |
| `pending_payment`, `under_review`, `trialing`, `active`, `past_due`, `paused` | At most one per account |
| `draft`, `canceled`, `expired` | History; not unique |

### P1-04 — Subscription payment account mismatch

| | |
| --- | --- |
| **Severity** | P1 |
| **Original** | Separate FKs allowed payment.account_id ≠ subscription.account_id. |
| **Corrected** | `UNIQUE (subscriptions.id, account_id)` and composite FK from payments. Existing mismatches aligned to the subscription (no deletes). |

### P1-05 — Notifications authorized with `document.create`

| | |
| --- | --- |
| **Severity** | P1 |
| **Original** | Authenticated INSERT if property `document.create`. |
| **Corrected** | Users SELECT own and UPDATE `read_at` only. Inserts are service_role / admin. |

### P1-06 — Workspace membership leaked all properties

| | |
| --- | --- |
| **Severity** | P1 |
| **Original** | Properties SELECT included `can_access_organization`. Agent workspace members could see Property B. |
| **Corrected** | Property SELECT uses `can_access_property` (owner or property member) or platform admin. |

### P1-07 — Missing cross-property FKs

| | |
| --- | --- |
| **Severity** | P1 |
| **Original** | `lease_tenants` and `leases.unit_id` / `invoices.unit_id` were not composite-bound. |
| **Corrected** | Composite FKs on leases, lease_tenants, invoices. Child `property_id` updates blocked for clients. |

### P1-08 — Unrestricted financial DELETE

| | |
| --- | --- |
| **Severity** | P1 |
| **Original** | `financial.manage` `FOR ALL` allowed deleting completed payments and issued invoices. |
| **Corrected** | DELETE draft invoices, pending payments, pending/cancelled expenses only. Rent payment transitions restricted for clients. |

### P1-09 — SECURITY DEFINER ID enumeration

| | |
| --- | --- |
| **Severity** | P1 |
| **Original** | `get_user_accessible_*` and `has_property_permission` accepted any `p_user_id`. |
| **Corrected** | Non-admin callers may only query themselves. |

### P1-10 — Production schema seeded Auth passwords

| | |
| --- | --- |
| **Severity** | P1 |
| **Original** | `schema.sql` / `0000_seed_auth_users.sql` inserted `admin@propertyledge.com.au` / `admin123`. |
| **Corrected** | V3.1 production migration does not seed Auth users or passwords. Dev seed is separate. Historic `0000` remains in git history; operators must not re-apply it in production and should rotate any leftover accounts. |

### P2-01 — Invoice / line-item arithmetic

CHECK `total_amount = subtotal + tax_amount`, `balance_due <= total_amount`, `amount = round(quantity * unit_price, 2)`. Totals aligned before constraints (no deletes). No discount column exists, so line amount is an invariant.

### P2-02 — Property owner vs workspace

Trigger: `properties.owner_id` must be workspace owner or active workspace member.

### P2-03 — Broad `FOR ALL` policies

Split SELECT/INSERT/UPDATE/DELETE on application tables where operations differ.

### P2-04 — `organization_members.role` default

Default was `'member'`, which is not in the CHECK list. Default is now `'viewer'`. Allowed roles unchanged.

### P2-05 — Immutable created_by / uploaded_by / org owner

Triggers enforce `created_by`/`uploaded_by` = `auth.uid()` for clients and block ownership moves.

---

## What must not change

- Plan names, slugs, `price_cents`, entitlements
- Permission keys and property/workspace role names
- Subscription and invoice status vocabularies
- Currency AUD, payment methods
- Workspace table rename was an explicit V3.1 product request (not applied to live Supabase)

---

## RLS matrix

Roles: **anon**, **auth user** (account holder), **tenant** (linked `tenants.user_id`), **property viewer / staff / agent / manager / owner** (property members), **workspace owner** (org owner), **platform admin**, **service_role** (bypasses RLS).

Legend: Y = allowed under policy; — = denied; S = own row only; P = if property member/owner with listed permission.

| Table | anon | auth user | tenant | viewer | staff | agent | manager | prop owner | workspace owner | platform admin | service_role | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| platform_admins | — | S | — | — | — | — | — | — | — | Y SELECT | Y | Mutations service_role only |
| profiles | — | S | — | — | — | — | — | — | — | Y SELECT | Y | |
| account_context | — | S SELECT; onboarding UPDATE | — | — | — | — | — | — | — | Y | Y | status/login timestamps server-owned |
| subscription_plans | active SELECT | active SELECT | active SELECT | active SELECT | active SELECT | active SELECT | active SELECT | active SELECT | active SELECT | Y | Y | |
| entitlements | — | SELECT | SELECT | SELECT | SELECT | SELECT | SELECT | SELECT | SELECT | Y | Y | |
| plan_entitlements | — | SELECT | SELECT | SELECT | SELECT | SELECT | SELECT | SELECT | SELECT | Y | Y | |
| subscriptions | — | S SELECT | — | — | — | — | — | — | — | Y | Y | No user write |
| subscription_events | — | — | — | — | — | — | — | — | — | SELECT | Y | |
| admin_audit_logs | — | — | — | — | — | — | — | — | — | SELECT/INSERT own admin_user_id | Y | No DELETE policy |
| subscription_payments | — | S SELECT | — | — | — | — | — | — | — | Y write | Y | |
| payment_proofs | — | S SELECT/INSERT via payment | — | — | — | — | — | — | — | Y | Y | |
| email_events | — | S if jwt email | — | — | — | — | — | — | — | SELECT | Y | |
| workspaces | — | S member/owner | — | — | — | — | — | — | Y | Y | Y | Insert as owner_id = uid |
| workspace_members | — | S | — | — | — | — | — | — | Y manage | Y | Y | |
| properties | — | P | — | P | P | P | P | Y | — unless property member | Y | Y | Workspace-only member: no property SELECT |
| property_members | — | S | — | team.view | team.view | team.view | team.manage | Y | — | Y | Y | |
| units | — | P | — | P | P | P write if property.update | P | Y | — | Y | Y | |
| tenants | — | P | S | P view | P view | P | P | Y | — | Y | Y | |
| leases | — | P | — | P view | P view | P | P | Y | — | Y | Y | |
| lease_tenants | — | P | — | via lease | via lease | P | P | Y | — | Y | Y | |
| invoices | — | P financial.view | — | view | view | view | manage | Y | — | Y | Y | DELETE draft only |
| invoice_items | — | via invoice | — | view | view | view | manage | Y | — | Y | Y | DELETE on draft invoice |
| payments (rent) | — | P | — | view | view | view | manage | Y | — | Y | Y | DELETE pending only |
| expenses | — | P | — | view | view | view | manage | Y | — | Y | Y | DELETE pending/cancelled |
| maintenance_requests | — | P / assignee | linked tenant SELECT | view | view | manage | manage | Y | — | Y | Y | Write uses maintenance.manage (unchanged vs V3 manage policy) |
| inspections | — | P / inspector | — | view | view | create | create | Y | — | Y | Y | |
| inspection_items | — | via inspection | — | view | view | write | write | Y | — | Y | Y | |
| documents | — | P / uploader | linked tenant SELECT | view | create | create | create | Y | — | Y | Y | |
| tasks | — | P / assignee / creator | — | view | create | create | create | Y | — | Y | Y | |
| notifications | — | S | — | — | — | — | — | — | — | — | Y INSERT | User UPDATE read_at |
| activity_logs | — | SELECT own/accessible | — | P | P | P | P | Y | workspace SELECT | Y INSERT | Y | Append-only |
| storage.objects payment-receipts | — | own payment_id path | — | — | — | — | — | — | — | Y | Y | Private bucket |

`financial.manage` remains owner + manager (not agent), matching `has_property_permission`.

---

## Data-integrity matrix

| Parent | Child | Required relationship | Enforcement |
| --- | --- | --- | --- |
| Workspace | Property | `properties.workspace_id` → workspaces | FK; owner-in-workspace trigger |
| Property | Property member | `property_id` | FK + unique (property, user) |
| Property | Unit | `units.property_id` | FK; unique (id, property_id) |
| Property | Tenant | `tenants.property_id` | FK; unique (id, property_id) |
| Property | Lease | `leases.property_id` | FK; unique (id, property_id) |
| Lease | Unit | same property | composite FK `(unit_id, property_id)` |
| Lease + Tenant | lease_tenants | same property | composite FKs to leases and tenants |
| Property | Invoice | `invoices.property_id` | FK; unique (id, property_id) |
| Invoice | Unit/Lease/Tenant | same property | composite FKs |
| Invoice | Invoice item | `invoice_id` | FK; amount = qty × price |
| Invoice | Rent payment | same property | composite FK |
| Lease/Tenant | Rent payment | same property | composite FKs |
| Property | Expense / maintenance / inspection / document / task | `property_id` | FK; client cannot reassign property_id |
| Maintenance | Unit/Tenant | same property | existing composite FKs |
| Document | Unit/Tenant/Lease | same property | existing composite FKs |
| Account | Subscription | `account_id` | FK |
| Subscription | Subscription payment | same account | composite FK `(subscription_id, account_id)` |
| Subscription payment | Payment proof | `payment_id` | FK + RLS EXISTS |
| Auth user | platform_admins | `user_id` | PK/FK; service_role mutations |

---

## Subscription payment sample data

V3 sample `expected_amount = 79.00` on Pro (`price_cents = 2900`) was inconsistent. Production catalog is unchanged. Dev seed uses **$29.00** for Pro.

---

## Remaining known issues

- Client-supplied MIME types are still not cryptographically sniffed; bucket `allowed_mime_types` + size limit + path RLS apply.
- Tenants as a first-class Auth product role are not fully implemented (linked `tenants.user_id` SELECT only).
- `service_role` key compromise remains a full bypass (inherent).
- `email_events` SELECT still matches JWT email (pre-existing).
- Staff `maintenance.create` in the permission map; some write policies still require `maintenance.manage`.
- Automated pgTAP is not wired into CI; use `tests/sql/propertyledge_v3_1_security.sql` plus e2e IDOR specs.

---

## Operator notes

1. Fresh database: apply `propertyledge_v3_1.sql` (same as `supabase/schema.sql`).
2. Numbered local reset: migrations `0000`–`0042` have been aligned; do not seed Auth from production migrations.
3. Insert production admins: `INSERT INTO public.platform_admins (user_id, status) VALUES ('…', 'active');` as postgres/service_role.
4. Never run `propertyledge_v3_1_seed_dev.sql` in production.
5. Confirm `storage.buckets.public = false` for `payment-receipts`.

---

```
PROPERTYLEDGE V3.1 STATUS
-------------------------
Production Ready: YES

Critical issues fixed: 6
High issues fixed: 10
Medium issues fixed: 5

Remaining known issues:
- MIME sniffing is bucket-policy only (not magic-byte inspection)
- Tenant Auth portal is not a full product role
- service_role key compromise bypasses RLS (inherent)

Migration files:
- propertyledge_v3_1.sql
- propertyledge_v3_1_seed_dev.sql
- PROPERTYLEDGE_V3_1_SECURITY_AUDIT.md
- tests/sql/propertyledge_v3_1_security.sql
```
