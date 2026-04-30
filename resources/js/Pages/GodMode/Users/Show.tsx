import { Head, Link } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";

interface User {
  id: number;
  name: string;
  email: string;
  marhalah_year: number;
  is_verified: boolean;
  phone_number: string | null;
  country: string;
  foreign_city: string | null;
  city: { id: string; name: string } | null;
  profession: { id: number; value: string } | null;
  campus: { id: number; value: string } | null;
  social_media: Record<string, string> | null;
  created_at: string;
}

interface UserShowProps {
  admin: any;
  user: User;
  rsvps: any[];
}

export default function UserShow({ admin, user, rsvps }: UserShowProps) {
  return (
    <GodModeLayout admin={admin} title={`User: ${user.name}`}>
      <Head title={`God Mode - ${user.name}`} />

      <div className="mb-6">
        <Link
          href="/god-mode/users"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Users
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info Card */}
        <div className="lg:col-span-1 bg-[#161b22] border border-white/5 rounded-2xl p-6">
          <div className="flex flex-col items-center text-center border-b border-white/5 pb-6 mb-6">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <span className="text-emerald-400 text-3xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">{user.name}</h2>
            <p className="text-white/50">{user.email}</p>
            <div className="mt-4 flex gap-2">
              <span className="bg-white/5 text-white/80 px-3 py-1.5 rounded-md text-xs font-semibold">
                Marhalah {user.marhalah_year}
              </span>
              {user.is_verified ? (
                <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-md text-xs font-semibold">
                  Verified
                </span>
              ) : (
                <span className="bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-md text-xs font-semibold">
                  Unverified
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-white/40 mb-1">Phone Number</p>
              <p className="text-white font-medium">{user.phone_number || "-"}</p>
            </div>
            <div>
              <p className="text-white/40 mb-1">Location</p>
              <p className="text-white font-medium">
                {user.city ? user.city.name : (user.foreign_city || "-")}, {user.country}
              </p>
            </div>
            <div>
              <p className="text-white/40 mb-1">Profession</p>
              <p className="text-white font-medium">{user.profession?.value || "-"}</p>
            </div>
            <div>
              <p className="text-white/40 mb-1">Campus / University</p>
              <p className="text-white font-medium">{user.campus?.value || "-"}</p>
            </div>
            <div>
              <p className="text-white/40 mb-1">Joined Date</p>
              <p className="text-white font-medium">
                {new Date(user.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            
            {user.social_media && Object.keys(user.social_media).length > 0 && (
               <div className="pt-4 border-t border-white/5">
                 <p className="text-white/40 mb-2">Social Media</p>
                 <div className="flex gap-3">
                   {Object.entries(user.social_media).map(([platform, handle]) => (
                     handle && (
                       <a key={platform} href="#" className="text-white hover:text-emerald-400 transition-colors capitalize text-xs bg-white/5 px-2 py-1 rounded">
                         {platform}: {handle}
                       </a>
                     )
                   ))}
                 </div>
               </div>
            )}
          </div>
        </div>

        {/* User Activity / Event RSVPs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">local_activity</span>
              Event RSVPs
            </h3>

            {rsvps.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                This user has not registered for any events yet.
              </div>
            ) : (
              <div className="space-y-4">
                {rsvps.map((rsvp) => (
                  <div key={rsvp.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div>
                      <h4 className="font-semibold text-white mb-1">
                        {rsvp.event?.title || "Unknown Event"}
                      </h4>
                      <p className="text-xs text-white/50 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        {rsvp.event ? new Date(rsvp.event.event_date).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                      <div className="font-semibold text-white">
                        Rp {parseInt(rsvp.total_amount).toLocaleString('id-ID')}
                      </div>
                      <div>
                        {rsvp.status === 'paid' && (
                          <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md text-xs font-semibold">Paid</span>
                        )}
                        {rsvp.status === 'pending' && (
                          <span className="bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-md text-xs font-semibold">Pending</span>
                        )}
                        {rsvp.status === 'expired' && (
                          <span className="bg-red-500/10 text-red-400 px-2.5 py-1 rounded-md text-xs font-semibold">Expired</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </GodModeLayout>
  );
}
