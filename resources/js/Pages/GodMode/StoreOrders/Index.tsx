import { Head, Link, router } from "@inertiajs/react";
import { useState } from "react";
import GodModeLayout from "@/Layouts/GodModeLayout";
import { StoreOrder } from "@/types";

interface Admin {
  id: number;
  name: string;
  email: string;
  role?: string;
  avatar_url?: string | null;
}

interface StoreOption {
  id: string;
  name: string;
}

interface PaginatedOrders {
  data: StoreOrder[];
  links: { url: string | null; label: string; active: boolean }[];
  current_page: number;
  last_page: number;
  total: number;
}

interface StoreOrdersIndexProps {
  admin: Admin;
  orders: PaginatedOrders;
  stores: StoreOption[];
  filters: { status?: string; store_id?: string; date_from?: string; date_to?: string };
}

const STATUS_STYLE: Record<string, string> = {
  pending_payment: "bg-amber-500/10 text-amber-400",
  paid: "bg-emerald-500/10 text-emerald-400",
  processing: "bg-amber-500/10 text-amber-400",
  shipped: "bg-sky-500/10 text-sky-400",
  completed: "bg-emerald-500/10 text-emerald-400",
  cancelled: "bg-red-500/10 text-red-400",
  expired: "bg-red-500/10 text-red-400",
  refunded: "bg-white/5 text-white/70",
};

export default function StoreOrdersIndex({
  admin,
  orders,
  stores,
  filters,
}: StoreOrdersIndexProps) {
  const [status, setStatus] = useState(filters.status ?? "");
  const [storeId, setStoreId] = useState(filters.store_id ?? "");
  const [dateFrom, setDateFrom] = useState(filters.date_from ?? "");
  const [dateTo, setDateTo] = useState(filters.date_to ?? "");

  const applyFilters = (
    overrides: Partial<{
      status: string;
      store_id: string;
      date_from: string;
      date_to: string;
    }> = {}
  ) => {
    router.get(
      "/god-mode/store-orders",
      {
        status: overrides.status ?? status,
        store_id: overrides.store_id ?? storeId,
        date_from: overrides.date_from ?? dateFrom,
        date_to: overrides.date_to ?? dateTo,
      },
      { preserveState: true, replace: true }
    );
  };

  const exportUrl = `/god-mode/store-orders-export?${new URLSearchParams({
    ...(status ? { status } : {}),
    ...(storeId ? { store_id: storeId } : {}),
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
  }).toString()}`;

  return (
    <GodModeLayout admin={admin} title="Store Orders">
      <Head title="God Mode - Store Orders" />

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-white/50 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              applyFilters({ status: e.target.value });
            }}
            className="bg-[#161b22] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">Semua</option>
            <option value="pending_payment">Menunggu Bayar</option>
            <option value="paid">Dibayar</option>
            <option value="processing">Diproses</option>
            <option value="shipped">Dikirim</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
            <option value="expired">Kedaluwarsa</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Toko</label>
          <select
            value={storeId}
            onChange={(e) => {
              setStoreId(e.target.value);
              applyFilters({ store_id: e.target.value });
            }}
            className="bg-[#161b22] border border-white/10 rounded-lg px-3 py-2 text-sm text-white max-w-[200px]"
          >
            <option value="">Semua Toko</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              applyFilters({ date_from: e.target.value });
            }}
            className="bg-[#161b22] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1">Sampai Tanggal</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              applyFilters({ date_to: e.target.value });
            }}
            className="bg-[#161b22] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>

        <a
          href={exportUrl}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Ekspor Excel
        </a>
      </div>

      <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase text-white/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">No. Order</th>
                <th className="px-6 py-4 font-semibold">Toko</th>
                <th className="px-6 py-4 font-semibold">Pembeli</th>
                <th className="px-6 py-4 font-semibold">Total</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/40">
                    Tidak ada order untuk filter ini.
                  </td>
                </tr>
              ) : (
                orders.data.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => router.visit(`/god-mode/store-orders/${order.id}`)}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-semibold text-white">{order.order_number}</td>
                    <td className="px-6 py-4">{order.store?.name}</td>
                    <td className="px-6 py-4">{order.buyer?.name}</td>
                    <td className="px-6 py-4">Rp {Number(order.total).toLocaleString("id-ID")}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold ${STATUS_STYLE[order.status] ?? "bg-white/5 text-white/70"}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {orders.last_page > 1 && (
          <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center text-sm">
            <span className="text-white/50">
              Halaman {orders.current_page} dari {orders.last_page} ({orders.total} order)
            </span>
            <div className="flex gap-2">
              {orders.links.map((link, i) =>
                link.url ? (
                  <Link
                    key={i}
                    href={link.url}
                    className={`px-3 py-1 rounded ${link.active ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                ) : (
                  <span
                    key={i}
                    className="px-3 py-1 rounded text-white/30"
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                )
              )}
            </div>
          </div>
        )}
      </div>
    </GodModeLayout>
  );
}
