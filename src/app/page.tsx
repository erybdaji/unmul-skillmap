import Charts from "@/components/Charts";
import PeopleBrowser from "@/components/PeopleBrowser";

export default async function Home() {
  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-6 space-y-6">
      {/* Hero */}
      <header className="rounded-2xl border bg-background text-foreground border-neutral-200 dark:border-neutral-800 p-6 sm:p-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
          Pemetaan Keahlian Dosen – Universitas Mulawarman
        </h1>
        <p className="mt-2 text-sm sm:text-base text-foreground/70">
          Jelajah, analisis, dan susun penawaran berdasarkan keahlian dosen di seluruh unit kerja.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/dashboard"
            className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700 hover:bg-[color-mix(in_oklab,var(--background)90%,black_10%)]"
          >
            Buka Dashboard
          </a>
          <a
            href="/admin"
            className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700 hover:bg-[color-mix(in_oklab,var(--background)90%,black_10%)]"
          >
            Admin
          </a>
        </div>
      </header>

      {/* Grid konten utama */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ====== Charts Full Width di Desktop ====== */}
        <div className="col-span-12 min-w-0">
          <Charts />
        </div>

        {/* ====== Browser/daftar orang (opsional) ====== */}
        <div className="col-span-12 min-w-0">
          <PeopleBrowser />
        </div>
      </div>
    </main>
  );
}
