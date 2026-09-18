import { calculateAutoAllocation } from '../modules/finance/domain/auto-allocate';

const leases = [
  { id: 'l1', property_id: 'p1', property_name: '102 Street Rd', tenant_name: 'Jessica Watson', rent_amount: 200 },
  { id: 'l2', property_id: 'p2', property_name: '45 Ocean View Dr', tenant_name: 'David Miller', rent_amount: 200 },
  { id: 'l3', property_id: 'p3', property_name: '88 Collins St', tenant_name: 'Apex Tech', rent_amount: 200 },
  { id: 'l4', property_id: 'p4', property_name: '12 George St', tenant_name: 'Sarah Smith', rent_amount: 200 },
  { id: 'l5', property_id: 'p5', property_name: '5 Park Ave', tenant_name: 'John Doe', rent_amount: 200 },
];

console.log('--- TEST 1: $1,000 lump sum over 5 x $200 leases (equal_obligation) ---');
const res1 = calculateAutoAllocation(1000, leases, 'equal_obligation');
console.log('Total Payment:', res1.total_payment);
console.log('Total Allocated:', res1.total_allocated);
console.log('Remaining Unallocated:', res1.remaining_unallocated);
console.log('Allocations Breakdown:');
res1.allocations.forEach(a => {
  console.log(` - ${a.property_name} (${a.tenant_name}): $${a.allocated_amount} (${a.percentage.toFixed(1)}%)`);
});

console.log('\n--- TEST 2: $1,000 lump sum over variable rent amounts (pro_rata) ---');
const variableLeases = [
  { id: 'l1', property_id: 'p1', property_name: 'Apartment A', rent_amount: 200 },
  { id: 'l2', property_id: 'p2', property_name: 'House B', rent_amount: 300 },
  { id: 'l3', property_id: 'p3', property_name: 'Commercial C', rent_amount: 500 },
];
const res2 = calculateAutoAllocation(1000, variableLeases, 'pro_rata');
console.log('Total Payment:', res2.total_payment);
console.log('Total Allocated:', res2.total_allocated);
console.log('Allocations Breakdown:');
res2.allocations.forEach(a => {
  console.log(` - ${a.property_name}: $${a.allocated_amount} (${a.percentage.toFixed(1)}%)`);
});
