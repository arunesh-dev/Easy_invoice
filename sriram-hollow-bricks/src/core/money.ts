/** Rupees → paise (integer). Safe for all realistic invoice amounts. */
export const toP = (rupees: number): number => Math.round(rupees * 100)

/** Paise → rupees (may be fractional). */
export const toR = (paise: number): number => paise / 100

/** Indian-locale currency string, no decimals when whole. */
export function formatINR(rupees: number): string {
  const hasPaise = Math.abs(toP(rupees)) % 100 !== 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rupees)
}
