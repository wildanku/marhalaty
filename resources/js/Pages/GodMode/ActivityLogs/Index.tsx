import { Head, Link } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";

interface ActivityLog {
  id: number;
  admin_id: number;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin?: {
    id: number;
    name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
}

interface ActivityLogsProps {
  admin: any;
  logs: {
    data: ActivityLog[];
    current_page: number;
    last_page: number;
    total: number;
    links: {
      url: string | null;
      label: string;
      active: boolean;
    }[];
  };
}

export default function ActivityLogs({ admin, logs }: ActivityLogsProps) {
  return (
    <GodModeLayout admin={admin} title="Admin Activity Logs">
      <Head title="God Mode - Activity Logs" />

      <div className="mb-6">
        <h2 className="text-xl font-bold text-white font-headline">Audit Trails</h2>
        <p className="text-sm text-white/50">Trace all system login and security-related actions of admins.</p>
      </div>

      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase text-white/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">Administrator</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">IP Address</th>
                <th className="px-6 py-4 font-semibold">Device Info</th>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-body">
              {logs.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-white/40">
                    No activity logs recorded.
                  </td>
                </tr>
              ) : (
                logs.data.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      {log.admin ? (
                        <div className="flex items-center gap-2.5">
                          {log.admin.avatar_url ? (
                            <img
                              src={log.admin.avatar_url}
                              alt={log.admin.name}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-400 text-xs">
                              {log.admin.name?.charAt(0).toUpperCase() || "?"}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-white block leading-tight text-xs">{log.admin.name}</span>
                            <span className="text-[10px] text-white/40 font-mono">{log.admin.email}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-white/40 text-xs italic">Unknown Admin (ID: {log.admin_id})</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {log.action === "login_google" ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs font-semibold">
                          <span className="material-symbols-outlined text-[12px]">login</span>
                          Google Login
                        </span>
                      ) : log.action === "logout" ? (
                        <span className="inline-flex items-center gap-1 bg-white/10 text-white/70 px-2 py-0.5 rounded text-xs font-semibold">
                          <span className="material-symbols-outlined text-[12px]">logout</span>
                          Logout
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-xs font-semibold">
                          {log.action}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-white/60">{log.ip_address || "N/A"}</td>
                    <td className="px-6 py-4 text-xs text-white/50 max-w-xs truncate" title={log.user_agent || ""}>
                      {log.user_agent || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-xs text-white/50">
                      {new Date(log.created_at).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logs.last_page > 1 && (
          <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center text-sm">
            <span className="text-white/50 text-xs">
              Showing page {logs.current_page} of {logs.last_page} ({logs.total} total logs)
            </span>
            <div className="flex gap-1.5">
              {logs.links.map((link, i) => (
                link.url ? (
                  <Link
                    key={i}
                    href={link.url}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      link.active
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                ) : (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded text-xs text-white/30"
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
