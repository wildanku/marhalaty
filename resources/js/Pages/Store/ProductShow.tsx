import { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { PageProps, Product, ProductVariant, Store } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import VariantPicker from "@/Components/Store/VariantPicker";
import StoreBadgeList from "@/Components/Store/StoreBadgeList";

interface ProductShowProps extends PageProps {
  store: Store;
  product: Product;
}

export default function ProductShow() {
  const { auth, store, product } = usePage<ProductShowProps>().props;
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImage, setActiveImage] = useState(product.primary_image_url);
  const [adding, setAdding] = useState(false);

  const price = selectedVariant ? selectedVariant.price : product.display_price;
  const stock = selectedVariant ? selectedVariant.stock_quantity : product.available_stock;
  const canAddToCart = product.has_variants ? selectedVariant !== null && stock > 0 : stock > 0;

  const addToCart = () => {
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
        quantity: 1,
      },
      {
        preserveScroll: true,
        onFinish: () => setAdding(false),
      }
    );
  };

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title={product.name} />

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <Link href={`/stores/${store.slug}`} className="text-sm text-on-surface-variant hover:text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            {store.name}
          </Link>
          <StoreBadgeList badges={store.active_badges} size="sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <div className="aspect-square bg-surface-container-high rounded-3xl overflow-hidden flex items-center justify-center mb-4">
              {activeImage ? (
                <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">image</span>
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
            <h1 className="font-headline text-2xl font-bold text-on-surface mt-1">{product.name}</h1>
            <p className="font-headline text-3xl font-bold text-primary mt-4">
              Rp {Number(price).toLocaleString("id-ID")}
            </p>
            <p className="text-sm text-on-surface-variant mt-1">
              {stock > 0 ? `Stok: ${stock}` : "Stok habis"}
            </p>

            {product.description && (
              <div className="rich-text text-on-surface-variant mt-6" dangerouslySetInnerHTML={{ __html: product.description }} />
            )}

            {product.has_variants && (
              <div className="mt-8">
                <VariantPicker product={product} onSelect={setSelectedVariant} />
              </div>
            )}

            <div className="mt-8">
              <button
                type="button"
                onClick={addToCart}
                disabled={!canAddToCart || adding}
                title={canAddToCart ? undefined : "Pilih kombinasi produk terlebih dahulu"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-8 py-3.5 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                Tambah ke Keranjang
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
