'use client'
import { useState, useEffect } from 'react'

const MOCK_AUCTION = {
  id: '1',
  title: 'ايفون 15 برو ماكس 256GB',
  description: 'ايفون 15 برو ماكس جديد غير مستخدم، مع الكرتون والشاحن الأصلي. اللون تيتانيوم أزرق. الضمان ساري لمدة سنة.',
  currentBid: 3500,
  startPrice: 2500,
  bidIncrement: 100,
  bidCount: 12,
  city: 'الرياض',
  category: 'إلكترونيات',
  condition: 'جديد',
  seller: { name: 'أبو محمد', rating: 4.8, sales: 23 },
  endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
  bids: [
    { user: 'مزايد***1', amount: 3500, time: '2:45 PM' },
    { user: 'مزايد***2', amount: 3400, time: '2:30 PM' },
    { user: 'مزايد***3', amount: 3300, time: '2:15 PM' },
    { user: 'مزايد***4', amount: 3200, time: '1:50 PM' },
    { user: 'مزايد***5', amount: 3100, time: '1:30 PM' },
  ]
}

export default function AuctionPage() {
  const auction = MOCK_AUCTION
  const [selectedImage, setSelectedImage] = useState(0)
  const [bidAmount, setBidAmount] = useState(auction.currentBid + auction.bidIncrement)
  const [showBids, setShowBids] = useState(false)
  const [bidPlaced, setBidPlaced] = useState(false)
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(auction.endsAt).getTime() - Date.now()
      if (diff <= 0) { clearInterval(timer); return }
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000)
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [auction.endsAt])

  const handleBid = () => {
    setBidPlaced(true)
    setTimeout(() => setBidPlaced(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="sticky top-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => window.history.back()} className="text-gray-600 text-2xl">&#8594;</button>
        <h1 className="font-bold text-lg">تفاصيل المزاد</h1>
        <button className="text-gray-600 text-2xl">&#9825;</button>
      </div>

      <div className="bg-white">
        <div className="h-72 bg-gray-200 flex items-center justify-center">
          <span className="text-7xl">📱</span>
        </div>
        <div className="flex gap-2 p-3">
          {[0, 1, 2].map((i) => (
            <button key={i} onClick={() => setSelectedImage(i)} className={'w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center border-2 ' + (selectedImage === i ? 'border-amber-500' : 'border-transparent')}>
              <span className="text-2xl">📱</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white mt-2 p-4">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900 flex-1">{auction.title}</h2>
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full mr-2">{auction.condition}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
          <span>📍 {auction.city}</span>
          <span>📁 {auction.category}</span>
          <span>👤 {auction.bidCount} مزايد</span>
        </div>

        <div className="bg-red-50 rounded-xl p-4 mb-4">
          <p className="text-center text-sm text-red-500 mb-2">ينتهي المزاد خلال</p>
          <div className="flex gap-2 justify-center" dir="ltr">
            {[
              { val: timeLeft.hours, label: 'ساعة' },
              { val: timeLeft.minutes, label: 'دقيقة' },
              { val: timeLeft.seconds, label: 'ثانية' }
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-lg px-3 py-2 text-center min-w-[60px]">
                <div className="text-xl font-bold text-red-600">{String(t.val).padStart(2, '0')}</div>
                <div className="text-xs text-red-400">{t.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">أعلى مزايدة حالياً</p>
              <p className="text-3xl font-bold text-amber-600">{auction.currentBid.toLocaleString()} <span className="text-base">ر.س</span></p>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-500">سعر البدء</p>
              <p className="text-lg text-gray-400 line-through">{auction.startPrice.toLocaleString()} ر.س</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setBidAmount(Math.max(auction.currentBid + auction.bidIncrement, bidAmount - auction.bidIncrement))} className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-600">-</button>
            <div className="flex-1 text-center">
              <input type="number" value={bidAmount} onChange={e => setBidAmount(Number(e.target.value))} className="w-full text-center text-2xl font-bold py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">الحد الأدنى: {(auction.currentBid + auction.bidIncrement).toLocaleString()} ر.س</p>
            </div>
            <button onClick={() => setBidAmount(bidAmount + auction.bidIncrement)} className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-600">+</button>
          </div>
          <button onClick={handleBid} disabled={bidAmount < auction.currentBid + auction.bidIncrement} className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold text-lg hover:bg-amber-600 disabled:opacity-50 transition-colors">
            {bidPlaced ? '✓ تم تقديم مزايدتك!' : 'زايد الآن'}
          </button>
        </div>
      </div>

      <div className="bg-white mt-2 p-4">
        <h3 className="font-bold text-lg mb-2">الوصف</h3>
        <p className="text-gray-600 leading-relaxed">{auction.description}</p>
      </div>

      <div className="bg-white mt-2 p-4">
        <h3 className="font-bold text-lg mb-3">البائع</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-xl">👤</div>
            <div>
              <p className="font-medium">{auction.seller.name}</p>
              <p className="text-sm text-gray-500">⭐ {auction.seller.rating} | {auction.seller.sales} عملية بيع</p>
            </div>
          </div>
          <button className="px-4 py-2 border border-amber-500 text-amber-500 rounded-lg text-sm hover:bg-amber-50">تواصل</button>
        </div>
      </div>

      <div className="bg-white mt-2 p-4 mb-20">
        <button onClick={() => setShowBids(!showBids)} className="flex items-center justify-between w-full">
          <h3 className="font-bold text-lg">سجل المزايدات ({auction.bids.length})</h3>
          <span className="text-gray-400">{showBids ? '▲' : '▼'}</span>
        </button>
        {showBids && (
          <div className="mt-3 space-y-2">
            {auction.bids.map((bid, i) => (
              <div key={i} className={'flex items-center justify-between py-2 px-3 rounded-lg ' + (i === 0 ? 'bg-amber-50' : 'bg-gray-50')}>
                <div className="flex items-center gap-2">
                  {i === 0 && <span className="text-amber-500">👑</span>}
                  <span className="text-sm">{bid.user}</span>
                </div>
                <div className="text-left">
                  <span className="font-bold text-sm">{bid.amount.toLocaleString()} ر.س</span>
                  <span className="text-xs text-gray-400 mr-2">{bid.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {bidPlaced && (
        <div className="fixed bottom-20 left-4 right-4 bg-green-500 text-white text-center py-3 rounded-xl font-medium shadow-lg z-50">
          ✓ تم تقديم مزايدتك بنجاح!
        </div>
      )}
    </div>
  )
}
