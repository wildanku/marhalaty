import { useEffect, useRef, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import { PageProps } from "@/types";

export default function FloatingCartButton() {
  const page = usePage<PageProps>();
  const { auth, cart } = page.props;
  const url = page.url;
  const itemCount = cart?.item_count ?? 0;
  const prevCount = useRef(itemCount);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (itemCount > prevCount.current) {
      setPulsing(true);
      const timeout = setTimeout(() => setPulsing(false), 400);
      prevCount.current = itemCount;
      return () => clearTimeout(timeout);
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  const hiddenPaths = ["/cart", "/checkout"];

  if (!auth.user || itemCount <= 0 || hiddenPaths.some((p) => url.startsWith(p))) return null;

  // Product show pages (`/stores/{slug}/products/{slug}`) render their own fixed "Beli"/"Keranjang"
  // bar at the bottom on mobile — shift up so this button doesn't collide with it there.
  const isProductPage = /^\/stores\/[^/]+\/products\//.test(url);

  return (
    <Link
      href="/cart"
      className={`fixed right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-on-primary shadow-[0px_10px_40px_rgba(80,100,71,0.3)] hover:bg-primary-container hover:text-on-primary-container transition-colors ${
        isProductPage ? "bottom-24 sm:bottom-6" : "bottom-6"
      } ${pulsing ? "animate-cart-pop" : ""}`}
    >
      <span className="material-symbols-outlined text-2xl">shopping_cart</span>
      <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 flex items-center justify-center rounded-full bg-error text-on-error text-xs font-bold font-label">
        {itemCount > 99 ? "99+" : itemCount}
      </span>
    </Link>
  );
}
