import { Head, Link, router } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import { Store } from "@/types";

interface Admin {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar_url?: string | null;
}

interface PaginatedStores {
  data: Store[];
  links: { url: string | null; label: string; active: boolean }[];
  current_page: number;
  last_page: number;
  total: number;
}

interface StoresIndexProps {
  admin: Admin;
  stores: PaginatedStores;
  status: string;
}

const STATUS_TABS = [
  { key: "pending", label: "Menunggu" },
  { key: "approved", label: "Disetujui" },
  { key: "rejected", label: "Ditolak" },
  { key: "suspended", label: "Disuspend" },
  { key: "all", label: "Semua" },
];

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-400",
  rejected: "bg-red-500/10 text-red-400",
  suspended: "bg-red-500/10 text-red-400",
};

export default function StoresIndex({ admin, stores, status }: StoresIndexProps) {
  const setStatus = (value: string) => {
    router.get("/god-mode/stores", { status: value }, { preserveState: true, replace: true });
  };

  return (
    <GodModeLayout admin={admin} title="Stores">
      <Head title="God Mode - Stores" />

      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="flex bg-[#161b22] border border-white/10 rounded-lg p-1 w-fit">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatus(tab.key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                status === tab.key ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Link
          href="/god-mode/stores/create"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Buat Toko
        </Link>
      </div>

      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase text-white/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">Toko</th>
                <th className="px-6 py-4 font-semibold">Owner</th>
                <th className="px-6 py-4 font-semibold">Diajukan</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stores.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-white/40">
                    Tidak ada toko untuk status ini.
                  </td>
                </tr>
              ) : (
                stores.data.map((store) => (
                  <tr key={store.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{store.name}</div>
                      <div className="text-white/50 text-xs">{store.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white">{store.owner?.name}</div>
                      <div className="text-white/50 text-xs">{store.owner?.email}</div>
                    </td>
                    <td className="px-6 py-4">{new Date(store.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${STATUS_STYLE[store.status] ?? "bg-white/5 text-white/70"}`}>
                        {store.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/god-mode/stores/${store.id}`}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors text-xs font-semibold"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {stores.last_page > 1 && (
          <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center text-sm">
            <span className="text-white/50">
              Halaman {stores.current_page} dari {stores.last_page} ({stores.total} toko)
            </span>
            <div className="flex gap-2">
              {stores.links.map((link, i) =>
                link.url ? (
                  <Link
                    key={i}
                    href={link.url}
                    className={`px-3 py-1 rounded ${link.active ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                ) : (
                  <span key={i} className="px-3 py-1 rounded text-white/30" dangerouslySetInnerHTML={{ __html: link.label }} />
                )
              )}
            </div>
          </div>
        )}
      </div>
    </GodModeLayout>
  );
}
