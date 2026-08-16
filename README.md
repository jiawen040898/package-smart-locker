# Smart Package Locker Management System

A backend system that manages smart package lockers, allowing delivery agents to store packages and customers to retrieve them using pickup codes. Built with NestJS + TypeScript, focusing on clean architecture, SOLID principles, and production readiness.

## Getting Started

### Prerequisites

- Node.js >= 18
- Yarn

### Installation

```bash
yarn install
```

### Running the Application

```bash
yarn start
```

The application runs on `http://localhost:3000`.  
Swagger UI is available at `http://localhost:3000/api` for interactive API testing.

### Running Tests

```bash
# Unit tests (48 tests)
yarn test

# E2E tests (21 tests)
yarn test:e2e

# Test coverage
yarn test:cov
```

## API Overview

| Method | Endpoint                  | Role            | Description                                          |
|--------|---------------------------|-----------------|------------------------------------------------------|
| GET    | /lockers                  | Admin           | List all lockers with status and location            |
| POST   | /lockers                  | Admin           | Add a new locker to the system                       |
| POST   | /packages/deliver         | Delivery Agent  | Store a package, returns pickup code & location      |
| POST   | /packages/retrieve/check  | Customer        | Validate code & view storage charge (locker locked)  |
| POST   | /packages/retrieve/confirm| Customer        | Pay storage charge & retrieve package (locker opens) |

### Retrieval Flow (Two-Step)

```
Customer arrives → /retrieve/check → sees charge → /retrieve/confirm → pays → locker opens
```

1. **Check**: Customer provides locker ID + pickup code. System validates and returns the storage charge breakdown. Locker stays locked.
2. **Confirm**: Customer confirms payment. System processes payment, releases the package, and frees the locker.

## Design Decisions

### Architecture

The system follows a **modular architecture** with clear separation of concerns:

```
src/
├── common/
│   ├── enums/           # LockerSize, LockerStatus, PackageStatus
│   ├── exceptions/      # Domain-specific HTTP exceptions
│   ├── interfaces/      # Repository, strategy, service contracts
│   └── locks/           # Mutex for concurrency control
├── lockers/
│   ├── entities/        # Locker entity (id, size, location, status)
│   ├── repositories/    # In-memory locker repository
│   ├── strategies/      # SmallestFitAllocationStrategy
│   └── dto/             # CreateLockerDto
├── packages/
│   ├── entities/        # Package entity (with expiry)
│   ├── repositories/    # In-memory package repository
│   ├── services/        # Delivery, retrieval, pickup code services
│   ├── strategies/      # TieredStorageChargeCalculator
│   └── dto/             # DeliverPackageDto, RetrievePackageDto
├── notifications/       # INotificationService + console stub
├── payments/            # IPaymentService + console stub
└── main.ts              # Bootstrap with Swagger & validation
```

### SOLID Principles Applied

- **Single Responsibility**: Each service handles one concern (delivery, retrieval, code generation, charge calculation). Entities encapsulate their own state transitions.
- **Open/Closed**: Strategies and services are extensible via interfaces — add new allocation strategies, charge calculators, or payment providers without modifying existing code.
- **Liskov Substitution**: All interface implementations are freely interchangeable (e.g., swap `InMemoryLockerRepository` for `PostgresLockerRepository`).
- **Interface Segregation**: Separate interfaces for each concern (`ILockerRepository`, `IPackageRepository`, `ILockerAllocationStrategy`, `INotificationService`, `IPaymentService`, `IStorageChargeCalculator`).
- **Dependency Inversion**: Services depend on abstractions (interfaces injected via DI), not concrete implementations.

### Design Patterns

- **Strategy Pattern** (x2):
  - `ILockerAllocationStrategy` → `SmallestFitAllocationStrategy` (assigns smallest locker that fits)
  - `IStorageChargeCalculator` → `TieredStorageChargeCalculator` (tiered daily pricing)
- **Repository Pattern**: Data access abstracted behind interfaces. In-memory implementations are easily swappable for database-backed ones.
- **Mutex Pattern**: In-process lock for concurrent locker allocation to prevent race conditions.

### Key Features

1. **Smallest-fit locker allocation** — Optimizes space by always assigning the smallest locker that can accommodate the package.
2. **Pickup code with expiry** — 6-character alphanumeric codes (excluding confusing chars I, O, 0, 1). Expires after 48 hours.
3. **Locker location** — Each locker has a physical location. Included in notifications so customers know where to go.
4. **Tiered storage charges** — Charged per 24-hour period (rounded up):
   - Days 1–5: 2 MYR/day
   - Days 6–10: 4 MYR/day
   - Days 11+: 6 MYR/day
5. **Two-step retrieval** — Customer sees charge before paying. Payment must succeed before locker opens.
6. **Payment handling** — `IPaymentService` abstraction. Failed payments keep the locker locked; customer can retry.
7. **Notification service** — `INotificationService` abstraction. Console stub logs pickup details (location, code, expiry).
8. **Concurrent request handling** — Mutex lock ensures two delivery agents never get assigned the same locker, even under simultaneous requests.

### Concurrency Handling

Node.js is single-threaded but async operations can interleave. Without protection:

```
Request A: finds L-001 available → (yields) → assigns L-001
Request B: finds L-001 available → (yields) → assigns L-001  ← CONFLICT!
```

Solution: A mutex wraps the "find available locker + mark as occupied" operation, making it atomic:

```typescript
await this.allocationMutex.acquire();
try {
  const available = this.lockerRepository.findAll().filter(l => l.isAvailable);
  const selected = this.allocationStrategy.allocate(packageSize, available);
  this.lockerRepository.updateStatus(selected.id, LockerStatus.OCCUPIED);
} finally {
  this.allocationMutex.release();
}
```

For a distributed system (multiple instances), this would be replaced with Redis `SETNX` or PostgreSQL `SELECT ... FOR UPDATE`.

## Assumptions

- Single locker station (no multi-location routing).
- Locker IDs are human-readable (e.g., "L-001").
- Each locker has a physical location for customer navigation.
- Each locker holds exactly one package at a time.
- Pickup codes are single-use and expire after 48 hours.
- Notification (SMS/email) is external — interface provided with console stub.
- Payment processing is external — interface provided with console stub.
- No authentication/authorization — roles differentiated by endpoint usage.
- Storage charges are paid by the customer at retrieval time.

## Trade-offs Considered

- **In-memory vs. database**: Chose in-memory to showcase clean architecture and DI. Data resets on restart — acceptable for demonstrating engineering principles.
- **Mutex vs. database locks**: In-process mutex works for single-instance. Documented the distributed alternative (Redis/PostgreSQL locks).
- **No authentication**: Would add complexity without demonstrating core domain logic.
- **Pickup code uniqueness**: Random generation without collision checking. With 32^6 (~1 billion) possibilities and few active packages, collision is negligible.
- **Payment always succeeds in stub**: Keeps system predictable for testing. Failure handling is proven via unit tests with mocked failures.


## Test Coverage

### Unit Tests (48 tests)
- Mutex concurrency control (4 tests)
- Smallest-fit allocation strategy (8 tests)
- Package delivery service + concurrency (9 tests)
- Package retrieval service + payment handling (13 tests)
- Tiered storage charge calculator (11 tests)
- Pickup code generation (4 tests)

### E2E Tests (21 tests)
- Locker management endpoints
- Package delivery with location and expiry
- Two-step retrieval flow (check → confirm)
- Storage charge and payment in responses
- Concurrent delivery requests (no duplicate locker assignment)
- Edge cases: full lockers, invalid codes, double retrieval, missing fields
