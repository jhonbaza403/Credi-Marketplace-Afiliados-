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
    const id = window.setInterval(() => setIndex((current) => (current + 1) % BACKGROUNDS.length), 9000)
    return () => window.clearInterval(id)
  }, [])

  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"><div className="absolute inset-0 bg-[#050816]" /><div className="absolute inset-0 bg-cover bg-center opacity-70 transition-opacity duration-1000" style={{ backgroundImage: `url(${BACKGROUNDS[index]})` }} /><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,transparent_0%,rgba(5,8,22,.4)_58%,rgba(5,8,22,.86)_100%)]" /><div className="absolute inset-x-0 top-0 h-px bg-cyan-300/20 shadow-[0_0_28px_rgba(34,211,238,.35)]" /></div>
}
