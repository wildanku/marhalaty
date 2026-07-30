import { Head, Link, usePage } from "@inertiajs/react";
import { PageProps, StoreOrder } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import StatusBadge from "@/Components/Store/StatusBadge";

interface OrdersIndexProps extends PageProps {
  orders: {
    data: StoreOrder[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
  };
}

export default function OrdersIndex() {
  const { orders } = usePage<OrdersIndexProps>().props;

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title="Pesanan Saya" />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-headline text-3xl font-bold text-on-surface mb-8">Pesanan Saya</h1>

        {orders.data.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-3xl p-12 text-center border border-surface-container-high">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">receipt_long</span>
            <p className="mt-4 font-headline text-lg font-semibold text-on-surface">Belum ada pesanan</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.data.map((order) => (
              <Link
                key={order.id}
                href={`/store/orders/${order.id}`}
                className="flex items-center gap-4 bg-surface-container-lowest rounded-2xl p-5 border border-surface-container-high hover:shadow-[0px_10px_30px_rgba(80,100,71,0.08)] transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-headline font-semibold text-on-surface">{order.order_number}</p>
                  <p className="text-sm text-on-surface-variant">{order.store?.name}</p>
                </div>
                <p className="font-headline font-semibold text-primary">Rp {Number(order.total).toLocaleString("id-ID")}</p>
                <StatusBadge status={order.status} />
                <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
