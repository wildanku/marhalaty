import { useState, useMemo } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import { PageProps, GontorEvent, Rsvp, CustomFormField } from "@/types";
import { z } from "zod";
import Header from "@/Components/Header";

interface SelectedAddon {
  id: number;
  quantity: number;
  variants: Record<string, string>;
  price: number;
}

interface ShowProps extends PageProps {
  event: GontorEvent;
  existingRsvp: Rsvp | null;
}

export default function Show({ auth, event, existingRsvp }: ShowProps) {
  const isFlexible = event.payment_type === "flexible";
  const isFixed = event.payment_type === "fixed";
  const rules = event.pricing_rules;

  const minimumCustom = rules?.min_custom ?? 0;
  const defaultFixedPrice = rules?.amount ?? 0;
  const flexibleTiers = rules?.options ?? [];
  const customForms: CustomFormField[] = event.metadata?.custom_forms ?? [];

  const { data, setData, post, processing, errors, setError, clearErrors } = useForm<{
    base_amount: string;
    addons: SelectedAddon[];
    custom_form_data: Record<string, string>;
  }>({
    base_amount: isFixed
      ? String(defaultFixedPrice)
      : isFlexible && flexibleTiers[0]
        ? String(flexibleTiers[0])
        : "0",
    addons: [],
    custom_form_data: customForms.reduce(
      (acc, field) => ({ ...acc, [field.id]: "" }),
      {} as Record<string, string>
    ),
  });

  // Track selected variants per addon: Record<addonId, Record<variantKey, selectedValue>>
  const [selectedVariants, setSelectedVariants] = useState<Record<number, Record<string, string>>>(
    {}
  );

  const totalCalculation = useMemo(() => {
    const base = parseFloat(data.base_amount) || 0;
    const addonsCost = data.addons.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
    return base + addonsCost;
  }, [data.base_amount, data.addons]);

  const handleAddonQty = (addonId: number, priceStr: string, qty: number) => {
    const price = parseFloat(priceStr);
    const variants = selectedVariants[addonId] ?? {};
    const filtered = data.addons.filter((a: SelectedAddon) => a.id !== addonId);
    const updated: SelectedAddon[] =
      qty > 0 ? [...filtered, { id: addonId, quantity: qty, variants, price }] : filtered;
    setData("addons", updated);
  };

  const handleVariantChange = (addonId: number, variantKey: string, value: string) => {
    const updated = { ...(selectedVariants[addonId] ?? {}), [variantKey]: value };
    setSelectedVariants((prev) => ({ ...prev, [addonId]: updated }));
    const synced: SelectedAddon[] = data.addons.map((a: SelectedAddon) =>
      a.id === addonId ? { ...a, variants: updated } : a
    );
    setData("addons", synced);
  };

  const getAddonQty = (addonId: number) => data.addons.find((a) => a.id === addonId)?.quantity ?? 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const rsvpSchema = z.object({
      base_amount: z.number().refine(
        (val) => {
          if (isFlexible) return val >= minimumCustom;
          if (isFixed) return val === defaultFixedPrice;
          return val === 0;
        },
        {
          message: isFlexible
            ? `Minimum infak adalah Rp ${minimumCustom.toLocaleString("id-ID")}`
            : "Harga tiket tidak valid",
        }
      ),
    });

    const result = rsvpSchema.safeParse({ base_amount: parseFloat(data.base_amount) || 0 });

    if (!result.success) {
      setError("base_amount", result.error.issues[0].message);
      return;
    }

    post(`/events/${event.slug}/rsvp`);
  };

  const formatRupiah = (num: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);

  const statusBadge: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    paid: "bg-green-100 text-green-700",
    expired: "bg-red-100 text-red-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col antialiased">
      <Head title={`${event.title} – Event`} />

      <Header />

      <main className="px-4 md:px-12 pb-32 pt-8 max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-8 items-start">
        {/* ─── Left: Event Detail ─── */}
        <div className="w-full md:w-3/5 flex flex-col gap-6">
          {/* Back link */}
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-body text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Kembali ke daftar event
          </Link>

          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0px_10px_40px_rgba(80,100,71,0.06)] border border-surface-container-high">
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-tertiary/15 text-tertiary px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  {event.visibility_scope === "global" || !event.visibility_scope
                    ? "Event Global"
                    : `Marhalah ${event.visibility_scope}`}
                </span>
                <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  {event.payment_type === "free"
                    ? "Gratis"
                    : event.payment_type === "fixed"
                      ? "Tiket"
                      : "Infak"}
                </span>
              </div>

              <h2 className="font-headline text-3xl font-bold text-on-surface leading-tight mb-6">
                {event.title}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-surface-container px-4 py-3 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-0.5">schedule</span>
                  <div>
                    <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-1">
                      Tanggal & Waktu
                    </p>
                    <p className="font-body font-semibold text-on-surface text-sm">
                      {new Date(event.event_date).toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="font-body text-xs text-on-surface-variant mt-0.5">
                      {new Date(event.event_date).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      WIB
                    </p>
                  </div>
                </div>
                <div className="bg-surface-container px-4 py-3 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-0.5">location_on</span>
                  <div>
                    <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-1">
                      Lokasi
                    </p>
                    <p className="font-body font-semibold text-on-surface text-sm">
                      {event.location}
                    </p>
                  </div>
                </div>
              </div>

              <div className="prose prose-sm max-w-none text-on-surface-variant font-body leading-relaxed">
                <p>{event.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right: RSVP Form or Already Registered ─── */}
        <div className="w-full md:w-2/5 md:sticky md:top-24 space-y-6">
          {existingRsvp ? (
            /* Already Registered Banner */
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0px_10px_40px_rgba(80,100,71,0.06)] border border-surface-container-high text-center">
              <span
                className="material-symbols-outlined text-5xl text-primary mb-3"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <h3 className="font-headline text-xl font-bold text-on-surface mb-2">
                Kamu Sudah Terdaftar!
              </h3>
              <p className="font-body text-sm text-on-surface-variant mb-4">
                RSVP kamu untuk event ini sudah tercatat.
              </p>

              <div className="bg-surface-container rounded-xl p-4 text-left space-y-2 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-body text-xs text-on-surface-variant">Status</span>
                  <span
                    className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge[existingRsvp.status] ?? ""}`}
                  >
                    {existingRsvp.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body text-xs text-on-surface-variant">Total Infak</span>
                  <span className="font-body text-sm font-semibold text-on-surface">
                    {formatRupiah(parseFloat(existingRsvp.total_amount))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body text-xs text-on-surface-variant">Tanggal Daftar</span>
                  <span className="font-body text-xs text-on-surface">
                    {new Date(existingRsvp.created_at).toLocaleDateString("id-ID")}
                  </span>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="w-full inline-flex justify-center items-center gap-2 bg-primary text-on-primary py-3 px-6 rounded-full font-headline font-bold text-sm transition-all hover:opacity-90"
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                Lihat di Dashboard
              </Link>
            </div>
          ) : (
            /* RSVP Form */
            <form
              onSubmit={submit}
              className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0px_10px_40px_rgba(80,100,71,0.06)] border border-surface-container-high space-y-8"
            >
              {/* ── Contribution Section ── */}
              <div>
                <h3 className="font-headline text-xl font-bold text-on-surface mb-1">
                  {event.payment_type === "free" ? "RSVP Gratis" : "Infak / Kontribusi"}
                </h3>
                <p className="font-body text-xs text-on-surface-variant mb-5">
                  {event.payment_type === "free" && "Acara ini sepenuhnya gratis."}
                  {event.payment_type === "fixed" &&
                    "Terdapat biaya tiket standar untuk acara ini."}
                  {event.payment_type === "flexible" &&
                    "Pilih nominal infak yang sesuai kemampuan untuk mendukung penyelenggaraan acara."}
                </p>

                {isFlexible && (
                  <div className="space-y-2">
                    {flexibleTiers.map((tier) => (
                      <label
                        key={tier}
                        className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border-2 transition-all ${
                          data.base_amount === String(tier)
                            ? "border-primary bg-primary/5"
                            : "border-surface-container hover:border-outline-variant"
                        }`}
                      >
                        <span className="font-body font-medium text-on-surface text-sm">
                          {formatRupiah(tier)}
                        </span>
                        <input
                          type="radio"
                          name="base_amount"
                          value={tier}
                          checked={data.base_amount === String(tier)}
                          onChange={(e) => setData("base_amount", e.target.value)}
                          className="text-primary focus:ring-primary"
                        />
                      </label>
                    ))}

                    {rules.allow_custom && (
                      <label
                        className={`flex flex-col p-4 rounded-xl cursor-pointer border-2 transition-all ${
                          data.base_amount !== "0" &&
                          !flexibleTiers.includes(Number(data.base_amount))
                            ? "border-primary bg-primary/5"
                            : "border-surface-container hover:border-outline-variant"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-body font-medium text-on-surface text-sm">
                            Nominal Lain
                          </span>
                          <input
                            type="radio"
                            name="base_amount"
                            checked={
                              data.base_amount !== "0" &&
                              !flexibleTiers.includes(Number(data.base_amount))
                            }
                            onChange={() =>
                              setData("base_amount", String(rules.min_custom ?? 10000))
                            }
                            className="text-primary focus:ring-primary"
                          />
                        </div>
                        {data.base_amount !== "0" &&
                          !flexibleTiers.includes(Number(data.base_amount)) && (
                            <input
                              type="number"
                              value={data.base_amount}
                              onChange={(e) => setData("base_amount", e.target.value)}
                              min={minimumCustom}
                              step={1000}
                              className="w-full bg-surface text-on-surface border border-outline rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                              placeholder={`Min. ${formatRupiah(minimumCustom)}`}
                            />
                          )}
                      </label>
                    )}
                  </div>
                )}

                {isFixed && (
                  <div className="p-5 bg-surface-container rounded-xl flex justify-between items-center border border-outline-variant/30">
                    <span className="font-headline font-bold text-on-surface">Tiket Standar</span>
                    <span className="font-body font-bold text-primary text-lg">
                      {formatRupiah(defaultFixedPrice)}
                    </span>
                  </div>
                )}

                {errors.base_amount && (
                  <p className="text-error text-xs font-medium mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {errors.base_amount}
                  </p>
                )}
              </div>

              {/* ── Add-Ons / Merchandise ── */}
              {event.addons && event.addons.length > 0 && (
                <div className="border-t border-surface-container pt-6">
                  <h3 className="font-headline text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      checkroom
                    </span>
                    Merchandise Resmi
                  </h3>
                  <div className="space-y-4">
                    {event.addons.map((addon) => {
                      const qty = getAddonQty(addon.id);
                      const addonVariants = addon.variants ?? {};
                      const variantKeys = Object.keys(addonVariants);

                      return (
                        <div
                          key={addon.id}
                          className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-3"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-headline font-bold text-sm text-on-surface">
                                {addon.name}
                              </p>
                              <p className="font-body text-xs text-primary font-medium mt-0.5">
                                {formatRupiah(parseFloat(addon.price))} / pcs
                              </p>
                              <p className="font-body text-[10px] text-on-surface-variant mt-0.5">
                                Stok: {addon.stock_quantity}
                              </p>
                            </div>
                            {/* Qty Stepper */}
                            <div className="flex items-center bg-surface rounded-lg overflow-hidden shadow-sm border border-surface-container">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddonQty(addon.id, addon.price, Math.max(0, qty - 1))
                                }
                                className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors"
                              >
                                –
                              </button>
                              <span className="px-3 text-xs font-bold text-on-surface w-8 text-center">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddonQty(
                                    addon.id,
                                    addon.price,
                                    Math.min(addon.stock_quantity, qty + 1)
                                  )
                                }
                                className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Variant Dropdowns - shown only when qty > 0 */}
                          {qty > 0 && variantKeys.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {variantKeys.map((variantKey) => (
                                <div
                                  key={variantKey}
                                  className="flex flex-col gap-1 flex-1 min-w-[100px]"
                                >
                                  <label className="font-body text-[10px] text-on-surface-variant uppercase tracking-wider">
                                    {variantKey}
                                  </label>
                                  <select
                                    value={selectedVariants[addon.id]?.[variantKey] ?? ""}
                                    onChange={(e) =>
                                      handleVariantChange(addon.id, variantKey, e.target.value)
                                    }
                                    className="text-xs bg-surface border border-outline-variant/50 rounded-lg py-1.5 px-2 text-on-surface focus:ring-1 focus:ring-primary focus:border-primary"
                                  >
                                    <option value="">Pilih {variantKey}</option>
                                    {addonVariants[variantKey].map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Custom Form Fields ── */}
              {customForms.length > 0 && (
                <div className="border-t border-surface-container pt-6">
                  <h3 className="font-headline text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      assignment
                    </span>
                    Data Peserta
                  </h3>
                  <div className="space-y-4">
                    {customForms.map((field) => (
                      <div key={field.id}>
                        <label className="font-body text-sm font-medium text-on-surface block mb-1.5">
                          {field.label}
                          {field.required && <span className="text-error ml-1">*</span>}
                        </label>
                        {field.type === "textarea" ? (
                          <textarea
                            value={data.custom_form_data[field.id] ?? ""}
                            onChange={(e) =>
                              setData("custom_form_data", {
                                ...data.custom_form_data,
                                [field.id]: e.target.value,
                              })
                            }
                            rows={3}
                            required={field.required}
                            placeholder={field.placeholder}
                            className="w-full bg-surface text-on-surface border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary resize-none"
                          />
                        ) : field.type === "select" && field.options ? (
                          <select
                            value={data.custom_form_data[field.id] ?? ""}
                            onChange={(e) =>
                              setData("custom_form_data", {
                                ...data.custom_form_data,
                                [field.id]: e.target.value,
                              })
                            }
                            required={field.required}
                            className="w-full bg-surface text-on-surface border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                          >
                            <option value="">Pilih {field.label}</option>
                            {field.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={data.custom_form_data[field.id] ?? ""}
                            onChange={(e) =>
                              setData("custom_form_data", {
                                ...data.custom_form_data,
                                [field.id]: e.target.value,
                              })
                            }
                            required={field.required}
                            placeholder={field.placeholder}
                            className="w-full bg-surface text-on-surface border border-outline-variant/50 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Total & Submit ── */}
              <div className="border-t-2 border-surface-container pt-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-body text-on-surface-variant font-medium text-sm">
                    Total Estimasi
                  </span>
                  <span className="font-headline text-2xl font-bold text-on-surface">
                    {formatRupiah(totalCalculation)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full bg-[#506447] hover:bg-[#3d4e36] text-white py-4 px-6 rounded-full font-headline font-bold uppercase tracking-wider transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    "Mendaftar..."
                  ) : (
                    <>
                      Konfirmasi RSVP
                      <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                    </>
                  )}
                </button>
                <p className="text-center font-body text-[10px] text-on-surface-variant mt-3">
                  Pendaftaran bersifat final. Pembayaran akan dikonfirmasi oleh panitia.
                </p>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
