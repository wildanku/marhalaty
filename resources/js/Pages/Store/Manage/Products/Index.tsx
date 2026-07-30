import { Head, Link, router, usePage } from "@inertiajs/react";
import { PageProps, Product, Store } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import StatusBadge from "@/Components/Store/StatusBadge";

interface ProductsIndexProps extends PageProps {
  store: Store;
  products: {
    data: Product[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    total: number;
  };
}

export default function ProductsIndex() {
  const { store, products } = usePage<ProductsIndexProps>().props;

  const changeStatus = (product: Product, status: string) => {
    router.patch(`/my/stores/${store.id}/products/${product.id}/status`, { status }, { preserveScroll: true });
  };

  const destroy = (product: Product) => {
    if (!confirm(`Hapus produk "${product.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    router.delete(`/my/stores/${store.id}/products/${product.id}`, { preserveScroll: true });
  };

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title={`Produk - ${store.name}`} />

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link href={`/my/stores/${store.id}`} className="text-sm text-on-surface-variant hover:text-primary flex items-center gap-1 mb-2">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              {store.name}
            </Link>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Produk</h1>
          </div>
          <Link
            href={`/my/stores/${store.id}/products/create`}
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-label font-medium hover:bg-primary-container hover:text-on-primary-container transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Tambah Produk
          </Link>
        </div>

        <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high overflow-hidden">
          {products.data.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">inventory_2</span>
              <p className="mt-4 font-headline text-lg font-semibold text-on-surface">Belum ada produk</p>
              <p className="text-on-surface-variant mt-1 text-sm">Tambahkan produk pertamamu untuk mulai berjualan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-high text-xs uppercase text-on-surface-variant">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Produk</th>
                    <th className="px-6 py-4 font-semibold">Tipe</th>
                    <th className="px-6 py-4 font-semibold">Harga</th>
                    <th className="px-6 py-4 font-semibold">Stok</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {products.data.map((product) => (
                    <tr key={product.id} className="hover:bg-surface-container-high/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center overflow-hidden shrink-0">
                            {product.primary_image_url ? (
                              <img src={product.primary_image_url} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">image</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-on-surface truncate">{product.name}</p>
                            {product.sku && <p className="text-xs text-on-surface-variant">{product.sku}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {product.type === "physical" ? "Fisik" : "Digital"}
                        {product.has_variants && <span className="ml-1 text-xs">(varian)</span>}
                      </td>
                      <td className="px-6 py-4 text-on-surface">Rp {Number(product.display_price).toLocaleString("id-ID")}</td>
                      <td className="px-6 py-4 text-on-surface">{product.available_stock}</td>
                      <td className="px-6 py-4">
                        <select
                          value={product.status}
                          onChange={(e) => changeStatus(product, e.target.value)}
                          className="bg-surface border border-outline rounded-lg px-2 py-1 text-xs"
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Aktif</option>
                          <option value="archived">Diarsipkan</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/my/stores/${store.id}/products/${product.id}/edit`}
                            className="px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors text-xs font-semibold"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => destroy(product)}
                            className="text-error hover:bg-error/10 rounded-lg p-1.5 transition-colors"
                            title="Hapus"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {products.last_page > 1 && (
            <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-between items-center text-sm">
              <span className="text-on-surface-variant">
                Halaman {products.current_page} dari {products.last_page} ({products.total} produk)
              </span>
              <div className="flex gap-2">
                {products.links.map((link, i) =>
                  link.url ? (
                    <Link
                      key={i}
                      href={link.url}
                      className={`px-3 py-1 rounded ${link.active ? "bg-primary/20 text-primary" : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"}`}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                  ) : (
                    <span key={i} className="px-3 py-1 rounded text-on-surface-variant/40" dangerouslySetInnerHTML={{ __html: link.label }} />
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
