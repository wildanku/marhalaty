import { Link } from "@inertiajs/react";
import { Product } from "@/types";
import { useTranslate } from "@/hooks/useTranslate";
import StoreBadgeList from "@/Components/Store/StoreBadgeList";

interface FeaturedProductsSectionProps {
  featuredProducts: Product[];
  hasPubliclyVisibleStore: boolean;
}

export default function FeaturedProductsSection({
  featuredProducts,
  hasPubliclyVisibleStore,
}: FeaturedProductsSectionProps) {
  const { t } = useTranslate();

  if (!hasPubliclyVisibleStore) return null;

  return (
    <section className="py-24 bg-surface-container-low relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-headline font-bold text-on-surface mb-4">
              {t("Produk Pilihan")}
            </h2>
            <p className="text-on-surface-variant font-body max-w-2xl">
              {t("Jelajahi karya dan produk dari toko alumni.")}
            </p>
          </div>
          <Link
            href="/stores"
            className="inline-flex items-center text-primary font-label font-semibold hover:text-tertiary transition-colors shrink-0"
          >
            {t("Lihat Semua Toko")}{" "}
            <span className="material-symbols-outlined ml-2 text-sm">arrow_forward</span>
          </Link>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/stores/${product.store?.slug}/products/${product.slug}`}
                className="group bg-surface-container-lowest rounded-2xl overflow-hidden hover:shadow-[0px_10px_40px_rgba(80,100,71,0.08)] transition-all duration-300"
              >
                <div className="aspect-square bg-surface-container-high overflow-hidden flex items-center justify-center">
                  {product.primary_image_url ? (
                    <img
                      src={product.primary_image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
                      image
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-on-surface-variant font-label truncate mb-1">
                    {product.store?.name}
                  </p>
                  <h3 className="font-headline font-semibold text-on-surface text-sm truncate mb-2">
                    {product.name}
                  </h3>
                  <p className="font-headline font-bold text-primary text-sm mb-2">
                    Rp {Number(product.display_price).toLocaleString("id-ID")}
                  </p>
                  <StoreBadgeList badges={product.store?.active_badges} size="sm" max={2} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Link
            href="/stores"
            className="block bg-primary-container rounded-2xl p-8 group hover:shadow-[0px_10px_40px_rgba(80,100,71,0.08)] transition-all duration-300"
          >
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-full bg-surface-bright/30 flex items-center justify-center text-on-primary-container shrink-0">
                <span className="material-symbols-outlined text-2xl">storefront</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-headline font-bold text-on-primary-container mb-1">
                  {t("Toko alumni sudah hadir")}
                </h3>
                <p className="text-on-primary-container/80 font-body text-sm">
                  {t("Jelajahi produk pilihan dari sesama alumni.")}
                </p>
              </div>
              <span className="material-symbols-outlined text-on-primary-container group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
