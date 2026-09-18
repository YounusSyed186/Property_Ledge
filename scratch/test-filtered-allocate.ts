import { calculateAutoAllocation } from '../modules/finance/domain/auto-allocate';

const allLeases = [
  { id: 'l1', property_id: 'prop-sunshine', property_name: 'sunShine', tenant_name: 'Tenant A', rent_amount: 150 },
  { id: 'l2', property_id: 'prop-sunshine', property_name: 'sunShine', tenant_name: 'Tenant B', rent_amount: 234 },
  { id: 'l3', property_id: 'prop-sunshine', property_name: 'sunShine', tenant_name: 'Tenant C', rent_amount: 160 },
  { id: 'l4', property_id: 'prop-sunshine', property_name: 'sunShine', tenant_name: 'Tenant D', rent_amount: 160 },
  { id: 'l5', property_id: 'prop-other', property_name: 'New Test Property', tenant_name: 'Tenant E', rent_amount: 300 },
];

console.log('--- TEST: Allocate $324 filtering specifically for property "sunShine" ---');
const selectedPropertyId = 'prop-sunshine';
const filteredLeases = allLeases.filter(l => l.property_id === selectedPropertyId);

const res = calculateAutoAllocation(324, filteredLeases, 'pro_rata');
console.log('Target Property:', selectedPropertyId);
console.log('Total Payment:', res.total_payment);
console.log('Total Allocated:', res.total_allocated);
console.log('Allocations Breakdown (Only sunShine leases):');
res.allocations.forEach(a => {
  console.log(` - ${a.property_name} (${a.tenant_name}): $${a.allocated_amount} (${a.percentage.toFixed(1)}%)`);
});
