import { Link } from "@inertiajs/react";
import { GontorEvent } from "@/types";
import { useTranslate } from "@/hooks/useTranslate";

interface UpcomingEventsProps {
  events: GontorEvent[];
}

function formatEventDate(dateStr: string): { day: string; month: string; time: string } {
  const d = new Date(dateStr);
  return {
    day: d.toLocaleDateString("id-ID", { day: "2-digit" }),
    month: d.toLocaleDateString("id-ID", { month: "short" }).toUpperCase(),
    time: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }) + " WIB",
  };
}

function getPaymentLabel(event: GontorEvent): { label: string; color: string } {
  if (event.payment_type === "free") {
    return { label: "Gratis", color: "bg-emerald-100 text-emerald-700" };
  }
  return { label: "Berbayar", color: "bg-amber-100 text-amber-700" };
}

export default function UpcomingEvents({ events }: UpcomingEventsProps) {
  const { t } = useTranslate();

  if (!events || events.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-surface">
      <div className="max-w-[900px] mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <span className="inline-block mb-3 text-xs font-bold uppercase tracking-[0.15em] text-primary font-label">
              {t("Acara Mendatang")}
            </span>
            <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight">
              {t("Jangan Sampai Ketinggalan")}
            </h2>
          </div>
          <Link
            href="/events"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-tertiary transition-colors font-label group"
          >
            {t("Lihat Semua Acara")}
            <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </Link>
        </div>

        {/* Events List */}
        <div className="flex flex-col gap-4">
          {events.map((event, index) => {
            const date = formatEventDate(event.event_date);
            const payment = getPaymentLabel(event);
            const isFirst = index === 0;

            return (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className={`group flex flex-col sm:flex-row gap-0 rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-[0px_8px_32px_rgba(80,100,71,0.12)] hover:-translate-y-0.5 ${
                  isFirst
                    ? "border-primary/20 bg-primary/[0.03]"
                    : "border-outline-variant/30 bg-surface-container-lowest"
                }`}
              >
                {/* Date Badge — Left column on desktop, top strip on mobile */}
                <div
                  className={`flex sm:flex-col items-center justify-center gap-3 sm:gap-0 px-6 py-4 sm:py-8 sm:w-24 shrink-0 ${
                    isFirst
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface"
                  }`}
                >
                  <span className={`font-headline font-extrabold text-3xl sm:text-4xl leading-none ${isFirst ? "text-on-primary" : "text-primary"}`}>
                    {date.day}
                  </span>
                  <span className={`font-label font-bold text-sm uppercase tracking-wider ${isFirst ? "text-on-primary/80" : "text-on-surface-variant"}`}>
                    {date.month}
                  </span>
                </div>

                {/* Event Info */}
                <div className="flex flex-1 flex-col sm:flex-row items-start sm:items-center gap-4 px-6 py-5">
                  <div className="flex-1 min-w-0">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold font-label ${payment.color}`}>
                        {payment.label}
                      </span>
                      {event.visibility_scope && event.visibility_scope !== "global" && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold font-label bg-secondary-container text-on-surface-variant">
                          Marhalah {event.visibility_scope}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-headline font-bold text-lg text-on-surface group-hover:text-primary transition-colors truncate mb-1.5">
                      {event.title}
                    </h3>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-on-surface-variant font-body">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        {date.time}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">location_on</span>
                          <span className="truncate max-w-[200px]">{event.location}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="shrink-0 self-end sm:self-auto">
                    <span
                      className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full font-label font-semibold text-sm transition-all ${
                        isFirst
                          ? "bg-primary text-on-primary group-hover:bg-primary/90"
                          : "bg-surface-container text-on-surface group-hover:bg-primary group-hover:text-on-primary"
                      }`}
                    >
                      {t("Daftar")}
                      <span className="material-symbols-outlined text-base">east</span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors font-body"
          >
            <span className="material-symbols-outlined text-base">login</span>
            {t("Masuk untuk melihat semua acara dan RSVP")}
          </Link>
        </div>
      </div>
    </section>
  );
}
