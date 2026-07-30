import { useMemo, useState } from "react";
import { Product, ProductVariant } from "@/types";

interface VariantPickerProps {
  product: Product;
  onSelect: (variant: ProductVariant | null) => void;
}

export default function VariantPicker({ product, onSelect }: VariantPickerProps) {
  const options = product.options ?? [];
  const activeVariants = useMemo(() => (product.variants ?? []).filter((v) => v.is_active), [product.variants]);
  const [selected, setSelected] = useState<(string | null)[]>(options.map(() => null));

  const variantValues = (variant: ProductVariant): (string | null)[] => [variant.option1_value, variant.option2_value];

  const isAvailable = (groupIndex: number, value: string): boolean => {
    return activeVariants.some((variant) => {
      const values = variantValues(variant);
      if (values[groupIndex] !== value) return false;
      return selected.every((sel, i) => i === groupIndex || sel === null || values[i] === sel);
    });
  };

  const selectValue = (groupIndex: number, value: string) => {
    const next = [...selected];
    next[groupIndex] = next[groupIndex] === value ? null : value;
    setSelected(next);

    if (next.every((v) => v !== null)) {
      const match = activeVariants.find((variant) => {
        const values = variantValues(variant);
        return next.every((sel, i) => values[i] === sel);
      });
      onSelect(match ?? null);
    } else {
      onSelect(null);
    }
  };

  return (
    <div className="space-y-5">
      {options.map((group, groupIndex) => (
        <div key={group.name}>
          <p className="font-label text-sm font-medium text-on-surface mb-2">{group.name}</p>
          <div className="flex flex-wrap gap-2">
            {group.values.map((value) => {
              const available = isAvailable(groupIndex, value);
              const isSelected = selected[groupIndex] === value;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={!available}
                  onClick={() => selectValue(groupIndex, value)}
                  className={`px-4 py-2 rounded-full text-sm font-label font-medium border transition-colors ${
                    isSelected
                      ? "bg-primary text-on-primary border-primary"
                      : available
                        ? "border-outline-variant text-on-surface hover:border-primary"
                        : "border-outline-variant/30 text-on-surface-variant/40 cursor-not-allowed line-through"
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
