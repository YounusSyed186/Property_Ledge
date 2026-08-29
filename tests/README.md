# PropertyLedge V4 — Playwright End-to-End Test Suite Documentation

## Overview

This directory contains the production-grade **Playwright End-to-End (E2E) Test Suite** for PropertyLedge V4. The test suite validates user journeys, security controls, RBAC matrices, team management, multi-step property creation wizards, admin panel authorization, and multi-tenant IDOR boundaries against live development application logic.

---

## Directory Structure

```text
tests/
├── config/
│   └── test-env.ts            # Environment credentials & seed data constants
├── fixtures/
│   ├── auth.fixture.ts        # Custom Playwright authenticated context fixtures
│   └── data.fixture.ts        # Dynamic test payload generators
├── helpers/
│   ├── auth.helper.ts         # Login/Logout automation utilities
│   ├── team.helper.ts         # Team & invitation helpers
│   └── property.helper.ts     # Property wizard automation helpers
├── pages/                     # Page Object Models (POM)
│   ├── LoginPage.ts
│   ├── SignupPage.ts
│   ├── OnboardingPage.ts
│   ├── AdminDashboardPage.ts
│   ├── TeamPage.ts
│   └── PropertyWizardPage.ts
├── e2e/                       # Test Specification Suites
│   ├── 01-auth.spec.ts        # Authentication, sessions & redirects
│   ├── 02-onboarding.spec.ts  # Onboarding flow & legacy route redirects
│   ├── 03-admin.spec.ts       # Admin Panel overview, navigation & authorization
│   ├── 04-teams.spec.ts       # Team creation, invitations & seat usage
│   ├── 05-rbac.spec.ts        # Role-based permissions & matrix validation
│   ├── 06-properties.spec.ts  # Multi-step property creation & form validation
│   ├── 07-security.spec.ts    # Multi-tenant IDOR isolation & cross-property access
│   ├── 08-navigation.spec.ts  # Route navigation & Coming Soon placeholders
│   └── 09-regression.spec.ts  # Fast P0 regression suite
└── README.md                  # Test suite documentation
```

---

## Environment Setup & Seed Database

Make sure your local Supabase / PostgreSQL database has been seeded with `propertyledge_v3_1_seed_dev.sql`.

Default test accounts configured in `tests/config/test-env.ts`:
- **Super Admin**: `admin@test.com` / `AdminPassword123!`
- **Workspace Owner (Landlord)**: `landlord@test.com` / `TestPassword123!`
- **Restricted Agent**: `agent@test.com` / `TestPassword123!`
- **Platform Admin**: `admin@propertyledge.com.au` / `admin123`

---

## Execution Commands

### 1. Run Full E2E Test Suite
```bash
npx playwright test
```

### 2. Run Headed Mode (Visual Debugging)
```bash
npx playwright test --headed
```

### 3. Run Specific Test Suite
```bash
# Admin Panel Suite
npx playwright test tests/e2e/03-admin.spec.ts

# Security & IDOR Isolation Suite
npx playwright test tests/e2e/07-security.spec.ts

# Fast P0 Regression Suite
npx playwright test tests/e2e/09-regression.spec.ts
```

### 4. View Test Reports & Failure Traces
```bash
npx playwright show-report
```

---

## QA Bug Categorization & Taxonomy

When a test failure occurs, categorize the defect into one of the following categories:
- `P0 — SECURITY / AUTHORIZATION BUG`: Cross-tenant data leakage, RBAC bypass, unauthenticated access to admin routes.
- `P1 — CRITICAL WORKFLOW BUG`: Property creation wizard failure, login failure, broken redirect loops.
- `P2 — FUNCTIONAL BUG`: Toast notification failure, modal state mismatch, missing validation message.
- `P3 — MINOR / COSMETIC BUG`: Incorrect label text, alignment glitch, minor visual bug.
- `TEST INFRASTRUCTURE BUG`: Stale locator, environment timeout, dirty database state.
