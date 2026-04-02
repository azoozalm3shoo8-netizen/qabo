import { CommissionTiersDisplay } from '@/components/auction/CommissionTiersDisplay'
import { SellerProfileCard } from '@/components/seller/SellerProfileCard'

export default function DashboardSellerPage() {
  const demo = {
    trust_score: 120,
    trust_level: 'gold' as const,
    successful_sales: 12,
    cancelled_sales: 1,
    total_revenue: 2_400_000,
    iban: 'SA0380000000608010167519',
  }
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#1B7F7A]">ملف البائع</h1>
      <SellerProfileCard profile={demo} />
      <CommissionTiersDisplay />
    </div>
  )
}
