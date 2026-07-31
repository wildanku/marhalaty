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

      // God-mode admin panel has no shopping cart — it authenticates via a separate guard.
      if (name.startsWith("GodMode/")) return Page;

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
