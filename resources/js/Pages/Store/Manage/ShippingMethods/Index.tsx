import { Head, Link, router, usePage } from "@inertiajs/react";
import { PageProps, Store, StoreShippingMethod } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";

interface ShippingMethodsIndexProps extends PageProps {
  store: Store;
  methods: StoreShippingMethod[];
}

const TYPE_LABEL: Record<StoreShippingMethod["type"], string> = {
  pickup: "Ambil di Tempat",
  flat: "Flat / Kurir Toko",
};

export default function ShippingMethodsIndex() {
  const { store, methods } = usePage<ShippingMethodsIndexProps>().props;

  const toggleActive = (method: StoreShippingMethod) => {
    router.patch(
      `/my/stores/${store.id}/shipping-methods/${method.id}/status`,
      { is_active: !method.is_active },
      { preserveScroll: true }
    );
  };

  const destroy = (method: StoreShippingMethod) => {
    if (!confirm(`Hapus metode pengiriman "${method.name}"? Tindakan ini tidak bisa dibatalkan.`))
      return;
    router.delete(`/my/stores/${store.id}/shipping-methods/${method.id}`, { preserveScroll: true });
  };

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title={`Metode Pengiriman - ${store.name}`} />

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link
              href={`/my/stores/${store.id}`}
              className="text-sm text-on-surface-variant hover:text-primary flex items-center gap-1 mb-2"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              {store.name}
            </Link>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Metode Pengiriman</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Tambahkan opsi pengiriman sendiri (mis. ambil di tempat, kurir toko) dengan tarif flat
              — tidak menggunakan data ongkir dari RajaOngkir.
            </p>
          </div>
          <Link
            href={`/my/stores/${store.id}/shipping-methods/create`}
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-label font-medium hover:bg-primary-container hover:text-on-primary-container transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Tambah Metode
          </Link>
        </div>

        <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high overflow-hidden">
          {methods.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">
                local_shipping
              </span>
              <p className="mt-4 font-headline text-lg font-semibold text-on-surface">
                Belum ada metode pengiriman
              </p>
              <p className="text-on-surface-variant mt-1 text-sm">
                Tambahkan mis. "Ambil di Toko" atau "Kurir Toko" agar pembeli punya pilihan selain
                kurir ongkir.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-high text-xs uppercase text-on-surface-variant">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Nama</th>
                    <th className="px-6 py-4 font-semibold">Tipe</th>
                    <th className="px-6 py-4 font-semibold">Tarif</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {methods.map((method) => (
                    <tr
                      key={method.id}
                      className="hover:bg-surface-container-high/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-on-surface">{method.name}</p>
                        {method.description && (
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {method.description}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {TYPE_LABEL[method.type]}
                      </td>
                      <td className="px-6 py-4 text-on-surface">
                        {Number(method.fee) > 0
                          ? `Rp ${Number(method.fee).toLocaleString("id-ID")}`
                          : "Gratis"}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => toggleActive(method)}
                          className={`px-3 py-1 rounded-full text-xs font-label font-medium transition-colors ${
                            method.is_active
                              ? "bg-primary-container text-on-primary-container"
                              : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >
                          {method.is_active ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/my/stores/${store.id}/shipping-methods/${method.id}/edit`}
                            className="px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors text-xs font-semibold"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => destroy(method)}
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
        </div>
      </div>
      <Footer />
    </div>
  );
}
