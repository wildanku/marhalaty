import { useForm, Head } from "@inertiajs/react";
import { FormEvent } from "react";
import AsyncSelect from "@/Components/AsyncSelect";

interface GoogleUser {
  google_id: string;
  name: string;
  email: string;
  avatar_url: string;
}

interface TargetMarhalah {
  year: number;
  name: string;
}

interface Option {
  id: number;
  name: string;
}

interface OnboardingProps {
  googleUser: GoogleUser | null;
  communityScope: "global" | "single";
  targetMarhalah: TargetMarhalah;
  campuses: Option[];
  professions: Option[];
}

export default function Onboarding({
  googleUser,
  communityScope,
  targetMarhalah,
  campuses,
  professions,
}: OnboardingProps) {
  const { data, setData, post, processing, errors } = useForm({
    marhalah: communityScope === "single" ? String(targetMarhalah.year) : "",
    domisili: "indonesia",
    city_id: "",
    foreign_city: "",
    campus_id: "",
    profession_id: "",
    whatsapp: "",
    instagram: "",
    tiktok: "",
    linkedin: "",
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    post("/onboarding");
  };

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex items-center justify-center p-4 sm:p-8">
      <Head title="Onboarding - Complete Profile" />

      <div className="w-full max-w-3xl">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="font-headline text-4xl sm:text-5xl font-extrabold tracking-tight text-primary mb-3">
            Welcome to the Sanctuary
          </h1>
          <p className="font-body text-on-surface-variant text-lg">
            Complete your profile to connect with the global Dynamic Foundation network.
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-6 sm:p-10 relative overflow-hidden shadow-[0px_10px_40px_rgba(80,100,71,0.08)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

          <form onSubmit={submit} className="space-y-8 relative z-10">
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-full bg-surface-container-high flex items-center justify-center text-primary relative overflow-hidden border border-outline-variant/20">
                {googleUser?.avatar_url ? (
                  <img
                    src={googleUser.avatar_url}
                    alt="Profile"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-4xl">person</span>
                )}
              </div>
              <div className="text-center sm:text-left">
                <p className="text-primary font-medium mb-1 font-label">
                  Logged in as {googleUser?.email}
                </p>
                <p className="text-xs text-on-surface-variant font-label">
                  Your profile picture is securely fetched from Google.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="sm:col-span-2">
                <label
                  htmlFor="full_name"
                  className="block font-label text-sm font-medium text-on-surface mb-2"
                >
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary">
                    <span className="material-symbols-outlined">badge</span>
                  </span>
                  <input
                    type="text"
                    id="full_name"
                    value={googleUser?.name || ""}
                    readOnly
                    className="block w-full pl-12 pr-4 py-3 bg-surface-container-high border-0 border-b-2 border-primary focus:ring-0 focus:border-tertiary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors opacity-70"
                  />
                </div>
                <p className="mt-2 text-xs text-on-surface-variant">
                  Name is locked from your Google account.
                </p>
              </div>

              <div>
                <label
                  htmlFor="marhalah"
                  className="block font-label text-sm font-medium text-on-surface mb-2"
                >
                  Marhalah (Graduation Year)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary">
                    <span className="material-symbols-outlined">school</span>
                  </span>

                  {communityScope === "single" ? (
                    <input
                      type="text"
                      readOnly
                      value={`${targetMarhalah.year} - ${targetMarhalah.name}`}
                      className="block w-full pl-12 pr-4 py-3 bg-surface-container-high border-0 border-b-2 border-primary focus:ring-0 focus:border-tertiary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors opacity-70"
                    />
                  ) : (
                    <>
                      <select
                        id="marhalah"
                        value={data.marhalah}
                        onChange={(e) => setData("marhalah", e.target.value)}
                        className="block w-full pl-12 pr-10 py-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors hover:bg-surface-container-highest cursor-pointer appearance-none"
                      >
                        <option disabled value="">
                          Select Year
                        </option>
                        <option value="2020">2020 - Inspiring Generation</option>
                        <option value="2019">2019 - Excellent Generation</option>
                        <option value="2018">2018 - Golden Generation</option>
                        <option value="2017">2017</option>
                        <option value="2016">2016</option>
                        <option value="2015">2015</option>
                        <option value="2014">2014</option>
                        <option value="2013">2013 - Dynamic Generation</option>
                      </select>
                      <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-outline">
                        <span className="material-symbols-outlined">expand_more</span>
                      </span>
                    </>
                  )}
                </div>
                {errors.marhalah && <p className="mt-2 text-xs text-error">{errors.marhalah}</p>}
              </div>

              <div>
                <label
                  htmlFor="campus_id"
                  className="block font-label text-sm font-medium text-on-surface mb-2"
                >
                  Kampus Asal (Kelas 6 KMI)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary">
                    <span className="material-symbols-outlined">account_balance</span>
                  </span>
                  <select
                    id="campus_id"
                    value={data.campus_id}
                    onChange={(e) => setData("campus_id", e.target.value)}
                    className="block w-full pl-12 pr-10 py-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors hover:bg-surface-container-highest cursor-pointer appearance-none"
                  >
                    <option disabled value="">
                      Select Campus
                    </option>
                    {campuses.map((campus) => (
                      <option key={campus.id} value={campus.id}>
                        {campus.name}
                      </option>
                    ))}
                  </select>
                  <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-outline">
                    <span className="material-symbols-outlined">expand_more</span>
                  </span>
                </div>
                {errors.campus_id && <p className="mt-2 text-xs text-error">{errors.campus_id}</p>}
              </div>

              <div>
                <label
                  htmlFor="profession_id"
                  className="block font-label text-sm font-medium text-on-surface mb-2"
                >
                  Profesi
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary">
                    <span className="material-symbols-outlined">work</span>
                  </span>
                  <select
                    id="profession_id"
                    value={data.profession_id}
                    onChange={(e) => setData("profession_id", e.target.value)}
                    className="block w-full pl-12 pr-10 py-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors hover:bg-surface-container-highest cursor-pointer appearance-none"
                  >
                    <option disabled value="">
                      Select Profession
                    </option>
                    {professions.map((prof) => (
                      <option key={prof.id} value={prof.id}>
                        {prof.name}
                      </option>
                    ))}
                  </select>
                  <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-outline">
                    <span className="material-symbols-outlined">expand_more</span>
                  </span>
                </div>
                {errors.profession_id && (
                  <p className="mt-2 text-xs text-error">{errors.profession_id}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="whatsapp"
                  className="block font-label text-sm font-medium text-on-surface mb-2"
                >
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
                    placeholder="081312260738 (Indonesian phone number only)"
                    className="block w-full pl-12 pr-4 py-3 bg-surface-container-high border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary rounded-t-DEFAULT text-on-surface font-body sm:text-sm transition-colors hover:bg-surface-container-highest"
                  />
                </div>
                {errors.whatsapp ? (
                  <p className="mt-2 text-xs text-error">{errors.whatsapp}</p>
                ) : (
                  <p className="mt-2 text-xs text-on-surface-variant">
                    Used for official communications.
                  </p>
                )}
              </div>

              <div className="sm:col-span-2 mt-4">
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
                  <label
                    htmlFor="city_id"
                    className="block font-label text-sm font-medium text-on-surface mb-2"
                  >
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
                  <label
                    htmlFor="foreign_city"
                    className="block font-label text-sm font-medium text-on-surface mb-2"
                  >
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
                  {errors.foreign_city && (
                    <p className="mt-2 text-xs text-error">{errors.foreign_city}</p>
                  )}
                </div>
              )}

              <div className="sm:col-span-2 mt-4">
                <label className="block font-label text-sm font-medium text-on-surface mb-2">
                  Social Media (Opsional)
                </label>
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
            </div>

            <div className="pt-8 flex flex-col-reverse sm:flex-row items-center justify-end gap-6 border-t border-outline-variant/20 mt-6">
              <button
                type="button"
                className="text-primary font-label font-medium hover:text-tertiary transition-colors"
              >
                Need Help?
              </button>
              <button
                type="submit"
                disabled={processing}
                className="w-full sm:w-auto bg-tertiary text-on-tertiary px-8 py-3 rounded-full font-label font-semibold hover:bg-tertiary-container hover:text-on-tertiary-fixed transition-all flex items-center justify-center gap-2 shadow-[0px_4px_14px_rgba(119,90,25,0.2)] disabled:opacity-75 disabled:cursor-not-allowed"
              >
                Complete Profile
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-on-surface-variant font-label">
            By completing your profile, you agree to the{" "}
            <a href="#" className="text-primary hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
