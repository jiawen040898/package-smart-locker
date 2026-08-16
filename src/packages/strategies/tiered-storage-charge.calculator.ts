import { Injectable } from '@nestjs/common';
import type { IStorageChargeCalculator, StorageChargeBreakdown } from '../../common/interfaces';

interface PricingTier {
  label: string;
  maxDays: number; // Upper bound of this tier (inclusive). Use Infinity for uncapped.
  ratePerDay: number;
}

/**
 * Calculates storage charges using a tiered pricing model.
 *
 * Default tiers (configurable via constructor):
 * - Days 1-5:  X units/day
 * - Days 6-10: 2X units/day
 * - Days 11+:  3X units/day
 *
 * A "day" is defined as each 24-hour period from the time the package was stored.
 * Partial days are rounded up (e.g., 1 hour = 1 day, 25 hours = 2 days).
 */
@Injectable()
export class TieredStorageChargeCalculator implements IStorageChargeCalculator {
  private readonly baseRate: number;
  private readonly currency: string;
  private readonly tiers: PricingTier[];

  constructor(baseRate: number = 2, currency: string = 'MYR') {
    this.baseRate = baseRate;
    this.currency = currency;
    this.tiers = [
      { label: 'Standard (Days 1-5)', maxDays: 5, ratePerDay: this.baseRate },
      { label: 'Extended (Days 6-10)', maxDays: 10, ratePerDay: this.baseRate * 2 },
      { label: 'Overdue (Days 11+)', maxDays: Infinity, ratePerDay: this.baseRate * 3 },
    ];
  }

  calculate(storedAt: Date, retrievedAt: Date): StorageChargeBreakdown {
    const daysStored = this.calculateDaysStored(storedAt, retrievedAt);

    const breakdown: StorageChargeBreakdown['breakdown'] = [];
    let remainingDays = daysStored;
    let previousTierMax = 0;

    for (const tier of this.tiers) {
      if (remainingDays <= 0) break;

      const tierCapacity = tier.maxDays === Infinity
        ? remainingDays
        : tier.maxDays - previousTierMax;

      const daysInTier = Math.min(remainingDays, tierCapacity);

      if (daysInTier > 0) {
        breakdown.push({
          tier: tier.label,
          days: daysInTier,
          ratePerDay: tier.ratePerDay,
          subtotal: daysInTier * tier.ratePerDay,
        });
      }

      remainingDays -= daysInTier;
      previousTierMax = tier.maxDays;
    }

    const totalCharge = breakdown.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      totalCharge,
      currency: this.currency,
      daysStored,
      breakdown,
    };
  }

  /**
   * Calculates the number of days stored, rounding up partial days.
   * Each 24-hour period from storedAt counts as one day.
   * A package retrieved within the first 24 hours = 1 day.
   */
  private calculateDaysStored(storedAt: Date, retrievedAt: Date): number {
    const diffMs = retrievedAt.getTime() - storedAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.ceil(diffHours / 24);
  }
}
