# PropertyLedge — Absolute Decoupling & Modular Architecture

## 1. Core Architectural Principle

PropertyLedge enforces Clean Architecture with strict dependency inversion:

```text
PRESENTATION  (Pages, Components, Forms, Tables, Client Hooks)
     ↓
APPLICATION   (Application Services, Use Cases, DTOs)
     ↓
DOMAIN        (Entities, Value Objects, Repository Interfaces, Domain Errors)
     ↑
INFRASTRUCTURE (Supabase Repositories, Database Mappers, Config, Loggers)
```

### Dependency Direction Rules
- **Domain** contains pure business models, domain errors, and repository interfaces. Domain **never** imports React, Next.js, or Supabase.
- **Application** orchestrates business rules and defines use cases. Application services depend only on Domain contracts via constructor injection. Application **never** imports Supabase.
- **Infrastructure** implements domain repository interfaces and encapsulates vendor-specific drivers (Supabase, Postgres, PostgREST).
- **Presentation** interacts with Application Services through typed transport clients. UI components **never** import Supabase or execute SQL/database queries.

---

## 2. Directory Layout

The application is organized primarily around business capabilities:

```text
PropertyLedge/
│
├── modules/
│   ├── properties/
│   │   ├── domain/               # Pure Property entities, interfaces, filters
│   │   ├── application/          # PropertyService, DTOs, use cases
│   │   ├── infrastructure/       # SupabasePropertyRepository, Mappers
│   │   ├── presentation/         # PropertyClient, hooks, form schemas
│   │   └── index.ts              # Public module API
│   │
│   ├── tenants/
│   │   ├── domain/               # Pure Tenant entities, interfaces
│   │   ├── application/          # TenantService, DTOs
│   │   ├── infrastructure/       # SupabaseTenantRepository, Mappers
│   │   ├── presentation/         # TenantClient, hooks
│   │   └── index.ts
│   │
│   ├── leases/
│   │   ├── domain/               # Pure Lease entities, interfaces
│   │   ├── application/          # LeaseService, DTOs
│   │   ├── infrastructure/       # SupabaseLeaseRepository, Mappers
│   │   ├── presentation/         # LeaseClient, hooks
│   │   └── index.ts
│   │
│   ├── workspaces/
│   │   ├── domain/               # Pure Workspace entities, interfaces
│   │   ├── application/          # WorkspaceService
│   │   ├── infrastructure/       # SupabaseWorkspaceRepository, Mappers
│   │   └── index.ts
│   │
│   ├── auth/
│   │   ├── domain/               # AuthUser, UserProfile, AccountContext
│   │   ├── application/          # AuthService
│   │   ├── infrastructure/       # SupabaseAuthRepository
│   │   ├── presentation/         # authClient, useAuth hook
│   │   └── index.ts
│   │
│   └── dashboard/                # Aggregations, attention rollups, setup progress
│
├── shared/
│   ├── domain/                   # Result<T, E>, DomainError hierarchy, RequestContext
│   ├── application/              # Common contracts, PaginationParams, PaginatedList
│   └── infrastructure/           # Centralized Config, ILogger, TypedSupabaseClient, StorageService
│
├── composition/
│   ├── repositories.ts           # Wires infrastructure repositories with DB clients
│   ├── services.ts               # Wires application services with repositories
│   ├── container.ts              # Lightweight DI container with mock override support
│   └── index.ts
│
├── app/                          # Next.js App Router (thin transport adapters & server pages)
└── components/                   # Presentation components (100% decoupled from database)
```

---

## 3. The Repository Pattern

Every persistence-backed business capability exposes an interface in `domain/repositories/`.

Example (`PropertyRepository`):
```ts
export interface PropertyRepository {
  getById(id: string, context?: RequestContext): Promise<Result<Property, DomainError>>;
  list(filters: PropertyFilters, context?: RequestContext): Promise<Result<Property[], DomainError>>;
  countByWorkspace(workspaceId: string, context?: RequestContext): Promise<Result<number, DomainError>>;
  create(data: CreatePropertyData, context: RequestContext): Promise<Result<Property, DomainError>>;
  update(id: string, data: UpdatePropertyData, context: RequestContext): Promise<Result<Property, DomainError>>;
  archive(id: string, context: RequestContext): Promise<Result<void, DomainError>>;
  restore(id: string, context: RequestContext): Promise<Result<Property, DomainError>>;
  delete(id: string, context: RequestContext): Promise<Result<void, DomainError>>;
}
```

Notice:
- No database types or SQL structures appear in the interface.
- Return types use functional `Result<T, DomainError>`.
- The interface is defined by the consumer (Domain/Application), not the database.

---

## 4. Supabase Isolation

Supabase exists **exclusively** inside `shared/infrastructure/` and `modules/*/infrastructure/`.

### What Infrastructure Does:
1. Executes `.from('properties')`, `.rpc()`, and PostgREST filters.
2. Catches raw database exceptions and translates them into domain errors (`NotFoundError`, `ConflictError`, `DatabaseError`) via `toSafeDomainError()`.
3. Converts database rows (`PropertyRow`) into domain entities (`Property`) via dedicated mappers.

### What is Strictly Forbidden:
```tsx
// FORBIDDEN in Components, Pages, and Hooks:
import { createClient } from '@/lib/supabase/client';
const { data } = await supabase.from('properties').select('*');

// CORRECT:
import { authClient } from '@/modules/auth';
const user = await authClient.getCurrentUser();
```

---

## 5. Result-Based Error Handling

PropertyLedge avoids scattering unhandled exceptions across the codebase.

```ts
type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };
```

Domain Error taxonomy (`shared/domain/errors.ts`):
- `ValidationError`: Invalid input payloads (HTTP 400).
- `UnauthorizedError`: Missing session or invalid credentials (HTTP 401).
- `ForbiddenError`: Missing permissions or entitlement limits exceeded (HTTP 403).
- `NotFoundError`: Requested entity does not exist (HTTP 404).
- `ConflictError`: Duplicate unique constraints or concurrency conflict (HTTP 409).
- `DatabaseError`: Unforeseen database failure, sanitized for safety (HTTP 500).
- `ExternalServiceError`: Third-party vendor failure (Resend, Storage) (HTTP 502).

---

## 6. How to Replace Supabase with Another Backend

Because application and domain layers depend solely on interfaces, switching from Supabase to a REST API, Prisma, or PostgreSQL ORM requires changing **only the infrastructure adapter**:

1. Implement `PropertyRepository` using your new backend (e.g. `RestPropertyRepository`).
2. In `composition/repositories.ts`, instantiate `RestPropertyRepository` instead of `SupabasePropertyRepository`.
3. **No changes** are needed in:
   - `modules/properties/domain/*`
   - `modules/properties/application/*`
   - UI components (`components/*`)
   - Presentation hooks and forms

---

## 7. Testing Strategy

1. **Unit Tests (No Database):**
   Application services are tested with in-memory fake repositories (`tests/unit/decoupled-services.spec.ts`).
2. **Integration Tests (With Supabase):**
   Test infrastructure repositories against a real or local Supabase instance.
3. **E2E Tests (Playwright):**
   Verify full user workflows in the browser.
