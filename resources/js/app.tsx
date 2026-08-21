import "../css/app.css";

import { createRoot, Root } from "react-dom/client";
import { createInertiaApp } from "@inertiajs/react";
import type { ComponentType } from "react";
import FloatingCartButton from "@/Components/Store/FloatingCartButton";

const appName = import.meta.env.VITE_APP_NAME || "Laravel";
const pages = import.meta.glob<{ default: ComponentType }>("./Pages/**/*.tsx");

createInertiaApp({
  title: (title: string) => `${title} - ${appName}`,
  resolve: (name: string) =>
    pages[`./Pages/${name}.tsx`]().then((module) => {
      const Page = module.default;

      // Admin and standalone Basic CMS pages should not inherit the storefront cart overlay.
      if (name.startsWith("GodMode/") || name.startsWith("PublicPages/")) return Page;

      const Wrapped = (props: Record<string, unknown>) => (
        <>
          <Page {...props} />
          <FloatingCartButton />
        </>
      );
      Wrapped.displayName = `WithFloatingCart(${name})`;
      return Wrapped;
    }),
  setup({ el, App, props }) {
    const root: Root = createRoot(el);
    root.render(<App {...props} />);
  },
  progress: {
    color: "#506447",
  },
});
