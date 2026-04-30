import { Head, Link, router } from "@inertiajs/react";
import { PageProps, GontorEvent } from "@/types";

export default function Index({
  auth,
  events,
  currentScope,
}: PageProps<{ events: GontorEvent[]; currentScope: string }>) {
  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col md:flex-row">
      <Head title="Events" />

      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 py-8 gap-2 bg-[#f4f3f1] dark:bg-[#1a1c1a] border-r border-surface-container-high z-50">
        <div className="px-6 mb-8">
          <h1 className="font-headline text-xl font-bold text-[#506447] tracking-tight">
            The Academic Sanctuary
          </h1>
          <p className="font-body text-xs text-on-surface-variant mt-1">Legacy of Gontor</p>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 text-[#444840] dark:text-[#c4c8bd] px-4 py-3 mx-2 hover:bg-[#e6e2d7] dark:hover:bg-[#323632] rounded-lg transition-all font-body text-sm font-medium"
          >
            <span className="material-symbols-outlined">home</span>
            Home
          </Link>
          <Link
            href="/directory"
            className="flex items-center gap-3 text-[#444840] dark:text-[#c4c8bd] px-4 py-3 mx-2 hover:bg-[#e6e2d7] dark:hover:bg-[#323632] rounded-lg transition-all font-body text-sm font-medium"
          >
            <span className="material-symbols-outlined">person_search</span>
            Directory
          </Link>
          <Link
            href="/events"
            className="flex items-center gap-3 bg-[#8da382] text-white rounded-lg mx-2 px-4 py-3 shadow-sm transition-all duration-200 font-body text-sm font-medium translate-x-1"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              calendar_month
            </span>
            Events
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 text-[#444840] dark:text-[#c4c8bd] px-4 py-3 mx-2 hover:bg-[#e6e2d7] dark:hover:bg-[#323632] rounded-lg transition-all font-body text-sm font-medium"
          >
            <span className="material-symbols-outlined">volunteer_activism</span>
            Baitul Maal
          </Link>
        </div>
      </nav>

      <main className="flex-1 md:ml-64 pb-24 md:pb-0 min-h-screen">
        <div className="px-6 md:px-12 py-8 max-w-7xl mx-auto">
          <h2 className="font-headline text-4xl md:text-5xl font-bold text-on-surface tracking-tight mb-2">
            Events & Gatherings
          </h2>
          <p className="font-body text-lg text-on-surface-variant max-w-2xl">
            Discover upcoming alumni events, reconnect with your marhalah, and participate in global
            gatherings.
          </p>
        </div>

        <div className="px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0 scrollbar-hide">
              <button
                onClick={() => router.get("/events", { scope: "all" })}
                className={`${currentScope === "all" ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-on-surface hover:bg-secondary-container"} px-4 py-2 rounded-full font-body text-sm font-medium whitespace-nowrap shadow-sm transition-colors`}
              >
                All Events
              </button>
              <button
                onClick={() => router.get("/events", { scope: "global" })}
                className={`${currentScope === "global" ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-on-surface hover:bg-secondary-container"} px-4 py-2 rounded-full font-body text-sm font-medium whitespace-nowrap shadow-sm transition-colors`}
              >
                Global
              </button>
              {/* <button
                onClick={() => router.get("/events", { scope: "marhalah" })}
                className={`${currentScope === "marhalah" ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-on-surface hover:bg-secondary-container"} px-4 py-2 rounded-full font-body text-sm font-medium whitespace-nowrap shadow-sm transition-colors`}
              >
                My Marhalah
              </button> */}
            </div>

            {events.length === 0 ? (
              <div className="p-8 text-center bg-surface-container-lowest rounded-xl shadow border border-surface-container">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">
                  event_busy
                </span>
                <p className="text-on-surface-variant font-body">
                  No upcoming events match your criteria.
                </p>
              </div>
            ) : (
              events.map((event) => (
                <Link href={`/events/${event.slug}`} key={event.id}>
                  <article className="bg-surface-container-lowest rounded-xl p-5 hover:bg-surface-container-low hover:shadow-[0px_10px_40px_rgba(80,100,71,0.08)] cursor-pointer transition-all group shadow-[0px_2px_10px_rgba(0,0,0,0.02)]">
                    <div className="flex justify-between items-start mb-3">
                      <span className="bg-surface-variant text-on-surface px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide uppercase">
                        {event.visibility_scope === "global" || !event.visibility_scope
                          ? "Global"
                          : `Marhalah ${event.visibility_scope}`}
                      </span>
                      <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-md text-xs font-medium uppercase tracking-wider">
                        {event.payment_type}
                      </span>
                    </div>
                    <h3 className="font-headline text-xl font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <p className="font-body text-sm text-on-surface-variant mb-4">
                      {event.location}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-on-surface-variant">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">
                          calendar_today
                        </span>
                        <span className="font-medium">
                          {new Date(event.event_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))
            )}
          </div>

          <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl shadow-[0px_10px_40px_rgba(80,100,71,0.08)] p-8 text-center hidden lg:flex flex-col items-center justify-center min-h-[400px]">
            <span className="material-symbols-outlined text-6xl text-primary/20 mb-4">
              touch_app
            </span>
            <h3 className="font-headline font-bold text-xl text-on-surface mb-2">
              Select an event
            </h3>
            <p className="text-on-surface-variant font-body text-sm max-w-[200px]">
              Click on any event from the list to view its full details and RSVP form.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
