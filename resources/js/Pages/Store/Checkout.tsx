import { useState } from "react";
import { Head, useForm, usePage } from "@inertiajs/react";
import { Cart, PageProps, PaymentChannel, ShippingRate, Store, UserAddress } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import AddressPicker from "@/Components/Store/AddressPicker";
import ShippingRatePicker from "@/Components/Store/ShippingRatePicker";
import OrderSummary from "@/Components/Store/OrderSummary";

interface CheckoutSummary {
  subtotal: number;
  total_weight_grams: number;
  requires_shipping: boolean;
}

interface CheckoutPageProps extends PageProps {
  store: Store;
  cart: Cart;
  summary: CheckoutSummary;
  addresses: UserAddress[];
  paymentChannels: PaymentChannel[];
}

export default function Checkout() {
  const { store, cart, summary, addresses, paymentChannels } = usePage<CheckoutPageProps>().props;

  const [addressId, setAddressId] = useState<number | null>(null);
  const [shippingRate, setShippingRate] = useState<ShippingRate | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannel | null>(null);

  const { data, setData, post, processing, errors } = useForm({
    user_address_id: null as number | null,
    shipping_courier_code: null as string | null,
    shipping_service: null as string | null,
    payment_provider: "",
    payment_method: "",
    payment_channel: "",
    buyer_note: "",
  });

  const canSubmit =
    selectedChannel !== null && (!summary.requires_shipping || (addressId !== null && shippingRate !== null));

  const doSubmit = () => {
    post(`/checkout/${store.slug}`, {
      onBefore: () => {
        setData((prev) => ({
          ...prev,
          user_address_id: addressId,
          shipping_courier_code: shippingRate?.courier_code ?? null,
          shipping_service: shippingRate?.service ?? null,
          payment_provider: selectedChannel?.provider ?? "",
          payment_method: selectedChannel?.method ?? "",
          payment_channel: selectedChannel?.code ?? "",
        }));
        return true;
      },
    });
  };

  const vaChannels = paymentChannels.filter((c) => c.method === "va");
  const qrisChannels = paymentChannels.filter((c) => c.method === "qris");

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title={`Checkout - ${store.name}`} />

      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-8">Checkout — {store.name}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high">
              <h2 className="font-headline text-lg font-bold text-on-surface mb-4">Produk</h2>
              <div className="divide-y divide-outline-variant/10">
                {cart.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 py-3">
                    <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center overflow-hidden shrink-0">
                      {item.product?.primary_image_url && (
                        <img src={item.product.primary_image_url} alt={item.product.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{item.product?.name}</p>
                      {item.variant && <p className="text-xs text-on-surface-variant">{item.variant.label}</p>}
                    </div>
                    <p className="text-sm text-on-surface-variant">× {item.quantity}</p>
                  </div>
                ))}
              </div>
            </section>

            {summary.requires_shipping && (
              <section className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high">
                <h2 className="font-headline text-lg font-bold text-on-surface mb-4">Alamat Pengiriman</h2>
                <AddressPicker initialAddresses={addresses} value={addressId} onChange={setAddressId} />
              </section>
            )}

            {summary.requires_shipping && (
              <section className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high">
                <h2 className="font-headline text-lg font-bold text-on-surface mb-4">Pilih Kurir</h2>
                <ShippingRatePicker storeId={store.id} addressId={addressId} value={shippingRate} onSelect={setShippingRate} />
              </section>
            )}

            <section className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high">
              <h2 className="font-headline text-lg font-bold text-on-surface mb-4">Metode Pembayaran</h2>

              {qrisChannels.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-wider text-on-surface-variant font-label mb-2">QRIS</p>
                  <div className="space-y-2">
                    {qrisChannels.map((channel) => (
                      <ChannelOption
                        key={`${channel.provider}-${channel.method}-${channel.code}`}
                        channel={channel}
                        selected={selectedChannel}
                        onSelect={setSelectedChannel}
                      />
                    ))}
                  </div>
                </div>
              )}

              {vaChannels.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-on-surface-variant font-label mb-2">Virtual Account</p>
                  <div className="space-y-2">
                    {vaChannels.map((channel) => (
                      <ChannelOption
                        key={`${channel.provider}-${channel.method}-${channel.code}`}
                        channel={channel}
                        selected={selectedChannel}
                        onSelect={setSelectedChannel}
                      />
                    ))}
                  </div>
                </div>
              )}

              {paymentChannels.length === 0 && (
                <p className="text-sm text-on-surface-variant">Metode pembayaran belum tersedia saat ini.</p>
              )}
              {errors.payment_channel && <p className="mt-2 text-xs text-error">{errors.payment_channel}</p>}
            </section>

            <section className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high">
              <label className="block font-label text-sm font-medium text-on-surface mb-2">Catatan untuk Penjual (opsional)</label>
              <textarea
                value={data.buyer_note}
                onChange={(e) => setData("buyer_note", e.target.value)}
                rows={3}
                className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm"
              />
            </section>
          </div>

          <div className="space-y-4">
            <OrderSummary
              subtotal={summary.subtotal}
              shippingCost={summary.requires_shipping ? shippingRate?.cost ?? null : 0}
              paymentFee={selectedChannel?.fee ?? null}
              requiresShipping={summary.requires_shipping}
            />
            <button
              type="button"
              onClick={doSubmit}
              disabled={!canSubmit || processing}
              className="w-full bg-primary text-on-primary px-8 py-3.5 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buat Pesanan
            </button>
            {/* Backend can also report non-field errors (e.g. "cart", "store") that aren't part
                of this form's own field set — read those via a loose cast. */}
            {(errors as Record<string, string>).cart && (
              <p className="text-xs text-error text-center">{(errors as Record<string, string>).cart}</p>
            )}
            {errors.shipping_courier_code && <p className="text-xs text-error text-center">{errors.shipping_courier_code}</p>}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function ChannelOption({
  channel,
  selected,
  onSelect,
}: {
  channel: PaymentChannel;
  selected: PaymentChannel | null;
  onSelect: (c: PaymentChannel) => void;
}) {
  const isSelected =
    selected?.provider === channel.provider && selected?.method === channel.method && selected?.code === channel.code;

  return (
    <label
      className={`flex items-center justify-between gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
        isSelected ? "border-primary bg-primary-container/20" : "border-outline-variant/20 hover:border-outline-variant"
      }`}
    >
      <div className="flex items-center gap-3">
        <input
          type="radio"
          name="payment_channel"
          checked={isSelected}
          onChange={() => onSelect(channel)}
          className="text-primary focus:ring-primary"
        />
        {channel.image && <img src={channel.image} alt={channel.name} className="h-6" />}
        <span className="text-sm font-medium text-on-surface">{channel.name}</span>
      </div>
      <span className="text-xs text-on-surface-variant">
        {channel.fee > 0 ? `+Rp ${channel.fee.toLocaleString("id-ID")}` : "Gratis"}
      </span>
    </label>
  );
}
