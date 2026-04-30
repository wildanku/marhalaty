import { Head, Link, router } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import { useState } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  marhalah_year: number;
  is_verified: boolean;
  phone_number: string | null;
  created_at: string;
}

interface UsersIndexProps {
  admin: any;
  users: {
    data: User[];
    links: any[];
    current_page: number;
    last_page: number;
    total: number;
  };
  filters: {
    search?: string;
    verified?: string;
  };
}

export default function UsersIndex({ admin, users, filters }: UsersIndexProps) {
  const [search, setSearch] = useState(filters.search || "");
  const [verified, setVerified] = useState(filters.verified || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.get(
      "/god-mode/users",
      { search, verified },
      { preserveState: true, replace: true }
    );
  };

  const handleFilter = (status: string) => {
    setVerified(status);
    router.get(
      "/god-mode/users",
      { search, verified: status },
      { preserveState: true, replace: true }
    );
  };

  const toggleVerify = (userId: number) => {
    router.patch(`/god-mode/users/${userId}/verify`, {}, { preserveScroll: true });
  };

  return (
    <GodModeLayout admin={admin} title="User Management">
      <Head title="God Mode - Users" />

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 max-w-md flex gap-2">
          <input
            type="text"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#161b22] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
          <button
            type="submit"
            className="bg-[#161b22] border border-white/10 hover:bg-white/5 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
          >
            Search
          </button>
        </form>

        <div className="flex bg-[#161b22] border border-white/10 rounded-lg p-1">
          <button
            onClick={() => handleFilter("")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              verified === "" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleFilter("true")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              verified === "true" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            Verified
          </button>
          <button
            onClick={() => handleFilter("false")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              verified === "false" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            Unverified
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase text-white/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">Name & Email</th>
                <th className="px-6 py-4 font-semibold">Marhalah</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-white/40">
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                users.data.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{user.name}</div>
                      <div className="text-white/50">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-white/5 text-white/80 px-2.5 py-1 rounded-md text-xs font-semibold">
                        {user.marhalah_year}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {user.is_verified ? (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md text-xs font-semibold">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-md text-xs font-semibold">
                          <span className="material-symbols-outlined text-[14px]">pending</span>
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleVerify(user.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            user.is_verified
                              ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          }`}
                        >
                          {user.is_verified ? "Revoke" : "Verify"}
                        </button>
                        <Link
                          href={`/god-mode/users/${user.id}`}
                          className="px-3 py-1.5 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors text-xs font-semibold"
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder if needed */}
        {users.last_page > 1 && (
           <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center text-sm">
              <span className="text-white/50">
                Showing page {users.current_page} of {users.last_page} ({users.total} total)
              </span>
              <div className="flex gap-2">
                 {/* Basic pagination controls can go here */}
                 {users.links.map((link, i) => (
                    link.url ? (
                      <Link 
                        key={i} 
                        href={link.url}
                        className={`px-3 py-1 rounded ${link.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                      />
                    ) : (
                      <span 
                        key={i} 
                        className="px-3 py-1 rounded text-white/30"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                      />
                    )
                 ))}
              </div>
           </div>
        )}
      </div>
    </GodModeLayout>
  );
}
