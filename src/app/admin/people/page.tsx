import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PeopleAdmin() {
  const people = await prisma.person.findMany({
    orderBy: { nama: "asc" },
    take: 50,
    include: { unit: true },
  });

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Kelola Dosen</h1>

      <table className="w-full text-sm rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
        <thead className="bg-neutral-100 dark:bg-neutral-900/50">
          <tr>
            <th className="text-left p-2">Nama</th>
            <th className="text-left p-2">Unit</th>
            <th className="text-left p-2">Pendidikan</th>
            <th className="text-left p-2">Pangkat</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {people.map(p => (
            <tr key={p.id} className="border-t border-neutral-200 dark:border-neutral-800">
              <td className="p-2">{p.nama}</td>
              <td className="p-2">{p.unit?.name ?? "—"}</td>
              <td className="p-2">{p.pendidikanTerakhir ?? "—"}</td>
              <td className="p-2">{p.pangkatGolongan ?? "—"}</td>
              <td className="p-2">
                <a className="rounded-lg px-3 py-1 border border-neutral-300 dark:border-neutral-700" href={`/admin/people/${p.id}`}>Edit</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
