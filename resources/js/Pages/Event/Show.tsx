import { useState, useMemo, useEffect } from "react";
import type { ReactElement } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import { PageProps, GontorEvent, Rsvp, CustomFormField } from "@/types";
import Header from "@/Components/Header";
import CurrencyInput from "@/Components/CurrencyInput";

// ─── Local Types ─────────────────────────────────────────────────────────────

interface SelectedAddon {
  id: number;
  quantity: number;
  variants: Record<string, string>;
  price: number;
}

// addonId → variantKey → string[] (one value per included quantity slot)
type IncludedAddonVariants = Record<number, Record<string, string[]>>;

type StepKey = "form" | "package" | "addons" | "infak" | "konfirmasi";

interface ShowProps extends PageProps {
  event: GontorEvent;
  existingRsvp: Rsvp | null;
  image_url?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatRupiah = (num: number | string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(typeof num === "string" ? parseFloat(num) : num);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// ─── Payment Channels ─────────────────────────────────────────────────────────

interface PaymentChannelData {
  code: string;
  name: string;
  fee: number;
  fee_type: "fixed" | "percentage";
  image?: string;
  metadata?: Record<string, unknown>;
}

// Flattened channel for easier UI rendering
interface PaymentChannel extends PaymentChannelData {
  method: "qris" | "va";
}

// ─── Step Config ─────────────────────────────────────────────────────────────

const STEP_CONFIGS: { key: StepKey; label: string; icon: string }[] = [
  { key: "form", label: "Formulir", icon: "assignment" },
  { key: "package", label: "Pilih Paket", icon: "local_offer" },
  { key: "addons", label: "Tambahan", icon: "add_shopping_cart" },
  { key: "infak", label: "Infak", icon: "volunteer_activism" },
  { key: "konfirmasi", label: "Konfirmasi", icon: "fact_check" },
];

// ─── Stepper Progress ─────────────────────────────────────────────────────────

function StepperProgress({
  steps,
  currentIndex,
}: {
  steps: { key: StepKey; label: string; icon: string }[];
  currentIndex: number;
}) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-xl mx-auto mb-8">
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? "bg-primary text-on-primary"
                    : isCurrent
                      ? "bg-primary text-on-primary ring-4 ring-primary/20"
                      : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {isCompleted ? (
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check
                  </span>
                ) : (
                  <span className="font-headline text-sm font-bold">{i + 1}</span>
                )}
              </div>
              <span
                className={`text-[10px] font-body font-semibold hidden sm:block whitespace-nowrap ${
                  isCurrent
                    ? "text-primary"
                    : isCompleted
                      ? "text-on-surface-variant"
                      : "text-on-surface-variant/50"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-12 mx-1 mb-5 transition-all duration-300 ${
                  i < currentIndex ? "bg-primary" : "bg-surface-container"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Show({ auth, event, existingRsvp, image_url }: ShowProps) {
  const user = auth.user;
  const customForms: CustomFormField[] = event.metadata?.custom_forms ?? [];
  const packageDescription =
    typeof event.metadata?.package_description === "string"
      ? event.metadata.package_description
      : null;
  const addonDescription =
    typeof event.metadata?.addon_description === "string" ? event.metadata.addon_description : null;

  // ── Form State ────────────────────────────────────────────────────────────
  const { data, setData, post, processing, errors, clearErrors } = useForm<{
    event_package_id: number | null;
    infak_amount: string;
    addons: SelectedAddon[];
    custom_form_data: Record<string, string>;
    included_addon_variants: IncludedAddonVariants;
    purchased_addon_variants: IncludedAddonVariants;
    payment_provider: "manual" | "ipaymu";
    payment_channel: string;
  }>({
    event_package_id: null,
    infak_amount: "0",
    addons: [],
    custom_form_data: {},
    included_addon_variants: {},
    purchased_addon_variants: {},
    payment_provider: "manual",
    payment_channel: "",
  });

  // ── View / Step State ─────────────────────────────────────────────────────
  const [view, setView] = useState<"detail" | "stepper">("detail");
  const [stepIndex, setStepIndex] = useState(0);
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannel[]>([]);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);

  // ── Fetch Payment Channels ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch("/api/payment-channels");
        const data: Array<{ method: "qris" | "va"; channels: PaymentChannelData[] }> =
          await response.json();
        // Flatten the structure and add method field
        const flattened: PaymentChannel[] = [];
        data.forEach((group) => {
          group.channels.forEach((ch) => {
            flattened.push({
              ...ch,
              method: group.method,
            });
          });
        });
        setPaymentChannels(flattened);
      } catch (err) {
        console.error("Failed to fetch payment channels:", err);
      }
    };
    fetchChannels();
  }, []);

  // ── Active Steps ──────────────────────────────────────────────────────────
  const activeSteps = useMemo(
    () =>
      STEP_CONFIGS.filter((s) => {
        if (s.key === "form") return customForms.length > 0;
        if (s.key === "infak") return !!event.infak_rules?.enabled;
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customForms.length, event.infak_rules?.enabled]
  );

  const currentStep = activeSteps[stepIndex];
  const isLastStep = stepIndex === activeSteps.length - 1;
  const selectedPackage = event.packages?.find((p) => p.id === data.event_package_id) ?? null;

  // ── Totals ────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const pkg = parseFloat(selectedPackage?.price ?? "0");
    const infak = parseFloat(data.infak_amount) || 0;
    const addons = data.addons.reduce((s, a) => s + a.price * a.quantity, 0);
    const subtotal = pkg + infak + addons;

    // Calculate admin fee
    let adminFee = 0;
    if (data.payment_provider === "ipaymu" && data.payment_channel) {
      const channel = paymentChannels.find((ch) => ch.code === data.payment_channel);
      if (channel) {
        adminFee =
          channel.fee_type === "percentage"
            ? Math.round(subtotal * (channel.fee / 100))
            : channel.fee;
      }
    }

    return { pkg, infak, addons, subtotal, adminFee, total: subtotal + adminFee };
  }, [
    selectedPackage,
    data.infak_amount,
    data.addons,
    data.payment_provider,
    data.payment_channel,
    paymentChannels,
  ]);

  // ── Min Price ─────────────────────────────────────────────────────────────
  const minPrice = useMemo(() => {
    if (!event.packages || event.packages.length === 0) return null;
    return Math.min(...event.packages.map((p) => parseFloat(p.price)));
  }, [event.packages]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const startRegistration = () => {
    if (!user) {
      window.location.href = `/auth/google/redirect?intended=/events/${event.slug}`;
      return;
    }
    setView("stepper");
    setStepIndex(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = () => {
    if (stepIndex < activeSteps.length - 1) {
      setStepIndex((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setStepIndex((s) => s - 1);
    } else {
      setView("detail");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openImagePreview = (src: string, title: string) => {
    setPreviewImage({ src, title });
  };

  const handleSubmit = () => {
    clearErrors();
    post(`/events/${event.slug}/rsvp`);
  };

  // ── Addon Handlers ────────────────────────────────────────────────────────
  const getAddonQty = (addonId: number) => data.addons.find((a) => a.id === addonId)?.quantity ?? 0;

  const handleAddonQty = (addonId: number, priceStr: string, qty: number) => {
    const price = parseFloat(priceStr);
    const filtered = data.addons.filter((a) => a.id !== addonId);
    const updated =
      qty > 0 ? [...filtered, { id: addonId, quantity: qty, variants: {}, price }] : filtered;
    // Clear purchased variant slots when qty drops to 0
    if (qty === 0) {
      const { [addonId]: _removed, ...rest } = data.purchased_addon_variants;
      setData("addons" as "addons", updated as SelectedAddon[]);
      setData("purchased_addon_variants", rest);
      return;
    }
    setData("addons", updated);
  };

  const handlePurchasedVariant = (
    addonId: number,
    variantKey: string,
    slotIndex: number,
    value: string
  ) => {
    const prev = data.purchased_addon_variants[addonId] ?? {};
    const prevArr = prev[variantKey] ?? [];
    const newArr = [...prevArr];
    newArr[slotIndex] = value;
    setData("purchased_addon_variants", {
      ...data.purchased_addon_variants,
      [addonId]: { ...prev, [variantKey]: newArr },
    });
  };

  const handleIncludedVariant = (
    addonId: number,
    variantKey: string,
    slotIndex: number,
    value: string
  ) => {
    const prev = data.included_addon_variants[addonId] ?? {};
    const prevArr = prev[variantKey] ?? [];
    const newArr = [...prevArr];
    newArr[slotIndex] = value;
    setData("included_addon_variants", {
      ...data.included_addon_variants,
      [addonId]: { ...prev, [variantKey]: newArr },
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DETAIL VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const statusBadge: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    paid: "bg-green-100 text-green-700",
    expired: "bg-red-100 text-red-700",
    failed: "bg-red-100 text-red-700",
  };

  const detailView = (
    <div className="max-w-5xl mx-auto px-4 md:px-8 pb-40 pt-6 w-full">
      {/* Back link */}
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary text-sm font-body mb-6 transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Kembali ke daftar event
      </Link>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* ── Left: Event Content ── */}
        <div className="flex-1 min-w-0">
          {/* Hero Banner */}
          {image_url ? (
            <div className="w-full rounded-2xl h-auto md:h-52 mb-6 overflow-hidden relative">
              <img src={image_url} alt={event.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full rounded-2xl bg-linear-to-br from-primary/20 via-tertiary/10 to-primary/5 h-52 md:h-52 mb-6 flex items-center justify-center overflow-hidden relative border border-outline">
              <span
                className="material-symbols-outlined text-9xl text-primary/20"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                celebration
              </span>
            </div>
          )}

          {/* Title */}
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-on-surface leading-tight mb-5">
            {event.title}
          </h1>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            <div className="flex items-start gap-3 bg-surface-container p-4 rounded-xl">
              <span className="material-symbols-outlined text-primary mt-0.5 shrink-0">
                calendar_month
              </span>
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-body mb-0.5">
                  Tanggal
                </p>
                <p className="font-body font-semibold text-on-surface text-sm">
                  {formatDate(event.event_date)}
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
            <div className="flex items-start gap-3 bg-surface-container p-4 rounded-xl">
              <span className="material-symbols-outlined text-primary mt-0.5 shrink-0">
                location_on
              </span>
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-body mb-0.5">
                  Lokasi
                </p>
                <p className="font-body font-semibold text-on-surface text-sm">{event.location}</p>
              </div>
            </div>
            {minPrice !== null && (
              <div className="flex items-start gap-3 bg-surface-container p-4 rounded-xl">
                <span className="material-symbols-outlined text-primary mt-0.5 shrink-0">
                  payments
                </span>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider font-body mb-0.5">
                    Mulai dari
                  </p>
                  <p className="font-body font-semibold text-on-surface text-sm">
                    {formatRupiah(minPrice)}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 bg-surface-container p-4 rounded-xl">
              <span className="material-symbols-outlined text-primary mt-0.5 shrink-0">
                confirmation_number
              </span>
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-body mb-0.5">
                  Pilihan Paket
                </p>
                <p className="font-body font-semibold text-on-surface text-sm">
                  {event.packages?.length ?? 0} Paket Tersedia
                </p>
              </div>
            </div>
          </div>

          {/* HTML Description */}
          <div
            className="prose prose-sm max-w-none font-body leading-relaxed text-on-surface-variant event-description"
            dangerouslySetInnerHTML={{ __html: event.description }}
          />
        </div>

        {/* ── Right: Registration Widget ── */}
        <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-24">
          {existingRsvp ? (
            /* Already Registered */
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0px_10px_40px_rgba(80,100,71,0.06)] border border-surface-container-high text-center">
              <span
                className="material-symbols-outlined text-5xl text-primary mb-3 block"
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
              <div className="bg-surface-container rounded-xl p-4 text-left space-y-2.5 mb-5">
                <div className="flex justify-between items-center">
                  <span className="font-body text-xs text-on-surface-variant">Status</span>
                  <span
                    className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge[existingRsvp.status] ?? ""}`}
                  >
                    {existingRsvp.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body text-xs text-on-surface-variant">Total</span>
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
              {existingRsvp.latest_transaction && (
                <Link
                  href={`/payments/${existingRsvp.latest_transaction.id}`}
                  className="w-full inline-flex justify-center items-center gap-2 bg-primary text-on-primary py-3 px-6 rounded-full font-headline font-bold text-sm transition-all hover:opacity-90 mb-3"
                >
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  Lihat Pembayaran
                </Link>
              )}
              <Link
                href="/dashboard"
                className="w-full inline-flex justify-center items-center gap-2 bg-surface-container text-on-surface-variant py-3 px-6 rounded-full font-headline font-semibold text-sm transition-all hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                Dashboard
              </Link>
            </div>
          ) : (
            /* Registration CTA Card */
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0px_10px_40px_rgba(80,100,71,0.06)] border border-surface-container-high">
              <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-1">
                Mulai dari
              </p>
              <p className="font-headline text-3xl font-bold text-primary mb-1">
                {minPrice !== null ? formatRupiah(minPrice) : "Gratis"}
              </p>
              <p className="font-body text-xs text-on-surface-variant mb-5">
                {event.packages?.length ?? 0} paket tersedia
              </p>

              <button
                onClick={startRegistration}
                className="w-full bg-primary text-on-primary py-4 px-6 rounded-full font-headline font-bold text-base transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                Daftar Sekarang
              </button>

              {!user && (
                <p className="text-xs text-on-surface-variant text-center mt-3 font-body">
                  Kamu akan diminta login dengan Google
                </p>
              )}

              <div className="mt-5 pt-5 border-t border-surface-container space-y-2">
                <div className="flex items-center gap-2 text-xs text-on-surface-variant font-body">
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    calendar_month
                  </span>
                  {formatDate(event.event_date)}
                </div>
                <div className="flex items-center gap-2 text-xs text-on-surface-variant font-body">
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    location_on
                  </span>
                  {event.location}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Sticky CTA ── */}
      {!existingRsvp && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-surface-container-high p-4 z-50">
          <button
            onClick={startRegistration}
            className="w-full bg-primary text-on-primary py-4 px-6 rounded-full font-headline font-bold text-base transition-all hover:opacity-90 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
            Daftar Sekarang
            {minPrice !== null && ` · ${formatRupiah(minPrice)}`}
          </button>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEPPER STEPS
  // ─────────────────────────────────────────────────────────────────────────

  // ── Step: Custom Forms ────────────────────────────────────────────────────
  const stepForm = (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">
          Formulir Pendaftaran
        </h2>
        <p className="font-body text-sm text-on-surface-variant">
          Lengkapi informasi berikut untuk melanjutkan.
        </p>
      </div>
      {customForms.map((field, i) => {
        const fieldKey = field.id ?? `field_${i}`;
        const value = data.custom_form_data[fieldKey] ?? field.default ?? "";
        const setValue = (v: string) =>
          setData("custom_form_data", { ...data.custom_form_data, [fieldKey]: v });
        const isRadioGrid = field.type.startsWith("radio-grid-");
        const gridCols = isRadioGrid ? parseInt(field.type.split("-")[2]) : 0;

        return (
          <div key={fieldKey}>
            <label className="block font-body font-semibold text-sm text-on-surface mb-2">
              {field.label}
              {field.required && <span className="text-error ml-1">*</span>}
            </label>

            {isRadioGrid && field.options && (
              <div
                className={`grid gap-2 w-full`}
                style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
              >
                {field.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setValue(opt)}
                    className={`flex items-center justify-center p-3 rounded-xl border-2 font-headline font-bold text-sm transition-all ${value === opt ? "border-primary bg-primary text-on-primary" : "border-surface-container bg-surface text-on-surface hover:border-primary/50"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {field.type === "radio" && field.options && (
              <div className="space-y-2">
                {field.options.map((opt) => (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      value === opt
                        ? "border-primary bg-primary/5"
                        : "border-surface-container hover:border-outline-variant"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        value === opt ? "border-primary" : "border-outline"
                      }`}
                    >
                      {value === opt && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <span className="font-body text-sm text-on-surface capitalize">{opt}</span>
                    <input
                      type="radio"
                      className="sr-only"
                      value={opt}
                      checked={value === opt}
                      onChange={() => setValue(opt)}
                    />
                  </label>
                ))}
              </div>
            )}

            {field.type === "number" && (
              <input
                type="number"
                value={value}
                min={0}
                onChange={(e) => setValue(e.target.value)}
                placeholder={field.placeholder ?? "0"}
                className="w-full px-4 py-3 rounded-xl border-2 border-surface-container focus:border-primary focus:outline-none bg-surface text-on-surface font-body text-sm transition-colors"
              />
            )}

            {field.type === "text" && (
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-4 py-3 rounded-xl border-2 border-surface-container focus:border-primary focus:outline-none bg-surface text-on-surface font-body text-sm transition-colors"
              />
            )}

            {field.type === "textarea" && (
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-surface-container focus:border-primary focus:outline-none bg-surface text-on-surface font-body text-sm transition-colors resize-none"
              />
            )}

            {field.type === "select" && field.options && (
              <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-surface-container focus:border-primary focus:outline-none bg-surface text-on-surface font-body text-sm transition-colors"
              >
                <option value="">-- Pilih --</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Step: Package Selection ───────────────────────────────────────────────
  const stepPackage = (
    <div className="space-y-5">
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">Pilih Paket</h2>
        <p className="font-body text-sm text-on-surface-variant">
          Pilih paket yang sesuai dengan kebutuhanmu.
        </p>
      </div>
      {packageDescription && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">info</span>
            <div>
              <p className="font-headline text-sm font-bold text-on-surface">Informasi Paket</p>
              <p className="font-body text-xs text-on-surface-variant leading-relaxed whitespace-pre-line mt-1">
                {packageDescription}
              </p>
            </div>
          </div>
        </div>
      )}
      {errors.event_package_id && (
        <p className="text-error text-xs font-medium flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {errors.event_package_id}
        </p>
      )}
      <div className="space-y-3">
        {event.packages?.map((pkg) => {
          const isSoldOut = pkg.stock_quantity !== null && pkg.stock_quantity < 1;
          const isSelected = data.event_package_id === pkg.id;
          return (
            <label
              key={pkg.id}
              className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${
                isSoldOut
                  ? "opacity-50 cursor-not-allowed bg-surface-container"
                  : "cursor-pointer hover:border-outline-variant"
              } ${
                isSelected && !isSoldOut
                  ? "border-primary bg-primary/5"
                  : "border-surface-container"
              }`}
            >
              {/* Radio circle */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  isSelected && !isSoldOut ? "border-primary" : "border-outline"
                }`}
              >
                {isSelected && !isSoldOut && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <div className="flex items-center gap-3">
                    {pkg.image_url && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openImagePreview(pkg.image_url as string, pkg.name);
                        }}
                        className="relative shrink-0 group"
                        aria-label={`Perbesar gambar ${pkg.name}`}
                      >
                        <img
                          src={pkg.image_url}
                          alt={pkg.name}
                          className="w-14 h-14 object-cover rounded-xl border border-surface-container-high shadow-sm"
                        />
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-on-surface text-surface-container-lowest flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined text-[14px]">zoom_in</span>
                        </span>
                      </button>
                    )}
                    <span className="font-headline font-bold text-on-surface text-base">
                      {pkg.name}
                    </span>
                  </div>
                  <span className="font-headline font-bold text-primary shrink-0">
                    {formatRupiah(parseFloat(pkg.price))}
                  </span>
                </div>
                {pkg.description && (
                  <p className="font-body text-xs text-on-surface-variant leading-relaxed mb-2">
                    {pkg.description}
                  </p>
                )}
                {/* Included addons preview */}
                {pkg.included_addons && pkg.included_addons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {pkg.included_addons.map((ia) => (
                      <span
                        key={ia.id}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full"
                      >
                        <span
                          className="material-symbols-outlined text-[12px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                        {ia.name} ×{ia.pivot.included_quantity}
                      </span>
                    ))}
                  </div>
                )}
                {isSoldOut && (
                  <span className="inline-block bg-error/10 text-error text-[10px] font-bold px-2 py-0.5 rounded mt-1.5">
                    Habis Terjual
                  </span>
                )}
              </div>

              <input
                type="radio"
                className="sr-only"
                disabled={isSoldOut}
                checked={isSelected}
                onChange={() => !isSoldOut && setData("event_package_id", pkg.id)}
              />
            </label>
          );
        })}
      </div>
    </div>
  );

  // ── Step: Addons ──────────────────────────────────────────────────────────
  const includedAddons = selectedPackage?.included_addons ?? [];
  const purchasableAddons = event.addons ?? [];

  const stepAddons = (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">Tambahan & Varian</h2>
        <p className="font-body text-sm text-on-surface-variant">
          Lengkapi pilihan varian untuk item yang sudah termasuk dalam paketmu.
        </p>
      </div>
      {addonDescription && (
        <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-4">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5">
              tips_and_updates
            </span>
            <div>
              <p className="font-headline text-sm font-bold text-on-surface">Informasi Addon</p>
              <p className="font-body text-xs text-on-surface-variant leading-relaxed whitespace-pre-line mt-1">
                {addonDescription}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Included addons with variant selection */}
      {includedAddons.length > 0 ? (
        <div className="space-y-5">
          <h3 className="font-body font-bold text-xs text-on-surface uppercase tracking-wider flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[16px] text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            Sudah Termasuk dalam Paket
          </h3>
          {includedAddons.map((addon) => {
            const qty = addon.pivot.included_quantity;
            const variantKeys = addon.variants ? Object.keys(addon.variants) : [];
            const addonVariants = data.included_addon_variants[addon.id] ?? {};

            return (
              <div key={addon.id} className="bg-surface-container rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {addon.image_url && (
                      <button
                        type="button"
                        onClick={() => openImagePreview(addon.image_url as string, addon.name)}
                        className="relative shrink-0 group"
                        aria-label={`Perbesar gambar ${addon.name}`}
                      >
                        <img
                          src={addon.image_url}
                          alt={addon.name}
                          className="w-12 h-12 object-cover rounded-xl border border-surface-container-high shadow-sm"
                        />
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-on-surface text-surface-container-lowest flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined text-[12px]">zoom_in</span>
                        </span>
                      </button>
                    )}
                    <div className="min-w-0">
                      <p className="font-headline font-bold text-on-surface text-sm truncate">
                        {addon.name}
                      </p>
                    </div>
                    <p className="font-body text-xs text-on-surface-variant">
                      {qty} item termasuk dalam paket
                    </p>
                  </div>
                  <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                    ×{qty}
                  </span>
                </div>

                {variantKeys.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {Array.from({ length: qty }, (_, slotIdx) => (
                      <div key={slotIdx} className="bg-surface rounded-xl p-3 space-y-2">
                        <p className="font-body text-xs font-semibold text-on-surface-variant">
                          Item #{slotIdx + 1}
                        </p>
                        {variantKeys.map((vKey) => {
                          const options = (addon.variants as Record<string, string[]>)[vKey] ?? [];
                          const selectedVal = addonVariants[vKey]?.[slotIdx] ?? "";
                          return (
                            <div key={vKey}>
                              <label className="block font-body text-xs text-on-surface-variant mb-1.5 capitalize">
                                {vKey}
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {options.map((opt) => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() =>
                                      handleIncludedVariant(addon.id, vKey, slotIdx, opt)
                                    }
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                                      selectedVal === opt
                                        ? "border-primary bg-primary text-on-primary"
                                        : "border-surface-container-high bg-surface text-on-surface hover:border-primary/50"
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-body text-xs text-on-surface-variant italic">
                    Tidak ada varian untuk item ini.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-surface-container rounded-2xl">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-2">
            inventory_2
          </span>
          <p className="font-body text-sm text-on-surface-variant">
            Pilih paket terlebih dahulu untuk melihat item yang termasuk.
          </p>
        </div>
      )}

      {/* Optional purchasable addons */}
      {purchasableAddons.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-surface-container">
          <h3 className="font-body font-bold text-xs text-on-surface uppercase tracking-wider flex items-center gap-2 pt-2">
            <span className="material-symbols-outlined text-[16px] text-secondary">
              add_shopping_cart
            </span>
            Tambahan Opsional
          </h3>
          {purchasableAddons.map((addon) => {
            const qty = getAddonQty(addon.id);
            const variantKeys = addon.variants ? Object.keys(addon.variants) : [];
            const addonVariants = data.purchased_addon_variants[addon.id] ?? {};
            const includedInfo = includedAddons.find((ia) => ia.id === addon.id);
            return (
              <div key={addon.id} className="bg-surface-container rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    {addon.image_url && (
                      <button
                        type="button"
                        onClick={() => openImagePreview(addon.image_url as string, addon.name)}
                        className="relative shrink-0 group"
                        aria-label={`Perbesar gambar ${addon.name}`}
                      >
                        <img
                          src={addon.image_url}
                          alt={addon.name}
                          className="w-14 h-14 object-cover rounded-xl border border-surface-container-high shadow-sm"
                        />
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-on-surface text-surface-container-lowest flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined text-[14px]">zoom_in</span>
                        </span>
                      </button>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-headline font-bold text-on-surface text-sm">
                          {addon.name}
                        </p>
                        {includedInfo && (
                          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                            <span
                              className="material-symbols-outlined text-[11px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              check_circle
                            </span>
                            ×{includedInfo.pivot.included_quantity} sudah termasuk
                          </span>
                        )}
                      </div>
                      <p className="font-body text-xs text-primary font-medium mt-0.5">
                        {formatRupiah(parseFloat(addon.price))} / pcs
                      </p>
                    </div>
                  </div>
                  {/* Qty Stepper */}
                  <div className="flex items-center bg-surface rounded-lg overflow-hidden border border-surface-container-high shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAddonQty(addon.id, addon.price, Math.max(0, qty - 1))}
                      className="px-3 py-2 text-on-surface-variant hover:bg-surface-container transition-colors font-bold"
                    >
                      −
                    </button>
                    <span className="px-3 text-sm font-bold text-on-surface w-8 text-center">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleAddonQty(
                          addon.id,
                          addon.price,
                          Math.min(addon.stock_quantity ?? 999, qty + 1)
                        )
                      }
                      className="px-3 py-2 text-on-surface-variant hover:bg-surface-container transition-colors font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Per-slot variant picker when qty > 0 and has variants */}
                {qty > 0 && variantKeys.length > 0 && (
                  <div className="space-y-3 pt-1 border-t border-surface-container-high">
                    {Array.from({ length: qty }, (_, slotIdx) => (
                      <div key={slotIdx} className="bg-surface rounded-xl p-3 space-y-2">
                        <p className="font-body text-xs font-semibold text-on-surface-variant">
                          Item #{slotIdx + 1}
                        </p>
                        {variantKeys.map((vKey) => {
                          const options = (addon.variants as Record<string, string[]>)[vKey] ?? [];
                          const selectedVal = addonVariants[vKey]?.[slotIdx] ?? "";
                          return (
                            <div key={vKey}>
                              <label className="block font-body text-xs text-on-surface-variant mb-1.5 capitalize">
                                {vKey}
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {options.map((opt) => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() =>
                                      handlePurchasedVariant(addon.id, vKey, slotIdx, opt)
                                    }
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                                      selectedVal === opt
                                        ? "border-primary bg-primary text-on-primary"
                                        : "border-surface-container-high bg-surface text-on-surface hover:border-primary/50"
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Step: Infak ───────────────────────────────────────────────────────────
  const infakRules = event.infak_rules;
  const stepInfak = (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">Infak / Wakaf</h2>
        <p className="font-body text-sm text-on-surface-variant">
          {infakRules?.description ?? "Berikan infak terbaik Anda. Infak bersifat opsional."}
        </p>
      </div>

      {errors.infak_amount && (
        <p className="text-error text-xs font-medium flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {errors.infak_amount}
        </p>
      )}

      {/* Predefined options grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {infakRules?.options?.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => setData("infak_amount", String(amount))}
            className={`py-3 px-2 rounded-xl text-sm font-bold font-body transition-all border-2 ${
              data.infak_amount === String(amount)
                ? "border-primary bg-primary text-on-primary"
                : "border-surface-container bg-surface-container text-on-surface hover:border-primary/50"
            }`}
          >
            {formatRupiah(amount)}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      {infakRules?.allow_custom && (
        <div>
          <label className="block font-body font-semibold text-sm text-on-surface mb-2">
            Atau masukkan nominal lain
          </label>
          <CurrencyInput
            value={
              data.infak_amount !== "0" && !infakRules.options?.includes(Number(data.infak_amount))
                ? data.infak_amount
                : ""
            }
            onChange={(val) => setData("infak_amount", val || "0")}
            className=""
            placeholder={`Min. ${formatRupiah(infakRules.min_custom ?? 10000)}`}
          />
        </div>
      )}

      {/* Skip option */}
      <button
        type="button"
        onClick={() => setData("infak_amount", "0")}
        className={`w-full py-3 px-4 rounded-xl text-sm font-body font-medium border-2 transition-all ${
          data.infak_amount === "0" || data.infak_amount === ""
            ? "border-primary bg-primary/5 text-primary"
            : "border-dashed border-surface-container-high text-on-surface-variant hover:border-outline-variant"
        }`}
      >
        Lewati Infak
      </button>
    </div>
  );

  // ── Step: Konfirmasi ──────────────────────────────────────────────────────
  const stepKonfirmasi = (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">
          Konfirmasi Pesanan
        </h2>
        <p className="font-body text-sm text-on-surface-variant">
          Periksa kembali detail pendaftaranmu sebelum melanjutkan ke pembayaran.
        </p>
      </div>

      {/* Order Summary Card */}
      <div className="bg-surface-container rounded-2xl overflow-hidden">
        {/* Event info */}
        <div className="p-4 border-b border-surface-container-high">
          <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-1">
            Event
          </p>
          <p className="font-headline font-bold text-on-surface text-sm">{event.title}</p>
          <p className="font-body text-xs text-on-surface-variant mt-0.5">
            {formatDate(event.event_date)}
          </p>
        </div>

        {/* Selected package */}
        {selectedPackage && (
          <div className="p-4 border-b border-surface-container-high">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">
                  Paket
                </p>
                <p className="font-headline font-bold text-on-surface text-sm">
                  {selectedPackage.name}
                </p>
              </div>
              <span className="font-body font-semibold text-on-surface text-sm">
                {formatRupiah(totals.pkg)}
              </span>
            </div>
          </div>
        )}

        {/* Additional addons */}
        {data.addons.length > 0 && (
          <div className="p-4 border-b border-surface-container-high space-y-2">
            <p className="font-body text-xs text-on-surface-variant uppercase tracking-wider">
              Tambahan
            </p>
            {data.addons.map((a) => {
              const addonInfo = event.addons?.find((ea) => ea.id === a.id);
              return (
                <div key={a.id} className="flex justify-between items-center">
                  <span className="font-body text-sm text-on-surface">
                    {addonInfo?.name} ×{a.quantity}
                  </span>
                  <span className="font-body text-sm text-on-surface">
                    {formatRupiah(a.price * a.quantity)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Infak */}
        {totals.infak > 0 && (
          <div className="p-4 border-b border-surface-container-high">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[16px] text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  volunteer_activism
                </span>
                <span className="font-body text-sm text-on-surface">Infak</span>
              </div>
              <span className="font-body text-sm text-on-surface">
                {formatRupiah(totals.infak)}
              </span>
            </div>
          </div>
        )}

        {/* Admin Fee */}
        {totals.adminFee > 0 && (
          <div className="p-4 border-b border-surface-container-high">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[16px] text-orange-600"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  receipt
                </span>
                <div>
                  <span className="font-body text-sm text-on-surface">Biaya Admin</span>
                  {data.payment_channel &&
                    paymentChannels.length > 0 &&
                    (() => {
                      const channel = paymentChannels.find(
                        (ch) => ch.code === data.payment_channel
                      );
                      if (channel) {
                        const feeLabel =
                          channel.fee_type === "percentage"
                            ? `${channel.fee}%`
                            : formatRupiah(channel.fee);
                        return (
                          <p className="font-body text-xs text-on-surface-variant mt-0.5">
                            {feeLabel}
                          </p>
                        );
                      }
                      return null;
                    })()}
                </div>
              </div>
              <span className="font-body text-sm font-semibold text-orange-600">
                +{formatRupiah(totals.adminFee)}
              </span>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="p-4 bg-primary/5">
          <div className="flex justify-between items-center">
            <span className="font-headline font-bold text-on-surface">Total</span>
            <span className="font-headline font-bold text-primary text-xl">
              {formatRupiah(totals.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment method selection */}
      <div className="space-y-3">
        <h3 className="font-body font-bold text-sm text-on-surface">Metode Pembayaran</h3>

        {/* Manual */}
        <label
          className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
            data.payment_provider === "manual"
              ? "border-primary bg-primary/5"
              : "border-surface-container hover:border-outline-variant"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
              data.payment_provider === "manual" ? "border-primary" : "border-outline"
            }`}
          >
            {data.payment_provider === "manual" && (
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-headline font-bold text-on-surface text-sm">
                Transfer Manual
              </span>
              <span className="inline-block bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                Gratis biaya admin
              </span>
            </div>
            <p className="font-body text-xs text-on-surface-variant mt-0.5">
              Transfer ke rekening BSI lalu upload bukti pembayaran.
            </p>
          </div>
          <input
            type="radio"
            className="sr-only"
            checked={data.payment_provider === "manual"}
            onChange={() => {
              setData("payment_provider", "manual");
              setData("payment_channel", "");
            }}
          />
        </label>

        {/* iPaymu automatic — DISABLED FOR NOW */}
        {false && (
          <label
            className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              data.payment_provider === "ipaymu"
                ? "border-primary bg-primary/5"
                : "border-surface-container hover:border-outline-variant"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                data.payment_provider === "ipaymu" ? "border-primary" : "border-outline"
              }`}
            >
              {data.payment_provider === "ipaymu" && (
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-headline font-bold text-on-surface text-sm">
                  Pembayaran Otomatis
                </span>
                <span className="inline-block bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                  via iPaymu
                </span>
              </div>
              <p className="font-body text-xs text-on-surface-variant mt-0.5">
                QRIS, Virtual Account BCA/BNI/BRI/Mandiri/BSI dan lainnya. Terverifikasi otomatis.
              </p>
            </div>
            <input
              type="radio"
              className="sr-only"
              checked={data.payment_provider === "ipaymu"}
              onChange={() => {
                setData("payment_provider", "ipaymu");
                setData("payment_channel", "qris");
              }}
            />
          </label>
        )}

        {/* iPaymu channel picker — DISABLED FOR NOW */}
        {false && data.payment_provider === "ipaymu" && (
          <div className="pl-2 space-y-3">
            <p className="font-body text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Pilih Metode Pembayaran
            </p>
            <div className="space-y-2">
              {paymentChannels.map((ch) => {
                const isSelected = data.payment_channel === ch.code;
                const feeLabel =
                  ch.fee_type === "percentage"
                    ? `+${ch.fee}%`
                    : ch.fee === 0
                      ? "Gratis"
                      : `+${new Intl.NumberFormat("id-ID").format(ch.fee)}`;
                const displayName =
                  ch.code === "qris" ? "QRIS" : ch.name.replace(" Virtual Account", "");
                return (
                  <button
                    key={ch.code}
                    type="button"
                    onClick={() => setData("payment_channel", ch.code)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-surface-container hover:border-outline-variant bg-surface"
                    }`}
                  >
                    {/* Logo/Image */}
                    {ch.image && (
                      <img
                        src={ch.image}
                        alt={ch.name}
                        className="w-12 h-12 object-contain shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-headline font-bold text-sm text-on-surface">
                          {displayName}
                        </span>
                        {isSelected && (
                          <span
                            className="material-symbols-outlined text-primary text-[20px] shrink-0"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            check_circle
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-body text-xs text-on-surface-variant">Biaya</span>
                        <span className="font-body text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          {feeLabel}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const stepperContent: Partial<Record<StepKey, ReactElement>> = {
    form: stepForm,
    package: stepPackage,
    addons: stepAddons,
    infak: stepInfak,
    konfirmasi: stepKonfirmasi,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STEPPER VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const stepperView = (
    <div className="max-w-2xl mx-auto px-4 md:px-8 pb-32 pt-6 w-full">
      {/* Back button */}
      <button
        onClick={goBack}
        className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary text-sm font-body mb-6 transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        {stepIndex === 0 ? "Kembali ke detail acara" : "Kembali"}
      </button>

      {/* Event mini header */}
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-surface-container">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <span
            className="material-symbols-outlined text-primary text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            celebration
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-headline font-bold text-on-surface text-sm leading-tight truncate">
            {event.title}
          </p>
          <p className="font-body text-xs text-on-surface-variant">
            {formatDate(event.event_date)}
          </p>
        </div>
      </div>

      {/* Stepper progress */}
      <StepperProgress steps={activeSteps} currentIndex={stepIndex} />

      {/* Step content */}
      <div
        className={`bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-[0px_10px_40px_rgba(80,100,71,0.06)] border border-surface-container-high ${
          currentStep?.key === "konfirmasi" ? "pb-32" : ""
        }`}
      >
        {currentStep && stepperContent[currentStep.key]}
      </div>

      {/* Navigation buttons / Konfirmasi Footer */}
      {currentStep?.key === "konfirmasi" ? (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-surface-container-lowest border-t border-surface-container-high">
          {/* Total Amount */}
          <div className="px-4 md:px-8 py-3 border-b border-surface-container-high bg-primary/5">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              <span className="font-body text-sm text-on-surface-variant">
                Total yang harus dibayar
              </span>
              <span className="font-headline font-bold text-primary text-lg">
                {formatRupiah(totals.total)}
              </span>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3 px-4 md:px-8 py-4 max-w-2xl mx-auto w-full">
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-2 px-5 py-3 rounded-full border-2 border-surface-container text-on-surface-variant font-body font-semibold text-sm hover:border-outline-variant transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Kembali
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={processing}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary font-headline font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {processing ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  Memproses...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">payment</span>
                  Konfirmasi & Bayar
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mt-6 gap-3">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 px-5 py-3 rounded-full border-2 border-surface-container text-on-surface-variant font-body font-semibold text-sm hover:border-outline-variant transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Kembali
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={processing}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary font-headline font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {processing ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  Memproses...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">payment</span>
                  Konfirmasi & Bayar
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary font-headline font-bold text-sm hover:opacity-90 transition-all"
            >
              Lanjut
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col antialiased">
      <Head title={`${event.title} – Event`} />
      <Header />
      <main className="flex-1 flex flex-col items-center">
        {view === "detail" ? detailView : stepperView}
      </main>

      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 text-white/90 hover:text-white inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
              <span className="font-body text-sm">Tutup</span>
            </button>
            <div className="rounded-2xl overflow-hidden border border-white/20 bg-white shadow-2xl">
              <img
                src={previewImage.src}
                alt={previewImage.title}
                className="w-full max-h-[80vh] object-contain bg-white"
              />
            </div>
            <p className="text-white/90 text-center font-body text-sm mt-3">{previewImage.title}</p>
          </div>
        </div>
      )}
    </div>
  );
}
