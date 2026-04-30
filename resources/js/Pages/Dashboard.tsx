import { Head, Link, usePage } from "@inertiajs/react";
import { PageProps, Rsvp } from "@/types";
import Header from "@/Components/Header";

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  pending: {
    label: "Menunggu Konfirmasi",
    bg: "bg-amber-50",
    text: "text-amber-700",
    icon: "schedule",
  },
  paid: {
    label: "Terkonfirmasi",
    bg: "bg-green-50",
    text: "text-green-700",
    icon: "check_circle",
  },
  expired: { label: "Kedaluwarsa", bg: "bg-red-50", text: "text-red-600", icon: "timer_off" },
  failed: { label: "Gagal", bg: "bg-red-50", text: "text-red-600", icon: "cancel" },
};

export default function Dashboard() {
  const { auth, rsvps } = usePage<PageProps<{ rsvps: Rsvp[] }>>().props;

  const formatRupiah = (val: string) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(parseFloat(val));

  return (
    <div className="min-h-screen bg-background text-on-background font-body antialiased">
      <Head title="Dashboard" />
      <Header />

      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="font-headline text-3xl font-bold text-on-surface tracking-tight">
            Selamat datang, {auth?.user?.name?.split(" ")[0]}!
          </h1>
          <p className="font-body text-on-surface-variant mt-1 text-sm">
            Ini adalah ringkasan aktivitas kamu di Dynamic Everywhere.
          </p>
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {[
            { href: "/directory", icon: "groups", label: "Direktori Alumni" },
            { href: "/events", icon: "calendar_month", label: "Event & Reuni" },
            { href: "/maal", icon: "volunteer_activism", label: "Baitul Maal" },
            { href: `/p/${auth?.user?.slug}`, icon: "person", label: "Profil Saya" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-2 bg-surface-container-lowest border border-surface-container-high rounded-2xl p-5 hover:border-primary/30 hover:bg-surface-container-low transition-all group text-center"
            >
              <span
                className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform"
                style={{ fontVariationSettings: "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="font-body text-xs font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* RSVP List */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-headline text-xl font-bold text-on-surface">Event yang Diikuti</h2>
            <Link
              href="/events"
              className="font-body text-sm text-primary hover:underline flex items-center gap-1"
            >
              Lihat semua event
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          {rsvps.length === 0 ? (
            <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-10 text-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-3 block">
                event_busy
              </span>
              <p className="font-headline font-semibold text-on-surface mb-1">
                Belum ada event yang diikuti
              </p>
              <p className="font-body text-sm text-on-surface-variant mb-6">
                Temukan event alumni dan daftar sekarang.
              </p>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-full font-body font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                Lihat Event
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {rsvps.map((rsvp) => {
                const cfg = statusConfig[rsvp.status] ?? statusConfig.pending;
                const event = rsvp.event;

                return (
                  <div
                    key={rsvp.id}
                    className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-5 hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={event ? `/events/${event.slug}` : "#"}
                          className="font-headline font-bold text-on-surface hover:text-primary transition-colors block truncate"
                        >
                          {event?.title ?? "Event tidak ditemukan"}
                        </Link>
                        {event && (
                          <div className="flex items-center gap-4 mt-1">
                            <span className="font-body text-xs text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                calendar_today
                              </span>
                              {new Date(event.event_date).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                            <span className="font-body text-xs text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                location_on
                              </span>
                              {event.location}
                            </span>
                          </div>
                        )}
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} whitespace-nowrap flex-shrink-0`}
                      >
                        <span className="material-symbols-outlined text-[13px]">{cfg.icon}</span>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-surface-container flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="font-body text-[10px] text-on-surface-variant uppercase tracking-wider">
                            Total
                          </p>
                          <p className="font-headline font-bold text-on-surface text-sm">
                            {formatRupiah(rsvp.total_amount)}
                          </p>
                        </div>
                        {rsvp.add_ons_snapshot && rsvp.add_ons_snapshot.length > 0 && (
                          <div>
                            <p className="font-body text-[10px] text-on-surface-variant uppercase tracking-wider">
                              Merchandise
                            </p>
                            <p className="font-body text-sm text-on-surface">
                              {rsvp.add_ons_snapshot.length} item
                            </p>
                          </div>
                        )}
                      </div>
                      <p className="font-body text-[11px] text-on-surface-variant">
                        Daftar:{" "}
                        {new Date(rsvp.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
