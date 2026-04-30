import { Head, Link, router } from "@inertiajs/react";
import { PageProps, GontorEvent } from "@/types";
import Header from "@/Components/Header";
import { useTranslate } from "@/hooks/useTranslate";

interface EventIndexProps extends PageProps {
  events: GontorEvent[];
  currentScope: string;
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    day: d.toLocaleDateString("id-ID", { day: "2-digit" }),
    month: d.toLocaleDateString("id-ID", { month: "short" }).toUpperCase(),
    weekday: d.toLocaleDateString("id-ID", { weekday: "long" }),
    time: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }) + " WIB",
    full: d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
  };
}

function PaymentBadge({ type }: { type: GontorEvent["payment_type"] }) {
  if (type === "free") {
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold font-label bg-emerald-100 text-emerald-700">
        Gratis
      </span>
    );
  }
  return (
    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold font-label bg-amber-100 text-amber-700">
      Berbayar
    </span>
  );
}

export default function Index({ events, currentScope }: EventIndexProps) {
  const { t } = useTranslate();

  const filters = [
    { key: "all", label: t("Semua Acara") },
    { key: "global", label: t("Global") },
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased font-body">
      <Head title="Acara & Gathering — Dynamic Everywhere" />
      <Header />

      {/* Page Hero */}
      <div className="bg-surface border-b border-outline-variant/20">
        <div className="max-w-[900px] mx-auto px-6 py-10 md:py-14">
          <span className="inline-block mb-3 text-xs font-bold uppercase tracking-[0.15em] text-primary font-label">
            {t("Acara & Gathering")}
          </span>
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight mb-3">
            {t("Jadwal Acara Alumni")}
          </h1>
          <p className="font-body text-on-surface-variant text-base md:text-lg max-w-xl">
            {t("Temukan acara mendatang, reuni marhalah, dan pertemuan komunitas alumni.")}
          </p>

          {/* Filter Pills */}
          <div className="flex gap-2 mt-7 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => router.get("/events", { scope: f.key }, { preserveScroll: true })}
                className={`px-5 py-2 rounded-full font-label text-sm font-semibold transition-all ${
                  currentScope === f.key
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events List */}
      <main className="max-w-[900px] mx-auto px-6 py-10">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-4xl text-outline">event_busy</span>
            </div>
            <h3 className="font-headline text-xl font-bold text-on-surface mb-2">
              {t("Belum Ada Acara")}
            </h3>
            <p className="text-on-surface-variant font-body text-sm max-w-xs">
              {t("Tidak ada acara yang sesuai filter saat ini. Coba pilih kategori lain.")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {events.map((event, index) => {
              const date = formatEventDate(event.event_date);
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
                  {/* Date Badge */}
                  <div
                    className={`flex sm:flex-col items-center justify-center gap-3 sm:gap-1 px-6 py-4 sm:py-8 sm:w-24 shrink-0 ${
                      isFirst ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface"
                    }`}
                  >
                    <span
                      className={`font-headline font-extrabold text-3xl sm:text-4xl leading-none ${
                        isFirst ? "text-on-primary" : "text-primary"
                      }`}
                    >
                      {date.day}
                    </span>
                    <span
                      className={`font-label font-bold text-sm uppercase tracking-wider ${
                        isFirst ? "text-on-primary/80" : "text-on-surface-variant"
                      }`}
                    >
                      {date.month}
                    </span>
                  </div>

                  {/* Event Info */}
                  <div className="flex flex-1 flex-col sm:flex-row items-start sm:items-center gap-4 px-6 py-5">
                    <div className="flex-1 min-w-0">
                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <PaymentBadge type={event.payment_type} />
                        {event.visibility_scope && event.visibility_scope !== "global" ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold font-label bg-secondary-container text-on-surface-variant">
                            Marhalah {event.visibility_scope}
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold font-label bg-surface-container text-on-surface-variant">
                            Global
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
                            <span className="truncate max-w-[220px]">{event.location}</span>
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
                        {t("Lihat Detail")}
                        <span className="material-symbols-outlined text-base">east</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
