"use client"

import { useEffect, useState } from "react"

const BACKGROUNDS = [
  "/visuals/marketplace-01.svg",
  "/visuals/marketplace-02.svg",
  "/visuals/marketplace-03.svg",
]

export default function MarketplaceAtmosphere() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % BACKGROUNDS.length)
    }, 14000)

    return () => window.clearInterval(id)
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.012] mix-blend-multiply transition-opacity duration-[1800ms] dark:mix-blend-screen dark:opacity-[0.008]"
        style={{ backgroundImage: `url(${BACKGROUNDS[index]})` }}
      />
      <div className="absolute -left-40 -top-40 size-[32rem] rounded-full bg-cyan-300/[0.025] blur-3xl dark:bg-cyan-400/[0.018]" />
      <div className="absolute -bottom-52 -right-40 size-[36rem] rounded-full bg-blue-500/[0.025] blur-3xl dark:bg-blue-500/[0.018]" />
      <div className="absolute inset-x-0 top-0 h-px bg-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,.10)] dark:bg-cyan-300/15 dark:shadow-[0_0_24px_rgba(34,211,238,.14)]" />
    </div>
  )
}
