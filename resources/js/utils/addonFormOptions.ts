export interface NormalizedAddonFormOption {
  key: string;
  value: string;
  label: string;
}

interface AddonFormOptionObject {
  value: string;
  label?: string;
}

/**
 * Converts legacy addon form options into values safe for native `<select>` elements.
 *
 * Newer data uses strings, while older addon forms can store an object such as
 * `{ value: "M", price: 0 }`. Rendering the latter directly causes React to throw and
 * unmount the event registration page as soon as the addon's form becomes visible.
 */
export function normalizeAddonFormOptions(options: unknown): NormalizedAddonFormOption[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.flatMap((option, index) => {
    if (typeof option === "string") {
      return [{ key: `${option}-${index}`, value: option, label: option }];
    }

    if (
      typeof option === "object" &&
      option !== null &&
      "value" in option &&
      typeof (option as AddonFormOptionObject).value === "string"
    ) {
      const { value, label } = option as AddonFormOptionObject;

      return [{ key: `${value}-${index}`, value, label: label ?? value }];
    }

    return [];
  });
}
