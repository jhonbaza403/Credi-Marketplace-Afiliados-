// ==========================================================
// ARCHIVO: src/components/layout/Header.tsx
// Credi Marketplace
//
// Cabecera principal de plataforma
//
// Next.js 16.3 · React 19.2 · TypeScript
// ==========================================================

import Navbar from './Navbar';


export default function Header() {


  return (

    <header

      className="
        sticky
        top-0
        z-40

        border-b
        bg-white

        shadow-sm
      "

    >

      <Navbar />

    </header>

  );

}
