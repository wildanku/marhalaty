import { useState, useMemo, useEffect } from "react";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { PageProps, Rsvp, CustomFormField, GontorEvent } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import { useTranslate } from "@/hooks/useTranslate";

interface RsvpEditProps extends PageProps {
  rsvp: Rsvp & {
    event: GontorEvent;
  };
}

export default function RsvpEdit() {
  const { rsvp } = usePage<RsvpEditProps>().props;
  const { t } = useTranslate();
  const event = rsvp.event;
  const customForms: CustomFormField[] = event.metadata?.custom_forms ?? [];

  // Reconstruct form state from snapshot
  const initialIncludedVariants: Record<number, Record<string, string[]>> = {};
  const initialPurchasedVariants: Record<number, Record<string, string[]>> = {};
  const initialIncludedForms: Record<number, Record<string, string>> = {};
  const initialPurchasedForms: Record<number, Record<string, Record<string, string>>> = {};

  (rsvp.add_ons_snapshot ?? []).forEach((addon: any) => {
    const id = addon.id;
    if (addon.is_included) {
      if (addon.variants) initialIncludedVariants[id] = addon.variants;
      if (addon.form) initialIncludedForms[id] = addon.form;
    } else {
      if (addon.variant_slots) initialPurchasedVariants[id] = addon.variant_slots;
      if (addon.form) initialPurchasedForms[id] = addon.form;
    }
  });

  const { data, setData, put, processing, errors, clearErrors } = useForm({
    custom_form_data: rsvp.custom_form_data ?? {},
    included_addon_variants: initialIncludedVariants,
    purchased_addon_variants: initialPurchasedVariants,
    included_addon_forms: initialIncludedForms,
    purchased_addon_forms: initialPurchasedForms,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    put(`/rsvps/${rsvp.id}`);
  };

  const handleCustomForm = (fieldKey: string, value: string) => {
    setData("custom_form_data", { ...data.custom_form_data, [fieldKey]: value });
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

  return (
    <div className="min-h-screen bg-background text-on-background font-body antialiased">
      <Head title={`Edit RSVP - ${event.title}`} />
      <Header />

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary text-sm font-body mb-6 transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {t("Kembali ke Dashboard")}
        </Link>

        <h1 className="font-headline text-3xl font-bold text-on-surface mb-2">Edit Data RSVP</h1>
        <p className="font-body text-sm text-on-surface-variant mb-8">
          Ubah detail formulir dan varian untuk <span className="font-semibold text-primary">{event.title}</span>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Custom Forms */}
          {customForms.length > 0 && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container-high shadow-sm space-y-5">
              <h2 className="font-headline text-xl font-bold text-on-surface flex items-center gap-2 border-b border-surface-container pb-3">
                <span className="material-symbols-outlined text-primary">assignment</span>
                Formulir Pendaftaran
              </h2>

              <div className="space-y-4">
                {customForms.map((field, i) => {
                  const fieldKey = field.id ?? `field_${i}`;
                  const value = data.custom_form_data[fieldKey] ?? "";

                  return (
                    <div key={fieldKey}>
                      <label className="block font-body font-semibold text-sm text-on-surface mb-2">
                        {field.label}
                        {field.required && <span className="text-error ml-1">*</span>}
                      </label>
                      {field.type === "text" && (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => handleCustomForm(fieldKey, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-3 rounded-xl border-2 border-surface-container focus:border-primary focus:outline-none bg-surface text-on-surface font-body text-sm transition-colors"
                        />
                      )}
                      {field.type === "number" && (
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => handleCustomForm(fieldKey, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-3 rounded-xl border-2 border-surface-container focus:border-primary focus:outline-none bg-surface text-on-surface font-body text-sm transition-colors"
                        />
                      )}
                      {field.type === "textarea" && (
                        <textarea
                          value={value}
                          onChange={(e) => handleCustomForm(fieldKey, e.target.value)}
                          placeholder={field.placeholder}
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border-2 border-surface-container focus:border-primary focus:outline-none bg-surface text-on-surface font-body text-sm transition-colors resize-none"
                        />
                      )}
                      {field.type === "select" && field.options && (
                        <select
                          value={value}
                          onChange={(e) => handleCustomForm(fieldKey, e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border-2 border-surface-container focus:border-primary focus:outline-none bg-surface text-on-surface font-body text-sm transition-colors"
                        >
                          <option value="">-- Pilih --</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      {field.type === "radio" && field.options && (
                        <div className="space-y-2">
                          {field.options.map((opt) => (
                            <label key={opt} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${value === opt ? "border-primary bg-primary/5" : "border-surface-container hover:border-outline-variant"}`}>
                              <input type="radio" className="sr-only" value={opt} checked={value === opt} onChange={() => handleCustomForm(fieldKey, opt)} />
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${value === opt ? "border-primary" : "border-outline"}`}>
                                {value === opt && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                              </div>
                              <span className="font-body text-sm text-on-surface capitalize">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Addons */}
          {rsvp.add_ons_snapshot && rsvp.add_ons_snapshot.length > 0 && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container-high shadow-sm space-y-5">
              <h2 className="font-headline text-xl font-bold text-on-surface flex items-center gap-2 border-b border-surface-container pb-3">
                <span className="material-symbols-outlined text-secondary">add_shopping_cart</span>
                Varian Tambahan
              </h2>

              <div className="space-y-6">
                {rsvp.add_ons_snapshot.map((addon: any) => {
                  const qty = addon.quantity;
                  const isIncluded = addon.is_included;
                  
                  // Find original schema
                  let originalAddon = null;
                  if (isIncluded && rsvp.event_package_id && event.packages) {
                    const pkg = event.packages.find((p) => p.id === rsvp.event_package_id);
                    if (pkg && pkg.included_addons) {
                      originalAddon = pkg.included_addons.find((a) => a.id === addon.id);
                    }
                  } else if (!isIncluded && event.addons) {
                    originalAddon = event.addons.find((a) => a.id === addon.id);
                  }

                  if (!originalAddon) return null;

                  const variantOptions = originalAddon.variant_options;
                  const variantKeys = variantOptions ? Object.keys(variantOptions) : [];
                  const forms = originalAddon.form_fields ?? undefined;

                  if (variantKeys.length === 0 && (!forms || forms.length === 0)) return null;

                  return (
                    <div key={addon.id} className="bg-surface-container rounded-xl p-4">
                      <h3 className="font-headline font-bold text-sm mb-3">{addon.name} <span className="font-normal text-on-surface-variant">(Qty: {qty})</span></h3>
                      
                      <div className="space-y-4">
                        {Array.from({ length: qty }, (_, slotIdx) => (
                          <div key={slotIdx} className="bg-surface rounded-xl p-3 border border-surface-container-high">
                            <p className="font-body text-xs font-semibold text-on-surface-variant mb-2">Item #{slotIdx + 1}</p>
                            
                            {/* Variant Selectors */}
                            {variantKeys.map((vKey) => {
                              const options = variantOptions?.[vKey] ?? [];
                              const selectedVal = isIncluded 
                                ? data.included_addon_variants[addon.id]?.[vKey]?.[slotIdx] ?? ""
                                : data.purchased_addon_variants[addon.id]?.[vKey]?.[slotIdx] ?? "";

                              return (
                                <div key={vKey} className="mb-3">
                                  <label className="block font-body text-xs text-on-surface-variant mb-1.5 capitalize">{vKey}</label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {options.map((opt) => (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => isIncluded ? handleIncludedVariant(addon.id, vKey, slotIdx, opt) : handlePurchasedVariant(addon.id, vKey, slotIdx, opt)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                                          selectedVal === opt ? "border-primary bg-primary text-on-primary" : "border-surface-container-high bg-surface text-on-surface hover:border-primary/50"
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Forms */}
                            {forms && forms.map((form) => {
                              const val = isIncluded 
                                ? (data.included_addon_forms[addon.id]?.[form.key] ?? "")
                                : (data.purchased_addon_forms[addon.id]?.[slotIdx]?.[form.key] ?? "");

                              return (
                                <div key={form.key} className="mt-3">
                                  <label className="block font-body text-xs font-semibold text-on-surface mb-1.5">
                                    {form.label}
                                    {form.required && <span className="text-error ml-1">*</span>}
                                  </label>
                                  {form.type === "textarea" ? (
                                    <textarea
                                      value={val}
                                      onChange={(e) => isIncluded ? handleIncludedAddonForm(addon.id, form.key, e.target.value) : handlePurchasedAddonForm(addon.id, slotIdx, form.key, e.target.value)}
                                      className="w-full px-3 py-2 rounded-lg border-2 border-surface-container-high focus:border-primary text-sm bg-surface outline-none"
                                      rows={2}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={val}
                                      onChange={(e) => isIncluded ? handleIncludedAddonForm(addon.id, form.key, e.target.value) : handlePurchasedAddonForm(addon.id, slotIdx, form.key, e.target.value)}
                                      className="w-full px-3 py-2 rounded-lg border-2 border-surface-container-high focus:border-primary text-sm bg-surface outline-none"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <Link href="/dashboard" className="px-6 py-2.5 rounded-full font-headline font-semibold text-sm text-on-surface-variant hover:bg-surface-container transition-colors">
              Batal
            </Link>
            <button type="submit" disabled={processing} className="px-6 py-2.5 rounded-full bg-primary text-on-primary font-headline font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
              {processing ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
