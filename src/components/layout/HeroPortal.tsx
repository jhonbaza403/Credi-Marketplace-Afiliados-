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
    </div>
  )
}
