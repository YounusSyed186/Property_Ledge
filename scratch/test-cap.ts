import { calculateAutoAllocation } from '../modules/finance/domain/auto-allocate';

const leases = [
  { id: 'l1', property_id: 'p1', property_name: 'newTestProperty', rent_amount: 150 },
];

console.log('--- TEST: $324 Payment against $150 Rent Obligation ---');
const res = calculateAutoAllocation(324, leases, 'pro_rata');
console.log('Total Payment:', res.total_payment);
console.log('Total Allocated:', res.total_allocated);
console.log('Remaining Unallocated (Surplus):', res.remaining_unallocated);
console.log('Allocation for newTestProperty: $', res.allocations[0].allocated_amount);

console.log('\n--- TEST 2: Equal Obligation $324 against $150 Rent Obligation ---');
const res2 = calculateAutoAllocation(324, leases, 'equal_obligation');
console.log('Total Payment:', res2.total_payment);
console.log('Total Allocated:', res2.total_allocated);
console.log('Remaining Unallocated (Surplus):', res2.remaining_unallocated);
console.log('Allocation for newTestProperty: $', res2.allocations[0].allocated_amount);
