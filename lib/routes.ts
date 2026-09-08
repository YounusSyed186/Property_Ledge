/**
 * Centralized Route Builders.
 * Single source of truth for application URLs.
 */

export const routes = {
  leases: {
    list: () => '/dashboard/leases',
    new: () => '/dashboard/leases',
    detail: (leaseId: string) => `/dashboard/leases/${leaseId}`,
    edit: (leaseId: string) => `/dashboard/leases/${leaseId}`,
    renew: (leaseId: string) => `/dashboard/leases/${leaseId}/renew`,
  },
  tenants: {
    list: () => '/dashboard/people',
    detail: (tenantId: string) => `/dashboard/people/${tenantId}`,
  },
  properties: {
    list: () => '/dashboard/properties',
    detail: (propertyId: string) => `/dashboard/properties/${propertyId}`,
    new: () => '/dashboard/properties/new',
  },
  money: {
    invoices: () => '/dashboard/invoices',
    payments: () => '/dashboard/money?tab=payments',
    expenses: () => '/dashboard/money?tab=expenses',
  },
  invoices: {
    list: () => '/dashboard/invoices',
    detail: (id: string) => `/dashboard/invoices?id=${id}`,
  },
  automations: {
    list: () => '/dashboard/automations',
  },
} as const;
