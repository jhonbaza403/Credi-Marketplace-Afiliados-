import Navbar from './Navbar';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050816]/88 text-white shadow-[0_12px_40px_rgba(2,8,28,.28)] backdrop-blur-xl">
      <Navbar />
    </header>
  );
}
