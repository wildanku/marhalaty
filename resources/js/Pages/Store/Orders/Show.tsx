import { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { PageProps, StoreOrder, Transaction } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import StatusBadge from "@/Components/Store/StatusBadge";

interface OrderShowProps extends PageProps {
  order: StoreOrder;
  transaction: Transaction | null;
}

export default function OrderShow() {
  const { order, transaction } = usePage<OrderShowProps>().props;
  const shippingAddress = order.shipping_address_snapshot;
  const [completing, setCompleting] = useState(false);

  const markReceived = () => {
    setCompleting(true);
    router.post(`/store/orders/${order.id}/complete`, {}, {
      preserveScroll: true,
      onFinish: () => setCompleting(false),
    });
  };

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title={order.order_number} />

      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/store/orders" className="text-sm text-on-surface-variant hover:text-primary flex items-center gap-1 mb-6">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Pesanan Saya
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">{order.order_number}</h1>
            <p className="text-sm text-on-surface-variant">{order.store?.name}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {order.status === "pending_payment" && transaction && (
          <div className="mb-8 bg-tertiary-container text-on-tertiary-container rounded-2xl p-5 flex items-center justify-between gap-4">
            <p className="text-sm">Selesaikan pembayaran sebelum batas waktu habis.</p>
            <Link
              href={`/store/payment/${transaction.payment_hash}`}
              className="shrink-0 bg-on-tertiary-container/10 hover:bg-on-tertiary-container/20 px-5 py-2 rounded-full font-label font-semibold text-sm"
            >
              Bayar Sekarang
            </Link>
          </div>
        )}

        {order.tracking_number && (
          <div className="mb-8 bg-primary-container text-on-primary-container rounded-2xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-label font-semibold">Nomor Resi</p>
              <p className="font-headline text-lg font-bold">{order.tracking_number}</p>
            </div>
            {order.status === "shipped" && (
              <button
                onClick={markReceived}
                disabled={completing}
                className="shrink-0 bg-on-primary-container/10 hover:bg-on-primary-container/20 px-5 py-2 rounded-full font-label font-semibold text-sm disabled:opacity-50"
              >
                Pesanan Diterima
              </button>
            )}
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high overflow-hidden mb-6">
          <div className="divide-y divide-outline-variant/10">
            {order.items?.map((item) => {
              const canDownload = order.status === "paid" || order.status === "completed";
              return (
                <div key={item.id} className="flex items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <p className="font-medium text-on-surface truncate">{item.name_snapshot}</p>
                    {item.variant_label_snapshot && <p className="text-xs text-on-surface-variant">{item.variant_label_snapshot}</p>}
                    <p className="text-xs text-on-surface-variant">× {item.quantity}</p>
                    {item.type_snapshot === "digital" && canDownload && item.digital_deliveries && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.digital_deliveries.map((delivery) => {
                          const exhausted = delivery.download_count >= delivery.max_downloads;
                          return (
                            <a
                              key={delivery.id}
                              href={exhausted ? undefined : `/downloads/${delivery.download_token}`}
                              aria-disabled={exhausted}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label font-semibold transition-colors ${
                                exhausted
                                  ? "bg-surface-container-high text-on-surface-variant/50 cursor-not-allowed"
                                  : "bg-primary-container text-on-primary-container hover:opacity-90"
                              }`}
                            >
                              <span className="material-symbols-outlined text-[14px]">download</span>
                              {exhausted ? "Kuota unduhan habis" : "Unduh"}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <p className="font-headline font-semibold text-on-surface whitespace-nowrap">
                    Rp {Number(item.subtotal).toLocaleString("id-ID")}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="p-5 border-t border-outline-variant/10 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Subtotal</span>
              <span className="text-on-surface">Rp {Number(order.subtotal).toLocaleString("id-ID")}</span>
            </div>
            {order.requires_shipping && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Ongkos Kirim ({order.shipping_courier_name} {order.shipping_service})</span>
                <span className="text-on-surface">Rp {Number(order.shipping_cost).toLocaleString("id-ID")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Biaya Layanan Pembayaran</span>
              <span className="text-on-surface">Rp {Number(order.payment_fee).toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between pt-2 mt-2 border-t border-outline-variant/10">
              <span className="font-label font-semibold text-on-surface">Total</span>
              <span className="font-headline text-lg font-bold text-primary">Rp {Number(order.total).toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>

        {order.requires_shipping && shippingAddress && (
          <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-5">
            <p className="font-label font-semibold text-on-surface mb-2">Alamat Pengiriman</p>
            <p className="text-sm text-on-surface">{shippingAddress.recipient_name} — {shippingAddress.phone}</p>
            <p className="text-sm text-on-surface-variant">{shippingAddress.full_address ?? shippingAddress.address_line}</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
