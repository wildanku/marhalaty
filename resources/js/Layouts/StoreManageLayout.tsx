import { ReactNode } from "react";
import { Link } from "@inertiajs/react";
import { Store } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import StatusBadge from "@/Components/Store/StatusBadge";
import { storeManagementUrl } from "@/Helpers/storeManagementUrl";

export type StoreManageNav =
  | "dashboard"
  | "products"
  | "orders"
  | "shipping"
  | "event-reservations"
  | "settings"
  | "address"
  | "members";

interface StoreManageLayoutProps {
  store: Store;
  role: "owner" | "admin" | null;
  activeNav: StoreManageNav;
  children: ReactNode;
}

const navItems = (
  baseUrl: string,
  isOwner: boolean
): { key: StoreManageNav; href: string; label: string; icon: string }[] => [
  { key: "dashboard", href: baseUrl, label: "Ringkasan", icon: "space_dashboard" },
  { key: "products", href: `${baseUrl}/products`, label: "Produk", icon: "inventory_2" },
  { key: "orders", href: `${baseUrl}/orders`, label: "Pesanan", icon: "receipt_long" },
  {
    key: "shipping",
    href: `${baseUrl}/shipping-methods`,
    label: "Pengiriman",
    icon: "local_shipping",
  },
  {
    key: "event-reservations",
    href: `${baseUrl}/event-reservations`,
    label: "Pesanan Event",
    icon: "event",
  },
  {
    key: "settings",
    href: `${baseUrl}/settings`,
    label: "Profil Toko",
    icon: "storefront",
  },
  { key: "address", href: `${baseUrl}/address`, label: "Alamat", icon: "location_on" },
  ...(isOwner
    ? [
        {
          key: "members" as const,
          href: `${baseUrl}/members`,
          label: "Anggota",
          icon: "group",
        },
      ]
    : []),
];

export default function StoreManageLayout({
  store,
  role,
  activeNav,
  children,
}: StoreManageLayoutProps) {
  const isOwner = role === "owner";
  const baseUrl = storeManagementUrl(store.id);
  const items = navItems(baseUrl, isOwner);

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      {baseUrl.startsWith("/god-mode") ? (
        <div className="border-b border-outline-variant/20 bg-surface-container-low px-6 py-3 text-sm">
          <Link href={`/god-mode/stores/${store.id}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Kembali ke God Mode
          </Link>
        </div>
      ) : <Header />}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
        <div className="mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center overflow-hidden shrink-0">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-2xl text-on-surface-variant">
                storefront
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-headline text-xl font-bold text-on-surface truncate">
              {store.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={store.status} />
              {store.status === "approved" && (
                <Link
                  href={`/stores/${store.slug}`}
                  target="_blank"
                  className="text-xs text-primary hover:underline"
                >
                  Lihat etalase publik
                </Link>
              )}
            </div>
          </div>
        </div>

        {store.status === "rejected" && store.rejection_reason && (
          <div className="mb-6 bg-error-container text-on-error-container rounded-2xl p-4 text-sm">
            <strong>Pengajuan ditolak:</strong> {store.rejection_reason}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 lg:gap-8">
          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0">
            {items.map((item) => {
              const isActive = item.key === activeNav;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full lg:rounded-2xl text-sm font-label font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="min-w-0">{children}</div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
