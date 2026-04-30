import { Head } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";

interface DashboardProps {
  admin: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  stats: {
    total_users: number;
    verified_users: number;
    total_events: number;
    total_revenue: number;
    pending_rsvps: number;
  };
}

export default function Dashboard({ admin, stats }: DashboardProps) {
  return (
    <GodModeLayout admin={admin} title="System Overview">
      <Head title="God Mode - Dashboard" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Total Users
            </h3>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-400 text-[18px]">
                group
              </span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white font-headline">
            {stats.total_users.toLocaleString()}
          </div>
        </div>

        {/* Verified Users */}
        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Verified Users
            </h3>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-400 text-[18px]">
                verified_user
              </span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white font-headline">
            {stats.verified_users.toLocaleString()}
          </div>
        </div>

        {/* Total Events */}
        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Total Events
            </h3>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-400 text-[18px]">
                event
              </span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white font-headline">
            {stats.total_events.toLocaleString()}
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Total Revenue
            </h3>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-400 text-[18px]">
                payments
              </span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white font-headline">
            Rp {stats.total_revenue.toLocaleString("id-ID")}
          </div>
        </div>
      </div>
      
      {stats.pending_rsvps > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex items-start gap-4">
           <span className="material-symbols-outlined text-amber-400">
             warning
           </span>
           <div>
             <h3 className="text-amber-400 font-bold mb-1">Pending Action</h3>
             <p className="text-amber-400/80 text-sm">
               There are {stats.pending_rsvps} pending RSVPs waiting for payment confirmation.
             </p>
           </div>
        </div>
      )}
    </GodModeLayout>
  );
}
