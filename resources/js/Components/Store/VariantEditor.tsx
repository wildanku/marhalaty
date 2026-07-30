import { useState } from "react";
import { ProductOption } from "@/types";
import CurrencyInput from "@/Components/CurrencyInput";

export interface VariantDraft {
  option1_value: string;
  option2_value: string | null;
  price: string;
  stock_quantity: string;
  weight_grams: string;
  sku: string;
}

interface VariantEditorProps {
  options: ProductOption[];
  variants: VariantDraft[];
  onChange: (options: ProductOption[], variants: VariantDraft[]) => void;
  requireWeight: boolean;
}

const MAX_OPTION_GROUPS = 2;

function comboKey(option1Value: string, option2Value: string | null): string {
  return `${option1Value}|${option2Value ?? ""}`;
}

function regenerateVariants(options: ProductOption[], existing: VariantDraft[]): VariantDraft[] {
  const existingByKey = new Map(existing.map((v) => [comboKey(v.option1_value, v.option2_value), v]));

  const group1Values = options[0]?.values ?? [];
  const group2Values = options[1]?.values ?? null;

  const combos: { option1_value: string; option2_value: string | null }[] = [];
  for (const v1 of group1Values) {
    if (group2Values) {
      for (const v2 of group2Values) {
        combos.push({ option1_value: v1, option2_value: v2 });
      }
    } else {
      combos.push({ option1_value: v1, option2_value: null });
    }
  }

  return combos.map((combo) => {
    const existingRow = existingByKey.get(comboKey(combo.option1_value, combo.option2_value));
    return (
      existingRow ?? {
        option1_value: combo.option1_value,
        option2_value: combo.option2_value,
        price: "",
        stock_quantity: "",
        weight_grams: "",
        sku: "",
      }
    );
  });
}

export default function VariantEditor({ options, variants, onChange, requireWeight }: VariantEditorProps) {
  const [chipDrafts, setChipDrafts] = useState<Record<number, string>>({});
  const [bulkPrice, setBulkPrice] = useState("");

  const addGroup = () => {
    if (options.length >= MAX_OPTION_GROUPS) return;
    const nextOptions = [...options, { name: "", values: [] }];
    onChange(nextOptions, regenerateVariants(nextOptions, variants));
  };

  const removeLastGroup = () => {
    const nextOptions = options.slice(0, -1);
    onChange(nextOptions, regenerateVariants(nextOptions, variants));
  };

  const renameGroup = (index: number, name: string) => {
    const nextOptions = options.map((g, i) => (i === index ? { ...g, name } : g));
    onChange(nextOptions, variants);
  };

  const addValue = (index: number) => {
    const raw = (chipDrafts[index] ?? "").trim();
    if (!raw) return;
    const nextOptions = options.map((g, i) =>
      i === index && !g.values.includes(raw) ? { ...g, values: [...g.values, raw] } : g
    );
    setChipDrafts((prev) => ({ ...prev, [index]: "" }));
    onChange(nextOptions, regenerateVariants(nextOptions, variants));
  };

  const removeValue = (groupIndex: number, value: string) => {
    const nextOptions = options.map((g, i) =>
      i === groupIndex ? { ...g, values: g.values.filter((v) => v !== value) } : g
    );
    onChange(nextOptions, regenerateVariants(nextOptions, variants));
  };

  const updateVariant = (key: string, patch: Partial<VariantDraft>) => {
    onChange(
      options,
      variants.map((v) => (comboKey(v.option1_value, v.option2_value) === key ? { ...v, ...patch } : v))
    );
  };

  const applyBulkPrice = () => {
    if (!bulkPrice) return;
    onChange(
      options,
      variants.map((v) => ({ ...v, price: bulkPrice }))
    );
  };

  const warnings = variants.filter((v) => !v.price || Number(v.price) <= 0 || !v.stock_quantity || Number(v.stock_quantity) <= 0);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {options.map((group, index) => (
          <div key={index} className="bg-surface-container rounded-2xl p-5 border border-outline-variant/20">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="text"
                value={group.name}
                onChange={(e) => renameGroup(index, e.target.value)}
                placeholder={index === 0 ? "mis. Ukuran" : "mis. Warna"}
                className="flex-1 py-2 px-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body text-sm"
              />
              {index === options.length - 1 && (
                <button
                  type="button"
                  onClick={removeLastGroup}
                  className="text-error hover:bg-error/10 rounded-full p-2 transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {group.values.map((value) => (
                <span
                  key={value}
                  className="inline-flex items-center gap-1.5 bg-primary-container text-on-primary-container px-3 py-1.5 rounded-full text-sm font-label"
                >
                  {value}
                  <button type="button" onClick={() => removeValue(index, value)} className="hover:opacity-70">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chipDrafts[index] ?? ""}
                onChange={(e) => setChipDrafts((prev) => ({ ...prev, [index]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addValue(index);
                  }
                }}
                placeholder="Ketik nilai, tekan Enter"
                className="flex-1 py-2 px-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body text-sm"
              />
              <button
                type="button"
                onClick={() => addValue(index)}
                className="px-4 py-2 bg-surface-container-high rounded-lg text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container-highest"
              >
                Tambah
              </button>
            </div>
          </div>
        ))}

        {options.length < MAX_OPTION_GROUPS && (
          <button
            type="button"
            onClick={addGroup}
            className="inline-flex items-center gap-2 text-primary font-label font-medium text-sm hover:underline"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tambah Grup Opsi ({options.length}/{MAX_OPTION_GROUPS})
          </button>
        )}
      </div>

      {variants.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <CurrencyInput value={bulkPrice} onChange={setBulkPrice} className="max-w-[220px]" placeholder="Isi semua harga" />
            <button
              type="button"
              onClick={applyBulkPrice}
              className="px-4 py-2 bg-surface-container-high rounded-lg text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container-highest whitespace-nowrap"
            >
              Terapkan ke Semua
            </button>
          </div>

          {warnings.length > 0 && (
            <div className="mb-3 bg-tertiary-container text-on-tertiary-container rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              {warnings.length} kombinasi masih berharga atau berstok 0.
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-outline-variant/20">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-high text-on-surface-variant text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Kombinasi</th>
                  <th className="px-4 py-3 text-left font-semibold">Harga</th>
                  <th className="px-4 py-3 text-left font-semibold">Stok</th>
                  <th className="px-4 py-3 text-left font-semibold">SKU</th>
                  {requireWeight && <th className="px-4 py-3 text-left font-semibold">Berat (gram)</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {variants.map((variant) => {
                  const key = comboKey(variant.option1_value, variant.option2_value);
                  const isWarning = !variant.price || Number(variant.price) <= 0 || !variant.stock_quantity || Number(variant.stock_quantity) <= 0;
                  return (
                    <tr key={key} className={isWarning ? "bg-tertiary-container/20" : ""}>
                      <td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap">
                        {[variant.option1_value, variant.option2_value].filter(Boolean).join(" / ")}
                      </td>
                      <td className="px-4 py-3">
                        <CurrencyInput
                          value={variant.price}
                          onChange={(v) => updateVariant(key, { price: v })}
                          className="w-32"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          value={variant.stock_quantity}
                          onChange={(e) => updateVariant(key, { stock_quantity: e.target.value })}
                          className="w-24 py-2 px-3 bg-surface border border-outline rounded-lg text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={variant.sku}
                          onChange={(e) => updateVariant(key, { sku: e.target.value })}
                          className="w-28 py-2 px-3 bg-surface border border-outline rounded-lg text-sm"
                        />
                      </td>
                      {requireWeight && (
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            value={variant.weight_grams}
                            onChange={(e) => updateVariant(key, { weight_grams: e.target.value })}
                            className="w-24 py-2 px-3 bg-surface border border-outline rounded-lg text-sm"
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
