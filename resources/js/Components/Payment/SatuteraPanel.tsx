import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import { PaymentDetail } from "@/types";

export type SatuteraLiveStatus = "pending" | "paid" | "failed" | "cancelled" | "expired" | "local_expired";

export const SATUTERA_FINAL_STATUSES: SatuteraLiveStatus[] = [
  "paid",
  "failed",
  "cancelled",
  "expired",
  "local_expired",
];

interface SatuteraPanelProps {
  status: SatuteraLiveStatus;
  onStatusChange: (status: SatuteraLiveStatus) => void;
  paymentDetail: PaymentDetail | null;
  checkoutToken: string | null;
  expiresAt: string | null;
  satuteraWsUrl: string;
}

/**
 * VA/QRIS display + countdown + realtime status (socket.io) for a Satutera payment. Extracted from
 * `Pages/Store/PaymentPage.tsx` (fase 9, D37) so `Pages/Payment/PaymentPage.tsx` (event) can render
 * the same thing. Deliberately does NOT own the `/…/status` polling fallback — both pages already
 * poll at the page level for *every* provider (manual included, since a god-mode approve/reject can
 * change status without any socket involved at all), so polling stays there to avoid two competing
 * polling loops and to keep the manual flow's existing behavior untouched.
 *
 * Renders nothing once `status` leaves "pending" — each page renders its own terminal-state blocks
 * (paid / failed / local_expired), since those need page-specific CTAs (e.g. a "checkout again"
 * link only makes sense on the store page).
 */
export default function SatuteraPanel({
  status,
  onStatusChange,
  paymentDetail: detail,
  checkoutToken,
  expiresAt,
  satuteraWsUrl,
}: SatuteraPanelProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const isFinal = SATUTERA_FINAL_STATUSES.includes(status);

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
        onStatusChange("local_expired");
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        onStatusChange(payload.status);
      }
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutToken, satuteraWsUrl, isFinal]);

  if (status !== "pending") return null;

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

  if (!detail) {
    return (
      <div className="bg-tertiary-container text-on-tertiary-container rounded-3xl p-8 mb-6 text-center">
        <p className="font-headline text-lg font-bold">Detail Pembayaran Belum Tersedia</p>
        <p className="text-sm mt-2">
          Kami belum bisa mengambil detail VA/QRIS untuk transaksi ini. Muat ulang halaman ini
          sebentar lagi, atau hubungi admin kalau masih belum muncul.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-8 mb-6 text-center">
      {detail.type === "qris" ? (
        <>
          {detail.qr_string ? (
            <div className="inline-flex flex-col items-center gap-3 bg-white rounded-2xl border border-outline-variant/20 p-4">
              <QRCodeSVG value={detail.qr_string} size={220} />
            </div>
          ) : detail.qr_template ? (
            <img
              src={detail.qr_template}
              alt="QRIS"
              className="w-56 h-56 mx-auto rounded-2xl border border-outline-variant/20"
            />
          ) : (
            <p className="text-sm text-on-surface-variant">
              QR code belum tersedia. Muat ulang halaman ini sebentar lagi.
            </p>
          )}
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
            <p className="font-headline text-3xl font-bold text-on-surface tracking-wider">
              {detail.payment_no}
            </p>
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
          Bayar sebelum{" "}
          <span className="font-mono font-semibold text-on-surface">{formatCountdown(timeLeft)}</span>
        </p>
      )}

      {detail.instructions.length > 0 && (
        <div className="mt-8 text-left space-y-4">
          {detail.instructions.map((instruction, i) => (
            <div key={i}>
              <p className="font-label font-semibold text-on-surface text-sm mb-2">
                {instruction.title}
              </p>
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
  );
}
