import { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { PageProps, Store, StoreOrder } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import StatusBadge from "@/Components/Store/StatusBadge";

interface OrderShowProps extends PageProps {
  store: Store;
  order: StoreOrder;
}

export default function OrderShow() {
  const { store, order } = usePage<OrderShowProps>().props;
  const [trackingNumber, setTrackingNumber] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const shippingAddress = order.shipping_address_snapshot;

  const process = () => {
    setProcessing(true);
    router.post(
      `/my/stores/${store.id}/orders/${order.id}/process`,
      {},
      {
        preserveScroll: true,
        onFinish: () => setProcessing(false),
      }
    );
  };

  const ship = () => {
    if (!trackingNumber.trim()) return;
    setProcessing(true);
    router.post(
      `/my/stores/${store.id}/orders/${order.id}/ship`,
      { tracking_number: trackingNumber },
      { preserveScroll: true, onFinish: () => setProcessing(false) }
    );
  };

  const cancel = () => {
    if (!cancelReason.trim()) return;
    setProcessing(true);
    router.post(
      `/my/stores/${store.id}/orders/${order.id}/cancel`,
      { reason: cancelReason },
      {
        preserveScroll: true,
        onFinish: () => setProcessing(false),
        onSuccess: () => setShowCancelForm(false),
      }
    );
  };

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title={order.order_number} />

      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href={`/my/stores/${store.id}/orders`}
          className="text-sm text-on-surface-variant hover:text-primary flex items-center gap-1 mb-6"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Pesanan
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">
              {order.order_number}
            </h1>
            <p className="text-sm text-on-surface-variant">
              {order.buyer?.name} · {order.buyer?.email}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {order.status === "cancelled" && order.cancellation_reason && (
          <div className="mb-8 bg-error-container text-on-error-container rounded-2xl p-4 text-sm">
            <strong>Alasan pembatalan:</strong> {order.cancellation_reason}
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high overflow-hidden mb-6">
          <div className="divide-y divide-outline-variant/10">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="font-medium text-on-surface truncate">{item.name_snapshot}</p>
                  {item.variant_label_snapshot && (
                    <p className="text-xs text-on-surface-variant">{item.variant_label_snapshot}</p>
                  )}
                  <p className="text-xs text-on-surface-variant">
                    × {item.quantity} · {item.type_snapshot === "digital" ? "Digital" : "Fisik"}
                  </p>
                </div>
                <p className="font-headline font-semibold text-on-surface whitespace-nowrap">
                  Rp {Number(item.subtotal).toLocaleString("id-ID")}
                </p>
              </div>
            ))}
          </div>
          <div className="p-5 border-t border-outline-variant/10 flex justify-between">
            <span className="font-label font-semibold text-on-surface">Total</span>
            <span className="font-headline text-lg font-bold text-primary">
              Rp {Number(order.total).toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {order.requires_shipping && shippingAddress && (
          <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-5 mb-6">
            <p className="font-label font-semibold text-on-surface mb-2">
              Alamat Pengiriman
              {order.shipping_courier_name && (
                <span className="font-normal text-on-surface-variant">
                  {" "}
                  · {order.shipping_courier_name}
                </span>
              )}
            </p>
            <p className="text-sm text-on-surface">
              {shippingAddress.recipient_name} — {shippingAddress.phone}
            </p>
            <p className="text-sm text-on-surface-variant">
              {shippingAddress.full_address ?? shippingAddress.address_line}
            </p>
          </div>
        )}

        {order.requires_shipping && !shippingAddress && order.shipping_provider === "store" && (
          <div className="bg-primary-container/40 rounded-3xl border border-surface-container-high p-5 mb-6">
            <p className="font-label font-semibold text-on-surface mb-1">
              Pengiriman: {order.shipping_courier_name}
            </p>
            <p className="text-sm text-on-surface-variant">
              Pembeli akan mengambil pesanan sendiri — tidak perlu dikirim.
            </p>
          </div>
        )}

        {order.tracking_number && (
          <div className="bg-primary-container text-on-primary-container rounded-2xl p-5 mb-6">
            <p className="text-sm font-label font-semibold">Nomor Resi</p>
            <p className="font-headline text-lg font-bold">{order.tracking_number}</p>
          </div>
        )}

        {(order.status === "paid" || order.status === "processing") && (
          <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-6 space-y-4">
            <h2 className="font-headline text-lg font-bold text-on-surface">Aksi</h2>

            {order.status === "paid" && (
              <button
                onClick={process}
                disabled={processing}
                className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50"
              >
                Proses Pesanan
              </button>
            )}

            {order.status === "processing" && (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Nomor resi"
                  className="flex-1 py-2.5 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body text-sm"
                />
                <button
                  onClick={ship}
                  disabled={processing || !trackingNumber.trim()}
                  className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  Tandai Dikirim
                </button>
              </div>
            )}

            {!showCancelForm ? (
              <button
                onClick={() => setShowCancelForm(true)}
                className="text-error text-sm font-label font-medium hover:underline"
              >
                Batalkan Pesanan
              </button>
            ) : (
              <div className="space-y-3 pt-2 border-t border-outline-variant/10">
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="Alasan pembatalan"
                  className="block w-full py-2.5 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body text-sm"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowCancelForm(false)}
                    className="px-4 py-2 rounded-full text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container-high"
                  >
                    Batal
                  </button>
                  <button
                    onClick={cancel}
                    disabled={processing || !cancelReason.trim()}
                    className="px-5 py-2 rounded-full text-sm font-label font-semibold bg-error text-on-error hover:opacity-90 disabled:opacity-50"
                  >
                    Konfirmasi Batalkan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
