import { Head, Link, usePage } from "@inertiajs/react";
import { PageProps, Store, StoreOrder } from "@/types";
import StoreManageLayout from "@/Layouts/StoreManageLayout";
import StatusBadge from "@/Components/Store/StatusBadge";
import { storeManagementUrl } from "@/Helpers/storeManagementUrl";

interface DashboardProps extends PageProps {
  store: Store;
  role: "owner" | "admin" | null;
  productCount: number;
  orderCount: number;
  shippingMethodCount: number;
  recentOrders: StoreOrder[];
}

export default function Dashboard() {
  const { store, role, productCount, orderCount, shippingMethodCount, recentOrders } =
    usePage<DashboardProps>().props;
  const baseUrl = storeManagementUrl(store.id);

  return (
    <StoreManageLayout store={store} role={role} activeNav="dashboard">
      <Head title={store.name} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link
          href={`${baseUrl}/products`}
          className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high hover:shadow-[0px_10px_30px_rgba(80,100,71,0.08)] transition-shadow"
        >
          <span className="material-symbols-outlined text-3xl text-primary">inventory_2</span>
          <p className="font-headline text-3xl font-bold text-on-surface mt-3">{productCount}</p>
          <p className="text-sm text-on-surface-variant">Produk</p>
        </Link>
        <Link
          href={`${baseUrl}/orders`}
          className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high hover:shadow-[0px_10px_30px_rgba(80,100,71,0.08)] transition-shadow"
        >
          <span className="material-symbols-outlined text-3xl text-primary">receipt_long</span>
          <p className="font-headline text-3xl font-bold text-on-surface mt-3">{orderCount}</p>
          <p className="text-sm text-on-surface-variant">Pesanan Masuk</p>
        </Link>
        <Link
          href={`${baseUrl}/shipping-methods`}
          className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high hover:shadow-[0px_10px_30px_rgba(80,100,71,0.08)] transition-shadow"
        >
          <span className="material-symbols-outlined text-3xl text-primary">local_shipping</span>
          <p className="font-headline text-3xl font-bold text-on-surface mt-3">
            {shippingMethodCount}
          </p>
          <p className="text-sm text-on-surface-variant">Metode Pengiriman</p>
        </Link>
        <Link
          href={`${baseUrl}/event-reservations`}
          className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high hover:shadow-[0px_10px_30px_rgba(80,100,71,0.08)] transition-shadow"
        >
          <span className="material-symbols-outlined text-3xl text-primary">event</span>
          <p className="font-headline text-lg font-bold text-on-surface mt-3">Pesanan Event</p>
          <p className="text-sm text-on-surface-variant">Produk yang dipakai di event</p>
        </Link>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/10">
          <h2 className="font-headline text-lg font-bold text-on-surface">Pesanan Terbaru</h2>
          <Link
            href={`${baseUrl}/orders`}
            className="text-sm text-primary hover:underline font-label font-medium"
          >
            Lihat semua
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">
              shopping_bag
            </span>
            <p className="mt-4 font-headline text-lg font-semibold text-on-surface">
              Belum ada pesanan
            </p>
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
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-on-surface">
                      <Link href={`${baseUrl}/orders/${order.id}`} className="hover:underline">
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{order.buyer?.name ?? "-"}</td>
                    <td className="px-6 py-4 text-on-surface">
                      Rp {Number(order.total).toLocaleString("id-ID")}
                    </td>
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
      </div>
    </StoreManageLayout>
  );
}
