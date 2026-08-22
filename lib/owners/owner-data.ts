export interface PropertyData {
  address: string;
  rent: string;
  status: "Occupied" | "Vacant";
  occupancy: string;
}

export interface LeaseData {
  address: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Vacant" | "Lease required";
}

export interface TenantData {
  name: string;
  address: string;
  location: string;
  leaseRange: string;
  rent: string;
  status: "Active" | "Inactive";
}

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  type: "rent" | "inspection" | "invoice" | "renewal" | "maintenance";
}

export interface FinancialMetric {
  category: string;
  amount: number;
}

export interface WorkflowStep {
  number: string;
  title: string;
  description: string;
}

export interface ServiceItem {
  title: string;
  description: string;
  href: string;
}

export interface ExploreItem {
  title: string;
  description: string;
  href: string;
}

// Reusable Demo Datasets
export const properties: PropertyData[] = [
  { address: "24 Smith Street, Sydney", rent: "$3,240", status: "Occupied", occupancy: "100%" },
  { address: "18 King Street, Melbourne", rent: "$4,120", status: "Occupied", occupancy: "100%" },
  { address: "72 George Street, Brisbane", rent: "$2,850", status: "Vacant", occupancy: "0%" },
  { address: "14 Collins Street, Melbourne", rent: "$3,600", status: "Occupied", occupancy: "100%" },
  { address: "8 William Street, Sydney", rent: "$2,900", status: "Occupied", occupancy: "100%" }
];

export const leases: LeaseData[] = [
  { address: "24 Smith Street", tenantName: "Sarah Williams", startDate: "12 Feb 2026", endDate: "11 Feb 2027", status: "Active" },
  { address: "18 King Street", tenantName: "James Carter", startDate: "01 Mar 2026", endDate: "28 Feb 2027", status: "Active" },
  { address: "72 George Street", tenantName: "-", startDate: "-", endDate: "-", status: "Lease required" }
];

export const tenants: TenantData[] = [
  {
    name: "Sarah Williams",
    address: "24 Smith Street, Sydney",
    location: "Sydney NSW",
    leaseRange: "12 Feb 2026 — 11 Feb 2027",
    rent: "$3,240 / month",
    status: "Active"
  }
];

export const timelineEvents: TimelineEvent[] = [
  { date: "AUG 12", title: "Rent received", description: "$3,240 received", type: "rent" },
  { date: "AUG 08", title: "Inspection completed", description: "Routine inspection", type: "inspection" },
  { date: "JUL 30", title: "Invoice generated", description: "INV-10294", type: "invoice" },
  { date: "JUL 15", title: "Lease renewed", description: "New lease signed", type: "renewal" },
  { date: "JUN 28", title: "Maintenance completed", description: "Plumbing repair", type: "maintenance" }
];

export const financialMetrics = {
  income: 58420,
  expenses: 9840,
  netIncome: 48580,
  breakdown: [
    { category: "Maintenance", amount: 3420 },
    { category: "Repairs", amount: 2180 },
    { category: "Insurance", amount: 2400 },
    { category: "Other", amount: 1840 }
  ]
};

export const workflowSteps: WorkflowStep[] = [
  { number: "01", title: "Add Property", description: "Enter address and upload details." },
  { number: "02", title: "Add Tenant", description: "Input tenant contact information." },
  { number: "03", title: "Create Lease", description: "Generate lease dates and details." },
  { number: "04", title: "Collect Rent", description: "Automatic payment tracking." },
  { number: "05", title: "Track Expenses", description: "Log invoices and repair bills." },
  { number: "06", title: "Inspect Property", description: "Conduct digital checklists." },
  { number: "07", title: "Review Performance", description: "View automated growth reports." }
];

export const services: ServiceItem[] = [
  { title: "For Property Owners", description: "Manage your entire portfolio from one place.", href: "/solutions/owners" },
  { title: "Property Portfolio", description: "See every property at a glance.", href: "/#platform" },
  { title: "Rent & Payments", description: "Track rental income and outstanding payments.", href: "/#platform" },
  { title: "Leases", description: "Keep every lease organised and accessible.", href: "/#platform" },
  { title: "Inspections", description: "Record property conditions and inspection activity.", href: "/#platform" },
  { title: "Financial Reporting", description: "Understand property income and expenses.", href: "/#platform" }
];

export const exploreItems: ExploreItem[] = [
  { title: "Solutions", description: "How PropertyLedge works.", href: "/#platform" },
  { title: "Features", description: "Explore the platform.", href: "/#platform" },
  { title: "Security", description: "How your property data is protected.", href: "/#platform" },
  { title: "Resources", description: "Guides and helpful information.", href: "/#platform" }
];
