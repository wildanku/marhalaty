import { Head, Link } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";

interface Event {
  id: number;
  title: string;
  slug: string;
  event_date: string;
  payment_type: string;
  visibility_scope: string | null;
  rsvps_count: number;
  total_revenue: string | null;
}

interface EventsIndexProps {
  admin: any;
  events: Event[];
}

export default function EventsIndex({ admin, events }: EventsIndexProps) {
  return (
    <GodModeLayout admin={admin} title="Event Management">
      <Head title="God Mode - Events" />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white font-headline">Events Overview</h2>
          <p className="text-sm text-white/50">Manage upcoming and past events.</p>
        </div>
        {/* Placeholder for future Create Event feature */}
        <button className="bg-emerald-500 hover:bg-emerald-400 text-[#0f1117] px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20">
          Create Event
        </button>
      </div>

      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase text-white/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">Event Name</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Scope</th>
                <th className="px-6 py-4 font-semibold text-center">RSVPs</th>
                <th className="px-6 py-4 font-semibold text-right">Revenue</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/40">
                    No events found.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{event.title}</div>
                      <div className="text-xs text-white/40 mt-1 capitalize">
                        {event.payment_type}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(event.event_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {event.visibility_scope ? (
                        <span className="bg-white/5 text-white/80 px-2.5 py-1 rounded-md text-xs font-semibold">
                          Marhalah {event.visibility_scope}
                        </span>
                      ) : (
                        <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md text-xs font-semibold">
                          Global
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 font-semibold text-white">
                        {event.rsvps_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-400">
                      {event.total_revenue ? `Rp ${parseInt(event.total_revenue).toLocaleString('id-ID')}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/god-mode/events/${event.id}`}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors text-xs font-semibold"
                      >
                        Manage
                      </Link>
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
