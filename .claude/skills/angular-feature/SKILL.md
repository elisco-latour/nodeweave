---
name: angular-feature
description: >
  Build or refactor Angular features for skills-intel following Feature-Centric Clean
  Architecture + MVVM + ROP (Result<T,E>) + TDD. Use when creating new pages, components,
  view models, use cases, ports, or restructuring existing features. Covers the full
  pattern from domain entity through smart component, including test-first discipline
  and typed error handling with Railway-Oriented Programming.
---

# Angular Feature Development — skills-intel

Full narrative with code examples: `docs/ENTERPRISE_ANGULAR_ARCHITECTURE.md`.

---

## 1. Architecture Layers

Every feature follows this data flow:

```
User Action → Component → ViewModel → Use Case → Repository (Port) → HttpClient → API
```

| Layer | Injects | Returns | Location inside `features/<name>/` |
|-------|---------|---------|--------------------------------------|
| **Smart Page** | ViewModel | — | `ui/pages/` |
| **Dumb Component** | `input()` / `output()` only | — | `ui/components/` |
| **ViewModel** | Use Cases only | `Signal<T>` (readonly) | `state/` |
| **Use Case** | Port tokens | `Promise<T>` or `Promise<Result<T,E>>` | `application/use-cases/` |
| **Port** | — | Interface + `InjectionToken` | `application/ports/` |
| **Repository** | `HttpClient` | `Promise<T>` or `Promise<Result<T,E>>` | `infrastructure/repositories/` |
| **Mapper** | — | Domain ↔ DTO | `infrastructure/mappers/` |
| **Domain Entity** | — | Rich class | `domain/` |
| **Domain Error** | — | Discriminated union | `domain/errors/` |

---

## 2. Feature Folder Structure

```
src/app/
  features/
    <feature-name>/
      domain/
        <name>.entity.ts          ← rich entity, enforces invariants, no Angular
        errors/
          <name>.errors.ts        ← discriminated union: { kind, message, ...fields }
      application/
        ports/
          i-<name>.repository.ts  ← interface + InjectionToken
        use-cases/
          <action>-<name>.use-case.ts
      infrastructure/
        http/
          <name>.dto.ts           ← raw API response shape
        mappers/
          <name>.mapper.ts        ← DTO ↔ Domain
        repositories/
          http-<name>.repository.ts
      state/
        <name>.view-model.ts      ← extends ViewModelBase
      ui/
        pages/
          <name>-page.component.ts
        components/
          <name>.component.ts
      index.ts                    ← public API of the slice
  shared/
    kernel/
      result.ts                   ← Result<T,E>, ok, fail, isOk, match, NetworkError
    ui/                           ← shared presentational components
  core/
    base/
      observable-object.ts        ← ObservableObject base class
      view-model.base.ts          ← ViewModelBase (extends ObservableObject)
      use-case.base.ts            ← UseCase<TParam, TResult> interface
    auth/
    guards/
    interceptors/
```

Cross-feature imports must go through `index.ts` barrel only. Never import from another feature's internals.

---

## 3. Layer Rules

### Domain
- Rich classes that enforce invariants — not anemic interfaces
- Throw `DomainError` on invalid state transitions
- No Angular imports, no `HttpClient`, no RxJS (Signals are acceptable as a primitive)
- Domain error types: discriminated union with `kind` + `message` + domain-specific fields

### Application / Use Cases
- One business action per class implementing `UseCase<TParam, TResult>`
- `@Injectable({ providedIn: 'root' })`
- Returns `Promise<T>` for infallible operations, `Promise<Result<T, E>>` for fallible ones
- Injects only port tokens and other use cases — never concrete repositories or HttpClient
- No Angular UI, no Router

### Ports
- TypeScript `interface` + `InjectionToken` in the same file
- Defined in `application/ports/` — owned by the feature's Application layer
- Methods return `Promise<T>` for infrastructure-only failures, `Promise<Result<T,E>>` for domain failures

### Infrastructure
- Repositories implement the port interface
- Always use Mappers — HTTP clients return DTOs; repositories return Domain entities
- HTTP errors (network, 5xx) propagate as thrown exceptions; domain failures return `Result`
- Provide the port token in the feature's route provider or `app.config.ts`

### State / MVVM (ViewModels)
- Extend `ViewModelBase` from `core/base/`
- Private `WritableSignal<T>`, expose via `.asReadonly()` — public signals are always read-only
- Mutate state only via `setProperty()` / `updateProperty()` / `batchUpdate()` from `ObservableObject`
- `computed()` for derived state — never compute in templates
- Inject Use Cases only — no repositories, no HttpClient, no Router
- Add feature-specific typed error signals for domain error handling:

```typescript
readonly createError = signal<CreateEmployeeError | NetworkError | null>(null);
```

- Use `executeWithResult` for all async operations:

```typescript
const result = await this.executeWithResult(() => this.createUseCase.execute(req));
match(result, () => this.createError.set(null), err => this.createError.set(err));
```

### Presentation
- **Smart pages**: `inject()` the ViewModel, `providers: [XViewModel]` at page level, bind template to VM signals, forward events to VM methods
- **Dumb components**: data via `input()` / `input.required()`, events via `output()`, no services, no ViewModels
- Mandatory: no explicit `standalone: true` (default), no explicit `OnPush` (default), `inject()` over constructor DI, `host` object over `@HostBinding`/`@HostListener`

---

## 4. Result Type Usage

`Result<T, E>`, `ok()`, `fail()`, `isOk()`, `match()`, and `NetworkError` all live in `src/app/shared/kernel/result.ts`.

```typescript
export type Result<T, E> =
  | { readonly ok: true;  readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok   = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const fail = <E>(error: E): Result<never, E> => ({ ok: false, error });
export const isOk = <T, E>(r: Result<T, E>): r is { ok: true; value: T } => r.ok;
export const match = <T, E, U>(r: Result<T, E>, onOk: (v: T) => U, onFail: (e: E) => U): U =>
  r.ok ? onOk(r.value) : onFail(r.error);

export interface NetworkError {
  readonly kind: 'Network';
  readonly message: string;
}
```

**Decision rule:**

| Situation | Return type |
|-----------|-------------|
| Failure is always infrastructure (network, 5xx) | `Promise<T>` — let it throw |
| Failure is a business case the caller must handle | `Promise<Result<T, E>>` |

**Domain error shape** (mandatory):

```typescript
// kind = discriminant for branching; message = banner string for ViewModelBase
export type CreateEmployeeError =
  | { readonly kind: 'DuplicateEmployee'; readonly existingId: string; readonly message: string }
  | { readonly kind: 'InvalidRequest';    readonly reason: string;     readonly message: string };
```

**`executeWithResult` in ViewModelBase** lifts thrown exceptions to `NetworkError`:

```typescript
protected async executeWithResult<T, E extends { message: string }>(
  operation: () => Promise<Result<T, E>>,
): Promise<Result<T, E | NetworkError>>
```

For operations with no domain errors: `executeWithResult<T, never>()`.

---

## 5. Feature Creation Checklist

Work through layers inside-out: domain first, infrastructure last, then wire up UI.

### Step 1 — Domain entity

`features/<name>/domain/<name>.entity.ts`

```typescript
export class Employee {
  constructor(private readonly props: EmployeeProps) {}
  get id() { return this.props.id; }
  // enforce invariants in methods, throw DomainError on invalid transitions
}
```

### Step 2 — Domain error type

`features/<name>/domain/errors/<name>.errors.ts`

```typescript
export type CreateEmployeeError =
  | { readonly kind: 'DuplicateEmployee'; readonly existingId: string; readonly message: string }
  | { readonly kind: 'InvalidRequest';    readonly reason: string;     readonly message: string };
```

### Step 3 — Port (interface + InjectionToken)

`features/<name>/application/ports/i-<name>.repository.ts`

```typescript
export interface IEmployeeRepository {
  getEmployees(): Promise<Employee[]>;
  createEmployee(req: CreateEmployeeRequest): Promise<Result<Employee, CreateEmployeeError>>;
  deactivateEmployee(id: string): Promise<Result<void, DeactivateEmployeeError>>;
}
export const EMPLOYEE_REPOSITORY = new InjectionToken<IEmployeeRepository>('IEmployeeRepository');
```

### Step 4 — Use case

`features/<name>/application/use-cases/<action>-<name>.use-case.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class CreateEmployeeUseCase
  implements UseCase<CreateEmployeeRequest, Result<Employee, CreateEmployeeError>> {
  private readonly repo = inject(EMPLOYEE_REPOSITORY);
  execute(req: CreateEmployeeRequest): Promise<Result<Employee, CreateEmployeeError>> {
    return this.repo.createEmployee(req);
  }
}
```

### Step 5 — Repository + Mapper

`features/<name>/infrastructure/repositories/http-<name>.repository.ts`
`features/<name>/infrastructure/mappers/<name>.mapper.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class HttpEmployeeRepository implements IEmployeeRepository {
  private readonly http = inject(HttpClient);
  async createEmployee(req: CreateEmployeeRequest): Promise<Result<Employee, CreateEmployeeError>> {
    const dto = await firstValueFrom(this.http.post<EmployeeDto>('/api/employees', req));
    return ok(EmployeeMapper.toDomain(dto));
    // on known HTTP 409: return fail({ kind: 'DuplicateEmployee', ... })
  }
}
```

Provide the token in route providers or `app.config.ts`:
```typescript
{ provide: EMPLOYEE_REPOSITORY, useClass: HttpEmployeeRepository }
```

### Step 6 — ViewModel

`features/<name>/state/<name>.view-model.ts`

```typescript
@Injectable()
export class EmployeeViewModel extends ViewModelBase {
  private readonly createUseCase = inject(CreateEmployeeUseCase);

  readonly createError = signal<CreateEmployeeError | NetworkError | null>(null);
  private readonly _employees = signal<Employee[]>([]);
  readonly employees = this._employees.asReadonly();

  async createEmployee(req: CreateEmployeeRequest): Promise<void> {
    const result = await this.executeWithResult(() => this.createUseCase.execute(req));
    match(result,
      emp  => this._employees.update(list => [...list, emp]),
      err  => this.createError.set(err)
    );
  }
}
```

### Step 7 — Dumb component + Smart page

Dumb component: `input()` / `output()` only, no services.

Smart page: `inject()` ViewModel, `providers: [EmployeeViewModel]`, bind template to signals.

### Step 8 — Export public API

`features/<name>/index.ts`:

```typescript
export { Employee } from './domain/employee.entity';
export { EmployeeViewModel } from './state/employee.view-model';
export { EmployeePageComponent } from './ui/pages/employee-page.component';
// do NOT export ports, use cases, or infrastructure — they are internal
```

---

## 6. Refactor Checklist

1. Model the domain entity — rich class, guards, `DomainError` on invalid transitions
2. Define domain error types — discriminated union with `kind` + `message`
3. Define port interface + `InjectionToken`
4. Implement repository + mapper in infrastructure; provide the token
5. Write one use case per action; fallible ones return `Promise<Result<T, E>>`
6. Build the ViewModel: `ViewModelBase`, readonly signals, `executeWithResult`, typed error signal
7. Make the page a thin smart component (provides + injects VM)
8. Extract reusable UI into dumb components
9. Add tests (see TDD checklist below)
10. Update `index.ts` to export only the public API

---

## 7. TDD Checklist

Always write the failing test first. Confirm it fails. Then implement.

### Domain layer — no mocks, pure unit tests

```typescript
it('should throw DomainError when deactivating an already-inactive employee', () => {
  const emp = new Employee({ id: '1', status: 'inactive' });
  expect(() => emp.deactivate()).toThrow(DomainError);
});
```

### Use case layer — in-memory interpreter at the repository boundary

```typescript
// InMemoryEmployeeRepository enforces real constraints (no mocks)
it('should return DuplicateEmployee when employee already exists', async () => {
  const repo = new InMemoryEmployeeRepository([existingEmployee]);
  const useCase = new CreateEmployeeUseCase();
  TestBed.configureTestingModule({
    providers: [{ provide: EMPLOYEE_REPOSITORY, useValue: repo }]
  });
  const result = await TestBed.inject(CreateEmployeeUseCase).execute(duplicateRequest);
  expect(isOk(result)).toBe(false);
  expect((result as any).error.kind).toBe('DuplicateEmployee');
});
```

### ViewModel layer — stubs returning hardcoded Result values

```typescript
it('should populate createError signal on DuplicateEmployee', async () => {
  const stubUseCase = { execute: vi.fn().mockResolvedValue(
    fail({ kind: 'DuplicateEmployee', existingId: '1', message: 'Already exists' })
  )};
  // provide via TestBed, act, assert signal value
  expect(vm.createError()?.kind).toBe('DuplicateEmployee');
});
```

### Component layer — mock ViewModel signals

Use `@testing-library/angular` to render the component, mock VM signals, assert on DOM.

### E2E — Playwright, no mocks

Cover happy path and critical error flows (duplicate, validation error, network failure).

---

## 8. Conventions

### File naming

```
employee.entity.ts              create-employee.errors.ts
i-employee.repository.ts        create-employee.use-case.ts
http-employee.repository.ts     employee.mapper.ts
employee.view-model.ts          employee-page.component.ts
employee-card.component.ts
```

### Signal rules

- `signal()` for writable state; expose via `.asReadonly()`
- `computed()` for derived state — never compute in templates
- `set()` / `update()` only — never `mutate()`
- State mutation through `setProperty()` / `updateProperty()` / `batchUpdate()` (from `ObservableObject`)

### Template rules

- `@if` / `@else` / `@for` / `@switch` — never `*ngIf` / `*ngFor` / `*ngSwitch`
- `[class.active]="isActive()"` — never `[ngClass]`
- `[style.width.px]="width()"` — never `[ngStyle]`
- Always `track` in `@for` by a stable unique id
- No computation in templates — move to `computed()`

### Component rules

- No explicit `standalone: true` (Angular v20+ default)
- No explicit `ChangeDetectionStrategy.OnPush` (Angular v22+ default)
- `input()` / `input.required()` / `output()` — not `@Input()` / `@Output()`
- `host` object in `@Component` — not `@HostBinding` / `@HostListener`
- `inject()` — not constructor injection

---

## 9. Reference Files

| File | Purpose |
|------|---------|
| `src/app/core/base/observable-object.ts` | `ObservableObject` base — `setProperty()` / `updateProperty()` |
| `src/app/core/base/view-model.base.ts` | `ViewModelBase` — `isLoading`, `error`, `executeWithResult` |
| `src/app/core/base/use-case.base.ts` | `UseCase<TParam, TResult>` interface |
| `src/app/shared/kernel/result.ts` | `Result<T,E>`, `ok`, `fail`, `isOk`, `match`, `NetworkError` |
| `docs/ENTERPRISE_ANGULAR_ARCHITECTURE.md` | Full narrative, rationale, and extended code examples |
