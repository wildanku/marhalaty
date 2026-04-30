import { Head, Link } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";

interface EventStats {
  total_registrants: number;
  paid_count: number;
  pending_count: number;
  total_revenue: string;
}

interface EventShowProps {
  admin: any;
  event: any;
  rsvps: any[];
  stats: EventStats;
}

export default function EventShow({ admin, event, rsvps, stats }: EventShowProps) {
  return (
    <GodModeLayout admin={admin} title={`Event: ${event.title}`}>
      <Head title={`God Mode - ${event.title}`} />

      <div className="mb-6 flex justify-between items-center">
        <Link
          href="/god-mode/events"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Events
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Registrants */}
        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Total RSVPs
            </h3>
            <span className="material-symbols-outlined text-blue-400 text-[18px]">group</span>
          </div>
          <div className="text-3xl font-bold text-white font-headline">
            {stats.total_registrants}
          </div>
        </div>

        {/* Paid */}
        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Paid / Confirmed
            </h3>
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400 font-headline">
            {stats.paid_count}
          </div>
        </div>

        {/* Pending */}
        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Pending
            </h3>
            <span className="material-symbols-outlined text-amber-400 text-[18px]">pending</span>
          </div>
          <div className="text-3xl font-bold text-amber-400 font-headline">
            {stats.pending_count}
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Collected Revenue
            </h3>
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">payments</span>
          </div>
          <div className="text-2xl font-bold text-white font-headline">
            Rp {parseInt(stats.total_revenue || '0').toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">Registrant List</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase text-white/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Marhalah</th>
                <th className="px-6 py-4 font-semibold">Registration Date</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rsvps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-white/40">
                    No registrations yet.
                  </td>
                </tr>
              ) : (
                rsvps.map((rsvp) => (
                  <tr key={rsvp.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">
                        <Link href={`/god-mode/users/${rsvp.user_id}`} className="hover:text-emerald-400 transition-colors">
                           {rsvp.user?.name || 'Unknown'}
                        </Link>
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">{rsvp.user?.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {rsvp.user?.marhalah_year || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(rsvp.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      Rp {parseInt(rsvp.total_amount).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      {rsvp.status === 'paid' && (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md text-xs font-semibold">
                          Paid
                        </span>
                      )}
                      {rsvp.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-md text-xs font-semibold">
                          Pending
                        </span>
                      )}
                      {rsvp.status === 'expired' && (
                        <span className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 px-2.5 py-1 rounded-md text-xs font-semibold">
                          Expired
                        </span>
                      )}
                      {rsvp.status === 'failed' && (
                        <span className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 px-2.5 py-1 rounded-md text-xs font-semibold">
                          Failed
                        </span>
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
