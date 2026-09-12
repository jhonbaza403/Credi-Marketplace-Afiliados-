export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-4 w-40 rounded bg-slate-800" />
        <div className="mt-4 h-10 w-3/4 rounded bg-slate-800" />
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-52 rounded-2xl bg-slate-900" />)}
        </div>
      </div>
    </main>
  )
}
