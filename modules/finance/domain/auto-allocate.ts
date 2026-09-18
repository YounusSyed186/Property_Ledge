import { AllocationStrategy, AllocationItemDTO, PaymentAllocationResult } from './types';

export interface ActiveLeaseForAllocation {
  id: string;
  property_id: string;
  property_name: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  rent_amount: number;
}

/**
 * Calculates auto-allocation of a lump sum payment across active leases.
 * Strictly caps allocation for each lease at its rent obligation (`rent_amount`).
 * Any extra funds exceeding total rent obligations remain unallocated (surplus).
 */
export function calculateAutoAllocation(
  totalPayment: number,
  leases: ActiveLeaseForAllocation[],
  strategy: AllocationStrategy = 'equal_obligation'
): PaymentAllocationResult {
  const sanitizedPayment = Math.max(0, Number(totalPayment) || 0);

  if (!leases || leases.length === 0 || sanitizedPayment === 0) {
    return {
      total_payment: sanitizedPayment,
      total_allocated: 0,
      remaining_unallocated: sanitizedPayment,
      strategy,
      allocations: [],
    };
  }

  const totalRentObligation = leases.reduce((sum, l) => sum + Math.max(0, Number(l.rent_amount) || 0), 0);
  const allocations: AllocationItemDTO[] = [];

  if (strategy === 'pro_rata' && totalRentObligation > 0) {
    // Pro-rata allocation capped at total obligation or total payment (whichever is smaller)
    const effectiveAllocablePool = Math.min(sanitizedPayment, totalRentObligation);
    let allocatedSum = 0;

    leases.forEach((lease, index) => {
      const leaseRent = Math.max(0, Number(lease.rent_amount) || 0);
      const ratio = totalRentObligation > 0 ? leaseRent / totalRentObligation : 0;
      let rawAllocated = Math.round(effectiveAllocablePool * ratio * 100) / 100;

      // Ensure last item rounds cleanly without exceeding total obligation
      if (index === leases.length - 1) {
        rawAllocated = Math.max(0, Math.round((effectiveAllocablePool - allocatedSum) * 100) / 100);
      }

      // Strictly cap at lease rent obligation
      const cappedAllocated = Math.min(rawAllocated, leaseRent);
      allocatedSum += cappedAllocated;

      allocations.push({
        lease_id: lease.id,
        property_id: lease.property_id,
        property_name: lease.property_name,
        tenant_id: lease.tenant_id,
        tenant_name: lease.tenant_name,
        monthly_rent: leaseRent,
        allocated_amount: cappedAllocated,
        percentage: sanitizedPayment > 0 ? (cappedAllocated / sanitizedPayment) * 100 : 0,
      });
    });

    const totalAllocated = Math.min(sanitizedPayment, allocatedSum);
    return {
      total_payment: sanitizedPayment,
      total_allocated: totalAllocated,
      remaining_unallocated: Math.max(0, Math.round((sanitizedPayment - totalAllocated) * 100) / 100),
      strategy,
      allocations,
    };
  } else {
    // 'equal_obligation' strategy: fill rent amounts sequentially up to total payment
    let remainingToAllocate = sanitizedPayment;

    leases.forEach((lease) => {
      const leaseRent = Math.max(0, Number(lease.rent_amount) || 0);
      let allocatedForThisLease = 0;

      if (remainingToAllocate > 0 && leaseRent > 0) {
        // Cap allocation at lease's rent obligation
        allocatedForThisLease = Math.min(remainingToAllocate, leaseRent);
        remainingToAllocate = Math.max(0, Math.round((remainingToAllocate - allocatedForThisLease) * 100) / 100);
      }

      allocations.push({
        lease_id: lease.id,
        property_id: lease.property_id,
        property_name: lease.property_name,
        tenant_id: lease.tenant_id,
        tenant_name: lease.tenant_name,
        monthly_rent: leaseRent,
        allocated_amount: allocatedForThisLease,
        percentage: 0,
      });
    });

    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);

    allocations.forEach((item) => {
      item.percentage = sanitizedPayment > 0 ? (item.allocated_amount / sanitizedPayment) * 100 : 0;
    });

    return {
      total_payment: sanitizedPayment,
      total_allocated: totalAllocated,
      remaining_unallocated: Math.max(0, Math.round((sanitizedPayment - totalAllocated) * 100) / 100),
      strategy: 'equal_obligation',
      allocations,
    };
  }
}
