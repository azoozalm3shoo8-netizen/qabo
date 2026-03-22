export function auctionCountdownParts(endsAt: string, status: string) {
  if (status && status !== 'active') {
    return { ended: true, hours: 0, minutes: 0, seconds: 0 }
  }
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return { ended: true, hours: 0, minutes: 0, seconds: 0 }
  return {
    ended: false,
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

export function auctionCountdownLabel(endsAt: string, status: string) {
  const p = auctionCountdownParts(endsAt, status)
  if (p.ended) return 'انتهى'
  return `${p.hours}س ${p.minutes}د ${p.seconds}ث`
}
