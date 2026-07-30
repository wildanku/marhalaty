import { Head, Link, router, usePage } from "@inertiajs/react";
import { PageProps, Store, StoreOrder } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import StatusBadge from "@/Components/Store/StatusBadge";

interface OrdersIndexProps extends PageProps {
  store: Store;
  orders: {
    data: StoreOrder[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    total: number;
  };
  status: string | null;
}

const STATUS_TABS: { key: string | null; label: string }[] = [
  { key: null, label: "Semua" },
  { key: "paid", label: "Dibayar" },
  { key: "processing", label: "Diproses" },
  { key: "shipped", label: "Dikirim" },
  { key: "completed", label: "Selesai" },
  { key: "cancelled", label: "Dibatalkan" },
  { key: "expired", label: "Kedaluwarsa" },
];

export default function OrdersIndex() {
  const { store, orders, status } = usePage<OrdersIndexProps>().props;

  const setStatus = (value: string | null) => {
    router.get(`/my/stores/${store.id}/orders`, value ? { status: value } : {}, { preserveState: true, replace: true });
  };

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title={`Pesanan - ${store.name}`} />

      <div className="max-w-5xl mx-auto px-6 py-12">
        <Link href={`/my/stores/${store.id}`} className="text-sm text-on-surface-variant hover:text-primary flex items-center gap-1 mb-2">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {store.name}
        </Link>
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-6">Pesanan</h1>

        <div className="flex flex-wrap gap-1.5 mb-6 bg-surface-container-lowest p-1.5 rounded-full border border-surface-container-high w-fit">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key ?? "all"}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-label font-medium transition-colors ${
                status === tab.key ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high overflow-hidden">
          {orders.data.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">shopping_bag</span>
              <p className="mt-4 font-headline text-lg font-semibold text-on-surface">Belum ada pesanan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-high text-xs uppercase text-on-surface-variant">
                  <tr>
                    <th className="px-6 py-4 font-semibold">No. Order</th>
                    <th className="px-6 py-4 font-semibold">Pembeli</th>
                    <th className="px-6 py-4 font-semibold">Total</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {orders.data.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => router.visit(`/my/stores/${store.id}/orders/${order.id}`)}
                      className="hover:bg-surface-container-high/40 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-medium text-on-surface">{order.order_number}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{order.buyer?.name ?? "-"}</td>
                      <td className="px-6 py-4 text-on-surface">Rp {Number(order.total).toLocaleString("id-ID")}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {new Date(order.created_at).toLocaleDateString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {orders.last_page > 1 && (
            <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-between items-center text-sm">
              <span className="text-on-surface-variant">
                Halaman {orders.current_page} dari {orders.last_page} ({orders.total} pesanan)
              </span>
              <div className="flex gap-2">
                {orders.links.map((link, i) =>
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
