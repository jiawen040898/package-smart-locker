export enum LockerSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

/**
 * Defines the ordering of locker sizes from smallest to largest.
 * Used by allocation strategies to determine fit.
 */
export const LOCKER_SIZE_ORDER: Record<LockerSize, number> = {
  [LockerSize.SMALL]: 1,
  [LockerSize.MEDIUM]: 2,
  [LockerSize.LARGE]: 3,
};
