import { Head, router } from "@inertiajs/react";
import { useState } from "react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import AsyncSelect from "@/Components/AsyncSelect";
import ToggleSwitch from "@/Components/ToggleSwitch";

interface Admin {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar_url?: string | null;
}

interface HighlightProduct {
  id: string;
  name: string;
  primary_image_url: string | null;
  store?: { id: string; name: string; slug: string } | null;
}

interface HighlightRow {
  id: number;
  product_id: string;
  sort_order: number;
  is_active: boolean;
  product: HighlightProduct | null;
}

interface HomepageHighlightsIndexProps {
  admin: Admin;
  highlights: HighlightRow[];
  maxSlots: number;
  activeCount: number;
}

export default function HomepageHighlightsIndex({
  admin,
  highlights,
  maxSlots,
  activeCount,
}: HomepageHighlightsIndexProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | number>("");
  const [adding, setAdding] = useState(false);
  const [sortOrders, setSortOrders] = useState<Record<number, number>>(
    Object.fromEntries(highlights.map((h) => [h.id, h.sort_order]))
  );
  const slotsFull = activeCount >= maxSlots;

  const handleAdd = () => {
    if (!selectedProductId) return;
    setAdding(true);
    router.post(
      "/god-mode/homepage-highlights",
      { product_id: selectedProductId },
      {
        onSuccess: () => setSelectedProductId(""),
        onFinish: () => setAdding(false),
      }
    );
  };

  const handleToggleActive = (highlight: HighlightRow) => {
    router.patch(`/god-mode/homepage-highlights/${highlight.id}`, {
      is_active: !highlight.is_active,
    });
  };

  const handleSortOrderBlur = (highlight: HighlightRow) => {
    const value = sortOrders[highlight.id];
    if (value === highlight.sort_order) return;
    router.patch(`/god-mode/homepage-highlights/${highlight.id}`, { sort_order: value });
  };

  const handleDelete = (highlight: HighlightRow) => {
    if (confirm(`Lepas "${highlight.product?.name}" dari highlight beranda?`)) {
      router.delete(`/god-mode/homepage-highlights/${highlight.id}`);
    }
  };

  return (
    <GodModeLayout admin={admin} title="Homepage Highlights">
      <Head title="God Mode - Homepage Highlights" />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white font-headline">Homepage Highlights</h2>
          <p className="text-sm text-white/50">
            Kelola produk yang ditampilkan di section "Produk Pilihan" pada beranda.
          </p>
        </div>
        <span
          className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
            slotsFull ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
          }`}
        >
          {activeCount}/{maxSlots} terpakai
        </span>
      </div>

      <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6 mb-6">
        <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
          Tambah Produk
        </label>
        <div className="flex gap-3">
          <AsyncSelect
            endpoint="/god-mode/api/products/search"
            value={selectedProductId}
            onChange={setSelectedProductId}
            disabled={slotsFull}
            placeholder={slotsFull ? "Slot penuh, nonaktifkan salah satu dulu" : "Cari produk..."}
            className="flex-1"
          />
          <button
            onClick={handleAdd}
            disabled={!selectedProductId || adding || slotsFull}
            className="bg-emerald-500 hover:bg-emerald-400 text-[#0f1117] px-5 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            Tambah
          </button>
        </div>
      </div>

      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase text-white/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">Produk</th>
                <th className="px-6 py-4 font-semibold">Toko</th>
                <th className="px-6 py-4 font-semibold">Urutan</th>
                <th className="px-6 py-4 font-semibold">Aktif</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {highlights.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-white/40">
                    Belum ada produk yang di-highlight.
                  </td>
                </tr>
              ) : (
                highlights.map((highlight) => (
                  <tr key={highlight.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                          {highlight.product?.primary_image_url ? (
                            <img
                              src={highlight.product.primary_image_url}
                              alt={highlight.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-white/30 text-lg">
                              image
                            </span>
                          )}
                        </div>
                        <span className="text-white/90 font-medium">
                          {highlight.product?.name ?? "(produk terhapus)"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white/60">{highlight.product?.store?.name}</td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min={0}
                        value={sortOrders[highlight.id] ?? highlight.sort_order}
                        onChange={(e) =>
                          setSortOrders((s) => ({ ...s, [highlight.id]: Number(e.target.value) }))
                        }
                        onBlur={() => handleSortOrderBlur(highlight)}
                        className="w-20 bg-[#0f1117] border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <ToggleSwitch
                        checked={highlight.is_active}
                        onChange={() => handleToggleActive(highlight)}
                        disabled={!highlight.is_active && slotsFull}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(highlight)}
                        className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Lepas dari highlight"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </GodModeLayout>
  );
}
