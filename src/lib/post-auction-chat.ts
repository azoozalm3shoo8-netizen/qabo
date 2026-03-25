/** Helpers for seller ↔ winner messaging (uses existing conversations API shape). */

export async function ensurePostAuctionConversation(
  userId: string,
  otherUserId: string,
  auctionId: string
): Promise<{ conversation_id: string }> {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      other_user_id: otherUserId,
      auction_id: auctionId,
    }),
  })
  const data = (await res.json()) as { conversation_id?: string; error?: string }
  if (!res.ok || !data.conversation_id) {
    throw new Error(data.error || 'تعذر فتح المحادثة')
  }
  return { conversation_id: data.conversation_id }
}
