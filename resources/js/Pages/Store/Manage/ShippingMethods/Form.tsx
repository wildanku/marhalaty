import { FormEventHandler } from "react";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { PageProps, Store, StoreShippingMethod } from "@/types";
import CurrencyInput from "@/Components/CurrencyInput";
import StoreManageLayout from "@/Layouts/StoreManageLayout";
import { storeManagementUrl } from "@/Helpers/storeManagementUrl";

interface ShippingMethodFormProps extends PageProps {
  store: Store;
  role: "owner" | "admin" | null;
  method: StoreShippingMethod | null;
}

export default function ShippingMethodForm() {
  const { store, role, method } = usePage<ShippingMethodFormProps>().props;
  const baseUrl = storeManagementUrl(store.id);
  const isEdit = method !== null;

  const { data, setData, post, put, processing, errors } = useForm({
    name: method?.name ?? "",
    type: method?.type ?? ("pickup" as StoreShippingMethod["type"]),
    fee: method?.fee ?? "0",
    description: method?.description ?? "",
    is_active: method?.is_active ?? true,
  });

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    if (isEdit) {
      put(`${baseUrl}/shipping-methods/${method!.id}`);
    } else {
      post(`${baseUrl}/shipping-methods`);
    }
  };

  return (
    <StoreManageLayout store={store} role={role} activeNav="shipping">
      <Head title={isEdit ? `Edit ${method!.name}` : "Tambah Metode Pengiriman"} />

      <div className="max-w-2xl">
        <Link
          href={`${baseUrl}/shipping-methods`}
          className="text-sm text-on-surface-variant hover:text-primary flex items-center gap-1 mb-4"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Metode Pengiriman
        </Link>
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-2">
          {isEdit ? "Edit Metode Pengiriman" : "Tambah Metode Pengiriman"}
        </h1>
        <p className="text-sm text-on-surface-variant mb-8">
          Tarif di sini bersifat flat (tetap) dan tidak dihitung dari data ongkir RajaOngkir/pihak
          ketiga lain.
        </p>

        <form
          onSubmit={submit}
          className="bg-surface-container-lowest rounded-3xl p-8 border border-surface-container-high space-y-6"
        >
          <div>
            <label className="block font-label text-sm font-medium text-on-surface mb-2">
              Nama Metode
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => setData("name", e.target.value)}
              placeholder="mis. Ambil di Toko, Kurir Toko (Dalam Kota)"
              className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
            />
            {errors.name && <p className="mt-2 text-xs text-error">{errors.name}</p>}
          </div>

          <div>
            <label className="block font-label text-sm font-medium text-on-surface mb-2">
              Tipe
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
                  data.type === "pickup"
                    ? "border-primary bg-primary-container/20"
                    : "border-outline-variant/20 hover:border-outline-variant"
                }`}
              >
                <input
                  type="radio"
                  checked={data.type === "pickup"}
                  onChange={() => setData("type", "pickup")}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <span>
                  <span className="block text-sm font-medium text-on-surface">Ambil di Tempat</span>
                  <span className="block text-xs text-on-surface-variant mt-0.5">
                    Pembeli tidak perlu mengisi alamat pengiriman.
                  </span>
                </span>
              </label>
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
                  data.type === "flat"
                    ? "border-primary bg-primary-container/20"
                    : "border-outline-variant/20 hover:border-outline-variant"
                }`}
              >
                <input
                  type="radio"
                  checked={data.type === "flat"}
                  onChange={() => setData("type", "flat")}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <span>
                  <span className="block text-sm font-medium text-on-surface">
                    Flat / Kurir Toko
                  </span>
                  <span className="block text-xs text-on-surface-variant mt-0.5">
                    Pembeli tetap mengisi alamat, tarif tetap sama berapa pun jaraknya.
                  </span>
                </span>
              </label>
            </div>
            {errors.type && <p className="mt-2 text-xs text-error">{errors.type}</p>}
          </div>

          <div>
            <label className="block font-label text-sm font-medium text-on-surface mb-2">
              Tarif
            </label>
            <CurrencyInput value={data.fee} onChange={(v) => setData("fee", v)} />
            <p className="mt-1.5 text-xs text-on-surface-variant">Kosongkan / isi 0 jika gratis.</p>
            {errors.fee && <p className="mt-2 text-xs text-error">{errors.fee}</p>}
          </div>

          <div>
            <label className="block font-label text-sm font-medium text-on-surface mb-2">
              Keterangan (opsional)
            </label>
            <textarea
              value={data.description}
              onChange={(e) => setData("description", e.target.value)}
              rows={3}
              placeholder="mis. jam operasional, area cakupan kurir toko, dll."
              className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
            />
            {data.type === "pickup" && (
              <p className="mt-1.5 text-xs text-on-surface-variant">
                Alamat pengambilan otomatis mengikuti alamat toko di halaman "Alamat" — tidak perlu
                ditulis ulang di sini.
              </p>
            )}
            {errors.description && <p className="mt-2 text-xs text-error">{errors.description}</p>}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.is_active}
              onChange={(e) => setData("is_active", e.target.checked)}
              className="w-4 h-4 text-primary rounded focus:ring-primary"
            />
            <span className="font-label text-sm font-medium text-on-surface">
              Aktifkan metode ini untuk pembeli
            </span>
          </label>

          <div className="flex justify-end pt-4 border-t border-outline-variant/20">
            <button
              type="submit"
              disabled={processing}
              className="bg-primary text-on-primary px-8 py-3 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isEdit ? "Simpan Perubahan" : "Tambah Metode"}
            </button>
          </div>
        </form>
      </div>
    </StoreManageLayout>
  );
}
