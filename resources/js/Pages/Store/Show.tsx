import { Head, Link, usePage } from "@inertiajs/react";
import { PageProps, Product, Store } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";

interface StoreShowProps extends PageProps {
  store: Store;
  products: {
    data: Product[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
  };
}

export default function StoreShow() {
  const { store, products } = usePage<StoreShowProps>().props;

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title={store.name} />

      <div className="h-48 sm:h-64 bg-surface-container-high overflow-hidden">
        {store.banner_url && <img src={store.banner_url} alt={store.name} className="w-full h-full object-cover" />}
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-end gap-4 -mt-12 mb-8">
          <div className="w-24 h-24 rounded-2xl bg-surface-container-highest border-4 border-surface flex items-center justify-center overflow-hidden shrink-0">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-4xl text-on-surface-variant">storefront</span>
            )}
          </div>
          <div className="pb-2">
            <h1 className="font-headline text-2xl font-bold text-on-surface">{store.name}</h1>
            <p className="text-on-surface-variant text-sm mt-1 max-w-xl">{store.description}</p>
          </div>
        </div>

        {products.data.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-3xl p-12 text-center border border-surface-container-high mb-12">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">inventory_2</span>
            <p className="mt-4 font-headline text-lg font-semibold text-on-surface">Belum ada produk</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 mb-12">
            {products.data.map((product) => (
              <Link
                key={product.id}
                href={`/stores/${store.slug}/products/${product.slug}`}
                className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-surface-container-high hover:shadow-[0px_10px_30px_rgba(80,100,71,0.08)] transition-shadow"
              >
                <div className="aspect-square bg-surface-container-high flex items-center justify-center overflow-hidden">
                  {product.primary_image_url ? (
                    <img src={product.primary_image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">image</span>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-medium text-on-surface text-sm truncate">{product.name}</p>
                  <p className="text-primary font-headline font-semibold mt-1">
                    Rp {Number(product.display_price).toLocaleString("id-ID")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {products.last_page > 1 && (
          <div className="flex justify-center gap-2 mb-12">
            {products.links.map((link, i) =>
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
