import { FormEventHandler } from "react";
import { Head, useForm, Link } from "@inertiajs/react";
import { PageProps, User } from "@/types";
import AsyncSelect from "@/Components/AsyncSelect";
import Header from "@/Components/Header";

interface EditProps extends PageProps {
  user: User;
  campuses: { id: number; name: string }[];
  professions: { id: number; name: string }[];
  status?: string;
}

export default function Edit({ auth, user, campuses, professions, status }: EditProps) {
  const { data, setData, patch, processing, errors } = useForm({
    domisili: user.country === "Indonesia" ? "indonesia" : "luar_negeri",
    city_id: user.city_id || "",
    foreign_city: user.foreign_city || "",
    campus_id: user.campus_id || "",
    profession_id: user.profession_id || "",
    whatsapp: user.phone_number || "",
    instagram: user.social_media?.instagram || "",
    tiktok: user.social_media?.tiktok || "",
    linkedin: user.social_media?.linkedin || "",
    privacy_setting: user.privacy_setting || "public",
    business_showcase_url: user.business_showcase_url || "",
  });

  const submit: FormEventHandler = (e) => {
    e.preventDefault();
    patch("/profile");
  };

  return (
    <div className="min-h-screen bg-surface font-body selection:bg-primary/20">
      <Header />
      <Head title="Edit Profile" />

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-on-surface">Edit Profile</h1>
          <p className="text-on-surface-variant mt-2">Update your personal information and directory settings.</p>
        </div>

        {status && (
          <div className="mb-6 bg-tertiary-container text-on-tertiary-container p-4 rounded-lg font-medium text-sm flex items-center gap-2">
            <span className="material-symbols-outlined">check_circle</span>
            {status}
          </div>
        )}

        <div className="bg-surface-container-lowest rounded-3xl p-8 md:p-12 shadow-[0px_20px_60px_rgba(80,100,71,0.05)] border border-surface-container-high relative overflow-hidden">
          <form onSubmit={submit} className="relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              
              <div className="sm:col-span-2 border-b border-surface-container pb-4 mb-2">
                <h3 className="font-headline text-lg font-bold text-on-surface">Personal Info</h3>
              </div>

              {/* Whatsapp */}
              <div className="sm:col-span-2">
                <label htmlFor="whatsapp" className="block font-label text-sm font-medium text-on-surface mb-2">
                  WhatsApp Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary">
                    <span className="material-symbols-outlined">call</span>
                  </span>
                  <input
                    type="tel"
                    id="whatsapp"
                    value={data.whatsapp}
                    onChange={(e) => setData("whatsapp", e.target.value)}
                    className="block w-full pl-12 pr-4 py-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors hover:bg-surface-container-highest"
                    placeholder="e.g. 081234567890"
                    required
                  />
                </div>
                {errors.whatsapp && <p className="mt-2 text-xs text-error">{errors.whatsapp}</p>}
              </div>

              {/* Domisili */}
              <div className="sm:col-span-2 mt-2">
                <label className="block font-label text-sm font-medium text-on-surface mb-2">
                  Domisili
                </label>
                <div className="flex gap-6 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="domisili"
                      value="indonesia"
                      checked={data.domisili === "indonesia"}
                      onChange={(e) => {
                        setData("domisili", e.target.value);
                        setData("foreign_city", "");
                      }}
                      className="text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="text-on-surface text-sm">Indonesia</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="domisili"
                      value="luar_negeri"
                      checked={data.domisili === "luar_negeri"}
                      onChange={(e) => {
                        setData("domisili", e.target.value);
                        setData("city_id", "");
                      }}
                      className="text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="text-on-surface text-sm">Luar Negeri</span>
                  </label>
                </div>
              </div>

              {data.domisili === "indonesia" ? (
                <div className="sm:col-span-2">
                  <label htmlFor="city_id" className="block font-label text-sm font-medium text-on-surface mb-2">
                    Kota Domisili
                  </label>
                  <AsyncSelect
                    endpoint="/api/locations/cities"
                    value={data.city_id}
                    onChange={(val) => setData("city_id", String(val))}
                    placeholder="Ketik untuk mencari kota..."
                  />
                  {errors.city_id && <p className="mt-2 text-xs text-error">{errors.city_id}</p>}
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <label htmlFor="foreign_city" className="block font-label text-sm font-medium text-on-surface mb-2">
                    Nama Kota (Luar Negeri)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary">
                      <span className="material-symbols-outlined">location_city</span>
                    </span>
                    <input
                      type="text"
                      id="foreign_city"
                      value={data.foreign_city}
                      onChange={(e) => setData("foreign_city", e.target.value)}
                      className="block w-full pl-12 pr-4 py-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors hover:bg-surface-container-highest"
                      placeholder="e.g. Cairo, London, Sydney"
                    />
                  </div>
                  {errors.foreign_city && <p className="mt-2 text-xs text-error">{errors.foreign_city}</p>}
                </div>
              )}

              {/* Campus */}
              <div className="sm:col-span-1">
                <label htmlFor="campus_id" className="block font-label text-sm font-medium text-on-surface mb-2">
                  Kampus Asal
                </label>
                <select
                  id="campus_id"
                  value={data.campus_id}
                  onChange={(e) => setData("campus_id", e.target.value)}
                  className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
                  required
                >
                  <option value="" disabled>Pilih Kampus</option>
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.campus_id && <p className="mt-2 text-xs text-error">{errors.campus_id}</p>}
              </div>

              {/* Profession */}
              <div className="sm:col-span-1">
                <label htmlFor="profession_id" className="block font-label text-sm font-medium text-on-surface mb-2">
                  Profesi
                </label>
                <select
                  id="profession_id"
                  value={data.profession_id}
                  onChange={(e) => setData("profession_id", e.target.value)}
                  className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
                  required
                >
                  <option value="" disabled>Pilih Profesi</option>
                  {professions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {errors.profession_id && <p className="mt-2 text-xs text-error">{errors.profession_id}</p>}
              </div>

              {/* Social Media */}
              <div className="sm:col-span-2 mt-4 border-t border-surface-container pt-6">
                <h3 className="font-headline text-lg font-bold text-on-surface mb-4">Social Media & Links</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-primary">
                      <span className="material-symbols-outlined text-sm">photo_camera</span>
                    </span>
                    <input
                      type="text"
                      placeholder="Instagram"
                      value={data.instagram}
                      onChange={(e) => setData("instagram", e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body text-sm transition-colors hover:bg-surface-container-highest"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-primary">
                      <span className="material-symbols-outlined text-sm">play_circle</span>
                    </span>
                    <input
                      type="text"
                      placeholder="TikTok"
                      value={data.tiktok}
                      onChange={(e) => setData("tiktok", e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body text-sm transition-colors hover:bg-surface-container-highest"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-primary">
                      <span className="material-symbols-outlined text-sm">work</span>
                    </span>
                    <input
                      type="text"
                      placeholder="LinkedIn URL"
                      value={data.linkedin}
                      onChange={(e) => setData("linkedin", e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body text-sm transition-colors hover:bg-surface-container-highest"
                    />
                  </div>
                </div>
              </div>

              {/* Showcase & Privacy */}
              <div className="sm:col-span-2 mt-4 border-t border-surface-container pt-6">
                <h3 className="font-headline text-lg font-bold text-on-surface mb-4">Directory Settings</h3>
                
                <div className="mb-6">
                  <label htmlFor="business_showcase_url" className="block font-label text-sm font-medium text-on-surface mb-2">
                    Business Showcase URL
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary">
                      <span className="material-symbols-outlined">storefront</span>
                    </span>
                    <input
                      type="url"
                      id="business_showcase_url"
                      value={data.business_showcase_url}
                      onChange={(e) => setData("business_showcase_url", e.target.value)}
                      className="block w-full pl-12 pr-4 py-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors hover:bg-surface-container-highest"
                      placeholder="https://your-business.com"
                    />
                  </div>
                  {errors.business_showcase_url && <p className="mt-2 text-xs text-error">{errors.business_showcase_url}</p>}
                </div>

                <div>
                  <label htmlFor="privacy_setting" className="block font-label text-sm font-medium text-on-surface mb-2">
                    Privacy Setting
                  </label>
                  <select
                    id="privacy_setting"
                    value={data.privacy_setting}
                    onChange={(e) => setData("privacy_setting", e.target.value)}
                    className="block w-full py-3 px-4 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors"
                  >
                    <option value="public">Public Directory (Visible to all verified alumni)</option>
                    <option value="circle">Circle Only (Visible to your Marhalah only)</option>
                    <option value="private">Private (Hidden from Directory)</option>
                  </select>
                  {errors.privacy_setting && <p className="mt-2 text-xs text-error">{errors.privacy_setting}</p>}
                </div>
              </div>

            </div>

            <div className="pt-8 flex flex-col-reverse sm:flex-row items-center justify-end gap-6 border-t border-outline-variant/20 mt-8">
              <Link
                href="/dashboard"
                className="text-primary font-label font-medium hover:text-tertiary transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={processing}
                className="w-full sm:w-auto bg-tertiary text-on-tertiary px-8 py-3 rounded-full font-label font-semibold hover:bg-tertiary-container hover:text-on-tertiary-fixed transition-all flex items-center justify-center gap-2 shadow-[0px_4px_14px_rgba(119,90,25,0.2)] disabled:opacity-75 disabled:cursor-not-allowed"
              >
                Save Changes
                <span className="material-symbols-outlined text-sm">save</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
