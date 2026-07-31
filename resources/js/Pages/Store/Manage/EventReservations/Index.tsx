import { useEffect, useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import { PageProps, Store } from "@/types";
import StoreManageLayout from "@/Layouts/StoreManageLayout";

interface EventReservationItem {
  product_name: string | null;
  variant_label: string | null;
  reserved: number;
  fulfilled: number;
}

interface EventReservationGroup {
  event_id: number;
  event_title: string;
  event_date: string;
  items: EventReservationItem[];
}

interface EventReservationsPageProps extends PageProps {
  store: Store;
  role: "owner" | "admin" | null;
}

export default function EventReservationsIndex() {
  const { store, role } = usePage<EventReservationsPageProps>().props;
  const [groups, setGroups] = useState<EventReservationGroup[] | null>(null);

  useEffect(() => {
    fetch(`/my/stores/${store.id}/api-event-reservations`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setGroups)
      .catch(() => setGroups([]));
  }, [store.id]);

  return (
    <StoreManageLayout store={store} role={role} activeNav="event-reservations">
      <Head title={`Pesanan Event - ${store.name}`} />

      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="font-headline text-2xl font-bold text-on-surface">Pesanan Event</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Produkmu yang ditautkan admin sebagai addon event. Barang diserahkan langsung saat
            acara oleh panitia — pembayaran juga masuk lewat panitia, bukan lewat pesanan toko ini.
          </p>
        </div>

        {groups === null ? (
          <p className="text-on-surface-variant text-sm">Memuat...</p>
        ) : groups.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-3xl p-12 text-center border border-surface-container-high">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">event</span>
            <p className="mt-4 font-headline text-lg font-semibold text-on-surface">
              Belum ada produk yang dipakai di event
            </p>
            <p className="text-on-surface-variant mt-1 text-sm">
              Hubungi admin kalau kamu ingin produkmu dijual lewat sebuah event.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div
                key={group.event_id}
                className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container-high"
              >
                <p className="font-headline font-semibold text-on-surface">{group.event_title}</p>
                <p className="text-xs text-on-surface-variant mb-3">
                  {new Date(group.event_date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <div className="divide-y divide-outline-variant/10">
                  {group.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-on-surface">
                        {item.product_name}
                        {item.variant_label && (
                          <span className="text-on-surface-variant"> — {item.variant_label}</span>
                        )}
                      </span>
                      <span className="text-on-surface-variant">
                        {item.reserved > 0 && <span>{item.reserved} menunggu diserahkan · </span>}
                        <span className="text-primary font-medium">{item.fulfilled} sudah diserahkan</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StoreManageLayout>
  );
}
