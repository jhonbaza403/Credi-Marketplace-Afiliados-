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
    const id = window.setInterval(() => setIndex((current) => (current + 1) % BACKGROUNDS.length), 24000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.035] mix-blend-multiply transition-opacity duration-[2200ms] dark:opacity-[0.07] dark:mix-blend-screen"
        style={{ backgroundImage: `url(${BACKGROUNDS[index]})` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_42%)]" />
    </div>
  )
}
