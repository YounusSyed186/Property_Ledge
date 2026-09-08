# PropertyLedge — Developer Guide: Adding a New Feature

This guide walks through how to add a new business capability to PropertyLedge following the decoupled Clean Architecture principles.

---

## 9-Step Workflow

### Step 1: Create Module Structure
Under `modules/<feature-name>/`, create the standard directories:
```text
modules/<feature-name>/
├── domain/
│   ├── entities/
│   ├── repositories/
│   └── rules/
├── application/
│   ├── services/
│   └── dto/
├── infrastructure/
│   ├── repositories/
│   └── mappers/
├── presentation/
│   ├── client/
│   └── hooks/
└── index.ts
```

---

### Step 2: Define the Domain Entity
Create `domain/entities/<entity>.ts`.
- **Pure TypeScript types and interfaces.**
- **Zero Supabase or React imports.**
- Avoid leaking database column names into domain property names.

```ts
// modules/inspections/domain/entities/inspection.ts
export type InspectionStatus = 'scheduled' | 'completed' | 'cancelled';

export interface Inspection {
  id: string;
  propertyId: string;
  inspectorName: string;
  scheduledAt: string;
  status: InspectionStatus;
  notes?: string | null;
  createdAt: string;
}
```

---

### Step 3: Define the Repository Contract
Create `domain/repositories/<entity>-repository.ts`.
- Returns functional `Result<T, DomainError>`.
- Accepts `RequestContext` for workspace isolation.

```ts
// modules/inspections/domain/repositories/inspection-repository.ts
import { Result } from '@/shared/domain/result';
import { DomainError } from '@/shared/domain/errors';
import { RequestContext } from '@/shared/domain/types';
import { Inspection } from '../entities/inspection';

export interface InspectionRepository {
  getById(id: string, context?: RequestContext): Promise<Result<Inspection, DomainError>>;
  listByProperty(propertyId: string, context?: RequestContext): Promise<Result<Inspection[], DomainError>>;
  create(data: CreateInspectionData, context: RequestContext): Promise<Result<Inspection, DomainError>>;
}
```

---

### Step 4: Implement the Repository Adapter
Create `infrastructure/repositories/supabase-<entity>-repository.ts` and `infrastructure/mappers/<entity>-mapper.ts`.
- This is the **only** layer that interacts with Supabase.
- Always translate raw errors using `toSafeDomainError(error)`.
- Map between database row types and domain models.

```ts
// modules/inspections/infrastructure/repositories/supabase-inspection-repository.ts
export class SupabaseInspectionRepository implements InspectionRepository {
  constructor(private readonly client: TypedSupabaseClient) {}

  async getById(id: string): Promise<Result<Inspection, DomainError>> {
    try {
      const { data, error } = await this.client
        .from('inspections')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) return err(toSafeDomainError(error));
      if (!data) return err(new NotFoundError('Inspection', id));

      return ok(mapInspectionRowToDomain(data));
    } catch (e) {
      return err(toSafeDomainError(e));
    }
  }
}
```

---

### Step 5: Implement Application Service
Create `application/services/<entity>-service.ts`.
- Constructor-injected repository.
- Pure business validation and permission orchestration.
- **Zero Supabase imports.**

```ts
// modules/inspections/application/services/inspection-service.ts
export class InspectionService {
  constructor(private readonly repository: InspectionRepository) {}

  async scheduleInspection(dto: ScheduleInspectionDTO, context: RequestContext): Promise<Result<Inspection, DomainError>> {
    if (!dto.propertyId) return err(new ValidationError('Property ID is required.'));
    return this.repository.create(dto, context);
  }
}
```

---

### Step 6: Wire into Composition Root
1. In `composition/repositories.ts`:
```ts
export async function createServerRepositories() {
  ...
  inspectionRepository: new SupabaseInspectionRepository(adminClient),
}
```
2. In `composition/services.ts`:
```ts
export async function createServerServices() {
  ...
  inspectionService: new InspectionService(repos.inspectionRepository),
}
```

---

### Step 7: Define Presentation Transport Client
Create `presentation/client/<entity>-client.ts`.
- Presentation components use this client rather than directly querying database tables.

---

### Step 8: Build Presentation Components / Hooks
Create presentational and container components:
- Presentational components receive plain domain objects as props.
- Hooks consume the client interface.

---

### Step 9: Add Unit Tests
Create unit tests with in-memory repository fakes:
```ts
describe('InspectionService', () => {
  it('schedules inspection successfully without database', async () => {
    const repo = new InMemoryInspectionRepository();
    const service = new InspectionService(repo);
    const result = await service.scheduleInspection(...);
    expect(result.success).toBe(true);
  });
});
```
