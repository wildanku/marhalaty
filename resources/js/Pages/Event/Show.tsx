import { useState, useMemo } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import { PageProps, GontorEvent, Rsvp, CustomFormField } from "@/types";
import { z } from "zod";
import Header from "@/Components/Header";
import CurrencyInput from "@/Components/CurrencyInput";
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
  const customForms: CustomFormField[] = event.metadata?.custom_forms ?? [];

  const { data, setData, post, processing, errors, setError, clearErrors } = useForm<{
    event_package_id: number | null;
    infak_amount: string;
    addons: SelectedAddon[];
    custom_form_data: Record<string, string>;
    payment_provider: "manual" | "ipaymu";
  }>({
    event_package_id: event.packages && event.packages.length === 1 ? event.packages[0].id : null,
    infak_amount: "0",
    addons: [],
    custom_form_data: customForms.reduce(
      (acc, field) => ({ ...acc, [field.id]: "" }),
      {} as Record<string, string>
    ),
    payment_provider: "ipaymu",
  });

  // Track selected variants per addon: Record<addonId, Record<variantKey, selectedValue>>
  const [selectedVariants, setSelectedVariants] = useState<Record<number, Record<string, string>>>(
    {}
  );

  const totalCalculation = useMemo(() => {
    const pkg = event.packages?.find((p) => p.id === data.event_package_id);
    const packageCost = pkg ? parseFloat(pkg.price) : 0;
    const infak = parseFloat(data.infak_amount) || 0;
    const addonsCost = data.addons.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
    return packageCost + infak + addonsCost;
  }, [data.event_package_id, data.infak_amount, data.addons, event.packages]);

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
      event_package_id: z
        .number()
        .nullable()
        .refine((val) => {
          return !(event.packages && event.packages.length > 0 && val === null);
        }, "Pilih salah satu tiket/paket terlebih dahulu"),
      infak_amount: z.number().refine(
        (val) => {
          if (event.infak_rules?.enabled && val > 0) {
            const rules = event.infak_rules;
            if (!rules.allow_custom && !(rules.options || []).includes(val)) return false;
            if (
              rules.allow_custom &&
              val < (rules.min_custom || 0) &&
              !(rules.options || []).includes(val)
            )
              return false;
          }
          return true;
        },
        { message: "Nominal infak tidak valid atau kurang dari batas minimal" }
      ),
    });

    const result = rsvpSchema.safeParse({
      event_package_id: data.event_package_id,
      infak_amount: parseFloat(data.infak_amount) || 0,
    });

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        setError(issue.path[0] as any, issue.message);
      });
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
              {/* <div className="flex items-center gap-2 mb-4">
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
              </div> */}

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
              {/* ── Package Selection ── */}
              {event.packages && event.packages.length > 0 && (
                <div>
                  <h3 className="font-headline text-xl font-bold text-on-surface mb-1">
                    Pilih Tiket / Paket
                  </h3>
                  <div className="space-y-3 mt-4">
                    {event.packages.map((pkg) => {
                      const isSoldOut = pkg.stock_quantity !== null && pkg.stock_quantity < 1;
                      return (
                        <label
                          key={pkg.id}
                          className={`flex items-start p-4 rounded-xl border-2 transition-all ${
                            isSoldOut
                              ? "opacity-50 cursor-not-allowed bg-surface-container"
                              : "cursor-pointer hover:border-outline-variant"
                          } ${
                            data.event_package_id === pkg.id && !isSoldOut
                              ? "border-primary bg-primary/5"
                              : "border-surface-container"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-body font-bold text-on-surface text-base">
                                {pkg.name}
                              </span>
                              <span className="font-headline font-bold text-primary">
                                {parseFloat(pkg.price) === 0
                                  ? "Gratis"
                                  : formatRupiah(parseFloat(pkg.price))}
                              </span>
                            </div>
                            {pkg.description && (
                              <p className="font-body text-xs text-on-surface-variant line-clamp-2 mb-2">
                                {pkg.description}
                              </p>
                            )}
                            {pkg.stock_quantity !== null && (
                              <span className="inline-block bg-surface border border-outline-variant px-2 py-0.5 rounded text-[10px] font-bold text-on-surface-variant uppercase">
                                {isSoldOut ? "Habis Terjual" : `Sisa ${pkg.stock_quantity} Kuota`}
                              </span>
                            )}
                          </div>
                          {!isSoldOut && (
                            <input
                              type="radio"
                              name="event_package_id"
                              value={pkg.id}
                              checked={data.event_package_id === pkg.id}
                              onChange={() => setData("event_package_id", pkg.id)}
                              className="ml-4 mt-1 text-primary focus:ring-primary"
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {errors.event_package_id && (
                    <p className="text-error text-xs font-medium mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      {errors.event_package_id}
                    </p>
                  )}
                </div>
              )}

              {/* ── Infak Section ── */}
              {event.infak_rules?.enabled && (
                <div
                  className={`${event.packages && event.packages.length > 0 ? "border-t border-surface-container pt-6" : ""}`}
                >
                  <h3 className="font-headline text-xl font-bold text-on-surface mb-1">
                    Infak / Kontribusi
                  </h3>
                  <p className="font-body text-xs text-on-surface-variant mb-5">
                    {event.infak_rules.description ?? "Berikan dukungan infak terbaik Anda."}
                  </p>
                  <div className="space-y-2">
                    {event.infak_rules.options?.map((tier) => (
                      <label
                        key={tier}
                        className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border-2 transition-all ${
                          data.infak_amount === String(tier)
                            ? "border-primary bg-primary/5"
                            : "border-surface-container hover:border-outline-variant"
                        }`}
                      >
                        <span className="font-body font-medium text-on-surface text-sm">
                          {formatRupiah(tier)}
                        </span>
                        <input
                          type="radio"
                          name="infak_amount"
                          value={tier}
                          checked={data.infak_amount === String(tier)}
                          onChange={(e) => setData("infak_amount", e.target.value)}
                          className="text-primary focus:ring-primary"
                        />
                      </label>
                    ))}

                    {event.infak_rules.allow_custom && (
                      <label
                        className={`flex flex-col p-4 rounded-xl cursor-pointer border-2 transition-all ${
                          data.infak_amount !== "0" &&
                          !(event.infak_rules.options || []).includes(Number(data.infak_amount))
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
                            name="infak_amount"
                            checked={
                              data.infak_amount !== "0" &&
                              !(event.infak_rules.options || []).includes(Number(data.infak_amount))
                            }
                            onChange={() =>
                              setData(
                                "infak_amount",
                                String(event.infak_rules?.min_custom ?? 10000)
                              )
                            }
                            className="text-primary focus:ring-primary"
                          />
                        </div>
                        {data.infak_amount !== "0" &&
                          !(event.infak_rules.options || []).includes(
                            Number(data.infak_amount)
                          ) && (
                            <CurrencyInput
                              value={data.infak_amount}
                              onChange={(val) => setData("infak_amount", val)}
                              className=""
                              placeholder={`Min. ${formatRupiah(event.infak_rules.min_custom ?? 10000)}`}
                            />
                          )}
                      </label>
                    )}

                    <label
                      className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border-2 transition-all ${
                        data.infak_amount === "0" || data.infak_amount === ""
                          ? "border-primary bg-primary/5"
                          : "border-surface-container hover:border-outline-variant"
                      }`}
                    >
                      <span className="font-body font-medium text-on-surface text-sm">
                        Lewati Infak
                      </span>
                      <input
                        type="radio"
                        name="infak_amount"
                        value="0"
                        checked={data.infak_amount === "0" || data.infak_amount === ""}
                        onChange={() => setData("infak_amount", "0")}
                        className="text-primary focus:ring-primary"
                      />
                    </label>
                  </div>
                  {errors.infak_amount && (
                    <p className="text-error text-xs font-medium mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      {errors.infak_amount}
                    </p>
                  )}
                </div>
              )}

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

              {/* ── Payment Method ── */}
              <div className="border-t border-surface-container pt-6">
                <h3 className="font-headline text-lg font-bold text-on-surface mb-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    payments
                  </span>
                  Metode Pembayaran
                </h3>
                <p className="font-body text-xs text-on-surface-variant mb-4">
                  Pilih cara pembayaran yang paling mudah untukmu.
                </p>
                <div className="space-y-3">
                  {/* iPaymu */}
                  <label
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      data.payment_provider === "ipaymu"
                        ? "border-primary bg-primary/5"
                        : "border-surface-container hover:border-outline-variant"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_provider"
                      value="ipaymu"
                      checked={data.payment_provider === "ipaymu"}
                      onChange={() => setData("payment_provider", "ipaymu")}
                      className="text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="font-body font-semibold text-on-surface text-sm">iPaymu</p>
                      <p className="font-body text-xs text-on-surface-variant mt-0.5">
                        Transfer Bank, QRIS, atau e-Wallet via iPaymu
                      </p>
                    </div>
                    <span
                      className="material-symbols-outlined text-primary text-[22px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      account_balance
                    </span>
                  </label>

                  {/* Manual Transfer */}
                  <label
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      data.payment_provider === "manual"
                        ? "border-primary bg-primary/5"
                        : "border-surface-container hover:border-outline-variant"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_provider"
                      value="manual"
                      checked={data.payment_provider === "manual"}
                      onChange={() => setData("payment_provider", "manual")}
                      className="text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <p className="font-body font-semibold text-on-surface text-sm">
                        Transfer Manual
                      </p>
                      <p className="font-body text-xs text-on-surface-variant mt-0.5">
                        Transfer ke rekening panitia, upload bukti, tunggu konfirmasi admin
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant text-[22px]">
                      receipt_long
                    </span>
                  </label>
                </div>
              </div>

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

                {auth?.user ? (
                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-primary hover:opacity-90 text-white py-4 px-6 rounded-full font-headline font-bold uppercase tracking-wider transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      "Memproses..."
                    ) : (
                      <>
                        {data.payment_provider === "ipaymu"
                          ? "Bayar via iPaymu"
                          : "Lanjut ke Pembayaran"}
                        <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                      </>
                    )}
                  </button>
                ) : (
                  <a
                    href="/auth/google/redirect"
                    className="w-full bg-primary hover:opacity-90 text-white py-4 px-6 rounded-full font-headline font-bold uppercase tracking-wider transition-all shadow-md flex justify-center items-center gap-2 text-center"
                  >
                    Login untuk RSVP
                    <span className="material-symbols-outlined text-[20px]">login</span>
                  </a>
                )}

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
