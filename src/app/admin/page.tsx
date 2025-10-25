export default function AdminHome() {
  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Admin</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <a href="/admin/people" className="rounded-2xl border p-4 hover:bg-[color-mix(in_oklab,var(--background)90%,black 10%)] border-neutral-200 dark:border-neutral-800">
          <div className="font-semibold mb-1">Kelola Dosen</div>
          <div className="text-sm text-neutral-500">Ubah profil & metadata dosen</div>
        </a>
        <a href="/admin/ratecards" className="rounded-2xl border p-4 hover:bg-[color-mix(in_oklab,var(--background)90%,black 10%)] border-neutral-200 dark:border-neutral-800">
          <div className="font-semibold mb-1">Tarif (Rate Card)</div>
          <div className="text-sm text-neutral-500">Set tarif umum & per keahlian</div>
        </a>
        <a href="/quotes" className="rounded-2xl border p-4 hover:bg-[color-mix(in_oklab,var(--background)90%,black 10%)] border-neutral-200 dark:border-neutral-800">
          <div className="font-semibold mb-1">Quotes</div>
          <div className="text-sm text-neutral-500">Lihat & kirim penawaran</div>
        </a>
      </div>
    </main>
  );
}
