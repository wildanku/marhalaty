import "../css/app.css";

import { createRoot, Root } from "react-dom/client";
import { createInertiaApp } from "@inertiajs/react";
import type { ComponentType } from "react";

const appName = import.meta.env.VITE_APP_NAME || "Laravel";
const pages = import.meta.glob<{ default: ComponentType }>("./Pages/**/*.tsx");

createInertiaApp({
  title: (title: string) => `${title} - ${appName}`,
  resolve: (name: string) => pages[`./Pages/${name}.tsx`]().then((module) => module.default),
  setup({ el, App, props }) {
    const root: Root = createRoot(el);
    root.render(<App {...props} />);
  },
  progress: {
    color: "#506447",
  },
});
