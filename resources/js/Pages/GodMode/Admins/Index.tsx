import { Head, useForm, router } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import { FormEventHandler, useState } from "react";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
  created_at: string;
}

interface AdminsIndexProps {
  admin: any;
  admins: AdminUser[];
}

export default function AdminsIndex({ admin, admins }: AdminsIndexProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const { data, setData, post, processing, errors, reset } = useForm({
    name: "",
    email: "",
    role: "admin",
  });

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post("/god-mode/admins", {
      onSuccess: () => {
        reset();
        setShowAddForm(false);
      },
    });
  };

  const deleteAdmin = (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus admin ini?")) {
      router.delete(`/god-mode/admins/${id}`);
    }
  };

  return (
    <GodModeLayout admin={admin} title="Manage Admins">
      <Head title="God Mode - Admins" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white font-headline">Admin Accounts</h2>
          <p className="text-sm text-white/50">Manage system administrators and roles.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#0f1117] px-4 py-2 rounded-lg transition-colors text-sm font-bold shadow-[0_0_15px_rgba(52,211,153,0.25)]"
        >
          <span className="material-symbols-outlined text-base">add</span>
          {showAddForm ? "Close Form" : "Add Admin"}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6 mb-8 max-w-xl transition-all duration-300">
          <h3 className="text-base font-bold text-white mb-4">Add New Admin</h3>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={data.name}
                onChange={(e) => setData("name", e.target.value)}
                placeholder="Full Name"
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                required
              />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => setData("email", e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                required
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="role" className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">
                Role
              </label>
              <select
                id="role"
                value={data.role}
                onChange={(e) => setData("role", e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              >
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
              {errors.role && <p className="mt-1 text-xs text-red-400">{errors.role}</p>}
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0f1117] font-bold py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              {processing ? "Saving..." : "Add Admin"}
            </button>
          </form>
        </div>
      )}

      {/* Admins Table */}
      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase text-white/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">Admin</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Created At</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-white/40">
                    No administrator accounts found.
                  </td>
                </tr>
              ) : (
                admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {adm.avatar_url ? (
                          <img
                            src={adm.avatar_url}
                            alt={adm.name}
                            className="w-9 h-9 rounded-full object-cover border border-white/10"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-sm">
                            {adm.name?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-white block leading-tight">{adm.name || "Pending OAuth Login"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white/80 font-mono text-xs">{adm.email}</td>
                    <td className="px-6 py-4">
                      {adm.role === "superadmin" ? (
                        <span className="inline-flex items-center gap-1.5 bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-md text-xs font-semibold">
                          <span className="material-symbols-outlined text-[14px]">shield</span>
                          Super Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md text-xs font-semibold">
                          <span className="material-symbols-outlined text-[14px]">person</span>
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-white/50">
                      {new Date(adm.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {adm.id === admin.id ? (
                        <span className="text-xs text-white/30 italic">Current User</span>
                      ) : (
                        <button
                          onClick={() => deleteAdmin(adm.id)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Delete
                        </button>
                      )}
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
