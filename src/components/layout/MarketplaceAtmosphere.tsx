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
    }, 12000)

    return () => window.clearInterval(id)
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.055] mix-blend-multiply transition-opacity duration-[1600ms] dark:mix-blend-screen dark:opacity-[0.045]"
        style={{ backgroundImage: `url(${BACKGROUNDS[index]})` }}
      />
      <div className="absolute -left-40 -top-40 size-[32rem] rounded-full bg-cyan-300/[0.055] blur-3xl dark:bg-cyan-400/[0.035]" />
      <div className="absolute -bottom-52 -right-40 size-[36rem] rounded-full bg-blue-500/[0.055] blur-3xl dark:bg-blue-500/[0.035]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.76),transparent_18%,transparent_82%,rgba(255,255,255,.58))] dark:bg-[linear-gradient(180deg,rgba(2,6,23,.48),transparent_16%,transparent_84%,rgba(2,6,23,.52))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-cyan-500/25 shadow-[0_0_24px_rgba(6,182,212,.14)] dark:bg-cyan-300/20 dark:shadow-[0_0_28px_rgba(34,211,238,.18)]" />
    </div>
  )
}
