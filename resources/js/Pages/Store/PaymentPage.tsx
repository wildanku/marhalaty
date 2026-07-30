import { useEffect, useRef, useState } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import { io, Socket } from "socket.io-client";
import { PageProps, StoreOrder, Transaction } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";

interface PaymentPageProps extends PageProps {
  order: StoreOrder;
  transaction: Transaction;
  checkoutToken: string | null;
  expiresAt: string | null;
  satuteraWsUrl: string;
  hash: string;
}

type LiveStatus = Transaction["status"] | "local_expired";

const FINAL_STATUSES: LiveStatus[] = ["paid", "failed", "cancelled", "expired", "local_expired"];

export default function PaymentPage() {
  const { order, transaction, checkoutToken, expiresAt, satuteraWsUrl, hash } = usePage<PaymentPageProps>().props;

  const [status, setStatus] = useState<LiveStatus>(transaction.status);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const detail = transaction.payment_detail;
  const isFinal = FINAL_STATUSES.includes(status);

  // Local expiry check — independent of socket/polling. Satutera's internal expiry window does
  // not always emit a socket event (payment-guidance.md §6), so this is the only reliable signal
  // for "time's up" from the client's point of view.
  useEffect(() => {
    if (!expiresAt) return;
    const expiry = new Date(expiresAt).getTime();

    const tick = () => {
      const remaining = expiry - Date.now();
      setTimeLeft(Math.max(remaining, 0));
      if (remaining <= 0 && statusRef.current === "pending") {
        setStatus("local_expired");
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // WebSocket — realtime UX only. Fulfillment is decided by the server-to-server callback, never
  // by this event or by any browser redirect.
  useEffect(() => {
    if (!checkoutToken || isFinal) return;

    const socket: Socket = io(satuteraWsUrl, { path: "/ws/payments", transports: ["websocket"] });

    socket.on("connect", () => {
      // Room membership does not persist across reconnects, so this must run on every `connect`,
      // not just once at mount.
      socket.emit("subscribe", { checkout_token: checkoutToken });
    });

    socket.onAny((_event, payload) => {
      if (payload?.checkout_token === checkoutToken && payload?.status) {
        setStatus(payload.status);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [checkoutToken, satuteraWsUrl, isFinal]);

  // Polling fallback every 7s while pending — matches Satutera's own frontend interval.
  useEffect(() => {
    if (isFinal) return;

    const poll = async () => {
      try {
        const response = await fetch(`/store/payment/${hash}/status`);
        if (!response.ok) return;
        const body = await response.json();
        if (body.status) setStatus(body.status);
      } catch {
        // Silent — the next tick (or the socket) will pick it up.
      }
    };

    const interval = setInterval(poll, 7000);
    return () => clearInterval(interval);
  }, [isFinal, hash]);

  const copyVaNumber = () => {
    if (!detail?.payment_no) return;
    navigator.clipboard.writeText(detail.payment_no);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((v) => String(v).padStart(2, "0")).join(":");
  };

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title={`Pembayaran - ${order.order_number}`} />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <StatusHeadline status={status} />
        </div>

        {status === "pending" && !detail && (
          <div className="bg-tertiary-container text-on-tertiary-container rounded-3xl p-8 mb-6 text-center">
            <p className="font-headline text-lg font-bold">Detail Pembayaran Belum Tersedia</p>
            <p className="text-sm mt-2">
              Kami belum bisa mengambil detail VA/QRIS untuk pesanan ini. Hubungi admin toko atau coba buat pesanan baru.
            </p>
          </div>
        )}

        {status === "pending" && detail && (
          <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-8 mb-6 text-center">
            {detail.type === "qris" ? (
              <>
                {detail.qr_template ? (
                  <img
                    src={detail.qr_template}
                    alt="QRIS"
                    className="w-56 h-56 mx-auto rounded-2xl border border-outline-variant/20"
                  />
                ) : detail.qr_string ? (
                  <div className="bg-surface-container rounded-2xl p-4 text-xs font-mono break-all text-on-surface-variant max-w-xs mx-auto">
                    {detail.qr_string}
                  </div>
                ) : null}
                <p className="text-sm text-on-surface-variant mt-4">
                  Scan QRIS dengan aplikasi e-Wallet atau Mobile Banking
                </p>
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-wider text-on-surface-variant font-label mb-2">
                  {detail.payment_name}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <p className="font-headline text-3xl font-bold text-on-surface tracking-wider">{detail.payment_no}</p>
                  <button
                    onClick={copyVaNumber}
                    className="text-primary hover:bg-primary-container/20 rounded-full p-2 transition-colors"
                  >
                    <span className="material-symbols-outlined">{copied ? "check" : "content_copy"}</span>
                  </button>
                </div>
              </>
            )}

            {timeLeft !== null && timeLeft > 0 && (
              <p className="mt-6 text-sm text-on-surface-variant">
                Bayar sebelum <span className="font-mono font-semibold text-on-surface">{formatCountdown(timeLeft)}</span>
              </p>
            )}

            {detail.instructions.length > 0 && (
              <div className="mt-8 text-left space-y-4">
                {detail.instructions.map((instruction, i) => (
                  <div key={i}>
                    <p className="font-label font-semibold text-on-surface text-sm mb-2">{instruction.title}</p>
                    <ol className="list-decimal list-inside text-sm text-on-surface-variant space-y-1">
                      {instruction.steps.map((step, j) => (
                        <li key={j}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {status === "local_expired" && (
          <div className="bg-error-container text-on-error-container rounded-3xl p-8 mb-6 text-center">
            <p className="font-headline text-lg font-bold">Waktu Pembayaran Habis</p>
            <p className="text-sm mt-2">Buat pesanan baru untuk mendapatkan metode pembayaran baru.</p>
            {order.store?.slug && (
              <Link
                href={`/checkout/${order.store.slug}`}
                className="inline-block mt-4 bg-on-error-container/10 hover:bg-on-error-container/20 px-5 py-2 rounded-full font-label font-semibold text-sm"
              >
                Buat Pesanan Baru
              </Link>
            )}
          </div>
        )}

        {status === "paid" && (
          <div className="bg-primary-container text-on-primary-container rounded-3xl p-8 mb-6 text-center">
            <span className="material-symbols-outlined text-5xl">check_circle</span>
            <p className="font-headline text-lg font-bold mt-2">Pembayaran Berhasil</p>
            <Link
              href={`/store/orders/${order.id}`}
              className="inline-block mt-4 bg-on-primary-container/10 hover:bg-on-primary-container/20 px-5 py-2 rounded-full font-label font-semibold text-sm"
            >
              Lihat Pesanan
            </Link>
          </div>
        )}

        {(status === "failed" || status === "cancelled" || status === "expired") && (
          <div className="bg-error-container text-on-error-container rounded-3xl p-8 mb-6 text-center">
            <p className="font-headline text-lg font-bold">Pembayaran Tidak Berhasil</p>
            {order.store?.slug && (
              <Link
                href={`/checkout/${order.store.slug}`}
                className="inline-block mt-4 bg-on-error-container/10 hover:bg-on-error-container/20 px-5 py-2 rounded-full font-label font-semibold text-sm"
              >
                Coba Lagi
              </Link>
            )}
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-6">
          <h2 className="font-headline text-lg font-bold text-on-surface mb-4">{order.order_number}</h2>
          <div className="divide-y divide-outline-variant/10">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-on-surface">
                  {item.name_snapshot}
                  {item.variant_label_snapshot ? ` (${item.variant_label_snapshot})` : ""} × {item.quantity}
                </span>
                <span className="text-on-surface-variant">Rp {Number(item.subtotal).toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 mt-4 border-t border-outline-variant/10 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Subtotal</span>
              <span className="text-on-surface">Rp {Number(order.subtotal).toLocaleString("id-ID")}</span>
            </div>
            {order.requires_shipping && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Ongkos Kirim</span>
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
      </div>
      <Footer />
    </div>
  );
}

function StatusHeadline({ status }: { status: LiveStatus }) {
  const map: Record<LiveStatus, { icon: string; label: string }> = {
    pending: { icon: "hourglass_top", label: "Menunggu Pembayaran" },
    paid: { icon: "check_circle", label: "Pembayaran Berhasil" },
    failed: { icon: "error", label: "Pembayaran Gagal" },
    cancelled: { icon: "cancel", label: "Pembayaran Dibatalkan" },
    expired: { icon: "schedule", label: "Pembayaran Kedaluwarsa" },
    local_expired: { icon: "schedule", label: "Waktu Pembayaran Habis" },
  };
  const info = map[status];

  return (
    <>
      <span className="material-symbols-outlined text-4xl text-primary">{info.icon}</span>
      <h1 className="font-headline text-2xl font-bold text-on-surface mt-2">{info.label}</h1>
    </>
  );
}
