import { useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { PageProps, User } from "@/types";
import { useTranslate } from "@/hooks/useTranslate";
import Logo from "@/Components/Logo";

interface HeaderProps {
  hideNavLinks?: boolean;
}

export default function Header({ hideNavLinks = false }: HeaderProps) {
  const { auth } = usePage<PageProps>().props;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { t, locale } = useTranslate();

  const handleLogout = () => {
    router.post(
      "/logout",
      {},
      {
        onSuccess: () => setIsDropdownOpen(false),
      }
    );
  };

  const handleLanguageSwitch = (newLocale: string) => {
    router.post("/language", { locale: newLocale }, { preserveScroll: true });
  };

  return (
    <nav className="bg-[#faf9f6]/90 dark:bg-[#1a1c1a]/10 backdrop-blur-xl w-full top-0 z-50 sticky shadow-[0px_10px_40px_rgba(80,100,71,0.08)]">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="/logo-muleh.png" alt="Logo" className="w-14 h-auto" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-primary font-headline tracking-tight leading-none">
              Dynamic
            </span>
            <span className="text-sm font-semibold text-secondary font-headline tracking-tight leading-none mt-0.5">
              Muleh 87
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        {!hideNavLinks && (
          <div className="hidden md:flex gap-8 items-center font-headline tracking-tight font-semibold">
            <Link
              href="/directory"
              className="text-[#444840]  hover:text-[#775a19] transition-colors duration-300"
            >
              {t("Directory")}
            </Link>
            <Link
              href="/events"
              className="text-[#444840] hover:text-[#775a19] transition-colors duration-300"
            >
              {t("Events")}
            </Link>
            <Link
              href="/maal"
              className="text-[#444840] hover:text-[#775a19] transition-colors duration-300"
            >
              {t("Baitul Maal")}
            </Link>
          </div>
        )}

        {/* Desktop Actions & Mobile Trigger */}
        <div className="flex items-center gap-4 relative">
          {/* Desktop Language Switcher */}
          <div className="hidden md:flex items-center gap-1 mr-2 bg-surface-container dark:bg-surface-container-high rounded-full p-0.5">
            <button
              onClick={() => locale !== "id" && handleLanguageSwitch("id")}
              className={`text-xs font-bold py-1.5 px-3 rounded-full uppercase tracking-widest transition-all ${
                locale === "id"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-primary"
              }`}
              title="Bahasa Indonesia"
            >
              ID
            </button>
            <button
              onClick={() => locale !== "en" && handleLanguageSwitch("en")}
              className={`text-xs font-bold py-1.5 px-3 rounded-full uppercase tracking-widest transition-all ${
                locale === "en"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-primary"
              }`}
              title="English"
            >
              EN
            </button>
          </div>

          {/* User Section (Desktop & Mobile Unified Trigger) */}
          {auth?.user ? (
            <div className="relative">
              {/* Desktop Trigger (with Name & Arrow) */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="hidden md:flex items-center gap-3 px-3 py-2 rounded-full hover:bg-surface-container-low/20 text-[#444840] hover:text-[#775a19] transition-colors duration-300"
                title={auth.user.name}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-primary overflow-hidden border border-outline-variant/20">
                  {auth.user.avatar_url ? (
                    <img
                      src={auth.user.avatar_url}
                      alt={auth.user.name}
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-lg">person</span>
                  )}
                </div>
                <span className="font-body text-sm font-medium text-[#444840]">
                  {auth.user.name}
                </span>
                <span className="material-symbols-outlined text-lg text-[#444840]">
                  {isDropdownOpen ? "expand_less" : "expand_more"}
                </span>
              </button>

              {/* Mobile Trigger (Avatar ONLY) */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex md:hidden w-9 h-9 rounded-full bg-surface-container-high items-center justify-center text-primary overflow-hidden border-2 border-primary/20 shadow-sm focus:outline-none"
                title={auth.user.name}
              >
                {auth.user.avatar_url ? (
                  <img
                    src={auth.user.avatar_url}
                    alt={auth.user.name}
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-lg">person</span>
                )}
              </button>

              {/* Desktop Dropdown (md and up) */}
              {isDropdownOpen && (
                <div className="hidden md:block absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-lg overflow-hidden z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-outline-variant/20 bg-surface-container-high">
                    <p className="font-headline text-sm font-semibold text-on-surface">
                      {auth.user.name}
                    </p>
                    <p className="font-body text-xs text-on-surface-variant truncate">
                      {auth.user.email}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 px-4 py-2 text-on-surface hover:bg-surface-container-high transition-colors duration-200 font-body text-sm"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <span className="material-symbols-outlined text-lg">dashboard</span>
                      {t("Dashboard")}
                    </Link>

                    <Link
                      href={`/p/${auth.user.slug}`}
                      className="flex items-center gap-3 px-4 py-2 text-on-surface hover:bg-surface-container-high transition-colors duration-200 font-body text-sm"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <span className="material-symbols-outlined text-lg">person</span>
                      {t("My Profile")}
                    </Link>

                    <Link
                      href="/profile/edit"
                      className="flex items-center gap-3 px-4 py-2 text-on-surface hover:bg-surface-container-high transition-colors duration-200 font-body text-sm"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <span className="material-symbols-outlined text-lg">manage_accounts</span>
                      {t("Edit Profile")}
                    </Link>

                    <hr className="my-2 border-outline-variant/20" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-error hover:bg-error/10 transition-colors duration-200 font-body text-sm text-left"
                    >
                      <span className="material-symbols-outlined text-lg">logout</span>
                      {t("Logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* User Not Logged In */
            <>
              {/* Desktop Login Button */}
              <a
                href="/auth/google/redirect"
                className="hidden md:flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-label font-medium hover:bg-primary-container hover:text-on-primary-container transition-all"
              >
                {t("Login")}
              </a>

              {/* Mobile Burger Menu Button for Guest */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex md:hidden items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-high transition-colors text-on-surface"
              >
                <span className="material-symbols-outlined">
                  {isDropdownOpen ? "close" : "menu"}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Dropdown - Show below header on mobile */}
      {isDropdownOpen && (
        <div className="md:hidden border-t border-outline-variant/20 bg-surface-container-lowest px-4 py-5 space-y-4 shadow-xl">
          {auth?.user ? (
            /* Logged In Mobile Menu */
            <div className="space-y-4">
              {/* User Identity Banner */}
              <div className="flex items-center gap-3 px-4 py-3 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-primary/20">
                  {auth.user.avatar_url ? (
                    <img
                      src={auth.user.avatar_url}
                      alt={auth.user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-xl">person</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-headline text-sm font-bold text-on-surface leading-tight truncate">
                    {auth.user.name}
                  </p>
                  <p className="font-body text-xs text-on-surface-variant truncate">
                    {auth.user.email}
                  </p>
                </div>
              </div>

              {/* Nav & Action Links */}
              <div className="space-y-1">
                <Link
                  href="/directory"
                  className="flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-surface-container-high rounded-xl transition-colors font-body text-sm"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <span className="material-symbols-outlined text-lg">groups</span>
                  {t("Directory")}
                </Link>

                <Link
                  href="/events"
                  className="flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-surface-container-high rounded-xl transition-colors font-body text-sm"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <span className="material-symbols-outlined text-lg">calendar_month</span>
                  {t("Events")}
                </Link>

                <Link
                  href="/maal"
                  className="flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-surface-container-high rounded-xl transition-colors font-body text-sm"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <span className="material-symbols-outlined text-lg">volunteer_activism</span>
                  {t("Baitul Maal")}
                </Link>

                <hr className="my-2 border-outline-variant/10" />

                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-surface-container-high rounded-xl transition-colors font-body text-sm"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <span className="material-symbols-outlined text-lg">dashboard</span>
                  {t("Dashboard")}
                </Link>

                <Link
                  href={`/p/${auth.user.slug}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-surface-container-high rounded-xl transition-colors font-body text-sm"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <span className="material-symbols-outlined text-lg">person</span>
                  {t("My Profile")}
                </Link>

                <Link
                  href="/profile/edit"
                  className="flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-surface-container-high rounded-xl transition-colors font-body text-sm"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <span className="material-symbols-outlined text-lg">manage_accounts</span>
                  {t("Edit Profile")}
                </Link>

                <hr className="my-2 border-outline-variant/10" />

                {/* Mobile Language Selector */}
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-body text-sm font-semibold text-on-surface-variant">
                    {t("Language")}
                  </span>
                  <div className="flex items-center gap-1 bg-surface-container rounded-full p-0.5">
                    <button
                      onClick={() => {
                        handleLanguageSwitch("id");
                        setIsDropdownOpen(false);
                      }}
                      className={`text-[10px] font-bold py-1 px-3 rounded-full uppercase tracking-widest transition-all ${
                        locale === "id"
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-on-surface-variant"
                      }`}
                    >
                      ID
                    </button>
                    <button
                      onClick={() => {
                        handleLanguageSwitch("en");
                        setIsDropdownOpen(false);
                      }}
                      className={`text-[10px] font-bold py-1 px-3 rounded-full uppercase tracking-widest transition-all ${
                        locale === "en"
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-on-surface-variant"
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                <hr className="my-2 border-outline-variant/10" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-error hover:bg-error/10 rounded-xl transition-colors font-body text-sm text-left font-semibold"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  {t("Logout")}
                </button>
              </div>
            </div>
          ) : (
            /* Logged Out Mobile Menu */
            <div className="space-y-4">
              <div className="space-y-1">
                <Link
                  href="/directory"
                  className="flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-surface-container-high rounded-xl transition-colors font-body text-sm"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <span className="material-symbols-outlined text-lg">groups</span>
                  {t("Directory")}
                </Link>

                <Link
                  href="/events"
                  className="flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-surface-container-high rounded-xl transition-colors font-body text-sm"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <span className="material-symbols-outlined text-lg">calendar_month</span>
                  {t("Events")}
                </Link>

                <Link
                  href="/maal"
                  className="flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-surface-container-high rounded-xl transition-colors font-body text-sm"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <span className="material-symbols-outlined text-lg">volunteer_activism</span>
                  {t("Baitul Maal")}
                </Link>

                <hr className="my-2 border-outline-variant/10" />

                {/* Mobile Language Selector */}
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-body text-sm font-semibold text-on-surface-variant">
                    {t("Language")}
                  </span>
                  <div className="flex items-center gap-1 bg-surface-container rounded-full p-0.5">
                    <button
                      onClick={() => {
                        handleLanguageSwitch("id");
                        setIsDropdownOpen(false);
                      }}
                      className={`text-[10px] font-bold py-1 px-3 rounded-full uppercase tracking-widest transition-all ${
                        locale === "id"
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-on-surface-variant"
                      }`}
                    >
                      ID
                    </button>
                    <button
                      onClick={() => {
                        handleLanguageSwitch("en");
                        setIsDropdownOpen(false);
                      }}
                      className={`text-[10px] font-bold py-1 px-3 rounded-full uppercase tracking-widest transition-all ${
                        locale === "en"
                          ? "bg-primary text-on-primary shadow-sm"
                          : "text-on-surface-variant"
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                <hr className="my-2 border-outline-variant/10" />

                <a
                  href="/auth/google/redirect"
                  className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary py-3 rounded-full font-headline font-bold text-sm hover:opacity-90 transition-all shadow-md"
                >
                  <span className="material-symbols-outlined text-lg">login</span>
                  {t("Login")} dengan Google
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
