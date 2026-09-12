'use client'

import { useEffect, useState } from 'react'

const BACKGROUNDS = [
  '/visuals/marketplace-01.svg',
  '/visuals/marketplace-02.svg',
  '/visuals/marketplace-03.svg',
]

export default function MarketplaceAtmosphere() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setIndex((current) => (current + 1) % BACKGROUNDS.length), 18000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.07] mix-blend-normal transition-all duration-[2200ms] dark:opacity-[0.11]"
        style={{ backgroundImage: `url(${BACKGROUNDS[index]})` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(30,64,175,.18),transparent_40%),linear-gradient(135deg,rgba(3,10,24,.82),transparent_48%,rgba(2,6,23,.72))] dark:bg-[radial-gradient(circle_at_50%_-10%,rgba(37,99,235,.22),transparent_42%),linear-gradient(135deg,rgba(2,6,23,.82),transparent_48%,rgba(2,6,23,.72))]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.045)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
      <div className="absolute -left-52 -top-52 size-[42rem] rounded-full bg-blue-500/[0.07] blur-[110px]" />
      <div className="absolute -bottom-64 -right-52 size-[44rem] rounded-full bg-cyan-400/[0.055] blur-[120px]" />
      <div className="absolute inset-x-0 top-0 h-px bg-cyan-300/20 shadow-[0_0_28px_rgba(34,211,238,.18)]" />
    </div>
  )
}
