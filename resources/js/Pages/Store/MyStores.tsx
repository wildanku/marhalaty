import { Head, Link, usePage } from "@inertiajs/react";
import { PageProps, Store } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import StatusBadge from "@/Components/Store/StatusBadge";
import StoreBadgeIcons from "@/Components/Store/StoreBadgeIcons";

interface MyStoresProps extends PageProps {
  stores: Store[];
}

export default function MyStores() {
  const { stores } = usePage<MyStoresProps>().props;

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title="Toko Saya" />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-headline text-3xl font-bold text-on-surface">Toko Saya</h1>
            <p className="text-on-surface-variant mt-2">
              Kelola toko yang kamu miliki atau bantu kelola bersama alumni lain.
            </p>
          </div>
          <Link
            href="/my/stores/create"
            className="shrink-0 inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-label font-medium hover:bg-primary-container hover:text-on-primary-container transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Ajukan Toko
          </Link>
        </div>

        {stores.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-3xl p-12 text-center border border-surface-container-high">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">
              storefront
            </span>
            <p className="mt-4 font-headline text-lg font-semibold text-on-surface">
              Belum ada toko
            </p>
            <p className="text-on-surface-variant mt-1 text-sm">
              Ajukan toko pertamamu dan mulai jualan ke sesama alumni.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/my/stores/${store.id}`}
                className="flex items-center gap-4 bg-surface-container-lowest rounded-2xl p-5 border border-surface-container-high hover:shadow-[0px_10px_30px_rgba(80,100,71,0.08)] transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-surface-container-high flex items-center justify-center overflow-hidden shrink-0">
                  {store.logo_url ? (
                    <img
                      src={store.logo_url}
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-2xl text-on-surface-variant">
                      storefront
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-headline font-semibold text-on-surface truncate flex items-center gap-1.5">
                    <span className="truncate">{store.name}</span>
                    <StoreBadgeIcons badges={store.active_badges} size="sm" />
                  </p>
                  <p className="text-sm text-on-surface-variant truncate">{store.description}</p>
                  {store.status === "rejected" && store.rejection_reason && (
                    <p className="text-xs text-error mt-1">Alasan: {store.rejection_reason}</p>
                  )}
                </div>
                <StatusBadge status={store.status} />
                <span className="material-symbols-outlined text-on-surface-variant">
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
