import { Head, router, useForm } from "@inertiajs/react";
import { useState } from "react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import { StoreBadgeColorToken } from "@/types";

interface Admin {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar_url?: string | null;
}

interface StoreBadgeRow {
  id: number;
  code: string;
  name: string;
  name_en: string | null;
  description: string | null;
  icon: string;
  color_token: StoreBadgeColorToken;
  is_active: boolean;
  sort_order: number;
  assignments_count: number;
}

interface StoreBadgesIndexProps {
  admin: Admin;
  badges: StoreBadgeRow[];
  badgeIcons: string[];
  badgeColors: StoreBadgeColorToken[];
}

const COLOR_CHIP: Record<StoreBadgeColorToken, string> = {
  primary: "bg-emerald-500/10 text-emerald-400",
  secondary: "bg-sky-500/10 text-sky-400",
  tertiary: "bg-amber-500/10 text-amber-400",
  error: "bg-red-500/10 text-red-400",
  neutral: "bg-white/10 text-white/70",
};

export default function StoreBadgesIndex({ admin, badges, badgeIcons, badgeColors }: StoreBadgesIndexProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<StoreBadgeRow | null>(null);

  const { data, setData, post, put, processing, reset, errors, clearErrors } = useForm({
    code: "",
    name: "",
    name_en: "",
    description: "",
    icon: badgeIcons[0] ?? "verified",
    color_token: badgeColors[0] ?? "primary",
    is_active: true as boolean,
    sort_order: 0,
  });

  const openCreateModal = () => {
    clearErrors();
    reset();
    setEditing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (badge: StoreBadgeRow) => {
    clearErrors();
    setData({
      code: badge.code,
      name: badge.name,
      name_en: badge.name_en ?? "",
      description: badge.description ?? "",
      icon: badge.icon,
      color_token: badge.color_token,
      is_active: badge.is_active,
      sort_order: badge.sort_order,
    });
    setEditing(badge);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      put(`/god-mode/store-badges/${editing.id}`, { onSuccess: () => closeModal() });
    } else {
      post("/god-mode/store-badges", { onSuccess: () => closeModal() });
    }
  };

  const handleDelete = (badge: StoreBadgeRow) => {
    if (badge.assignments_count > 0) {
      alert("Badge ini masih terpasang di beberapa toko. Nonaktifkan saja, jangan dihapus.");
      return;
    }
    if (confirm(`Hapus badge "${badge.name}"?`)) {
      router.delete(`/god-mode/store-badges/${badge.id}`);
    }
  };

  return (
    <GodModeLayout admin={admin} title="Store Badges">
      <Head title="God Mode - Store Badges" />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white font-headline">Store Badges</h2>
          <p className="text-sm text-white/50">Kelola jenis badge yang bisa dipasang ke toko (Official, Top Seller, dst).</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-500 hover:bg-emerald-400 text-[#0f1117] px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Badge
        </button>
      </div>

      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase text-white/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">Badge</th>
                <th className="px-6 py-4 font-semibold">Kode</th>
                <th className="px-6 py-4 font-semibold">Dipakai</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {badges.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-white/40">
                    Belum ada jenis badge.
                  </td>
                </tr>
              ) : (
                badges.map((badge) => (
                  <tr key={badge.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${COLOR_CHIP[badge.color_token]}`}>
                        <span className="material-symbols-outlined text-[14px]">{badge.icon}</span>
                        {badge.name}
                      </span>
                      {badge.description && <div className="text-white/40 text-xs mt-1 max-w-xs">{badge.description}</div>}
                    </td>
                    <td className="px-6 py-4 text-white/60">{badge.code}</td>
                    <td className="px-6 py-4">{badge.assignments_count} toko</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${badge.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/50"}`}>
                        {badge.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(badge)}
                          className="p-2 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                          title="Ubah"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(badge)}
                          className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#161b22] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">{editing ? "Ubah Badge" : "Tambah Badge"}</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Kode</label>
                  <input
                    type="text"
                    value={data.code}
                    onChange={(e) => setData("code", e.target.value.toLowerCase())}
                    placeholder="top_seller"
                    className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                  {errors.code && <p className="mt-1 text-sm text-red-400">{errors.code}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Urutan</label>
                  <input
                    type="number"
                    min={0}
                    value={data.sort_order}
                    onChange={(e) => setData("sort_order", Number(e.target.value))}
                    className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Nama (ID)</label>
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData("name", e.target.value)}
                    className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Nama (EN)</label>
                  <input
                    type="text"
                    value={data.name_en}
                    onChange={(e) => setData("name_en", e.target.value)}
                    className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Deskripsi</label>
                <textarea
                  value={data.description}
                  onChange={(e) => setData("description", e.target.value)}
                  rows={2}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Ikon</label>
                  <select
                    value={data.icon}
                    onChange={(e) => setData("icon", e.target.value)}
                    className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {badgeIcons.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Warna</label>
                  <select
                    value={data.color_token}
                    onChange={(e) => setData("color_token", e.target.value as StoreBadgeColorToken)}
                    className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    {badgeColors.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={data.is_active}
                  onChange={(e) => setData("is_active", e.target.checked)}
                  className="rounded border-white/20 bg-[#0f1117] text-emerald-500 focus:ring-emerald-500"
                />
                Aktif (tampil di halaman publik)
              </label>

              <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white/70 hover:bg-white/5 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-[#0f1117] rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {processing ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </GodModeLayout>
  );
}
