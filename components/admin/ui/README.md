# PropertyLedge Design System

Canonical UI primitives live in this folder. Use these tokens and components for consistent spacing, typography, and layout across dashboard and admin surfaces.

## Typography

| Token | Class | Usage |
|-------|-------|-------|
| Page title | `text-page-title font-heading` | Top-level page headings |
| Card title | `text-card-title font-heading` | Section/card headings |
| Body | `text-body` | Default body copy |
| Body small | `text-body-sm` | Secondary text |
| Caption | `text-caption` | Labels, metadata |
| Metadata | `text-metadata` | Timestamps, hints |

### Workspace compact headers

| Token | Class | Usage |
|-------|-------|-------|
| Workspace title | `workspace-page-title` | In-shell page titles |
| Workspace subtitle | `workspace-page-subtitle` | In-shell descriptions |

## Spacing

- Page padding: `p-4` (dashboard shell) or `PageContainer`
- Section gap: `space-y-6` between major blocks
- Card padding: `p-4` to `p-5`
- Inline actions gap: `gap-2` or `gap-2.5`

## Radius & borders

- Cards/surfaces: `rounded-xl border border-admin-border`
- Buttons/inputs: `rounded-lg`
- Pills/badges: `rounded-md`

## Colors

Use semantic tokens from `globals.css`:

- `admin-foreground` / `admin-muted` — text
- `admin-surface` / `admin-background` — backgrounds
- `admin-border` — borders
- `admin-primary` / `admin-success` / `admin-danger` — actions & states

## Canonical composites

Prefer these over ad-hoc headers:

- `components/ui/PageHeader.tsx` — re-exports admin `PageHeader` / `WorkspacePageHeader`
- `components/ui/EmptyState.tsx` — `page | grid | inline` variants
- `components/ui/skeletons/` — `PageSkeleton`, `TableSkeleton`, `DetailSkeleton`, `TeamSkeleton`

## Loading patterns

1. Route-level: `loading.tsx` with skeleton presets
2. Shell: render chrome immediately; skeleton only in main pane
3. Data sections: `TableSkeleton` or `LoadingState` from `States.tsx`
