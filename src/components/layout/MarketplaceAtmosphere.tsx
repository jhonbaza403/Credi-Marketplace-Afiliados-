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
    }, 10000)

    return () => window.clearInterval(id)
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.12] mix-blend-multiply transition-opacity duration-[1400ms] dark:mix-blend-screen dark:opacity-[0.08]"
        style={{ backgroundImage: `url(${BACKGROUNDS[index]})` }}
      />
      <div className="absolute -left-40 -top-40 size-[32rem] rounded-full bg-cyan-300/10 blur-3xl dark:bg-cyan-400/[0.06]" />
      <div className="absolute -bottom-52 -right-40 size-[36rem] rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/[0.06]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.55),transparent_20%,transparent_80%,rgba(255,255,255,.35))] dark:bg-[linear-gradient(180deg,rgba(2,6,23,.30),transparent_18%,transparent_82%,rgba(2,6,23,.36))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-cyan-500/30 shadow-[0_0_24px_rgba(6,182,212,.18)] dark:bg-cyan-300/25 dark:shadow-[0_0_28px_rgba(34,211,238,.25)]" />
    </div>
  )
}
