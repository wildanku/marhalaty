import { useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import { PageProps, User } from "@/types";
import { useTranslate } from "@/hooks/useTranslate";

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
    <nav className="bg-[#faf9f6]/90 dark:bg-[#1a1c1a]/90 backdrop-blur-xl w-full top-0 z-50 sticky shadow-[0px_10px_40px_rgba(80,100,71,0.08)]">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-bold text-[#506447] dark:text-primary-fixed font-headline tracking-tight hover:opacity-80 transition-opacity"
        >
          Dynamic Everywhere
        </Link>

        {/* Desktop Navigation Links */}
        {!hideNavLinks && (
          <div className="hidden md:flex gap-8 items-center font-headline tracking-tight font-semibold">
            <Link
              href="/directory"
              className="text-[#444840] dark:text-[#c4c8bd] hover:text-[#775a19] transition-colors duration-300"
            >
              {t("Directory")}
            </Link>
            <Link
              href="/events"
              className="text-[#444840] dark:text-[#c4c8bd] hover:text-[#775a19] transition-colors duration-300"
            >
              {t("Events")}
            </Link>
            <Link
              href="/maal"
              className="text-[#444840] dark:text-[#c4c8bd] hover:text-[#775a19] transition-colors duration-300"
            >
              {t("Baitul Maal")}
            </Link>
          </div>
        )}

        {/* Auth Section & Lang Switcher */}
        <div className="flex items-center gap-4 relative">
          {/* Language Switcher */}
          <div className="hidden sm:flex items-center gap-1 mr-2 bg-surface-container rounded-full p-0.5">
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

          {auth?.user ? (
            /* User Logged In - Show Avatar & Dropdown */
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 px-3 py-2 rounded-full hover:bg-surface-container-low/20 text-[#444840] dark:text-[#c4c8bd] hover:text-[#775a19] dark:hover:text-[#d2eac5] transition-colors duration-300"
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

                {/* Name (Hidden on Mobile) */}
                <span className="hidden sm:inline font-body text-sm font-medium text-[#444840] dark:text-[#c4c8bd]">
                  {auth.user.name}
                </span>

                {/* Dropdown Icon */}
                <span className="material-symbols-outlined text-lg text-[#444840] dark:text-[#c4c8bd]">
                  {isDropdownOpen ? "expand_less" : "expand_more"}
                </span>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-lg overflow-hidden z-50">
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

                    <Link
                      href="/directory"
                      className="flex items-center gap-3 px-4 py-2 text-on-surface hover:bg-surface-container-high transition-colors duration-200 font-body text-sm"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <span className="material-symbols-outlined text-lg">groups</span>
                      {t("Directory")}
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
            /* User Not Logged In - Show Login Button */
            <a
              href="/auth/google/redirect"
              className="hidden md:flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-label font-medium hover:bg-primary-container hover:text-on-primary-container transition-all"
            >
              {t("Login")}
            </a>
          )}
        </div>

        {/* Mobile Menu Icon - For future mobile menu implementation */}
        <div className="md:hidden flex items-center gap-2">
          {/* Mobile Language Switcher */}
          <button
            onClick={() => handleLanguageSwitch(locale === "id" ? "en" : "id")}
            className="flex items-center justify-center h-9 px-3 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface-variant font-bold text-xs uppercase tracking-widest"
            title="Switch Language"
          >
            {locale === "id" ? "ID" : "EN"}
          </button>

          {auth?.user ? (
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined">{isDropdownOpen ? "close" : "menu"}</span>
            </button>
          ) : (
            <a
              href="/auth/google/redirect"
              className="flex items-center justify-center w-10 h-10 bg-primary text-on-primary rounded-full"
            >
              <span className="material-symbols-outlined">login</span>
            </a>
          )}
        </div>
      </div>

      {/* Mobile Dropdown - Show below header on mobile */}
      {isDropdownOpen && auth?.user && (
        <div className="md:hidden border-t border-outline-variant/20 bg-surface-container-lowest px-4 py-3">
          <div className="space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-2 text-on-surface hover:bg-surface-container-high rounded-lg transition-colors duration-200 font-body text-sm"
              onClick={() => setIsDropdownOpen(false)}
            >
              <span className="material-symbols-outlined text-lg">dashboard</span>
              {t("Dashboard")}
            </Link>

            <Link
              href={`/p/${auth.user.slug}`}
              className="flex items-center gap-3 px-4 py-2 text-on-surface hover:bg-surface-container-high rounded-lg transition-colors duration-200 font-body text-sm"
              onClick={() => setIsDropdownOpen(false)}
            >
              <span className="material-symbols-outlined text-lg">person</span>
              {t("My Profile")}
            </Link>

            <Link
              href="/profile/edit"
              className="flex items-center gap-3 px-4 py-2 text-on-surface hover:bg-surface-container-high rounded-lg transition-colors duration-200 font-body text-sm"
              onClick={() => setIsDropdownOpen(false)}
            >
              <span className="material-symbols-outlined text-lg">manage_accounts</span>
              {t("Edit Profile")}
            </Link>

            <Link
              href="/directory"
              className="flex items-center gap-3 px-4 py-2 text-on-surface hover:bg-surface-container-high rounded-lg transition-colors duration-200 font-body text-sm"
              onClick={() => setIsDropdownOpen(false)}
            >
              <span className="material-symbols-outlined text-lg">groups</span>
              {t("Directory")}
            </Link>

            <hr className="my-2 border-outline-variant/20" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-error hover:bg-error/10 rounded-lg transition-colors duration-200 font-body text-sm text-left"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              {t("Logout")}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
