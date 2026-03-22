export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Product price (winning bid) + 5% commission + 15% VAT on commission */
export function paymentBreakdown(productAmount: number) {
  const amount = round2(Number(productAmount))
  const commission = round2(amount * 0.05)
  const vat = round2(commission * 0.15)
  const total = round2(amount + commission + vat)
  return { productAmount: amount, commission, vat, total }
}
