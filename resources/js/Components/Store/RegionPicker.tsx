import { useState } from "react";
import AsyncSelect from "@/Components/AsyncSelect";

interface RegionOption {
  id: string;
  label: string;
  postal_code?: string | null;
}

interface RegionPickerInitial {
  province?: RegionOption;
  city?: RegionOption;
  district?: RegionOption;
  village?: RegionOption;
}

interface RegionPickerProps {
  onSelectVillage: (village: RegionOption) => void;
  initial?: RegionPickerInitial;
}

/**
 * Cascading province → city → district → village picker. Selecting a village exposes its
 * postal_code to the caller — server still re-derives postal_code from village_id, this is
 * display-only.
 */
export default function RegionPicker({ onSelectVillage, initial }: RegionPickerProps) {
  const [province, setProvince] = useState<RegionOption | null>(initial?.province ?? null);
  const [city, setCity] = useState<RegionOption | null>(initial?.city ?? null);
  const [district, setDistrict] = useState<RegionOption | null>(initial?.district ?? null);
  const [village, setVillage] = useState<RegionOption | null>(initial?.village ?? null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block font-label text-sm font-medium text-on-surface mb-2">Provinsi</label>
        <AsyncSelect
          endpoint="/api/locations/provinces"
          value={province?.id ?? ""}
          initialLabel={initial?.province?.label}
          onChange={() => {}}
          onOption={(option) => {
            setProvince({ id: String(option.id), label: option.label });
            setCity(null);
            setDistrict(null);
            setVillage(null);
          }}
          placeholder="Ketik untuk mencari provinsi..."
        />
      </div>

      <div>
        <label className="block font-label text-sm font-medium text-on-surface mb-2">Kota/Kabupaten</label>
        <AsyncSelect
          endpoint="/api/locations/cities"
          value={city?.id ?? ""}
          initialLabel={initial?.city?.label}
          onChange={() => {}}
          onOption={(option) => {
            setCity({ id: String(option.id), label: option.label });
            setDistrict(null);
            setVillage(null);
          }}
          params={province ? { province_id: province.id } : undefined}
          disabled={!province}
          placeholder={province ? "Ketik untuk mencari kota..." : "Pilih provinsi dahulu"}
        />
      </div>

      <div>
        <label className="block font-label text-sm font-medium text-on-surface mb-2">Kecamatan</label>
        <AsyncSelect
          endpoint="/api/locations/districts"
          value={district?.id ?? ""}
          initialLabel={initial?.district?.label}
          onChange={() => {}}
          onOption={(option) => {
            setDistrict({ id: String(option.id), label: option.label });
            setVillage(null);
          }}
          params={city ? { city_id: city.id } : undefined}
          disabled={!city}
          placeholder={city ? "Ketik untuk mencari kecamatan..." : "Pilih kota dahulu"}
        />
      </div>

      <div>
        <label className="block font-label text-sm font-medium text-on-surface mb-2">Kelurahan/Desa</label>
        <AsyncSelect
          endpoint="/api/locations/villages"
          value={village?.id ?? ""}
          initialLabel={initial?.village?.label}
          onChange={() => {}}
          onOption={(option) => {
            const selected = {
              id: String(option.id),
              label: option.label,
              postal_code: (option.postal_code as string | null) ?? null,
            };
            setVillage(selected);
            onSelectVillage(selected);
          }}
          params={district ? { district_id: district.id } : undefined}
          disabled={!district}
          placeholder={district ? "Ketik untuk mencari kelurahan..." : "Pilih kecamatan dahulu"}
        />
      </div>

      <div className="sm:col-span-2">
        <label className="block font-label text-sm font-medium text-on-surface mb-2">Kode Pos</label>
        <input
          type="text"
          value={village?.postal_code ?? ""}
          readOnly
          disabled
          placeholder="Terisi otomatis setelah memilih kelurahan"
          className="block w-full py-3 px-4 bg-surface-container border-0 rounded-t-DEFAULT text-on-surface-variant font-body sm:text-sm cursor-not-allowed"
        />
      </div>
    </div>
  );
}
