import { usePage } from "@inertiajs/react";

export function useTranslate() {
  const { translations, locale } = usePage().props as any;

  const t = (key: string, replace?: Record<string, string>) => {
    let translation = translations?.[key] || key;

    if (replace) {
      Object.keys(replace).forEach((k) => {
        translation = translation.replace(`:${k}`, replace[k]);
      });
    }

    return translation;
  };

  return { t, locale };
}
