import Navbar from './Navbar';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 text-slate-900 shadow-[0_4px_20px_rgba(15,23,42,.08)] backdrop-blur-xl">
      <Navbar />
    </header>
  );
}
