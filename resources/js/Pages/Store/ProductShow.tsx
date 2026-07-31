import { useEffect, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { PageProps, Product, ProductVariant, Store } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import VariantPicker from "@/Components/Store/VariantPicker";
import StoreBadgeIcons from "@/Components/Store/StoreBadgeIcons";

interface ProductShowProps extends PageProps {
  store: Store;
  product: Product;
}

export default function ProductShow() {
  const { auth, store, product } = usePage<ProductShowProps>().props;
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImage, setActiveImage] = useState(product.primary_image_url);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  const price = selectedVariant ? selectedVariant.price : product.display_price;
  const stock = selectedVariant ? selectedVariant.stock_quantity : product.available_stock;
  const canAddToCart = product.has_variants ? selectedVariant !== null && stock > 0 : stock > 0;

  const clampQty = (value: number) => Math.min(Math.max(value, 1), Math.max(stock, 1));

  useEffect(() => {
    setQty((current) => clampQty(current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock]);

  const addToCart = (redirectToCheckout: boolean) => {
    if (!auth.user) {
      router.visit("/login");
      return;
    }

    setAdding(true);
    router.post(
      "/cart/items",
      {
        product_id: product.id,
        product_variant_id: selectedVariant?.id ?? null,
        quantity: qty,
      },
      {
        preserveScroll: true,
        onSuccess: () => redirectToCheckout && router.visit(`/checkout/${store.slug}`),
        onFinish: () => setAdding(false),
      }
    );
  };

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title={product.name} />

      <div className="max-w-5xl mx-auto px-6 pt-12 pb-28 sm:pb-12">
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <Link
            href={`/stores/${store.slug}`}
            className="text-sm text-on-surface-variant hover:text-primary flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            {store.name}
          </Link>
          <StoreBadgeIcons badges={store.active_badges} size="sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <div className="aspect-square bg-surface-container-high rounded-3xl overflow-hidden flex items-center justify-center mb-4">
              {activeImage ? (
                <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">
                  image
                </span>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((url) => (
                  <button
                    key={url}
                    onClick={() => setActiveImage(url)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 ${activeImage === url ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={url} alt={product.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-label">
              {product.type === "physical" ? "Produk Fisik" : "Produk Digital"}
            </p>
            <h1 className="font-headline text-2xl font-bold text-on-surface mt-1">
              {product.name}
            </h1>
            <p className="font-headline text-3xl font-bold text-primary mt-4">
              Rp {Number(price).toLocaleString("id-ID")}
            </p>
            <p className="text-sm text-on-surface-variant mt-1">
              {stock > 0 ? `Stok: ${stock}` : "Stok habis"}
            </p>

            {product.description && (
              <div
                className="rich-text text-on-surface-variant mt-6"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}

            {product.has_variants && (
              <div className="mt-8">
                <VariantPicker product={product} onSelect={setSelectedVariant} />
              </div>
            )}

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-label font-medium text-on-surface-variant">
                  Jumlah
                </span>
                <div className="inline-flex items-center border border-outline-variant/30 rounded-full overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQty((q) => clampQty(q - 1))}
                    disabled={!canAddToCart || qty <= 1}
                    className="w-9 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-lg">remove</span>
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(stock, 1)}
                    value={qty}
                    disabled={!canAddToCart}
                    onChange={(e) => setQty(clampQty(Number(e.target.value) || 1))}
                    className="w-12 h-9 text-center border-x border-outline-variant/30 bg-transparent text-on-surface font-body text-sm focus:outline-none disabled:opacity-40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQty((q) => clampQty(q + 1))}
                    disabled={!canAddToCart || qty >= stock}
                    className="w-9 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                  </button>
                </div>
              </div>

              {/* Above `sm`, actions sit inline. Below `sm`, they move into the fixed bottom bar
                  (further down) so they stay within thumb reach while the buyer scrolls. */}
              <div className="hidden sm:flex gap-3">
                <button
                  type="button"
                  onClick={() => addToCart(true)}
                  disabled={!canAddToCart || adding}
                  title={canAddToCart ? undefined : "Pilih kombinasi produk terlebih dahulu"}
                  className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-8 py-3.5 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-lg">bolt</span>
                  Beli Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => addToCart(false)}
                  disabled={!canAddToCart || adding}
                  title={canAddToCart ? undefined : "Pilih kombinasi produk terlebih dahulu"}
                  className="inline-flex items-center justify-center gap-2 border-2 border-primary text-primary px-8 py-3.5 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container hover:border-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                  Keranjang
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />

      {/* Mobile sticky action bar. `FloatingCartButton` shifts itself up on this route (see its
          own isProductPage check) so the two never overlap. */}
      <div
        className="sm:hidden fixed inset-x-0 bottom-0 z-30 flex gap-3 bg-surface-container-lowest border-t border-outline-variant/20 px-4 pt-3 shadow-[0px_-8px_30px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => addToCart(false)}
          disabled={!canAddToCart || adding}
          title={canAddToCart ? undefined : "Pilih kombinasi produk terlebih dahulu"}
          className="flex-1 inline-flex items-center justify-center gap-2 border-2 border-primary text-primary px-4 py-3 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container hover:border-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
          Keranjang
        </button>
        <button
          type="button"
          onClick={() => addToCart(true)}
          disabled={!canAddToCart || adding}
          title={canAddToCart ? undefined : "Pilih kombinasi produk terlebih dahulu"}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-4 py-3 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-lg">bolt</span>
          Beli Sekarang
        </button>
      </div>
    </div>
  );
}
