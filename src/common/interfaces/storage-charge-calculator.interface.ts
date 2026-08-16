export const STORAGE_CHARGE_CALCULATOR = Symbol('STORAGE_CHARGE_CALCULATOR');

export interface StorageChargeBreakdown {
  totalCharge: number;
  currency: string;
  daysStored: number;
  breakdown: {
    tier: string;
    days: number;
    ratePerDay: number;
    subtotal: number;
  }[];
}

/**
 * Strategy interface for calculating storage charges.
 * Implementations define the pricing rules (tiered, flat-rate, etc.).
 */
export interface IStorageChargeCalculator {
  /**
   * Calculates the storage charge based on duration in the locker.
   * @param storedAt - When the package was placed in the locker
   * @param retrievedAt - When the package was retrieved
   * @returns Breakdown of charges with total
   */
  calculate(storedAt: Date, retrievedAt: Date): StorageChargeBreakdown;
}
