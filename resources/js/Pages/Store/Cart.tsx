import { Head, Link, router, usePage } from "@inertiajs/react";
import { Cart, CartSummary, PageProps } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";

interface CartSection {
  cart: Cart;
  summary: CartSummary;
}

interface CartPageProps extends PageProps {
  sections: CartSection[];
}

export default function CartPage() {
  const { sections } = usePage<CartPageProps>().props;

  const updateQty = (itemId: number, quantity: number) => {
    router.patch(`/cart/items/${itemId}`, { quantity }, { preserveScroll: true });
  };

  const removeItem = (itemId: number) => {
    router.delete(`/cart/items/${itemId}`, { preserveScroll: true });
  };

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title="Keranjang" />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-headline text-3xl font-bold text-on-surface mb-8">Keranjang</h1>

        {sections.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-3xl p-12 text-center border border-surface-container-high">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">shopping_cart</span>
            <p className="mt-4 font-headline text-lg font-semibold text-on-surface">Keranjangmu kosong</p>
            <Link href="/stores" className="text-primary text-sm hover:underline mt-2 inline-block">
              Jelajahi toko
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map(({ cart, summary }) => (
              <div key={cart.id} className="bg-surface-container-lowest rounded-3xl border border-surface-container-high overflow-hidden">
                <div className="flex items-center gap-3 p-5 border-b border-outline-variant/10">
                  <span className="material-symbols-outlined text-on-surface-variant">storefront</span>
                  <p className="font-headline font-semibold text-on-surface">{cart.store?.name}</p>
                </div>

                {summary.issues.length > 0 && (
                  <div className="mx-5 mt-4 bg-tertiary-container text-on-tertiary-container rounded-xl px-4 py-3 text-sm space-y-1">
                    {summary.issues.map((issue, i) => (
                      <p key={i}>⚠️ {issue.message}</p>
                    ))}
                  </div>
                )}

                <div className="divide-y divide-outline-variant/10">
                  {cart.items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-5">
                      <div className="w-16 h-16 rounded-xl bg-surface-container-high flex items-center justify-center overflow-hidden shrink-0">
                        {item.product?.primary_image_url ? (
                          <img src={item.product.primary_image_url} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-on-surface-variant">image</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-on-surface truncate">{item.product?.name}</p>
                        {item.variant && <p className="text-xs text-on-surface-variant">{item.variant.label}</p>}
                        <p className="text-primary font-headline font-semibold mt-1">
                          Rp {Number(item.variant?.price ?? item.product?.price ?? 0).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface"
                        >
                          <span className="material-symbols-outlined text-[16px]">remove</span>
                        </button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-error hover:bg-error/10 rounded-full p-2 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-5 border-t border-outline-variant/10 bg-surface-container-high/40">
                  <div>
                    <p className="text-sm text-on-surface-variant">Subtotal</p>
                    <p className="font-headline text-lg font-bold text-on-surface">Rp {summary.subtotal.toLocaleString("id-ID")}</p>
                  </div>
                  <Link
                    href={`/checkout/${cart.store?.slug}`}
                    className={`px-6 py-3 rounded-full font-label font-semibold transition-all ${
                      summary.issues.length > 0
                        ? "bg-surface-container-high text-on-surface-variant/50 pointer-events-none"
                        : "bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container"
                    }`}
                  >
                    Checkout
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
