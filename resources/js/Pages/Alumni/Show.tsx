import { Head, Link } from "@inertiajs/react";
import { PageProps, User } from "@/types";
import Header from "@/Components/Header";

interface ShowProps extends PageProps {
  alumni: User;
}

export default function Show({ auth, alumni }: ShowProps) {
  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <Head title={`${alumni.name} - Profile`} />

      <header className="bg-surface-container-low border-b border-surface-container-high py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/directory"
            className="inline-flex items-center text-primary font-medium hover:underline text-sm font-label"
          >
            <span className="material-symbols-outlined text-sm mr-1">arrow_back</span>
            Back to Directory
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6">
        <div className="bg-surface-container-lowest rounded-2xl p-8 md:p-12 shadow-[0px_20px_60px_rgba(80,100,71,0.05)] border border-surface-container-high flex flex-col md:flex-row gap-8 items-start">
          <div className="w-full md:w-1/3 flex flex-col items-center text-center">
            <div className="w-40 h-40 rounded-full overflow-hidden border-8 border-surface-container mb-6 relative">
              <img
                src={
                  alumni.avatar_url ||
                  "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
                }
                alt={alumni.name}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="font-headline text-2xl font-bold text-on-surface flex items-center gap-2">
              {alumni.name}
              {alumni.is_verified && (
                <span
                  className="material-symbols-outlined text-tertiary text-xl"
                  style={{
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  verified
                </span>
              )}
            </h1>
            <p className="font-body text-on-surface-variant mt-2 text-sm">
              {alumni.profession
                ? typeof alumni.profession === "object"
                  ? alumni.profession.name
                  : alumni.profession
                : "Dynamic Foundation"}
            </p>
            <span className="inline-flex items-center mt-3 bg-secondary-container text-on-surface font-body text-xs font-semibold px-3 py-1 rounded-full">
              Marhalah {alumni.marhalah_year}
            </span>

            <div className="w-full mt-10">
              {alumni.phone_number ? (
                <a
                  href={`https://wa.me/${alumni.phone_number.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex justify-center items-center gap-2 bg-tertiary text-on-tertiary py-3 px-6 rounded-full font-label font-semibold text-sm hover:bg-tertiary-container transition-all"
                >
                  <span className="material-symbols-outlined">chat</span>
                  Hubungi via WhatsApp
                </a>
              ) : (
                <button
                  disabled
                  className="w-full flex justify-center items-center gap-2 bg-surface-container-highest text-on-surface-variant py-3 px-6 rounded-full font-label font-semibold text-sm cursor-not-allowed"
                >
                  <span className="material-symbols-outlined">lock</span>
                  Hidden Profile Data
                </button>
              )}
              {!auth.user?.is_verified && !alumni.phone_number && (
                <p className="text-xs text-error font-body mt-2">
                  Verify your account to view sensitive data.
                </p>
              )}
            </div>
          </div>

          <div className="w-full md:w-2/3 md:pl-8 md:border-l border-surface-container-high space-y-8">
            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">location_on</span>
                Location
              </h3>
              <p className="font-body text-on-surface-variant">
                {alumni.country === "Luar Negeri"
                  ? alumni.foreign_city
                    ? `${alumni.foreign_city}, Luar Negeri`
                    : "Luar Negeri"
                  : alumni.city
                    ? typeof alumni.city === "object"
                      ? alumni.city.name
                      : alumni.city
                    : "Not specified"}
              </p>
            </div>

            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">account_balance</span>
                Kampus Asal
              </h3>
              <p className="font-body text-on-surface-variant">
                {alumni.campus
                  ? typeof alumni.campus === "object"
                    ? alumni.campus.name
                    : alumni.campus
                  : "Not specified"}
              </p>
            </div>

            {(alumni.social_media?.instagram ||
              alumni.social_media?.tiktok ||
              alumni.social_media?.linkedin) && (
              <div>
                <h3 className="font-headline text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">public</span>
                  Social Media
                </h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  {alumni.social_media.instagram && (
                    <a
                      href={`https://instagram.com/${alumni.social_media.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 text-sm font-body bg-surface-container py-2 px-4 rounded-lg"
                    >
                      <span className="material-symbols-outlined text-lg">photo_camera</span>
                      {alumni.social_media.instagram}
                    </a>
                  )}
                  {alumni.social_media.tiktok && (
                    <a
                      href={`https://tiktok.com/@${alumni.social_media.tiktok.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 text-sm font-body bg-surface-container py-2 px-4 rounded-lg"
                    >
                      <span className="material-symbols-outlined text-lg">play_circle</span>
                      {alumni.social_media.tiktok}
                    </a>
                  )}
                  {alumni.social_media.linkedin && (
                    <a
                      href={
                        alumni.social_media.linkedin.startsWith("http")
                          ? alumni.social_media.linkedin
                          : `https://${alumni.social_media.linkedin}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 text-sm font-body bg-surface-container py-2 px-4 rounded-lg"
                    >
                      <span className="material-symbols-outlined text-lg">work</span>
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">storefront</span>
                Business Showcase
              </h3>
              {alumni.business_showcase_url ? (
                <a
                  href={alumni.business_showcase_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block max-w-sm rounded overflow-hidden border border-surface-container-high hover:border-primary transition-colors"
                >
                  <div className="bg-surface-container px-4 py-3 flex items-center gap-3">
                    <span className="material-symbols-outlined text-tertiary">link</span>
                    <span className="font-body text-sm text-primary font-medium truncate">
                      {alumni.business_showcase_url}
                    </span>
                  </div>
                </a>
              ) : (
                <p className="font-body text-sm text-on-surface-variant italic">
                  No business showcase added yet.
                </p>
              )}
            </div>

            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">shield</span>
                Privacy Setting
              </h3>
              <div className="inline-flex bg-surface-container px-3 py-1.5 rounded-md font-body text-xs text-on-surface-variant items-center gap-2">
                {alumni.privacy_setting === "circle" ? "Circle/Marhalah Only" : "Public Directory"}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
