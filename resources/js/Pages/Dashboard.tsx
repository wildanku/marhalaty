import { Head, Link, usePage } from "@inertiajs/react";
import { PageProps, Rsvp } from "@/types";
import Header from "@/Components/Header";
import { useTranslate } from "@/hooks/useTranslate";

export default function Dashboard() {
  const { auth, rsvps } = usePage<PageProps<{ rsvps: Rsvp[] }>>().props;
  const { t, locale } = useTranslate();

  const statusConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
    pending: {
      label: t("Pending Confirmation"),
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      text: "text-amber-700 dark:text-amber-400 border-amber-500/20",
      icon: "schedule",
    },
    paid: {
      label: t("Confirmed"),
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      text: "text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      icon: "check_circle",
    },
    expired: {
      label: t("Expired"),
      bg: "bg-red-500/10 dark:bg-red-500/20",
      text: "text-red-600 dark:text-red-400 border-red-500/20",
      icon: "timer_off",
    },
    failed: {
      label: t("Failed"),
      bg: "bg-red-500/10 dark:bg-red-500/20",
      text: "text-red-600 dark:text-red-400 border-red-500/20",
      icon: "cancel",
    },
  };

  const dateLocale = locale === "id" ? "id-ID" : "en-US";

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
            {t("Welcome, :name!", { name: auth?.user?.name?.split(" ")[0] ?? "" })}
          </h1>
          <p className="font-body text-on-surface-variant mt-1 text-sm">
            {t("Here's a summary of your activity on Dynamic Foundation.")}
          </p>
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {[
            { href: "/directory", icon: "groups", label: t("Alumni Directory") },
            { href: "/events", icon: "calendar_month", label: t("Events & Reunions") },
            { href: "/maal", icon: "volunteer_activism", label: t("Baitul Maal") },
            { href: `/p/${auth?.user?.slug}`, icon: "person", label: t("My Profile") },
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
            <h2 className="font-headline text-xl font-bold text-on-surface">
              {t("Registered Events")}
            </h2>
            <Link
              href="/events"
              className="font-body text-sm text-primary hover:underline flex items-center gap-1"
            >
              {t("View all events")}
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          {rsvps.length === 0 ? (
            <div className="bg-surface-container-lowest border border-surface-container-high rounded-2xl p-10 text-center">
              <span className="material-symbols-outlined text-5xl text-outline mb-3 block">
                event_busy
              </span>
              <p className="font-headline font-semibold text-on-surface mb-1">
                {t("No registered events yet")}
              </p>
              <p className="font-body text-sm text-on-surface-variant mb-6">
                {t("Find alumni events and register now.")}
              </p>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-full font-body font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                {t("Browse Events")}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {rsvps.map((rsvp) => {
                const cfg = statusConfig[rsvp.status] ?? statusConfig.pending;
                const event = rsvp.event;
                const tx = rsvp.latest_transaction;
                const paymentHash = tx?.payment_hash;

                return (
                  <div
                    key={rsvp.id}
                    className="relative bg-surface-container-lowest border border-surface-container-high rounded-2xl p-5 hover:border-primary/20 hover:shadow-md transition-all duration-300 flex flex-col gap-4 overflow-hidden"
                  >
                    {/* Status color indicator bar on left */}
                    <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                      rsvp.status === 'paid' ? 'bg-emerald-500' :
                      rsvp.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-2">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={event ? `/events/${event.slug}` : "#"}
                          className="font-headline font-bold text-on-surface hover:text-primary transition-colors block text-base sm:text-lg leading-snug"
                        >
                          {event?.title ?? t("Event not found")}
                        </Link>
                        {event && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 mt-2">
                            <span className="font-body text-xs text-on-surface-variant flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px] text-primary">
                                calendar_today
                              </span>
                              {new Date(event.event_date).toLocaleDateString(dateLocale, {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                            <span className="font-body text-xs text-on-surface-variant flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px] text-primary">
                                location_on
                              </span>
                              <span className="truncate max-w-[250px]">{event.location}</span>
                            </span>
                          </div>
                        )}
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} self-start sm:self-center whitespace-nowrap`}
                      >
                        <span className="material-symbols-outlined text-[13px]">{cfg.icon}</span>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="mt-2 pt-4 border-t border-dashed border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-2">
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                        <div>
                          <p className="font-body text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                            {t("Total")}
                          </p>
                          <p className="font-headline font-extrabold text-on-surface text-base">
                            {formatRupiah(rsvp.total_amount)}
                          </p>
                        </div>
                        {rsvp.add_ons_snapshot && rsvp.add_ons_snapshot.length > 0 && (
                          <div>
                            <p className="font-body text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                              {t("Merchandise")}
                            </p>
                            <p className="font-body text-sm text-on-surface font-medium flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px] text-secondary">shopping_bag</span>
                              {rsvp.add_ons_snapshot.length} item
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="font-body text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                            {t("Registered Date")}
                          </p>
                          <p className="font-body text-xs text-on-surface-variant font-medium mt-0.5">
                            {new Date(rsvp.created_at).toLocaleDateString(dateLocale, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons based on status & transaction */}
                      {paymentHash && (
                        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
                          {rsvp.status === 'pending' ? (
                            <Link
                              href={`/payment/${paymentHash}`}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-on-primary hover:bg-primary/90 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 shadow-sm shadow-primary/10 hover:shadow-md"
                            >
                              <span className="material-symbols-outlined text-[16px]">payments</span>
                              {tx?.payment_provider === 'manual' ? t("Upload Bukti Transfer") : t("Bayar Sekarang")}
                            </Link>
                          ) : (
                            <Link
                              href={`/payment/${paymentHash}`}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border border-surface-container-highest"
                            >
                              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                              {t("Detail Pembayaran")}
                            </Link>
                          )}
                        </div>
                      )}
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
