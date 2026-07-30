import { useState } from "react";
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

interface StoreShowProps {
  admin: Admin;
  store: Store;
}

type ModalKind = "reject" | "suspend" | null;

export default function StoreShow({ admin, store }: StoreShowProps) {
  const [modal, setModal] = useState<ModalKind>(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const address = store.primary_address;

  const approve = () => {
    if (!confirm(`Setujui toko "${store.name}"?`)) return;
    router.post(`/god-mode/stores/${store.id}/approve`, {}, { preserveScroll: true });
  };

  const submitModal = () => {
    if (!modal) return;
    setProcessing(true);
    router.post(
      `/god-mode/stores/${store.id}/${modal}`,
      { rejection_reason: reason },
      {
        preserveScroll: true,
        onFinish: () => {
          setProcessing(false);
          setModal(null);
          setReason("");
        },
      }
    );
  };

  return (
    <GodModeLayout admin={admin} title={store.name}>
      <Head title={`God Mode - ${store.name}`} />

      <div className="mb-6 flex items-center justify-between">
        <Link href="/god-mode/stores" className="text-white/50 hover:text-white text-sm flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Kembali ke daftar toko
        </Link>

        <div className="flex gap-2">
          {store.status === "pending" && (
            <>
              <button
                onClick={approve}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Setujui
              </button>
              <button
                onClick={() => setModal("reject")}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Tolak
              </button>
            </>
          )}
          {store.status === "approved" && (
            <button
              onClick={() => setModal("suspend")}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Suspend
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Profil Toko</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-white/40">Nama</dt>
                <dd className="text-white mt-1">{store.name}</dd>
              </div>
              <div>
                <dt className="text-white/40">Slug</dt>
                <dd className="text-white mt-1">{store.slug}</dd>
              </div>
              <div>
                <dt className="text-white/40">Telepon</dt>
                <dd className="text-white mt-1">{store.contact_phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-white/40">Email</dt>
                <dd className="text-white mt-1">{store.contact_email ?? "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-white/40">Deskripsi</dt>
                <dd className="text-white mt-1">{store.description}</dd>
              </div>
              {store.status === "rejected" && store.rejection_reason && (
                <div className="col-span-2">
                  <dt className="text-red-400">Alasan Penolakan</dt>
                  <dd className="text-white mt-1">{store.rejection_reason}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Alamat Asal</h3>
            {address ? (
              <div className="text-sm text-white/70 space-y-1">
                <p className="text-white font-medium">{address.recipient_name} — {address.phone}</p>
                <p>{address.address_line}</p>
                <p>{address.full_address ?? address.postal_code}</p>
              </div>
            ) : (
              <p className="text-white/40 text-sm">Belum ada alamat.</p>
            )}
          </div>

          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Anggota</h3>
            <ul className="divide-y divide-white/5">
              {(store.members ?? []).map((member) => (
                <li key={member.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-white">{member.user?.name}</p>
                    <p className="text-white/50 text-xs">{member.user?.email}</p>
                  </div>
                  <span className="text-white/50 uppercase text-xs">{member.role} · {member.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Owner</h3>
            <p className="text-white">{store.owner?.name}</p>
            <p className="text-white/50 text-sm">{store.owner?.email}</p>
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold mb-4">
              {modal === "reject" ? "Tolak Pengajuan Toko" : "Suspend Toko"}
            </h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Alasan..."
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setModal(null); setReason(""); }}
                className="px-4 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5"
              >
                Batal
              </button>
              <button
                onClick={submitModal}
                disabled={processing || (modal === "reject" && !reason.trim())}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
              >
                {modal === "reject" ? "Tolak" : "Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}
    </GodModeLayout>
  );
}
