import { useState } from "react";
import { Head, router, useForm } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";

interface Admin {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar_url?: string | null;
}

interface GatewayRow {
  id: number;
  code: string;
  label: string;
  description: string | null;
  is_enabled: boolean;
  contexts: string[];
  supported_contexts: string[];
  credential_fields: string[];
  credential_previews: Record<string, string | null>;
  last_verified_at: string | null;
  sort_order: number;
}

interface ManualAccount {
  id: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  branch: string | null;
  instructions: string | null;
  is_active: boolean;
  sort_order: number;
}

interface PaymentsSettingsProps {
  admin: Admin;
  gateways: GatewayRow[];
  manualAccounts: ManualAccount[];
}

const CONTEXT_LABEL: Record<string, string> = {
  store: "Checkout Toko",
  event: "Pendaftaran Event",
};

const FIELD_LABEL: Record<string, string> = {
  client_id: "Client ID",
  client_secret: "Client Secret",
  api_key: "API Key",
  webhook_secret: "Webhook Secret",
  va: "Virtual Account (VA)",
};

export default function PaymentsSettings({ admin, gateways, manualAccounts }: PaymentsSettingsProps) {
  const enabledStore = gateways.filter((g) => g.is_enabled && g.contexts.includes("store")).map((g) => g.label);
  const enabledEvent = gateways.filter((g) => g.is_enabled && g.contexts.includes("event")).map((g) => g.label);

  return (
    <GodModeLayout admin={admin} title="Payment Settings">
      <Head title="God Mode - Payment Settings" />

      <div className="mb-6">
        <h2 className="text-xl font-bold text-white font-headline">Payment Settings</h2>
        <p className="text-sm text-white/50 mt-1">
          Checkout toko: {enabledStore.length ? enabledStore.join(", ") : "tidak ada aktif"} · Pendaftaran event:{" "}
          {enabledEvent.length ? enabledEvent.join(", ") : "tidak ada aktif"}
        </p>
      </div>

      <div className="space-y-6 mb-10">
        {gateways.map((gateway) => (
          <GatewayCard key={gateway.code} gateway={gateway} />
        ))}
      </div>

      <ManualAccountsSection accounts={manualAccounts} />
    </GodModeLayout>
  );
}

function GatewayCard({ gateway }: { gateway: GatewayRow }) {
  const [testing, setTesting] = useState(false);

  const { data, setData, put, processing, errors } = useForm({
    label: gateway.label,
    description: gateway.description ?? "",
    contexts: gateway.contexts,
    is_enabled: gateway.is_enabled,
    credentials: Object.fromEntries(gateway.credential_fields.map((f) => [f, ""])) as Record<string, string>,
  });

  const toggleContext = (context: string) => {
    setData("contexts", data.contexts.includes(context) ? data.contexts.filter((c) => c !== context) : [...data.contexts, context]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    put(`/god-mode/settings/payments/${gateway.code}`, { preserveScroll: true });
  };

  const testConnection = () => {
    setTesting(true);
    router.post(
      `/god-mode/settings/payments/${gateway.code}/test`,
      {},
      { preserveScroll: true, onFinish: () => setTesting(false) }
    );
  };

  return (
    <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-white font-semibold">{gateway.label}</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {gateway.last_verified_at
              ? `Terverifikasi terakhir: ${new Date(gateway.last_verified_at).toLocaleString("id-ID")}`
              : "Belum pernah diuji"}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-white/70 shrink-0">
          <input
            type="checkbox"
            checked={data.is_enabled}
            onChange={(e) => setData("is_enabled", e.target.checked)}
            className="rounded border-white/20 bg-[#0f1117] text-emerald-500 focus:ring-emerald-500"
          />
          Aktif
        </label>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Label</label>
            <input
              type="text"
              value={data.label}
              onChange={(e) => setData("label", e.target.value)}
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
            {errors.label && <p className="mt-1 text-sm text-red-400">{errors.label}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Deskripsi</label>
            <input
              type="text"
              value={data.description}
              onChange={(e) => setData("description", e.target.value)}
              placeholder="Teks yang dilihat pembeli di checkout"
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Konteks</label>
          <div className="flex gap-4">
            {["store", "event"].map((context) => {
              const supported = gateway.supported_contexts.includes(context);
              return (
                <label
                  key={context}
                  className={`flex items-center gap-2 text-sm ${supported ? "text-white/70" : "text-white/25"}`}
                  title={supported ? undefined : "Belum didukung kode untuk konteks ini"}
                >
                  <input
                    type="checkbox"
                    disabled={!supported}
                    checked={data.contexts.includes(context)}
                    onChange={() => toggleContext(context)}
                    className="rounded border-white/20 bg-[#0f1117] text-emerald-500 focus:ring-emerald-500 disabled:opacity-40"
                  />
                  {CONTEXT_LABEL[context] ?? context}
                </label>
              );
            })}
          </div>
        </div>

        {gateway.credential_fields.length > 0 && (
          <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
            {gateway.credential_fields.map((field) => (
              <div key={field}>
                <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                  {FIELD_LABEL[field] ?? field}
                </label>
                <input
                  type="password"
                  value={data.credentials[field] ?? ""}
                  onChange={(e) => setData("credentials", { ...data.credentials, [field]: e.target.value })}
                  placeholder={gateway.credential_previews[field] ?? "Belum diisi"}
                  autoComplete="off"
                  className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            ))}
          </div>
        )}

        {errors.is_enabled && <p className="text-sm text-red-400">{errors.is_enabled}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
          {gateway.credential_fields.length > 0 && (
            <button
              type="button"
              onClick={testConnection}
              disabled={testing}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white/70 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {testing ? "Menguji..." : "Tes Koneksi"}
            </button>
          )}
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
  );
}

function ManualAccountsSection({ accounts }: { accounts: ManualAccount[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, setData, post, put, processing, reset, errors, clearErrors } = useForm({
    bank_name: "",
    account_number: "",
    account_holder: "",
    branch: "",
    instructions: "",
    is_active: true as boolean,
    sort_order: 0,
  });

  const openCreateModal = () => {
    clearErrors();
    reset();
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (account: ManualAccount) => {
    clearErrors();
    setData({
      bank_name: account.bank_name,
      account_number: account.account_number,
      account_holder: account.account_holder,
      branch: account.branch ?? "",
      instructions: account.instructions ?? "",
      is_active: account.is_active,
      sort_order: account.sort_order,
    });
    setEditingId(account.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      put(`/god-mode/settings/payments/manual-accounts/${editingId}`, { onSuccess: () => closeModal() });
    } else {
      post("/god-mode/settings/payments/manual-accounts", { onSuccess: () => closeModal() });
    }
  };

  const handleDelete = (account: ManualAccount) => {
    if (confirm(`Hapus rekening "${account.bank_name} - ${account.account_number}"?`)) {
      router.delete(`/god-mode/settings/payments/manual-accounts/${account.id}`);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-white font-headline">Rekening Transfer Manual</h3>
          <p className="text-sm text-white/50">Dipakai di halaman pembayaran manual, event maupun toko.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-500 hover:bg-emerald-400 text-[#0f1117] px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Rekening
        </button>
      </div>

      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase text-white/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">Bank</th>
                <th className="px-6 py-4 font-semibold">No. Rekening</th>
                <th className="px-6 py-4 font-semibold">Atas Nama</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-white/40">
                    Belum ada rekening.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-white">{account.bank_name}</td>
                    <td className="px-6 py-4">{account.account_number}</td>
                    <td className="px-6 py-4">{account.account_holder}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${account.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/50"}`}>
                        {account.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(account)}
                          className="p-2 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                          title="Ubah"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(account)}
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
            <h3 className="text-lg font-bold text-white mb-4">{editingId ? "Ubah Rekening" : "Tambah Rekening"}</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Bank</label>
                  <input
                    type="text"
                    value={data.bank_name}
                    onChange={(e) => setData("bank_name", e.target.value)}
                    className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                  {errors.bank_name && <p className="mt-1 text-sm text-red-400">{errors.bank_name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">No. Rekening</label>
                  <input
                    type="text"
                    value={data.account_number}
                    onChange={(e) => setData("account_number", e.target.value)}
                    className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                  {errors.account_number && <p className="mt-1 text-sm text-red-400">{errors.account_number}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Atas Nama</label>
                <input
                  type="text"
                  value={data.account_holder}
                  onChange={(e) => setData("account_holder", e.target.value)}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
                {errors.account_holder && <p className="mt-1 text-sm text-red-400">{errors.account_holder}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Cabang (opsional)</label>
                  <input
                    type="text"
                    value={data.branch}
                    onChange={(e) => setData("branch", e.target.value)}
                    className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Urutan</label>
                  <input
                    type="number"
                    min={0}
                    value={data.sort_order}
                    onChange={(e) => setData("sort_order", Number(e.target.value))}
                    className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Instruksi (opsional)</label>
                <textarea
                  value={data.instructions}
                  onChange={(e) => setData("instructions", e.target.value)}
                  rows={2}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={data.is_active}
                  onChange={(e) => setData("is_active", e.target.checked)}
                  className="rounded border-white/20 bg-[#0f1117] text-emerald-500 focus:ring-emerald-500"
                />
                Aktif (tampil di halaman pembayaran)
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
    </div>
  );
}
