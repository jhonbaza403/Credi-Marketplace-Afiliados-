import { BadgeCheck, CreditCard, ShoppingBag, UsersRound } from 'lucide-react'

const orbitCards = [
  { className: 'hero-orbit-card--one', icon: ShoppingBag, label: 'Marketplace', value: 'Compra · vende · descubre' },
  { className: 'hero-orbit-card--two', icon: UsersRound, label: 'Red Credi', value: 'Conecta oportunidades' },
  { className: 'hero-orbit-card--three', icon: CreditCard, label: 'CREDI', value: 'Pagos inteligentes' },
  { className: 'hero-orbit-card--four', icon: BadgeCheck, label: 'Confianza', value: 'Operaciones verificadas' },
]

export default function HeroPortal() {
  return (
    <div className="hero-portal" aria-hidden="true">
      <div className="hero-portal__aura" />
      <div className="hero-portal__halo" />
      <div className="hero-portal__ring hero-portal__ring--outer" />
      <div className="hero-portal__ring hero-portal__ring--middle" />
      <div className="hero-portal__ring hero-portal__ring--inner" />
      <div className="hero-portal__core" />
      <div className="hero-portal__grid" />
      <div className="hero-portal__beam hero-portal__beam--a" />
      <div className="hero-portal__beam hero-portal__beam--b" />
      <div className="hero-orbit-cards">
        {orbitCards.map(({ className, icon: Icon, label, value }) => (
          <div key={label} className={`hero-orbit-card ${className}`}>
            <span className="hero-orbit-card__icon"><Icon /></span>
            <span className="hero-orbit-card__copy"><strong>{label}</strong><small>{value}</small></span>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .hero-portal__halo {
          position: absolute; inset: 13%; border-radius: 50%;
          background: conic-gradient(from 20deg, transparent 0 18%, rgba(103,232,249,.08) 24%, transparent 35% 54%, rgba(168,85,247,.07) 61%, transparent 74% 100%);
          filter: blur(8px); transform: rotateX(68deg) scaleY(.72);
          animation: hero-halo-drift 16s linear infinite;
        }
        .hero-portal__beam { position: absolute; left: 50%; top: 50%; height: 1px; width: 58%; transform-origin: left center; background: linear-gradient(90deg, rgba(255,255,255,.0), rgba(103,232,249,.45), rgba(255,255,255,0)); opacity: .32; }
        .hero-portal__beam--a { transform: rotate(-17deg) translateZ(90px); animation: hero-beam-a 7s ease-in-out infinite; }
        .hero-portal__beam--b { transform: rotate(22deg) translateZ(150px); animation: hero-beam-b 9s ease-in-out infinite reverse; }
        .hero-orbit-cards { position: absolute; inset: 0; transform-style: preserve-3d; }
        .hero-orbit-card {
          position: absolute; display: flex; align-items: center; gap: 10px; min-width: 190px; padding: 10px 13px;
          border: 1px solid rgba(255,255,255,.14); border-radius: 16px;
          background: linear-gradient(135deg, rgba(15,23,42,.58), rgba(15,23,42,.22));
          box-shadow: 0 18px 55px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.08);
          backdrop-filter: blur(16px) saturate(140%); transform-style: preserve-3d;
          animation: hero-card-float 8s ease-in-out infinite;
        }
        .hero-orbit-card__icon { display: grid; place-items: center; width: 34px; height: 34px; flex: 0 0 34px; border-radius: 11px; color: #a5f3fc; background: rgba(34,211,238,.10); border: 1px solid rgba(103,232,249,.18); }
        .hero-orbit-card__icon svg { width: 17px; height: 17px; }
        .hero-orbit-card__copy { display: grid; gap: 2px; text-align: left; }
        .hero-orbit-card__copy strong { color: rgba(255,255,255,.96); font-size: 11px; letter-spacing: .04em; }
        .hero-orbit-card__copy small { color: rgba(226,232,240,.64); font-size: 9px; white-space: nowrap; }
        .hero-orbit-card--one { left: 4%; top: 20%; animation-delay: -1.2s; transform: translateZ(120px) rotateY(8deg); }
        .hero-orbit-card--two { right: 2%; top: 16%; animation-delay: -3.4s; transform: translateZ(160px) rotateY(-8deg); }
        .hero-orbit-card--three { left: 7%; bottom: 14%; animation-delay: -5.1s; transform: translateZ(100px) rotateY(10deg); }
        .hero-orbit-card--four { right: 5%; bottom: 12%; animation-delay: -6.7s; transform: translateZ(130px) rotateY(-10deg); }
        @keyframes hero-card-float { 0%,100% { translate: 0 0; } 50% { translate: 0 -10px; } }
        @keyframes hero-halo-drift { from { rotate: 0deg; } to { rotate: 360deg; } }
        @keyframes hero-beam-a { 0%,100% { opacity:.12; scale:.92; } 50% { opacity:.38; scale:1.08; } }
        @keyframes hero-beam-b { 0%,100% { opacity:.10; scale:.9; } 50% { opacity:.3; scale:1.1; } }
        @media (max-width: 900px) { .hero-orbit-card { min-width: 0; padding: 8px; } .hero-orbit-card__copy small { display:none; } .hero-orbit-card--one { left: 0; } .hero-orbit-card--two { right: 0; } .hero-orbit-card--three { left: 0; bottom: 7%; } .hero-orbit-card--four { right: 0; bottom: 5%; } }
        @media (max-width: 640px) { .hero-orbit-card { transform: scale(.82) !important; } .hero-orbit-card--one { top: 17%; left: -3%; } .hero-orbit-card--two { top: 13%; right: -3%; } .hero-orbit-card--three { bottom: 10%; left: -3%; } .hero-orbit-card--four { bottom: 8%; right: -3%; } }
        @media (prefers-reduced-motion: reduce) { .hero-orbit-card, .hero-portal__halo, .hero-portal__beam { animation-duration: .01ms !important; animation-iteration-count: 1 !important; } }
      ` }} />
    </div>
  )
}
