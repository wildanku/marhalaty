import { useEffect, useState } from "react";
import { UserAddress } from "@/types";
import AddressForm from "@/Components/Store/AddressForm";

interface AddressPickerProps {
  initialAddresses: UserAddress[];
  value: number | null;
  onChange: (addressId: number) => void;
}

export default function AddressPicker({ initialAddresses, value, onChange }: AddressPickerProps) {
  const [addresses, setAddresses] = useState<UserAddress[]>(initialAddresses);
  const [showForm, setShowForm] = useState(initialAddresses.length === 0);

  useEffect(() => {
    if (!value && addresses.length > 0) {
      const preferred = addresses.find((a) => a.is_default) ?? addresses[0];
      onChange(preferred.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  const handleSaved = (address: UserAddress) => {
    setAddresses((prev) => [address, ...prev]);
    onChange(address.id);
    setShowForm(false);
  };

  return (
    <div className="space-y-3">
      {addresses.map((address) => (
        <label
          key={address.id}
          className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
            value === address.id ? "border-primary bg-primary-container/20" : "border-outline-variant/20 hover:border-outline-variant"
          }`}
        >
          <input
            type="radio"
            name="user_address_id"
            checked={value === address.id}
            onChange={() => onChange(address.id)}
            className="mt-1 text-primary focus:ring-primary"
          />
          <div className="min-w-0">
            <p className="font-medium text-on-surface text-sm">
              {address.recipient_name} <span className="text-on-surface-variant font-normal">· {address.phone}</span>
            </p>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {address.address_line}
              {address.village ? `, ${address.village.name}` : ""}
              {address.postal_code ? ` ${address.postal_code}` : ""}
            </p>
          </div>
        </label>
      ))}

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 text-primary font-label font-medium text-sm hover:underline"
        >
          <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
          Tambah Alamat Baru
        </button>
      )}

      {showForm && (
        <AddressForm
          onSaved={handleSaved}
          onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
        />
      )}
    </div>
  );
}
