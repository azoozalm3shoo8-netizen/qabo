'use client'

const COLORS = ['#1B7F7A', '#FF8C42', '#F5A623', '#FFFFFF', '#156661']

export function triggerConfetti(): void {
  if (typeof document === 'undefined') return

  const overlay = document.createElement('div')
  overlay.setAttribute('aria-hidden', 'true')
  overlay.className = 'fixed inset-0 pointer-events-none z-[100] overflow-hidden'

  const count = 38
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div')
    const left = Math.random() * 100
    const size = 6 + Math.random() * 8
    const delay = Math.random() * 0.4
    const rot = Math.random() * 360
    const round = Math.random() > 0.45
    p.style.cssText = [
      'position:absolute',
      `left:${left}%`,
      'top:-24px',
      `width:${size}px`,
      `height:${round ? size : size * 0.6}px`,
      `background:${COLORS[i % COLORS.length]}`,
      'opacity:0.95',
      round ? 'border-radius:50%' : 'border-radius:2px',
      `transform:rotate(${rot}deg)`,
      `animation:qabboo-confetti-fall 3s ease-in forwards`,
      `animation-delay:${delay}s`,
    ].join(';')
    overlay.appendChild(p)
  }

  const style = document.createElement('style')
  style.textContent = `
    @keyframes qabboo-confetti-fall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(110vh) rotate(720deg); opacity: 0.2; }
    }
  `

  document.head.appendChild(style)
  document.body.appendChild(overlay)

  window.setTimeout(() => {
    overlay.remove()
    style.remove()
  }, 3200)
}
