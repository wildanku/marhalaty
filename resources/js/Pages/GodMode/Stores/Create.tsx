import { FormEventHandler } from "react";
import { Head, useForm } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import AsyncSelect from "@/Components/AsyncSelect";

interface Admin {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar_url?: string | null;
}

interface StoreCreateProps {
  admin: Admin;
}

export default function StoreCreate({ admin }: StoreCreateProps) {
  const { data, setData, post, processing, errors } = useForm({
    name: "",
    description: "",
    owner_user_id: "",
    contact_phone: "",
    contact_email: "",
  });

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post("/god-mode/stores");
  };

  return (
    <GodModeLayout admin={admin} title="Buat Toko">
      <Head title="God Mode - Buat Toko" />

      <form onSubmit={submit} className="max-w-2xl bg-[#161b22] border border-white/5 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Owner (alumni terverifikasi)</label>
          <AsyncSelect
            endpoint="/god-mode/users-search"
            value={data.owner_user_id}
            onChange={(value) => setData("owner_user_id", String(value))}
            placeholder="Cari nama atau email alumni..."
          />
          {errors.owner_user_id && <p className="mt-2 text-xs text-red-400">{errors.owner_user_id}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Nama Toko</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => setData("name", e.target.value)}
            className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
          {errors.name && <p className="mt-2 text-xs text-red-400">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Deskripsi</label>
          <textarea
            value={data.description}
            onChange={(e) => setData("description", e.target.value)}
            rows={4}
            className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
          {errors.description && <p className="mt-2 text-xs text-red-400">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">No. WhatsApp</label>
            <input
              type="tel"
              value={data.contact_phone}
              onChange={(e) => setData("contact_phone", e.target.value)}
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            {errors.contact_phone && <p className="mt-2 text-xs text-red-400">{errors.contact_phone}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Email Toko</label>
            <input
              type="email"
              value={data.contact_email}
              onChange={(e) => setData("contact_email", e.target.value)}
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            {errors.contact_email && <p className="mt-2 text-xs text-red-400">{errors.contact_email}</p>}
          </div>
        </div>

        <p className="text-xs text-white/40">
          Toko yang dibuat lewat panel admin langsung berstatus <strong>disetujui</strong>. Owner
          perlu melengkapi alamat asal sendiri lewat halaman kelola toko.
        </p>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={processing}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Buat Toko
          </button>
        </div>
      </form>
    </GodModeLayout>
  );
}
