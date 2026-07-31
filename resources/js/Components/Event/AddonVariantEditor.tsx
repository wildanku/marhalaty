import { useState } from "react";
import { ProductOption } from "@/types";

export interface AddonVariantDraft {
  option1_value: string;
  option2_value: string | null;
  price: string;
}

interface AddonVariantEditorProps {
  options: ProductOption[];
  variants: AddonVariantDraft[];
  onChange: (options: ProductOption[], variants: AddonVariantDraft[]) => void;
  // True for a product-linked addon: combinations come from the product's own variants and can't
  // be added/removed/renamed here — only each combination's price is editable
  // (docs/plan/mvp2/8-event-product-integration.md addendum, D24: seller pricing may differ from
  // the product's own price).
  locked?: boolean;
}

const MAX_OPTION_GROUPS = 2;

function comboKey(option1Value: string, option2Value: string | null): string {
  return `${option1Value}|${option2Value ?? ""}`;
}

function regenerateVariants(options: ProductOption[], existing: AddonVariantDraft[]): AddonVariantDraft[] {
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
    return existingRow ?? { option1_value: combo.option1_value, option2_value: combo.option2_value, price: "" };
  });
}

export default function AddonVariantEditor({ options, variants, onChange, locked = false }: AddonVariantEditorProps) {
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

  const updateVariant = (key: string, patch: Partial<AddonVariantDraft>) => {
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

  const warnings = variants.filter((v) => !v.price || Number(v.price) <= 0);

  return (
    <div className="space-y-4">
      {!locked && (
        <div className="space-y-3">
          {options.map((group, index) => (
            <div key={index} className="bg-[#0d1117] rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) => renameGroup(index, e.target.value)}
                  placeholder={index === 0 ? "mis. Ukuran" : "mis. Warna"}
                  className="flex-1 bg-transparent border-0 border-b border-white/10 focus:ring-0 focus:border-emerald-500 text-white text-sm py-1"
                />
                {index === options.length - 1 && (
                  <button
                    type="button"
                    onClick={removeLastGroup}
                    className="text-red-400 hover:bg-red-500/10 rounded-full p-1.5 transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {group.values.map((value) => (
                  <span
                    key={value}
                    className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-semibold"
                  >
                    {value}
                    <button type="button" onClick={() => removeValue(index, value)} className="hover:opacity-70">
                      <span className="material-symbols-outlined text-[12px]">close</span>
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
                  className="flex-1 bg-[#161b22] border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => addValue(index)}
                  className="px-3 py-1.5 bg-white/5 rounded-lg text-xs font-semibold text-white/70 hover:bg-white/10"
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
              className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-semibold hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Tambah Grup Opsi ({options.length}/{MAX_OPTION_GROUPS})
            </button>
          )}
        </div>
      )}

      {variants.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="number"
              min="0"
              value={bulkPrice}
              onChange={(e) => setBulkPrice(e.target.value)}
              placeholder="Isi semua harga"
              className="max-w-[160px] bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={applyBulkPrice}
              className="px-3 py-2 bg-white/5 rounded-lg text-xs font-semibold text-white/70 hover:bg-white/10 whitespace-nowrap"
            >
              Terapkan ke Semua
            </button>
          </div>

          {warnings.length > 0 && (
            <div className="mb-2 bg-amber-500/10 text-amber-300 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              {warnings.length} kombinasi belum diisi harga.
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-white/50 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Kombinasi</th>
                  <th className="px-3 py-2 text-left font-semibold">Harga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {variants.map((variant) => {
                  const key = comboKey(variant.option1_value, variant.option2_value);
                  const isWarning = !variant.price || Number(variant.price) <= 0;
                  return (
                    <tr key={key} className={isWarning ? "bg-amber-500/5" : ""}>
                      <td className="px-3 py-2 font-medium text-white whitespace-nowrap">
                        {[variant.option1_value, variant.option2_value].filter(Boolean).join(" / ")}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={variant.price}
                          onChange={(e) => updateVariant(key, { price: e.target.value })}
                          className="w-28 bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                        />
                      </td>
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
