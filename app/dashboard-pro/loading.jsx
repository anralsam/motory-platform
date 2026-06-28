/**
 * VOLD MOTOR — Executive Dashboard route loading skeleton.
 * Next App Router wraps page.jsx in a <Suspense> boundary and renders this while
 * the segment loads, so the UI never flashes blank. Pure Tailwind, mirrors the
 * Modern-Executive grid (fixed dark sidebar + 4 stats + hero/insights + footer).
 */
export default function ExecutiveLoading() {
  return (
    <div dir="rtl" className="min-h-screen bg-zinc-50 font-sans">
      {/* Sidebar */}
      <aside className="fixed top-0 right-0 bottom-0 z-40 hidden w-[260px] flex-col bg-[#0B0B0B] lg:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5" dir="ltr">
          <span className="h-7 w-7 animate-pulse rounded-md bg-white/10" />
          <span className="h-3 w-24 animate-pulse rounded bg-white/10" />
        </div>
        <div className="flex-1 space-y-2 px-3 py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <span className="h-4 w-4 animate-pulse rounded bg-white/10" />
              <span className="h-2.5 w-20 animate-pulse rounded bg-white/10" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <span className="h-9 w-9 animate-pulse rounded-full bg-white/10" />
          <span className="h-2.5 w-16 animate-pulse rounded bg-white/10" />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-col lg:mr-[260px]">
        <header className="flex h-16 items-center justify-between border-b border-[#e4e4e7] bg-white px-5 lg:px-8">
          <div className="space-y-2">
            <span className="block h-3.5 w-32 animate-pulse rounded bg-zinc-100" />
            <span className="block h-2.5 w-24 animate-pulse rounded bg-zinc-100" />
          </div>
          <span className="h-9 w-28 animate-pulse rounded-lg bg-zinc-100" />
        </header>

        <main className="flex-1 space-y-5 p-5 lg:p-8">
          {/* 4 stat cards */}
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-4 rounded-2xl border border-[#e4e4e7] bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="h-2.5 w-20 animate-pulse rounded bg-zinc-100" />
                  <span className="h-9 w-9 animate-pulse rounded-lg bg-zinc-100" />
                </div>
                <span className="h-7 w-16 animate-pulse rounded bg-zinc-100" />
              </div>
            ))}
          </section>

          {/* Hero + insights */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-[#e4e4e7] bg-white p-6 lg:col-span-2">
              <div className="mb-5 flex items-start justify-between">
                <div className="space-y-2">
                  <span className="block h-3.5 w-28 animate-pulse rounded bg-zinc-100" />
                  <span className="block h-2.5 w-44 animate-pulse rounded bg-zinc-100" />
                </div>
                <span className="h-8 w-24 animate-pulse rounded-lg bg-zinc-100" />
              </div>
              <div className="h-[280px] animate-pulse rounded-xl bg-zinc-100" />
            </div>
            <div className="rounded-2xl border border-[#e4e4e7] bg-white p-6">
              <span className="mb-4 block h-2.5 w-20 animate-pulse rounded bg-zinc-100" />
              <div className="divide-y divide-[#e4e4e7]">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2 py-4">
                    <span className="block h-2.5 w-24 animate-pulse rounded bg-zinc-100" />
                    <span className="block h-5 w-14 animate-pulse rounded bg-zinc-100" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Footer mini cards */}
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border border-[#e4e4e7] bg-white p-5">
                <span className="h-2.5 w-20 animate-pulse rounded bg-zinc-100" />
                <span className="h-6 w-12 animate-pulse rounded bg-zinc-100" />
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
