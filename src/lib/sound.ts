'use client'

let audioCtx: AudioContext | null = null
let lastPlayAt = 0

export function playBidSound() {
  const now = Date.now()
  if (now - lastPlayAt < 400) return
  lastPlayAt = now
  try {
    if (!audioCtx) audioCtx = new AudioContext()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.setValueAtTime(880, audioCtx.currentTime)
    osc.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.08)
    osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.16)
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.35)
  } catch {
    // silent fallback
  }
}

/** نغمة خفيفة لمرة واحدة (يُفضّل استدعاؤها من مكوّن مع حارس useRef) */
export function playCountdownTickOnce() {
  try {
    if (!audioCtx) audioCtx = new AudioContext()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.setValueAtTime(660, audioCtx.currentTime)
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.15)
  } catch {
    /* ignore */
  }
}
