import React, { useState, useMemo } from "react";
import { Head, useForm, Link } from "@inertiajs/react";
import GodModeLayout from "@/Layouts/GodModeLayout";

const formatRp = (val: string | number) =>
  "Rp " + parseInt(String(val) || "0").toLocaleString("id-ID");

interface EventPackage {
  id: number;
  name: string;
  price: string;
  quota: number | null;
  available_quota: number | null;
  is_available: boolean;
  description: string | null;
  image_url: string | null;
  included_addons: any[];
}

interface EventAddon {
  id: number;
  name: string;
  price: string;
  stock_quantity: number | null;
  variants: Record<string, any> | null;
  image_url?: string | null;
}

interface CustomFormField {
  id?: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  default?: string;
}

interface ManualRegisterProps {
  admin: { id: number; name: string; email: string };
  event: {
    id: number;
    title: string;
    location: string;
    event_date: string;
    packages: EventPackage[];
    addons: EventAddon[];
    metadata: Record<string, any> | null;
  };
}

type IncludedAddonVariants = Record<number, Record<string, string[]>>;

export default function ManualRegister({ admin, event }: ManualRegisterProps) {
  const customForms: CustomFormField[] = event.metadata?.custom_forms ?? [];

  const { data, setData, post, processing, errors } = useForm({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    manual_entry_note: "",
    event_package_id: null as number | null,
    infak_amount: "0",
    custom_form_data: {} as Record<string, string>,
    addons: [] as { id: number; quantity: number; price: number }[],
    included_addon_variants: {} as IncludedAddonVariants,
    purchased_addon_variants: {} as IncludedAddonVariants,
    included_addon_forms: {} as Record<number, Record<string, string>>,
    purchased_addon_forms: {} as Record<number, Record<string, Record<string, string>>>,
  });

  const selectedPackage = event.packages.find((p) => p.id === data.event_package_id) ?? null;
  const includedAddons = selectedPackage?.included_addons ?? [];
  const purchasableAddons = event.addons ?? [];

  // Totals
  const totals = useMemo(() => {
    const pkgPrice = parseFloat(selectedPackage?.price ?? "0");
    const addonsPrice = data.addons.reduce((s, a) => s + a.price * a.quantity, 0);
    const infakPrice = parseFloat(data.infak_amount) || 0;
    return {
      package: pkgPrice,
      addons: addonsPrice,
      infak: infakPrice,
      total: pkgPrice + addonsPrice + infakPrice,
    };
  }, [selectedPackage, data.addons, data.infak_amount]);

  // Handlers
  const handleAddonQty = (addonId: number, priceStr: string, qty: number) => {
    const price = parseFloat(priceStr);
    const filtered = data.addons.filter((a) => a.id !== addonId);
    const updated =
      qty > 0 ? [...filtered, { id: addonId, quantity: qty, price }] : filtered;
    
    if (qty === 0) {
      const { [addonId]: _v, ...restV } = data.purchased_addon_variants;
      const { [addonId]: _f, ...restF } = data.purchased_addon_forms;
      setData((prev) => ({
        ...prev,
        addons: updated,
        purchased_addon_variants: restV,
        purchased_addon_forms: restF,
      }));
      return;
    }
    setData("addons", updated);
  };

  const handlePurchasedVariant = (addonId: number, variantKey: string, slotIndex: number, value: string) => {
    const prev = data.purchased_addon_variants[addonId] ?? {};
    const prevArr = prev[variantKey] ?? [];
    const newArr = [...prevArr];
    newArr[slotIndex] = value;
    setData("purchased_addon_variants", {
      ...data.purchased_addon_variants,
      [addonId]: { ...prev, [variantKey]: newArr },
    });
  };

  const handleIncludedVariant = (addonId: number, variantKey: string, slotIndex: number, value: string) => {
    const prev = data.included_addon_variants[addonId] ?? {};
    const prevArr = prev[variantKey] ?? [];
    const newArr = [...prevArr];
    newArr[slotIndex] = value;
    setData("included_addon_variants", {
      ...data.included_addon_variants,
      [addonId]: { ...prev, [variantKey]: newArr },
    });
  };

  const handleIncludedAddonForm = (addonId: number, formKey: string, value: string) => {
    const prev = data.included_addon_forms[addonId] ?? {};
    setData("included_addon_forms", {
      ...data.included_addon_forms,
      [addonId]: { ...prev, [formKey]: value },
    });
  };

  const handlePurchasedAddonForm = (addonId: number, slotIndex: number, formKey: string, value: string) => {
    const prev = data.purchased_addon_forms[addonId] ?? {};
    const slotData = prev[slotIndex] ?? {};
    setData("purchased_addon_forms", {
      ...data.purchased_addon_forms,
      [addonId]: { ...prev, [slotIndex]: { ...slotData, [formKey]: value } },
    });
  };

  const getAddonQty = (addonId: number) => data.addons.find((a) => a.id === addonId)?.quantity ?? 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post(`/god-mode/events/${event.id}/manual-register`);
  };

  return (
    <GodModeLayout
      admin={admin}
      title={`Daftar Manual - ${event.title}`}
    >
      <Head title={`Daftar Manual - ${event.title}`} />
      
      <div className="py-12">
        <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
          <form onSubmit={submit} className="space-y-6">
            
            {/* Participant Data Section */}
            <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <h3 className="font-headline font-bold text-white text-xl mb-4">Data Peserta</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/60 uppercase tracking-wider block mb-1">Nama Peserta *</label>
                  <input
                    type="text"
                    required
                    value={data.guest_name}
                    onChange={(e) => setData("guest_name", e.target.value)}
                    className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500"
                  />
                  {errors.guest_name && <p className="text-red-400 text-xs mt-1">{errors.guest_name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-white/60 uppercase tracking-wider block mb-1">Email (Opsional)</label>
                    <input
                      type="email"
                      value={data.guest_email}
                      onChange={(e) => setData("guest_email", e.target.value)}
                      className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 uppercase tracking-wider block mb-1">No HP (Opsional)</label>
                    <input
                      type="text"
                      value={data.guest_phone}
                      onChange={(e) => setData("guest_phone", e.target.value)}
                      className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/60 uppercase tracking-wider block mb-1">Catatan Admin</label>
                  <textarea
                    value={data.manual_entry_note}
                    onChange={(e) => setData("manual_entry_note", e.target.value)}
                    rows={2}
                    placeholder="Misal: Pembayaran tunai diterima oleh Budi"
                    className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Custom Forms Section (if any) */}
            {customForms.length > 0 && (
              <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6 shadow-2xl">
                <h3 className="font-headline font-bold text-white text-xl mb-4">Informasi Tambahan</h3>
                <div className="space-y-4">
                  {customForms.map((field, i) => {
                    const fieldKey = field.id ?? `field_${i}`;
                    const value = data.custom_form_data[fieldKey] ?? field.default ?? "";
                    const setValue = (v: string) => setData("custom_form_data", { ...data.custom_form_data, [fieldKey]: v });
                    
                    return (
                      <div key={fieldKey}>
                        <label className="text-xs text-white/60 uppercase tracking-wider block mb-1">
                          {field.label} {field.required && "*"}
                        </label>
                        {field.type === "textarea" ? (
                          <textarea
                            value={value}
                            required={field.required}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500"
                          />
                        ) : field.type === "select" ? (
                          <select
                            value={value}
                            required={field.required}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="">-- Pilih --</option>
                            {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input
                            type={field.type === "number" ? "number" : "text"}
                            value={value}
                            required={field.required}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Package Selection */}
            <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <h3 className="font-headline font-bold text-white text-xl mb-4">Pilih Paket *</h3>
              {errors.event_package_id && <p className="text-red-400 text-xs mb-3">{errors.event_package_id}</p>}
              <div className="space-y-3">
                {event.packages.map((pkg) => {
                  const isSoldOut = !pkg.is_available;
                  const isSelected = data.event_package_id === pkg.id;
                  
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => !isSoldOut && setData("event_package_id", pkg.id)}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                        isSoldOut ? "opacity-50 cursor-not-allowed border-white/5 bg-white/5" : "cursor-pointer hover:border-emerald-500/50"
                      } ${isSelected ? "border-emerald-500 bg-emerald-500/10" : "border-white/10 bg-[#0d1117]"}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected && !isSoldOut ? "border-emerald-500" : "border-white/20"
                      }`}>
                        {isSelected && !isSoldOut && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-white text-base">{pkg.name}</span>
                          <span className="font-bold text-emerald-400">{formatRp(pkg.price)}</span>
                        </div>
                        {pkg.description && <p className="text-sm text-white/50 mt-1">{pkg.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Addons Selection */}
            <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <h3 className="font-headline font-bold text-white text-xl mb-4">Addons & Variasi</h3>
              
              {/* Included Addons */}
              {includedAddons.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-emerald-400 mb-3">Telah Termasuk dalam Paket</h4>
                  <div className="space-y-4">
                    {includedAddons.map((addon) => {
                      const qty = addon.pivot.included_quantity;
                      const variantKeys = addon.variants ? Object.keys(addon.variants).filter((k) => k !== "forms") : [];
                      const addonVariants = data.included_addon_variants[addon.id] ?? {};
                      const forms = (addon.variants as any)?.forms as any[] ?? [];

                      return (
                        <div key={addon.id} className="bg-[#0d1117] border border-white/10 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-white text-sm">{addon.name}</span>
                            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full">×{qty}</span>
                          </div>
                          
                          {(variantKeys.length > 0 || forms.length > 0) && (
                            <div className="space-y-3 pt-3 border-t border-white/10">
                              {Array.from({ length: qty }).map((_, slotIdx) => (
                                <div key={slotIdx} className="bg-white/5 rounded-lg p-3">
                                  <span className="text-xs text-white/50 font-semibold mb-2 block">Item #{slotIdx + 1}</span>
                                  <div className="grid grid-cols-2 gap-3">
                                    {variantKeys.map((vKey) => {
                                      const options = (addon.variants as any)[vKey] as string[];
                                      const currentVal = addonVariants[vKey]?.[slotIdx] || "";
                                      return (
                                        <div key={vKey}>
                                          <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">{vKey}</label>
                                          <select
                                            required
                                            value={currentVal}
                                            onChange={(e) => handleIncludedVariant(addon.id, vKey, slotIdx, e.target.value)}
                                            className="w-full bg-[#161b22] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                                          >
                                            <option value="">-- Pilih --</option>
                                            {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}

                              {/* Included Forms */}
                              {forms.length > 0 && (
                                <div className="space-y-3 pt-3">
                                  {forms.map((form: any) => {
                                    const value = data.included_addon_forms[addon.id]?.[form.key] || "";
                                    return (
                                      <div key={form.key}>
                                        <label className="text-xs text-white/60 uppercase tracking-wider block mb-1">{form.label}</label>
                                        {form.type === "textarea" ? (
                                          <textarea
                                            value={value}
                                            required={form.required}
                                            onChange={(e) => handleIncludedAddonForm(addon.id, form.key, e.target.value)}
                                            className="w-full bg-[#161b22] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                          />
                                        ) : form.type === "select" ? (
                                          <select
                                            value={value}
                                            required={form.required}
                                            onChange={(e) => handleIncludedAddonForm(addon.id, form.key, e.target.value)}
                                            className="w-full bg-[#161b22] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                          >
                                            <option value="">-- Pilih --</option>
                                            {form.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                          </select>
                                        ) : (
                                          <input
                                            type={form.type || "text"}
                                            value={value}
                                            required={form.required}
                                            onChange={(e) => handleIncludedAddonForm(addon.id, form.key, e.target.value)}
                                            className="w-full bg-[#161b22] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional Addons */}
              {purchasableAddons.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-white/70 mb-3">Addons Tambahan</h4>
                  <div className="space-y-4">
                    {purchasableAddons.map((addon) => {
                      const qty = getAddonQty(addon.id);
                      const variantKeys = addon.variants ? Object.keys(addon.variants).filter((k) => k !== "forms") : [];
                      const addonVariants = data.purchased_addon_variants[addon.id] ?? {};
                      const forms = (addon.variants as any)?.forms as any[] ?? [];
                      const maxQty = addon.stock_quantity ?? 999;

                      return (
                        <div key={addon.id} className="bg-[#0d1117] border border-white/10 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <span className="font-bold text-white text-sm block">{addon.name}</span>
                              <span className="text-emerald-400 text-xs font-bold">{formatRp(addon.price)}</span>
                              {maxQty < 999 && <span className="text-white/40 text-xs ml-2">Sisa: {maxQty}</span>}
                            </div>
                            <div className="flex items-center bg-[#161b22] rounded-lg border border-white/10">
                              <button
                                type="button"
                                onClick={() => handleAddonQty(addon.id, addon.price, Math.max(0, qty - 1))}
                                className="px-3 py-1.5 text-white/50 hover:text-white"
                              >
                                −
                              </button>
                              <span className="w-8 text-center text-sm font-bold text-white">{qty}</span>
                              <button
                                type="button"
                                onClick={() => handleAddonQty(addon.id, addon.price, Math.min(maxQty, qty + 1))}
                                className="px-3 py-1.5 text-white/50 hover:text-white"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {qty > 0 && (variantKeys.length > 0 || forms.length > 0) && (
                            <div className="space-y-3 pt-3 border-t border-white/10 mt-3">
                              {Array.from({ length: qty }).map((_, slotIdx) => (
                                <div key={slotIdx} className="bg-white/5 rounded-lg p-3 space-y-3">
                                  <span className="text-xs text-white/50 font-semibold block">Item #{slotIdx + 1}</span>
                                  
                                  {/* Variants */}
                                  {variantKeys.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3">
                                      {variantKeys.map((vKey) => {
                                        const options = (addon.variants as any)[vKey] as string[];
                                        const currentVal = addonVariants[vKey]?.[slotIdx] || "";
                                        return (
                                          <div key={vKey}>
                                            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">{vKey}</label>
                                            <select
                                              required
                                              value={currentVal}
                                              onChange={(e) => handlePurchasedVariant(addon.id, vKey, slotIdx, e.target.value)}
                                              className="w-full bg-[#161b22] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                                            >
                                              <option value="">-- Pilih --</option>
                                              {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Forms */}
                                  {forms.length > 0 && (
                                    <div className="space-y-3 pt-2">
                                      {forms.map((form: any) => {
                                        const value = data.purchased_addon_forms[addon.id]?.[slotIdx]?.[form.key] || "";
                                        return (
                                          <div key={form.key}>
                                            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">{form.label}</label>
                                            {form.type === "textarea" ? (
                                              <textarea
                                                value={value}
                                                required={form.required}
                                                onChange={(e) => handlePurchasedAddonForm(addon.id, slotIdx, form.key, e.target.value)}
                                                className="w-full bg-[#161b22] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                                              />
                                            ) : form.type === "select" ? (
                                              <select
                                                value={value}
                                                required={form.required}
                                                onChange={(e) => handlePurchasedAddonForm(addon.id, slotIdx, form.key, e.target.value)}
                                                className="w-full bg-[#161b22] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                                              >
                                                <option value="">-- Pilih --</option>
                                                {form.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                              </select>
                                            ) : (
                                              <input
                                                type={form.type || "text"}
                                                value={value}
                                                required={form.required}
                                                onChange={(e) => handlePurchasedAddonForm(addon.id, slotIdx, form.key, e.target.value)}
                                                className="w-full bg-[#161b22] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                                              />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
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
            </div>

            {/* Infak Section */}
            {event.metadata?.infak_rules?.enabled && (
              <div className="bg-[#161b22] border border-white/10 rounded-2xl p-6 shadow-2xl">
                <h3 className="font-headline font-bold text-white text-xl mb-2">Infaq Kegiatan</h3>
                <p className="text-sm text-white/60 mb-4">
                  {event.metadata.infak_rules.description ?? "Berikan infak terbaik Anda. Infak bersifat opsional."}
                </p>
                <div>
                  <label className="text-xs text-white/60 uppercase tracking-wider block mb-1">Nominal Infaq</label>
                  <input
                    type="number"
                    min="0"
                    value={data.infak_amount}
                    onChange={(e) => setData("infak_amount", e.target.value)}
                    placeholder="Contoh: 50000"
                    className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Total and Submit */}
            <div className="bg-[#161b22] border border-emerald-500/30 rounded-2xl p-6 shadow-2xl flex items-center justify-between sticky bottom-6 z-10">
              <div>
                <span className="text-white/60 text-sm block">Total Tagihan</span>
                <span className="text-emerald-400 font-bold text-2xl">{formatRp(totals.total)}</span>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/god-mode/events/${event.id}`}
                  className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors"
                >
                  Batal
                </Link>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors disabled:opacity-50"
                >
                  {processing ? "Memproses..." : "Daftarkan Peserta"}
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    </GodModeLayout>
  );
}
