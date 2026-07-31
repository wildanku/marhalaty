import { useState } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import { PageProps, Store } from "@/types";
import Header from "@/Components/Header";
import Footer from "@/Components/Footer";
import StatusBadge from "@/Components/Store/StatusBadge";
import ManageNav, { ManageTab } from "@/Components/Store/ManageNav";
import SettingsTab from "@/Pages/Store/Manage/Settings";
import AddressTab from "@/Pages/Store/Manage/Address";
import MembersTab from "@/Pages/Store/Manage/Members";

interface DashboardProps extends PageProps {
  store: Store;
  role: "owner" | "admin" | null;
  productCount: number;
  orderCount: number;
  shippingMethodCount: number;
}

export default function Dashboard() {
  const { store, role, productCount, orderCount, shippingMethodCount } =
    usePage<DashboardProps>().props;
  const [tab, setTab] = useState<ManageTab>("dashboard");
  const isOwner = role === "owner";

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title={store.name} />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center overflow-hidden shrink-0">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-3xl text-on-surface-variant">
                  storefront
                </span>
              )}
            </div>
            <div>
              <h1 className="font-headline text-2xl font-bold text-on-surface">{store.name}</h1>
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
        </div>

        {store.status === "rejected" && store.rejection_reason && (
          <div className="mb-8 bg-error-container text-on-error-container rounded-2xl p-4 text-sm">
            <strong>Pengajuan ditolak:</strong> {store.rejection_reason}
          </div>
        )}

        <ManageNav active={tab} onChange={setTab} showMembers={isOwner} />

        {tab === "dashboard" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              href={`/my/stores/${store.id}/products`}
              className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high hover:shadow-[0px_10px_30px_rgba(80,100,71,0.08)] transition-shadow"
            >
              <span className="material-symbols-outlined text-3xl text-primary">inventory_2</span>
              <p className="font-headline text-3xl font-bold text-on-surface mt-3">
                {productCount}
              </p>
              <p className="text-sm text-on-surface-variant">Produk</p>
            </Link>
            <Link
              href={`/my/stores/${store.id}/orders`}
              className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high hover:shadow-[0px_10px_30px_rgba(80,100,71,0.08)] transition-shadow"
            >
              <span className="material-symbols-outlined text-3xl text-primary">receipt_long</span>
              <p className="font-headline text-3xl font-bold text-on-surface mt-3">{orderCount}</p>
              <p className="text-sm text-on-surface-variant">Pesanan Masuk</p>
            </Link>
            <Link
              href={`/my/stores/${store.id}/shipping-methods`}
              className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high hover:shadow-[0px_10px_30px_rgba(80,100,71,0.08)] transition-shadow"
            >
              <span className="material-symbols-outlined text-3xl text-primary">
                local_shipping
              </span>
              <p className="font-headline text-3xl font-bold text-on-surface mt-3">
                {shippingMethodCount}
              </p>
              <p className="text-sm text-on-surface-variant">Metode Pengiriman</p>
            </Link>
            <Link
              href={`/my/stores/${store.id}/event-reservations`}
              className="bg-surface-container-lowest rounded-3xl p-6 border border-surface-container-high hover:shadow-[0px_10px_30px_rgba(80,100,71,0.08)] transition-shadow"
            >
              <span className="material-symbols-outlined text-3xl text-primary">event</span>
              <p className="font-headline text-lg font-bold text-on-surface mt-3">
                Pesanan Event
              </p>
              <p className="text-sm text-on-surface-variant">Produk yang dipakai di event</p>
            </Link>
          </div>
        )}

        {tab === "settings" && <SettingsTab store={store} />}
        {tab === "address" && <AddressTab store={store} />}
        {tab === "members" && isOwner && <MembersTab store={store} isOwner={isOwner} />}
      </div>
      <Footer />
    </div>
  );
}
