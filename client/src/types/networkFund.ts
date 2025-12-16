export interface NetworkFundStats {
  totalBalance: string;
  totalAllocated: string;
  totalDistributed: string;
  pendingDistribution: string;
}

export interface NetworkFundOperation {
  id: string;
  type: 'allocate' | 'distribute' | 'withdraw';
  amount: string;
  orderId?: string;
  userId?: string;
  timestamp: string;
  reason?: string;
}

export interface NetworkFundAllocation {
  totalFundRub: string;
  referralBonusesRub: string;
  binaryBonusesRub: string;
  rankBonusesRub: string;
  unallocatedRub: string;
}
