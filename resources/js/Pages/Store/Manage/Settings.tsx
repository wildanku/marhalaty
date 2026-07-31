import { FormEventHandler, useState } from "react";
import { Head, useForm, usePage } from "@inertiajs/react";
import { PageProps, Store } from "@/types";
import StoreManageLayout from "@/Layouts/StoreManageLayout";

interface SettingsPageProps extends PageProps {
  store: Store;
  role: "owner" | "admin" | null;
}

export default function StoreSettings() {
  const { store, role } = usePage<SettingsPageProps>().props;
  const { data, setData, post, processing, errors } = useForm({
    _method: "patch" as const,
    name: store.name,
    description: store.description ?? "",
    contact_phone: store.contact_phone ?? "",
    contact_email: store.contact_email ?? "",
    logo: null as File | null,
    banner: null as File | null,
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(store.logo_url);
  const [bannerPreview, setBannerPreview] = useState<string | null>(store.banner_url);

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(`/my/stores/${store.id}`, { forceFormData: true });
  };

  return (
    <StoreManageLayout store={store} role={role} activeNav="settings">
      <Head title={`Profil Toko - ${store.name}`} />
      <h1 className="font-headline text-2xl font-bold text-on-surface mb-6">Profil Toko</h1>
      <form onSubmit={submit} className="bg-surface-container-lowest rounded-3xl p-8 border border-surface-container-high space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="sm:col-span-2">
          <label className="block font-label text-sm font-medium text-on-surface mb-2">Nama Toko</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => setData("name", e.target.value)}
            className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
          />
          {errors.name && <p className="mt-2 text-xs text-error">{errors.name}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block font-label text-sm font-medium text-on-surface mb-2">Deskripsi</label>
          <textarea
            value={data.description}
            onChange={(e) => setData("description", e.target.value)}
            rows={4}
            className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
          />
          {errors.description && <p className="mt-2 text-xs text-error">{errors.description}</p>}
        </div>

        <div>
          <label className="block font-label text-sm font-medium text-on-surface mb-2">No. WhatsApp</label>
          <input
            type="tel"
            value={data.contact_phone}
            onChange={(e) => setData("contact_phone", e.target.value)}
            className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
          />
          {errors.contact_phone && <p className="mt-2 text-xs text-error">{errors.contact_phone}</p>}
        </div>

        <div>
          <label className="block font-label text-sm font-medium text-on-surface mb-2">Email Toko</label>
          <input
            type="email"
            value={data.contact_email}
            onChange={(e) => setData("contact_email", e.target.value)}
            className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
          />
          {errors.contact_email && <p className="mt-2 text-xs text-error">{errors.contact_email}</p>}
        </div>

        <div>
          <label className="block font-label text-sm font-medium text-on-surface mb-2">Logo</label>
          <div className="flex items-center gap-4">
            {logoPreview && <img src={logoPreview} alt="Logo" className="w-14 h-14 rounded-xl object-cover border border-outline-variant/30" />}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setData("logo", file);
                if (file) setLogoPreview(URL.createObjectURL(file));
              }}
              className="block w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary-container file:text-on-primary-container file:font-label file:font-medium"
            />
          </div>
          {errors.logo && <p className="mt-2 text-xs text-error">{errors.logo}</p>}
        </div>

        <div>
          <label className="block font-label text-sm font-medium text-on-surface mb-2">Banner</label>
          <div className="flex items-center gap-4">
            {bannerPreview && <img src={bannerPreview} alt="Banner" className="w-24 h-14 rounded-xl object-cover border border-outline-variant/30" />}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setData("banner", file);
                if (file) setBannerPreview(URL.createObjectURL(file));
              }}
              className="block w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary-container file:text-on-primary-container file:font-label file:font-medium"
            />
          </div>
          {errors.banner && <p className="mt-2 text-xs text-error">{errors.banner}</p>}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-outline-variant/20">
        <button
          type="submit"
          disabled={processing}
          className="bg-primary text-on-primary px-8 py-3 rounded-full font-label font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-75 disabled:cursor-not-allowed"
        >
          Simpan Perubahan
        </button>
      </div>
      </form>
    </StoreManageLayout>
  );
}
