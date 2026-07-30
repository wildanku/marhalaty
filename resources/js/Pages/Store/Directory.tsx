import { FormEventHandler, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { PageProps, Store } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";

interface DirectoryProps extends PageProps {
  stores: {
    data: Store[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
  };
  filters: { search: string | null };
}

export default function Directory() {
  const { stores, filters } = usePage<DirectoryProps>().props;
  const [search, setSearch] = useState(filters.search ?? "");

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    router.get("/stores", { filter: { search } }, { preserveState: true, replace: true });
  };

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title="Direktori Toko" />

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-on-surface">Direktori Toko</h1>
          <p className="text-on-surface-variant mt-2">Jelajahi toko-toko yang dikelola sesama alumni.</p>
        </div>

        <form onSubmit={submit} className="max-w-md mb-8">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary">
              <span className="material-symbols-outlined">search</span>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama toko..."
              className="block w-full pl-12 pr-4 py-3 bg-surface-container-high border-0 rounded-full text-on-surface font-body sm:text-sm"
            />
          </div>
        </form>

        {stores.data.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-3xl p-12 text-center border border-surface-container-high">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">storefront</span>
            <p className="mt-4 font-headline text-lg font-semibold text-on-surface">Belum ada toko</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.data.map((store) => (
              <Link
                key={store.id}
                href={`/stores/${store.slug}`}
                className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-surface-container-high hover:shadow-[0px_10px_30px_rgba(80,100,71,0.08)] transition-shadow"
              >
                <div className="h-32 bg-surface-container-high flex items-center justify-center overflow-hidden">
                  {store.banner_url ? (
                    <img src={store.banner_url} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">storefront</span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 -mt-10 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-surface-container-highest border-2 border-surface-container-lowest flex items-center justify-center overflow-hidden shrink-0">
                      {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-on-surface-variant">storefront</span>
                      )}
                    </div>
                  </div>
                  <p className="font-headline font-semibold text-on-surface truncate">{store.name}</p>
                  <p className="text-sm text-on-surface-variant line-clamp-2 mt-1">{store.description}</p>
                  <p className="text-xs text-primary mt-3">{store.active_products_count ?? 0} produk</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {stores.last_page > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {stores.links.map((link, i) =>
              link.url ? (
                <Link
                  key={i}
                  href={link.url}
                  className={`px-3 py-1.5 rounded-lg text-sm ${link.active ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                />
              ) : (
                <span key={i} className="px-3 py-1.5 rounded-lg text-sm text-on-surface-variant/40" dangerouslySetInnerHTML={{ __html: link.label }} />
              )
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
