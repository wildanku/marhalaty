import { FormEventHandler } from "react";
import { Head, useForm, usePage } from "@inertiajs/react";
import { PageProps, Store } from "@/types";
import RegionPicker from "@/Components/Store/RegionPicker";
import StoreManageLayout from "@/Layouts/StoreManageLayout";

interface AddressPageProps extends PageProps {
  store: Store;
  role: "owner" | "admin" | null;
}

export default function StoreAddressPage() {
  const { store, role } = usePage<AddressPageProps>().props;
  const address = store.primary_address ?? null;

  const { data, setData, post, processing, errors } = useForm({
    recipient_name: address?.recipient_name ?? "",
    phone: address?.phone ?? "",
    address_line: address?.address_line ?? "",
    village_id: address?.village_id ?? "",
    lat: address?.lat ?? "",
    lng: address?.lng ?? "",
  });

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(`/my/stores/${store.id}/address`);
  };

  const village = address?.village;
  const initial = village
    ? {
        village: { id: village.id, label: village.name },
        district: village.district
          ? { id: village.district.id, label: village.district.name }
          : undefined,
        city: village.district?.city
          ? { id: village.district.city.id, label: village.district.city.name }
          : undefined,
        province: village.district?.city?.province
          ? { id: village.district.city.province.id, label: village.district.city.province.name }
          : undefined,
      }
    : undefined;

  return (
    <StoreManageLayout store={store} role={role} activeNav="address">
      <Head title={`Alamat - ${store.name}`} />
      <h1 className="font-headline text-2xl font-bold text-on-surface mb-6">Alamat</h1>
      <form
        onSubmit={submit}
        className="bg-surface-container-lowest rounded-3xl p-8 border border-surface-container-high space-y-6"
      >
      <p className="text-sm text-on-surface-variant">
        Alamat ini dipakai sebagai titik asal pengiriman dan perhitungan ongkos kirim.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block font-label text-sm font-medium text-on-surface mb-2">
            Nama Pengirim
          </label>
          <input
            type="text"
            value={data.recipient_name}
            onChange={(e) => setData("recipient_name", e.target.value)}
            className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
          />
          {errors.recipient_name && (
            <p className="mt-2 text-xs text-error">{errors.recipient_name}</p>
          )}
        </div>
        <div>
          <label className="block font-label text-sm font-medium text-on-surface mb-2">
            No. Telepon
          </label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => setData("phone", e.target.value)}
            className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
          />
          {errors.phone && <p className="mt-2 text-xs text-error">{errors.phone}</p>}
        </div>

        <div className="sm:col-span-2">
          <RegionPicker initial={initial} onSelectVillage={(v) => setData("village_id", v.id)} />
          {errors.village_id && <p className="mt-2 text-xs text-error">{errors.village_id}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block font-label text-sm font-medium text-on-surface mb-2">
            Alamat Lengkap
          </label>
          <textarea
            value={data.address_line}
            onChange={(e) => setData("address_line", e.target.value)}
            rows={3}
            className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
          />
          {errors.address_line && <p className="mt-2 text-xs text-error">{errors.address_line}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-outline-variant/20">
        <button
          type="submit"
          disabled={processing}
          className="bg-primary text-on-primary px-8 py-3 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-75 disabled:cursor-not-allowed"
        >
          Simpan Alamat
        </button>
      </div>
      </form>
    </StoreManageLayout>
  );
}
