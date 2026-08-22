import { ReactNode, useEffect, useState } from "react";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
  Cart,
  PageProps,
  PaymentChannel,
  ShippingRate,
  Store,
  StoreShippingMethod,
  UserAddress,
} from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import AddressPicker from "@/Components/Store/AddressPicker";
import ShippingRatePicker from "@/Components/Store/ShippingRatePicker";
import ShippingMethodDetailModal from "@/Components/Store/ShippingMethodDetailModal";
import OrderSummary from "@/Components/Store/OrderSummary";
import StoreBadgeIcons from "@/Components/Store/StoreBadgeIcons";
import { resolveSatuteraFee } from "@/utils/paymentFee";

interface CheckoutSummary {
  subtotal: number;
  total_weight_grams: number;
  requires_shipping: boolean;
}

interface PaymentGatewayOption {
  code: string;
  label: string;
  description: string | null;
  requires_channel: boolean;
}

interface ManualAccountPreview {
  id: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  branch: string | null;
  instructions: string | null;
}

interface CheckoutFormData {
  user_address_id: number | null;
  shipping_courier_code: string | null;
  shipping_service: string | null;
  shipping_method_id: string | null;
  payment_gateway: string;
  payment_provider: string;
  payment_method: string;
  payment_channel: string;
  buyer_note: string;
  item_notes: Record<string, string>;
}

type CheckoutPageProps = PageProps &
  (
    | { isEmpty: true; store: Store }
    | {
        isEmpty: false;
        store: Store;
        cart: Cart;
        summary: CheckoutSummary;
        addresses: UserAddress[];
        paymentGateways: PaymentGatewayOption[];
        paymentChannels: PaymentChannel[];
        manualAccounts: ManualAccountPreview[];
        shippingMethods: StoreShippingMethod[];
        qrisOnlyBelowAmount: number;
      }
  );

function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function Checkout() {
  const props = usePage<CheckoutPageProps>().props;

  if (props.isEmpty) {
    return <EmptyCheckout store={props.store} />;
  }

  return <CheckoutForm {...props} />;
}

type CheckoutFormProps = Extract<CheckoutPageProps, { isEmpty: false }>;

function CheckoutForm({
  store,
  cart,
  summary,
  addresses,
  paymentGateways,
  paymentChannels,
  manualAccounts,
  shippingMethods,
  qrisOnlyBelowAmount,
}: CheckoutFormProps) {
  const [addressId, setAddressId] = useState<number | null>(null);
  const [shippingRate, setShippingRate] = useState<ShippingRate | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<StoreShippingMethod | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(
    paymentGateways.length === 1 ? paymentGateways[0].code : null
  );
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannel | null>(null);
  const [detailMethod, setDetailMethod] = useState<StoreShippingMethod | null>(null);
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  // A store's own flat/pickup method and a real RajaOngkir courier rate are mutually exclusive —
  // picking one clears the other so the submitted payload is never ambiguous about which shipping
  // path the backend should resolve.
  const selectCustomMethod = (method: StoreShippingMethod) => {
    setSelectedMethod(method);
    setShippingRate(null);
  };

  const selectCourierRate = (rate: ShippingRate | null) => {
    setShippingRate(rate);
    if (rate) setSelectedMethod(null);
  };

  const isPickup = selectedMethod?.type === "pickup";
  const needsAddress = summary.requires_shipping && !isPickup;

  const shippingCost = summary.requires_shipping
    ? selectedMethod
      ? Number(selectedMethod.fee)
      : (shippingRate?.cost ?? null)
    : 0;

  // Same pre-fee amount the backend sends to Satutera as `amount` — below the configured
  // threshold, only QRIS is offered (VA/retail channels enforce their own higher minimums).
  const preFeeAmount = summary.subtotal + (shippingCost ?? 0);
  const qrisOnlyActive = preFeeAmount > 0 && preFeeAmount < qrisOnlyBelowAmount;

  const { data, setData, post, processing, errors } = useForm<CheckoutFormData>({
    user_address_id: null as number | null,
    shipping_courier_code: null as string | null,
    shipping_service: null as string | null,
    shipping_method_id: null as string | null,
    payment_gateway: paymentGateways.length === 1 ? paymentGateways[0].code : "",
    payment_provider: "",
    payment_method: "",
    payment_channel: "",
    buyer_note: "",
    item_notes: {},
  });

  const paymentReady =
    selectedGateway === "satutera" ? selectedChannel !== null : selectedGateway === "manual";

  const canSubmit =
    paymentReady &&
    (!summary.requires_shipping ||
      (selectedMethod !== null
        ? isPickup || addressId !== null
        : addressId !== null && shippingRate !== null));

  // Keep the submitted form data in sync with these picks as they happen, rather than only at
  // submit time: `post()` serializes `data` synchronously when called, so a `setData()` inside
  // an `onBefore` callback is too late to make it into that same request — the field would still
  // go out empty and fail the backend's `required` validation.
  useEffect(() => {
    setData((prev) => ({
      ...prev,
      user_address_id: addressId,
      shipping_courier_code: shippingRate?.courier_code ?? null,
      shipping_service: shippingRate?.service ?? null,
      shipping_method_id: selectedMethod?.id ?? null,
      payment_gateway: selectedGateway ?? "",
      payment_provider: selectedGateway === "satutera" ? (selectedChannel?.provider ?? "") : "",
      payment_method: selectedGateway === "satutera" ? (selectedChannel?.method ?? "") : "",
      payment_channel: selectedGateway === "satutera" ? (selectedChannel?.code ?? "") : "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressId, shippingRate, selectedMethod, selectedChannel, selectedGateway]);

  // The shipping pick can change after a payment channel was already selected — if that drops the
  // order below the QRIS-only threshold, drop an incompatible selection rather than let the buyer
  // submit a combination the backend will reject.
  useEffect(() => {
    if (qrisOnlyActive && selectedChannel && selectedChannel.method !== "qris") {
      setSelectedChannel(null);
    }
  }, [qrisOnlyActive, selectedChannel]);

  const doSubmit = () => {
    post(`/checkout/${store.slug}`);
  };

  const noteFor = (itemId: number, initial: string | null | undefined): string =>
    data.item_notes[String(itemId)] ?? initial ?? "";

  const changeItemNote = (itemId: number, note: string) => {
    setData("item_notes", {
      ...data.item_notes,
      [String(itemId)]: note,
    });
  };

  const saveItemNote = (itemId: number, quantity: number, note: string) => {
    router.patch(
      `/cart/items/${itemId}`,
      { quantity, note: note.trim() || null },
      { preserveScroll: true }
    );
  };

  // Deduplicated so e.g. payment_provider/payment_method/payment_channel all failing at once
  // (picking no channel at all) doesn't show the same "wajib diisi" line three times.
  const errorMessages = Array.from(
    new Set(Object.values(errors).filter((message): message is string => Boolean(message)))
  );

  // Surface a failed submit even though the trigger button lives in the floating mobile bar or a
  // sticky desktop sidebar, both away from wherever Inertia left the scroll position.
  useEffect(() => {
    if (errorMessages.length > 0) setShowMobileSummary(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors]);

  const selectGateway = (code: string) => {
    setSelectedGateway(code);
    if (code !== "satutera") setSelectedChannel(null);
  };

  const visibleChannels = qrisOnlyActive
    ? paymentChannels.filter((c) => c.method === "qris")
    : paymentChannels;
  const vaChannels = visibleChannels.filter((c) => c.method === "va");
  const qrisChannels = visibleChannels.filter((c) => c.method === "qris");

  const storeAddress =
    store.primary_address?.full_address ?? store.primary_address?.address_line ?? null;

  const selectedChannelFee = resolveSatuteraFee(selectedChannel, preFeeAmount);
  const total = summary.subtotal + (shippingCost ?? 0) + selectedChannelFee;

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title={`Checkout - ${store.name}`} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12 pb-32 lg:pb-12">
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 bg-primary-container/30 text-primary rounded-full px-3.5 py-1.5 text-xs font-label font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">shopping_bag</span>
            Checkout
          </span>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface mt-3">
            Selesaikan pesanan dari {store.name}{" "}
            <StoreBadgeIcons badges={store.active_badges} size="md" />
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Periksa detail pesananmu sebelum lanjut ke pembayaran.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-5">
            <SectionCard icon="inventory_2" title="Produk">
              <div className="divide-y divide-outline-variant/10">
                {cart.items?.map((item) => {
                  const note = noteFor(item.id, item.note);

                  return (
                    <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-surface-container-high flex items-center justify-center overflow-hidden shrink-0">
                          {item.product?.primary_image_url && (
                            <img
                              src={item.product.primary_image_url}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-on-surface truncate">
                            {item.product?.name}
                          </p>
                          {item.variant && (
                            <p className="text-xs text-on-surface-variant mt-0.5">
                              {item.variant.label}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-on-surface-variant shrink-0">
                          × {item.quantity}
                        </p>
                      </div>
                      <div className="mt-3 pl-[4.5rem]">
                        <input
                          type="text"
                          value={note}
                          maxLength={250}
                          placeholder="Catatan untuk produk ini (opsional) — mis. ukuran, warna"
                          onChange={(event) => changeItemNote(item.id, event.target.value)}
                          onBlur={(event) =>
                            saveItemNote(item.id, item.quantity, event.target.value)
                          }
                          className="block w-full py-2 px-3 bg-surface-container-high border-0 rounded-xl focus:ring-2 focus:ring-primary/40 text-on-surface font-body text-xs placeholder:text-on-surface-variant/60"
                        />
                        <p className="text-[11px] text-on-surface-variant/60 mt-1 text-right">
                          {note.length}/250
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {needsAddress && (
              <SectionCard icon="location_on" title="Alamat Pengiriman">
                <AddressPicker
                  initialAddresses={addresses}
                  value={addressId}
                  onChange={setAddressId}
                />
              </SectionCard>
            )}

            {summary.requires_shipping && (
              <SectionCard icon="local_shipping" title="Pilih Pengiriman">
                {shippingMethods.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {shippingMethods.map((method) => {
                      const isSelected = selectedMethod?.id === method.id;
                      const fee = Number(method.fee);
                      return (
                        <label
                          key={method.id}
                          className={`flex items-start justify-between gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
                            isSelected
                              ? "border-primary bg-primary-container/20"
                              : "border-outline-variant/20 hover:border-outline-variant"
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <input
                              type="radio"
                              name="shipping_method"
                              checked={isSelected}
                              onChange={() => selectCustomMethod(method)}
                              className="mt-0.5 text-primary focus:ring-primary"
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-on-surface text-sm">{method.name}</p>
                              {method.type === "pickup" && (
                                <p className="text-xs text-on-surface-variant mt-0.5">
                                  Ambil langsung di toko, tanpa ongkos kirim
                                </p>
                              )}
                              {method.description && (
                                <>
                                  <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                                    {method.description}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setDetailMethod(method);
                                    }}
                                    className="text-xs font-label font-semibold text-primary mt-1 hover:underline"
                                  >
                                    Lihat selengkapnya
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <p className="font-headline font-semibold text-on-surface whitespace-nowrap">
                            {fee > 0 ? formatRupiah(fee) : "Gratis"}
                          </p>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Only pickup hides this — there's no address to price a courier against once
                    picked. A `flat` method keeps it visible so the buyer can still switch to a
                    real courier (selectCourierRate clears selectedMethod when that happens). */}
                {!isPickup && (
                  <>
                    {shippingMethods.length > 0 && (
                      <p className="text-xs uppercase tracking-wider text-on-surface-variant font-label mb-2">
                        Atau Kurir Ongkir
                      </p>
                    )}
                    <ShippingRatePicker
                      storeId={store.id}
                      addressId={addressId}
                      value={shippingRate}
                      onSelect={selectCourierRate}
                    />
                  </>
                )}
                {errors.shipping_method_id && (
                  <p className="mt-2 text-xs text-error">{errors.shipping_method_id}</p>
                )}
              </SectionCard>
            )}

            <SectionCard icon="payments" title="Metode Pembayaran">
              {paymentGateways.length === 0 && (
                <p className="text-sm text-error">
                  Belum ada metode pembayaran yang aktif untuk toko ini. Hubungi admin.
                </p>
              )}

              {paymentGateways.length > 1 && (
                <div className="space-y-2 mb-4">
                  {paymentGateways.map((gateway) => (
                    <label
                      key={gateway.code}
                      className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
                        selectedGateway === gateway.code
                          ? "border-primary bg-primary-container/20"
                          : "border-outline-variant/20 hover:border-outline-variant"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_gateway"
                        checked={selectedGateway === gateway.code}
                        onChange={() => selectGateway(gateway.code)}
                        className="mt-0.5 text-primary focus:ring-primary"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-on-surface text-sm">{gateway.label}</p>
                        {gateway.description && (
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {gateway.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {selectedGateway === "satutera" && (
                <>
                  {qrisOnlyActive && (
                    <div className="flex items-start gap-2.5 rounded-2xl bg-tertiary-container/25 border border-tertiary-container/50 px-4 py-3 mb-4">
                      <span className="material-symbols-outlined text-tertiary text-lg shrink-0 mt-0.5">
                        info
                      </span>
                      <p className="text-xs text-on-tertiary-container leading-relaxed">
                        <span className="font-semibold">
                          Transaksi di bawah {formatRupiah(qrisOnlyBelowAmount)}
                        </span>{" "}
                        hanya bisa dibayar dengan QRIS — metode lain memerlukan nominal minimal{" "}
                        {formatRupiah(qrisOnlyBelowAmount)}.
                      </p>
                    </div>
                  )}

                  {qrisChannels.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs uppercase tracking-wider text-on-surface-variant font-label mb-2">
                        QRIS
                      </p>
                      <div className="space-y-2">
                        {qrisChannels.map((channel) => (
                          <ChannelOption
                            key={`${channel.provider}-${channel.method}-${channel.code}`}
                            channel={channel}
                            selected={selectedChannel}
                            onSelect={setSelectedChannel}
                            preFeeAmount={preFeeAmount}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {vaChannels.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-on-surface-variant font-label mb-2">
                        Virtual Account
                      </p>
                      <div className="space-y-2">
                        {vaChannels.map((channel) => (
                          <ChannelOption
                            key={`${channel.provider}-${channel.method}-${channel.code}`}
                            channel={channel}
                            selected={selectedChannel}
                            onSelect={setSelectedChannel}
                            preFeeAmount={preFeeAmount}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {visibleChannels.length === 0 && (
                    <p className="text-sm text-on-surface-variant">
                      Metode pembayaran belum tersedia saat ini.
                    </p>
                  )}
                </>
              )}

              {selectedGateway === "manual" && (
                <div className="space-y-3">
                  <p className="text-xs text-on-surface-variant">
                    Setelah pesanan dibuat, kamu akan diarahkan ke halaman rekening tujuan untuk
                    transfer manual dan unggah bukti pembayaran.
                  </p>
                  {manualAccounts.map((account) => (
                    <div key={account.id} className="bg-surface-container rounded-xl p-4">
                      <p className="font-headline font-semibold text-on-surface text-sm">
                        {account.bank_name}
                      </p>
                      <p className="text-sm text-on-surface-variant">
                        {account.account_number} — a.n. {account.account_holder}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {errors.payment_gateway && (
                <p className="mt-2 text-xs text-error">{errors.payment_gateway}</p>
              )}
              {errors.payment_channel && (
                <p className="mt-2 text-xs text-error">{errors.payment_channel}</p>
              )}
            </SectionCard>

            <SectionCard icon="edit_note" title="Catatan untuk Penjual" subtitle="opsional">
              <textarea
                value={data.buyer_note}
                onChange={(e) => setData("buyer_note", e.target.value)}
                rows={3}
                placeholder="Contoh: warna, ukuran, atau permintaan khusus lainnya"
                className="block w-full py-3 px-4 bg-surface-container-high border-0 rounded-2xl focus:ring-2 focus:ring-primary/40 text-on-surface font-body text-sm placeholder:text-on-surface-variant/60"
              />
            </SectionCard>
          </div>

          {/* Desktop sidebar — floats alongside the form as the buyer scrolls */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <OrderSummary
                subtotal={summary.subtotal}
                shippingCost={shippingCost}
                paymentFee={selectedChannel ? selectedChannelFee : null}
                requiresShipping={summary.requires_shipping}
              />
              {errorMessages.length > 0 && <ErrorBanner messages={errorMessages} />}
              <button
                type="button"
                onClick={doSubmit}
                disabled={!canSubmit || processing}
                className="w-full bg-primary text-on-primary px-8 py-3.5 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Buat Pesanan
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Mobile floating summary bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest border-t border-surface-container-high shadow-[0_-8px_30px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom,0px)]">
        {errorMessages.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMobileSummary(true)}
            className="w-full flex items-center gap-2 bg-error-container text-on-error-container px-4 py-2 text-xs font-label font-semibold text-left"
          >
            <span className="material-symbols-outlined text-base shrink-0">error</span>
            Pesanan belum bisa dibuat — ketuk untuk lihat detail
          </button>
        )}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setShowMobileSummary(true)}
            className="flex-1 min-w-0 text-left"
          >
            <p className="text-xs text-on-surface-variant flex items-center gap-1">
              Total
              <span className="material-symbols-outlined text-sm text-primary">expand_less</span>
            </p>
            <p className="font-headline text-lg font-bold text-primary truncate">
              {formatRupiah(total)}
            </p>
          </button>
          <button
            type="button"
            onClick={doSubmit}
            disabled={!canSubmit || processing}
            className="shrink-0 bg-primary text-on-primary px-6 py-3 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Buat Pesanan
          </button>
        </div>
      </div>

      {/* Mobile slide-up order summary sheet */}
      {showMobileSummary && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-on-surface/40 backdrop-blur-[2px]"
            onClick={() => setShowMobileSummary(false)}
          />
          <div className="fixed bottom-0 inset-x-0 z-50 bg-surface rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom,16px)]">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-outline-variant/40" />
            </div>
            <div className="flex items-center justify-between px-6 py-3 border-b border-outline-variant/10">
              <span className="font-headline font-bold text-on-surface">Ringkasan Pesanan</span>
              <button
                type="button"
                onClick={() => setShowMobileSummary(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {errorMessages.length > 0 && <ErrorBanner messages={errorMessages} />}
              <OrderSummary
                subtotal={summary.subtotal}
                shippingCost={shippingCost}
                paymentFee={selectedChannel ? selectedChannelFee : null}
                requiresShipping={summary.requires_shipping}
              />
            </div>
          </div>
        </div>
      )}

      {detailMethod && (
        <ShippingMethodDetailModal
          method={detailMethod}
          storeAddress={storeAddress}
          onClose={() => setDetailMethod(null)}
        />
      )}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-8 h-8 rounded-full bg-primary-container/25 text-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-lg">{icon}</span>
        </span>
        <h2 className="font-headline text-base font-bold text-on-surface">
          {title}
          {subtitle && (
            <span className="font-body text-xs font-normal text-on-surface-variant ml-1.5">
              ({subtitle})
            </span>
          )}
        </h2>
      </div>
      {children}
    </section>
  );
}

function ErrorBanner({ messages }: { messages: string[] }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-error/30 bg-error-container px-4 py-3"
    >
      <span className="material-symbols-outlined text-error text-xl shrink-0">error</span>
      <div className="text-sm text-on-error-container">
        <p className="font-label font-semibold">Pesanan belum bisa dibuat</p>
        <ul className="mt-1 space-y-0.5">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ChannelOption({
  channel,
  selected,
  onSelect,
  preFeeAmount,
}: {
  channel: PaymentChannel;
  selected: PaymentChannel | null;
  onSelect: (c: PaymentChannel) => void;
  preFeeAmount: number;
}) {
  const isSelected =
    selected?.provider === channel.provider &&
    selected?.method === channel.method &&
    selected?.code === channel.code;
  const fee = resolveSatuteraFee(channel, preFeeAmount);

  return (
    <label
      className={`flex items-center justify-between gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
        isSelected
          ? "border-primary bg-primary-container/20"
          : "border-outline-variant/20 hover:border-outline-variant"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <input
          type="radio"
          name="payment_channel"
          checked={isSelected}
          onChange={() => onSelect(channel)}
          className="shrink-0 text-primary focus:ring-primary"
        />
        {channel.image && <img src={channel.image} alt={channel.name} className="h-6 shrink-0" />}
        <span className="text-sm font-medium text-on-surface truncate">{channel.name}</span>
      </div>
      <span className="text-xs text-on-surface-variant shrink-0">
        {fee > 0 ? `+Rp ${fee.toLocaleString("id-ID")}` : "Gratis"}
      </span>
    </label>
  );
}

function EmptyCheckout({ store }: { store: Store }) {
  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title={`Checkout - ${store.name}`} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
        <div className="bg-surface-container-lowest rounded-3xl p-12 text-center border border-surface-container-high">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">
            remove_shopping_cart
          </span>
          <p className="mt-4 font-headline text-lg font-bold text-on-surface">
            Belum ada produk untuk dibayar
          </p>
          <p className="mt-1.5 text-sm text-on-surface-variant max-w-sm mx-auto">
            Keranjangmu di {store.name} kosong, jadi belum ada yang bisa di-checkout. Pilih dulu
            produk yang ingin dibeli.
          </p>
          <Link
            href={`/stores/${store.slug}`}
            className="inline-flex items-center gap-2 mt-6 bg-primary text-on-primary px-6 py-3 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all"
          >
            <span className="material-symbols-outlined text-lg">storefront</span>
            Lihat Produk {store.name}
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
