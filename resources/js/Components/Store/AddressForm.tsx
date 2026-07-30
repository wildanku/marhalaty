import { useState } from "react";
import { UserAddress } from "@/types";
import RegionPicker from "@/Components/Store/RegionPicker";

interface AddressFormProps {
  onSaved: (address: UserAddress) => void;
  onCancel?: () => void;
}

/**
 * Buyer address form — posts straight to the JSON `/my/addresses` endpoints (same "data
 * sampingan" pattern as AsyncSelect/ShippingRatePicker) rather than a full Inertia navigation,
 * so it can be used inline inside Checkout without leaving the page.
 */
export default function AddressForm({ onSaved, onCancel }: AddressFormProps) {
  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [villageId, setVillageId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const csrfToken =
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? "";

  const submit = async () => {
    setSubmitting(true);
    setErrors({});

    try {
      const response = await fetch("/my/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify({
          recipient_name: recipientName,
          phone,
          address_line: addressLine,
          village_id: villageId,
        }),
      });

      if (response.status === 422) {
        const body = await response.json();
        const flat: Record<string, string> = {};
        Object.entries(body.errors ?? {}).forEach(([key, messages]) => {
          flat[key] = Array.isArray(messages) ? (messages[0] as string) : String(messages);
        });
        setErrors(flat);
        return;
      }

      if (!response.ok) {
        setErrors({ general: "Gagal menyimpan alamat. Coba lagi." });
        return;
      }

      const body = await response.json();
      onSaved(body.data as UserAddress);
    } catch {
      setErrors({ general: "Gagal menyimpan alamat. Periksa koneksimu." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/20 space-y-4">
      {errors.general && <p className="text-xs text-error">{errors.general}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block font-label text-sm font-medium text-on-surface mb-2">
            Nama Penerima
          </label>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="block w-full py-2.5 px-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body text-sm"
          />
          {errors.recipient_name && (
            <p className="mt-1 text-xs text-error">{errors.recipient_name}</p>
          )}
        </div>
        <div>
          <label className="block font-label text-sm font-medium text-on-surface mb-2">
            No. Telepon
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="block w-full py-2.5 px-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body text-sm"
          />
          {errors.phone && <p className="mt-1 text-xs text-error">{errors.phone}</p>}
        </div>
      </div>

      <RegionPicker onSelectVillage={(v) => setVillageId(v.id)} />
      {errors.village_id && <p className="text-xs text-error">{errors.village_id}</p>}

      <div>
        <label className="block font-label text-sm font-medium text-on-surface mb-2">
          Alamat Lengkap
        </label>
        <textarea
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          rows={3}
          className="block w-full py-2.5 px-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body text-sm"
          placeholder="Nama jalan, RT/RW, patokan"
        />
        {errors.address_line && <p className="mt-1 text-xs text-error">{errors.address_line}</p>}
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container-high"
          >
            Batal
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="px-5 py-2 rounded-full text-sm font-label font-semibold bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container disabled:opacity-60"
        >
          Simpan Alamat
        </button>
      </div>
    </div>
  );
}
