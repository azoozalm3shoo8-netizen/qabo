const VAT_RATE = 0.15

export type VatBreakdownResult = {
  salePriceHalalas: number
  commissionHalalas: number
  vatOnCommissionHalalas: number
  buyerProtectionHalalas: number
  vatOnBuyerProtectionHalalas: number
  sellerReceivesHalalas: number
  buyerPaysHalalas: number
  totalVatHalalas: number
  isFreeperiod: boolean
  breakdown_ar: Record<string, string>
}

export function calculateVatBreakdown(params: {
  salePriceHalalas: number
  commissionRate: number
  buyerProtectionRate: number
  buyerProtectionCapHalalas: number
  isFreeperiod: boolean
}): VatBreakdownResult {
  const sale = Math.max(0, Math.round(params.salePriceHalalas))

  if (params.isFreeperiod) {
    return {
      salePriceHalalas: sale,
      commissionHalalas: 0,
      vatOnCommissionHalalas: 0,
      buyerProtectionHalalas: 0,
      vatOnBuyerProtectionHalalas: 0,
      sellerReceivesHalalas: sale,
      buyerPaysHalalas: sale,
      totalVatHalalas: 0,
      isFreeperiod: true,
      breakdown_ar: {
        sale: `${(sale / 100).toLocaleString('ar-SA')} ر.س`,
        commission: '0 ر.س (فترة مجانية)',
        vat: '0 ر.س',
        buyerTotal: `${(sale / 100).toLocaleString('ar-SA')} ر.س`,
        sellerNet: `${(sale / 100).toLocaleString('ar-SA')} ر.س`,
      },
    }
  }

  const commission = Math.max(Math.round(sale * params.commissionRate), 1000)
  const vatOnCommission = Math.round(commission * VAT_RATE)

  let buyerProtection = Math.round(sale * params.buyerProtectionRate)
  if (params.buyerProtectionCapHalalas > 0) {
    buyerProtection = Math.min(buyerProtection, params.buyerProtectionCapHalalas)
  }
  const vatOnBuyerProtection = Math.round(buyerProtection * VAT_RATE)

  const sellerReceives = sale - commission - vatOnCommission
  const buyerPays = sale + buyerProtection + vatOnBuyerProtection

  return {
    salePriceHalalas: sale,
    commissionHalalas: commission,
    vatOnCommissionHalalas: vatOnCommission,
    buyerProtectionHalalas: buyerProtection,
    vatOnBuyerProtectionHalalas: vatOnBuyerProtection,
    sellerReceivesHalalas: Math.max(0, sellerReceives),
    buyerPaysHalalas: buyerPays,
    totalVatHalalas: vatOnCommission + vatOnBuyerProtection,
    isFreeperiod: false,
    breakdown_ar: {
      sale: `${(sale / 100).toLocaleString('ar-SA')} ر.س`,
      commission: `${(commission / 100).toLocaleString('ar-SA')} ر.س (${Math.round(params.commissionRate * 100)}٪)`,
      vatOnCommission: `${(vatOnCommission / 100).toLocaleString('ar-SA')} ر.س (ضريبة 15٪ على العمولة)`,
      buyerProtection: `${(buyerProtection / 100).toLocaleString('ar-SA')} ر.س`,
      vatOnBuyerProtection: `${(vatOnBuyerProtection / 100).toLocaleString('ar-SA')} ر.س`,
      buyerTotal: `${(buyerPays / 100).toLocaleString('ar-SA')} ر.س`,
      sellerNet: `${(Math.max(0, sellerReceives) / 100).toLocaleString('ar-SA')} ر.س`,
    },
  }
}
